from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import uuid

from app.database.db import get_db
from app.models.v2 import Campaign, CampaignSession, SessionAnalysis
from app.models.all import Session

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


def _campaign_dict(c: Campaign) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "status": c.status,
        "correlated_asns": c.correlated_asns,
        "attack_types": c.attack_types,
        "total_sessions": c.total_sessions,
        "total_attackers": c.total_attackers,
        "primary_objective": c.primary_objective,
        "attribution_hypothesis": c.attribution_hypothesis,
        "confidence": c.confidence,
        "threat_level": c.threat_level,
        "first_seen": c.first_seen,
        "last_seen": c.last_seen,
    }


@router.get("/")
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Campaign).order_by(desc(Campaign.last_seen)).offset(skip).limit(limit)
    if status:
        stmt = stmt.where(Campaign.status == status)
    result = await db.execute(stmt)
    return [_campaign_dict(c) for c in result.scalars().all()]


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    try:
        cid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id")

    campaign = await db.get(Campaign, cid)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get linked sessions
    links_res = await db.execute(
        select(CampaignSession).where(CampaignSession.campaign_id == cid)
    )
    links = links_res.scalars().all()

    session_list = []
    for link in links:
        session = await db.get(Session, link.session_id)
        analysis_res = await db.execute(
            select(SessionAnalysis).where(SessionAnalysis.session_id == link.session_id)
        )
        analysis = analysis_res.scalar_one_or_none()
        if session:
            session_list.append({
                "session_id": str(session.id),
                "attacker_ip": session.attacker_ip,
                "country": session.attacker_geoip_country,
                "start_time": session.start_time,
                "threat_score": analysis.threat_score if analysis else None,
            })

    return {**_campaign_dict(campaign), "sessions": session_list}
