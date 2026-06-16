-- LLMPot V2 Migration: Autonomous AI Threat Intelligence Platform

-- Persistent attacker profiles (updated over time as new attacks arrive)
CREATE TABLE IF NOT EXISTS attacker_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_ip VARCHAR(45) NOT NULL UNIQUE,
    asn VARCHAR(100),
    country VARCHAR(100),
    isp VARCHAR(255),
    is_proxy BOOLEAN DEFAULT FALSE,
    is_hosting BOOLEAN DEFAULT FALSE,

    -- Aggregated intelligence
    total_sessions INTEGER DEFAULT 0,
    total_attacks INTEGER DEFAULT 0,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- LLM-derived persistent profile
    skill_level VARCHAR(50),
    primary_motivation VARCHAR(100),
    tool_signatures TEXT[],
    behavioral_fingerprint TEXT,
    opsec_quality VARCHAR(50),
    language_artifacts TEXT,
    profile_summary TEXT,

    -- Scores
    threat_score DOUBLE PRECISION DEFAULT 0.0,
    novelty_score DOUBLE PRECISION DEFAULT 0.0,
    confidence DOUBLE PRECISION DEFAULT 0.0,

    -- Attribution
    attributed_campaign_id UUID,
    attributed_threat_actor VARCHAR(255),

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaign: correlated attacks from same actor / coordinated group
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',

    -- Detection criteria
    correlated_asns TEXT[],
    correlated_ip_ranges TEXT[],
    attack_types TEXT[],
    payload_signatures TEXT[],

    -- Stats
    total_sessions INTEGER DEFAULT 0,
    total_attackers INTEGER DEFAULT 0,
    unique_countries INTEGER DEFAULT 0,

    -- Intelligence
    primary_objective TEXT,
    attribution_hypothesis TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.0,
    threat_level VARCHAR(50) DEFAULT 'Unknown',

    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Link sessions to campaigns
CREATE TABLE IF NOT EXISTS campaign_sessions (
    id BIGSERIAL PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, session_id)
);

-- Per-session LLM intelligence analysis (the core output)
CREATE TABLE IF NOT EXISTS session_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    attacker_ip VARCHAR(45),
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Classification
    primary_attack_type VARCHAR(100),
    threat_score DOUBLE PRECISION DEFAULT 0.0,
    confidence DOUBLE PRECISION DEFAULT 0.0,

    -- Executive layer
    executive_summary TEXT,
    technical_summary TEXT,
    threat_narrative TEXT,

    -- Attacker intelligence
    skill_level VARCHAR(50),
    automation_type VARCHAR(50),
    opsec_quality VARCHAR(50),
    language_artifacts TEXT,
    behavioral_fingerprint TEXT,
    tool_signatures TEXT[],
    attacker_profile TEXT,

    -- Objectives
    primary_objective TEXT,
    specific_targets TEXT[],
    payload_capabilities TEXT,

    -- Campaign correlation
    campaign_id UUID REFERENCES campaigns(id),
    campaign_confidence DOUBLE PRECISION DEFAULT 0.0,
    threat_actor_hypothesis TEXT,

    -- Intent analysis (confidence-scored)
    intent_reconnaissance DOUBLE PRECISION DEFAULT 0.0,
    intent_credential_theft DOUBLE PRECISION DEFAULT 0.0,
    intent_rce DOUBLE PRECISION DEFAULT 0.0,
    intent_data_exfiltration DOUBLE PRECISION DEFAULT 0.0,
    intent_botnet_recruitment DOUBLE PRECISION DEFAULT 0.0,
    intent_ransomware DOUBLE PRECISION DEFAULT 0.0,
    intent_cryptomining DOUBLE PRECISION DEFAULT 0.0,
    primary_intent VARCHAR(100),

    -- Novelty
    novelty_score DOUBLE PRECISION DEFAULT 0.0,
    novelty_explanation TEXT,

    -- Deception
    deception_recommendation TEXT,

    -- Predictions
    next_actions TEXT[],
    predicted_techniques TEXT[],

    -- Full LLM JSON (raw output stored for reference)
    raw_analysis JSONB,

    status VARCHAR(50) DEFAULT 'complete'
);

