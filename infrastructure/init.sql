-- Init DB Schema for UnHarmd

CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uptime_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    attacker_ip VARCHAR(45) NOT NULL,
    attacker_geoip_country VARCHAR(100),
    attacker_geoip_city VARCHAR(100),
    attacker_geoip_lat DOUBLE PRECISION,
    attacker_geoip_lon DOUBLE PRECISION,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS session_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    event_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    service_port INTEGER NOT NULL,
    request_method VARCHAR(10),
    request_path TEXT,
    request_headers JSONB,
    request_body TEXT,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    fingerprint_sha256 VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    service VARCHAR(100) NOT NULL,
    endpoint TEXT NOT NULL,
    classification VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attack_id UUID REFERENCES attacks(id) ON DELETE CASCADE,
    raw_data TEXT NOT NULL,
    headers JSONB,
    payload_hash VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS attack_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attack_id UUID UNIQUE REFERENCES attacks(id) ON DELETE CASCADE,
    report_json JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_attacker_ip ON sessions(attacker_ip);
CREATE INDEX idx_session_events_session_id ON session_events(session_id);
CREATE INDEX idx_attacks_classification ON attacks(classification);
CREATE INDEX idx_attacks_severity ON attacks(severity);
CREATE INDEX idx_payloads_hash ON payloads(payload_hash);
