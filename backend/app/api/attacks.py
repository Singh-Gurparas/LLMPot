from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
import math

from app.database.db import get_db
from app.models.all import Attack, Payload, AttackReport, Session, Node

router = APIRouter(prefix="/api/attacks", tags=["Attacks"])

@router.get("/")
async def get_attacks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    classification: Optional[str] = None,
    severity: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Attack).order_by(desc(Attack.created_at)).offset(skip).limit(limit)
    
    if classification:
        stmt = stmt.where(Attack.classification == classification)
    if severity:
        stmt = stmt.where(Attack.severity == severity)
        
    result = await db.execute(stmt)
    attacks = result.scalars().all()
    
    # Needs a Pydantic response model in a real prod API, sending raw dicts for brevity
    return [{
        "id": str(a.id),
        "session_id": str(a.session_id),
        "service": a.service,
        "endpoint": a.endpoint,
        "classification": a.classification,
        "severity": a.severity,
        "created_at": a.created_at
    } for a in attacks]


@router.get("/{attack_id}")
async def get_attack_details(attack_id: str, db: AsyncSession = Depends(get_db)):
    # Join Payload and Report
    stmt = select(Attack).where(Attack.id == attack_id)
    result = await db.execute(stmt)
    attack = result.scalar_one_or_none()
    
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
        
    payload_stmt = select(Payload).where(Payload.attack_id == attack.id)
    payload_res = await db.execute(payload_stmt)
    payload = payload_res.scalar_one_or_none()
    
    report_stmt = select(AttackReport).where(AttackReport.attack_id == attack.id)
    report_res = await db.execute(report_stmt)
    report = report_res.scalar_one_or_none()

    session_stmt = select(Session).where(Session.id == attack.session_id)
    session_res = await db.execute(session_stmt)
    session = session_res.scalar_one_or_none()

    return {
        "id": str(attack.id),
        "service": attack.service,
        "endpoint": attack.endpoint,
        "classification": attack.classification,
        "severity": attack.severity,
        "created_at": attack.created_at,
        "attacker_ip": session.attacker_ip if session else None,
        "geo": {
            "country": session.attacker_geoip_country if session else None,
            "city": session.attacker_geoip_city if session else None,
        },
        "payload": {
            "raw_data": payload.raw_data if payload else None,
            "headers": payload.headers if payload else None,
            "hash": payload.payload_hash if payload else None
        },
        "report": report.report_json if report else None
    }
