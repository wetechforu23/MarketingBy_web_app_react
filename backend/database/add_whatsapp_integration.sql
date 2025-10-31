-- ================================================
-- WHATSAPP INTEGRATION
-- ================================================
-- Allows clients to connect their own WhatsApp Business via Twilio
-- Agent handoff can send WhatsApp messages to visitors
-- ================================================

-- Add WhatsApp settings to widget_configs
ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS enable_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_configured BOOLEAN DEFAULT false;

COMMENT ON COLUMN widget_configs.enable_whatsapp IS 'Enable WhatsApp messaging for agent handoff';
COMMENT ON COLUMN widget_configs.whatsapp_configured IS 'True if client has configured Twilio WhatsApp credentials';

-- ================================================
-- WHATSAPP MESSAGES TABLE
-- ================================================
-- Track all WhatsApp messages sent through the system

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER NOT NULL REFERENCES widget_configs(id) ON DELETE CASCADE,
    conversation_id INTEGER NOT NULL REFERENCES widget_conversations(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Message Details
    direction VARCHAR(20) NOT NULL, -- 'outbound' or 'inbound'
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    message_body TEXT NOT NULL,
    
    -- Twilio Details
    twilio_message_sid VARCHAR(100) UNIQUE,
    twilio_status VARCHAR(50), -- 'queued', 'sent', 'delivered', 'failed', 'undelivered'
    twilio_error_code VARCHAR(50),
    twilio_error_message TEXT,
    
    -- Content
    media_url TEXT,
    media_type VARCHAR(50),
    
    -- Metadata
    sent_by_user_id INTEGER REFERENCES users(id),
    sent_by_agent_name VARCHAR(255),
    visitor_name VARCHAR(255),
    visitor_phone VARCHAR(50),
    
    -- Timing
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_messages_widget ON whatsapp_messages(widget_id);
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_client ON whatsapp_messages(client_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(twilio_status);
CREATE INDEX idx_whatsapp_messages_twilio_sid ON whatsapp_messages(twilio_message_sid);

COMMENT ON TABLE whatsapp_messages IS 'Tracks all WhatsApp messages sent/received through Twilio integration';

-- ================================================
-- WHATSAPP USAGE TRACKING
-- ================================================
-- Track WhatsApp usage per client for billing/analytics

CREATE TABLE IF NOT EXISTS whatsapp_usage (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Usage Counters
    messages_sent_today INTEGER DEFAULT 0,
    messages_sent_this_month INTEGER DEFAULT 0,
    total_messages_sent BIGINT DEFAULT 0,
    
    conversations_today INTEGER DEFAULT 0,
    conversations_this_month INTEGER DEFAULT 0,
    total_conversations BIGINT DEFAULT 0,
    
    -- Cost Tracking (estimated)
    estimated_cost_today DECIMAL(10, 4) DEFAULT 0.00,
    estimated_cost_this_month DECIMAL(10, 4) DEFAULT 0.00,
    total_estimated_cost DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Reset Tracking
    last_daily_reset DATE DEFAULT CURRENT_DATE,
    last_monthly_reset DATE DEFAULT date_trunc('month', CURRENT_DATE),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, widget_id)
);

CREATE INDEX idx_whatsapp_usage_client ON whatsapp_usage(client_id);
CREATE INDEX idx_whatsapp_usage_widget ON whatsapp_usage(widget_id);

COMMENT ON TABLE whatsapp_usage IS 'Tracks WhatsApp usage metrics and costs per client/widget';

-- ================================================
-- WHATSAPP PHONE NUMBERS
-- ================================================
-- Track which phone numbers are configured for WhatsApp

CREATE TABLE IF NOT EXISTS whatsapp_phone_numbers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Phone Number
    phone_number VARCHAR(50) NOT NULL UNIQUE,
    formatted_number VARCHAR(50), -- E.164 format
    country_code VARCHAR(10),
    
    -- Twilio Details
    twilio_phone_sid VARCHAR(100),
    is_sandbox BOOLEAN DEFAULT false,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verification_method VARCHAR(50), -- 'twilio', 'manual', 'meta'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    display_name VARCHAR(255), -- e.g., "ProMed WhatsApp"
    
    -- Metadata
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_phones_client ON whatsapp_phone_numbers(client_id);
CREATE INDEX idx_whatsapp_phones_widget ON whatsapp_phone_numbers(widget_id);
CREATE INDEX idx_whatsapp_phones_number ON whatsapp_phone_numbers(phone_number);

COMMENT ON TABLE whatsapp_phone_numbers IS 'Tracks WhatsApp Business phone numbers per client';

-- ================================================
-- AUTO-RESET FUNCTION FOR DAILY/MONTHLY COUNTERS
-- ================================================

CREATE OR REPLACE FUNCTION reset_whatsapp_usage_counters()
RETURNS void AS $$
BEGIN
    -- Reset daily counters
    UPDATE whatsapp_usage
    SET 
        messages_sent_today = 0,
        conversations_today = 0,
        estimated_cost_today = 0.00,
        last_daily_reset = CURRENT_DATE,
        updated_at = NOW()
    WHERE last_daily_reset < CURRENT_DATE;
    
    -- Reset monthly counters
    UPDATE whatsapp_usage
    SET 
        messages_sent_this_month = 0,
        conversations_this_month = 0,
        estimated_cost_this_month = 0.00,
        last_monthly_reset = date_trunc('month', CURRENT_DATE),
        updated_at = NOW()
    WHERE date_trunc('month', last_monthly_reset) < date_trunc('month', CURRENT_DATE);
    
    RAISE NOTICE '✅ WhatsApp usage counters reset completed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_whatsapp_usage_counters IS 'Resets daily and monthly WhatsApp usage counters';

-- ================================================
-- ANALYTICS VIEW
-- ================================================

CREATE OR REPLACE VIEW whatsapp_analytics AS
SELECT 
    c.id as client_id,
    c.client_name,
    w.id as widget_id,
    w.bot_name,
    
    -- Phone Numbers
    (SELECT COUNT(*) FROM whatsapp_phone_numbers wpn WHERE wpn.client_id = c.id AND wpn.is_active = true) as active_phone_numbers,
    
    -- Messages
    COUNT(DISTINCT wm.id) as total_messages,
    SUM(CASE WHEN wm.direction = 'outbound' THEN 1 ELSE 0 END) as messages_sent,
    SUM(CASE WHEN wm.direction = 'inbound' THEN 1 ELSE 0 END) as messages_received,
    
    -- Status
    SUM(CASE WHEN wm.twilio_status = 'delivered' THEN 1 ELSE 0 END) as messages_delivered,
    SUM(CASE WHEN wm.twilio_status = 'failed' THEN 1 ELSE 0 END) as messages_failed,
    
    -- Conversations
    COUNT(DISTINCT wm.conversation_id) as total_conversations,
    
    -- Recent Activity
    MAX(wm.sent_at) as last_message_sent,
    
    -- Usage
    COALESCE(wu.messages_sent_this_month, 0) as messages_this_month,
    COALESCE(wu.estimated_cost_this_month, 0) as estimated_cost_this_month

FROM clients c
LEFT JOIN widget_configs w ON c.id = w.client_id
LEFT JOIN whatsapp_messages wm ON c.id = wm.client_id
LEFT JOIN whatsapp_usage wu ON c.id = wu.client_id AND w.id = wu.widget_id
GROUP BY c.id, c.client_name, w.id, w.bot_name, wu.messages_sent_this_month, wu.estimated_cost_this_month;

COMMENT ON VIEW whatsapp_analytics IS 'Analytics summary for WhatsApp usage per client/widget';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ WhatsApp integration schema installed successfully';
    RAISE NOTICE '   - Added enable_whatsapp and whatsapp_configured to widget_configs';
    RAISE NOTICE '   - Created whatsapp_messages table';
    RAISE NOTICE '   - Created whatsapp_usage table';
    RAISE NOTICE '   - Created whatsapp_phone_numbers table';
    RAISE NOTICE '   - Created reset function and analytics view';
    RAISE NOTICE '   - Ready for client WhatsApp credentials configuration';
END $$;

