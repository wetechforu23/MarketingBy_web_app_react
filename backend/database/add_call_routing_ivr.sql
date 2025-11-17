-- ==========================================
-- CALL ROUTING & IVR SYSTEM
-- ==========================================
-- Advanced call routing with IVR menu, staff routing, and AI integration
-- ==========================================

-- Call Routing Settings (extends call_settings)
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS enable_ai_call_handling BOOLEAN DEFAULT false;
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS enable_ivr_menu BOOLEAN DEFAULT false;
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS ivr_menu_config JSONB;
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS voicemail_enabled BOOLEAN DEFAULT true;
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS voicemail_message TEXT DEFAULT 'Please leave a message after the tone.';
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS voicemail_email VARCHAR(255);
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS max_ring_time_seconds INTEGER DEFAULT 30;
ALTER TABLE call_settings ADD COLUMN IF NOT EXISTS fallback_to_voicemail BOOLEAN DEFAULT true;

-- Staff Call Routing Configuration
CREATE TABLE IF NOT EXISTS staff_call_routing (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Routing Priority (lower number = higher priority)
    routing_priority INTEGER DEFAULT 0,
    
    -- Staff Contact Methods
    receive_calls_in_portal BOOLEAN DEFAULT true, -- Receive calls in Carepitome portal
    staff_phone_number VARCHAR(20), -- Staff's personal phone number
    use_staff_phone BOOLEAN DEFAULT false, -- Route to staff phone instead of portal
    
    -- Availability
    is_available_for_calls BOOLEAN DEFAULT true,
    availability_schedule JSONB, -- Weekly schedule: {monday: {start: "09:00", end: "17:00"}, ...}
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Department/Department Assignment
    department VARCHAR(100), -- e.g., "billing", "appointments", "general"
    skills JSONB, -- Array of skills: ["billing", "appointments", "technical"]
    
    -- Call Statistics
    total_calls_received INTEGER DEFAULT 0,
    total_call_duration_minutes INTEGER DEFAULT 0,
    average_call_duration_minutes DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, user_id)
);

-- IVR Menu Options (for digit-based routing)
CREATE TABLE IF NOT EXISTS ivr_menu_options (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    call_settings_id INTEGER REFERENCES call_settings(id) ON DELETE CASCADE,
    
    -- Menu Configuration
    menu_digit VARCHAR(1) NOT NULL, -- "1", "2", "3", etc.
    menu_label VARCHAR(255) NOT NULL, -- "For billing, press 1"
    menu_description TEXT, -- What this option does
    
    -- Routing Configuration
    route_type VARCHAR(50) NOT NULL, -- "staff", "department", "voicemail", "ai", "external"
    route_target_id INTEGER, -- staff_call_routing.id, department_id, or null
    route_target_phone VARCHAR(20), -- External phone number if route_type = "external"
    
    -- Department Routing (if route_type = "department")
    department_name VARCHAR(100), -- e.g., "billing", "appointments"
    
    -- Staff Routing Priority (if route_type = "staff")
    staff_routing_priority INTEGER DEFAULT 0, -- Which staff member to try first
    
    -- AI Handling (if route_type = "ai")
    ai_prompt TEXT, -- Custom prompt for AI to handle this option
    ai_fallback_to_staff BOOLEAN DEFAULT true, -- If AI can't answer, route to staff
    
    -- Voicemail (if route_type = "voicemail")
    voicemail_message TEXT, -- Custom voicemail message for this option
    
    -- Menu Order
    menu_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, menu_digit, call_settings_id)
);

