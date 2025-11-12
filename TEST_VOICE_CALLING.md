# 🧪 How to Test Voice Calling (Without Admin UI)

## ✅ What's Ready:
- ✅ **Widget Call Button** - Appears in widget when enabled
- ✅ **Backend API** - All endpoints working
- ✅ **Call Functionality** - Can initiate calls

## ❌ What's NOT Ready:
- ❌ **Admin UI** - No settings page yet (needs to be added)

---

## 🚀 Quick Test Steps:

### Step 1: Configure Voice Calling (Database)

Connect to your database and run:

```sql
-- 1. Find your widget ID
SELECT id, widget_name, widget_key, client_id 
FROM widget_configs 
WHERE widget_key = 'your-widget-key-here';

-- 2. Enable voice calling (replace YOUR_WIDGET_ID and YOUR_CLIENT_ID)
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
  '+1234567890',               -- Agent's phone (E.164 format: +1XXXXXXXXXX)
  '+15558986359',              -- Your Twilio phone number
  true,                        -- Enable recording
  false,                       -- Disable transcription
  true                         -- Active
) ON CONFLICT (widget_id) DO UPDATE SET
  enable_voice_calling = true,
  default_agent_phone = EXCLUDED.default_agent_phone,
  twilio_phone_number = EXCLUDED.twilio_phone_number,
  is_active = true;
```

### Step 2: Store Twilio Credentials

```sql
-- Store Twilio Account SID
INSERT INTO encrypted_credentials (
  client_id,
  service_name,
  credential_key,
  credential_value_encrypted,
  environment
) VALUES (
  YOUR_CLIENT_ID,  -- or NULL for system-wide
  'twilio_voice',
  'account_sid',
  encrypt('YOUR_ACCOUNT_SID', 'your-encryption-key'),
  'production'
);

-- Store Auth Token
INSERT INTO encrypted_credentials (
  client_id,
  service_name,
  credential_key,
  credential_value_encrypted,
  environment
) VALUES (
  YOUR_CLIENT_ID,
  'twilio_voice',
  'auth_token',
  encrypt('YOUR_AUTH_TOKEN', 'your-encryption-key'),
  'production'
);

-- Store Phone Number
INSERT INTO encrypted_credentials (
  client_id,
  service_name,
  credential_key,
  credential_value_encrypted,
  environment
) VALUES (
  YOUR_CLIENT_ID,
  'twilio_voice',
  'phone_number',
  encrypt('+15558986359', 'your-encryption-key'),
  'production'
);
```

### Step 3: Test the Widget

1. **Open your website** with the chat widget
2. **Open browser console** (F12)
3. **Fill out the form:**
   - Name
   - Email
   - **Phone** (required for calling)
4. **Look for call button:**
   - Should appear next to send button (📞)
   - Console should show: `✅ Voice calling enabled - call button shown`
5. **Click call button:**
   - Should show: `📞 Initiating call... Please wait.`
   - You should receive a call on your phone
   - Console should show: `📞 Call initiated!`

### Step 4: Verify in Database

```sql
-- Check if call was logged
SELECT * FROM calls 
ORDER BY initiated_at DESC 
LIMIT 5;

-- Check call settings
SELECT * FROM call_settings 
WHERE widget_id = YOUR_WIDGET_ID;
```

---

## 🔍 Where to Test:

### **Widget (Customer-Facing):**
- **URL:** Your website where widget is embedded
- **Example:** `https://your-website.com` (where widget is installed)
- **What to look for:** Call button (📞) next to send button

### **Admin Panel (Settings - NOT READY YET):**
- **URL:** `https://marketingby.wetechforu.com/app/chat-widgets/{widgetId}/edit`
- **Status:** ❌ Voice calling section not added yet
- **Workaround:** Use database (see Step 1 above)

---

## ✅ Checklist:

- [ ] Database migration run: `add_voice_calling_tables.sql`
- [ ] `call_settings` record created for widget
- [ ] Twilio credentials stored in `encrypted_credentials`
- [ ] Twilio webhooks configured (Voice URL & Status Callback)
- [ ] Widget tested on website
- [ ] Call button appears after form fill
- [ ] Call connects successfully

---

## 🐛 Troubleshooting:

**Call button not showing?**
```sql
-- Check if enabled
SELECT enable_voice_calling FROM call_settings WHERE widget_id = X;
-- Should be: true
```

**Check browser console:**
- Look for: `✅ Voice calling enabled - call button shown`
- If not found: Check widget ID is correct

**Check Heroku logs:**
```bash
heroku logs --tail --app marketingby-wetechforu
# Look for: 📞 Initiating Twilio call:
```

---

## 📝 Next Steps:

1. **Add Admin UI** - Need to add "Voice Calling" tab to ChatWidgetEditor
2. **Test thoroughly** - Make sure calls connect properly
3. **Monitor calls** - Check `calls` table for call history

