import asyncio
import json
import logging
import datetime
import redis.asyncio as redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.db import AsyncSessionLocal
from app.models.all import Node, Session, SessionEvent, Attack, Payload
from app.services.geoip_service import geoip_service
from app.services.fingerprint_service import fingerprint_payload
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

REDIS_CHANNEL = "llmpot_events"

async def process_event(event_data: dict, db: AsyncSession):
    try:
        # Expected event mapping
        node_id_str = event_data.get("node_id")
        attacker_ip = event_data.get("ip")
        port = event_data.get("port")
        method = event_data.get("method")
        path = event_data.get("path")
        req_headers = event_data.get("headers", {})
        req_body = event_data.get("body", "")
        res_status = event_data.get("status")
        res_headers = event_data.get("res_headers", {})
        res_body = event_data.get("res_body", "")

        if not attacker_ip or not node_id_str:
            logger.warning(f"Incomplete event data received: {event_data}")
            return

        # Handle GeoIP
        geo_info = geoip_service.lookup(attacker_ip)

        # 1. Update/validate node health
        stmt = select(Node).where(Node.id == node_id_str)
        result = await db.execute(stmt)
        node = result.scalar_one_or_none()
        
        if not node:
            logger.info(f"Registering new node: {node_id_str} ({event_data.get('region')})")
            node = Node(
                id=node_id_str,
                region=event_data.get("region", "unknown"),
                ip=event_data.get("node_ip", "0.0.0.0"),
                status="active"
            )
            db.add(node)
            await db.flush()
        else:
            # Update last seen and uptime if available
            node.last_seen = datetime.datetime.utcnow()
            # node.uptime_seconds = ...
            db.add(node)
            await db.flush()

        # 2. Get or Create active session for this IP + Node
        stmt = select(Session).where(
            Session.node_id == node.id, 
            Session.attacker_ip == attacker_ip, 
            Session.is_active == True
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            session = Session(
                node_id=node.id,
                attacker_ip=attacker_ip,
                attacker_geoip_country=geo_info.get("country"),
                attacker_geoip_city=geo_info.get("city"),
                attacker_geoip_lat=geo_info.get("lat"),
                attacker_geoip_lon=geo_info.get("lon"),
            )
            db.add(session)
            await db.flush()

        # 3. Create SessionEvent
        fingerprint = fingerprint_payload(method, path, req_body)

        session_event = SessionEvent(
            session_id=session.id,
            service_port=port,
            request_method=method,
            request_path=path,
            request_headers=req_headers,
            request_body=req_body,
            response_status=res_status,
            response_headers=res_headers,
            response_body=res_body,
            fingerprint_sha256=fingerprint
        )
        db.add(session_event)
        
        # 4. Trigger AI classification
        # In a real heavy-prod, this might be offloaded to Celery/Kafka worker pool
        # For simplicity, we trigger the abstracted LLM service immediately
        
        # We classify based on the raw request data
        classification_result = await llm_service.classify_attack({
            "method": method,
            "path": path,
            "headers": req_headers,
            "body": req_body
        })

        if classification_result and classification_result.get("is_attack"):
            attack = Attack(
                session_id=session.id,
                service=f"Port {port}", # or dynamic based on port
                endpoint=path or "/",
                classification=classification_result.get("classification", "Unknown"),
                severity=classification_result.get("severity", "Low")
            )
            db.add(attack)
            await db.flush()

            payload = Payload(
                attack_id=attack.id,
                raw_data=req_body if req_body else "No Body",
                headers=req_headers,
                payload_hash=fingerprint
            )
            db.add(payload)

            # Fire-and-forget background report generation
            asyncio.create_task(llm_service.generate_report(attack.id, event_data, classification_result))

        await db.commit()

    except Exception as e:
        logger.error(f"Error processing event: {e}")
        await db.rollback()


async def ingest_redis_events():
    logger.info("Starting Redis Event Consumer...")
    r = await redis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(REDIS_CHANNEL)
    
    logger.info(f"Subscribed to {REDIS_CHANNEL}")

    async for message in pubsub.listen():
        if message["type"] == "message":
            try:
                event_data = json.loads(message["data"])
                async with AsyncSessionLocal() as db:
                     await process_event(event_data, db)
            except json.JSONDecodeError:
                logger.error("Failed to decode event JSON")
            except Exception as e:
                logger.error(f"Event Loop Failure: {e}")
