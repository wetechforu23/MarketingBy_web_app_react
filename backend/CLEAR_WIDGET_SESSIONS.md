# Clear Widget Sessions - Instructions

This guide will help you clear all sessions for widget `wtfu_464ed6cab852594fce9034020d77dee3`.

## Option 1: Using Heroku CLI (Recommended)

Run this SQL script directly on Heroku database:

```bash
cd backend
heroku pg:psql --app marketingby-wetechforu -f database/clear_widget_sessions.sql
```

Or run the SQL commands directly:

```bash
heroku pg:psql --app marketingby-wetechforu
```

Then paste this SQL:

```sql
-- Find widget ID
SELECT id, widget_name FROM widget_configs WHERE widget_key = 'wtfu_464ed6cab852594fce9034020d77dee3';

-- Delete all messages (replace WIDGET_ID with the ID from above)
DELETE FROM widget_messages 
WHERE conversation_id IN (
  SELECT id FROM widget_conversations WHERE widget_id = WIDGET_ID
);

-- Delete all handover requests
DELETE FROM handover_requests WHERE widget_id = WIDGET_ID;

-- Delete all visitor sessions
DELETE FROM widget_visitor_sessions WHERE widget_id = WIDGET_ID;

-- Delete all conversations
DELETE FROM widget_conversations WHERE widget_id = WIDGET_ID;
```

## Option 2: Clear Browser Storage

After clearing database, you also need to clear browser storage:

1. **Open Browser DevTools** (Press F12 or Right-click → Inspect)
2. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Local Storage**:
   - Find your domain (e.g., `marketingby.wetechforu.com`)
   - Delete all keys containing: `wtfu_464ed6cab852594fce9034020d77dee3`
   - Delete all keys containing: `visitor_session_id`
   - Delete keys like: `wetechforu_widget_visitor_session_id`
4. **Session Storage**:
   - Same domain
   - Delete all keys containing: `wtfu_464ed6cab852594fce9034020d77dee3`
   - Delete keys like: `wetechforu_welcome_shown_wtfu_464ed6cab852594fce9034020d77dee3`

## Quick JavaScript Console Command

You can also run this in the browser console on the page with the widget:

```javascript
// Clear all localStorage keys related to this widget
Object.keys(localStorage).forEach(key => {
  if (key.includes('wtfu_464ed6cab852594fce9034020d77dee3') || 
      key.includes('visitor_session_id') ||
      key.includes('wetechforu_widget')) {
    localStorage.removeItem(key);
    console.log('Deleted:', key);
  }
});

// Clear all sessionStorage keys
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('wtfu_464ed6cab852594fce9034020d77dee3') || 
      key.includes('wetechforu_welcome_shown')) {
    sessionStorage.removeItem(key);
    console.log('Deleted:', key);
  }
});

console.log('✅ Browser storage cleared!');
```

## What Gets Deleted

- ✅ All conversations for this widget
- ✅ All messages in those conversations
- ✅ All visitor sessions
- ✅ All handover requests
- ⚠️ Browser storage (localStorage/sessionStorage) must be cleared manually

