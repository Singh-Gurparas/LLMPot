from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database.db import get_db
from app.models.v2 import IOC

router = APIRouter(prefix="/api/iocs", tags=["IOCs"])


@router.get("/")
async def list_iocs(
    ioc_type: str = Query(None),
    search: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(IOC).order_by(desc(IOC.last_seen)).offset(skip).limit(limit)
    if ioc_type:
        stmt = stmt.where(IOC.ioc_type == ioc_type)
    if search:
        stmt = stmt.where(IOC.ioc_value.ilike(f"%{search}%"))
    result = await db.execute(stmt)
    iocs = result.scalars().all()
    return [{
        "id": str(i.id),
        "session_id": str(i.session_id),
        "type": i.ioc_type,
        "value": i.ioc_value,
        "context": i.context,
        "confidence": i.confidence,
        "first_seen": i.first_seen,
        "last_seen": i.last_seen,
        "occurrence_count": i.occurrence_count,
    } for i in iocs]


@router.get("/stats")
async def ioc_stats(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(IOC.ioc_type, func.count(IOC.id).label("count"))
        .group_by(IOC.ioc_type)
        .order_by(desc(func.count(IOC.id)))
    )
    result = await db.execute(stmt)
    return [{"type": r.ioc_type, "count": r.count} for r in result.all()]


@router.get("/top")
async def top_iocs(
    ioc_type: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(IOC)
        .order_by(desc(IOC.occurrence_count), desc(IOC.last_seen))
        .limit(limit)
    )
    if ioc_type:
        stmt = stmt.where(IOC.ioc_type == ioc_type)
    result = await db.execute(stmt)
    iocs = result.scalars().all()
    return [{
        "type": i.ioc_type,
        "value": i.ioc_value,
        "count": i.occurrence_count,
        "last_seen": i.last_seen,
    } for i in iocs]
