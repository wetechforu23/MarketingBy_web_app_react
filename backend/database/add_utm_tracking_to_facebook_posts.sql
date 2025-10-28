-- Migration: Add UTM Tracking to Facebook Posts
-- Date: 2025-10-28
-- Purpose: Enable conversion tracking for Facebook posts via UTM parameters

-- Add UTM tracking columns to facebook_posts table
ALTER TABLE facebook_posts 
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100) DEFAULT 'facebook',
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100) DEFAULT 'social',
ADD COLUMN IF NOT EXISTS original_urls TEXT[], -- Array of original URLs found in post
ADD COLUMN IF NOT EXISTS tracked_urls TEXT[];  -- Array of URLs with UTM parameters

-- Add index for faster UTM campaign queries
CREATE INDEX IF NOT EXISTS idx_facebook_posts_utm_campaign 
ON facebook_posts(utm_campaign);

-- Add index for tracking date queries
CREATE INDEX IF NOT EXISTS idx_facebook_posts_utm_date 
ON facebook_posts(created_time, utm_campaign);

-- Add comments for documentation
COMMENT ON COLUMN facebook_posts.utm_campaign IS 'Unique UTM campaign identifier for tracking conversions (e.g., promed_fb_post_1730123456789)';
COMMENT ON COLUMN facebook_posts.utm_source IS 'UTM source parameter (always facebook for posts from this platform)';
COMMENT ON COLUMN facebook_posts.utm_medium IS 'UTM medium parameter (social/paid/organic)';
COMMENT ON COLUMN facebook_posts.original_urls IS 'Array of original URLs extracted from post content before UTM tracking';
COMMENT ON COLUMN facebook_posts.tracked_urls IS 'Array of URLs with UTM parameters added for conversion tracking';

-- Verify migration
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'facebook_posts' 
  AND column_name IN ('utm_campaign', 'utm_source', 'utm_medium', 'original_urls', 'tracked_urls')
ORDER BY column_name;

