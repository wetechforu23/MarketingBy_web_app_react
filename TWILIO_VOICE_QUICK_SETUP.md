# 📞 Twilio Voice Calling - Quick Setup

## 🔗 Exact URLs for Twilio Console

### **Production URLs (Use These):**

**1. Voice URL (Incoming Calls):**
```
https://marketingby.wetechforu.com/api/twilio/voice/incoming
Method: POST
```

**2. Status Callback URL:**
```
https://marketingby.wetechforu.com/api/twilio/voice/status-callback
Method: POST
```

**3. Recording Callback (Optional):**
```
https://marketingby.wetechforu.com/api/twilio/voice/recording-callback
Method: POST
```

**4. Transcription Callback (Optional):**
```
https://marketingby.wetechforu.com/api/twilio/voice/transcription-callback
Method: POST
```

---

## 📍 Where to Set in Twilio Console

### **Step-by-Step:**

1. **Go to Twilio Console:**
   - Visit: https://console.twilio.com/
   - Login with your Twilio account

2. **Navigate to Phone Numbers:**
   - Click **Phone Numbers** in left sidebar
   - Click **Manage** → **Active Numbers**
   - Click on your phone number (the one you want to use for calls)

3. **Configure Voice Settings:**
   - Scroll down to **Voice & Fax** section
   - **A CALL COMES IN:**
     - Webhook: `https://marketingby.wetechforu.com/api/twilio/voice/incoming`
     - HTTP Method: `POST`
   - **CALL STATUS CHANGES:**
     - Status Callback URL: `https://marketingby.wetechforu.com/api/twilio/voice/status-callback`
     - HTTP Method: `POST`

4. **Save:**
   - Click **Save** button at bottom

---

## 🖥️ Where to Access Voice Calling UI

### **Current Status:**
Voice calling settings UI is **NOT YET ADDED** to the admin panel. You need to configure via:

### **Option 1: Direct Database (Easiest)**

Connect to your database and run:

```sql
-- 1. Find your widget ID
SELECT id, widget_name, widget_key, client_id 
FROM widget_configs 
WHERE widget_key = 'your-widget-key-here';

-- 2. Insert call settings (replace YOUR_WIDGET_ID and YOUR_CLIENT_ID)
INSERT INTO call_settings (
  widget_id,
  client_id,
  enable_voice_calling,
  default_agent_phone,
  twilio_phone_number,
  enable_call_recording,
  enable_call_transcription,
  is_active
) VALUES (
  YOUR_WIDGET_ID,              -- From step 1
  YOUR_CLIENT_ID,              -- From step 1
  true,                        -- Enable voice calling
  '+1234567890',               -- Agent's phone (E.164 format)
  '+15558986359',              -- Your Twilio phone number
  true,                        -- Enable recording
  false,                       -- Disable transcription
  true                         -- Active
);
```

### **Option 2: Via API (Using Postman/curl)**

```bash
# Get widget ID first
curl https://marketingby.wetechforu.com/api/chat-widget/widgets \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create call settings
curl -X PUT https://marketingby.wetechforu.com/api/twilio/voice/widgets/WIDGET_ID/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "enable_voice_calling": true,
    "default_agent_phone": "+1234567890",
    "twilio_phone_number": "+15558986359",
    "enable_call_recording": true,
    "enable_call_transcription": false
  }'
```

### **Option 3: Admin UI (To Be Added)**

The voice calling settings will be added to:
```
https://marketingby.wetechforu.com/app/chat-widgets/{widgetId}/edit
```

**Note:** This UI section needs to be developed. For now, use Option 1 (database) or Option 2 (API).

---

## 📱 How Customers Make Calls

1. **Customer visits website** with your chat widget
2. **Fills out the form** (Name, Email, **Phone**)
3. **Call button (📞) appears** next to send button
4. **Customer clicks call button**
5. **System calls customer's phone** → connects to agent

**Requirements:**
- ✅ Voice calling enabled for widget
- ✅ Customer provided phone number in form
- ✅ Agent phone configured in `call_settings.default_agent_phone`

---

## ✅ Quick Setup Checklist

1. **Database:**
   - [ ] Run migration: `backend/database/add_voice_calling_tables.sql`
   - [ ] Create `call_settings` record for your widget

2. **Twilio Console:**
   - [ ] Set Voice URL: `https://marketingby.wetechforu.com/api/twilio/voice/incoming`
   - [ ] Set Status Callback: `https://marketingby.wetechforu.com/api/twilio/voice/status-callback`
   - [ ] Save configuration

3. **Credentials:**
   - [ ] Store Twilio Account SID in `encrypted_credentials` table
   - [ ] Store Twilio Auth Token in `encrypted_credentials` table
   - [ ] Store Twilio Phone Number in `encrypted_credentials` table

4. **Test:**
   - [ ] Open widget on website
   - [ ] Fill form with phone number
   - [ ] Verify call button appears
   - [ ] Click call button
   - [ ] Verify call connects

---

## 🔍 Verify It's Working

### Check Call Button Appears:
1. Open browser console (F12)
2. Look for: `✅ Voice calling enabled - call button shown`

### Check Call Initiation:
1. Click call button in widget
2. Check Heroku logs: `heroku logs --tail --app marketingby-wetechforu`
3. Look for: `📞 Initiating Twilio call:`

### Check Database:
```sql
SELECT * FROM calls ORDER BY initiated_at DESC LIMIT 5;
```

---

## 🆘 Troubleshooting

**Call button not showing?**
- Check: `SELECT enable_voice_calling FROM call_settings WHERE widget_id = X`
- Must be `true`

**Calls not connecting?**
- Verify phone numbers are E.164 format: `+1234567890`
- Check Twilio credentials are stored
- Check Heroku logs for errors

**Webhook not receiving?**
- Verify URLs in Twilio Console are correct
- Check Twilio Console → Monitor → Logs → Voice
- Verify HTTPS is working (Twilio requires HTTPS)

---

## 📞 Support

- **Heroku Logs:** `heroku logs --tail --app marketingby-wetechforu`
- **Twilio Logs:** https://console.twilio.com/monitor/logs/voice
- **Database:** Check `calls` and `call_settings` tables

