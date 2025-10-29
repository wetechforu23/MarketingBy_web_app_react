-- ==========================================
-- LLM INTEGRATION WITH CLIENT CREDIT LIMITS
-- Created: 2025-10-25
-- Purpose: Add AI/LLM capabilities with free credit tracking per client
-- ==========================================

-- Add LLM configuration to widget_configs
ALTER TABLE widget_configs
ADD COLUMN IF NOT EXISTS llm_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50) DEFAULT 'gemini', -- gemini, openai, groq, claude
ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100) DEFAULT 'gemini-pro',
ADD COLUMN IF NOT EXISTS llm_temperature DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS llm_max_tokens INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS fallback_to_knowledge_base BOOLEAN DEFAULT true;

-- Client LLM usage tracking table
CREATE TABLE IF NOT EXISTS client_llm_usage (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  
  -- Credit Limits
  monthly_token_limit INTEGER DEFAULT 100000, -- 100K tokens/month free
  daily_token_limit INTEGER DEFAULT 5000, -- 5K tokens/day
  monthly_request_limit INTEGER DEFAULT 1000, -- 1K requests/month
  daily_request_limit INTEGER DEFAULT 100, -- 100 requests/day
  
  -- Current Usage (resets automatically)
  tokens_used_this_month INTEGER DEFAULT 0,
  tokens_used_today INTEGER DEFAULT 0,
  requests_made_this_month INTEGER DEFAULT 0,
  requests_made_today INTEGER DEFAULT 0,
  
  -- Usage History
  total_tokens_used BIGINT DEFAULT 0,
  total_requests_made BIGINT DEFAULT 0,
  
  -- Reset Timestamps
  last_daily_reset DATE DEFAULT CURRENT_DATE,
  last_monthly_reset DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE),
  
  -- Status
  credits_exhausted BOOLEAN DEFAULT false,
  credits_exhausted_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(client_id, widget_id)
);

-- LLM request log (for analytics and debugging)
CREATE TABLE IF NOT EXISTS llm_request_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  widget_id INTEGER REFERENCES widget_configs(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
  
  -- Request Details
  llm_provider VARCHAR(50) NOT NULL,
  llm_model VARCHAR(100) NOT NULL,
  prompt_text TEXT,
  response_text TEXT,
  
  -- Token Usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Performance
  response_time_ms INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'success', -- success, failed, rate_limited, credits_exhausted
  error_message TEXT,
  
  -- Cost Tracking (if using paid tier later)
  estimated_cost DECIMAL(10,6) DEFAULT 0.00,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_llm_usage_client ON client_llm_usage(client_id);
CREATE INDEX IF NOT EXISTS idx_client_llm_usage_widget ON client_llm_usage(widget_id);
CREATE INDEX IF NOT EXISTS idx_llm_logs_client_date ON llm_request_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_logs_widget_date ON llm_request_logs(widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_logs_status ON llm_request_logs(status);

-- Function to reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_llm_usage() RETURNS void AS $$
BEGIN
  UPDATE client_llm_usage
  SET 
    tokens_used_today = 0,
    requests_made_today = 0,
    last_daily_reset = CURRENT_DATE,
    credits_exhausted = false,
    updated_at = CURRENT_TIMESTAMP
  WHERE last_daily_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly counters
CREATE OR REPLACE FUNCTION reset_monthly_llm_usage() RETURNS void AS $$
BEGIN
  UPDATE client_llm_usage
  SET 
    tokens_used_this_month = 0,
    requests_made_this_month = 0,
    last_monthly_reset = DATE_TRUNC('month', CURRENT_DATE),
    credits_exhausted = false,
    updated_at = CURRENT_TIMESTAMP
  WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to check if client has credits
CREATE OR REPLACE FUNCTION check_client_llm_credits(
  p_client_id INTEGER,
  p_widget_id INTEGER,
  p_estimated_tokens INTEGER DEFAULT 500
) RETURNS BOOLEAN AS $$
DECLARE
  v_usage RECORD;
BEGIN
  -- Get current usage
  SELECT * INTO v_usage
  FROM client_llm_usage
  WHERE client_id = p_client_id AND widget_id = p_widget_id;
  
  -- If no record, assume credits available (will be created on first use)
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check if credits exhausted flag is set
  IF v_usage.credits_exhausted THEN
    RETURN FALSE;
  END IF;
  
  -- Check daily limits
  IF v_usage.tokens_used_today + p_estimated_tokens > v_usage.daily_token_limit THEN
    RETURN FALSE;
  END IF;
  
  IF v_usage.requests_made_today >= v_usage.daily_request_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Check monthly limits
  IF v_usage.tokens_used_this_month + p_estimated_tokens > v_usage.monthly_token_limit THEN
    RETURN FALSE;
  END IF;
  
  IF v_usage.requests_made_this_month >= v_usage.monthly_request_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE client_llm_usage IS 'Track LLM usage and enforce credit limits per client';
COMMENT ON TABLE llm_request_logs IS 'Detailed logs of all LLM API requests for analytics';
COMMENT ON COLUMN client_llm_usage.monthly_token_limit IS 'Free token limit per month (default 100K)';
COMMENT ON COLUMN client_llm_usage.daily_token_limit IS 'Free token limit per day (default 5K)';
COMMENT ON FUNCTION check_client_llm_credits IS 'Returns TRUE if client has sufficient credits';

-- Initialize LLM usage tracking for existing clients
INSERT INTO client_llm_usage (client_id, widget_id, monthly_token_limit, daily_token_limit)
SELECT c.id, wc.id, 100000, 5000
FROM clients c
CROSS JOIN widget_configs wc
WHERE wc.client_id = c.id
ON CONFLICT (client_id, widget_id) DO NOTHING;

