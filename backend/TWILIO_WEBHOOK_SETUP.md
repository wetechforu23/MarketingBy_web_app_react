# Twilio WhatsApp Webhook Configuration Guide

## ✅ Correct Webhook URLs

Your Twilio webhook configuration is **CORRECT**! Use these URLs:

### 1. Incoming Messages Webhook
**Request URL (for incoming messages):**
```
https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/incoming
```

**Purpose:** Receives incoming WhatsApp messages from agents (when they reply to visitors)

**HTTP Method:** `POST`

**Status:** ✅ Configured and working

---

### 2. Status Callback Webhook
**Callback URL (for delivery status updates):**
```
https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/status-callback
```

**Purpose:** Receives delivery status updates (sent, delivered, failed, etc.) and pricing information

**HTTP Method:** `POST`

**Status:** ✅ Configured and working

---

## 🔧 How to Configure in Twilio Console

### Step 1: Configure WhatsApp Number Webhooks

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Or go to **Messaging** → **Settings** → **WhatsApp Sandbox** (if using sandbox)
4. Or go to **Phone Numbers** → **Manage** → **Active numbers** → Select your WhatsApp number

### Step 2: Set Webhook URLs

**For Incoming Messages:**
- Find **"A message comes in"** or **"Webhook URL"** field
- Enter: `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/incoming`
- HTTP Method: `POST`

**For Status Callbacks:**
- Find **"Status callback URL"** or **"Status callback"** field
- Enter: `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/status-callback`
- HTTP Method: `POST`

### Step 3: Disable Auto-Reply

To prevent "OK" messages, you need to disable Twilio's default auto-reply handling:

#### Method 1: Disable via Messaging Service (Recommended)

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** → **Services**
3. Click on your **Messaging Service** (or create one if you don't have one)
4. Go to **Opt-Out Management** section
5. Enable **"Advanced Opt-Out"** feature
6. With Advanced Opt-Out enabled, you can:
   - Customize opt-out responses
   - Leave response fields **BLANK** to disable auto-replies entirely
   - This prevents Twilio from sending automatic "OK" or confirmation messages

#### Method 2: Disable SMS Stop Filtering

1. Go to **Messaging** → **Services** → Your Messaging Service
2. Find **"Opt-Out Management"** or **"Compliance"** settings
3. Disable **"Default SMS Stop Filtering"**
4. This gives you full control - your webhook will handle all messages
5. **Important**: Your application must handle opt-out keywords (STOP, UNSUBSCRIBE, etc.) to maintain compliance

#### Method 3: WhatsApp Sandbox Settings

If using WhatsApp Sandbox:
1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Or **Messaging** → **Settings** → **WhatsApp Sandbox**
3. Look for **"Auto-reply"** or **"Default responses"** settings
4. Disable or leave blank

#### Method 4: Check Twilio Studio Flows

If you have Twilio Studio flows:
1. Go to **Studio** → **Flows**
2. Check each flow for **"Send Message"** widgets
3. Look for any that send "OK" or auto-replies
4. Remove or disable them

#### Method 5: Account-Level Settings

1. Go to **Account** → **Settings** → **General**
2. Look for any account-wide auto-reply settings
3. Contact Twilio Support if you can't find them - they can check account-level configurations

---

## 📋 Webhook Endpoints Summary

| Endpoint | Purpose | Method | Status |
|----------|---------|--------|--------|
| `/api/whatsapp/incoming` | Receive agent replies | POST | ✅ Active |
| `/api/whatsapp/status-callback` | Delivery status updates | POST | ✅ Active |
| `/api/whatsapp/webhook` | Legacy webhook (also works) | POST | ✅ Active |

---

## 🧪 Testing Webhooks

### Test Incoming Webhook:
```bash
curl -X POST https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=test123&From=whatsapp:+14698880705&To=whatsapp:+14155551234&Body=Test message"
```

Expected response: `200 OK` (empty body)

### Test Status Callback:
```bash
curl -X POST https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/whatsapp/status-callback \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=test123&MessageStatus=delivered"
```

Expected response: `200 OK` (empty body)

---

## ⚠️ Troubleshooting "OK" Messages

If you're still receiving "OK" messages after configuration:

1. **Check Twilio Console Logs:**
   - Go to **Monitor** → **Logs** → **Messaging**
   - Look for webhook requests to your URLs
   - Check if they're returning 200 OK with empty body

2. **Verify Webhook Response:**
   - Our webhooks return completely empty responses (no text, no JSON)
   - This should prevent Twilio from sending "OK" auto-replies

3. **Check for Multiple Webhook Configurations:**
   - Some Twilio accounts have webhooks at multiple levels:
     - Account level
     - Service level
     - Number level
   - Ensure all levels are configured correctly

4. **Twilio Studio Flows:**
   - If you have any Twilio Studio flows configured, check them
   - They might be sending "OK" messages automatically

5. **Contact Twilio Support:**
   - If the issue persists, contact Twilio support
   - They can check if there are any account-level auto-reply settings

---

## ✅ Current Configuration Status

- ✅ Incoming webhook: Correctly configured
- ✅ Status callback: Correctly configured
- ✅ Empty responses: Implemented to prevent "OK" messages
- ✅ Error handling: All webhooks return 200 even on errors (to prevent retries)

---

## 📝 Notes

- All webhook endpoints return **empty responses** (no body) to prevent "OK" auto-replies
- Webhooks are **PUBLIC** (no authentication required) - this is correct for Twilio webhooks
- The system logs all webhook requests for debugging
- Status callbacks are used to track message delivery and pricing

---

## 🔗 Related Documentation

- [WhatsApp Setup Guide](./WHATSAPP_SETUP_GUIDE.md)
- [Clear Sessions Guide](./CLEAR_WIDGET_SESSIONS.md)

