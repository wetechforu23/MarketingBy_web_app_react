-- WeTechForU Healthcare Marketing Platform Database Schema
-- Based on API_DATABASE_FLOW_DIAGRAM.md

-- Create database if not exists
-- CREATE DATABASE health_clinic_marketing;

-- Use the database
-- \c health_clinic_marketing;

-- Users table (updated to match master document)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Industry categories
CREATE TABLE IF NOT EXISTS industry_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Industry subcategories
CREATE TABLE IF NOT EXISTS industry_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES industry_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    industry_category_id INTEGER REFERENCES industry_categories(id),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    industry_category_id INTEGER REFERENCES industry_categories(id),
    industry_subcategory_id INTEGER REFERENCES industry_subcategories(id),
    source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'new',
    notes TEXT,
    website_url VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    compliance_status VARCHAR(50) DEFAULT 'pending',
    seo_analysis JSONB,
    seo_report TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO Audits table
CREATE TABLE IF NOT EXISTS seo_audits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    website_url VARCHAR(500) NOT NULL,
    audit_type VARCHAR(50) DEFAULT 'comprehensive',
    score INTEGER,
    technical_seo JSONB,
    content_analysis JSONB,
    performance_metrics JSONB,
    accessibility_metrics JSONB,
    recommendations JSONB,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Performance table
CREATE TABLE IF NOT EXISTS marketing_performance (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    communication_type VARCHAR(50),
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword Analyses table
CREATE TABLE IF NOT EXISTS keyword_analyses (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    search_volume INTEGER,
    competition_level VARCHAR(50),
    cpc DECIMAL(5,2),
    analysis_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competitor Analyses table
CREATE TABLE IF NOT EXISTS competitor_analyses (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_url VARCHAR(500),
    analysis_data JSONB,
    analysis_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keyword Recommendations table
CREATE TABLE IF NOT EXISTS keyword_recommendations (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    recommendation_type VARCHAR(100),
    priority VARCHAR(50),
    estimated_impact VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50),
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Features table
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plan Features table
CREATE TABLE IF NOT EXISTS plan_features (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE CASCADE,
    feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
    included BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Subscriptions table
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature Usage table
CREATE TABLE IF NOT EXISTS feature_usage (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Google Ads table
CREATE TABLE IF NOT EXISTS client_google_ads (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    account_id VARCHAR(255),
    refresh_token TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Tracking table
CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    email_id VARCHAR(255),
    recipient_email VARCHAR(255),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content Approvals table
CREATE TABLE IF NOT EXISTS content_approvals (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    content_type VARCHAR(100),
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Usage Tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    api_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    request_count INTEGER DEFAULT 1,
    cost DECIMAL(10,4) DEFAULT 0,
    usage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search Keywords table (from master document)
CREATE TABLE IF NOT EXISTS search_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES industry_categories(id),
    subcategory_id INTEGER REFERENCES industry_subcategories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI SEO Content table (from master document)
CREATE TABLE IF NOT EXISTS ai_seo_content (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(500),
    description TEXT,
    content TEXT,
    faq_section TEXT,
    conversational_answers JSONB,
    semantic_keywords JSONB,
    entity_mentions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO Audit Tasks table (from master document)
CREATE TABLE IF NOT EXISTS seo_audit_tasks (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    task_category VARCHAR(100),
    task_priority VARCHAR(50),
    task_title VARCHAR(255),
    task_description TEXT,
    task_status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255),
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Encrypted Credentials table (from master document)
CREATE TABLE IF NOT EXISTS encrypted_credentials (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    credential_type VARCHAR(100) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_key_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Credential Access Logs table (from master document)
CREATE TABLE IF NOT EXISTS credential_access_logs (
    id SERIAL PRIMARY KEY,
    credential_id INTEGER REFERENCES encrypted_credentials(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    access_type VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Insert default data
INSERT INTO industry_categories (name, description) VALUES 
('Healthcare', 'Medical and healthcare services'),
('Dental', 'Dental care and oral health services'),
('Mental Health', 'Mental health and counseling services'),
('Fitness', 'Fitness and wellness services'),
('Beauty', 'Beauty and cosmetic services')
ON CONFLICT DO NOTHING;

INSERT INTO industry_subcategories (category_id, name, description) VALUES 
(1, 'Primary Care', 'General medical care'),
(1, 'Specialist Care', 'Specialized medical services'),
(1, 'Urgent Care', 'Emergency medical services'),
(2, 'General Dentistry', 'General dental care'),
(2, 'Orthodontics', 'Orthodontic services'),
(3, 'Counseling', 'Mental health counseling'),
(3, 'Therapy', 'Therapeutic services')
ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (name, description, price, billing_cycle, features) VALUES 
('Basic', 'Basic marketing features', 99.00, 'monthly', '{"leads": 100, "seo_audits": 5, "email_campaigns": 10}'),
('Professional', 'Professional marketing suite', 299.00, 'monthly', '{"leads": 500, "seo_audits": 25, "email_campaigns": 50}'),
('Enterprise', 'Full enterprise solution', 999.00, 'monthly', '{"leads": 2000, "seo_audits": 100, "email_campaigns": 200}')
ON CONFLICT DO NOTHING;

INSERT INTO platform_settings (setting_key, setting_value, description) VALUES 
('enable_compliance_checks', 'true', 'Enable compliance checking for lead scraping'),
('enable_free_seo_analysis', 'true', 'Enable free SEO analysis features'),
('enable_email_sender', 'false', 'Enable email sending functionality'),
('default_seo_mode', '"comprehensive"', 'Default SEO analysis mode'),
('max_leads_per_scrape', '10', 'Maximum leads to scrape per request')
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for performance (from master document)
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry_category_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_client ON seo_audits(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_client ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_keyword_analyses_client ON keyword_analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_date ON campaigns(status, start_date);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON client_subscriptions(status, end_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_client_date ON api_usage(client_id, usage_date);

-- AI SEO Content indexes (from master document)
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_lead_id ON ai_seo_content(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_title ON ai_seo_content USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_description ON ai_seo_content USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_semantic_keywords ON ai_seo_content USING gin(semantic_keywords);
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_entity_mentions ON ai_seo_content USING gin(entity_mentions);

-- SEO Audit Tasks indexes (from master document)
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_lead_id ON seo_audit_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_category ON seo_audit_tasks(task_category);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_priority ON seo_audit_tasks(task_priority);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_status ON seo_audit_tasks(task_status);

-- Credential Management indexes (from master document)
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_service ON encrypted_credentials(service_name);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_environment ON encrypted_credentials(environment);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_active ON encrypted_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_credential ON credential_access_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_user ON credential_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_access_logs_date ON credential_access_logs(accessed_at);

-- Composite indexes (from master document)
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_lead_status ON seo_audit_tasks(lead_id, task_status);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_service_env ON encrypted_credentials(service_name, environment);