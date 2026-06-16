"""
LLMPot V2 — Threat Intelligence Service

Orchestrates the full analysis pipeline for completed/active sessions:
  1. Load all session data (events, attacks, geo)
  2. Fetch attacker history (prior sessions)
  3. Run LLM session analysis (single comprehensive call)
  4. Parse structured output
  5. Store: SessionAnalysis, MitreMapping, IOC, Prediction, MitigationRecommendation,
            ThreatStory, ThreatReport
  6. Update/create AttackerProfile
  7. Run campaign detection
"""

import logging
import uuid
import datetime
from typing import Optional

from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import AsyncSessionLocal
from app.models.all import Session, SessionEvent, Attack, AttackReport
from app.models.v2 import (
    SessionAnalysis, MitreMapping, IOC, Prediction,
    MitigationRecommendation, ThreatStory, ThreatReport,
    AttackerProfile, Campaign, CampaignSession
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

# Set of session IDs currently being analyzed (avoid double-processing)
_analysis_lock: set = set()


async def analyze_session(session_id: uuid.UUID) -> Optional[SessionAnalysis]:
    sid_str = str(session_id)
    if sid_str in _analysis_lock:
        return None
    _analysis_lock.add(sid_str)
    try:
        return await _run_pipeline(session_id)
    finally:
        _analysis_lock.discard(sid_str)


async def _run_pipeline(session_id: uuid.UUID) -> Optional[SessionAnalysis]:
    async with AsyncSessionLocal() as db:
        # ── 1. Load session ───────────────────────────────────────────
        session = await db.get(Session, session_id)
        if not session:
            return None

        # ── 2. Load all events ────────────────────────────────────────
        events_res = await db.execute(
            select(SessionEvent)
            .where(SessionEvent.session_id == session_id)
            .order_by(SessionEvent.event_time)
        )
        events = events_res.scalars().all()

        # ── 3. Load all attacks + their reports ───────────────────────
        attacks_res = await db.execute(
            select(Attack, AttackReport)
            .outerjoin(AttackReport, AttackReport.attack_id == Attack.id)
            .where(Attack.session_id == session_id)
            .order_by(Attack.created_at)
        )
        attack_rows = attacks_res.all()
        attacks_data = []
        for attack, report in attack_rows:
            r = report.report_json if report else {}
            attacks_data.append({
                "id": str(attack.id),
                "classification": attack.classification,
                "severity": attack.severity,
                "endpoint": attack.endpoint,
                "confidence": r.get("confidence", 0.0),
                "tool_fingerprint": r.get("tool_fingerprint"),
            })

        # ── 4. Prior sessions from same IP ────────────────────────────
        prior_res = await db.execute(
            select(Session)
            .where(Session.attacker_ip == session.attacker_ip, Session.id != session_id)
            .order_by(desc(Session.start_time))
            .limit(5)
        )
        prior_sessions = prior_res.scalars().all()
        prior_attacks_data = []
        for ps in prior_sessions:
            pat_res = await db.execute(
                select(func.count(Attack.id), Attack.classification)
                .where(Attack.session_id == ps.id)
                .group_by(Attack.classification)
                .limit(3)
            )
            types = [row[1] for row in pat_res.all()]
            prior_attacks_data.append({
                "id": str(ps.id),
                "start_time": str(ps.start_time),
                "attack_count": len(types),
                "attack_types": types
            })

        # ── 5. Assemble context for LLM ───────────────────────────────
        geo = {
            "country": session.attacker_geoip_country,
            "continent": session.attacker_geoip_continent,
            "city": session.attacker_geoip_city,
            "isp": session.attacker_isp,
            "asn": session.attacker_asn,
            "org": session.attacker_org,
            "is_proxy": session.attacker_is_proxy,
            "is_hosting": session.attacker_is_hosting,
            "is_mobile": session.attacker_is_mobile,
            "hostname": session.attacker_hostname,
        }

        events_context = [
            {
                "timestamp": str(e.event_time),
                "method": e.request_method,
                "path": e.request_path,
                "body_snippet": (e.request_body or "")[:300],
                "ua": (e.request_headers or {}).get("user-agent", ""),
                "response_status": e.response_status,
            }
            for e in events
        ]

        # ── 6. Call LLM ───────────────────────────────────────────────
        raw = await llm_service.analyze_session_intelligence({
            "session": {"id": str(session_id), "ip": session.attacker_ip},
            "events": events_context,
            "attacks": attacks_data,
            "geo": geo,
            "prior_sessions": prior_attacks_data,
        })

        if not raw:
            logger.warning(f"Empty LLM analysis for session {session_id}")
            return None

        # ── 7. Parse LLM output ───────────────────────────────────────
        intent = raw.get("intent_analysis", {})
        intent_scores = intent.get("intent_scores", {})
        attacker_prof = raw.get("attacker_profile", {})
        campaign_info = raw.get("campaign_assessment", {})
        story_data = raw.get("threat_story", {})
        mitig = raw.get("mitigation_rules", {})

        # ── 8. Create SessionAnalysis ─────────────────────────────────
        # Check if one already exists (re-analysis case)
        existing = await db.execute(
            select(SessionAnalysis).where(SessionAnalysis.session_id == session_id)
        )
        analysis = existing.scalar_one_or_none()

        if not analysis:
            analysis = SessionAnalysis(session_id=session_id)
            db.add(analysis)

        analysis.attacker_ip = session.attacker_ip
        analysis.analyzed_at = datetime.datetime.now(datetime.timezone.utc)
        analysis.primary_attack_type = raw.get("primary_attack_type")
        analysis.threat_score = float(raw.get("threat_score", 0))
        analysis.confidence = float(raw.get("confidence", 0))
        analysis.executive_summary = raw.get("executive_summary")
        analysis.technical_summary = raw.get("technical_summary")
        analysis.threat_narrative = story_data.get("narrative") if story_data else None
        analysis.skill_level = attacker_prof.get("skill_level")
        analysis.automation_type = attacker_prof.get("automation_level")
        analysis.opsec_quality = attacker_prof.get("opsec_quality")
        analysis.language_artifacts = attacker_prof.get("language_artifacts")
        analysis.behavioral_fingerprint = attacker_prof.get("behavioral_fingerprint")
        tools = attacker_prof.get("tool_chain", attacker_prof.get("tool_fingerprint", ""))
        analysis.tool_signatures = [tools] if isinstance(tools, str) and tools else (tools or [])
        analysis.attacker_profile = attacker_prof.get("attacker_portrait")
        analysis.primary_objective = intent.get("primary_intent")
        analysis.specific_targets = raw.get("specific_targets") or []
        analysis.payload_capabilities = raw.get("payload_capabilities")
        analysis.threat_actor_hypothesis = campaign_info.get("threat_actor_hypothesis")
        analysis.campaign_confidence = float(campaign_info.get("confidence", 0))
        analysis.intent_reconnaissance = float(intent_scores.get("reconnaissance", 0))
        analysis.intent_credential_theft = float(intent_scores.get("credential_theft", 0))
        analysis.intent_rce = float(intent_scores.get("remote_code_execution", 0))
        analysis.intent_data_exfiltration = float(intent_scores.get("data_exfiltration", 0))
        analysis.intent_botnet_recruitment = float(intent_scores.get("botnet_recruitment", 0))
        analysis.intent_ransomware = float(intent_scores.get("ransomware_staging", 0))
        analysis.intent_cryptomining = float(intent_scores.get("cryptomining", 0))
        analysis.primary_intent = intent.get("primary_intent")
        analysis.novelty_score = float(raw.get("novelty_score", 0))
        analysis.novelty_explanation = raw.get("novelty_explanation")
        analysis.deception_recommendation = raw.get("deception_recommendation")
        analysis.next_actions = [
            p.get("predicted_action", "") for p in (raw.get("predicted_next_techniques") or [])
        ]
        analysis.predicted_techniques = [
            p.get("technique_id", "") for p in (raw.get("predicted_next_techniques") or [])
        ]
        analysis.raw_analysis = raw
        await db.flush()

        # ── 9. Store MITRE mappings ───────────────────────────────────
        # Delete old mappings first
        old_mitre = await db.execute(
            select(MitreMapping).where(MitreMapping.analysis_id == analysis.id)
        )
        for m in old_mitre.scalars().all():
            await db.delete(m)

        for t in (raw.get("mitre_techniques") or []):
            mapping = MitreMapping(
                session_id=session_id,
                analysis_id=analysis.id,
                technique_id=t.get("technique_id", ""),
                technique_name=t.get("technique_name", ""),
                tactic=t.get("tactic", ""),
                sub_technique_id=t.get("sub_technique_id"),
                sub_technique_name=t.get("sub_technique_name"),
                confidence=float(t.get("confidence", 0)),
                evidence=t.get("evidence"),
            )
            db.add(mapping)

        # ── 10. Store IOCs (deduplicated by type+value) ───────────────
        for ioc_item in (raw.get("iocs") or []):
            ioc_type = (ioc_item.get("type") or "unknown").lower()
            ioc_value = (ioc_item.get("value") or "").strip()
            if not ioc_value:
                continue
            # Upsert pattern: try to find existing
            existing_ioc = await db.execute(
                select(IOC).where(IOC.ioc_type == ioc_type, IOC.ioc_value == ioc_value)
            )
            existing_ioc = existing_ioc.scalar_one_or_none()
            if existing_ioc:
                existing_ioc.occurrence_count += 1
                existing_ioc.last_seen = datetime.datetime.now(datetime.timezone.utc)
            else:
                db.add(IOC(
                    session_id=session_id,
                    analysis_id=analysis.id,
                    ioc_type=ioc_type,
                    ioc_value=ioc_value,
                    context=ioc_item.get("context"),
                    confidence=float(ioc_item.get("confidence", 0.8)),
                ))

        # ── 11. Store Predictions ─────────────────────────────────────
        old_preds = await db.execute(
            select(Prediction).where(Prediction.analysis_id == analysis.id)
        )
        for p in old_preds.scalars().all():
            await db.delete(p)

        for pred in (raw.get("predicted_next_techniques") or []):
            db.add(Prediction(
                session_id=session_id,
                analysis_id=analysis.id,
                attacker_ip=session.attacker_ip,
                predicted_action=pred.get("predicted_action", ""),
                predicted_technique_id=pred.get("technique_id"),
                reasoning=pred.get("reasoning"),
                confidence=float(pred.get("confidence", 0)),
                time_window=pred.get("time_window"),
            ))

        # ── 12. Store Mitigation Rules ────────────────────────────────
        old_mit = await db.execute(
            select(MitigationRecommendation).where(MitigationRecommendation.analysis_id == analysis.id)
        )
        old_mit_row = old_mit.scalar_one_or_none()
        if old_mit_row:
            await db.delete(old_mit_row)

        db.add(MitigationRecommendation(
            session_id=session_id,
            analysis_id=analysis.id,
            attacker_ip=session.attacker_ip,
            iptables_rule=mitig.get("iptables_rule"),
            nftables_rule=mitig.get("nftables_rule"),
            fail2ban_filter=mitig.get("fail2ban_filter"),
            waf_rule=mitig.get("waf_rule"),
            suricata_rule=mitig.get("suricata_rule"),
            sigma_rule=mitig.get("sigma_rule"),
            yara_rule=mitig.get("yara_rule"),
            recommendation_summary=raw.get("executive_summary"),
            priority="High" if float(raw.get("threat_score", 0)) >= 7 else "Medium",
        ))

        # ── 13. Store Threat Story ────────────────────────────────────
        old_story = await db.execute(
            select(ThreatStory).where(ThreatStory.session_id == session_id)
        )
        old_story_row = old_story.scalar_one_or_none()
        if old_story_row:
            await db.delete(old_story_row)

        db.add(ThreatStory(
            session_id=session_id,
            analysis_id=analysis.id,
            title=story_data.get("title", f"Attack from {session.attacker_ip}") if story_data else f"Attack from {session.attacker_ip}",
            story_markdown=story_data.get("narrative", raw.get("executive_summary", "")) if story_data else raw.get("executive_summary", ""),
            attack_phases=story_data.get("attack_phases") if story_data else None,
            timeline_events=[
                {"timestamp": str(e.event_time), "method": e.request_method, "path": e.request_path}
                for e in events[:20]
            ],
        ))

        # ── 14. Generate Threat Report (Markdown) ────────────────────
        old_report = await db.execute(
            select(ThreatReport).where(ThreatReport.analysis_id == analysis.id)
        )
        old_report_row = old_report.scalar_one_or_none()
        if old_report_row:
            await db.delete(old_report_row)

        md = _build_report_markdown(session, raw, geo)
        db.add(ThreatReport(
            session_id=session_id,
            analysis_id=analysis.id,
            title=story_data.get("title", f"Threat Report: {session.attacker_ip}") if story_data else f"Threat Report: {session.attacker_ip}",
            report_markdown=md,
            executive_summary=raw.get("executive_summary"),
            report_json=raw,
            severity=raw.get("threat_level", "Medium"),
            threat_score=float(raw.get("threat_score", 0)),
        ))

        await db.flush()

        # ── 15. Update AttackerProfile ────────────────────────────────
        await _update_attacker_profile(db, session, raw, analysis)

        # ── 16. Campaign detection ────────────────────────────────────
        if campaign_info.get("is_coordinated_campaign") and float(campaign_info.get("confidence", 0)) >= 0.5:
            await _link_or_create_campaign(db, session_id, session, campaign_info, analysis)

        await db.commit()
        logger.info(f"Session {session_id} analyzed. Threat score: {raw.get('threat_score')}")
        return analysis


async def _update_attacker_profile(db: AsyncSession, session: Session, raw: dict, analysis: SessionAnalysis):
    attacker_prof = raw.get("attacker_profile", {})

    existing = await db.execute(
        select(AttackerProfile).where(AttackerProfile.attacker_ip == session.attacker_ip)
    )
    profile = existing.scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)

    if not profile:
        profile = AttackerProfile(
            attacker_ip=session.attacker_ip,
            asn=session.attacker_asn,
            country=session.attacker_geoip_country,
            isp=session.attacker_isp,
            is_proxy=session.attacker_is_proxy or False,
            is_hosting=session.attacker_is_hosting or False,
            total_sessions=1,
            first_seen=now,
        )
        db.add(profile)
    else:
        profile.total_sessions += 1

    profile.last_seen = now
    profile.skill_level = attacker_prof.get("skill_level") or profile.skill_level
    profile.primary_motivation = attacker_prof.get("primary_motivation") or profile.primary_motivation
    profile.opsec_quality = attacker_prof.get("opsec_quality") or profile.opsec_quality
    profile.language_artifacts = attacker_prof.get("language_artifacts") or profile.language_artifacts
    profile.behavioral_fingerprint = attacker_prof.get("behavioral_fingerprint") or profile.behavioral_fingerprint
    profile.profile_summary = attacker_prof.get("attacker_portrait") or profile.profile_summary
    profile.threat_score = float(raw.get("threat_score", profile.threat_score or 0))
    profile.novelty_score = float(raw.get("novelty_score", profile.novelty_score or 0))
    profile.confidence = float(raw.get("confidence", profile.confidence or 0))
    tool = attacker_prof.get("tool_fingerprint") or attacker_prof.get("tool_chain")
    if tool:
        existing_tools = profile.tool_signatures or []
        if tool not in existing_tools:
            profile.tool_signatures = existing_tools + [tool]
    profile.attributed_threat_actor = (
        raw.get("campaign_assessment", {}).get("threat_actor_hypothesis")
        or profile.attributed_threat_actor
    )
    profile.updated_at = now

    attack_count_res = await db.execute(
        select(func.count(Attack.id))
        .join(Session, Session.id == Attack.session_id)
        .where(Session.attacker_ip == session.attacker_ip)
    )
    profile.total_attacks = attack_count_res.scalar() or 0


