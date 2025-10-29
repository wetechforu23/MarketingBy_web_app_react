-- ==========================================
-- AI CHAT WIDGET SYSTEM - DATABASE MIGRATION
-- Created: 2025-10-23
-- Purpose: Embeddable AI chat widget for customer websites
-- ==========================================

-- Widget Configurations Table
CREATE TABLE IF NOT EXISTS widget_configs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    widget_key VARCHAR(255) UNIQUE NOT NULL, -- Unique key for embedding
    widget_name VARCHAR(255) NOT NULL,
    
    -- Appearance Settings
    primary_color VARCHAR(7) DEFAULT '#4682B4',
    secondary_color VARCHAR(7) DEFAULT '#2E86AB',
    position VARCHAR(20) DEFAULT 'bottom-right', -- bottom-right, bottom-left, top-right, top-left
    welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
    bot_name VARCHAR(100) DEFAULT 'Assistant',
    bot_avatar_url TEXT,
    
    -- Features Configuration
    enable_appointment_booking BOOLEAN DEFAULT true,
    enable_email_capture BOOLEAN DEFAULT true,
    enable_phone_capture BOOLEAN DEFAULT true,
    enable_ai_handoff BOOLEAN DEFAULT false,
    ai_handoff_url TEXT, -- URL to customer's own AI agent
    
    -- Business Hours
    business_hours JSONB DEFAULT '{"enabled": false, "timezone": "America/Chicago", "hours": {}}',
    offline_message TEXT DEFAULT 'We are currently offline. Please leave your email and we''ll get back to you!',
    
    -- Anti-Spam Settings
    rate_limit_messages INTEGER DEFAULT 10, -- Max messages per session
    rate_limit_window INTEGER DEFAULT 60, -- Time window in seconds
    require_captcha BOOLEAN DEFAULT false,
    blocked_ips TEXT[], -- Array of blocked IPs
    blocked_keywords TEXT[], -- Array of spam keywords
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    domain_whitelist TEXT[], -- Allowed domains (empty = all)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS widget_knowledge_base (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Knowledge Entry
    category VARCHAR(100), -- 'general', 'services', 'pricing', 'appointments', 'faq'
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[], -- For better matching
    
    -- Priority & Context
    priority INTEGER DEFAULT 0, -- Higher priority answers shown first
    context JSONB, -- Additional context for smart matching
    
    -- Usage Stats
    times_used INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster knowledge base search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON widget_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_widget ON widget_knowledge_base(widget_id);

-- Chat Conversations Table
CREATE TABLE IF NOT EXISTS widget_conversations (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Visitor Information
    session_id VARCHAR(255) NOT NULL, -- Browser session ID
    visitor_name VARCHAR(255),
    visitor_email VARCHAR(255),
    visitor_phone VARCHAR(50),
    
    -- Conversation Metadata
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    page_url TEXT,
    
    -- Spam Detection
    spam_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00
    is_spam BOOLEAN DEFAULT false,
    spam_reason TEXT,
    
    -- Lead Info
    lead_captured BOOLEAN DEFAULT false,
    lead_id INTEGER REFERENCES leads(id),
    handoff_type VARCHAR(50), -- 'email', 'phone', 'ai_agent', 'human'
    handoff_details JSONB,
    
    -- Status & Timing
    status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned, spam
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Analytics
    message_count INTEGER DEFAULT 0,
    bot_response_count INTEGER DEFAULT 0,
    satisfaction_rating INTEGER, -- 1-5 stars
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_widget ON widget_conversations(widget_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON widget_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_email ON widget_conversations(visitor_email);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON widget_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_date ON widget_conversations(created_at);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS widget_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
    
    -- Message Content
    message_type VARCHAR(20) NOT NULL, -- 'user', 'bot', 'system'
    message_text TEXT NOT NULL,
    
    -- Bot Response Details
    knowledge_base_id INTEGER REFERENCES widget_knowledge_base(id),
    confidence_score DECIMAL(3,2), -- How confident the bot is (0.00 to 1.00)
    response_time_ms INTEGER, -- Bot response time in milliseconds
    
    -- User Feedback
    was_helpful BOOLEAN,
    feedback_text TEXT,
    
    -- Metadata
    metadata JSONB, -- Additional data (buttons clicked, links, etc.)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON widget_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON widget_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_date ON widget_messages(created_at);

-- Widget Analytics Table (Daily aggregates)
CREATE TABLE IF NOT EXISTS widget_analytics (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Conversation Metrics
    total_conversations INTEGER DEFAULT 0,
    completed_conversations INTEGER DEFAULT 0,
    abandoned_conversations INTEGER DEFAULT 0,
    spam_conversations INTEGER DEFAULT 0,
    
    -- Message Metrics
    total_messages INTEGER DEFAULT 0,
    avg_messages_per_conversation DECIMAL(5,2),
    avg_response_time_ms INTEGER,
    avg_conversation_duration_seconds INTEGER,
    
    -- Lead Metrics
    leads_captured INTEGER DEFAULT 0,
    email_handoffs INTEGER DEFAULT 0,
    phone_handoffs INTEGER DEFAULT 0,
    ai_agent_handoffs INTEGER DEFAULT 0,
    
    -- Satisfaction
    avg_satisfaction_rating DECIMAL(3,2),
    helpful_responses INTEGER DEFAULT 0,
    not_helpful_responses INTEGER DEFAULT 0,
    
    -- Performance
    avg_confidence_score DECIMAL(3,2),
    knowledge_base_matches INTEGER DEFAULT 0,
    fallback_responses INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(widget_id, date)
);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_widget_date ON widget_analytics(widget_id, date);

-- Spam Detection Rules Table
CREATE TABLE IF NOT EXISTS widget_spam_rules (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Rule Configuration
    rule_type VARCHAR(50) NOT NULL, -- 'keyword', 'pattern', 'rate_limit', 'ip_block'
    rule_value TEXT NOT NULL,
    rule_action VARCHAR(20) DEFAULT 'block', -- 'block', 'flag', 'challenge'
    
    -- Rule Details
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    description TEXT,
    
    -- Stats
    times_triggered INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointment Booking via Chat
CREATE TABLE IF NOT EXISTS widget_appointments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Appointment Details
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    
    -- Service Details
    service_type VARCHAR(255),
    preferred_date DATE,
    preferred_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    
    -- Calendar Integration
    calendar_event_id VARCHAR(255), -- Google Calendar event ID
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_widget ON widget_appointments(widget_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON widget_appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON widget_appointments(preferred_date);

-- Widget Installation Tracking
CREATE TABLE IF NOT EXISTS widget_installations (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
    
    -- Installation Details
    domain VARCHAR(255) NOT NULL,
    installation_type VARCHAR(50), -- 'wordpress', 'html', 'shopify', 'wix', etc.
    installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Version Tracking
    widget_version VARCHAR(20),
    last_ping TIMESTAMP, -- Heartbeat to check if still installed
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false, -- Domain ownership verified
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(widget_id, domain)
);

-- Add sample knowledge base entries function
CREATE OR REPLACE FUNCTION add_default_knowledge_base(p_widget_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO widget_knowledge_base (widget_id, category, question, answer, keywords, priority)
    VALUES
    (p_widget_id, 'general', 'What are your business hours?', 'We are open Monday to Friday, 9 AM to 6 PM EST. Feel free to leave a message anytime!', ARRAY['hours', 'open', 'time', 'schedule'], 10),
    (p_widget_id, 'general', 'How can I contact you?', 'You can reach us via email, phone, or schedule an appointment right here in the chat!', ARRAY['contact', 'email', 'phone', 'reach'], 10),
    (p_widget_id, 'appointments', 'How do I book an appointment?', 'I can help you book an appointment! What date and time works best for you?', ARRAY['book', 'schedule', 'appointment', 'meeting'], 15),
    (p_widget_id, 'services', 'What services do you offer?', 'We offer a wide range of services tailored to your needs. What specific service are you interested in?', ARRAY['services', 'offerings', 'provide', 'do'], 10),
    (p_widget_id, 'faq', 'How much does it cost?', 'Our pricing varies based on your specific needs. I''d be happy to connect you with our team for a detailed quote!', ARRAY['price', 'cost', 'pricing', 'fees'], 8);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust role name as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_role;

-- Migration complete
SELECT 'AI Chat Widget tables created successfully!' AS status;

