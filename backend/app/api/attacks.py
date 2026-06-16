from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
import uuid

from app.database.db import get_db
from app.models.all import Attack, Payload, AttackReport, Session

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
    try:
        attack_uuid = uuid.UUID(attack_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid attack_id format")

    stmt = select(Attack).where(Attack.id == attack_uuid)
    result = await db.execute(stmt)
    attack = result.scalar_one_or_none()

    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")

    payload_res = await db.execute(select(Payload).where(Payload.attack_id == attack.id))
    payload = payload_res.scalar_one_or_none()

    report_res = await db.execute(select(AttackReport).where(AttackReport.attack_id == attack.id))
    report = report_res.scalar_one_or_none()

    session_res = await db.execute(select(Session).where(Session.id == attack.session_id))
    session = session_res.scalar_one_or_none()

    return {
        "id": str(attack.id),
        "session_id": str(attack.session_id),
        "service": attack.service,
        "endpoint": attack.endpoint,
        "classification": attack.classification,
        "severity": attack.severity,
        "created_at": attack.created_at,
        "attacker_ip": session.attacker_ip if session else None,
        "geo": {
            "country": session.attacker_geoip_country if session else None,
            "city": session.attacker_geoip_city if session else None,
            "continent": session.attacker_geoip_continent if session else None,
            "timezone": session.attacker_geoip_timezone if session else None,
            "lat": session.attacker_geoip_lat if session else None,
            "lon": session.attacker_geoip_lon if session else None,
        },
        "ip_intelligence": {
            "isp": session.attacker_isp if session else None,
            "org": session.attacker_org if session else None,
            "asn": session.attacker_asn if session else None,
            "is_proxy": session.attacker_is_proxy if session else None,
            "is_hosting": session.attacker_is_hosting if session else None,
            "is_mobile": session.attacker_is_mobile if session else None,
            "hostname": session.attacker_hostname if session else None,
        },
        "payload": {
            "raw_data": payload.raw_data if payload else None,
            "headers": payload.headers if payload else None,
            "hash": payload.payload_hash if payload else None
        },
        "report": report.report_json if report else None
    }