async def _link_or_create_campaign(
    db: AsyncSession,
    session_id: uuid.UUID,
    session: Session,
    campaign_info: dict,
    analysis: SessionAnalysis
):
    campaign_name = campaign_info.get("campaign_name") or f"Campaign-{session.attacker_asn or 'Unknown'}"

    # Try to match existing campaign by ASN
    existing = await db.execute(
        select(Campaign).where(Campaign.name == campaign_name)
    )
    campaign = existing.scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    if not campaign:
        campaign = Campaign(
            name=campaign_name,
            description=campaign_info.get("threat_actor_hypothesis"),
            correlated_asns=[session.attacker_asn] if session.attacker_asn else [],
            threat_level=analysis.raw_analysis.get("threat_level", "Medium") if analysis.raw_analysis else "Medium",
            primary_objective=analysis.primary_objective,
            attribution_hypothesis=campaign_info.get("threat_actor_hypothesis"),
            confidence=float(campaign_info.get("confidence", 0)),
            total_sessions=0,
            total_attackers=0,
            first_seen=now,
        )
        db.add(campaign)
        await db.flush()
    else:
        campaign.last_seen = now
        campaign.updated_at = now

    campaign.total_sessions += 1

    # Link session to campaign (skip duplicate)
    existing_link = await db.execute(
        select(CampaignSession).where(
            CampaignSession.campaign_id == campaign.id,
            CampaignSession.session_id == session_id
        )
    )
    if not existing_link.scalar_one_or_none():
        db.add(CampaignSession(campaign_id=campaign.id, session_id=session_id))

    analysis.campaign_id = campaign.id


