"""API for session-level analysis (V2 intelligence)."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

from app.database.db import get_db
from app.models.v2 import SessionAnalysis, ThreatStory, MitreMapping, Prediction, MitigationRecommendation
from app.services import threat_intelligence_service as ti_service

router = APIRouter(prefix="/api/sessions", tags=["Session Analysis"])


@router.get("/{session_id}/analysis")
async def get_session_analysis(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    result = await db.execute(
        select(SessionAnalysis).where(SessionAnalysis.session_id == sid)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis available for this session yet")

    return {
        "id": str(analysis.id),
        "session_id": str(analysis.session_id),
        "attacker_ip": analysis.attacker_ip,
        "analyzed_at": analysis.analyzed_at,
        "threat_score": analysis.threat_score,
        "threat_level": analysis.raw_analysis.get("threat_level") if analysis.raw_analysis else None,
        "confidence": analysis.confidence,
        "primary_attack_type": analysis.primary_attack_type,
        "primary_intent": analysis.primary_intent,
        "executive_summary": analysis.executive_summary,
        "technical_summary": analysis.technical_summary,
        "threat_narrative": analysis.threat_narrative,
        "skill_level": analysis.skill_level,
        "automation_type": analysis.automation_type,
        "opsec_quality": analysis.opsec_quality,
        "language_artifacts": analysis.language_artifacts,
        "behavioral_fingerprint": analysis.behavioral_fingerprint,
        "tool_signatures": analysis.tool_signatures,
        "attacker_profile": analysis.attacker_profile,
        "primary_objective": analysis.primary_objective,
        "specific_targets": analysis.specific_targets,
        "payload_capabilities": analysis.payload_capabilities,
        "threat_actor_hypothesis": analysis.threat_actor_hypothesis,
        "campaign_id": str(analysis.campaign_id) if analysis.campaign_id else None,
        "campaign_confidence": analysis.campaign_confidence,
        "intent_scores": {
            "reconnaissance": analysis.intent_reconnaissance,
            "credential_theft": analysis.intent_credential_theft,
            "rce": analysis.intent_rce,
            "data_exfiltration": analysis.intent_data_exfiltration,
            "botnet_recruitment": analysis.intent_botnet_recruitment,
            "ransomware": analysis.intent_ransomware,
            "cryptomining": analysis.intent_cryptomining,
        },
        "novelty_score": analysis.novelty_score,
        "novelty_explanation": analysis.novelty_explanation,
        "deception_recommendation": analysis.deception_recommendation,
        "next_actions": analysis.next_actions,
        "predicted_techniques": analysis.predicted_techniques,
    }


@router.get("/{session_id}/story")
async def get_threat_story(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    result = await db.execute(
        select(ThreatStory).where(ThreatStory.session_id == sid)
    )
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="No threat story for this session yet")

    return {
        "id": str(story.id),
        "session_id": str(story.session_id),
        "title": story.title,
        "story_markdown": story.story_markdown,
        "attack_phases": story.attack_phases,
        "timeline_events": story.timeline_events,
        "generated_at": story.generated_at,
    }


@router.get("/{session_id}/mitre")
async def get_session_mitre(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    result = await db.execute(
        select(MitreMapping).where(MitreMapping.session_id == sid).order_by(desc(MitreMapping.confidence))
    )
    mappings = result.scalars().all()
    return [{
        "technique_id": m.technique_id,
        "technique_name": m.technique_name,
        "tactic": m.tactic,
        "sub_technique_id": m.sub_technique_id,
        "confidence": m.confidence,
        "evidence": m.evidence,
    } for m in mappings]


@router.post("/{session_id}/analyze")
async def trigger_analysis(session_id: str, background_tasks: BackgroundTasks):
    """Manually trigger session analysis (re-runs the full pipeline)."""
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    background_tasks.add_task(ti_service.analyze_session, sid)
    return {"status": "queued", "session_id": session_id}
