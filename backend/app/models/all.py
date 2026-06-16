from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, BigInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import datetime

from app.database.db import Base

# Import V2 models so SQLAlchemy metadata includes them for create_all
from app.models.v2 import (  # noqa: F401
    AttackerProfile, Campaign, CampaignSession, SessionAnalysis,
    MitreMapping, IOC, Prediction, MitigationRecommendation,
    ThreatStory, ThreatReport, DeceptionMetric
)

class Node(Base):
    __tablename__ = "nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region = Column(String(100), nullable=False)
    ip = Column(String(45), nullable=False)
    status = Column(String(50), default="active")
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    uptime_seconds = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    sessions = relationship("Session", back_populates="node", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(UUID(as_uuid=True), ForeignKey("nodes.id", ondelete="CASCADE"))
    attacker_ip = Column(String(45), nullable=False, index=True)

    # GeoIP (from local MaxMind DB)
    attacker_geoip_country = Column(String(100))
    attacker_geoip_city = Column(String(100))
    attacker_geoip_lat = Column(Float)
    attacker_geoip_lon = Column(Float)
    attacker_geoip_continent = Column(String(50))
    attacker_geoip_timezone = Column(String(100))

    # IP Intelligence (from ip-api.com enrichment)
    attacker_isp = Column(String(255))
    attacker_org = Column(String(255))
    attacker_asn = Column(String(100))
    attacker_is_proxy = Column(Boolean, default=False)
    attacker_is_hosting = Column(Boolean, default=False)
    attacker_is_mobile = Column(Boolean, default=False)
    attacker_hostname = Column(String(255))

    start_time = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    end_time = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)

    node = relationship("Node", back_populates="sessions")
    events = relationship("SessionEvent", back_populates="session", cascade="all, delete-orphan")
    attacks = relationship("Attack", back_populates="session", cascade="all, delete-orphan")


class SessionEvent(Base):
    __tablename__ = "session_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    event_time = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))
    service_port = Column(Integer, nullable=False)
    request_method = Column(String(10))
    request_path = Column(Text)
    request_headers = Column(JSONB)
    request_body = Column(Text)
    response_status = Column(Integer)
    response_headers = Column(JSONB)
    response_body = Column(Text)
    fingerprint_sha256 = Column(String(64))

    session = relationship("Session", back_populates="events")


class Attack(Base):
    __tablename__ = "attacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    service = Column(String(100), nullable=False)
    endpoint = Column(Text, nullable=False)
    classification = Column(String(100), nullable=False, index=True)
    severity = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    session = relationship("Session", back_populates="attacks")
    payload = relationship("Payload", back_populates="attack", uselist=False, cascade="all, delete-orphan")
    report = relationship("AttackReport", back_populates="attack", uselist=False, cascade="all, delete-orphan")


class Payload(Base):
    __tablename__ = "payloads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_id = Column(UUID(as_uuid=True), ForeignKey("attacks.id", ondelete="CASCADE"))
    raw_data = Column(Text, nullable=False)
    headers = Column(JSONB)
    payload_hash = Column(String(64), index=True)

    attack = relationship("Attack", back_populates="payload")


class AttackReport(Base):
    __tablename__ = "attack_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attack_id = Column(UUID(as_uuid=True), ForeignKey("attacks.id", ondelete="CASCADE"), unique=True)
    report_json = Column(JSONB, nullable=False)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    attack = relationship("Attack", back_populates="report")
