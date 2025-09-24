-- ================================================================
-- WETECHFORU MARKETING AUTOMATION SYSTEM - DATABASE SCHEMA
-- ================================================================
-- Complete PostgreSQL database architecture with proper relationships
-- Designed for multi-industry lead generation and client management
-- ================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS marketing_performance CASCADE;
DROP TABLE IF EXISTS content_approvals CASCADE;
DROP TABLE IF EXISTS client_reports CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS seo_audits CASCADE;
DROP TABLE IF EXISTS search_keywords CASCADE;
DROP TABLE IF EXISTS industry_subcategories CASCADE;
DROP TABLE IF EXISTS industry_categories CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ================================================================
-- CORE SYSTEM TABLES
-- ================================================================

-- Users table (authentication and access control)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer', -- admin, customer, staff
    client_website VARCHAR(200), -- For customer users
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Industry categories (master data for lead classification)
CREATE TABLE industry_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- FontAwesome icon class
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Industry subcategories (detailed classification)
CREATE TABLE industry_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES industry_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search keywords (for lead generation)
CREATE TABLE search_keywords (
    id SERIAL PRIMARY KEY,
    subcategory_id INTEGER REFERENCES industry_subcategories(id) ON DELETE CASCADE,
    keyword VARCHAR(200) NOT NULL,
    search_volume INTEGER DEFAULT 0,
    competition_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    effectiveness_score INTEGER DEFAULT 50, -- 1-100
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- LEAD MANAGEMENT TABLES
-- ================================================================

-- Leads table (prospects from scraping and other sources)
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    industry_category VARCHAR(100),
    industry_subcategory VARCHAR(100),
    services TEXT,
    lead_status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, proposal_sent, converted, closed, cancelled
    lead_source VARCHAR(50) DEFAULT 'scraper', -- scraper, referral, website, social_media
    rating DECIMAL(2,1),
    review_count INTEGER DEFAULT 0,
    contacted BOOLEAN DEFAULT false,
    notes TEXT,
    search_keyword VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table (converted leads and direct clients)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    clinic_name VARCHAR(200) NOT NULL, -- Business name
    contact_name VARCHAR(100),
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    specialties TEXT, -- Services offered
    client_status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended, cancelled
    monthly_retainer DECIMAL(10,2),
    contract_start_date DATE,
    contract_end_date DATE,
    lead_id INTEGER REFERENCES leads(id), -- Reference to original lead
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- MARKETING & ANALYTICS TABLES
-- ================================================================

-- SEO audits (for both leads and clients)
CREATE TABLE seo_audits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    overall_score INTEGER DEFAULT 0,
    technical_score INTEGER DEFAULT 0,
    content_score INTEGER DEFAULT 0,
    local_seo_score INTEGER DEFAULT 0,
    mobile_score INTEGER DEFAULT 0,
    issues TEXT, -- JSON string of issues
    recommendations TEXT, -- JSON string of recommendations
    audit_type VARCHAR(50) DEFAULT 'comprehensive',
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either client_id or lead_id is provided
    CONSTRAINT chk_audit_target CHECK (
        (client_id IS NOT NULL AND lead_id IS NULL) OR 
        (client_id IS NULL AND lead_id IS NOT NULL)
    )
);

-- Campaigns (marketing campaigns for clients)
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_name VARCHAR(200) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- seo, social_media, google_ads, email
    platform VARCHAR(50), -- facebook, google, instagram, email
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled
    budget DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    target_audience TEXT,
    campaign_goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communications (all client/lead interactions)
CREATE TABLE communications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL, -- email, phone, meeting, sms
    subject VARCHAR(200),
    content TEXT,
    recipient_email VARCHAR(120),
    sender_email VARCHAR(120),
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, opened, replied, failed
    direction VARCHAR(20) DEFAULT 'outbound', -- inbound, outbound
    attachments TEXT, -- JSON array of attachment info
    opened_at TIMESTAMP,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure either client_id or lead_id is provided
    CONSTRAINT chk_comm_target CHECK (
        (client_id IS NOT NULL AND lead_id IS NULL) OR 
        (client_id IS NULL AND lead_id IS NOT NULL)
    )
);

