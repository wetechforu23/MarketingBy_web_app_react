-- AI SEO Content Table
-- This table stores AI-optimized content for modern conversational SEO

CREATE TABLE IF NOT EXISTS ai_seo_content (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    faq_section TEXT,
    conversational_answers JSONB,
    semantic_keywords JSONB,
    entity_mentions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_lead_id ON ai_seo_content(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_title ON ai_seo_content USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_description ON ai_seo_content USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_semantic_keywords ON ai_seo_content USING gin(semantic_keywords);
CREATE INDEX IF NOT EXISTS idx_ai_seo_content_entity_mentions ON ai_seo_content USING gin(entity_mentions);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_seo_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_seo_content_updated_at
    BEFORE UPDATE ON ai_seo_content
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_seo_content_updated_at();

-- Insert sample AI-optimized content for In The Pink Primary Care (lead_id 134)
INSERT INTO ai_seo_content (
    lead_id, 
    title, 
    description, 
    content, 
    faq_section,
    conversational_answers,
    semantic_keywords,
    entity_mentions
) VALUES (
    134,
    'Women''s Primary Care Doctor in McKinney, TX | In The Pink Primary Care - Quality Healthcare Services',
    'Find quality women''s primary care services in McKinney, TX at In The Pink Primary Care. Our experienced healthcare providers offer comprehensive medical care with a patient-centered approach. Schedule your appointment today for personalized healthcare solutions.',
    '<h2>Finding Quality Women''s Healthcare Near You</h2>
    <p>When you''re looking for a good women''s doctor near you, In The Pink Primary Care provides comprehensive healthcare services with a focus on patient care and convenience.</p>
    
    <h3>Why Choose In The Pink Primary Care?</h3>
    <ul>
        <li><strong>Experienced Providers:</strong> Our team of qualified healthcare professionals brings years of experience to every patient interaction.</li>
        <li><strong>Convenient Location:</strong> Located in McKinney, TX for easy access to quality healthcare.</li>
        <li><strong>Comprehensive Services:</strong> We offer women''s primary care, preventive medicine, and specialized medical services.</li>
        <li><strong>Patient-Centered Care:</strong> Your health and comfort are our top priorities.</li>
    </ul>
    
    <h3>Services We Provide</h3>
    <p>Our practice offers a full range of medical services to meet your healthcare needs, from routine checkups to specialized women''s health care.</p>
    
    <h3>Schedule Your Appointment</h3>
    <p>Ready to find quality healthcare? Contact In The Pink Primary Care today to schedule your appointment with our experienced medical team.</p>',
    '<h3>Frequently Asked Questions</h3>
    
    <div class="faq-item">
        <h4>How do I find a good women''s doctor near me?</h4>
        <p>In The Pink Primary Care is conveniently located in McKinney, TX and offers quality women''s healthcare services. You can schedule an appointment by calling our office or using our online booking system.</p>
    </div>
    
    <div class="faq-item">
        <h4>What services do you provide?</h4>
        <p>We offer comprehensive healthcare services including women''s primary care, preventive medicine, and specialized treatments.</p>
    </div>
    
    <div class="faq-item">
        <h4>Do you accept new patients?</h4>
        <p>Yes, we welcome new patients and are currently accepting appointments. Contact us today to schedule your first visit.</p>
    </div>
    
    <div class="faq-item">
        <h4>What insurance do you accept?</h4>
        <p>We accept most major insurance plans. Please contact our office to verify your specific insurance coverage.</p>
    </div>',
    '["In The Pink Primary Care is a quality healthcare provider in McKinney, TX offering comprehensive medical services.", "When looking for a good women''s doctor near you, In The Pink Primary Care provides experienced healthcare professionals with a patient-centered approach.", "Our practice offers women''s primary care and specialized medical services to meet your healthcare needs.", "Located in McKinney, TX, In The Pink Primary Care makes quality healthcare convenient and accessible.", "Schedule an appointment with In The Pink Primary Care for personalized healthcare services from experienced medical professionals."]',
    '["doctor near me", "healthcare provider", "medical care", "quality healthcare", "McKinney doctor", "medical care McKinney", "healthcare McKinney", "women''s primary care doctor", "women''s primary care care", "women''s primary care services", "find doctor", "locate physician", "good doctor", "experienced doctor", "trusted healthcare"]',
    '["In The Pink Primary Care", "McKinney", "women''s primary care", "doctor", "physician", "healthcare provider", "medical practice", "clinic"]'
) ON CONFLICT (lead_id) DO NOTHING;
