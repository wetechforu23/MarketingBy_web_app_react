-- Add compliance and notification features to widget system
-- Date: October 23, 2025

-- Create table to track disclaimer acceptances (LEGAL COMPLIANCE)
CREATE TABLE IF NOT EXISTS widget_disclaimer_acceptances (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL,
  conversation_id INTEGER,
  visitor_fingerprint VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  accepted_at TIMESTAMP DEFAULT NOW(),
  disclaimer_version VARCHAR(50) DEFAULT '1.0'
);

-- Create indexes for disclaimer acceptances
CREATE INDEX IF NOT EXISTS idx_widget_disclaimer_widget_id ON widget_disclaimer_acceptances(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_disclaimer_fingerprint ON widget_disclaimer_acceptances(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_widget_disclaimer_conversation ON widget_disclaimer_acceptances(conversation_id);

-- Create table to track email notifications sent (avoid duplicates)
CREATE TABLE IF NOT EXISTS widget_email_notifications (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL,
  conversation_id INTEGER,
  visitor_fingerprint VARCHAR(255) NOT NULL,
  email_sent_to VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) DEFAULT 'new_conversation',
  sent_at TIMESTAMP DEFAULT NOW(),
  email_status VARCHAR(50) DEFAULT 'sent'
);

-- Create unique constraint to prevent duplicate notifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_widget_notifications_unique 
ON widget_email_notifications(widget_id, visitor_fingerprint, notification_type);

-- Create indexes for email notifications
CREATE INDEX IF NOT EXISTS idx_widget_notifications_widget_id ON widget_email_notifications(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_notifications_fingerprint ON widget_email_notifications(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_widget_notifications_sent_at ON widget_email_notifications(sent_at);

-- Add comments for documentation
COMMENT ON TABLE widget_disclaimer_acceptances IS 'Legal proof that customers accepted terms before chatting - HIPAA compliance';
COMMENT ON TABLE widget_email_notifications IS 'Track email notifications sent to business owners - avoid duplicates';
