-- Google Analytics Data Table
-- Dedicated table for storing Google Analytics data with proper structure

CREATE TABLE IF NOT EXISTS google_analytics_data (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id VARCHAR(100), -- GA4 Property ID
    date DATE NOT NULL,
    
    -- Main Metrics
    page_views INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    avg_session_duration DECIMAL(10,2) DEFAULT 0, -- in seconds
    
    -- Additional Data (stored as JSONB for flexibility)
    top_pages JSONB, -- Array of {page: string, pageViews: number}
    traffic_sources JSONB, -- Array of {source: string, sessions: number}
    country_breakdown JSONB, -- Object {country: count}
    state_breakdown JSONB, -- Object {state: count}
    device_breakdown JSONB, -- Object {device: count}
    
    -- Metadata
    metadata JSONB, -- Additional info like cached_at, api_source, etc.
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint: one record per client per date
    UNIQUE(client_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_analytics_client_date ON google_analytics_data(client_id, date);
CREATE INDEX IF NOT EXISTS idx_google_analytics_property ON google_analytics_data(property_id);
CREATE INDEX IF NOT EXISTS idx_google_analytics_date ON google_analytics_data(date);
CREATE INDEX IF NOT EXISTS idx_google_analytics_updated ON google_analytics_data(updated_at);

-- Comments for documentation
COMMENT ON TABLE google_analytics_data IS 'Stores Google Analytics data for each client per date. One record per client per day.';
COMMENT ON COLUMN google_analytics_data.property_id IS 'GA4 Property ID (numeric format)';
COMMENT ON COLUMN google_analytics_data.top_pages IS 'Array of top pages with pageViews: [{page: "/", pageViews: 125}]';
COMMENT ON COLUMN google_analytics_data.traffic_sources IS 'Array of traffic sources: [{source: "Google", sessions: 50}]';
COMMENT ON COLUMN google_analytics_data.country_breakdown IS 'Object with country counts: {"United States": 45, "Canada": 10}';
COMMENT ON COLUMN google_analytics_data.state_breakdown IS 'Object with state counts: {"California": 20, "New York": 15}';

