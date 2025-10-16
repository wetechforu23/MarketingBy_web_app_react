-- Create local search grids table
CREATE TABLE IF NOT EXISTS local_search_grids (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    search_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    competitor_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    local_seo_score INTEGER DEFAULT 0,
    ranking_trends JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (client_id)
);

-- Create local search rankings history table
CREATE TABLE IF NOT EXISTS local_search_rankings (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    search_query VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    total_results INTEGER DEFAULT 0,
    competitor_count INTEGER DEFAULT 0,
    market_share_estimate DECIMAL(5,2) DEFAULT 0.00,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (client_id, search_query, recorded_at)
);

-- Create local search competitors table
CREATE TABLE IF NOT EXISTS local_search_competitors (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    competitor_place_id VARCHAR(255) NOT NULL,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_address TEXT,
    competitor_rating DECIMAL(3,2),
    competitor_review_count INTEGER DEFAULT 0,
    competitor_type VARCHAR(50) DEFAULT 'indirect', -- 'direct', 'indirect'
    market_share_estimate DECIMAL(5,2) DEFAULT 0.00,
    strengths JSONB DEFAULT '[]'::jsonb,
    weaknesses JSONB DEFAULT '[]'::jsonb,
    distance_meters INTEGER,
    website_url VARCHAR(500),
    phone_number VARCHAR(50),
    business_status VARCHAR(50) DEFAULT 'OPERATIONAL',
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (client_id, competitor_place_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_local_search_grids_client_id ON local_search_grids (client_id);
CREATE INDEX IF NOT EXISTS idx_local_search_grids_generated_at ON local_search_grids (generated_at);

CREATE INDEX IF NOT EXISTS idx_local_search_rankings_client_id ON local_search_rankings (client_id);
CREATE INDEX IF NOT EXISTS idx_local_search_rankings_query ON local_search_rankings (search_query);
CREATE INDEX IF NOT EXISTS idx_local_search_rankings_recorded_at ON local_search_rankings (recorded_at);

CREATE INDEX IF NOT EXISTS idx_local_search_competitors_client_id ON local_search_competitors (client_id);
CREATE INDEX IF NOT EXISTS idx_local_search_competitors_type ON local_search_competitors (competitor_type);
CREATE INDEX IF NOT EXISTS idx_local_search_competitors_rating ON local_search_competitors (competitor_rating);

-- Add comments for documentation
COMMENT ON TABLE local_search_grids IS 'Stores comprehensive local search analysis results for each client';
COMMENT ON TABLE local_search_rankings IS 'Historical tracking of local search rankings for trend analysis';
COMMENT ON TABLE local_search_competitors IS 'Detailed competitor information from local search results';

COMMENT ON COLUMN local_search_grids.search_queries IS 'Array of search queries used for local search analysis';
COMMENT ON COLUMN local_search_grids.search_results IS 'JSON object containing search results for each query';
COMMENT ON COLUMN local_search_grids.competitor_analysis IS 'Comprehensive competitor analysis including market share and gaps';
COMMENT ON COLUMN local_search_grids.local_seo_score IS 'Overall local SEO score (0-100) based on rankings and competition';
COMMENT ON COLUMN local_search_grids.ranking_trends IS 'Historical ranking trends and changes for each query';

COMMENT ON COLUMN local_search_rankings.position IS 'Ranking position in search results (1-based)';
COMMENT ON COLUMN local_search_rankings.market_share_estimate IS 'Estimated market share percentage for this query';

COMMENT ON COLUMN local_search_competitors.competitor_type IS 'Type of competitor: direct (same services) or indirect (related services)';
COMMENT ON COLUMN local_search_competitors.market_share_estimate IS 'Estimated market share percentage for this competitor';
COMMENT ON COLUMN local_search_competitors.strengths IS 'Array of competitor strengths identified';
COMMENT ON COLUMN local_search_competitors.weaknesses IS 'Array of competitor weaknesses identified';
