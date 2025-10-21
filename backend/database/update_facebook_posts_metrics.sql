-- Migration: Add post performance metrics to facebook_posts table
-- Date: 2025-10-21
-- Purpose: Add views, reach, clicks, and video views columns for detailed post analytics

-- Add new columns for post metrics
ALTER TABLE facebook_posts 
ADD COLUMN IF NOT EXISTS post_reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_video_views INTEGER DEFAULT 0;

-- Update column comments
COMMENT ON COLUMN facebook_posts.post_impressions IS 'Total number of times the post was displayed (views)';
COMMENT ON COLUMN facebook_posts.post_reach IS 'Number of unique people who saw the post';
COMMENT ON COLUMN facebook_posts.post_clicks IS 'Total clicks on the post';
COMMENT ON COLUMN facebook_posts.engaged_users IS 'Number of unique people who engaged with the post';
COMMENT ON COLUMN facebook_posts.post_video_views IS 'Video views if post is a video';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facebook_posts_impressions 
ON facebook_posts(post_impressions DESC);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_reach 
ON facebook_posts(post_reach DESC);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_engagement 
ON facebook_posts((total_reactions + comments + shares) DESC);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_created_client 
ON facebook_posts(client_id, created_time DESC);

-- Add a composite index for top posts query
CREATE INDEX IF NOT EXISTS idx_facebook_posts_performance 
ON facebook_posts(client_id, (total_reactions + comments * 2 + shares * 3) DESC, created_time DESC);

-- Update existing NULL values to 0
UPDATE facebook_posts 
SET 
  post_reach = COALESCE(post_reach, 0),
  post_clicks = COALESCE(post_clicks, 0),
  post_video_views = COALESCE(post_video_views, 0),
  post_impressions = COALESCE(post_impressions, 0),
  engaged_users = COALESCE(engaged_users, 0)
WHERE post_reach IS NULL 
   OR post_clicks IS NULL 
   OR post_video_views IS NULL 
   OR post_impressions IS NULL 
   OR engaged_users IS NULL;

-- Verify the migration
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'facebook_posts'
    AND column_name IN ('post_reach', 'post_clicks', 'post_video_views');
    
    IF column_count = 3 THEN
        RAISE NOTICE '✅ Migration successful! Added 3 new columns to facebook_posts table.';
    ELSE
        RAISE WARNING '⚠️ Migration may be incomplete. Expected 3 columns, found %', column_count;
    END IF;
END $$;

-- Display current table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'facebook_posts'
ORDER BY ordinal_position;