-- MITRE ATT&CK technique mappings
CREATE TABLE IF NOT EXISTS mitre_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,

    technique_id VARCHAR(20) NOT NULL,
    technique_name VARCHAR(255) NOT NULL,
    tactic VARCHAR(100) NOT NULL,
    sub_technique_id VARCHAR(30),
    sub_technique_name VARCHAR(255),

    confidence DOUBLE PRECISION DEFAULT 0.0,
    evidence TEXT,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indicators of Compromise (searchable IOC database)
CREATE TABLE IF NOT EXISTS iocs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,

    ioc_type VARCHAR(50) NOT NULL,
    ioc_value TEXT NOT NULL,
    context TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.8,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,

    UNIQUE(ioc_type, ioc_value)
);

-- Next-action predictions per session
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,
    attacker_ip VARCHAR(45),

    predicted_action TEXT NOT NULL,
    predicted_technique_id VARCHAR(20),
    reasoning TEXT,
    confidence DOUBLE PRECISION DEFAULT 0.0,
    time_window VARCHAR(50),
    validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mitigation recommendations (auto-generated rules)
CREATE TABLE IF NOT EXISTS mitigation_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,
    attacker_ip VARCHAR(45),

    -- Rule types
    iptables_rule TEXT,
    nftables_rule TEXT,
    fail2ban_filter TEXT,
    waf_rule TEXT,
    suricata_rule TEXT,
    sigma_rule TEXT,
    yara_rule TEXT,

    -- Summary
    recommendation_summary TEXT,
    priority VARCHAR(50) DEFAULT 'Medium',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Threat story: timestamped narrative of attack progression
CREATE TABLE IF NOT EXISTS threat_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,

    title TEXT,
    story_markdown TEXT NOT NULL,
    attack_phases JSONB,
    timeline_events JSONB,

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complete threat intelligence reports (exportable)
CREATE TABLE IF NOT EXISTS threat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES session_analyses(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),

    title TEXT NOT NULL,
    report_markdown TEXT,
    executive_summary TEXT,
    report_json JSONB,

    severity VARCHAR(50),
    classification VARCHAR(100),
    threat_score FLOAT DEFAULT 0.0,

    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exported_pdf_path TEXT
);

-- Deception effectiveness metrics
CREATE TABLE IF NOT EXISTS deception_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,

    fake_service VARCHAR(100),
    fake_credential_type VARCHAR(100),
    fake_path VARCHAR(500),
    attacker_engaged BOOLEAN DEFAULT FALSE,
    engagement_depth INTEGER DEFAULT 0,
    intel_extracted TEXT,
    effectiveness_score DOUBLE PRECISION DEFAULT 0.0,

    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attacker_profiles_ip ON attacker_profiles(attacker_ip);
CREATE INDEX IF NOT EXISTS idx_attacker_profiles_asn ON attacker_profiles(asn);
CREATE INDEX IF NOT EXISTS idx_attacker_profiles_threat_score ON attacker_profiles(threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sessions_campaign ON campaign_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sessions_session ON campaign_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analyses_session ON session_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analyses_ip ON session_analyses(attacker_ip);
CREATE INDEX IF NOT EXISTS idx_session_analyses_threat_score ON session_analyses(threat_score DESC);
CREATE INDEX IF NOT EXISTS idx_mitre_mappings_session ON mitre_mappings(session_id);
CREATE INDEX IF NOT EXISTS idx_mitre_mappings_technique ON mitre_mappings(technique_id);
CREATE INDEX IF NOT EXISTS idx_iocs_type ON iocs(ioc_type);
CREATE INDEX IF NOT EXISTS idx_iocs_value ON iocs(ioc_value);
CREATE INDEX IF NOT EXISTS idx_predictions_ip ON predictions(attacker_ip);
CREATE INDEX IF NOT EXISTS idx_mitigation_ip ON mitigation_recommendations(attacker_ip);
CREATE INDEX IF NOT EXISTS idx_threat_reports_session ON threat_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_threat_reports_campaign ON threat_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deception_service ON deception_metrics(fake_service);
