"""
Background worker: polls for sessions with attacks that haven't been analyzed yet,
then triggers the threat intelligence pipeline.

Strategy:
- Every 45 seconds, find sessions that have >= 1 attack but no SessionAnalysis yet.
- Limit to 3 concurrent analyses per batch to avoid overwhelming Groq API.
- Also re-analyze sessions that got new attacks since last analysis (re-analysis).
"""

import asyncio
import logging
import datetime

from sqlalchemy import select, desc, not_, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.db import AsyncSessionLocal
from app.models.all import Session, Attack
from app.models.v2 import SessionAnalysis
from app.services import threat_intelligence_service as ti_service

logger = logging.getLogger(__name__)

POLL_INTERVAL = 45  # seconds between background scans
BATCH_SIZE = 3       # max concurrent analyses per poll


async def run_background_worker():
    logger.info("LLMPot Background Worker started")
    while True:
        await asyncio.sleep(POLL_INTERVAL)
        try:
            await _process_pending_sessions()
        except Exception as e:
            logger.error(f"Background worker poll error: {e}")


async def _process_pending_sessions():
    async with AsyncSessionLocal() as db:
        # Find sessions with attacks but no analysis yet
        stmt = (
            select(Session.id)
            .join(Attack, Attack.session_id == Session.id)
            .where(
                not_(
                    exists().where(SessionAnalysis.session_id == Session.id)
                )
            )
            .distinct()
            .limit(BATCH_SIZE)
        )
        result = await db.execute(stmt)
        session_ids = result.scalars().all()

    if session_ids:
        logger.info(f"Background worker: analyzing {len(session_ids)} sessions")
        tasks = [ti_service.analyze_session(sid) for sid in session_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                logger.error(f"Analysis failed for session {session_ids[i]}: {r}")
            else:
                logger.info(f"Analysis complete for session {session_ids[i]}")
