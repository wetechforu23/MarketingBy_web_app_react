# 📞 Twilio Voice Calling Setup Guide

## 🔗 Exact URLs to Configure in Twilio

### Production URLs (Use These):
```
Voice URL (Incoming Calls):
https://marketingby.wetechforu.com/api/twilio/voice/incoming

Status Callback URL:
https://marketingby.wetechforu.com/api/twilio/voice/status-callback

Recording Callback URL:
https://marketingby.wetechforu.com/api/twilio/voice/recording-callback

Transcription Callback URL:
https://marketingby.wetechforu.com/api/twilio/voice/transcription-callback
```

### Alternative Heroku URLs (If custom domain not working):
```
Voice URL:
https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/twilio/voice/incoming

Status Callback:
https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/twilio/voice/status-callback
```

---

## 📋 Step-by-Step Twilio Console Configuration

### Step 1: Configure Phone Number Webhooks

1. **Login to Twilio Console**
   - Go to: https://console.twilio.com/
   - Navigate to: **Phone Numbers** → **Manage** → **Active Numbers**

2. **Select Your Twilio Phone Number**
   - Click on the phone number you want to use for voice calls

3. **Configure Voice Settings**
   - Scroll down to **Voice & Fax** section
   - Under **A CALL COMES IN**, set:
     ```
     Webhook URL: https://marketingby.wetechforu.com/api/twilio/voice/incoming
     HTTP Method: POST
     ```
   - Under **CALL STATUS CHANGES**, set:
     ```
     Status Callback URL: https://marketingby.wetechforu.com/api/twilio/voice/status-callback
     HTTP Method: POST
     ```

4. **Save Configuration**
   - Click **Save** at the bottom of the page

### Step 2: Configure Messaging Service (If Using Same Number for WhatsApp)

If you're using the same Twilio number for both WhatsApp and Voice:
- The WhatsApp webhook settings are separate
- Voice webhooks won't interfere with WhatsApp

### Step 3: Test the Configuration

1. **Test Incoming Call**
   - Call your Twilio phone number
   - Check Heroku logs: `heroku logs --tail --app marketingby-wetechforu`
   - You should see: `📞 Incoming call: { CallSid, From, To }`

2. **Verify Webhook Delivery**
   - In Twilio Console, go to **Monitor** → **Logs** → **Voice**
   - Check for successful webhook deliveries

---

## 🖥️ Where to Access Voice Calling UI

### Option 1: Via API (Current Method)

Currently, voice calling settings need to be configured via API or database. Here are the endpoints:

#### Get Call Settings:
```bash
GET https://marketingby.wetechforu.com/api/twilio/voice/widgets/{widgetId}/settings
```

#### Update Call Settings:
```bash
PUT https://marketingby.wetechforu.com/api/twilio/voice/widgets/{widgetId}/settings
Content-Type: application/json

{
  "enable_voice_calling": true,
  "default_agent_phone": "+1234567890",
  "enable_call_recording": true,
  "enable_call_transcription": false,
  "business_hours": {
    "monday": {"start": "09:00", "end": "17:00", "enabled": true},
    "tuesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "wednesday": {"start": "09:00", "end": "17:00", "enabled": true},
    "thursday": {"start": "09:00", "end": "17:00", "enabled": true},
    "friday": {"start": "09:00", "end": "17:00", "enabled": true},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false}
  },
  "timezone": "America/New_York"
}
```

### Option 2: Direct Database Setup

You can also insert call settings directly into the database:

```sql
-- First, get your widget ID
SELECT id, widget_name, client_id FROM widget_configs WHERE widget_key = 'your-widget-key';

-- Then insert call settings
INSERT INTO call_settings (
  widget_id,
  client_id,
  enable_voice_calling,
  default_agent_phone,
  enable_call_recording,
  enable_call_transcription,
  twilio_phone_number,
  is_active
) VALUES (
  YOUR_WIDGET_ID,
  YOUR_CLIENT_ID,
  true,
  '+1234567890',  -- Agent's phone number
  true,
  false,
  '+15558986359',  -- Your Twilio phone number
  true
);
```

### Option 3: Admin UI (To Be Added)

