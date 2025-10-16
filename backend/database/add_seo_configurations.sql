-- Create seo_configurations table for clinic-specific SEO targets
CREATE TABLE IF NOT EXISTS seo_configurations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    configuration_name VARCHAR(255) NOT NULL DEFAULT 'Default SEO Configuration',
    
    -- Title Tag Configuration
    title_min_length INTEGER DEFAULT 30,
    title_max_length INTEGER DEFAULT 60,
    title_require_keyword BOOLEAN DEFAULT true,
    title_require_brand BOOLEAN DEFAULT true,
    
    -- H1 Configuration
    h1_require_keyword BOOLEAN DEFAULT true,
    h1_max_count INTEGER DEFAULT 1,
    h1_min_length INTEGER DEFAULT 10,
    h1_max_length INTEGER DEFAULT 70,
    
    -- Meta Description Configuration
    meta_desc_min_length INTEGER DEFAULT 120,
    meta_desc_max_length INTEGER DEFAULT 160,
    meta_desc_require_keyword BOOLEAN DEFAULT true,
    
    -- URL Configuration
    url_max_length INTEGER DEFAULT 75,
    url_require_keyword BOOLEAN DEFAULT true,
    url_avoid_stop_words BOOLEAN DEFAULT true,
    url_require_lowercase BOOLEAN DEFAULT true,
    
    -- Content Configuration
    content_min_words INTEGER DEFAULT 600,
    keyword_density_min DECIMAL(3,2) DEFAULT 0.50,
    keyword_density_max DECIMAL(3,2) DEFAULT 2.00,
    content_require_subheadings BOOLEAN DEFAULT true,
    content_min_subheadings INTEGER DEFAULT 2,
    
    -- Internal Linking Configuration
    internal_links_min INTEGER DEFAULT 2,
    internal_links_max INTEGER DEFAULT 10,
    
    -- Visual Content Configuration
    images_min_count INTEGER DEFAULT 1,
    images_require_alt BOOLEAN DEFAULT true,
    images_require_optimization BOOLEAN DEFAULT true,
    
    -- Schema Markup Configuration
    schema_require_organization BOOLEAN DEFAULT true,
    schema_require_website BOOLEAN DEFAULT true,
    schema_require_breadcrumb BOOLEAN DEFAULT true,
    schema_require_article BOOLEAN DEFAULT false,
    schema_require_local_business BOOLEAN DEFAULT false,
    
    -- Technical SEO Configuration
    page_speed_lcp_max DECIMAL(5,2) DEFAULT 2.50,
    page_speed_cls_max DECIMAL(3,2) DEFAULT 0.10,
    page_speed_fid_max DECIMAL(6,2) DEFAULT 100.00,
    mobile_friendly_required BOOLEAN DEFAULT true,
    ssl_required BOOLEAN DEFAULT true,
    
    -- Indexing Configuration
    indexing_required BOOLEAN DEFAULT true,
    sitemap_required BOOLEAN DEFAULT true,
    robots_txt_required BOOLEAN DEFAULT true,
    
    -- Advanced Configuration
    gtm_required BOOLEAN DEFAULT true,
    ga4_required BOOLEAN DEFAULT true,
    gsc_required BOOLEAN DEFAULT true,
    social_meta_required BOOLEAN DEFAULT true,
    canonical_required BOOLEAN DEFAULT true,
    
    -- Custom Configuration
    custom_rules JSONB DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE(client_id, configuration_name)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seo_configurations_client_id ON seo_configurations (client_id);
CREATE INDEX IF NOT EXISTS idx_seo_configurations_active ON seo_configurations (is_active);
CREATE INDEX IF NOT EXISTS idx_seo_configurations_created_at ON seo_configurations (created_at);

-- Add comments for documentation
COMMENT ON TABLE seo_configurations IS 'Stores SEO configuration targets and rules for each client/clinic';
COMMENT ON COLUMN seo_configurations.title_min_length IS 'Minimum length for title tags (industry standard: 30-60 chars)';
COMMENT ON COLUMN seo_configurations.title_max_length IS 'Maximum length for title tags (industry standard: 30-60 chars)';
COMMENT ON COLUMN seo_configurations.meta_desc_min_length IS 'Minimum length for meta descriptions (industry standard: 120-160 chars)';
COMMENT ON COLUMN seo_configurations.meta_desc_max_length IS 'Maximum length for meta descriptions (industry standard: 120-160 chars)';
COMMENT ON COLUMN seo_configurations.content_min_words IS 'Minimum word count for content (industry standard: 600+ words)';
COMMENT ON COLUMN seo_configurations.keyword_density_min IS 'Minimum keyword density percentage (industry standard: 0.5-2%)';
COMMENT ON COLUMN seo_configurations.keyword_density_max IS 'Maximum keyword density percentage (industry standard: 0.5-2%)';
COMMENT ON COLUMN seo_configurations.page_speed_lcp_max IS 'Maximum Largest Contentful Paint in seconds (industry standard: <2.5s)';
COMMENT ON COLUMN seo_configurations.page_speed_cls_max IS 'Maximum Cumulative Layout Shift (industry standard: <0.1)';
COMMENT ON COLUMN seo_configurations.page_speed_fid_max IS 'Maximum First Input Delay in milliseconds (industry standard: <100ms)';

-- Insert default configuration for existing clients
INSERT INTO seo_configurations (client_id, configuration_name, created_by)
SELECT 
    id as client_id,
    'Default SEO Configuration' as configuration_name,
    1 as created_by
FROM clients 
WHERE id NOT IN (SELECT client_id FROM seo_configurations);

-- Create seo_page_audits table to store per-page audit results
CREATE TABLE IF NOT EXISTS seo_page_audits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    page_url VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    
    -- Audit Results
    audit_data JSONB NOT NULL DEFAULT '{}',
    overall_score INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    passed_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    warning_checks INTEGER DEFAULT 0,
    
    -- Audit Metadata
    last_audited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audit_duration_ms INTEGER,
    audit_source VARCHAR(50) DEFAULT 'system', -- 'system', 'manual', 'api'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, page_url)
);

-- Add indexes for seo_page_audits
CREATE INDEX IF NOT EXISTS idx_seo_page_audits_client_id ON seo_page_audits (client_id);
CREATE INDEX IF NOT EXISTS idx_seo_page_audits_page_url ON seo_page_audits (page_url);
CREATE INDEX IF NOT EXISTS idx_seo_page_audits_last_audited ON seo_page_audits (last_audited_at);
CREATE INDEX IF NOT EXISTS idx_seo_page_audits_score ON seo_page_audits (overall_score);

COMMENT ON TABLE seo_page_audits IS 'Stores SEO audit results for each page of each client';
COMMENT ON COLUMN seo_page_audits.audit_data IS 'JSON object containing detailed audit results for each SEO factor';
COMMENT ON COLUMN seo_page_audits.overall_score IS 'Overall SEO score (0-100)';
COMMENT ON COLUMN seo_page_audits.total_checks IS 'Total number of SEO checks performed';
COMMENT ON COLUMN seo_page_audits.passed_checks IS 'Number of checks that passed';
COMMENT ON COLUMN seo_page_audits.failed_checks IS 'Number of checks that failed';
COMMENT ON COLUMN seo_page_audits.warning_checks IS 'Number of checks that generated warnings';
