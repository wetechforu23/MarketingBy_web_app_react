-- Delete all conversations and related data
-- Run with: psql "$DATABASE_URL" -f delete-all-conversations.sql

BEGIN;

-- 1. Delete WhatsApp messages
DELETE FROM whatsapp_messages;
SELECT 'Deleted WhatsApp messages' as status;

-- 2. Delete all widget messages
DELETE FROM widget_messages;
SELECT 'Deleted widget messages' as status;

-- 3. Delete all handover requests
DELETE FROM handover_requests;
SELECT 'Deleted handover requests' as status;

-- 4. Delete ALL conversations (active, inactive, ended - everything)
DELETE FROM widget_conversations;
SELECT 'Deleted all conversations' as status;

-- 5. Delete visitor session tracking data
DELETE FROM widget_visitor_sessions;
SELECT 'Deleted visitor sessions' as status;

DELETE FROM widget_page_views;
SELECT 'Deleted page views' as status;

DELETE FROM widget_visitor_events;
SELECT 'Deleted visitor events' as status;

-- 6. Delete legacy visitor sessions if exists
DO $$ 
BEGIN
    DELETE FROM visitor_sessions;
    RAISE NOTICE 'Deleted legacy visitor sessions';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'visitor_sessions table does not exist (skipped)';
END $$;

COMMIT;

-- Show summary
SELECT 
    (SELECT COUNT(*) FROM widget_conversations) as conversations_remaining,
    (SELECT COUNT(*) FROM widget_messages) as messages_remaining,
    (SELECT COUNT(*) FROM handover_requests) as handover_requests_remaining,
    (SELECT COUNT(*) FROM whatsapp_messages) as whatsapp_messages_remaining;
