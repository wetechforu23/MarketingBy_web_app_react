-- Create Facebook data tables
-- Date: 2025-10-20
-- Purpose: Store Facebook page insights, posts, and follower statistics

-- Table for Facebook page insights
CREATE TABLE IF NOT EXISTS facebook_insights (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_title VARCHAR(200),
  metric_description TEXT,
  metric_value TEXT NOT NULL, -- Can be numeric or JSON for complex values
  period VARCHAR(20), -- 'day', 'days_28', 'lifetime'
  recorded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, metric_name, recorded_at)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_insights_client 
ON facebook_insights(client_id);

CREATE INDEX IF NOT EXISTS idx_facebook_insights_metric 
ON facebook_insights(metric_name);

CREATE INDEX IF NOT EXISTS idx_facebook_insights_recorded 
ON facebook_insights(recorded_at DESC);

-- Table for Facebook posts
CREATE TABLE IF NOT EXISTS facebook_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  post_id VARCHAR(100) UNIQUE NOT NULL,
  message TEXT,
  created_time TIMESTAMP NOT NULL,
  permalink_url TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engaged_users INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_posts_client 
ON facebook_posts(client_id);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_created 
ON facebook_posts(created_time DESC);

-- Table for follower statistics
CREATE TABLE IF NOT EXISTS facebook_follower_stats (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  total_followers INTEGER DEFAULT 0,
  fan_adds INTEGER DEFAULT 0,
  fan_removes INTEGER DEFAULT 0,
  net_change INTEGER DEFAULT 0,
  recorded_at DATE DEFAULT CURRENT_DATE,
  UNIQUE(client_id, recorded_at)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_follower_stats_client 
ON facebook_follower_stats(client_id);

CREATE INDEX IF NOT EXISTS idx_facebook_follower_stats_recorded 
ON facebook_follower_stats(recorded_at DESC);

-- Comments
COMMENT ON TABLE facebook_insights IS 'Stores Facebook page insights metrics';
COMMENT ON TABLE facebook_posts IS 'Stores Facebook posts with engagement metrics';
COMMENT ON TABLE facebook_follower_stats IS 'Stores daily follower statistics';

COMMENT ON COLUMN facebook_insights.metric_name IS 'Facebook metric name (e.g., page_views_total)';
COMMENT ON COLUMN facebook_insights.metric_value IS 'Metric value (can be numeric or JSON)';
COMMENT ON COLUMN facebook_insights.period IS 'Metric period (day, days_28, lifetime)';

COMMENT ON COLUMN facebook_posts.post_id IS 'Facebook post ID';
COMMENT ON COLUMN facebook_posts.permalink_url IS 'Direct link to Facebook post';

COMMENT ON COLUMN facebook_follower_stats.net_change IS 'Net follower change (adds - removes)';

