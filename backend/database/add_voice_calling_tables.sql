-- ==========================================
-- VOICE CALLING SYSTEM - Twilio Integration
-- ==========================================
-- Enables voice calling feature for all clients
-- Similar to Vonage and other call systems
-- ==========================================

-- Call Settings per Widget/Client
CREATE TABLE IF NOT EXISTS call_settings (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Twilio Configuration
    twilio_account_sid VARCHAR(255), -- Can be per-client or shared
    twilio_auth_token_encrypted TEXT, -- Encrypted auth token
    twilio_phone_number VARCHAR(20), -- Twilio phone number for outbound calls
    
    -- Call Features
    enable_voice_calling BOOLEAN DEFAULT false,
    enable_call_recording BOOLEAN DEFAULT false,
    enable_call_transcription BOOLEAN DEFAULT false,
    enable_call_queuing BOOLEAN DEFAULT false,
    
    -- Business Hours for Calls
    business_hours JSONB, -- Same structure as widget_configs.business_hours
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Call Routing
    default_agent_phone VARCHAR(20), -- Default number to route calls to
    routing_strategy VARCHAR(50) DEFAULT 'round_robin', -- round_robin, sequential, priority
    max_queue_size INTEGER DEFAULT 10,
    queue_timeout_seconds INTEGER DEFAULT 300, -- 5 minutes
    
    -- Call Limits & Quotas
    max_calls_per_day INTEGER DEFAULT 100,
    max_call_duration_minutes INTEGER DEFAULT 60,
    call_rate_limit_per_hour INTEGER DEFAULT 20,
    
    -- Greeting & IVR
    greeting_message TEXT, -- Text-to-speech greeting
    greeting_audio_url TEXT, -- Optional custom audio file
    ivr_menu JSONB, -- Interactive Voice Response menu
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(widget_id)
);

-- Active Calls (Real-time tracking)
CREATE TABLE IF NOT EXISTS calls (
    id SERIAL PRIMARY KEY,
    call_sid VARCHAR(255) UNIQUE NOT NULL, -- Twilio Call SID
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE SET NULL,
    
    -- Call Details
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'
    from_number VARCHAR(20) NOT NULL, -- Customer/visitor phone
    to_number VARCHAR(20) NOT NULL, -- Agent/Twilio number
    caller_name VARCHAR(255), -- Customer name if available
    
    -- Call Metadata
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT, -- Twilio recording URL if enabled
    transcription_text TEXT, -- Call transcription if enabled
    recording_sid VARCHAR(255), -- Twilio Recording SID
    
    -- Agent Info
    agent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    agent_name VARCHAR(255),
    agent_phone VARCHAR(20),
    
    -- Call Quality Metrics
    call_quality_score DECIMAL(3,2), -- 0.00 to 1.00
    jitter_ms INTEGER,
    packet_loss_percent DECIMAL(5,2),
    latency_ms INTEGER,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call History (Archived calls)
CREATE TABLE IF NOT EXISTS call_history (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
    call_sid VARCHAR(255), -- Keep SID even if call record is deleted
    
    -- Same structure as calls table for historical data
    widget_id INTEGER,
    client_id INTEGER,
    conversation_id INTEGER,
    direction VARCHAR(20),
    status VARCHAR(50),
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    caller_name VARCHAR(255),
    duration_seconds INTEGER,
    recording_url TEXT,
    transcription_text TEXT,
    agent_user_id INTEGER,
    agent_name VARCHAR(255),
    agent_phone VARCHAR(20),
    call_quality_score DECIMAL(3,2),
    
    -- Archive metadata
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_reason VARCHAR(100) -- 'completed', 'failed', 'manual_archive'
);

-- Call Queue (For call queuing feature)
CREATE TABLE IF NOT EXISTS call_queue (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
    
    -- Caller Info
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    caller_email VARCHAR(255),
    
    -- Queue Position
    queue_position INTEGER NOT NULL,
    estimated_wait_time_seconds INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'ringing', 'answered', 'abandoned', 'timeout'
    
    -- Timestamps
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    abandoned_at TIMESTAMP,
    timeout_at TIMESTAMP,
    
    -- Metadata
    callback_preferred BOOLEAN DEFAULT false,
    callback_phone VARCHAR(20),
    notes TEXT
);

-- Call Agents (Agents available for calls)
CREATE TABLE IF NOT EXISTS call_agents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Agent Phone Numbers
    primary_phone VARCHAR(20) NOT NULL, -- Main phone number
    backup_phone VARCHAR(20), -- Backup number
    twilio_client_name VARCHAR(255), -- For Twilio Client SDK
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    is_busy BOOLEAN DEFAULT false,
    current_call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
    
    -- Skills & Routing
    skills JSONB, -- Array of skills: ['sales', 'support', 'technical']
    max_concurrent_calls INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0, -- Higher priority = first to receive calls
    
    -- Business Hours
    availability_schedule JSONB, -- Weekly schedule
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Stats
    total_calls INTEGER DEFAULT 0,
    total_call_duration_minutes INTEGER DEFAULT 0,
    average_call_duration_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, client_id)
);