The voice calling settings UI will be added to the Chat Widget Editor page at:
```
https://marketingby.wetechforu.com/app/chat-widgets/{widgetId}/edit
```

**Note:** This UI section needs to be added to the frontend. Currently, you need to use API or database.

---

## 🔑 Twilio Credentials Setup

### Store Twilio Credentials in Database

Use the Credential Management API to store Twilio voice credentials:

```bash
# Store Account SID
POST https://marketingby.wetechforu.com/api/credentials
{
  "service_name": "twilio_voice",
  "credential_key": "account_sid",
  "credential_value": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "client_id": YOUR_CLIENT_ID  # or null for system-wide
}

# Store Auth Token
POST https://marketingby.wetechforu.com/api/credentials
{
  "service_name": "twilio_voice",
  "credential_key": "auth_token",
  "credential_value": "your_auth_token_here",
  "client_id": YOUR_CLIENT_ID
}

# Store Phone Number
POST https://marketingby.wetechforu.com/api/credentials
{
  "service_name": "twilio_voice",
  "credential_key": "phone_number",
  "credential_value": "+15558986359",
  "client_id": YOUR_CLIENT_ID
}
```

---

## 📱 How Customers Use Voice Calling

1. **Customer visits website** with your chat widget
2. **Fills out the form** (Name, Email, Phone)
3. **Call button appears** (📞) next to the send button
4. **Customer clicks call button**
5. **System initiates call** from customer's phone to agent's phone
6. **Customer receives call** and is connected to agent

### Requirements:
- Customer must provide phone number in the form
- Voice calling must be enabled for the widget
- Agent phone number must be configured in `call_settings.default_agent_phone`

---

## 🧪 Testing Voice Calling

### Test Outbound Call (Customer → Agent):

1. **Enable voice calling** for a widget (via API or database)
2. **Set agent phone** in `call_settings.default_agent_phone`
3. **Open widget** on your website
4. **Fill out form** with your phone number
5. **Click call button** (📞)
6. **You should receive a call** on your phone
7. **Answer the call** - you'll be connected to the agent

### Test Inbound Call (Customer calls Twilio number):

1. **Call your Twilio phone number**
2. **System will answer** and play greeting (if configured)
3. **System will connect** to agent phone (if configured)
4. **Call will be logged** in `calls` table

---

## 📊 View Call History

### Via API:
```bash
GET https://marketingby.wetechforu.com/api/twilio/voice/widgets/{widgetId}/calls
```

### Via Database:
```sql
SELECT * FROM calls 
WHERE widget_id = YOUR_WIDGET_ID 
ORDER BY initiated_at DESC 
LIMIT 50;
```

---

## 🔧 Troubleshooting

### Call Button Not Showing:
1. Check if voice calling is enabled: `SELECT enable_voice_calling FROM call_settings WHERE widget_id = X`
2. Check browser console for errors
3. Verify widget ID is correct

### Calls Not Connecting:
1. Check Twilio webhook logs in Twilio Console
2. Check Heroku logs: `heroku logs --tail --app marketingby-wetechforu`
3. Verify phone numbers are in E.164 format (+1234567890)
4. Check Twilio credentials are stored correctly

### Webhook Not Receiving:
1. Verify URLs are correct (no typos)
2. Check Heroku app is running
3. Verify HTTPS is working (Twilio requires HTTPS)
4. Check Twilio Console → Monitor → Logs → Voice for errors

---

## 📞 Support

If you encounter issues:
1. Check Heroku logs: `heroku logs --tail --app marketingby-wetechforu`
2. Check Twilio Console → Monitor → Logs
3. Verify database tables exist: `\dt` in PostgreSQL
4. Run migration if needed: `psql -f backend/database/add_voice_calling_tables.sql`

---

## ✅ Quick Checklist

- [ ] Run database migration: `add_voice_calling_tables.sql`
- [ ] Store Twilio credentials in `encrypted_credentials` table
- [ ] Configure webhooks in Twilio Console
- [ ] Create `call_settings` record for widget
- [ ] Set `enable_voice_calling = true`
- [ ] Set `default_agent_phone` (agent's phone number)
- [ ] Test incoming call
- [ ] Test outbound call from widget
- [ ] Verify call button appears in widget

