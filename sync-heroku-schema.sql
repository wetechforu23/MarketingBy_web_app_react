-- ============================================================================
-- SYNC HEROKU DATABASE SCHEMA WITH LOCAL
-- ============================================================================
-- This script will update Heroku production database to match local schema
-- Run: heroku pg:psql --app marketingby-wetechforu < sync-heroku-schema.sql
-- ============================================================================

-- ============================================================================
-- LEADS TABLE - Align with Local
-- ============================================================================

-- LOCAL uses 'company' (NOT NULL), HEROKU has both 'clinic_name' and 'company'
-- Solution: Drop clinic_name, use only company
ALTER TABLE leads DROP COLUMN IF EXISTS clinic_name;
ALTER TABLE leads ALTER COLUMN company SET NOT NULL;

-- LOCAL has 'source', HEROKU has 'lead_source' - standardize to 'source'
ALTER TABLE leads DROP COLUMN IF EXISTS lead_source;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50);

-- LOCAL has separate contact columns
ALTER TABLE leads DROP COLUMN IF EXISTS contact_person;
ALTER TABLE leads DROP COLUMN IF EXISTS contact_email;
ALTER TABLE leads DROP COLUMN IF EXISTS contact_phone;

-- Add missing LOCAL columns to HEROKU
ALTER TABLE leads ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS compliance_issues TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS geographic_restriction VARCHAR(50) DEFAULT 'Texas';

-- Fix google_place_id type (LOCAL uses TEXT, HEROKU uses VARCHAR)
ALTER TABLE leads ALTER COLUMN google_place_id TYPE TEXT;

-- Ensure scraping-related columns exist (these are in HEROKU but not LOCAL - keep them)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scraping_method VARCHAR(50);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS compliance_checked BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scraping_metadata JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- ============================================================================
-- ENCRYPTED_CREDENTIALS TABLE - Align with Heroku Format
-- ============================================================================

-- LOCAL has more specific columns, HEROKU uses simpler service/key_name
-- Drop LOCAL-specific columns if they exist
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS service_name;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS environment;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS credential_type;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS encryption_key_id;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS created_by;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS last_rotated;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE encrypted_credentials DROP COLUMN IF EXISTS notes;

-- Ensure HEROKU format columns exist
ALTER TABLE encrypted_credentials ADD COLUMN IF NOT EXISTS service VARCHAR(255) NOT NULL DEFAULT 'unknown';
ALTER TABLE encrypted_credentials ADD COLUMN IF NOT EXISTS key_name VARCHAR(255) NOT NULL DEFAULT 'unknown';
ALTER TABLE encrypted_credentials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE encrypted_credentials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE encrypted_credentials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create unique constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'encrypted_credentials_service_key_name_key'
    ) THEN
        ALTER TABLE encrypted_credentials ADD CONSTRAINT encrypted_credentials_service_key_name_key UNIQUE (service, key_name);
    END IF;
END $$;

-- ============================================================================
-- USERS TABLE - Add role column if missing
-- ============================================================================

-- Ensure role column exists (for multi-tenant)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- Add profile columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- ============================================================================
-- SCRAPING_LOGS TABLE - Ensure all columns exist
-- ============================================================================

ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS target VARCHAR(255);
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS query TEXT;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS scraping_method VARCHAR(100);
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS leads_found INTEGER;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS leads_saved INTEGER;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS results_count INTEGER;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS skipped_count INTEGER;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS api_calls INTEGER;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS success BOOLEAN;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS errors TEXT;
ALTER TABLE scraping_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- CLIENTS TABLE - Ensure all columns exist
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_hours VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_work_status VARCHAR(50) DEFAULT 'none';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_type VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_start_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_completion_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_budget NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_filename VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_extracted_at TIMESTAMP;

-- ============================================================================
-- CREATE MISSING TABLES
-- ============================================================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    stripe_product_id VARCHAR(100),
    stripe_price_id VARCHAR(100),
    price NUMERIC(10,2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    features TEXT,
    is_active BOOLEAN DEFAULT true,
    setup_fee NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client Subscriptions
CREATE TABLE IF NOT EXISTS client_subscriptions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    custom_features TEXT,
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding Records
CREATE TABLE IF NOT EXISTS onboarding_records (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    step_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Agreements
CREATE TABLE IF NOT EXISTS service_agreements (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    agreement_type VARCHAR(50) NOT NULL,
    agreement_text TEXT NOT NULL,
    signed_at TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform Access Tracking
CREATE TABLE IF NOT EXISTS platform_access_tracking (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    platform_name VARCHAR(100) NOT NULL,
    access_granted BOOLEAN DEFAULT false,
    access_granted_at TIMESTAMP,
    credentials_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_google_place_id ON leads(google_place_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_users_client_id ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_scraping_logs_client_id ON scraping_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_created_at ON scraping_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_service ON encrypted_credentials(service);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client_id ON client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_status ON client_subscriptions(status);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ SCHEMA SYNC COMPLETE!' as status;
SELECT 'Leads table columns:' as info;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'leads' ORDER BY ordinal_position;

