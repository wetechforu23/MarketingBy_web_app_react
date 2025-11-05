-- Clear all chats and sessions for fresh WhatsApp handover testing
-- ⚠️ WARNING: This will deactivate ALL conversations and clear ALL session data

-- 1. Deactivate all active conversations
UPDATE widget_conversations
SET 
  status = 'ended',
  agent_handoff = false,
  handoff_requested = false,
  ended_at = NOW(),
  updated_at = NOW()
WHERE status = 'active';

-- 2. Clear all visitor session IDs (reset to NULL)
UPDATE widget_conversations
SET visitor_session_id = NULL
WHERE visitor_session_id IS NOT NULL;

-- 3. Clear all handover requests (mark as completed/cancelled)
UPDATE handover_requests
SET 
  status = 'completed',
  updated_at = NOW()
WHERE status IN ('pending', 'notified', 'queued');

-- 4. Clear all visitor session tracking data
DELETE FROM widget_visitor_sessions;
DELETE FROM widget_page_views;
DELETE FROM widget_visitor_events;

-- Also clear visitor_sessions if it exists (legacy table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'visitor_sessions') THEN
    DELETE FROM visitor_sessions;
  END IF;
END $$;

-- 5. Reset conversation activity timestamps
UPDATE widget_conversations
SET 
  last_activity_at = NULL,
  last_visitor_activity_at = NULL,
  last_agent_activity_at = NULL,
  extension_reminders_count = 0,
  visitor_extension_reminders_count = 0,
  extension_granted_until = NULL
WHERE last_activity_at IS NOT NULL;

-- 6. Clear message counts (optional - uncomment if you want to reset message counts)
-- UPDATE widget_conversations
-- SET message_count = 0, bot_response_count = 0, unread_agent_messages = 0;

-- Show summary
SELECT 
  'Deactivated Conversations' as action,
  COUNT(*) as count
FROM widget_conversations
WHERE status = 'ended'
UNION ALL
SELECT 
  'Active Conversations Remaining' as action,
  COUNT(*) as count
FROM widget_conversations
WHERE status = 'active'
UNION ALL
SELECT 
  'Conversations with Session IDs' as action,
  COUNT(*) as count
FROM widget_conversations
WHERE visitor_session_id IS NOT NULL
UNION ALL
SELECT 
  'Pending Handover Requests' as action,
  COUNT(*) as count
FROM handover_requests
WHERE status IN ('pending', 'notified', 'queued');

