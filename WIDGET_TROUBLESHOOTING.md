# 🔧 Widget Troubleshooting Guide

## 🚨 Common Issues & Solutions

### ❌ **ISSUE 1: CORS Errors on Widget**

**Error in Console:**
```
Access to fetch at '.../api/visitor-tracking/...' has been blocked by CORS policy
No 'Access-Control-Allow-Origin' header is present
```

**Solution:**
✅ Make sure `server.ts` CORS middleware includes all public widget routes:
- `/api/chat-widget/public/`
- `/api/visitor-tracking/public/`
- `/api/chat-widget/wtfu_[hash]/`
- `/api/visitor-tracking/public/widget/wtfu_[hash]/`

**Location:** `backend/src/server.ts` (lines 82-85)

---

### ❌ **ISSUE 2: Widget Not Loading Latest Code**

**Symptom:** Changes deployed but widget still shows old behavior

**Causes:**
1. Browser cache
2. CDN cache
3. WordPress plugin cache
4. Service worker cache

**Solutions:**

**A) Force Browser Cache Clear:**
```
1. Hard Reload: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear Cache: DevTools → Network tab → "Disable cache" checkbox
3. Incognito Mode: Test in new private window
```

**B) Clear WordPress Cache:**
```
1. Go to WordPress Admin → Plugins
2. Deactivate "WeTechForU Chat Widget"
3. Delete plugin
4. Re-download latest ZIP from dashboard
5. Install fresh copy
```

**C) Server Cache Settings:**
Widget cache is set in `server.ts`:
```javascript
// Current: 5 minutes (development)
res.setHeader('Cache-Control', 'public, max-age=300');

// Production: 24 hours
res.setHeader('Cache-Control', 'public, max-age=86400');
```

**D) Force Widget Reload with Version Query:**
WordPress plugin already includes timestamp:
```php
<?php echo time(); ?> // Generates unique ?v=timestamp
```

---

### ❌ **ISSUE 3: Visitor Tracking Not Working**

**Error in Console:**
```
Failed to start visitor tracking: TypeError: Failed to fetch
```

**Checklist:**
- ✅ CORS middleware includes `/api/visitor-tracking/public/`
- ✅ Visitor tracking routes registered in `server.ts`
- ✅ Database tables created (`widget_visitor_sessions`, `widget_page_views`, `widget_visitor_events`)
- ✅ Widget includes tracking code in `wetechforu-widget-v2.js`

**Test Tracking:**
```javascript
// Open browser console on website
console.log(window.WeTechForUWidget.state.tracking);
// Should show: { sessionId, heartbeatInterval, ... }
```

---

### ❌ **ISSUE 4: Conversations Not Appearing in Portal**

**Possible Causes:**
1. Conversation not created (CORS error)
2. Widget key mismatch
3. Database query error
4. Client ID filter issue

**Debug Steps:**

**1. Check Widget Key:**
```javascript
// On website console:
console.log(window.WeTechForUWidget.config.widgetKey);
// Should match: wtfu_[32-char-hex]
```

**2. Check Database:**
```sql
-- Check if conversation exists
SELECT * FROM widget_conversations 
WHERE widget_id = (
  SELECT id FROM widget_configs WHERE widget_key = 'wtfu_...'
) 
ORDER BY created_at DESC LIMIT 10;
```

**3. Check Console for Errors:**
```
- Look for "Failed to create conversation"
- Look for CORS errors on /api/chat-widget/.../conversation
- Look for 400/500 HTTP status codes
```

**4. Verify Widget Config Loaded:**
```javascript
// On website console:
console.log(window.WeTechForUWidget.config);
// Should show: botName, welcomeMessage, backendUrl, etc.
```

---

### ❌ **ISSUE 5: Widget Not Showing on Website**

**Checklist:**
- ✅ WordPress plugin installed & activated
- ✅ Widget key entered in plugin settings
- ✅ Backend URL correct in plugin settings
- ✅ Widget enabled in plugin settings
- ✅ No JavaScript errors in console

**Test Widget Load:**
```javascript
// Check if widget script loaded:
console.log(window.WeTechForUWidget);
// Should show: { init: function, config: {}, state: {}, ... }

// Check if widget initialized:
console.log(document.getElementById('wetechforu-chat-button'));
// Should show: <div id="wetechforu-chat-button">...</div>
```

---

## 🔍 Debugging Tools

### **1. Chrome DevTools**
```
F12 → Console tab: Check for errors
F12 → Network tab: Check API requests
F12 → Application tab: Check sessionStorage
```

### **2. Test Widget Directly**
```html
<!-- Add to test page -->
<script src="https://your-backend.com/public/wetechforu-widget-v2.js"></script>
<script>
  WeTechForUWidget.init({
    widgetKey: 'wtfu_YOUR_KEY_HERE',
    backendUrl: 'https://your-backend.com'
  });
</script>
```

### **3. Check Backend Logs**
```bash
# Heroku logs
heroku logs --tail --app marketingby-wetechforu

# Look for:
# - CORS errors
# - 400/500 status codes
# - Database errors
# - "Failed to..." messages
```

---

## ✅ Deployment Checklist

Before deploying widget changes:

1. ✅ Test locally first
2. ✅ Check CORS middleware includes all routes
3. ✅ Verify database migrations run
4. ✅ Clear browser cache after deploy
5. ✅ Test on actual website (not just localhost)
6. ✅ Check Heroku logs for errors
7. ✅ Verify conversations appear in portal
8. ✅ Verify visitor tracking works
9. ✅ Test widget on mobile
10. ✅ Update WordPress plugin ZIP if needed

---

## 📞 Quick Fixes

### **Reset Everything:**
```bash
# 1. Clear browser cache (Ctrl+Shift+Delete)
# 2. Reinstall WordPress plugin
# 3. Restart Heroku dynos
heroku ps:restart --app marketingby-wetechforu
# 4. Test in incognito mode
```

### **Force Widget Update:**
```bash
# Change widget version in database
UPDATE widget_configs SET updated_at = NOW();

# Or change cache-control in server.ts
# Set max-age=0 for immediate refresh
```

---

## 🎯 Testing After Fix

1. ✅ Open website in incognito mode
2. ✅ Check console for CORS errors (should be none)
3. ✅ Open chat widget
4. ✅ Send a message
5. ✅ Check dashboard → Chat Conversations (message should appear)
6. ✅ Check dashboard → Visitor Monitoring (visitor should appear)
7. ✅ Navigate to another page
8. ✅ Check "Pages Viewed" increases in monitoring

---

**Last Updated:** 2025-10-24  
**Version:** v331

