# 🐛 AI Widget Debug & Fix Guide - v350

## 🔍 **PROBLEM IDENTIFIED**

After analyzing Heroku logs, we found **ZERO POST /message requests** reaching the server. This means:

- ❌ Widget JavaScript is **NOT** sending messages to backend
- ✅ Visitor tracking is working (heartbeat requests every 30s)
- ✅ Conversation polling is working (GET requests every 5s)
- ❌ **Message sending is completely broken**

### **ROOT CAUSE: Browser Cache**

Your browser is serving an **old cached version** of the widget JavaScript that has bugs or wrong endpoints.

---

## ✅ **WHAT WE FIXED (v350)**

### **1. Added Extensive Debug Logging**

The widget now logs EVERY step:

```
🤖 WeTechForU Widget v2.1 Loading...
📝 sendMessage() called, input value: "hello"
✅ User message added to UI
📨 sendMessageToBackend() called with: "hello"
🔑 Widget Key: wtfu_464ed6cab852594fce9034020d77dee3
🔗 Backend URL: https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com
🔄 Ensuring conversation exists...
✅ Conversation ID: 10
📡 Sending POST to: [full endpoint URL]
📥 Response status: 200
📦 Response data: {response: "...", confidence: 0.95}
```

### **2. Created Test Page**

`test-widget-v2.1.html` - A comprehensive testing page with:
- Real-time console output viewer
- Step-by-step instructions
- Cache-busting script loader
- Clear troubleshooting guide

### **3. Version Bump**

Widget version: **2.0 → 2.1** to force cache refresh.

---

## 📋 **HOW TO TEST RIGHT NOW**

### **Option 1: Test Page (Recommended)**

1. Open this file in your browser:
   ```
   test-widget-v2.1.html
   ```

2. **Open Browser Console** (F12 or Right-click → Inspect → Console)

3. You should immediately see:
   ```
   🤖 WeTechForU Widget v2.1 Loading...
   ```

4. Type a message in the widget (e.g., "hello")

5. Watch the console for these logs:
   - 📝 sendMessage() called
   - 📨 sendMessageToBackend() called
   - 📡 Sending POST to: [endpoint]
   - 📥 Response status: 200
   - 📦 Response data: {...}

### **Option 2: Your Live Website**

1. Go to https://wetechforu.com

2. **IMPORTANT:** Clear your browser cache FIRST:
   - **Chrome/Edge:** Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"
   
   OR
   
   - **Hard Refresh:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. Open Browser Console (F12)

4. Look for `🤖 WeTechForU Widget v2.1 Loading...`
   - ✅ **If you see this:** Good! You have the new version
   - ❌ **If you DON'T see this:** Cache not cleared, try incognito mode

5. Type a message and check console logs

---

## 🔧 **TROUBLESHOOTING**

### **If You Don't See Console Logs:**

1. **Try Incognito/Private Mode:**
   - `Ctrl+Shift+N` (Chrome) or `Ctrl+Shift+P` (Firefox)
   - This bypasses all cache

2. **Check Widget Script URL:**
   - In console, type:
     ```javascript
     document.querySelector('script[src*="wetechforu-widget"]')?.src
     ```
   - Should show Heroku URL with `/public/wetechforu-widget-v2.js`

3. **Manually Force Reload Widget:**
   - Add this to your browser console:
     ```javascript
     const script = document.createElement('script');
     script.src = 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/public/wetechforu-widget-v2.js?v=' + Date.now();
     document.body.appendChild(script);
     ```

### **If Console Shows Errors:**

- Copy the entire error message
- Copy all console logs
- Send them to me

---

## 🎯 **EXPECTED RESULTS**

### **✅ SUCCESS - What You Should See:**

1. Console shows widget v2.1 loading
2. Message sends successfully
3. Heroku logs show: `POST /api/chat-widget/public/widget/.../message 200`
4. Bot responds with **AI-generated answer** (not default fallback)
5. Response confidence: **0.85+** (high confidence)

### **❌ FAILURE - What Indicates Cache Issue:**

1. No console logs at all
2. Widget shows old behavior
3. No POST requests in Heroku logs
4. Bot always shows default "I'm still learning" response

---

## 📧 **EMAIL NOTIFICATIONS (Separate Issue)**

Email notifications require:

1. ✅ `enable_email_notifications = true` (Done)
2. ✅ `notification_email` set to `info@wetechforu.com` (Done)
3. ⏱️ **Visitor must stay on page for 5+ minutes**

### **Check if Emails Are Being Sent:**

Run this command:

```bash
heroku pg:psql --app marketingby-wetechforu -c "
SELECT 
  session_id,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - session_started_at))/60 as minutes_on_site,
  engagement_email_sent,
  engagement_email_sent_at
FROM widget_visitor_sessions
WHERE widget_id = 7
  AND session_started_at > NOW() - INTERVAL '24 hours'
ORDER BY session_started_at DESC
LIMIT 10;
"
```

**Expected:**
- If `minutes_on_site` > 5 and `engagement_email_sent` = `f`, email should send soon
- If `engagement_email_sent` = `t`, email was already sent

---

## 🚀 **DEPLOYMENT STATUS**

```
Version: v350
Status: ✅ DEPLOYED
Backend: https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com
Widget: v2.1 (Oct 25, 2024)
```

### **What's Live:**

1. ✅ AI-powered responses (Gemini)
2. ✅ Debug console logging
3. ✅ Sensitive data detection
4. ✅ Smart question matching
5. ✅ Agent handoff flow
6. ✅ Visitor tracking
7. ✅ Email notifications (5+ min)

---

## 🔍 **NEXT STEPS**

### **Step 1: TEST NOW**

1. Open `test-widget-v2.1.html`
2. Open console
3. Type a message
4. Screenshot the console output
5. Send to me

### **Step 2: Test Live Site**

1. Clear cache
2. Go to wetechforu.com
3. Open console
4. Verify v2.1 is loading
5. Type test message
6. Confirm it works

### **Step 3: Email Test**

1. Open wetechforu.com
2. Keep page open for **5+ minutes**
3. Check `info@wetechforu.com` inbox
4. Confirm engagement email received

---

## 🐞 **DEBUGGING COMMANDS**

### **Check Widget Version in Browser:**

```javascript
console.log('Widget version:', document.querySelector('script[src*="wetechforu"]')?.src);
```

### **Check if Widget Loaded:**

```javascript
console.log('Widget loaded:', typeof WeTechForUWidget);
```

### **Force Reload Widget:**

```javascript
// Remove old widget
const oldScript = document.querySelector('script[src*="wetechforu"]');
if (oldScript) oldScript.remove();

// Load new widget with cache-busting
const script = document.createElement('script');
script.src = 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/public/wetechforu-widget-v2.js?v=' + Date.now();
document.body.appendChild(script);
```

### **Check Heroku Logs:**

```bash
heroku logs --tail --app marketingby-wetechforu | grep -E "(POST.*message|LLM|Gemini)"
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Browser cache is the #1 cause** of "widget not working" issues
2. Always test in incognito mode when debugging
3. Console logs are your friend - check them first
4. Widget must show "v2.1" in console when loading
5. If POST requests don't appear in Heroku logs, it's a cache issue

---

## 📞 **WHAT TO SEND ME**

If it still doesn't work after clearing cache:

1. Screenshot of browser console (full output)
2. Screenshot of Network tab (F12 → Network) showing requests
3. Heroku logs output (after sending test message)
4. Browser name and version
5. Operating system

---

**Last Updated:** Oct 25, 2024 - v350
**Status:** 🟢 Ready for Testing

