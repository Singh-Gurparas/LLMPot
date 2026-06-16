from sqlalchemy import (
    Column, Integer, String, Boolean, Float, ForeignKey,
    DateTime, Text, BigInteger, ARRAY
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import datetime

from app.database.db import Base

_now = lambda: datetime.datetime.now(datetime.timezone.utc)


class AttackerProfile(Base):
    __tablename__ = "attacker_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attacker_ip = Column(String(45), nullable=False, unique=True, index=True)
    asn = Column(String(100))
    country = Column(String(100))
    isp = Column(String(255))
    is_proxy = Column(Boolean, default=False)
    is_hosting = Column(Boolean, default=False)

    total_sessions = Column(Integer, default=0)
    total_attacks = Column(Integer, default=0)
    first_seen = Column(DateTime(timezone=True), default=_now)
    last_seen = Column(DateTime(timezone=True), default=_now)

    skill_level = Column(String(50))
    primary_motivation = Column(String(100))
    tool_signatures = Column(ARRAY(String))
    behavioral_fingerprint = Column(Text)
    opsec_quality = Column(String(50))
    language_artifacts = Column(Text)
    profile_summary = Column(Text)

    threat_score = Column(Float, default=0.0)
    novelty_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)

    attributed_campaign_id = Column(UUID(as_uuid=True), nullable=True)
    attributed_threat_actor = Column(String(255))

    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='active')

    correlated_asns = Column(ARRAY(String))
    correlated_ip_ranges = Column(ARRAY(String))
    attack_types = Column(ARRAY(String))
    payload_signatures = Column(ARRAY(String))

    total_sessions = Column(Integer, default=0)
    total_attackers = Column(Integer, default=0)
    unique_countries = Column(Integer, default=0)

    primary_objective = Column(Text)
    attribution_hypothesis = Column(Text)
    confidence = Column(Float, default=0.0)
    threat_level = Column(String(50), default='Unknown')

    first_seen = Column(DateTime(timezone=True), default=_now)
    last_seen = Column(DateTime(timezone=True), default=_now)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    campaign_sessions = relationship("CampaignSession", back_populates="campaign", cascade="all, delete-orphan")
    analyses = relationship("SessionAnalysis", back_populates="campaign", foreign_keys="SessionAnalysis.campaign_id")


class CampaignSession(Base):
    __tablename__ = "campaign_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    linked_at = Column(DateTime(timezone=True), default=_now)

    campaign = relationship("Campaign", back_populates="campaign_sessions")