-- Call Routing History (tracks routing decisions)
CREATE TABLE IF NOT EXISTS call_routing_history (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
    call_sid VARCHAR(255),
    
    -- Routing Path
    routing_step INTEGER DEFAULT 1, -- Step number in routing chain
    routing_type VARCHAR(50), -- "ivr", "ai", "staff", "voicemail", "queue"
    routing_target VARCHAR(255), -- Staff name, department, or "voicemail"
    routing_target_id INTEGER, -- staff_call_routing.id or ivr_menu_options.id
    
    -- Routing Result
    routing_result VARCHAR(50), -- "answered", "no_answer", "busy", "voicemail", "failed"
    routing_duration_seconds INTEGER,
    
    -- AI Interaction (if AI was involved)
    ai_handled BOOLEAN DEFAULT false,
    ai_transcript TEXT, -- AI conversation transcript
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Timestamps
    routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Call Availability (real-time tracking)
CREATE TABLE IF NOT EXISTS staff_call_availability (
    id SERIAL PRIMARY KEY,
    staff_routing_id INTEGER NOT NULL REFERENCES staff_call_routing(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Current Status
    is_online BOOLEAN DEFAULT false, -- Logged into portal
    is_available BOOLEAN DEFAULT false, -- Available to receive calls
    is_busy BOOLEAN DEFAULT false, -- Currently on a call
    current_call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
    
    -- Portal Connection (for in-portal calls)
    portal_session_id VARCHAR(255), -- WebSocket session ID for portal
    portal_connected_at TIMESTAMP,
    
    -- Last Activity
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_call_at TIMESTAMP,
    
    -- Status
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(staff_routing_id)
);

-- Voicemail Messages
CREATE TABLE IF NOT EXISTS voicemail_messages (
    id SERIAL PRIMARY KEY,
    call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
    call_sid VARCHAR(255),
    
    -- Caller Info
    caller_phone VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    
    -- Voicemail Details
    recording_url TEXT, -- Twilio recording URL
    recording_duration_seconds INTEGER,
    transcription_text TEXT, -- AI transcription of voicemail
    
    -- Routing Info
    ivr_option_id INTEGER REFERENCES ivr_menu_options(id) ON DELETE SET NULL,
    department VARCHAR(100),
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    read_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    read_at TIMESTAMP,
    
    -- Email Notification
    email_sent BOOLEAN DEFAULT false,
    email_sent_to VARCHAR(255),
    email_sent_at TIMESTAMP,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_staff_call_routing_client ON staff_call_routing(client_id);
CREATE INDEX IF NOT EXISTS idx_staff_call_routing_user ON staff_call_routing(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_call_routing_available ON staff_call_routing(is_available_for_calls, is_active);
CREATE INDEX IF NOT EXISTS idx_staff_call_routing_department ON staff_call_routing(department);
CREATE INDEX IF NOT EXISTS idx_staff_call_routing_priority ON staff_call_routing(client_id, routing_priority);

CREATE INDEX IF NOT EXISTS idx_ivr_menu_options_client ON ivr_menu_options(client_id);
CREATE INDEX IF NOT EXISTS idx_ivr_menu_options_settings ON ivr_menu_options(call_settings_id);
CREATE INDEX IF NOT EXISTS idx_ivr_menu_options_digit ON ivr_menu_options(client_id, menu_digit, is_active);
CREATE INDEX IF NOT EXISTS idx_ivr_menu_options_order ON ivr_menu_options(client_id, menu_order);

CREATE INDEX IF NOT EXISTS idx_call_routing_history_call ON call_routing_history(call_id, call_sid);
CREATE INDEX IF NOT EXISTS idx_call_routing_history_step ON call_routing_history(call_sid, routing_step);

CREATE INDEX IF NOT EXISTS idx_staff_call_availability_staff ON staff_call_availability(staff_routing_id);
CREATE INDEX IF NOT EXISTS idx_staff_call_availability_user ON staff_call_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_call_availability_available ON staff_call_availability(is_available, is_online);

CREATE INDEX IF NOT EXISTS idx_voicemail_messages_call ON voicemail_messages(call_id, call_sid);
CREATE INDEX IF NOT EXISTS idx_voicemail_messages_unread ON voicemail_messages(is_read, is_archived);
CREATE INDEX IF NOT EXISTS idx_voicemail_messages_department ON voicemail_messages(department);

-- Comments for Documentation
COMMENT ON TABLE staff_call_routing IS 'Configures how calls are routed to staff members';
COMMENT ON TABLE ivr_menu_options IS 'IVR menu options for digit-based call routing (press 1 for billing, etc.)';
COMMENT ON TABLE call_routing_history IS 'Tracks the routing path and decisions for each call';
COMMENT ON TABLE staff_call_availability IS 'Real-time tracking of staff availability for calls';
COMMENT ON TABLE voicemail_messages IS 'Stores voicemail messages with transcriptions';

COMMENT ON COLUMN call_settings.enable_ai_call_handling IS 'Enable AI to answer calls and handle basic questions';
COMMENT ON COLUMN call_settings.enable_ivr_menu IS 'Enable IVR menu for digit-based routing';
COMMENT ON COLUMN call_settings.ivr_menu_config IS 'IVR menu configuration JSON';
COMMENT ON COLUMN staff_call_routing.receive_calls_in_portal IS 'Staff receives calls in Carepitome portal (WebRTC)';
COMMENT ON COLUMN staff_call_routing.use_staff_phone IS 'Route calls to staff personal phone number';
COMMENT ON COLUMN ivr_menu_options.route_type IS 'Type of routing: staff, department, voicemail, ai, external';
COMMENT ON COLUMN ivr_menu_options.ai_fallback_to_staff IS 'If AI cannot answer, route to staff';

