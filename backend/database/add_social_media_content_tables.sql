-- ============================================================================
-- SOCIAL MEDIA CONTENT MANAGEMENT SYSTEM - PHASE 1
-- Date: October 21, 2025
-- Purpose: Enable multi-platform social media content creation, approval workflow, and posting
-- Version: 1.0.0
-- Feature: Social Media Content Management
-- ============================================================================

-- ============================================================================
-- TABLE 1: SOCIAL MEDIA CONTENT LIBRARY
-- Stores all content (drafts, approved, posted)
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_content (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Content Details
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'carousel', 'story'
  content_text TEXT,
  media_urls TEXT[], -- Array of media URLs (images, videos)
  hashtags TEXT[], -- Array of hashtags
  mentions TEXT[], -- Array of mentions
  
  -- Target Platforms
  target_platforms TEXT[], -- ['facebook', 'linkedin', 'instagram', 'twitter', 'google_business']
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'draft', 
  -- Status values:
  -- 'draft' - Being created/edited
  -- 'pending_wtfu_approval' - Submitted, waiting for WeTechForU approval
  -- 'pending_client_approval' - WeTechForU approved, waiting for client approval
  -- 'approved' - Fully approved, ready to post
  -- 'rejected' - Rejected at some stage
  -- 'posted' - Successfully posted
  -- 'scheduled' - Scheduled for future posting
  -- 'failed' - Posting failed
  
  -- AI/Template Info (for future use)
  is_ai_generated BOOLEAN DEFAULT false,
  template_id INTEGER,
  generation_prompt TEXT,
  
  CONSTRAINT unique_client_content_title UNIQUE(client_id, title)
);

-- ============================================================================
-- TABLE 2: SOCIAL MEDIA POSTS (SCHEDULED & POSTED)
-- Tracks posting schedule and execution per platform
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL REFERENCES social_media_content(id) ON DELETE CASCADE,
  
  -- Platform Details
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'linkedin', 'instagram', 'twitter', 'google_business', 'tiktok'
  platform_account_id VARCHAR(255), -- Specific page/account ID on that platform
  
  -- Post Configuration
  post_type VARCHAR(50) NOT NULL DEFAULT 'organic', -- 'organic', 'paid_post', 'paid_story', 'paid_video'
  scheduled_time TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'draft', 
  -- Status values:
  -- 'draft' - Not yet scheduled
  -- 'scheduled' - Scheduled for future posting
  -- 'posting' - Currently being posted
  -- 'posted' - Successfully posted
  -- 'failed' - Posting failed
  -- 'cancelled' - User cancelled scheduled post
  
  posted_at TIMESTAMP,
  platform_post_id VARCHAR(255), -- ID from the platform after posting (e.g., Facebook post ID)
  platform_url TEXT, -- Direct URL to the post on the platform
  
  -- Approval Workflow Tracking
  wtfu_approved_by INTEGER REFERENCES users(id),
  wtfu_approved_at TIMESTAMP,
  wtfu_approval_notes TEXT,
  
  client_approved_by INTEGER REFERENCES users(id),
  client_approved_at TIMESTAMP,
  client_approval_notes TEXT,
  
  -- Paid Campaign (if applicable)
  is_paid BOOLEAN DEFAULT false,
  campaign_budget DECIMAL(10, 2),
  campaign_duration_days INTEGER,
  target_audience JSONB, -- Targeting parameters (age, location, interests, etc.)
  
  -- Error Handling & Retry Logic
  last_attempt_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE 3: PLATFORM VALIDATION RULES
