-- ==========================================
-- VISITOR EMAIL NOTIFICATION TRACKING
-- Created: 2025-10-24
-- Purpose: Track when visitor engagement emails are sent
-- ==========================================

-- Add notification tracking columns
ALTER TABLE widget_visitor_sessions
ADD COLUMN IF NOT EXISTS engagement_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS engagement_email_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_returning_visitor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_visit_count INTEGER DEFAULT 0;

-- Create index for email notification queries
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_email_notification 
  ON widget_visitor_sessions(widget_id, engagement_email_sent, total_time_seconds) 
  WHERE is_active = true;

COMMENT ON COLUMN widget_visitor_sessions.engagement_email_sent IS 'Track if 5-minute engagement email was sent';
COMMENT ON COLUMN widget_visitor_sessions.is_returning_visitor IS 'True if visitor has been here before';
COMMENT ON COLUMN widget_visitor_sessions.previous_visit_count IS 'Number of previous visits from this visitor';