-- Client reports (generated reports for clients)
CREATE TABLE client_reports (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- seo_audit, social_media, google_ads, comprehensive
    report_name VARCHAR(200) NOT NULL,
    report_data TEXT, -- JSON string of report content
    file_path VARCHAR(500), -- Path to generated PDF/file
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content approvals (social media posts, etc.)
CREATE TABLE content_approvals (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- facebook_post, instagram_post, blog_post, email
    title VARCHAR(200),
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    scheduled_date TIMESTAMP,
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, posted
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    posted_at TIMESTAMP,
    platform_post_id VARCHAR(100), -- ID from social platform
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marketing performance (tracking all marketing activities)
CREATE TABLE marketing_performance (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL, -- facebook, google_ads, google_my_business, email, seo
    campaign_type VARCHAR(50), -- post, ad, listing_update, newsletter, organic
    content_id VARCHAR(100), -- Platform-specific content ID
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagement INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0.00,
    conversions INTEGER DEFAULT 0, -- Appointments booked, leads generated
    revenue_attributed DECIMAL(10,2) DEFAULT 0.00,
    performance_data TEXT, -- JSON string of detailed metrics
    date_tracked DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Industry indexes
CREATE INDEX idx_subcategories_category ON industry_subcategories(category_id);
CREATE INDEX idx_keywords_subcategory ON search_keywords(subcategory_id);
CREATE INDEX idx_keywords_active ON search_keywords(is_active);

-- Leads indexes
CREATE INDEX idx_leads_status ON leads(lead_status);
CREATE INDEX idx_leads_industry ON leads(industry_category);
CREATE INDEX idx_leads_source ON leads(lead_source);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_leads_contacted ON leads(contacted);

-- Clients indexes
CREATE INDEX idx_clients_status ON clients(client_status);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_lead ON clients(lead_id);
CREATE INDEX idx_clients_created ON clients(created_at);

-- SEO audits indexes
CREATE INDEX idx_seo_client ON seo_audits(client_id);
CREATE INDEX idx_seo_lead ON seo_audits(lead_id);
CREATE INDEX idx_seo_created ON seo_audits(created_at);
CREATE INDEX idx_seo_score ON seo_audits(overall_score);

-- Campaigns indexes
CREATE INDEX idx_campaigns_client ON campaigns(client_id);
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- Communications indexes
CREATE INDEX idx_comm_client ON communications(client_id);
CREATE INDEX idx_comm_lead ON communications(lead_id);
CREATE INDEX idx_comm_type ON communications(communication_type);
CREATE INDEX idx_comm_status ON communications(status);
CREATE INDEX idx_comm_created ON communications(created_at);

-- Reports indexes
CREATE INDEX idx_reports_client ON client_reports(client_id);
CREATE INDEX idx_reports_type ON client_reports(report_type);
CREATE INDEX idx_reports_created ON client_reports(created_at);

-- Content approvals indexes
CREATE INDEX idx_content_client ON content_approvals(client_id);
CREATE INDEX idx_content_status ON content_approvals(approval_status);
CREATE INDEX idx_content_type ON content_approvals(content_type);
CREATE INDEX idx_content_scheduled ON content_approvals(scheduled_date);

-- Marketing performance indexes
CREATE INDEX idx_perf_client ON marketing_performance(client_id);
CREATE INDEX idx_perf_campaign ON marketing_performance(campaign_id);
CREATE INDEX idx_perf_platform ON marketing_performance(platform);
CREATE INDEX idx_perf_date ON marketing_performance(date_tracked);
CREATE INDEX idx_perf_client_date ON marketing_performance(client_id, date_tracked);

-- ================================================================
-- SAMPLE DATA INSERTION
-- ================================================================

-- Insert industry categories
INSERT INTO industry_categories (name, description, icon) VALUES
('Healthcare & Medical', 'Healthcare providers, medical practices, and wellness services', 'fas fa-heartbeat'),
('Legal Services', 'Law firms, attorneys, and legal service providers', 'fas fa-gavel'),
('Real Estate', 'Real estate agents, brokers, and property services', 'fas fa-home'),
('Financial Services', 'Financial advisors, accountants, and money management services', 'fas fa-dollar-sign'),
('Home Services', 'Home improvement, maintenance, and repair services', 'fas fa-tools'),
('Automotive', 'Auto repair, dealerships, and automotive services', 'fas fa-car'),
('Beauty & Wellness', 'Beauty salons, spas, and wellness services', 'fas fa-spa'),
('Professional Services', 'Business and professional service providers', 'fas fa-briefcase');

-- Insert healthcare subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Family Medicine', 'Family doctors and primary care physicians'),
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Urgent Care', 'Walk-in clinics and urgent care centers'),
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Dental Services', 'Dentists and dental care providers'),
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Mental Health', 'Therapists, counselors, and mental health services'),
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Chiropractic', 'Chiropractors and spinal care'),
((SELECT id FROM industry_categories WHERE name = 'Healthcare & Medical'), 'Physical Therapy', 'Physical therapists and rehabilitation');

-- Insert legal subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Legal Services'), 'Personal Injury', 'Personal injury and accident attorneys'),
((SELECT id FROM industry_categories WHERE name = 'Legal Services'), 'Family Law', 'Divorce, custody, and family law attorneys'),
((SELECT id FROM industry_categories WHERE name = 'Legal Services'), 'Criminal Defense', 'Criminal defense and DUI attorneys'),
((SELECT id FROM industry_categories WHERE name = 'Legal Services'), 'Business Law', 'Corporate and business law attorneys'),
((SELECT id FROM industry_categories WHERE name = 'Legal Services'), 'Real Estate Law', 'Real estate and property law attorneys');

-- Insert real estate subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Real Estate'), 'Residential Sales', 'Home sales agents and realtors'),
((SELECT id FROM industry_categories WHERE name = 'Real Estate'), 'Commercial Real Estate', 'Commercial property brokers'),
((SELECT id FROM industry_categories WHERE name = 'Real Estate'), 'Property Management', 'Rental and property management services'),
((SELECT id FROM industry_categories WHERE name = 'Real Estate'), 'Real Estate Investment', 'Investment property specialists');

-- Insert financial subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Financial Services'), 'Financial Planning', 'Financial advisors and wealth management'),
((SELECT id FROM industry_categories WHERE name = 'Financial Services'), 'Accounting', 'CPAs, accountants, and tax services'),
((SELECT id FROM industry_categories WHERE name = 'Financial Services'), 'Insurance', 'Insurance agents and brokers'),
((SELECT id FROM industry_categories WHERE name = 'Financial Services'), 'Mortgage Services', 'Mortgage brokers and loan officers');

-- Insert home services subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'Contractors', 'General contractors and construction'),
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'HVAC Services', 'Heating, ventilation, and air conditioning'),
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'Plumbing', 'Plumbers and plumbing services'),
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'Electrical', 'Electricians and electrical services'),
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'Landscaping', 'Landscaping and lawn care services'),
((SELECT id FROM industry_categories WHERE name = 'Home Services'), 'Cleaning Services', 'House cleaning and janitorial services');

