-- Add compliance and notification features to widget system
-- Date: October 23, 2025

-- Add industry and compliance columns to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS industry VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS require_disclaimer BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS disclaimer_text TEXT,
ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255);

-- Create table to track disclaimer acceptances (LEGAL COMPLIANCE)
CREATE TABLE IF NOT EXISTS widget_disclaimer_acceptances (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL REFERENCES widget_configs(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE SET NULL,
  visitor_fingerprint VARCHAR(255) NOT NULL, -- Browser fingerprint
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  accepted_at TIMESTAMP DEFAULT NOW(),
  disclaimer_version VARCHAR(50) DEFAULT '1.0',
  
  -- Index for fast lookups
  INDEX idx_widget_disclaimer_widget_id (widget_id),
  INDEX idx_widget_disclaimer_fingerprint (visitor_fingerprint),
  INDEX idx_widget_disclaimer_conversation (conversation_id)
);

-- Create table to track email notifications sent (avoid duplicates)
CREATE TABLE IF NOT EXISTS widget_email_notifications (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL REFERENCES widget_configs(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE SET NULL,
  visitor_fingerprint VARCHAR(255) NOT NULL,
  email_sent_to VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'new_conversation', -- new_conversation, lead_captured, etc.
  sent_at TIMESTAMP DEFAULT NOW(),
  email_status VARCHAR(50) DEFAULT 'sent', -- sent, failed, bounced
  
  -- Prevent duplicate notifications for same visitor
  UNIQUE(widget_id, visitor_fingerprint, notification_type),
  
  -- Index for performance
  INDEX idx_widget_notifications_widget_id (widget_id),
  INDEX idx_widget_notifications_fingerprint (visitor_fingerprint),
  INDEX idx_widget_notifications_sent_at (sent_at)
);

-- Add comments for documentation
COMMENT ON TABLE widget_disclaimer_acceptances IS 'Legal proof that customers accepted terms before chatting';
COMMENT ON TABLE widget_email_notifications IS 'Track email notifications sent to avoid duplicates';

COMMENT ON COLUMN widget_configs.industry IS 'Industry type: healthcare, legal, financial, general';
COMMENT ON COLUMN widget_configs.require_disclaimer IS 'Show HIPAA/privacy disclaimer before chat (default: true for safety)';
COMMENT ON COLUMN widget_configs.disclaimer_text IS 'Custom disclaimer text (falls back to default HIPAA warning)';
COMMENT ON COLUMN widget_configs.enable_email_notifications IS 'Send email when new customer chats';
COMMENT ON COLUMN widget_configs.notification_email IS 'Email address to send notifications to';

-- Add default disclaimer text for existing widgets
UPDATE widget_configs
SET disclaimer_text = 'IMPORTANT: Do not share personal health information, social security numbers, or other sensitive data through this chat. This chat is for general inquiries only. For medical advice or to discuss personal health information, please contact us directly by phone.'
WHERE disclaimer_text IS NULL AND require_disclaimer = true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_widget_configs_industry ON widget_configs(industry);
CREATE INDEX IF NOT EXISTS idx_widget_configs_notifications ON widget_configs(enable_email_notifications) WHERE enable_email_notifications = true;
