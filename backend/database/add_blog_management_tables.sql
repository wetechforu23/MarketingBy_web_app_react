-- =====================================================
-- Blog Management System - Database Schema
-- Created: October 27, 2025
-- Purpose: Complete blog management with AI, approval workflow, and analytics
-- =====================================================

-- =====================================================
-- Table 1: blog_posts
-- Main table for storing blog posts with AI generation and approval workflow
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  
  -- SEO
  meta_title VARCHAR(500),
  meta_description VARCHAR(500),
  meta_keywords TEXT[],
  seo_score INTEGER DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
  
  -- AI Generation
  generated_by VARCHAR(50) DEFAULT 'manual' CHECK (generated_by IN ('manual', 'google_ai', 'openai', 'claude')),
  ai_prompt TEXT,
  ai_model VARCHAR(100),
  generation_metadata JSONB,
  
  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published', 'rejected', 'archived')),
  
  -- Approval
  approval_token VARCHAR(255) UNIQUE,
  approval_token_expires_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  revision_notes TEXT,
  
  -- Publishing
  published_at TIMESTAMP,
  published_to VARCHAR(50) CHECK (published_to IN ('wordpress', 'embed', 'custom')),
  external_post_id VARCHAR(255),
  external_url TEXT,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_post_id INTEGER REFERENCES blog_posts(id) ON DELETE SET NULL,
  
  -- Author
  author_id INTEGER REFERENCES users(id),
  author_name VARCHAR(255),
  
  -- Categories & Tags
  categories TEXT[],
  tags TEXT[],
  
  -- Analytics (cached from blog_analytics)
  view_count INTEGER DEFAULT 0,
  unique_views INTEGER DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0 CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
  conversion_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(client_id, slug)
);

-- Indexes for blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_client_id ON blog_posts(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_approval_token ON blog_posts(approval_token);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_parent_post ON blog_posts(parent_post_id);

-- =====================================================
-- Table 2: blog_analytics
-- Tracks detailed visitor analytics for each blog post
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_analytics (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Visitor Identification
  visitor_fingerprint VARCHAR(255),
  session_id VARCHAR(255),
  ip_address INET,
  country VARCHAR(100),
  city VARCHAR(100),
  
  -- Page Visit
  page_url TEXT,
  referrer_url TEXT,
  
  -- UTM Parameters
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  
  -- Engagement Metrics
  time_on_page INTEGER DEFAULT 0,
  scroll_depth INTEGER DEFAULT 0 CHECK (scroll_depth >= 0 AND scroll_depth <= 100),
  bounced BOOLEAN DEFAULT false,
  
  -- Device Information
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_resolution VARCHAR(50),
  
  -- Conversion Tracking
  converted BOOLEAN DEFAULT false,
  conversion_type VARCHAR(100),
  conversion_value DECIMAL(10,2),
  
  -- Timestamp
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for blog_analytics
CREATE INDEX IF NOT EXISTS idx_blog_analytics_post_id ON blog_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_client_id ON blog_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_viewed_at ON blog_analytics(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_visitor ON blog_analytics(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_session ON blog_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_utm_campaign ON blog_analytics(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_blog_analytics_converted ON blog_analytics(converted) WHERE converted = true;

-- =====================================================
-- Table 3: blog_approval_history
-- Audit trail for all approval/rejection actions
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_approval_history (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  approved_by INTEGER REFERENCES users(id),
  approver_email VARCHAR(255),
  approver_name VARCHAR(255),
  
  -- Action Details
  action VARCHAR(50) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes', 'submitted', 'published', 'unpublished')),
  feedback TEXT,
  
  -- Access Method
  access_method VARCHAR(50) CHECK (access_method IN ('secure_link', 'portal_login', 'api')),
  
  -- Audit Trail
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for blog_approval_history
CREATE INDEX IF NOT EXISTS idx_blog_approval_post_id ON blog_approval_history(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_approval_action ON blog_approval_history(action);
CREATE INDEX IF NOT EXISTS idx_blog_approval_created ON blog_approval_history(created_at DESC);

-- =====================================================
-- Table 4: blog_categories
-- Blog categories per client
-- =====================================================
CREATE TABLE IF NOT EXISTS blog_categories (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Category Details
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Hierarchy Support
  parent_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL,
  
  -- Metadata
  post_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(client_id, slug)
);

-- Indexes for blog_categories
CREATE INDEX IF NOT EXISTS idx_blog_categories_client_id ON blog_categories(client_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_parent ON blog_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_active ON blog_categories(is_active) WHERE is_active = true;

-- =====================================================
-- Function: Update blog_posts.updated_at on changes
-- =====================================================
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER trigger_update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- =====================================================
-- Function: Update blog category post counts
-- =====================================================
CREATE OR REPLACE FUNCTION update_blog_category_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update counts for all categories in the old and new category arrays
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.categories IS DISTINCT FROM NEW.categories) THEN
    -- Decrement old categories
    UPDATE blog_categories
    SET post_count = post_count - 1
    WHERE slug = ANY(OLD.categories) AND client_id = OLD.client_id;
  END IF;
  
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.categories IS DISTINCT FROM NEW.categories) THEN
    -- Increment new categories
    UPDATE blog_categories
    SET post_count = post_count + 1
    WHERE slug = ANY(NEW.categories) AND client_id = NEW.client_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for category count updates
DROP TRIGGER IF EXISTS trigger_update_blog_category_counts ON blog_posts;
CREATE TRIGGER trigger_update_blog_category_counts
  AFTER INSERT OR UPDATE OR DELETE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_category_counts();

-- =====================================================
-- Function: Update cached analytics in blog_posts
-- =====================================================
CREATE OR REPLACE FUNCTION update_blog_post_analytics_cache()
RETURNS void AS $$
BEGIN
  UPDATE blog_posts bp
  SET 
    view_count = COALESCE(stats.total_views, 0),
    unique_views = COALESCE(stats.unique_visitors, 0),
    avg_time_on_page = COALESCE(stats.avg_time, 0),
    bounce_rate = COALESCE(stats.bounce_pct, 0),
    conversion_count = COALESCE(stats.conversions, 0)
  FROM (
    SELECT 
      post_id,
      COUNT(*) as total_views,
      COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
      AVG(time_on_page)::INTEGER as avg_time,
      (COUNT(*) FILTER (WHERE bounced = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2) as bounce_pct,
      COUNT(*) FILTER (WHERE converted = true) as conversions
    FROM blog_analytics
    GROUP BY post_id
  ) stats
  WHERE bp.id = stats.post_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Seed Data: Default categories for new clients
-- =====================================================
-- Note: This will be called programmatically when a new client is created
-- Example categories: 'Healthcare', 'Technology', 'Marketing', 'News', 'Updates'

-- =====================================================
-- Permissions & Security
-- =====================================================
-- Grant access to application role (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blog_posts TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blog_analytics TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blog_approval_history TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blog_categories TO your_app_role;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Total Tables Created: 4
-- Total Indexes Created: 24
-- Total Functions Created: 3
-- Total Triggers Created: 2
-- 
-- Next Steps:
-- 1. Run this migration on dev database
-- 2. Test table creation
-- 3. Implement BlogService (backend/src/services/blogService.ts)
-- 4. Create API routes (backend/src/routes/blogs.ts)
-- 5. Build frontend components
-- =====================================================