-- Insert automotive subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Automotive'), 'Auto Repair', 'Auto repair shops and mechanics'),
((SELECT id FROM industry_categories WHERE name = 'Automotive'), 'Auto Dealerships', 'Car dealerships and vehicle sales'),
((SELECT id FROM industry_categories WHERE name = 'Automotive'), 'Specialty Services', 'Auto detailing, car wash, tire shops');

-- Insert beauty subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Beauty & Wellness'), 'Hair Salons', 'Hair salons and beauty services'),
((SELECT id FROM industry_categories WHERE name = 'Beauty & Wellness'), 'Spa Services', 'Spas and massage therapy'),
((SELECT id FROM industry_categories WHERE name = 'Beauty & Wellness'), 'Nail Services', 'Nail salons and manicure services'),
((SELECT id FROM industry_categories WHERE name = 'Beauty & Wellness'), 'Fitness', 'Gyms, fitness centers, and personal trainers');

-- Insert professional services subcategories
INSERT INTO industry_subcategories (category_id, name, description) VALUES
((SELECT id FROM industry_categories WHERE name = 'Professional Services'), 'Marketing & Advertising', 'Marketing agencies and advertising services'),
((SELECT id FROM industry_categories WHERE name = 'Professional Services'), 'IT Services', 'IT support and computer services'),
((SELECT id FROM industry_categories WHERE name = 'Professional Services'), 'Consulting', 'Business and management consulting'),
((SELECT id FROM industry_categories WHERE name = 'Professional Services'), 'Architecture & Engineering', 'Architects and engineering firms');

