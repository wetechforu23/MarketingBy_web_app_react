-- Add offer tracking to SEO reports
ALTER TABLE lead_seo_reports 
ADD COLUMN IF NOT EXISTS offer_token VARCHAR(50),
ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS offer_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS offer_claimed_at TIMESTAMP;

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_offer_token ON lead_seo_reports(offer_token) WHERE offer_token IS NOT NULL;

COMMENT ON COLUMN lead_seo_reports.offer_token IS 'Unique token for limited-time offer link in report';
COMMENT ON COLUMN lead_seo_reports.offer_expires_at IS 'Expiration timestamp for the offer (72 hours)';
COMMENT ON COLUMN lead_seo_reports.offer_claimed IS 'Whether the customer has claimed this offer';
COMMENT ON COLUMN lead_seo_reports.offer_claimed_at IS 'When the offer was claimed';

