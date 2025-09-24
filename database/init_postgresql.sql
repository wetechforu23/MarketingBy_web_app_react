-- Health Clinic Marketing Automation Database Schema
-- Create database and tables for comprehensive client management

-- Create database (run this separately if needed)
-- CREATE DATABASE health_clinic_marketing;

-- Use the database
-- \c health_clinic_marketing;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies/Agencies table (your business)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    website VARCHAR(200),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads table (prospects before they become clients)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    clinic_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(120),
    phone VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    specialties TEXT,
    lead_source VARCHAR(50) DEFAULT 'scraping', -- scraping, referral, facebook, google, website
    lead_status VARCHAR(50) DEFAULT 'new', -- new, contacted, interested, qualified, converted, lost
    rating DECIMAL(2,1),
    review_count INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    scraped_data JSONB, -- Store all scraped information
    notes TEXT,
    last_contacted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table (converted leads)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id), -- Reference to original lead
    clinic_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    specialties TEXT,
    client_status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended, cancelled
    monthly_retainer DECIMAL(10,2),
    contract_start_date DATE,
    contract_end_date DATE,
    billing_contact_name VARCHAR(100),
    billing_email VARCHAR(120),
    billing_address TEXT,
    tax_id VARCHAR(50),
    credentials JSONB, -- Store API keys, passwords, etc. (encrypted)
    preferences JSONB, -- Client preferences and settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEO Audits table
CREATE TABLE seo_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id), -- For prospects
    url VARCHAR(500) NOT NULL,
    audit_type VARCHAR(50) DEFAULT 'full', -- full, quick, technical, local
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    technical_score INTEGER,
    content_score INTEGER,
    local_seo_score INTEGER,
    mobile_score INTEGER,
    speed_score INTEGER,
    issues JSONB, -- Array of issues found
    recommendations JSONB, -- Array of recommendations
    raw_data JSONB, -- Complete audit data
    report_url VARCHAR(500), -- Link to generated PDF report
    audit_status VARCHAR(50) DEFAULT 'completed', -- pending, processing, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- seo, google_ads, facebook_ads, social_media, email
    platform VARCHAR(50), -- google, facebook, instagram, email, website
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed, cancelled
    budget DECIMAL(10,2),
    spent DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    target_audience JSONB, -- Demographics, interests, locations
    campaign_settings JSONB, -- Platform-specific settings
    external_campaign_id VARCHAR(100), -- ID from external platform
    performance_data JSONB, -- Metrics and KPIs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content table (generated content)
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    title VARCHAR(300),
    content_type VARCHAR(50) NOT NULL, -- blog, social_post, ad_copy, email, landing_page
    content_text TEXT NOT NULL,
    content_html TEXT,
    target_keywords TEXT[], -- Array of keywords
    seo_optimized BOOLEAN DEFAULT false,
    publication_status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, published, archived
    scheduled_for TIMESTAMP,
    published_at TIMESTAMP,
    platform VARCHAR(50), -- facebook, instagram, website, email
    external_post_id VARCHAR(100),
    performance_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social Media Posts table
CREATE TABLE social_media_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    content_id UUID REFERENCES content(id),
    platform VARCHAR(50) NOT NULL, -- facebook, instagram, twitter, linkedin
    post_type VARCHAR(50) DEFAULT 'post', -- post, story, reel, ad
    message TEXT NOT NULL,
    image_urls TEXT[], -- Array of image URLs
    video_url VARCHAR(500),
    hashtags TEXT[],
    scheduled_for TIMESTAMP,
    posted_at TIMESTAMP,
    external_post_id VARCHAR(100),
    engagement_metrics JSONB, -- likes, shares, comments, reach
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, posted, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Campaigns table
CREATE TABLE email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    campaign_name VARCHAR(200) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- outreach, newsletter, follow_up, nurture
    subject_line VARCHAR(200) NOT NULL,
    email_content TEXT NOT NULL,
    recipient_list JSONB, -- Array of email addresses
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs table (for tracking all activities)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- If you have user management
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    activity_type VARCHAR(100) NOT NULL, -- lead_created, seo_audit_completed, campaign_started, etc.
    activity_description TEXT NOT NULL,
    entity_type VARCHAR(50), -- lead, client, campaign, audit, etc.
    entity_id UUID,
    metadata JSONB, -- Additional activity data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled Tasks table
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- scraping, outreach, audit, report
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    parameters JSONB, -- Task parameters
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMP,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead Sources table (track where leads come from)
CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name VARCHAR(100) NOT NULL, -- Google Maps, Yelp, Referral, Facebook Ad, etc.
    source_type VARCHAR(50) NOT NULL, -- scraping, advertising, referral, organic
    cost_per_lead DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    total_leads INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance and Data Protection
CREATE TABLE data_processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_subject_email VARCHAR(120),
    processing_type VARCHAR(50) NOT NULL, -- collect, process, store, delete, export
    legal_basis VARCHAR(100), -- consent, legitimate_interest, contract, etc.
    purpose VARCHAR(200),
    data_categories TEXT[], -- personal_data, health_data, marketing_data
    retention_period INTERVAL,
    consent_given BOOLEAN,
    consent_date TIMESTAMP,
    opt_out_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Usage Tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name VARCHAR(50) NOT NULL, -- openai, google_maps, facebook, google_ads
    endpoint VARCHAR(200),
    client_id UUID REFERENCES clients(id),
    request_count INTEGER DEFAULT 1,
    cost DECIMAL(10,4),
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_source ON leads(lead_source);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_clients_status ON clients(client_status);
CREATE INDEX idx_seo_audits_client_id ON seo_audits(client_id);
CREATE INDEX idx_seo_audits_created_at ON seo_audits(created_at);
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_scheduled_tasks_status ON scheduled_tasks(status);
CREATE INDEX idx_scheduled_tasks_scheduled_for ON scheduled_tasks(scheduled_for);

-- Insert default company (your business)
INSERT INTO companies (name, email, phone, website) 
VALUES ('WeTechForU Marketing', 'contact@wetechforu.com', '+1-555-0123', 'https://wetechforu.com')
ON CONFLICT (email) DO NOTHING;

-- Insert default lead sources
INSERT INTO lead_sources (source_name, source_type) VALUES 
('Google Maps Scraping', 'scraping'),
('Yelp Scraping', 'scraping'),
('Healthgrades Scraping', 'scraping'),
('Facebook Ads', 'advertising'),
('Google Ads', 'advertising'),
('Referral Program', 'referral'),
('Website Contact Form', 'organic'),
('Cold Email Response', 'outreach')
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seo_audits_updated_at BEFORE UPDATE ON seo_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