-- ================================================================
-- SEARCH KEYWORDS DATA
-- ================================================================

-- Healthcare keywords
INSERT INTO search_keywords (subcategory_id, keyword, search_volume, competition_level, effectiveness_score) VALUES
((SELECT id FROM industry_subcategories WHERE name = 'Family Medicine'), 'family doctor', 5000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Family Medicine'), 'primary care physician', 8000, 'high', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Family Medicine'), 'family practice', 3000, 'medium', 80),
((SELECT id FROM industry_subcategories WHERE name = 'Urgent Care'), 'urgent care center', 12000, 'high', 95),
((SELECT id FROM industry_subcategories WHERE name = 'Urgent Care'), 'walk-in clinic', 4000, 'medium', 75),
((SELECT id FROM industry_subcategories WHERE name = 'Dental Services'), 'dentist', 15000, 'high', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Dental Services'), 'dental office', 6000, 'medium', 80);

-- Legal keywords
INSERT INTO search_keywords (subcategory_id, keyword, search_volume, competition_level, effectiveness_score) VALUES
((SELECT id FROM industry_subcategories WHERE name = 'Personal Injury'), 'personal injury lawyer', 10000, 'high', 95),
((SELECT id FROM industry_subcategories WHERE name = 'Personal Injury'), 'accident attorney', 8000, 'high', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Family Law'), 'divorce attorney', 7000, 'high', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Family Law'), 'family lawyer', 5000, 'medium', 80),
((SELECT id FROM industry_subcategories WHERE name = 'Criminal Defense'), 'criminal defense lawyer', 4000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Criminal Defense'), 'DUI lawyer', 6000, 'high', 90);

-- Real estate keywords
INSERT INTO search_keywords (subcategory_id, keyword, search_volume, competition_level, effectiveness_score) VALUES
((SELECT id FROM industry_subcategories WHERE name = 'Residential Sales'), 'real estate agent', 20000, 'high', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Residential Sales'), 'realtor', 18000, 'high', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Commercial Real Estate'), 'commercial broker', 3000, 'medium', 80),
((SELECT id FROM industry_subcategories WHERE name = 'Property Management'), 'property management', 8000, 'medium', 75);

