-- Enhanced Subscription and Agreement Tracking Schema
-- Date: 2025-10-09
-- Description: Schema for tracking customer subscriptions, onboarding, and legal agreements

-- Subscription Plans table (enhanced with Stripe metadata)
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS setup_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS setup_fee_discount_percent INTEGER DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'healthcare_marketing';

-- Customer Subscriptions table (enhanced)
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS setup_fee_amount DECIMAL(10,2);
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2);
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_start DATE;
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle_end DATE;
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS cancellation_date TIMESTAMP;
ALTER TABLE client_subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Customer Onboarding table
CREATE TABLE IF NOT EXISTS customer_onboarding (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    
    -- Contact Information
    primary_contact_name VARCHAR(255),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    
    -- Business Details
    business_name VARCHAR(255) NOT NULL,
    business_address TEXT,
    business_phone VARCHAR(20),
    business_hours TEXT,
    services_offered TEXT,
    logo_url VARCHAR(500),
    brand_colors JSONB,
    
    -- Access & Credentials (references to encrypted_credentials)
    website_access_provided BOOLEAN DEFAULT false,
    facebook_page_access_provided BOOLEAN DEFAULT false,
    facebook_ad_account_access_provided BOOLEAN DEFAULT false,
    instagram_access_provided BOOLEAN DEFAULT false,
    google_business_access_provided BOOLEAN DEFAULT false,
    google_ads_access_provided BOOLEAN DEFAULT false,
    google_analytics_access_provided BOOLEAN DEFAULT false,
    
    -- Billing Information
    ad_spend_budget_google DECIMAL(10,2),
    ad_spend_budget_facebook DECIMAL(10,2),
    billing_method_setup_google BOOLEAN DEFAULT false,
    billing_method_setup_facebook BOOLEAN DEFAULT false,
    
    -- Onboarding Status
    onboarding_status VARCHAR(50) DEFAULT 'pending',
    onboarding_started_at TIMESTAMP,
    onboarding_completed_at TIMESTAMP,
    
    -- Preferences
    content_approval_required BOOLEAN DEFAULT true,
    blog_topic_preferences TEXT,
    target_audience TEXT,
    competitor_websites TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_client_subscription UNIQUE (client_id, subscription_id)
);

