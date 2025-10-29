-- Add html_report column to lead_seo_reports table for storing beautiful HTML reports

ALTER TABLE lead_seo_reports 
ADD COLUMN IF NOT EXISTS html_report TEXT;

COMMENT ON COLUMN lead_seo_reports.html_report IS 'Beautiful, email-ready HTML version of the SEO report';

