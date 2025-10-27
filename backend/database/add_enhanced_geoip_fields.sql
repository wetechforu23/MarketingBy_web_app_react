-- ==========================================
-- ENHANCED GEOIP TRACKING FROM IPAPI.CO
-- Date: October 27, 2025
-- Version: v370
-- Source: https://ipapi.co/
-- ==========================================

-- Add comprehensive GeoIP fields to widget_visitor_sessions
ALTER TABLE widget_visitor_sessions
ADD COLUMN IF NOT EXISTS region VARCHAR(255),
ADD COLUMN IF NOT EXISTS region_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS country_code_iso3 VARCHAR(10),
ADD COLUMN IF NOT EXISTS country_capital VARCHAR(255),
ADD COLUMN IF NOT EXISTS country_tld VARCHAR(10),
ADD COLUMN IF NOT EXISTS continent_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS in_eu BOOLEAN,
ADD COLUMN IF NOT EXISTS postal VARCHAR(20),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS utc_offset VARCHAR(10),
ADD COLUMN IF NOT EXISTS country_calling_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS currency_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS languages TEXT,
ADD COLUMN IF NOT EXISTS asn VARCHAR(50),
ADD COLUMN IF NOT EXISTS org TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country_code ON widget_visitor_sessions(country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_region ON widget_visitor_sessions(region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_timezone ON widget_visitor_sessions(timezone) WHERE timezone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_continent ON widget_visitor_sessions(continent_code) WHERE continent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_in_eu ON widget_visitor_sessions(in_eu) WHERE in_eu IS TRUE;
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_lat_long ON widget_visitor_sessions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN widget_visitor_sessions.region IS 'State/Province name from ipapi.co';
COMMENT ON COLUMN widget_visitor_sessions.region_code IS 'State/Province code (e.g. CA for California)';
COMMENT ON COLUMN widget_visitor_sessions.country_code IS 'ISO 3166-1 alpha-2 country code (e.g. US)';
COMMENT ON COLUMN widget_visitor_sessions.country_code_iso3 IS 'ISO 3166-1 alpha-3 country code (e.g. USA)';
COMMENT ON COLUMN widget_visitor_sessions.country_capital IS 'Capital city of the country';
COMMENT ON COLUMN widget_visitor_sessions.country_tld IS 'Top-level domain for the country (e.g. .us)';
COMMENT ON COLUMN widget_visitor_sessions.continent_code IS 'Continent code (e.g. NA for North America)';
COMMENT ON COLUMN widget_visitor_sessions.in_eu IS 'Whether the country is in the European Union';
COMMENT ON COLUMN widget_visitor_sessions.postal IS 'Postal/ZIP code';
COMMENT ON COLUMN widget_visitor_sessions.latitude IS 'Latitude coordinate (city-level accuracy)';
COMMENT ON COLUMN widget_visitor_sessions.longitude IS 'Longitude coordinate (city-level accuracy)';
COMMENT ON COLUMN widget_visitor_sessions.timezone IS 'IANA timezone (e.g. America/Los_Angeles)';
COMMENT ON COLUMN widget_visitor_sessions.utc_offset IS 'UTC offset (e.g. -0700)';
COMMENT ON COLUMN widget_visitor_sessions.country_calling_code IS 'International calling code (e.g. +1)';
COMMENT ON COLUMN widget_visitor_sessions.currency IS 'Currency code (e.g. USD)';
COMMENT ON COLUMN widget_visitor_sessions.currency_name IS 'Currency name (e.g. Dollar)';
COMMENT ON COLUMN widget_visitor_sessions.languages IS 'Primary languages spoken (e.g. en-US,es-US)';
COMMENT ON COLUMN widget_visitor_sessions.asn IS 'Autonomous System Number (e.g. AS15169)';
COMMENT ON COLUMN widget_visitor_sessions.org IS 'Organization/ISP name (e.g. Google LLC)';

-- ==========================================
-- GDPR & PRIVACY COMPLIANCE NOTES
-- ==========================================
-- 
-- Data Collection Purpose:
--   - Visitor analytics and geolocation for marketing insights
--   - Timezone detection for appointment scheduling
--   - Currency/language personalization
--   - Fraud detection and security monitoring
--
-- Legal Basis:
--   - Legitimate interest (analytics, security)
--   - User consent (when applicable)
--
-- Data Retention:
--   - Visitor sessions: 90 days (configurable)
--   - Aggregated analytics: Indefinite (anonymized)
--
-- User Rights (GDPR Article 17):
--   - Right to be forgotten: Implemented via DELETE endpoint
--   - Data export: Available via admin API
--   - Opt-out: Cookie/tracking consent required
--
-- Data Processing:
--   - IP addresses processed via ipapi.co (USA-based, Privacy Shield certified)
--   - Data stored in Heroku PostgreSQL (USA/EU regions available)
--   - No sensitive personal data collected
--
-- Third-Party Disclosure:
--   - ipapi.co for GeoIP lookup only (no data storage by third-party)
--   - No data sold or shared with advertisers
--
-- Security Measures:
--   - HTTPS encryption in transit
--   - Database encryption at rest
--   - Access control via authentication
--   - Regular security audits
--
-- ==========================================

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'Enhanced GeoIP fields added successfully!';
  RAISE NOTICE 'New fields: region, region_code, country_code, country_code_iso3, country_capital, country_tld';
  RAISE NOTICE '            continent_code, in_eu, postal, latitude, longitude, timezone, utc_offset';
  RAISE NOTICE '            country_calling_code, currency, currency_name, languages, asn, org';
  RAISE NOTICE 'Indexes created for: country_code, region, timezone, continent_code, in_eu, lat/long';
  RAISE NOTICE 'Source: https://ipapi.co/ (Free tier: 30,000 lookups/month, up to 1,000/day)';
  RAISE NOTICE 'GDPR compliance notes added - please review data retention and privacy policy';
END $$;

