import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

from app.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    @abstractmethod
    async def classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def generate_report(self, attack_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def analyze_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        pass


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = "llama-3.3-70b-versatile"
        try:
            from groq import AsyncGroq
            self.client = AsyncGroq(api_key=api_key)
        except ImportError:
            logger.error("Groq package not installed")
            self.client = None

    async def classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return self._fallback_classify(request_data)

        prompt = f"""Analyze this honeypot HTTP request. Return ONLY valid JSON.

Method: {request_data.get('method')}
Path: {request_data.get('path')}
Headers: {json.dumps(request_data.get('headers', {}))}
Body: {str(request_data.get('body', ''))[:1000]}

JSON schema:
{{
    "is_attack": boolean,
    "attack_type": string,
    "severity": "Low"|"Medium"|"High"|"Critical",
    "confidence": float 0.0-1.0,
    "summary": string,
    "mitigation_suggestion": string
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert cybersecurity traffic analyzer. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            if "attack_type" in data:
                data["classification"] = data["attack_type"]
            return data
        except Exception as e:
            logger.error(f"Groq classify error: {e}")
            return self._fallback_classify(request_data)

    def _fallback_classify(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        path = request_data.get('path', '').lower()
        body = str(request_data.get('body', '')).lower()
        if 'select' in path or 'union' in body or 'select' in body:
            return {"is_attack": True, "attack_type": "SQL Injection (Rule)", "classification": "SQL Injection (Rule)", "severity": "High", "confidence": 0.5, "summary": "SQL keywords detected", "mitigation_suggestion": "Input sanitization"}
        return {"is_attack": True, "attack_type": "Suspicious Probe (Rule)", "classification": "Suspicious Probe (Rule)", "severity": "Medium", "confidence": 0.3, "summary": "LLM unavailable, rule-based trigger", "mitigation_suggestion": "Investigate IP"}

    async def generate_report(self, attack_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return {}

        event = attack_data.get("event", {})
        cls = attack_data.get("classification", {})
        geo = attack_data.get("geo_enrichment", {})
        history = attack_data.get("session_history", [])

        geo_block = f"""Country: {geo.get('country', 'Unknown')}
City: {geo.get('city', 'Unknown')}
Continent: {geo.get('continent', 'Unknown')}
ISP: {geo.get('isp', 'Unknown')} | ASN: {geo.get('asn', 'Unknown')}
Proxy/VPN: {geo.get('is_proxy', False)} | Hosting/DC: {geo.get('is_hosting', False)}
Reverse DNS: {geo.get('hostname', 'None')}"""

        history_block = json.dumps(history, indent=2) if history else "First request in this session"

        prompt = f"""You are a senior honeypot intelligence analyst extracting unique per-attack intelligence.

=== CAPTURED REQUEST ===
Method: {event.get('method')} {event.get('path')}
Headers: {json.dumps(event.get('headers', {}), indent=2)}
Body: {str(event.get('body', ''))[:3000]}
Response Status: {event.get('status')}

=== ATTACKER ORIGIN ===
{geo_block}

=== SESSION HISTORY ===
{history_block}

=== INITIAL CLASSIFICATION ===
{json.dumps(cls, indent=2)}

Return comprehensive intelligence JSON:
{{
    "attack_type": "precise classification",
    "severity": "Low|Medium|High|Critical",
    "confidence": 0.0-1.0,

    "executive_summary": "2-3 sentence summary",
    "attack_steps": ["ordered steps attacker executed"],
    "payload_capabilities": "exact impact if payload succeeded",
    "targeted_cve": "CVE-YYYY-XXXXX or 'Generic technique'",
    "extracted_iocs": ["IPs, URLs, hashes, filenames from payload"],

    "tool_fingerprint": "specific tool/version from headers/UA/payload",
    "attacker_tooling": "full tool chain summary",
    "automation_assessment": "Manual|Semi-Automated|Fully-Automated|Botnet with evidence",

    "skill_level": "Script Kiddie|Intermediate|Advanced|Nation-State with evidence",
    "language_artifacts": "language/cultural indicators or 'None detected'",
    "opsec_quality": "Poor|Moderate|Good|Excellent with evidence",
    "behavioral_signature": "unique fingerprint of this attacker's methodology",
    "attacker_profile": "4-6 sentence portrait of this specific attacker",

    "specific_objective": "exactly what they're targeting",
    "novelty_score": 1-10,
    "novelty_explanation": "is this vanilla or novel technique",
    "campaign_hypothesis": "known threat actor/campaign match if any",

    "deception_recommendation": "specific fake data to serve for more intelligence",
    "next_attack_prediction": "2-3 likely follow-up actions with reasoning",

    "mitigation_suggestion": "defensive recommendation for real infrastructure"
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior honeypot intelligence analyst. Output JSON only. Be specific and evidence-based."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Groq report generation error: {e}")
            return {}

    async def analyze_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core V2 intelligence: analyze a complete session end-to-end.
        Produces MITRE mappings, intent scores, predictions, mitigation rules, threat story.
        """
        if not self.client:
            return {}

        session = session_data.get("session", {})
        events = session_data.get("events", [])
        attacks = session_data.get("attacks", [])
        geo = session_data.get("geo", {})
        prior_sessions = session_data.get("prior_sessions", [])

        events_block = "\n".join([
            f"  [{e.get('timestamp', '')}] {e.get('method', '')} {e.get('path', '')} → {e.get('response_status', '')} | UA: {e.get('ua', '')[:60]} | Body: {(e.get('body_snippet') or '')[:200]}"
            for e in events
        ]) or "  (no events)"

        attacks_block = "\n".join([
            f"  - {a.get('classification', 'Unknown')} ({a.get('severity', '')}) @ {a.get('endpoint', '')} | Confidence: {a.get('confidence', '')}"
            for a in attacks
        ]) or "  (no classified attacks)"

        prior_block = ""
        if prior_sessions:
            prior_block = f"\n=== PRIOR SESSIONS FROM THIS IP ({len(prior_sessions)} found) ===\n"
            for p in prior_sessions[:3]:
                prior_block += f"  Session {p.get('id', '')[:8]}: {p.get('attack_count', 0)} attacks, types: {p.get('attack_types', [])}, at {p.get('start_time', '')}\n"

        prompt = f"""You are a senior threat intelligence analyst at a honeypot intelligence center.
A complete attacker session has been captured. Produce a comprehensive intelligence assessment.
This is what LLMs uniquely can do — synthesize unstructured attack data into actionable intelligence.

=== ATTACKER IDENTITY ===
IP: {session.get('ip', 'Unknown')}
Country: {geo.get('country', 'Unknown')} / {geo.get('continent', 'Unknown')}
ISP: {geo.get('isp', 'Unknown')} | ASN: {geo.get('asn', 'Unknown')}
Proxy/VPN: {geo.get('is_proxy', False)} | Hosting/DC: {geo.get('is_hosting', False)}
Mobile Network: {geo.get('is_mobile', False)} | Reverse DNS: {geo.get('hostname', 'None')}
{prior_block}

=== COMPLETE SESSION TIMELINE ({len(events)} events) ===
{events_block}

=== CLASSIFIED ATTACKS IN THIS SESSION ===
{attacks_block}

Produce complete threat intelligence JSON — be specific, cite evidence from the actual session:
{{
    "executive_summary": "3-5 sentence high-level assessment of this attacker and what they're trying to accomplish",
    "technical_summary": "Technical breakdown of what happened: tools, techniques, attack chain progression",

    "threat_score": 1-10 integer,
    "threat_level": "Low|Medium|High|Critical",
    "confidence": 0.0-1.0,

    "primary_attack_type": "primary category (e.g. SQL Injection Campaign, Credential Stuffing, RCE Exploitation)",

    "intent_analysis": {{
        "primary_intent": "most likely objective",
        "intent_scores": {{
            "reconnaissance": 0.0-1.0,
            "credential_theft": 0.0-1.0,
            "remote_code_execution": 0.0-1.0,
            "data_exfiltration": 0.0-1.0,
            "botnet_recruitment": 0.0-1.0,
            "ransomware_staging": 0.0-1.0,
            "cryptomining": 0.0-1.0
        }},
        "evidence": "specific evidence from session supporting primary intent"
    }},

    "mitre_techniques": [
        {{
            "technique_id": "T1595",
            "technique_name": "Active Scanning",
            "tactic": "Reconnaissance",
            "sub_technique_id": "T1595.002",
            "sub_technique_name": "Vulnerability Scanning",
            "confidence": 0.0-1.0,
            "evidence": "specific observed behavior mapping to this technique"
        }}
    ],

    "predicted_next_techniques": [
        {{
            "technique_id": "T1190",
            "technique_name": "Exploit Public-Facing Application",
            "predicted_action": "detailed prediction of what the attacker will attempt next",
            "confidence": 0.0-1.0,
            "time_window": "within session|next 1h|next 24h|next week",
            "reasoning": "why we predict this based on observed behavior"
        }}
    ],

    "attacker_profile": {{
        "skill_level": "Script Kiddie|Intermediate|Advanced|Nation-State",
        "skill_evidence": "specific evidence from session",
        "automation_level": "Manual|Semi-Automated|Fully-Automated|Botnet",
        "automation_evidence": "specific timing/pattern evidence",
        "opsec_quality": "Poor|Moderate|Good|Excellent",
        "opsec_evidence": "evidence of evasion attempts or lack thereof",
        "primary_motivation": "Financial|Espionage|Hacktivism|Research|Indiscriminate Scanning|Unknown",
        "tool_fingerprint": "exact tool/version/config from UA, headers, payload structure",
        "tool_chain": "full set of tools/frameworks inferred",
        "language_artifacts": "language/cultural indicators in payload or 'None detected'",
        "behavioral_fingerprint": "unique cross-attack identifier for this actor",
        "attacker_portrait": "4-6 sentence profile of this specific attacker"
    }},

    "campaign_assessment": {{
        "is_coordinated_campaign": true|false,
        "campaign_name": "descriptive name or known campaign name",
        "threat_actor_hypothesis": "attribution to known group if recognizable, else 'Generic Actor'",
        "correlation_factors": ["factors suggesting campaign vs. opportunistic attack"],
        "confidence": 0.0-1.0
    }},

    "iocs": [
        {{
            "type": "ip|domain|url|user_agent|hash|command|filename|payload_pattern",
            "value": "exact extracted value",
            "context": "where in session this was observed",
            "confidence": 0.0-1.0
        }}
    ],

    "threat_story": {{
        "title": "Descriptive incident title",
        "narrative": "Flowing timestamped story of the attack: 'The attacker from [country] began by... followed by... revealing that...'",
        "attack_phases": [
            {{"phase": "Initial Access/Reconnaissance", "description": "...", "events": ["specific requests"]}}
        ]
    }},

    "mitigation_rules": {{
        "iptables_rule": "# Block attacker IP\\niptables -A INPUT -s IP_HERE -j DROP",
        "nftables_rule": "# nftables equivalent",
        "fail2ban_filter": "[Definition]\\nfailregex = <HOST>.*specific_pattern",
        "waf_rule": "SecRule specific WAF rule in ModSecurity format",
        "suricata_rule": "alert http $EXTERNAL_NET any -> $HOME_NET any (msg:\"...\"; content:\"...\"; sid:9000001;)",
        "sigma_rule": "title: ...\\nstatus: experimental\\ndetection:\\n    condition: ...",
        "yara_rule": "rule LLMPot_Attacker {{\\n    strings:\\n        $ = \\\"pattern\\\"\\n    condition:\\n        any of them\\n}}"
    }},

    "deception_effectiveness": {{
        "honeypot_detected": "likely|unlikely|unknown",
        "detection_evidence": "any evidence they recognized it's a honeypot",
        "engagement_quality": "Low|Medium|High",
        "intelligence_value": "what we uniquely learned from letting this attacker in"
    }},

    "deception_recommendation": "Specific fake data the honeypot should serve to extract MORE intelligence from this actor type",

    "specific_targets": ["exact files, tables, endpoints, credentials being sought"],
    "payload_capabilities": "exact impact if any payload had succeeded",
    "targeted_cve": "CVE-YYYY-XXXXX or list, or 'Generic technique / No specific CVE'",

    "novelty_score": 1-10,
    "novelty_explanation": "is this vanilla, customized, or novel? what's interesting?"
}}"""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a senior threat intelligence analyst. Your output is used by security teams. "
                            "Be specific, cite evidence from the actual session data, never generalize. "
                            "Output JSON only. Every field must be based on observable evidence."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
                max_tokens=4000
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Session analysis LLM error: {e}")
            return {}


class LLMService:
    def __init__(self):
        self.provider = None
        if settings.LLM_PROVIDER.lower() == "groq":
            if settings.GROQ_API_KEY:
                self.provider = GroqProvider(api_key=settings.GROQ_API_KEY)
            else:
                logger.error("GROQ_API_KEY missing. Rule-based classification only.")
        else:
            logger.warning(f"Unsupported LLM provider: {settings.LLM_PROVIDER}")

    async def classify_attack(self, request_data: dict) -> dict:
        if self.provider:
            return await self.provider.classify(request_data)

        path = request_data.get('path', '').lower()
        if 'wp-admin' in path or 'wp-login' in path:
            return {"is_attack": True, "classification": "WordPress Brute-force/Probe", "severity": "Medium", "confidence": 0.6, "summary": "Access attempt to sensitive WP paths", "mitigation_suggestion": "Block IP"}
        return {"is_attack": True, "classification": "Unclassified Probe", "severity": "Low", "confidence": 0.4, "summary": "Suspicious traffic without LLM analysis", "mitigation_suggestion": "Monitor IP"}

    async def generate_report(
        self,
        attack_id,
        event_data: dict,
        cls_data: dict,
        geo_enrichment: dict = None,
        session_events: List[dict] = None
    ):
        from app.database.db import AsyncSessionLocal
        from app.models.all import AttackReport

        if not self.provider:
            return

        report_json = await self.provider.generate_report({
            "event": event_data,
            "classification": cls_data,
            "geo_enrichment": geo_enrichment or {},
            "session_history": session_events or []
        })

        if report_json:
            async with AsyncSessionLocal() as db:
                report = AttackReport(
                    attack_id=attack_id,
                    report_json=report_json
                )
                db.add(report)
                try:
                    await db.commit()
                except Exception as e:
                    logger.error(f"Failed to save report: {e}")

    async def analyze_session_intelligence(self, session_data: dict) -> dict:
        """Full session-level intelligence analysis (V2 core)."""
        if not self.provider:
            return {}
        return await self.provider.analyze_session(session_data)


llm_service = LLMService()