-- Financial keywords
INSERT INTO search_keywords (subcategory_id, keyword, search_volume, competition_level, effectiveness_score) VALUES
((SELECT id FROM industry_subcategories WHERE name = 'Financial Planning'), 'financial advisor', 12000, 'high', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Financial Planning'), 'wealth management', 4000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Accounting'), 'accountant', 10000, 'medium', 80),
((SELECT id FROM industry_subcategories WHERE name = 'Accounting'), 'CPA', 8000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Insurance'), 'insurance agent', 15000, 'high', 75);

-- Home services keywords
INSERT INTO search_keywords (subcategory_id, keyword, search_volume, competition_level, effectiveness_score) VALUES
((SELECT id FROM industry_subcategories WHERE name = 'Contractors'), 'general contractor', 8000, 'medium', 80),
((SELECT id FROM industry_subcategories WHERE name = 'HVAC Services'), 'HVAC contractor', 6000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Plumbing'), 'plumber', 12000, 'medium', 90),
((SELECT id FROM industry_subcategories WHERE name = 'Electrical'), 'electrician', 10000, 'medium', 85),
((SELECT id FROM industry_subcategories WHERE name = 'Landscaping'), 'landscaper', 5000, 'low', 70);

-- ================================================================
-- DEFAULT SYSTEM USERS
-- ================================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@wetechforu.com', 'pbkdf2:sha256:260000$salt$hash', 'admin');

-- Insert sample customer user (password: WeTech123)
INSERT INTO users (username, email, password_hash, role, client_website) VALUES
('wetechforu', 'contact@wetechforu.com', 'pbkdf2:sha256:260000$salt$hash', 'customer', 'https://wetechforu.com/');

-- ================================================================
-- VIEWS FOR REPORTING
-- ================================================================

-- Lead pipeline view
CREATE VIEW lead_pipeline AS
SELECT 
    l.industry_category,
    l.lead_status,
    COUNT(*) as lead_count,
    AVG(l.rating) as avg_rating,
    COUNT(CASE WHEN l.contacted THEN 1 END) as contacted_count
FROM leads l
GROUP BY l.industry_category, l.lead_status
ORDER BY l.industry_category, l.lead_status;

-- Client performance view
CREATE VIEW client_performance AS
SELECT 
    c.id as client_id,
    c.clinic_name,
    c.monthly_retainer,
    COUNT(DISTINCT mp.id) as total_campaigns,
    SUM(mp.impressions) as total_impressions,
    SUM(mp.clicks) as total_clicks,
    SUM(mp.conversions) as total_conversions,
    SUM(mp.revenue_attributed) as total_revenue
FROM clients c
LEFT JOIN marketing_performance mp ON c.id = mp.client_id
WHERE c.client_status = 'active'
GROUP BY c.id, c.clinic_name, c.monthly_retainer
ORDER BY total_revenue DESC;

-- Industry effectiveness view
CREATE VIEW industry_effectiveness AS
SELECT 
    ic.name as industry,
    isc.name as subcategory,
    sk.keyword,
    sk.effectiveness_score,
    COUNT(l.id) as leads_generated
FROM industry_categories ic
JOIN industry_subcategories isc ON ic.id = isc.category_id
JOIN search_keywords sk ON isc.id = sk.subcategory_id
LEFT JOIN leads l ON l.search_keyword = sk.keyword
GROUP BY ic.name, isc.name, sk.keyword, sk.effectiveness_score
ORDER BY sk.effectiveness_score DESC, leads_generated DESC;

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

-- Function to convert lead to client
CREATE OR REPLACE FUNCTION convert_lead_to_client(
    p_lead_id INTEGER,
    p_monthly_retainer DECIMAL(10,2) DEFAULT 2500.00
) RETURNS INTEGER AS $$
DECLARE
    v_client_id INTEGER;
    v_lead_record RECORD;
BEGIN
    -- Get lead details
    SELECT * INTO v_lead_record FROM leads WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found with ID: %', p_lead_id;
    END IF;
    
    -- Create client record
    INSERT INTO clients (
        clinic_name, email, phone, website, address,
        specialties, monthly_retainer, lead_id,
        client_status, contract_start_date
    ) VALUES (
        v_lead_record.business_name,
        COALESCE(v_lead_record.email, 'info@' || LOWER(REPLACE(v_lead_record.business_name, ' ', '')) || '.com'),
        v_lead_record.phone,
        v_lead_record.website,
        v_lead_record.address,
        v_lead_record.services,
        p_monthly_retainer,
        p_lead_id,
        'active',
        CURRENT_DATE
    ) RETURNING id INTO v_client_id;
    
    -- Update lead status
    UPDATE leads 
    SET lead_status = 'converted',
        notes = COALESCE(notes, '') || E'\n[' || CURRENT_TIMESTAMP || '] Converted to client (ID: ' || v_client_id || ')',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_lead_id;
    
    RETURN v_client_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get industry keywords
CREATE OR REPLACE FUNCTION get_industry_keywords(p_subcategory_name VARCHAR(100))
RETURNS TABLE(keyword VARCHAR(200), effectiveness_score INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT sk.keyword, sk.effectiveness_score
    FROM search_keywords sk
    JOIN industry_subcategories isc ON sk.subcategory_id = isc.id
    WHERE isc.name = p_subcategory_name
    AND sk.is_active = true
    ORDER BY sk.effectiveness_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get lead statistics
CREATE OR REPLACE FUNCTION get_lead_stats()
RETURNS TABLE(
    total_leads BIGINT,
    new_leads BIGINT,
    contacted_leads BIGINT,
    qualified_leads BIGINT,
    converted_leads BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN lead_status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN contacted = true THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN lead_status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN lead_status = 'converted' THEN 1 END) as converted_leads
    FROM leads;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_leads_timestamp BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_campaigns_timestamp BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_communications_timestamp BEFORE UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_content_timestamp BEFORE UPDATE ON content_approvals FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_performance_timestamp BEFORE UPDATE ON marketing_performance FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ================================================================
-- SECURITY & CONSTRAINTS
-- ================================================================

-- Ensure valid email formats
ALTER TABLE users ADD CONSTRAINT chk_users_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE clients ADD CONSTRAINT chk_clients_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure valid phone formats (optional)
ALTER TABLE leads ADD CONSTRAINT chk_leads_phone CHECK (phone IS NULL OR phone ~* '^\(\d{3}\) \d{3}-\d{4}$');
ALTER TABLE clients ADD CONSTRAINT chk_clients_phone CHECK (phone IS NULL OR phone ~* '^\(\d{3}\) \d{3}-\d{4}$');

-- Ensure valid URLs
ALTER TABLE leads ADD CONSTRAINT chk_leads_website CHECK (website IS NULL OR website ~* '^https?://');
ALTER TABLE clients ADD CONSTRAINT chk_clients_website CHECK (website IS NULL OR website ~* '^https?://');

-- Ensure valid ratings
ALTER TABLE leads ADD CONSTRAINT chk_leads_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

-- Ensure valid scores
ALTER TABLE seo_audits ADD CONSTRAINT chk_seo_scores CHECK (
    overall_score >= 0 AND overall_score <= 100 AND
    technical_score >= 0 AND technical_score <= 100 AND
    content_score >= 0 AND content_score <= 100
);

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE industry_categories IS 'Master list of business industry categories';
COMMENT ON TABLE industry_subcategories IS 'Detailed subcategories for precise lead targeting';
COMMENT ON TABLE search_keywords IS 'Optimized keywords for lead generation with effectiveness tracking';
COMMENT ON TABLE leads IS 'Prospect database with full lead lifecycle management';
COMMENT ON TABLE clients IS 'Active client database with service and billing information';
COMMENT ON TABLE seo_audits IS 'SEO analysis results for leads and clients';
COMMENT ON TABLE campaigns IS 'Marketing campaign tracking and management';
COMMENT ON TABLE communications IS 'Complete communication history with leads and clients';
COMMENT ON TABLE marketing_performance IS 'Detailed marketing metrics and ROI tracking';

-- ================================================================
-- GRANT PERMISSIONS (for application user)
-- ================================================================

-- Grant permissions to application user (replace 'app_user' with your actual username)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ================================================================
-- END OF SCHEMA
-- ================================================================


