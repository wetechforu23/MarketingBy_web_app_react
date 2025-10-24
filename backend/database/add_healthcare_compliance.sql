-- ==========================================
-- HEALTHCARE COMPLIANCE & EMERGENCY FEATURES
-- Created: 2025-10-24
-- Purpose: Add HIPAA-compliant disclaimers and emergency handling
-- ==========================================

-- Add healthcare-specific columns to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS industry VARCHAR(50) DEFAULT 'general', -- 'healthcare', 'general', 'legal', etc.
ADD COLUMN IF NOT EXISTS practice_phone VARCHAR(50), -- Practice/Business phone number
ADD COLUMN IF NOT EXISTS emergency_disclaimer TEXT DEFAULT 'If this is a medical emergency, please call 911 immediately.',
ADD COLUMN IF NOT EXISTS hipaa_disclaimer TEXT DEFAULT 'This chat is not for medical emergencies. For urgent medical concerns, please call 911 or visit your nearest emergency room.',
ADD COLUMN IF NOT EXISTS show_emergency_warning BOOLEAN DEFAULT false, -- Show emergency warning on healthcare sites
ADD COLUMN IF NOT EXISTS auto_detect_emergency BOOLEAN DEFAULT false; -- Auto-detect emergency keywords

-- Create index for industry filtering
CREATE INDEX IF NOT EXISTS idx_widget_configs_industry ON widget_configs(industry);

-- Add emergency keyword tracking to conversations
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS emergency_keywords_detected TEXT[], -- Array of detected emergency keywords
ADD COLUMN IF NOT EXISTS emergency_warning_shown BOOLEAN DEFAULT false;

-- Update existing healthcare/medical clients to show warnings
UPDATE widget_configs 
SET 
  industry = 'healthcare',
  show_emergency_warning = true,
  auto_detect_emergency = true
WHERE 
  widget_name ILIKE '%health%' 
  OR widget_name ILIKE '%medical%'
  OR widget_name ILIKE '%clinic%'
  OR widget_name ILIKE '%doctor%'
  OR widget_name ILIKE '%dental%';

COMMENT ON COLUMN widget_configs.industry IS 'Client industry type for compliance (healthcare, general, legal, etc.)';
COMMENT ON COLUMN widget_configs.practice_phone IS 'Practice/Business phone number shown in widget';
COMMENT ON COLUMN widget_configs.emergency_disclaimer IS 'Emergency disclaimer message (especially for healthcare)';
COMMENT ON COLUMN widget_configs.show_emergency_warning IS 'Show emergency warning banner at widget start';

