-- Create Facebook Analytics Tables
-- This script creates the required tables for Facebook analytics

-- 1. Facebook Analytics Table (Page-level metrics)
CREATE TABLE IF NOT EXISTS facebook_analytics (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_views INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_analytics_client_id ON facebook_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_facebook_analytics_synced_at ON facebook_analytics(synced_at DESC);

-- 2. Facebook Posts Table (Post-level metrics)
CREATE TABLE IF NOT EXISTS facebook_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id VARCHAR(255) UNIQUE NOT NULL,
  message TEXT,
  created_time TIMESTAMP NOT NULL,
  post_type VARCHAR(50),
  post_impressions INTEGER DEFAULT 0,
  post_reach INTEGER DEFAULT 0,
  post_clicks INTEGER DEFAULT 0,
  post_engaged_users INTEGER DEFAULT 0,
  post_video_views INTEGER DEFAULT 0,
  reactions_like INTEGER DEFAULT 0,
  reactions_love INTEGER DEFAULT 0,
  reactions_haha INTEGER DEFAULT 0,
  reactions_wow INTEGER DEFAULT 0,
  reactions_sad INTEGER DEFAULT 0,
  reactions_angry INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_posts_client_id ON facebook_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_created_time ON facebook_posts(created_time DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_engagement ON facebook_posts(post_engaged_users DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_impressions ON facebook_posts(post_impressions DESC);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Facebook analytics tables created successfully!';
  RAISE NOTICE '   - facebook_analytics table';
  RAISE NOTICE '   - facebook_posts table';
  RAISE NOTICE '   - All indexes created';
END $$;

