from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
import uuid

from app.database.db import get_db
from app.models.v2 import MitigationRecommendation

router = APIRouter(prefix="/api/mitigations", tags=["Mitigations"])


@router.get("/")
async def list_mitigations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    attacker_ip: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(MitigationRecommendation)
        .order_by(desc(MitigationRecommendation.created_at))
        .offset(skip)
        .limit(limit)
    )
    if attacker_ip:
        stmt = stmt.where(MitigationRecommendation.attacker_ip == attacker_ip)
    result = await db.execute(stmt)
    mits = result.scalars().all()
    return [{
        "id": str(m.id),
        "session_id": str(m.session_id),
        "attacker_ip": m.attacker_ip,
        "priority": m.priority,
        "recommendation_summary": m.recommendation_summary,
        "created_at": m.created_at,
    } for m in mits]


@router.get("/{mitigation_id}")
async def get_mitigation(mitigation_id: str, db: AsyncSession = Depends(get_db)):
    try:
        mid = uuid.UUID(mitigation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid mitigation_id")

    m = await db.get(MitigationRecommendation, mid)
    if not m:
        raise HTTPException(status_code=404, detail="Mitigation not found")

    return {
        "id": str(m.id),
        "session_id": str(m.session_id),
        "attacker_ip": m.attacker_ip,
        "priority": m.priority,
        "recommendation_summary": m.recommendation_summary,
        "iptables_rule": m.iptables_rule,
        "nftables_rule": m.nftables_rule,
        "fail2ban_filter": m.fail2ban_filter,
        "waf_rule": m.waf_rule,
        "suricata_rule": m.suricata_rule,
        "sigma_rule": m.sigma_rule,
        "yara_rule": m.yara_rule,
        "created_at": m.created_at,
    }


@router.get("/session/{session_id}")
async def get_session_mitigation(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    result = await db.execute(
        select(MitigationRecommendation)
        .where(MitigationRecommendation.session_id == sid)
        .order_by(desc(MitigationRecommendation.created_at))
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="No mitigation for this session yet")

    return {
        "id": str(m.id),
        "attacker_ip": m.attacker_ip,
        "priority": m.priority,
        "recommendation_summary": m.recommendation_summary,
        "iptables_rule": m.iptables_rule,
        "nftables_rule": m.nftables_rule,
        "fail2ban_filter": m.fail2ban_filter,
        "waf_rule": m.waf_rule,
        "suricata_rule": m.suricata_rule,
        "sigma_rule": m.sigma_rule,
        "yara_rule": m.yara_rule,
        "created_at": m.created_at,
    }
