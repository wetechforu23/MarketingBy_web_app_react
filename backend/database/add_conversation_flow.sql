-- ================================================
-- CONVERSATION FLOW SYSTEM
-- ================================================
-- Adds configurable conversation flow to widget_configs
-- Allows clients to customize bot response order
-- ================================================

-- Add conversation_flow column to widget_configs
ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS conversation_flow JSONB DEFAULT '[
  {
    "id": 1,
    "type": "greeting",
    "order": 1,
    "locked": true,
    "enabled": true,
    "removable": false,
    "settings": {
      "message": "Hi! 👋 How can I help you today?"
    }
  },
  {
    "id": 2,
    "type": "knowledge_base",
    "order": 2,
    "locked": false,
    "enabled": true,
    "removable": false,
    "settings": {
      "min_confidence": 0.7,
      "max_results": 3,
      "show_similar": true,
      "fallback_message": "I couldn''t find an exact answer, but here are some similar topics..."
    }
  },
  {
    "id": 3,
    "type": "ai_response",
    "order": 3,
    "locked": false,
    "enabled": true,
    "removable": true,
    "settings": {
      "fallback_message": "Let me connect you with our team for personalized assistance...",
      "max_attempts": 1
    }
  },
  {
    "id": 4,
    "type": "agent_handoff",
    "order": 4,
    "locked": true,
    "enabled": true,
    "removable": false,
    "settings": {
      "collect_contact_info": true,
      "offline_message": "Our team is currently offline. Please leave your details and we''ll get back to you soon.",
      "online_message": "Let me connect you with a live agent..."
    }
  }
]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN widget_configs.conversation_flow IS 'Configurable conversation flow steps (greeting -> knowledge_base -> ai_response -> agent_handoff). Clients can reorder/disable steps.';

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_widget_configs_conversation_flow ON widget_configs USING GIN (conversation_flow);

-- ================================================
-- FLOW ANALYTICS TABLE (Track performance)
-- ================================================

CREATE TABLE IF NOT EXISTS conversation_flow_analytics (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER NOT NULL REFERENCES widget_configs(id) ON DELETE CASCADE,
    conversation_id INTEGER REFERENCES widget_conversations(id) ON DELETE CASCADE,
    
    -- Flow execution
    step_type VARCHAR(50) NOT NULL, -- 'greeting', 'knowledge_base', 'ai_response', 'agent_handoff'
    step_order INTEGER NOT NULL,
    
    -- Result
    resolved BOOLEAN DEFAULT false,
    resolution_message TEXT,
    confidence_score DECIMAL(3, 2), -- For KB and AI responses
    
    -- Cost tracking
    tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 6) DEFAULT 0.00,
    
    -- Performance
    response_time_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flow_analytics_widget ON conversation_flow_analytics(widget_id);
CREATE INDEX idx_flow_analytics_conversation ON conversation_flow_analytics(conversation_id);
CREATE INDEX idx_flow_analytics_step ON conversation_flow_analytics(step_type);
CREATE INDEX idx_flow_analytics_date ON conversation_flow_analytics(created_at);

COMMENT ON TABLE conversation_flow_analytics IS 'Tracks conversation flow performance to show which steps resolve queries and their costs';

-- ================================================
-- USAGE SUMMARY VIEW
-- ================================================

CREATE OR REPLACE VIEW widget_flow_performance AS
SELECT 
    w.id as widget_id,
    w.bot_name,
    c.client_name,
    
    -- Total conversations
    COUNT(DISTINCT fa.conversation_id) as total_conversations,
    
    -- Resolution by step
    SUM(CASE WHEN fa.step_type = 'knowledge_base' AND fa.resolved = true THEN 1 ELSE 0 END) as resolved_by_kb,
    SUM(CASE WHEN fa.step_type = 'ai_response' AND fa.resolved = true THEN 1 ELSE 0 END) as resolved_by_ai,
    SUM(CASE WHEN fa.step_type = 'agent_handoff' THEN 1 ELSE 0 END) as resolved_by_agent,
    
    -- Percentages
    ROUND(
        (SUM(CASE WHEN fa.step_type = 'knowledge_base' AND fa.resolved = true THEN 1 ELSE 0 END)::decimal / 
        NULLIF(COUNT(DISTINCT fa.conversation_id), 0) * 100), 1
    ) as kb_resolution_rate,
    
    ROUND(
        (SUM(CASE WHEN fa.step_type = 'ai_response' AND fa.resolved = true THEN 1 ELSE 0 END)::decimal / 
        NULLIF(COUNT(DISTINCT fa.conversation_id), 0) * 100), 1
    ) as ai_resolution_rate,
    
    -- Costs
    SUM(fa.estimated_cost) as total_cost,
    SUM(CASE WHEN fa.step_type = 'ai_response' THEN fa.estimated_cost ELSE 0 END) as ai_cost,
    
    -- Avg response times
    AVG(CASE WHEN fa.step_type = 'knowledge_base' THEN fa.response_time_ms ELSE NULL END) as avg_kb_response_ms,
    AVG(CASE WHEN fa.step_type = 'ai_response' THEN fa.response_time_ms ELSE NULL END) as avg_ai_response_ms
    
FROM widget_configs w
LEFT JOIN conversation_flow_analytics fa ON w.id = fa.widget_id
LEFT JOIN clients c ON w.client_id = c.id
GROUP BY w.id, w.bot_name, c.client_name;

COMMENT ON VIEW widget_flow_performance IS 'Summary view showing conversation flow performance and cost efficiency per widget';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Conversation flow system installed successfully';
    RAISE NOTICE '   - Added conversation_flow column to widget_configs';
    RAISE NOTICE '   - Created conversation_flow_analytics table';
    RAISE NOTICE '   - Created widget_flow_performance view';
    RAISE NOTICE '   - Default flow: Greeting → KB → AI → Agent';
END $$;

