-- Migration: Add Unsplash attribution columns to blog_posts table
-- Date: 2025-10-29
-- Purpose: Comply with Unsplash API Terms - store photographer attribution

-- Add columns for image attribution (required for Unsplash API compliance)
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS image_photographer VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_photographer_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.image_photographer IS 'Photographer name for featured image attribution (Unsplash compliance)';
COMMENT ON COLUMN blog_posts.image_photographer_url IS 'Photographer profile URL for featured image attribution (Unsplash compliance)';

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_blog_posts_photographer ON blog_posts(image_photographer);

COMMENT ON TABLE blog_posts IS 'Blog posts with full Unsplash API compliance for image attribution';