-- Call Recordings (Separate table for better management)
CREATE TABLE IF NOT EXISTS call_recordings (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE CASCADE,
    call_sid VARCHAR(255) NOT NULL,
    
    -- Recording Details
    recording_sid VARCHAR(255) UNIQUE NOT NULL, -- Twilio Recording SID
    recording_url TEXT NOT NULL,
    recording_duration_seconds INTEGER,
    recording_size_bytes BIGINT,
    recording_format VARCHAR(20) DEFAULT 'mp3', -- mp3, wav
    
    -- Transcription
    transcription_sid VARCHAR(255), -- Twilio Transcription SID
    transcription_text TEXT,
    transcription_status VARCHAR(50), -- 'pending', 'completed', 'failed'
    
    -- Storage
    storage_location VARCHAR(50) DEFAULT 'twilio', -- twilio, s3, local
    storage_url TEXT, -- If moved to custom storage
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    access_token VARCHAR(255), -- For secure access
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Call Analytics (Aggregated stats)
CREATE TABLE IF NOT EXISTS call_analytics (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    agent_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Date Range
    date DATE NOT NULL,
    hour INTEGER, -- 0-23, NULL for daily aggregates
    
    -- Call Metrics
    total_calls INTEGER DEFAULT 0,
    inbound_calls INTEGER DEFAULT 0,
    outbound_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    abandoned_calls INTEGER DEFAULT 0,
    
    -- Duration Metrics
    total_duration_seconds INTEGER DEFAULT 0,
    average_duration_seconds DECIMAL(10,2) DEFAULT 0,
    longest_call_seconds INTEGER DEFAULT 0,
    shortest_call_seconds INTEGER DEFAULT 0,
    
    -- Quality Metrics
    average_quality_score DECIMAL(3,2),
    calls_with_recording INTEGER DEFAULT 0,
    calls_with_transcription INTEGER DEFAULT 0,
    
    -- Queue Metrics
    queued_calls INTEGER DEFAULT 0,
    average_queue_time_seconds DECIMAL(10,2),
    abandoned_in_queue INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(widget_id, client_id, agent_user_id, date, hour)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_calls_call_sid ON calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_widget_id ON calls(widget_id);
CREATE INDEX IF NOT EXISTS idx_calls_client_id ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation_id ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_initiated_at ON calls(initiated_at);
CREATE INDEX IF NOT EXISTS idx_calls_agent_user_id ON calls(agent_user_id);

CREATE INDEX IF NOT EXISTS idx_call_history_call_sid ON call_history(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_history_client_id ON call_history(client_id);
CREATE INDEX IF NOT EXISTS idx_call_history_archived_at ON call_history(archived_at);

CREATE INDEX IF NOT EXISTS idx_call_queue_widget_id ON call_queue(widget_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_status ON call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_queued_at ON call_queue(queued_at);

CREATE INDEX IF NOT EXISTS idx_call_agents_user_id ON call_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_call_agents_client_id ON call_agents(client_id);
CREATE INDEX IF NOT EXISTS idx_call_agents_is_available ON call_agents(is_available);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_sid ON call_recordings(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_recordings_recording_sid ON call_recordings(recording_sid);

CREATE INDEX IF NOT EXISTS idx_call_analytics_date ON call_analytics(date);
CREATE INDEX IF NOT EXISTS idx_call_analytics_client_id ON call_analytics(client_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_settings_updated_at
    BEFORE UPDATE ON call_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_call_settings_updated_at();

CREATE TRIGGER trigger_update_calls_updated_at
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_call_settings_updated_at();

CREATE TRIGGER trigger_update_call_agents_updated_at
    BEFORE UPDATE ON call_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_call_settings_updated_at();

-- Add enable_voice_calling column to widget_configs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'widget_configs' AND column_name = 'enable_voice_calling'
    ) THEN
        ALTER TABLE widget_configs ADD COLUMN enable_voice_calling BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add call_phone_number column to widget_configs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'widget_configs' AND column_name = 'call_phone_number'
    ) THEN
        ALTER TABLE widget_configs ADD COLUMN call_phone_number VARCHAR(20);
    END IF;
END $$;

COMMENT ON TABLE call_settings IS 'Voice calling configuration per widget/client';
COMMENT ON TABLE calls IS 'Active and recent calls tracking';
COMMENT ON TABLE call_history IS 'Archived call records for historical analysis';
COMMENT ON TABLE call_queue IS 'Call queue for managing waiting callers';
COMMENT ON TABLE call_agents IS 'Agents available to receive calls';
COMMENT ON TABLE call_recordings IS 'Call recordings and transcriptions';
COMMENT ON TABLE call_analytics IS 'Aggregated call statistics and metrics';