-- Defines content requirements and limits for each platform
-- ============================================================================
CREATE TABLE IF NOT EXISTS platform_validation_rules (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL UNIQUE,
  
  -- Content Limits
  max_text_length INTEGER,
  max_hashtags INTEGER,
  max_mentions INTEGER,
  max_images INTEGER,
  max_videos INTEGER,
  max_video_duration_seconds INTEGER,
  
  -- Supported Content Types
  supported_content_types TEXT[], -- ['text', 'image', 'video', 'carousel', 'story']
  
  -- Image Requirements
  min_image_width INTEGER,
  min_image_height INTEGER,
  max_image_width INTEGER,
  max_image_height INTEGER,
  supported_image_formats TEXT[], -- ['jpg', 'png', 'gif', 'webp']
  max_image_size_mb DECIMAL(5, 2),
  
  -- Video Requirements
  supported_video_formats TEXT[], -- ['mp4', 'mov', 'avi', 'webm']
  max_video_size_mb DECIMAL(8, 2),
  min_video_duration_seconds INTEGER,
  
  -- Platform-Specific Features
  supports_hashtags BOOLEAN DEFAULT true,
  supports_mentions BOOLEAN DEFAULT true,
  supports_links BOOLEAN DEFAULT true,
  supports_emojis BOOLEAN DEFAULT true,
  
  -- Additional Rules (JSON for flexibility)
  additional_rules JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE 4: SOCIAL MEDIA ANALYTICS
-- Unified performance tracking across all platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_analytics (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES social_media_posts(id) ON DELETE CASCADE,
  
  -- Platform Info
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  
  -- Engagement Metrics (Common across platforms)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Video Metrics (if applicable)
  video_views INTEGER DEFAULT 0,
  video_view_time_seconds INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Paid Campaign Metrics (if applicable)
  spend DECIMAL(10, 2) DEFAULT 0,
  cpc DECIMAL(10, 4) DEFAULT 0, -- Cost per click
  cpm DECIMAL(10, 4) DEFAULT 0, -- Cost per mille (1000 impressions)
  conversions INTEGER DEFAULT 0,
  conversion_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Calculated Metrics
  engagement_rate DECIMAL(5, 2) DEFAULT 0, -- (likes + comments + shares + saves) / reach * 100
  click_through_rate DECIMAL(5, 2) DEFAULT 0, -- clicks / impressions * 100
  
  -- Platform-Specific Metrics (JSON for flexibility)
  platform_specific_metrics JSONB,
  
  -- Metadata
  synced_at TIMESTAMP DEFAULT NOW(),
  recorded_at DATE DEFAULT CURRENT_DATE,
  
  CONSTRAINT unique_post_analytics_date UNIQUE(post_id, recorded_at)
);

-- ============================================================================
-- TABLE 5: CONTENT APPROVAL HISTORY
-- Audit trail for all approval actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_approval_history (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES social_media_content(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES social_media_posts(id) ON DELETE CASCADE,
  
  -- Approval Details
  approval_type VARCHAR(50) NOT NULL, -- 'wtfu_approval', 'client_approval', 'wtfu_rejection', 'client_rejection'
  approved_by INTEGER NOT NULL REFERENCES users(id),
  approval_status VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'changes_requested'
  notes TEXT,
  
  -- Changes Requested (if any)
  requested_changes JSONB, -- Array of specific changes requested
  
  -- Previous Status (for rollback if needed)
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE 6: CONTENT TEMPLATES
-- Reusable content templates for efficiency
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_templates (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, -- NULL = global template
  
  -- Template Details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'promotional', 'educational', 'engagement', 'announcement', 'seasonal'
  description TEXT,
  
  -- Template Content
  template_text TEXT,
  placeholder_variables TEXT[], -- ['practice_name', 'service_name', 'offer_details', 'date', 'location']
  suggested_hashtags TEXT[],
  suggested_platforms TEXT[], -- Which platforms this works best for
  
  -- Template Media
  default_media_urls TEXT[], -- Default images/videos for template
  
  -- Template Settings
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- Available to all clients
  usage_count INTEGER DEFAULT 0, -- Track how often used
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE 7: API QUOTA TRACKING
-- Track API usage to prevent overage charges
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_quota_tracking (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Quota Limits
  endpoint VARCHAR(255),
  quota_limit INTEGER NOT NULL, -- Max allowed in period
  quota_period VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'monthly'
  quota_used INTEGER DEFAULT 0, -- Current usage
  
  -- Reset Info
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  quota_reset_at TIMESTAMP NOT NULL,
  
  -- Warning & Alert System
  warning_threshold INTEGER, -- Alert at this percentage (e.g., 80 for 80%)
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMP,
  
  -- Cost Tracking (for paid APIs)
  is_free_tier BOOLEAN DEFAULT true,
  estimated_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Metadata
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_platform_client_endpoint_period UNIQUE(platform, client_id, endpoint, quota_period, period_start)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Social Media Content Indexes
CREATE INDEX IF NOT EXISTS idx_social_content_client ON social_media_content(client_id);
CREATE INDEX IF NOT EXISTS idx_social_content_status ON social_media_content(status);
CREATE INDEX IF NOT EXISTS idx_social_content_created_by ON social_media_content(created_by);
CREATE INDEX IF NOT EXISTS idx_social_content_created_at ON social_media_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_content_platforms ON social_media_content USING GIN(target_platforms);

-- Social Media Posts Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_client ON social_media_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_content ON social_media_posts(content_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_media_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform_id ON social_media_posts(platform_post_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_media_posts(created_at DESC);

-- Composite index for cron job (finding posts to publish)
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_status 
ON social_media_posts(scheduled_time, status) 
WHERE status = 'scheduled';

-- Social Media Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_social_analytics_client ON social_media_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON social_media_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON social_media_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_social_analytics_recorded ON social_media_analytics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform_post ON social_media_analytics(platform_post_id);

-- Approval History Indexes
CREATE INDEX IF NOT EXISTS idx_approval_history_content ON content_approval_history(content_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_post ON content_approval_history(post_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_approver ON content_approval_history(approved_by);
CREATE INDEX IF NOT EXISTS idx_approval_history_created ON content_approval_history(created_at DESC);

-- Content Templates Indexes
CREATE INDEX IF NOT EXISTS idx_templates_client ON content_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON content_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON content_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_global ON content_templates(is_global) WHERE is_global = true;

-- API Quota Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_quota_platform ON api_quota_tracking(platform);
CREATE INDEX IF NOT EXISTS idx_quota_client ON api_quota_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_quota_period_end ON api_quota_tracking(period_end);
CREATE INDEX IF NOT EXISTS idx_quota_alert ON api_quota_tracking(alert_sent) WHERE alert_sent = false;

-- ============================================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE social_media_content IS 'Stores all social media content (drafts, approved, posted)';
COMMENT ON TABLE social_media_posts IS 'Tracks scheduled and posted content per platform';
COMMENT ON TABLE platform_validation_rules IS 'Defines content requirements and limits for each social platform';
COMMENT ON TABLE social_media_analytics IS 'Unified performance tracking across all social media platforms';
COMMENT ON TABLE content_approval_history IS 'Audit trail for all approval workflow actions';
COMMENT ON TABLE content_templates IS 'Reusable content templates for efficient content creation';
COMMENT ON TABLE api_quota_tracking IS 'Tracks API usage to prevent overage charges';

-- Column Comments
COMMENT ON COLUMN social_media_content.status IS 'Content workflow status: draft, pending_wtfu_approval, pending_client_approval, approved, rejected, posted, scheduled, failed';
COMMENT ON COLUMN social_media_posts.status IS 'Post status: draft, scheduled, posting, posted, failed, cancelled';
COMMENT ON COLUMN social_media_posts.platform_post_id IS 'Unique ID from the platform after successful posting';
COMMENT ON COLUMN social_media_analytics.engagement_rate IS 'Calculated as (likes + comments + shares + saves) / reach * 100';
COMMENT ON COLUMN api_quota_tracking.warning_threshold IS 'Alert when usage reaches this percentage (e.g., 80 = 80%)';

-- ============================================================================
-- SEED DATA: PLATFORM VALIDATION RULES
-- ============================================================================

-- Facebook Validation Rules
INSERT INTO platform_validation_rules (
  platform,
  max_text_length,
  max_hashtags,
  max_mentions,
  max_images,
  max_videos,
  max_video_duration_seconds,
  supported_content_types,
  min_image_width,
  min_image_height,
  supported_image_formats,
  max_image_size_mb,
  supported_video_formats,
  max_video_size_mb,
  min_video_duration_seconds,
  supports_hashtags,
  supports_mentions,
  supports_links,
  supports_emojis,
  additional_rules
) VALUES (
  'facebook',
  63206, -- Max characters (but recommend 500-1000)
  30, -- Recommended max hashtags
  50, -- Max mentions
  4, -- Max images per post
  1, -- Max videos per post
  14400, -- Max 240 minutes (4 hours)
  ARRAY['text', 'image', 'video', 'carousel'],
  600,
  315,
  ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp'],
  8.0,
  ARRAY['mp4', 'mov', 'avi', 'webm'],
  4096.0, -- 4GB
  1,
  true,
  true,
  true,
  true,
  '{"recommended_text_length": 500, "optimal_image_ratio": "1.91:1 or 1:1", "link_preview": true}'::jsonb
) ON CONFLICT (platform) DO NOTHING;

-- LinkedIn Validation Rules
INSERT INTO platform_validation_rules (
  platform,
  max_text_length,
  max_hashtags,
  max_mentions,
  max_images,
  max_videos,
  max_video_duration_seconds,
  supported_content_types,
  min_image_width,
  min_image_height,
  supported_image_formats,
  max_image_size_mb,
  supported_video_formats,
  max_video_size_mb,
  min_video_duration_seconds,
  supports_hashtags,
  supports_mentions,
  supports_links,
  supports_emojis,
  additional_rules
) VALUES (
  'linkedin',
  3000, -- Max characters
  5, -- Recommended max hashtags
  50,
  9, -- Max images per post
  1,
  1800, -- Max 30 minutes
  ARRAY['text', 'image', 'video', 'carousel'],
  552,
  276,
  ARRAY['jpg', 'jpeg', 'png', 'gif'],
  5.0,
  ARRAY['mp4', 'mov', 'webm'],
  5120.0, -- 5GB
  3,
  true,
  true,
  true,
  true,
  '{"recommended_text_length": 150, "optimal_image_ratio": "1.91:1", "professional_tone": true}'::jsonb
) ON CONFLICT (platform) DO NOTHING;

-- Instagram Validation Rules
INSERT INTO platform_validation_rules (
  platform,
  max_text_length,
  max_hashtags,
  max_mentions,
  max_images,
  max_videos,
  max_video_duration_seconds,
  supported_content_types,
  min_image_width,
  min_image_height,
  supported_image_formats,
  max_image_size_mb,
  supported_video_formats,
  max_video_size_mb,
  min_video_duration_seconds,
  supports_hashtags,
  supports_mentions,
  supports_links,
  supports_emojis,
  additional_rules
) VALUES (
  'instagram',
  2200, -- Max caption characters
  30, -- Max hashtags
  20,
  10, -- Max for carousel
  1,
  60, -- Max 60 seconds for feed
  ARRAY['image', 'video', 'carousel', 'story'],
  320,
  320,
  ARRAY['jpg', 'jpeg', 'png'],
  8.0,
  ARRAY['mp4', 'mov'],
  100.0,
  3,
  true,
  true,
  false, -- No clickable links in captions
  true,
  '{"recommended_text_length": 125, "story_duration": 15, "optimal_aspect_ratios": ["1:1", "4:5", "1.91:1"]}'::jsonb
) ON CONFLICT (platform) DO NOTHING;

-- Twitter/X Validation Rules
INSERT INTO platform_validation_rules (
  platform,
  max_text_length,
  max_hashtags,
  max_mentions,
  max_images,
  max_videos,
  max_video_duration_seconds,
  supported_content_types,
  min_image_width,
  min_image_height,
  supported_image_formats,
  max_image_size_mb,
  supported_video_formats,
  max_video_size_mb,
  min_video_duration_seconds,
  supports_hashtags,
  supports_mentions,
  supports_links,
  supports_emojis,
  additional_rules
) VALUES (
  'twitter',
  280, -- Max characters (4000 for Twitter Blue)
  10, -- Recommended max hashtags
  10,
  4, -- Max images per tweet
  1,
  140, -- Max 2:20 minutes
  ARRAY['text', 'image', 'video'],
  600,
  335,
  ARRAY['jpg', 'jpeg', 'png', 'gif', 'webp'],
  5.0,
  ARRAY['mp4', 'mov'],
  512.0,
  0,
  true,
  true,
  true,
  true,
  '{"api_tier_limit": 1500, "api_cost_after_limit": "paid", "character_count_includes_urls": true}'::jsonb
) ON CONFLICT (platform) DO NOTHING;

-- Google My Business Validation Rules
INSERT INTO platform_validation_rules (
  platform,
  max_text_length,
  max_hashtags,
  max_mentions,
  max_images,
  max_videos,
  max_video_duration_seconds,
  supported_content_types,
  min_image_width,
  min_image_height,
  supported_image_formats,
  max_image_size_mb,
  supported_video_formats,
  max_video_size_mb,
  min_video_duration_seconds,
  supports_hashtags,
  supports_mentions,
  supports_links,
  supports_emojis,
  additional_rules
) VALUES (
  'google_business',
  1500, -- Max characters
  0, -- No hashtags support
  0, -- No mentions
  10,
  1,
  30, -- Max 30 seconds
  ARRAY['text', 'image', 'video'],
  250,
  250,
  ARRAY['jpg', 'jpeg', 'png'],
  5.0,
  ARRAY['mp4'],
  100.0,
  1,
  false, -- No hashtags
  false, -- No mentions
  true,
  true,
  '{"supports_cta_buttons": true, "post_types": ["standard", "event", "offer", "product"]}'::jsonb
) ON CONFLICT (platform) DO NOTHING;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Social Media Content Management tables created successfully!';
  RAISE NOTICE '✅ Created 7 tables';
  RAISE NOTICE '✅ Created 28 indexes';
  RAISE NOTICE '✅ Seeded validation rules for 5 platforms';
  RAISE NOTICE '✅ Phase 1 database setup complete!';
END $$;

