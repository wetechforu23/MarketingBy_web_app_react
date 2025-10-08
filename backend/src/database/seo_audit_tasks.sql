-- SEO Audit Tasks Table
-- This table stores all SEO audit tasks for each lead

CREATE TABLE IF NOT EXISTS seo_audit_tasks (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    task_category VARCHAR(50) NOT NULL, -- 'immediate_fixes', 'high_impact', 'growth_opportunities', 'competitive_advantages'
    task_priority VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT NOT NULL,
    task_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    assigned_to VARCHAR(100), -- User or team member assigned
    due_date DATE,
    estimated_hours DECIMAL(4,2), -- Estimated time to complete
    actual_hours DECIMAL(4,2), -- Actual time spent
    completion_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_lead_id ON seo_audit_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_status ON seo_audit_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_priority ON seo_audit_tasks(task_priority);
CREATE INDEX IF NOT EXISTS idx_seo_audit_tasks_category ON seo_audit_tasks(task_category);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_seo_audit_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_seo_audit_tasks_updated_at
    BEFORE UPDATE ON seo_audit_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_audit_tasks_updated_at();

-- Insert sample tasks for In The Pink Primary Care (lead_id 134)
INSERT INTO seo_audit_tasks (lead_id, task_category, task_priority, task_title, task_description, estimated_hours) VALUES
-- Immediate Fixes
(134, 'immediate_fixes', 'critical', 'Fix Incomplete Meta Description', 'Your meta description tag is broken - this hurts search rankings. Complete the meta description tag with compelling 155-character description.', 2.0),
(134, 'immediate_fixes', 'critical', 'Fix Missing Keywords Meta', 'Your keywords meta tag is incomplete. Add relevant keywords for women''s primary care in McKinney.', 1.0),
(134, 'immediate_fixes', 'high', 'Optimize Title Tag', 'Change from "Welcome In The Pink Primary Care" to "Women''s Primary Care in McKinney, TX | In The Pink Primary Care"', 1.0),
(134, 'immediate_fixes', 'high', 'Add Medical Schema Markup', 'Implement MedicalClinic schema for better search visibility and rich snippets.', 3.0),
(134, 'immediate_fixes', 'medium', 'Optimize Apache Server', 'Server configuration needs optimization for speed and performance.', 4.0),

-- High Impact Improvements
(134, 'high_impact', 'high', 'Complete Meta Description', 'Add compelling 155-character description with location and services for better click-through rates.', 2.0),
(134, 'high_impact', 'high', 'Optimize for Women''s Health Keywords', 'Target unique positioning as women-only practice with specific keyword optimization.', 3.0),
(134, 'high_impact', 'medium', 'Local SEO Optimization', 'Target "McKinney women''s doctor" and "Collin County primary care" keywords.', 4.0),
(134, 'high_impact', 'medium', 'Google My Business Optimization', 'Update and optimize GMB profile with photos, accurate hours, and service descriptions.', 2.0),
(134, 'high_impact', 'low', 'Local Directory Listings', 'Get listed in McKinney healthcare directories and local business listings.', 3.0),

-- Growth Opportunities
(134, 'growth_opportunities', 'medium', 'Content Marketing Strategy', 'Create blog posts about women''s health topics to establish authority.', 8.0),
(134, 'growth_opportunities', 'medium', 'Service Pages Creation', 'Develop dedicated pages for each service (preventive care, wellness, etc.).', 6.0),
(134, 'growth_opportunities', 'low', 'Patient Testimonials', 'Add real patient reviews and success stories to build trust.', 4.0),
(134, 'growth_opportunities', 'low', 'Online Booking Optimization', 'Optimize your Zocdoc integration for better conversion rates.', 3.0),
(134, 'growth_opportunities', 'low', 'Local Citations Building', 'Get listed in McKinney healthcare directories and review sites.', 5.0),

-- Competitive Advantages
(134, 'competitive_advantages', 'medium', 'Women-Only Practice Positioning', 'Emphasize unique positioning in McKinney market as women-only practice.', 3.0),
(134, 'competitive_advantages', 'low', 'Comprehensive Care Messaging', 'Highlight primary care + women''s health services combination.', 2.0),
(134, 'competitive_advantages', 'low', 'Modern Technology Features', 'Showcase online booking and patient portal capabilities.', 2.0),
(134, 'competitive_advantages', 'low', 'Local Focus Content', 'Create content emphasizing service to McKinney and surrounding areas.', 4.0),
(134, 'competitive_advantages', 'low', 'Patient-Centered Care', 'Develop content emphasizing personalized approach to healthcare.', 3.0);
