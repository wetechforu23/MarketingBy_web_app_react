-- ================================================
-- MULTIPLE WHATSAPP NUMBERS PER WIDGET
-- ================================================
-- Allow assigning different WhatsApp numbers to different conversations
-- This creates separate WhatsApp threads for each user
-- ================================================

-- Add column to widget_configs to store multiple WhatsApp numbers
ALTER TABLE widget_configs 
ADD COLUMN IF NOT EXISTS whatsapp_number_pool JSONB DEFAULT '[]';

-- Add column to widget_conversations to track which WhatsApp number was assigned
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS assigned_whatsapp_number VARCHAR(50);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_number 
ON widget_conversations(assigned_whatsapp_number) 
WHERE assigned_whatsapp_number IS NOT NULL;

COMMENT ON COLUMN widget_configs.whatsapp_number_pool IS 'Array of WhatsApp numbers available for this widget. Format: [{"number": "+14155238886", "display_name": "Support Team 1", "is_active": true}]';
COMMENT ON COLUMN widget_conversations.assigned_whatsapp_number IS 'The specific WhatsApp number assigned to this conversation for separate threading';

-- ================================================
-- FUNCTION: Assign WhatsApp number to conversation
-- ================================================
CREATE OR REPLACE FUNCTION assign_whatsapp_number_to_conversation(
    p_widget_id INTEGER,
    p_conversation_id INTEGER
) RETURNS VARCHAR(50) AS $$
DECLARE
    v_number_pool JSONB;
    v_assigned_number VARCHAR(50);
    v_default_number VARCHAR(50);
    v_active_numbers JSONB;
    v_least_used_number JSONB;
    v_usage_count INTEGER;
BEGIN
    -- Get widget's WhatsApp number pool
    SELECT whatsapp_number_pool, handover_whatsapp_number
    INTO v_number_pool, v_default_number
    FROM widget_configs
    WHERE id = p_widget_id;
    
    -- If no pool configured or empty, use default number
    IF v_number_pool IS NULL OR v_number_pool = '[]'::JSONB THEN
        v_assigned_number := v_default_number;
    ELSE
        -- Filter to active numbers only
        v_active_numbers := (
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements(v_number_pool) elem
            WHERE elem->>'is_active' = 'true'
        );
        
        -- If no active numbers in pool, use default
        IF v_active_numbers IS NULL OR v_active_numbers = '[]'::JSONB THEN
            v_assigned_number := v_default_number;
        ELSE
            -- Find least-used active number (for load balancing)
            SELECT elem, COUNT(wc.id)
            INTO v_least_used_number, v_usage_count
            FROM jsonb_array_elements(v_active_numbers) elem
            LEFT JOIN widget_conversations wc 
                ON wc.assigned_whatsapp_number = elem->>'number'
                AND wc.status = 'active'
                AND wc.widget_id = p_widget_id
            GROUP BY elem
            ORDER BY COUNT(wc.id) ASC, elem->>'number'
            LIMIT 1;
            
            v_assigned_number := v_least_used_number->>'number';
        END IF;
    END IF;
    
    -- Assign to conversation
    UPDATE widget_conversations
    SET assigned_whatsapp_number = v_assigned_number
    WHERE id = p_conversation_id;
    
    RETURN v_assigned_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_whatsapp_number_to_conversation IS 'Automatically assigns a WhatsApp number from the pool to a conversation, using load balancing';