class SessionAnalysis(Base):
    __tablename__ = "session_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    attacker_ip = Column(String(45))
    analyzed_at = Column(DateTime(timezone=True), default=_now)

    primary_attack_type = Column(String(100))
    threat_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)

    executive_summary = Column(Text)
    technical_summary = Column(Text)
    threat_narrative = Column(Text)

    skill_level = Column(String(50))
    automation_type = Column(String(50))
    opsec_quality = Column(String(50))
    language_artifacts = Column(Text)
    behavioral_fingerprint = Column(Text)
    tool_signatures = Column(ARRAY(String))
    attacker_profile = Column(Text)

    primary_objective = Column(Text)
    specific_targets = Column(ARRAY(String))
    payload_capabilities = Column(Text)

    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    campaign_confidence = Column(Float, default=0.0)
    threat_actor_hypothesis = Column(Text)

    intent_reconnaissance = Column(Float, default=0.0)
    intent_credential_theft = Column(Float, default=0.0)
    intent_rce = Column(Float, default=0.0)
    intent_data_exfiltration = Column(Float, default=0.0)
    intent_botnet_recruitment = Column(Float, default=0.0)
    intent_ransomware = Column(Float, default=0.0)
    intent_cryptomining = Column(Float, default=0.0)
    primary_intent = Column(String(100))

    novelty_score = Column(Float, default=0.0)
    novelty_explanation = Column(Text)

    deception_recommendation = Column(Text)

    next_actions = Column(ARRAY(String))
    predicted_techniques = Column(ARRAY(String))

    raw_analysis = Column(JSONB)
    status = Column(String(50), default='complete')

    campaign = relationship("Campaign", back_populates="analyses", foreign_keys=[campaign_id])
    mitre_mappings = relationship("MitreMapping", back_populates="analysis", cascade="all, delete-orphan")
    iocs = relationship("IOC", back_populates="analysis", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="analysis", cascade="all, delete-orphan")
    mitigation = relationship("MitigationRecommendation", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    story = relationship("ThreatStory", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    report = relationship("ThreatReport", back_populates="analysis", uselist=False, cascade="all, delete-orphan")


class MitreMapping(Base):
    __tablename__ = "mitre_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)

    technique_id = Column(String(20), nullable=False, index=True)
    technique_name = Column(String(255), nullable=False)
    tactic = Column(String(100), nullable=False)
    sub_technique_id = Column(String(30))
    sub_technique_name = Column(String(255))

    confidence = Column(Float, default=0.0)
    evidence = Column(Text)
    observed_at = Column(DateTime(timezone=True), default=_now)

    analysis = relationship("SessionAnalysis", back_populates="mitre_mappings")


class IOC(Base):
    __tablename__ = "iocs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)

    ioc_type = Column(String(50), nullable=False, index=True)
    ioc_value = Column(Text, nullable=False)
    context = Column(Text)
    confidence = Column(Float, default=0.8)
    first_seen = Column(DateTime(timezone=True), default=_now)
    last_seen = Column(DateTime(timezone=True), default=_now)
    occurrence_count = Column(Integer, default=1)

    analysis = relationship("SessionAnalysis", back_populates="iocs")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)
    attacker_ip = Column(String(45))

    predicted_action = Column(Text, nullable=False)
    predicted_technique_id = Column(String(20))
    reasoning = Column(Text)
    confidence = Column(Float, default=0.0)
    time_window = Column(String(50))
    validated = Column(Boolean, default=False)
    validated_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=_now)

    analysis = relationship("SessionAnalysis", back_populates="predictions")


class MitigationRecommendation(Base):
    __tablename__ = "mitigation_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)
    attacker_ip = Column(String(45))

    iptables_rule = Column(Text)
    nftables_rule = Column(Text)
    fail2ban_filter = Column(Text)
    waf_rule = Column(Text)
    suricata_rule = Column(Text)
    sigma_rule = Column(Text)
    yara_rule = Column(Text)

    recommendation_summary = Column(Text)
    priority = Column(String(50), default='Medium')
    created_at = Column(DateTime(timezone=True), default=_now)

    analysis = relationship("SessionAnalysis", back_populates="mitigation")


class ThreatStory(Base):
    __tablename__ = "threat_stories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)

    title = Column(Text)
    story_markdown = Column(Text, nullable=False)
    attack_phases = Column(JSONB)
    timeline_events = Column(JSONB)

    generated_at = Column(DateTime(timezone=True), default=_now)

    analysis = relationship("SessionAnalysis", back_populates="story")


class ThreatReport(Base):
    __tablename__ = "threat_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("session_analyses.id", ondelete="CASCADE"), nullable=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)

    title = Column(Text, nullable=False)
    report_markdown = Column(Text)
    executive_summary = Column(Text)
    report_json = Column(JSONB)

    severity = Column(String(50))
    classification = Column(String(100))
    threat_score = Column(Float, default=0.0)

    generated_at = Column(DateTime(timezone=True), default=_now)
    exported_pdf_path = Column(Text)

    analysis = relationship("SessionAnalysis", back_populates="report")


class DeceptionMetric(Base):
    __tablename__ = "deception_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))

    fake_service = Column(String(100))
    fake_credential_type = Column(String(100))
    fake_path = Column(String(500))
    attacker_engaged = Column(Boolean, default=False)
    engagement_depth = Column(Integer, default=0)
    intel_extracted = Column(Text)
    effectiveness_score = Column(Float, default=0.0)

    recorded_at = Column(DateTime(timezone=True), default=_now)
