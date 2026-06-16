from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, Integer

from app.database.db import get_db
from app.models.v2 import DeceptionMetric, SessionAnalysis

router = APIRouter(prefix="/api/deception", tags=["Deception Analytics"])


@router.get("/metrics")
async def list_metrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DeceptionMetric).order_by(desc(DeceptionMetric.recorded_at)).offset(skip).limit(limit)
    )
    metrics = result.scalars().all()
    return [{
        "id": str(m.id),
        "session_id": str(m.session_id),
        "fake_service": m.fake_service,
        "fake_credential_type": m.fake_credential_type,
        "attacker_engaged": m.attacker_engaged,
        "engagement_depth": m.engagement_depth,
        "intel_extracted": m.intel_extracted,
        "effectiveness_score": m.effectiveness_score,
        "recorded_at": m.recorded_at,
    } for m in metrics]


@router.get("/summary")
async def deception_summary(db: AsyncSession = Depends(get_db)):
    """Aggregate deception effectiveness by service."""
    stmt = (
        select(
            DeceptionMetric.fake_service,
            func.count(DeceptionMetric.id).label("total"),
            func.sum(func.cast(DeceptionMetric.attacker_engaged, Integer)).label("engaged"),
            func.avg(DeceptionMetric.engagement_depth).label("avg_depth"),
            func.avg(DeceptionMetric.effectiveness_score).label("avg_score"),
        )
        .group_by(DeceptionMetric.fake_service)
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [{
        "service": r.fake_service,
        "total": r.total,
        "engaged": int(r.engaged or 0),
        "engagement_rate": round(int(r.engaged or 0) / max(r.total, 1), 3),
        "avg_depth": round(float(r.avg_depth or 0), 2),
        "avg_effectiveness": round(float(r.avg_score or 0), 3),
    } for r in rows]


@router.get("/recommendations")
async def top_deception_recommendations(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Latest deception recommendations from LLM session analyses."""
    result = await db.execute(
        select(SessionAnalysis.deception_recommendation, SessionAnalysis.attacker_ip, SessionAnalysis.analyzed_at)
        .where(SessionAnalysis.deception_recommendation.isnot(None))
        .order_by(desc(SessionAnalysis.analyzed_at))
        .limit(limit)
    )
    rows = result.all()
    return [{
        "attacker_ip": r.attacker_ip,
        "recommendation": r.deception_recommendation,
        "generated_at": r.analyzed_at,
    } for r in rows]
