from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from app.database.db import get_db
from app.models.v2 import Prediction

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/")
async def list_predictions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    attacker_ip: Optional[str] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Prediction)
        .where(Prediction.confidence >= min_confidence)
        .order_by(desc(Prediction.created_at))
        .offset(skip)
        .limit(limit)
    )
    if attacker_ip:
        stmt = stmt.where(Prediction.attacker_ip == attacker_ip)
    result = await db.execute(stmt)
    preds = result.scalars().all()
    return [{
        "id": str(p.id),
        "session_id": str(p.session_id),
        "attacker_ip": p.attacker_ip,
        "predicted_action": p.predicted_action,
        "predicted_technique_id": p.predicted_technique_id,
        "confidence": p.confidence,
        "time_window": p.time_window,
        "reasoning": p.reasoning,
        "validated": p.validated,
        "created_at": p.created_at,
    } for p in preds]


@router.get("/session/{session_id}")
async def session_predictions(session_id: str, db: AsyncSession = Depends(get_db)):
    import uuid
    from fastapi import HTTPException
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")
    result = await db.execute(
        select(Prediction).where(Prediction.session_id == sid).order_by(desc(Prediction.confidence))
    )
    preds = result.scalars().all()
    return [{
        "id": str(p.id),
        "predicted_action": p.predicted_action,
        "predicted_technique_id": p.predicted_technique_id,
        "confidence": p.confidence,
        "time_window": p.time_window,
        "reasoning": p.reasoning,
    } for p in preds]
