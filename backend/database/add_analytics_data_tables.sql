-- Analytics Data Storage Tables
-- This script creates tables to store Google Analytics and other analytics data by date and client

-- Table for storing Google Analytics data
CREATE TABLE IF NOT EXISTS analytics_data (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'google_analytics', 'facebook', 'search_console', etc.
    date DATE NOT NULL,
    data_type VARCHAR(100) NOT NULL, -- 'page_views', 'sessions', 'bounce_rate', 'users', etc.
    value DECIMAL(15,2) NOT NULL,
    metadata JSONB, -- Additional data like device type, traffic source, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(client_id, service_type, date, data_type)
);

-- Table for storing analytics reports
CREATE TABLE IF NOT EXISTS analytics_reports (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    report_data JSONB NOT NULL, -- Complete report data
    generated_at TIMESTAMP DEFAULT NOW(),
    generated_by INTEGER REFERENCES users(id),
    is_exported BOOLEAN DEFAULT FALSE,
    export_path VARCHAR(500)
);

-- Table for storing analytics sync logs
CREATE TABLE IF NOT EXISTS analytics_sync_logs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'manual'
    date_from DATE,
    date_to DATE,
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    synced_by INTEGER REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_data_client_date ON analytics_data(client_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_data_service_type ON analytics_data(service_type);
CREATE INDEX IF NOT EXISTS idx_analytics_data_data_type ON analytics_data(data_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_client ON analytics_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_date_range ON analytics_reports(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_analytics_sync_logs_client ON analytics_sync_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sync_logs_status ON analytics_sync_logs(status);

-- Comments for documentation
COMMENT ON TABLE analytics_data IS 'Stores daily analytics data for each client and service';
COMMENT ON TABLE analytics_reports IS 'Stores generated analytics reports with export capabilities';
COMMENT ON TABLE analytics_sync_logs IS 'Tracks analytics data synchronization activities';
