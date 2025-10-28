-- Migration: Add UTM Tracking Support to Facebook Posts
-- Created: 2025-10-28
-- Purpose: Store UTM tracking data for Facebook posts to enable conversion tracking and ROI analysis

-- Add UTM tracking columns to facebook_posts table
ALTER TABLE facebook_posts 
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100) DEFAULT 'facebook',
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100) DEFAULT 'social',
ADD COLUMN IF NOT EXISTS original_urls TEXT[],
ADD COLUMN IF NOT EXISTS tracked_urls TEXT[];

-- Add index for faster campaign lookups
CREATE INDEX IF NOT EXISTS idx_facebook_posts_utm_campaign 
ON facebook_posts(utm_campaign);

-- Add comments for documentation
COMMENT ON COLUMN facebook_posts.utm_campaign IS 'Unique campaign identifier format: {client}_{platform}_{type}_{timestamp}';
COMMENT ON COLUMN facebook_posts.utm_source IS 'Traffic source (always "facebook")';
COMMENT ON COLUMN facebook_posts.utm_medium IS 'Traffic medium (always "social")';
COMMENT ON COLUMN facebook_posts.original_urls IS 'Array of original URLs before UTM parameters';
COMMENT ON COLUMN facebook_posts.tracked_urls IS 'Array of URLs with UTM parameters for Google Analytics tracking';

-- Verification query (optional - uncomment to test after migration)
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'facebook_posts' 
--   AND column_name IN ('utm_campaign', 'utm_source', 'utm_medium', 'original_urls', 'tracked_urls')
-- ORDER BY ordinal_position;

COMMIT;