def _build_report_markdown(session: Session, raw: dict, geo: dict) -> str:
    """Build a complete markdown threat report."""
    mitre = raw.get("mitre_techniques", [])
    mitre_table = "\n".join([
        f"| {t.get('technique_id')} | {t.get('technique_name')} | {t.get('tactic')} | {round(float(t.get('confidence', 0)) * 100)}% |"
        for t in mitre
    ])

    iocs = raw.get("iocs", [])
    ioc_table = "\n".join([
        f"| `{i.get('type')}` | `{i.get('value')}` | {i.get('context', '')} |"
        for i in iocs
    ])

    preds = raw.get("predicted_next_techniques", [])
    preds_block = "\n".join([
        f"- **{p.get('technique_id')} - {p.get('technique_name')}** (confidence: {round(float(p.get('confidence', 0))*100)}%): {p.get('predicted_action')}"
        for p in preds
    ])

    mitig = raw.get("mitigation_rules", {})
    ap = raw.get("attacker_profile", {})
    story = raw.get("threat_story", {})
    ca = raw.get("campaign_assessment", {})

    return f"""# Threat Intelligence Report
**Generated by LLMPot v2** | Session: {session.id}

---

## Executive Summary
{raw.get('executive_summary', 'N/A')}

---

## Classification
| Field | Value |
|-------|-------|
| Threat Score | **{raw.get('threat_score', 'N/A')}/10** |
| Threat Level | **{raw.get('threat_level', 'N/A')}** |
| Primary Attack Type | {raw.get('primary_attack_type', 'N/A')} |
| Confidence | {round(float(raw.get('confidence', 0)) * 100)}% |

---

## Attacker Origin
| Field | Value |
|-------|-------|
| IP Address | `{session.attacker_ip}` |
| Country | {geo.get('country', 'Unknown')} |
| ISP / ASN | {geo.get('isp', 'Unknown')} / {geo.get('asn', 'Unknown')} |
| Proxy/VPN | {'Yes' if geo.get('is_proxy') else 'No'} |
| Hosting/DC | {'Yes' if geo.get('is_hosting') else 'No'} |

---

## Attacker Profile
| Field | Value |
|-------|-------|
| Skill Level | {ap.get('skill_level', 'Unknown')} |
| Automation | {ap.get('automation_level', 'Unknown')} |
| OPSEC Quality | {ap.get('opsec_quality', 'Unknown')} |
| Motivation | {ap.get('primary_motivation', 'Unknown')} |
| Tool | {ap.get('tool_fingerprint', 'Unknown')} |

{ap.get('attacker_portrait', '')}

---

## MITRE ATT&CK Mapping
| Technique | Name | Tactic | Confidence |
|-----------|------|--------|-----------|
{mitre_table or '| N/A | N/A | N/A | N/A |'}

---

## Intent Analysis
**Primary Intent:** {raw.get('intent_analysis', {}).get('primary_intent', 'Unknown')}

{raw.get('intent_analysis', {}).get('evidence', '')}

---

## Threat Story
{story.get('narrative', raw.get('executive_summary', '')) if story else raw.get('executive_summary', '')}

---

## Predicted Next Actions
{preds_block or 'No predictions available.'}

---

## Campaign Assessment
**Campaign:** {ca.get('campaign_name', 'No campaign detected')}
**Attribution:** {ca.get('threat_actor_hypothesis', 'Unknown')}
**Confidence:** {round(float(ca.get('confidence', 0)) * 100)}%

---

## Indicators of Compromise
| Type | Value | Context |
|------|-------|---------|
{ioc_table or '| N/A | N/A | N/A |'}

---

## Mitigation Rules

### iptables
```bash
{mitig.get('iptables_rule', '# No rule generated')}
```

### Fail2Ban Filter
```ini
{mitig.get('fail2ban_filter', '# No filter generated')}
```

### Suricata Rule
```
{mitig.get('suricata_rule', '# No rule generated')}
```

### Sigma Rule
```yaml
{mitig.get('sigma_rule', '# No rule generated')}
```

### YARA Rule
```
{mitig.get('yara_rule', '# No rule generated')}
```

---

## Novelty Assessment
**Score:** {raw.get('novelty_score', 'N/A')}/10

{raw.get('novelty_explanation', '')}

---

## Deception Recommendation
{raw.get('deception_recommendation', 'No recommendation.')}

---
*Report generated by LLMPot v2 Autonomous Threat Intelligence Platform*
"""
