from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
import uuid

from app.database.db import get_db
from app.models.v2 import AttackerProfile, SessionAnalysis
from app.models.all import Session, Attack

router = APIRouter(prefix="/api/attacker-profiles", tags=["Attacker Profiles"])


def _profile_dict(p: AttackerProfile) -> dict:
    return {
        "id": str(p.id),
        "attacker_ip": p.attacker_ip,
        "country": p.country,
        "isp": p.isp,
        "asn": p.asn,
        "is_proxy": p.is_proxy,
        "is_hosting": p.is_hosting,
        "total_sessions": p.total_sessions,
        "total_attacks": p.total_attacks,
        "first_seen": p.first_seen,
        "last_seen": p.last_seen,
        "skill_level": p.skill_level,
        "primary_motivation": p.primary_motivation,
        "tool_signatures": p.tool_signatures,
        "opsec_quality": p.opsec_quality,
        "behavioral_fingerprint": p.behavioral_fingerprint,
        "profile_summary": p.profile_summary,
        "threat_score": p.threat_score,
        "novelty_score": p.novelty_score,
        "attributed_threat_actor": p.attributed_threat_actor,
        "confidence": p.confidence,
    }


@router.get("/")
async def list_profiles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AttackerProfile).order_by(desc(AttackerProfile.threat_score)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    profiles = result.scalars().all()
    return [_profile_dict(p) for p in profiles]


@router.get("/{profile_id}")
async def get_profile(profile_id: str, db: AsyncSession = Depends(get_db)):
    try:
        pid = uuid.UUID(profile_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid profile_id")

    profile = await db.get(AttackerProfile, pid)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get all sessions for this IP
    sessions_res = await db.execute(
        select(Session).where(Session.attacker_ip == profile.attacker_ip).order_by(desc(Session.start_time))
    )
    sessions = sessions_res.scalars().all()

    session_list = []
    for s in sessions:
        analysis_res = await db.execute(
            select(SessionAnalysis).where(SessionAnalysis.session_id == s.id)
        )
        analysis = analysis_res.scalar_one_or_none()
        session_list.append({
            "id": str(s.id),
            "start_time": s.start_time,
            "end_time": s.end_time,
            "is_active": s.is_active,
            "threat_score": analysis.threat_score if analysis else None,
            "primary_intent": analysis.primary_intent if analysis else None,
            "executive_summary": analysis.executive_summary[:200] if analysis and analysis.executive_summary else None,
        })

    return {**_profile_dict(profile), "sessions": session_list}


@router.get("/by-ip/{ip_address}")
async def get_profile_by_ip(ip_address: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AttackerProfile).where(AttackerProfile.attacker_ip == ip_address)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile for this IP")
    return _profile_dict(profile)
