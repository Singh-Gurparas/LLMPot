import asyncio
import json
import logging
import datetime
import redis.asyncio as redis
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.db import AsyncSessionLocal
from app.models.all import Node, Session, SessionEvent, Attack, Payload
from app.services.geoip_service import geoip_service
from app.services.fingerprint_service import fingerprint_payload
from app.services.llm_service import llm_service
from app.services import threat_intelligence_service as ti_service

logger = logging.getLogger(__name__)

REDIS_CHANNEL = "llmpot_events"


async def process_event(event_data: dict, db: AsyncSession):
    try:
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
            logger.warning(f"Incomplete event: {event_data}")
            return

        # Geo + async IP enrichment in parallel
        geo_info = geoip_service.lookup(attacker_ip)
        ip_intel = await geoip_service.enrich_ip_intelligence(attacker_ip)

        # Merged enrichment context passed to LLM later
        geo_enrichment = {**geo_info, **ip_intel}

        # 1. Update/register node
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
            node.last_seen = datetime.datetime.now(datetime.timezone.utc)
            db.add(node)
            await db.flush()

        # 2. Get or create active session for this IP + Node
        stmt = select(Session).where(
            Session.node_id == node.id,
            Session.attacker_ip == attacker_ip,
            Session.is_active.is_(True)
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            session = Session(
                node_id=node.id,
                attacker_ip=attacker_ip,
                # GeoIP
                attacker_geoip_country=geo_info.get("country"),
                attacker_geoip_city=geo_info.get("city"),
                attacker_geoip_lat=geo_info.get("lat"),
                attacker_geoip_lon=geo_info.get("lon"),
                attacker_geoip_continent=geo_info.get("continent"),
                attacker_geoip_timezone=geo_info.get("timezone"),
                # IP Intelligence
                attacker_isp=ip_intel.get("isp"),
                attacker_org=ip_intel.get("org"),
                attacker_asn=ip_intel.get("asn"),
                attacker_is_proxy=ip_intel.get("is_proxy", False),
                attacker_is_hosting=ip_intel.get("is_hosting", False),
                attacker_is_mobile=ip_intel.get("is_mobile", False),
                attacker_hostname=ip_intel.get("hostname"),
            )
            db.add(session)
            await db.flush()

        # 3. Fetch recent session history for LLM context (last 8 events)
        history_stmt = (
            select(SessionEvent)
            .where(SessionEvent.session_id == session.id)
            .order_by(desc(SessionEvent.event_time))
            .limit(8)
        )
        history_res = await db.execute(history_stmt)
        past_events = history_res.scalars().all()
        session_history = [
            {
                "method": e.request_method,
                "path": e.request_path,
                "body_snippet": (e.request_body or "")[:300],
                "ua": (e.request_headers or {}).get("user-agent", ""),
                "response_status": e.response_status,
                "timestamp": str(e.event_time)
            }
            for e in reversed(past_events)
        ]

        # 4. Create SessionEvent
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

        # 5. LLM classification
        classification_result = await llm_service.classify_attack({
            "method": method,
            "path": path,
            "headers": req_headers,
            "body": req_body
        })

        if classification_result and classification_result.get("is_attack"):
            attack = Attack(
                session_id=session.id,
                service=f"Port {port}",
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

            # Fire-and-forget: per-attack report (V1 style, fast feedback)
            attack_id_snapshot = attack.id
            session_id_snapshot = session.id

            async def generate_report_safely():
                try:
                    await llm_service.generate_report(
                        attack_id_snapshot,
                        event_data,
                        classification_result,
                        geo_enrichment=geo_enrichment,
                        session_events=session_history
                    )
                except Exception as ex:
                    logger.error(f"Generate report failed: {ex}")

            asyncio.create_task(generate_report_safely())

            # V2: Trigger full session intelligence analysis (debounced via background worker + immediate)
            async def trigger_session_analysis():
                try:
                    # Brief delay: let the attack report save first
                    await asyncio.sleep(5)
                    await ti_service.analyze_session(session_id_snapshot)
                except Exception as ex:
                    logger.error(f"Session analysis failed: {ex}")

            asyncio.create_task(trigger_session_analysis())

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
                logger.error(f"Event loop failure: {e}")
