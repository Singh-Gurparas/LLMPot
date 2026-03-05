from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database.db import get_db
from app.models.all import Session, SessionEvent, Node

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

@router.get("/{session_id}/replay")
async def get_session_replay(session_id: str, db: AsyncSession = Depends(get_db)):
    # Verify session exists
    session_stmt = select(Session).where(Session.id == session_id)
    session_result = await db.execute(session_stmt)
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Get all events for the session in chronological order
    events_stmt = select(SessionEvent).where(SessionEvent.session_id == session_id).order_by(SessionEvent.event_time)
    events_result = await db.execute(events_stmt)
    events = events_result.scalars().all()

    return {
        "session_id": str(session.id),
        "attacker_ip": session.attacker_ip,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "events": [
            {
                "id": str(e.id),
                "timestamp": e.event_time,
                "port": e.service_port,
                "request": {
                    "method": e.request_method,
                    "path": e.request_path,
                    "headers": e.request_headers,
                    "body": e.request_body
                },
                "response": {
                    "status": e.response_status,
                    "headers": e.response_headers,
                    "body": e.response_body
                },
                "fingerprint": e.fingerprint_sha256
            } for e in events
        ]
    }