-- Customer Agreements table
CREATE TABLE IF NOT EXISTS customer_agreements (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    
    -- Agreement Details
    agreement_type VARCHAR(100) NOT NULL, -- 'service_agreement', 'terms_of_service', 'privacy_policy', etc.
    agreement_version VARCHAR(50) NOT NULL,
    agreement_content TEXT NOT NULL, -- Full text of the agreement
    agreement_url VARCHAR(500), -- Link to PDF/document
    
    -- Signature & Consent
    signed_by_name VARCHAR(255),
    signed_by_email VARCHAR(255),
    signed_by_ip VARCHAR(45),
    signed_at TIMESTAMP NOT NULL,
    signature_data TEXT, -- Digital signature if applicable
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'terminated', 'disputed'
    effective_date DATE NOT NULL,
    expiration_date DATE,
    
    -- Dispute Tracking
    dispute_opened_at TIMESTAMP,
    dispute_reason TEXT,
    dispute_resolution TEXT,
    dispute_resolved_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Services table (tracks what services are included)
CREATE TABLE IF NOT EXISTS subscription_services (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    
    -- Service Details
    service_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100), -- 'social_media', 'seo', 'paid_ads', 'content'
    service_description TEXT,
    
    -- Service Status
    is_active BOOLEAN DEFAULT true,
    activation_date DATE,
    deactivation_date DATE,
    
    -- Service Metrics
    monthly_quota INTEGER, -- e.g., 8 posts per month
    quota_used INTEGER DEFAULT 0,
    last_service_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Access Logs (enhanced from credential_access_logs)
CREATE TABLE IF NOT EXISTS customer_platform_access (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    onboarding_id INTEGER REFERENCES customer_onboarding(id) ON DELETE CASCADE,
    
    -- Platform Details
    platform_name VARCHAR(100) NOT NULL, -- 'Facebook', 'Google Ads', 'Website', etc.
    platform_account_id VARCHAR(255),
    access_level VARCHAR(100), -- 'admin', 'manager', 'viewer'
    
    -- Access Grant Details
    granted_by_name VARCHAR(255),
    granted_by_email VARCHAR(255),
    granted_at TIMESTAMP NOT NULL,
    
    -- Access Revocation
    revoked_at TIMESTAMP,
    revoked_by_name VARCHAR(255),
    revocation_reason TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Setup Tasks Checklist
CREATE TABLE IF NOT EXISTS setup_tasks (
    id SERIAL PRIMARY KEY,
    onboarding_id INTEGER REFERENCES customer_onboarding(id) ON DELETE CASCADE,
    
    -- Task Details
    task_name VARCHAR(255) NOT NULL,
    task_category VARCHAR(100), -- 'setup', 'access', 'configuration', 'review'
    task_description TEXT,
    task_order INTEGER DEFAULT 0,
    
    -- Task Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
    assigned_to VARCHAR(255),
    
    -- Task Completion
    completed_at TIMESTAMP,
    completed_by VARCHAR(255),
    completion_notes TEXT,
    
    -- Dependencies
    depends_on_task_id INTEGER REFERENCES setup_tasks(id),
    
    -- Due Date
    due_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment History
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    subscription_id INTEGER REFERENCES client_subscriptions(id) ON DELETE CASCADE,
    
    -- Payment Details
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    payment_type VARCHAR(50), -- 'setup_fee', 'monthly_subscription', 'ad_spend', 'refund'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded', 'disputed'
    payment_method VARCHAR(100),
    
    -- Timestamps
    payment_date TIMESTAMP NOT NULL,
    refund_date TIMESTAMP,
    dispute_date TIMESTAMP,
    
    -- Notes
    description TEXT,
    receipt_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dispute Evidence (for chargeback protection)
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payment_history(id) ON DELETE CASCADE,
    agreement_id INTEGER REFERENCES customer_agreements(id),
    
    -- Dispute Details
    dispute_id VARCHAR(255), -- Stripe dispute ID
    dispute_reason VARCHAR(255),
    dispute_amount DECIMAL(10,2),
    dispute_date TIMESTAMP NOT NULL,
    
    -- Evidence
    service_delivery_proof TEXT,
    customer_communication_log TEXT,
    signed_agreement_reference TEXT,
    platform_access_logs TEXT,
    work_completed_proof TEXT,
    
    -- Evidence Files (URLs or references)
    evidence_files JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'won', 'lost', 'withdrawn'
    resolution_date TIMESTAMP,
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_client ON customer_onboarding(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_subscription ON customer_onboarding(subscription_id);
CREATE INDEX IF NOT EXISTS idx_customer_onboarding_status ON customer_onboarding(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_customer_agreements_client ON customer_agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_agreements_subscription ON customer_agreements(subscription_id);
CREATE INDEX IF NOT EXISTS idx_customer_agreements_status ON customer_agreements(status);
CREATE INDEX IF NOT EXISTS idx_customer_agreements_signed_at ON customer_agreements(signed_at);

CREATE INDEX IF NOT EXISTS idx_subscription_services_subscription ON subscription_services(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_services_active ON subscription_services(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_platform_access_client ON customer_platform_access(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_platform_access_active ON customer_platform_access(is_active);

CREATE INDEX IF NOT EXISTS idx_setup_tasks_onboarding ON setup_tasks(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_setup_tasks_status ON setup_tasks(status);

CREATE INDEX IF NOT EXISTS idx_payment_history_client ON payment_history(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(payment_date);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_payment ON dispute_evidence(payment_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_status ON dispute_evidence(status);

-- Insert sample subscription plans for healthcare marketing
INSERT INTO subscription_plans (
    name, description, price, billing_cycle, 
    setup_fee, setup_fee_discount_percent, category, stripe_product_id, is_active
) VALUES 
(
    'Basic Healthcare Marketing',
    'Essential marketing services for small healthcare practices',
    399.00,
    'monthly',
    300.00,
    50,
    'healthcare_marketing',
    NULL,
    true
),
(
    'Professional Healthcare Marketing',
    'Comprehensive marketing for growing practices',
    799.00,
    'monthly',
    300.00,
    50,
    'healthcare_marketing',
    NULL,
    true
),
(
    'Enterprise Healthcare Marketing',
    'Full-service marketing for multi-location practices',
    1499.00,
    'monthly',
    300.00,
    50,
    'healthcare_marketing',
    NULL,
    true
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    setup_fee = EXCLUDED.setup_fee,
    setup_fee_discount_percent = EXCLUDED.setup_fee_discount_percent,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active;

-- Create default setup tasks template
CREATE TABLE IF NOT EXISTS setup_tasks_template (
    id SERIAL PRIMARY KEY,
    task_name VARCHAR(255) NOT NULL,
    task_category VARCHAR(100),
    task_description TEXT,
    task_order INTEGER DEFAULT 0,
    required_for_plan VARCHAR(100), -- 'all', 'basic', 'professional', 'enterprise'
    estimated_hours DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default setup tasks
INSERT INTO setup_tasks_template (task_name, task_category, task_description, task_order, required_for_plan, estimated_hours) VALUES
('Google Business Profile Setup', 'setup', 'Create and optimize Google Business Profile', 1, 'all', 1.0),
('Facebook Business Manager Integration', 'setup', 'Setup Facebook Business Manager and connect Instagram', 2, 'all', 1.0),
('Google Ads Account Setup', 'setup', 'Create Google Ads account with billing and conversion tracking', 3, 'all', 1.5),
('Facebook Pixel Setup', 'setup', 'Install and configure Facebook Pixel on website', 4, 'all', 1.0),
('Google Analytics Configuration', 'setup', 'Setup Google Analytics 4 and Search Console', 5, 'all', 1.0),
('Sitemap Generation', 'setup', 'Generate and submit XML sitemap', 6, 'all', 0.5),
('Keyword Research', 'setup', 'Conduct keyword research and competitor audit', 7, 'all', 2.0),
('Professional Page Design', 'setup', 'Design cover photos and profile setup', 8, 'all', 1.5),
('Website Access Verification', 'access', 'Verify website backend access for pixel and SEO setup', 9, 'all', 0.5),
('Social Media Access Verification', 'access', 'Verify Facebook Page and Ad Account access', 10, 'all', 0.5),
('Google Ads Access Verification', 'access', 'Verify Google Ads and Google Business Profile access', 11, 'all', 0.5),
('Initial Content Approval', 'review', 'Get client approval for first month content calendar', 12, 'all', 1.0)
ON CONFLICT DO NOTHING;

