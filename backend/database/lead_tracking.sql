-- Lead Activity Tracking Table
CREATE TABLE IF NOT EXISTS lead_activity (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'email_sent', 'email_opened', 'email_clicked', 'seo_report_sent', 'status_changed', 'note_added'
  activity_data JSONB, -- Additional data about the activity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_lead_id ON lead_activity(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_type ON lead_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activity_created_at ON lead_activity(created_at DESC);

-- Lead Email History Table
CREATE TABLE IF NOT EXISTS lead_emails (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  tracking_id VARCHAR(255) UNIQUE -- For email tracking
);

CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_emails_status ON lead_emails(status);
CREATE INDEX IF NOT EXISTS idx_lead_emails_sent_at ON lead_emails(sent_at DESC);

-- Lead SEO Reports Table
CREATE TABLE IF NOT EXISTS lead_seo_reports (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'basic', 'comprehensive'
  report_data JSONB NOT NULL, -- The actual SEO report data
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP,
  tracking_id VARCHAR(255) UNIQUE -- For report viewing tracking
);

CREATE INDEX IF NOT EXISTS idx_lead_seo_reports_lead_id ON lead_seo_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_seo_reports_type ON lead_seo_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_lead_seo_reports_sent_at ON lead_seo_reports(sent_at DESC);

-- Comments for documentation
COMMENT ON TABLE lead_activity IS 'Tracks all activities related to leads including emails, status changes, and interactions';
COMMENT ON TABLE lead_emails IS 'Stores email history sent to leads with tracking information';
COMMENT ON TABLE lead_seo_reports IS 'Stores SEO reports generated for leads with viewing tracking';

