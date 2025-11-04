-- Clear all sessions for widget wtfu_464ed6cab852594fce9034020d77dee3
-- This script deletes all conversations, messages, visitor sessions, and handover requests

-- Step 1: Find widget ID
DO $$
DECLARE
    widget_id_var INTEGER;
    conv_count INTEGER;
    msg_count INTEGER;
    visitor_count INTEGER;
    handover_count INTEGER;
BEGIN
    -- Find widget ID
    SELECT id INTO widget_id_var 
    FROM widget_configs 
    WHERE widget_key = 'wtfu_464ed6cab852594fce9034020d77dee3';

    IF widget_id_var IS NULL THEN
        RAISE NOTICE 'Widget wtfu_464ed6cab852594fce9034020d77dee3 not found!';
        RETURN;
    END IF;

    RAISE NOTICE 'Found widget ID: %', widget_id_var;

    -- Count records before deletion
    SELECT COUNT(*) INTO conv_count FROM widget_conversations WHERE widget_id = widget_id_var;
    SELECT COUNT(*) INTO msg_count FROM widget_messages WHERE conversation_id IN (SELECT id FROM widget_conversations WHERE widget_id = widget_id_var);
    SELECT COUNT(*) INTO visitor_count FROM widget_visitor_sessions WHERE widget_id = widget_id_var;
    SELECT COUNT(*) INTO handover_count FROM handover_requests WHERE widget_id = widget_id_var;

    RAISE NOTICE 'Found % conversations, % messages, % visitor sessions, % handover requests', 
        conv_count, msg_count, visitor_count, handover_count;

    -- Delete all messages for conversations belonging to this widget
    DELETE FROM widget_messages 
    WHERE conversation_id IN (SELECT id FROM widget_conversations WHERE widget_id = widget_id_var);
    
    RAISE NOTICE 'Deleted % messages', msg_count;

    -- Delete all handover requests
    DELETE FROM handover_requests WHERE widget_id = widget_id_var;
    RAISE NOTICE 'Deleted % handover requests', handover_count;

    -- Delete all visitor sessions
    DELETE FROM widget_visitor_sessions WHERE widget_id = widget_id_var;
    RAISE NOTICE 'Deleted % visitor sessions', visitor_count;

    -- Delete all conversations
    DELETE FROM widget_conversations WHERE widget_id = widget_id_var;
    RAISE NOTICE 'Deleted % conversations', conv_count;

    RAISE NOTICE '✅ All sessions cleared for widget wtfu_464ed6cab852594fce9034020d77dee3';
    RAISE NOTICE '📝 Please clear browser localStorage and sessionStorage manually:';
    RAISE NOTICE '   - Keys containing: wtfu_464ed6cab852594fce9034020d77dee3';
    RAISE NOTICE '   - Keys containing: visitor_session_id';
END $$;

