-- ==========================================
-- VISITOR TRACKING & MONITORING SYSTEM
-- Real-time visitor monitoring like tawk.to
-- ==========================================

-- Visitor Sessions Table (Real-time tracking)
CREATE TABLE IF NOT EXISTS widget_visitor_sessions (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  visitor_fingerprint VARCHAR(255),
  
  -- Visitor Identity
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  visitor_phone VARCHAR(50),
  
  -- Session Info
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  region VARCHAR(100),
  
  -- Device & Browser
  user_agent TEXT,
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  device_type VARCHAR(50), -- desktop, mobile, tablet
  
  -- Current Activity
  current_page_url TEXT,
  current_page_title VARCHAR(500),
  referrer_url TEXT,
  landing_page_url TEXT,
  
  -- Session Metrics
  is_active BOOLEAN DEFAULT true,
  page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_ended_at TIMESTAMP,
  
  -- Engagement
  messages_sent INTEGER DEFAULT 0,
  has_chatted BOOLEAN DEFAULT false,
  conversation_id INTEGER REFERENCES widget_conversations(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page Views Tracking (Detailed page navigation)
CREATE TABLE IF NOT EXISTS widget_page_views (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) REFERENCES widget_visitor_sessions(session_id) ON DELETE CASCADE,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  
  page_url TEXT NOT NULL,
  page_title VARCHAR(500),
  referrer_url TEXT,
  
  time_on_page_seconds INTEGER DEFAULT 0,
  scrolled_percentage INTEGER DEFAULT 0,
  
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP
);

-- Visitor Events (Button clicks, form submissions, etc.)
CREATE TABLE IF NOT EXISTS widget_visitor_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) REFERENCES widget_visitor_sessions(session_id) ON DELETE CASCADE,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  
  event_type VARCHAR(100) NOT NULL, -- page_view, button_click, form_submit, chat_opened, etc.
  event_data JSONB,
  page_url TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance (Critical for real-time queries)
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_widget_active 
  ON widget_visitor_sessions(widget_id, is_active, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id 
  ON widget_visitor_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active 
  ON widget_visitor_sessions(last_active_at DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_page_views_session 
  ON widget_page_views(session_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_events_session 
  ON widget_visitor_events(session_id, created_at DESC);

-- Function to mark inactive sessions (Run every 5 minutes via cron)
CREATE OR REPLACE FUNCTION mark_inactive_sessions() RETURNS void AS $$
BEGIN
  UPDATE widget_visitor_sessions
  SET is_active = false,
      session_ended_at = last_active_at
  WHERE is_active = true
    AND last_active_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total time on site
CREATE OR REPLACE FUNCTION update_session_time() RETURNS TRIGGER AS $$
BEGIN
  NEW.total_time_seconds = EXTRACT(EPOCH FROM (NEW.last_active_at - NEW.session_started_at));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_time_trigger
  BEFORE UPDATE ON widget_visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_time();

-- Comments for documentation
COMMENT ON TABLE widget_visitor_sessions IS 'Real-time visitor session tracking for monitoring dashboard';
COMMENT ON TABLE widget_page_views IS 'Detailed page navigation history per visitor session';
COMMENT ON TABLE widget_visitor_events IS 'Track user interactions and events during session';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON widget_visitor_sessions TO your_app_user;
-- GRANT SELECT, INSERT ON widget_page_views TO your_app_user;
-- GRANT SELECT, INSERT ON widget_visitor_events TO your_app_user;

