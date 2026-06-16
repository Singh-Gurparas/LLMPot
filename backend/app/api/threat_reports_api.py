from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import uuid

from app.database.db import get_db
from app.models.v2 import ThreatReport, SessionAnalysis
from app.models.all import Session

router = APIRouter(prefix="/api/threat-reports", tags=["Threat Reports"])


@router.get("/")
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    severity: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ThreatReport).order_by(desc(ThreatReport.generated_at)).offset(skip).limit(limit)
    if severity:
        stmt = stmt.where(ThreatReport.severity == severity)
    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [{
        "id": str(r.id),
        "session_id": str(r.session_id),
        "title": r.title,
        "severity": r.severity,
        "threat_score": r.threat_score,
        "executive_summary": (r.executive_summary or "")[:300],
        "generated_at": r.generated_at,
        "campaign_id": str(r.campaign_id) if r.campaign_id else None,
    } for r in reports]


@router.get("/{report_id}")
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report_id")

    report = await db.get(ThreatReport, rid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    session = await db.get(Session, report.session_id)
    analysis = await db.get(SessionAnalysis, report.analysis_id) if report.analysis_id else None

    return {
        "id": str(report.id),
        "session_id": str(report.session_id),
        "title": report.title,
        "severity": report.severity,
        "threat_score": report.threat_score,
        "executive_summary": report.executive_summary,
        "report_markdown": report.report_markdown,
        "report_json": report.report_json,
        "generated_at": report.generated_at,
        "campaign_id": str(report.campaign_id) if report.campaign_id else None,
        "attacker_ip": session.attacker_ip if session else None,
        "country": session.attacker_geoip_country if session else None,
        "analysis_id": str(report.analysis_id) if report.analysis_id else None,
    }


@router.get("/{report_id}/export/markdown")
async def export_markdown(report_id: str, db: AsyncSession = Depends(get_db)):
    try:
        rid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report_id")

    report = await db.get(ThreatReport, rid)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.report_markdown:
        raise HTTPException(status_code=404, detail="No markdown available for this report")

    filename = f"threat_report_{report_id[:8]}.md"
    return Response(
        content=report.report_markdown,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/session/{session_id}")
async def get_report_by_session(session_id: str, db: AsyncSession = Depends(get_db)):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    result = await db.execute(
        select(ThreatReport).where(ThreatReport.session_id == sid).order_by(desc(ThreatReport.generated_at))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="No report for this session")
    return {
        "id": str(report.id),
        "title": report.title,
        "severity": report.severity,
        "threat_score": report.threat_score,
        "report_markdown": report.report_markdown,
        "report_json": report.report_json,
        "generated_at": report.generated_at,
    }
