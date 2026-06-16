from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta, timezone

from app.database.db import get_db
from app.models.all import Node, Attack, Session

nodes_router = APIRouter(prefix="/api/nodes", tags=["Nodes"])
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@nodes_router.get("/")
async def get_nodes(db: AsyncSession = Depends(get_db)):
    stmt = select(Node).order_by(desc(Node.last_seen))
    result = await db.execute(stmt)
    nodes = result.scalars().all()
    
    return [{
        "id": str(n.id),
        "region": n.region,
        "ip": n.ip,
        "status": n.status,
        "last_seen": n.last_seen,
        "uptime_seconds": n.uptime_seconds
    } for n in nodes]


@analytics_router.get("/overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    # Total Attacks
    attacks_count = await db.scalar(select(func.count(Attack.id)))
    
    # Active Nodes
    nodes_count = await db.scalar(select(func.count(Node.id)).where(Node.status == 'active'))
    
    # Unique Attackers (last 24h)
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    unique_ips = await db.scalar(
        select(func.count(func.distinct(Session.attacker_ip)))
        .where(Session.start_time >= yesterday)
    )
    
    # Critical Threats
    critical_count = await db.scalar(
        select(func.count(Attack.id))
        .where(Attack.severity == 'Critical')
    )

    # Top Attack Types
    top_types_stmt = (
        select(Attack.classification, func.count(Attack.id).label("count"))
        .group_by(Attack.classification)
        .order_by(desc("count"))
        .limit(5)
    )
    types_res = await db.execute(top_types_stmt)
    
    # Top Attacker Countries (for map)
    top_countries_stmt = (
        select(
            Session.attacker_geoip_country, 
            Session.attacker_geoip_lat, 
            Session.attacker_geoip_lon, 
            func.count(Session.id).label("count")
        )
        .where(Session.attacker_geoip_country.isnot(None))
        .group_by(Session.attacker_geoip_country, Session.attacker_geoip_lat, Session.attacker_geoip_lon)
        .order_by(desc("count"))
        .limit(20)
    )
    countries_res = await db.execute(top_countries_stmt)

    # Top Attacker IPs
    top_ips_stmt = (
        select(Session.attacker_ip, func.count(Session.id).label("count"))
        .group_by(Session.attacker_ip)
        .order_by(desc("count"))
        .limit(5)
    )
    ips_res = await db.execute(top_ips_stmt)

    return {
        "metrics": {
            "total_attacks": attacks_count or 0,
            "active_nodes": nodes_count or 0,
            "unique_attackers_24h": unique_ips or 0,
            "critical_threats": critical_count or 0
        },
        "top_attack_types": [{"type": row[0], "count": row[1]} for row in types_res.all()],
        "top_ips": [{"ip": row[0], "count": row[1]} for row in ips_res.all()],
        "map_data": [{
            "country": row[0], 
            "lat": row[1], 
            "lon": row[2], 
            "attacks": row[3]
        } for row in countries_res.all()]
    }

