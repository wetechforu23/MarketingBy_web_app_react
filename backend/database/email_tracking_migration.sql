-- Email Tracking System Migration
-- Version: 1.0
-- Date: 2025-10-10
-- Description: Adds email tracking, link analytics, and enhanced email management features

-- ==================================================
-- 1. Enhance lead_emails table with tracking fields
-- ==================================================

-- Add tracking ID for unique email identification
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(255) UNIQUE;

-- Add timestamp tracking columns
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;

-- Add recipient tracking
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS to_email VARCHAR(255);
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS cc_emails JSONB;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS bcc_emails JSONB;

-- Add template and user attribution
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS template_used VARCHAR(100);
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS sent_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add engagement counters
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;
ALTER TABLE lead_emails ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_tracking_id ON lead_emails(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_lead_tracking ON lead_emails(lead_id, tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_by ON lead_emails(sent_by_user_id);
CREATE INDEX IF NOT EXISTS idx_email_template ON lead_emails(template_used);
CREATE INDEX IF NOT EXISTS idx_email_opened ON lead_emails(opened_at) WHERE opened_at IS NOT NULL;

-- ==================================================
-- 2. Create email_link_tracking table
-- ==================================================

CREATE TABLE IF NOT EXISTS email_link_tracking (
  id SERIAL PRIMARY KEY,
  email_id INTEGER NOT NULL REFERENCES lead_emails(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  tracking_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for link tracking
CREATE INDEX IF NOT EXISTS idx_link_tracking_email ON email_link_tracking(email_id);
CREATE INDEX IF NOT EXISTS idx_link_tracking_url ON email_link_tracking(tracking_url);
CREATE INDEX IF NOT EXISTS idx_link_tracking_clicks ON email_link_tracking(clicks);

-- ==================================================
-- 3. Add comments for documentation
-- ==================================================

COMMENT ON COLUMN lead_emails.tracking_id IS 'Unique identifier for email tracking (open/click detection)';
COMMENT ON COLUMN lead_emails.opened_at IS 'First time the email was opened (tracking pixel loaded)';
COMMENT ON COLUMN lead_emails.clicked_at IS 'First time any link in the email was clicked';
COMMENT ON COLUMN lead_emails.replied_at IS 'Time when recipient replied to the email';
COMMENT ON COLUMN lead_emails.to_email IS 'Primary recipient email address';
COMMENT ON COLUMN lead_emails.cc_emails IS 'JSON array of CC email addresses';
COMMENT ON COLUMN lead_emails.bcc_emails IS 'JSON array of BCC email addresses';
COMMENT ON COLUMN lead_emails.template_used IS 'Email template identifier used for this email';
COMMENT ON COLUMN lead_emails.sent_by_user_id IS 'User who sent this email';
COMMENT ON COLUMN lead_emails.open_count IS 'Total number of times email was opened';
COMMENT ON COLUMN lead_emails.click_count IS 'Total number of link clicks in this email';

COMMENT ON TABLE email_link_tracking IS 'Tracks individual link clicks within emails for detailed analytics';
COMMENT ON COLUMN email_link_tracking.original_url IS 'Original URL before tracking wrapper was applied';
COMMENT ON COLUMN email_link_tracking.tracking_url IS 'Tracking URL that redirects to original after logging';
COMMENT ON COLUMN email_link_tracking.clicks IS 'Total number of clicks on this specific link';

-- ==================================================
-- 4. Migration verification query
-- ==================================================

-- Run this to verify migration success:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'lead_emails' 
-- AND column_name IN ('tracking_id', 'opened_at', 'clicked_at', 'template_used', 'open_count')
-- ORDER BY column_name;

