-- Add report_name column to track report names
ALTER TABLE lead_seo_reports 
ADD COLUMN IF NOT EXISTS report_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_report_name ON lead_seo_reports(report_name);

COMMENT ON COLUMN lead_seo_reports.report_name IS 'Human-readable report name: SEO_Report_CompanyName_Client_Date';

