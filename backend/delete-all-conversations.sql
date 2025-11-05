-- Delete all conversations and related data
-- ⚠️ WARNING: This will PERMANENTLY DELETE all conversations, messages, and session data

-- 1. Delete all messages first (foreign key constraint)
DELETE FROM widget_messages;

-- 2. Delete all handover requests
DELETE FROM handover_requests;

-- 3. Delete all conversations
DELETE FROM widget_conversations;

-- 4. Delete all visitor session tracking data
DELETE FROM widget_visitor_sessions;
DELETE FROM widget_page_views;
DELETE FROM widget_visitor_events;

-- 5. Delete legacy visitor_sessions if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'visitor_sessions') THEN
    DELETE FROM visitor_sessions;
  END IF;
END $$;

-- Show summary
SELECT 
  'Conversations Remaining' as action,
  COUNT(*) as count
FROM widget_conversations
UNION ALL
SELECT 
  'Messages Remaining' as action,
  COUNT(*) as count
FROM widget_messages
UNION ALL
SELECT 
  'Handover Requests Remaining' as action,
  COUNT(*) as count
FROM handover_requests
UNION ALL
SELECT 
  'Visitor Sessions Remaining' as action,
  COUNT(*) as count
FROM widget_visitor_sessions;

