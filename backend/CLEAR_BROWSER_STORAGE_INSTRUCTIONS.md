# Clear Browser Storage - Instructions

## ✅ Database Already Cleared!

The database has been successfully cleared:
- ✅ 12 conversations deleted
- ✅ 13 messages deleted
- ✅ 313 visitor sessions deleted
- ✅ 2 handover requests deleted

## Now Clear Browser Storage

### Method 1: Browser DevTools (Recommended)

1. **Open Browser DevTools**:
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Or Right-click → Inspect

2. **Go to Application Tab** (Chrome/Edge) or **Storage Tab** (Firefox)

3. **Clear Local Storage**:
   - Expand "Local Storage" → Click your domain (e.g., `marketingby.wetechforu.com`)
   - Look for keys containing:
     - `wtfu_464ed6cab852594fce9034020d77dee3`
     - `visitor_session_id`
     - `wetechforu_widget`
     - `wetechforu_visitor`
   - Right-click each key → Delete
   - Or click "Clear All" to remove everything (will clear other app data too)

4. **Clear Session Storage**:
   - Expand "Session Storage" → Click your domain
   - Delete keys containing:
     - `wtfu_464ed6cab852594fce9034020d77dee3`
     - `wetechforu_welcome_shown`

5. **Refresh the page** (F5 or Cmd+R / Ctrl+R)

### Method 2: Browser Console (Quick)

1. **Open Console** (F12 → Console tab)

2. **Paste and Run this code**:

```javascript
// Clear all localStorage keys related to widget
Object.keys(localStorage).forEach(key => {
  if (key.includes('wtfu_464ed6cab852594fce9034020d77dee3') || 
      key.includes('visitor_session_id') ||
      key.includes('wetechforu_widget') ||
      key.includes('wetechforu_visitor')) {
    localStorage.removeItem(key);
    console.log('✅ Deleted localStorage:', key);
  }
});

// Clear all sessionStorage keys
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('wtfu_464ed6cab852594fce9034020d77dee3') || 
      key.includes('wetechforu_welcome_shown')) {
    sessionStorage.removeItem(key);
    console.log('✅ Deleted sessionStorage:', key);
  }
});

console.log('✅ Browser storage cleared! Refresh the page.');
```

3. **Refresh the page**

### Method 3: Clear All Site Data (Nuclear Option)

If you want to clear everything for the site:

1. **Chrome/Edge**:
   - DevTools → Application → Storage → Clear site data
   - Or Settings → Privacy → Clear browsing data → Select site → Clear

2. **Firefox**:
   - DevTools → Storage → Right-click domain → Delete All

⚠️ **Warning**: This will clear ALL data for the site, not just widget data.

## Verify Everything is Cleared

After clearing, refresh the page and check:

1. Open DevTools → Application → Local Storage
2. Verify no keys containing `wtfu_464ed6cab852594fce9034020d77dee3` exist
3. Open the chat widget - it should start completely fresh with a new welcome message

## What Was Deleted from Database

- ✅ 12 conversations
- ✅ 13 messages  
- ✅ 313 visitor sessions
- ✅ 2 handover requests

All data for widget `wtfu_464ed6cab852594fce9034020d77dee3` has been removed from the database.

