-- Migration: Add backlinks and blogs tables
-- Date: 2025-10-17
-- Description: Add tables for tracking backlinks and blog content

-- Backlinks table
CREATE TABLE IF NOT EXISTS backlinks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    target_url TEXT NOT NULL,
    anchor_text TEXT,
    domain_authority INTEGER DEFAULT 0,
    page_authority INTEGER DEFAULT 0,
    link_type VARCHAR(20) DEFAULT 'dofollow' CHECK (link_type IN ('dofollow', 'nofollow')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'broken', 'lost')),
    discovered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    blog_url TEXT NOT NULL,
    title TEXT NOT NULL,
    publish_date TIMESTAMP,
    word_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0, -- in minutes
    views INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    seo_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backlinks_client_id ON backlinks(client_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_status ON backlinks(status);
CREATE INDEX IF NOT EXISTS idx_backlinks_discovered_date ON backlinks(discovered_date);
CREATE INDEX IF NOT EXISTS idx_blogs_client_id ON blogs(client_id);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_publish_date ON blogs(publish_date);

-- Insert sample data for testing
INSERT INTO backlinks (client_id, source_url, target_url, anchor_text, domain_authority, page_authority, link_type, status) VALUES
(1, 'https://example-health-blog.com/health-tips', 'https://promedhca.com/services', 'ProMed Healthcare Services', 45, 38, 'dofollow', 'active'),
(1, 'https://local-business-directory.com', 'https://promedhca.com', 'ProMed Healthcare Associates', 32, 25, 'dofollow', 'active'),
(1, 'https://health-news-site.com/article', 'https://promedhca.com/contact', 'contact ProMed Healthcare', 67, 52, 'nofollow', 'active'),
(67, 'https://medical-resources.com', 'https://alignprimary.com', 'Align Primary Care', 58, 41, 'dofollow', 'active'),
(67, 'https://healthcare-directory.net', 'https://alignprimary.com/services', 'primary care services', 29, 22, 'dofollow', 'active');

INSERT INTO blogs (client_id, blog_url, title, publish_date, word_count, reading_time, views, shares, comments, seo_score, status) VALUES
(1, 'https://promedhca.com/blog/diabetes-management', 'Diabetes Management: A Complete Guide', '2025-10-15 10:00:00', 1200, 5, 156, 23, 8, 85, 'published'),
(1, 'https://promedhca.com/blog/preventive-care', 'The Importance of Preventive Care', '2025-10-10 14:30:00', 950, 4, 89, 12, 5, 78, 'published'),
(1, 'https://promedhca.com/blog/weight-loss-tips', 'Effective Weight Loss Strategies', '2025-10-05 09:15:00', 1100, 5, 203, 34, 12, 92, 'published'),
(67, 'https://alignprimary.com/blog/primary-care-benefits', 'Benefits of Regular Primary Care', '2025-10-12 11:00:00', 800, 3, 67, 9, 3, 71, 'published'),
(67, 'https://alignprimary.com/blog/health-screening', 'Health Screening Guidelines', '2025-10-08 16:45:00', 1050, 4, 124, 18, 7, 83, 'published');

-- Show results
SELECT 
  'backlinks' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT client_id) as clients_with_data
FROM backlinks
UNION ALL
SELECT 
  'blogs' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT client_id) as clients_with_data
FROM blogs;
