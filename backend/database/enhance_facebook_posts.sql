-- Add more columns to facebook_posts table for detailed insights
ALTER TABLE facebook_posts 
ADD COLUMN IF NOT EXISTS post_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS post_story TEXT,
ADD COLUMN IF NOT EXISTS full_picture TEXT,
ADD COLUMN IF NOT EXISTS post_impressions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_impressions_unique INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_engaged_users INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_video_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_data JSONB;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_facebook_posts_client_created ON facebook_posts(client_id, created_time DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_type ON facebook_posts(post_type);

COMMENT ON COLUMN facebook_posts.post_type IS 'Type of post: photo, video, link, status, etc.';
COMMENT ON COLUMN facebook_posts.post_impressions IS 'Total number of times the post was viewed';
COMMENT ON COLUMN facebook_posts.post_impressions_unique IS 'Number of unique people who saw the post';
COMMENT ON COLUMN facebook_posts.post_engaged_users IS 'Number of people who engaged with the post';
COMMENT ON COLUMN facebook_posts.post_clicks IS 'Total clicks on the post';
COMMENT ON COLUMN facebook_posts.post_video_views IS 'Number of times video was viewed (for video posts)';
COMMENT ON COLUMN facebook_posts.post_data IS 'Full JSON data from Facebook API';

