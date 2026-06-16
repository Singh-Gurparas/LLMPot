from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database.db import get_db
from app.models.v2 import MitreMapping

router = APIRouter(prefix="/api/mitre", tags=["MITRE ATT&CK"])


@router.get("/")
async def list_mappings(
    tactic: str = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    limit: int = Query(200, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(MitreMapping)
        .where(MitreMapping.confidence >= min_confidence)
        .order_by(desc(MitreMapping.observed_at))
        .limit(limit)
    )
    if tactic:
        stmt = stmt.where(MitreMapping.tactic == tactic)
    result = await db.execute(stmt)
    mappings = result.scalars().all()
    return [{
        "id": str(m.id),
        "session_id": str(m.session_id),
        "technique_id": m.technique_id,
        "technique_name": m.technique_name,
        "tactic": m.tactic,
        "sub_technique_id": m.sub_technique_id,
        "confidence": m.confidence,
        "evidence": m.evidence,
        "observed_at": m.observed_at,
    } for m in mappings]


@router.get("/summary")
async def technique_summary(db: AsyncSession = Depends(get_db)):
    """Aggregate: technique_id → count, avg_confidence, example evidence."""
    stmt = (
        select(
            MitreMapping.technique_id,
            MitreMapping.technique_name,
            MitreMapping.tactic,
            func.count(MitreMapping.id).label("count"),
            func.avg(MitreMapping.confidence).label("avg_confidence"),
        )
        .group_by(MitreMapping.technique_id, MitreMapping.technique_name, MitreMapping.tactic)
        .order_by(desc(func.count(MitreMapping.id)))
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [{
        "technique_id": r.technique_id,
        "technique_name": r.technique_name,
        "tactic": r.tactic,
        "count": r.count,
        "avg_confidence": round(float(r.avg_confidence or 0), 3),
    } for r in rows]


@router.get("/tactics")
async def tactics_breakdown(db: AsyncSession = Depends(get_db)):
    """Count of unique techniques per tactic."""
    stmt = (
        select(
            MitreMapping.tactic,
            func.count(func.distinct(MitreMapping.technique_id)).label("technique_count"),
            func.count(MitreMapping.id).label("total_observations"),
        )
        .group_by(MitreMapping.tactic)
        .order_by(desc(func.count(MitreMapping.id)))
    )
    result = await db.execute(stmt)
    return [{"tactic": r.tactic, "technique_count": r.technique_count, "observations": r.total_observations}
            for r in result.all()]
