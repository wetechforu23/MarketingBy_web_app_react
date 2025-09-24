-- ================================================================
-- MARKETING PLATFORM EXTENSIONS
-- Complete database schema for all marketing features
-- ================================================================

-- Social media platforms configuration
CREATE TABLE IF NOT EXISTS social_platforms (
    id SERIAL PRIMARY KEY,
    platform_name VARCHAR(50) UNIQUE NOT NULL, -- facebook, instagram, linkedin, twitter
    display_name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(200),
    icon_class VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_hour INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client social media accounts
CREATE TABLE IF NOT EXISTS client_social_accounts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES social_platforms(id) ON DELETE CASCADE,
    account_name VARCHAR(100),
    account_id VARCHAR(100), -- Platform-specific account ID
    access_token TEXT, -- Encrypted access token
    refresh_token TEXT, -- Encrypted refresh token
    token_expires_at TIMESTAMP,
    account_status VARCHAR(50) DEFAULT 'active', -- active, expired, revoked, error
    last_sync TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, platform_id)
);

-- Social media posts (content management)
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES social_platforms(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    post_type VARCHAR(50) NOT NULL, -- text, image, video, carousel, story
    title VARCHAR(200),
    content TEXT NOT NULL,
    image_urls TEXT, -- JSON array of image URLs
    video_url VARCHAR(500),
    hashtags TEXT, -- JSON array of hashtags
    target_audience TEXT, -- JSON object of targeting parameters
    scheduled_date TIMESTAMP,
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, posted, failed
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    posted_at TIMESTAMP,
    platform_post_id VARCHAR(100), -- ID from social platform
    engagement_metrics TEXT, -- JSON object of likes, shares, comments, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google Ads campaigns and management
CREATE TABLE IF NOT EXISTS google_ads_campaigns (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    google_campaign_id VARCHAR(100), -- Google Ads campaign ID
    campaign_name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- search, display, shopping, video, discovery
    campaign_status VARCHAR(50) DEFAULT 'paused', -- enabled, paused, removed
    budget_amount DECIMAL(10,2),
    budget_type VARCHAR(20) DEFAULT 'daily', -- daily, monthly
    target_keywords TEXT, -- JSON array of keywords
    ad_groups TEXT, -- JSON array of ad group data
    targeting_settings TEXT, -- JSON object of location, demographics, etc.
    bid_strategy VARCHAR(50) DEFAULT 'manual_cpc',
    start_date DATE,
    end_date DATE,
    performance_data TEXT, -- JSON object of performance metrics
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) UNIQUE NOT NULL,
    plan_description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features TEXT, -- JSON array of included features
    max_clients INTEGER,
    max_campaigns INTEGER,
    max_social_posts INTEGER,
    stripe_price_id VARCHAR(100), -- Stripe price ID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client subscriptions
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(100) UNIQUE,
    stripe_customer_id VARCHAR(100),
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, past_due, canceled, unpaid
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    next_billing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES client_subscriptions(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    stripe_charge_id VARCHAR(100),
    transaction_type VARCHAR(50) NOT NULL, -- subscription, one_time, refund
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- succeeded, pending, failed, canceled, refunded
    payment_method VARCHAR(50), -- card, bank_transfer, etc.
    failure_reason TEXT,
    receipt_url VARCHAR(500),
    description TEXT,
    metadata TEXT, -- JSON object for additional data
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert social media platforms
INSERT INTO social_platforms (platform_name, display_name, api_endpoint, icon_class) VALUES
('facebook', 'Facebook', 'https://graph.facebook.com/v18.0', 'fab fa-facebook'),
('instagram', 'Instagram', 'https://graph.facebook.com/v18.0', 'fab fa-instagram'),
('linkedin', 'LinkedIn', 'https://api.linkedin.com/v2', 'fab fa-linkedin'),
('twitter', 'Twitter/X', 'https://api.twitter.com/2', 'fab fa-twitter'),
('youtube', 'YouTube', 'https://www.googleapis.com/youtube/v3', 'fab fa-youtube')
ON CONFLICT (platform_name) DO NOTHING;

-- ================================================================
-- LEAD TRACKING & ROI SYSTEM
-- ================================================================

-- Generated leads from marketing campaigns
CREATE TABLE IF NOT EXISTS generated_leads (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL, -- facebook, google_ads, instagram, linkedin
    campaign_name VARCHAR(200),
    lead_source VARCHAR(100), -- ad_click, form_submission, phone_call, website_visit
    lead_type VARCHAR(50) DEFAULT 'inquiry', -- inquiry, appointment, consultation, download
    
    -- Lead contact information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(120),
    phone VARCHAR(20),
    message TEXT,
    
    -- Lead details
    service_interest VARCHAR(200), -- What service they're interested in
    urgency_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    budget_range VARCHAR(50), -- Under $1K, $1K-5K, $5K-10K, $10K+
    preferred_contact VARCHAR(20) DEFAULT 'email', -- email, phone, text
    best_time_to_contact VARCHAR(50), -- morning, afternoon, evening, anytime
    
    -- Marketing attribution
    ad_id VARCHAR(100), -- Platform-specific ad ID
    campaign_cost_per_lead DECIMAL(10,2), -- Cost to acquire this lead
    lead_value_estimate DECIMAL(10,2), -- Estimated value of this lead
    conversion_probability INTEGER DEFAULT 50, -- 1-100 likelihood to convert
    
    -- Lead status and tracking
    lead_status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, converted, closed
    assigned_to INTEGER REFERENCES users(id), -- Staff member assigned
    follow_up_date DATE,
    notes TEXT,
    
    -- Form submission data
    form_url VARCHAR(500), -- URL where form was submitted
    form_data TEXT, -- JSON of all form fields submitted
    user_agent TEXT, -- Browser/device information
    ip_address INET, -- IP address for geo-tracking
    referrer_url VARCHAR(500), -- Where they came from
    
    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_contact_at TIMESTAMP,
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing spend tracking (detailed budget allocation)
CREATE TABLE IF NOT EXISTS marketing_spend (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL, -- facebook, google_ads, instagram, etc.
    spend_type VARCHAR(50) NOT NULL, -- ad_spend, boost_post, promoted_content
    
    -- Budget details
    amount_spent DECIMAL(10,2) NOT NULL,
    budget_allocated DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    
    -- Campaign details
    campaign_objective VARCHAR(100), -- lead_generation, brand_awareness, website_traffic
    target_audience TEXT, -- JSON object of targeting parameters
    ad_creative_type VARCHAR(50), -- image, video, carousel, text
    
    -- Performance metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    cost_per_click DECIMAL(10,4),
    cost_per_lead DECIMAL(10,2),
    conversion_rate DECIMAL(5,2), -- Percentage
    
    -- ROI calculation
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    roi_percentage DECIMAL(8,2), -- Return on investment
    
    date_tracked DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, platform, date_tracked, spend_type)
);

-- Lead forms (trackable forms for lead capture)
CREATE TABLE IF NOT EXISTS lead_forms (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    form_name VARCHAR(200) NOT NULL,
    form_type VARCHAR(50) NOT NULL, -- contact, appointment, consultation, download, quote
    
    -- Form configuration
    form_fields TEXT NOT NULL, -- JSON array of form field definitions
    success_message TEXT,
    redirect_url VARCHAR(500),
    notification_emails TEXT, -- JSON array of emails to notify
    
    -- Form settings
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    auto_respond BOOLEAN DEFAULT true,
    
    -- Tracking
    embed_code TEXT, -- HTML embed code for websites
    form_url VARCHAR(500), -- Direct URL to form
    total_submissions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign ROI tracking (aggregated performance)
CREATE TABLE IF NOT EXISTS campaign_roi (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Investment
    total_spend DECIMAL(10,2) NOT NULL,
    platform_breakdown TEXT, -- JSON object of spend by platform
    
    -- Results
    total_leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    converted_leads INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metrics
    cost_per_lead DECIMAL(10,2),
    cost_per_conversion DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    roi_percentage DECIMAL(8,2),
    
    -- Lead quality scoring
    avg_lead_score INTEGER DEFAULT 50, -- 1-100
    lead_sources TEXT, -- JSON breakdown of where leads came from
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(client_id, campaign_id, period_start, period_end)
);

-- ================================================================
-- INDEXES FOR LEAD TRACKING PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_generated_leads_client ON generated_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_leads_platform ON generated_leads(platform);
CREATE INDEX IF NOT EXISTS idx_generated_leads_status ON generated_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_generated_leads_submitted ON generated_leads(submitted_at);
CREATE INDEX IF NOT EXISTS idx_generated_leads_campaign ON generated_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_marketing_spend_client ON marketing_spend(client_id);
CREATE INDEX IF NOT EXISTS idx_marketing_spend_platform ON marketing_spend(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_spend_date ON marketing_spend(date_tracked);

CREATE INDEX IF NOT EXISTS idx_lead_forms_client ON lead_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_active ON lead_forms(is_active);

CREATE INDEX IF NOT EXISTS idx_campaign_roi_client ON campaign_roi(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_roi_period ON campaign_roi(period_start, period_end);

-- ================================================================
-- SAMPLE DATA FOR TESTING
-- ================================================================

-- Insert subscription plans
INSERT INTO subscription_plans (plan_name, plan_description, price_monthly, price_yearly, features, max_clients, max_campaigns, max_social_posts) VALUES
('Starter', 'Perfect for small practices and solo practitioners', 99.00, 990.00, 
 '["SEO Monitoring", "Social Media Management", "Basic Reporting", "Email Support"]', 1, 5, 20),
('Professional', 'Ideal for growing practices and small clinics', 299.00, 2990.00,
 '["Advanced SEO", "Multi-Platform Social Media", "Google Ads Management", "Advanced Reporting", "Phone Support"]', 3, 15, 60),
('Enterprise', 'Comprehensive solution for large practices and medical groups', 599.00, 5990.00,
 '["Enterprise SEO", "Full Marketing Automation", "Custom Integrations", "White-Label Reports", "Dedicated Support"]', 10, 50, 200)
ON CONFLICT (plan_name) DO NOTHING;

-- ================================================================
-- STORED PROCEDURES FOR ROI TRACKING
-- ================================================================

-- Function to calculate campaign ROI
CREATE OR REPLACE FUNCTION calculate_campaign_roi(
    p_client_id INTEGER,
    p_campaign_id INTEGER,
    p_period_start DATE,
    p_period_end DATE
) RETURNS TABLE(
    total_spend DECIMAL(10,2),
    total_leads INTEGER,
    qualified_leads INTEGER,
    converted_leads INTEGER,
    total_revenue DECIMAL(10,2),
    roi_percentage DECIMAL(8,2),
    cost_per_lead DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH spend_data AS (
        SELECT COALESCE(SUM(amount_spent), 0) as spend
        FROM marketing_spend ms
        WHERE ms.client_id = p_client_id 
        AND (p_campaign_id IS NULL OR ms.campaign_id = p_campaign_id)
        AND ms.date_tracked BETWEEN p_period_start AND p_period_end
    ),
    lead_data AS (
        SELECT 
            COUNT(*) as total_leads,
            COUNT(CASE WHEN lead_status IN ('qualified', 'converted') THEN 1 END) as qualified_leads,
            COUNT(CASE WHEN lead_status = 'converted' THEN 1 END) as converted_leads,
            COALESCE(SUM(lead_value_estimate), 0) as revenue
        FROM generated_leads gl
        WHERE gl.client_id = p_client_id
        AND (p_campaign_id IS NULL OR gl.campaign_id = p_campaign_id)
        AND gl.submitted_at BETWEEN p_period_start AND p_period_end
    )
    SELECT 
        sd.spend as total_spend,
        ld.total_leads::INTEGER,
        ld.qualified_leads::INTEGER,
        ld.converted_leads::INTEGER,
        ld.revenue as total_revenue,
        CASE 
            WHEN sd.spend > 0 THEN ((ld.revenue - sd.spend) / sd.spend * 100)
            ELSE 0 
        END as roi_percentage,
        CASE 
            WHEN ld.total_leads > 0 THEN (sd.spend / ld.total_leads)
            ELSE 0 
        END as cost_per_lead
    FROM spend_data sd, lead_data ld;
END;
$$ LANGUAGE plpgsql;

-- Function to get client lead dashboard
CREATE OR REPLACE FUNCTION get_client_lead_dashboard(p_client_id INTEGER, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    platform VARCHAR(50),
    total_spend DECIMAL(10,2),
    total_leads INTEGER,
    cost_per_lead DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    revenue_generated DECIMAL(10,2),
    roi_percentage DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ms.platform,
        COALESCE(SUM(ms.amount_spent), 0) as total_spend,
        COUNT(gl.id)::INTEGER as total_leads,
        CASE 
            WHEN COUNT(gl.id) > 0 THEN (COALESCE(SUM(ms.amount_spent), 0) / COUNT(gl.id))
            ELSE 0 
        END as cost_per_lead,
        CASE 
            WHEN COUNT(gl.id) > 0 THEN (COUNT(CASE WHEN gl.lead_status = 'converted' THEN 1 END) * 100.0 / COUNT(gl.id))
            ELSE 0 
        END as conversion_rate,
        COALESCE(SUM(gl.lead_value_estimate), 0) as revenue_generated,
        CASE 
            WHEN COALESCE(SUM(ms.amount_spent), 0) > 0 THEN 
                ((COALESCE(SUM(gl.lead_value_estimate), 0) - COALESCE(SUM(ms.amount_spent), 0)) / COALESCE(SUM(ms.amount_spent), 0) * 100)
            ELSE 0 
        END as roi_percentage
    FROM marketing_spend ms
    LEFT JOIN generated_leads gl ON ms.client_id = gl.client_id 
        AND ms.platform = gl.platform 
        AND gl.submitted_at >= ms.date_tracked 
        AND gl.submitted_at < ms.date_tracked + INTERVAL '1 day'
    WHERE ms.client_id = p_client_id
    AND ms.date_tracked >= CURRENT_DATE - INTERVAL '%s days' % p_days
    GROUP BY ms.platform
    ORDER BY total_spend DESC;
END;
$$ LANGUAGE plpgsql;
