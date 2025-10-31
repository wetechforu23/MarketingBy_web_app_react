# 🔐 How to Configure OAuth Client Credentials

## Current Status

❌ **OAuth credentials NOT configured** - This prevents `refresh_token` from working.

---

## ✅ Option 1: Add to .env File (Easiest for Development)

### Step 1: Get OAuth Credentials from Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your Google Cloud Project
3. Click **"Create Credentials"** → **"OAuth client ID"**
4. Application type: **"Web application"**
5. Name: `MarketingBy Analytics` (or any name)
6. **Authorized redirect URIs**: Add:
   - `https://marketingby.wetechforu.com/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback` (for local dev)
7. Click **"Create"**
8. **Copy** the **Client ID** and **Client Secret**

### Step 2: Add to .env File

Open `backend/.env` and add:

```env
# Google Analytics OAuth Credentials
GOOGLE_ANALYTICS_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_ANALYTICS_CLIENT_SECRET=your-client-secret-here
GOOGLE_ANALYTICS_REDIRECT_URI=https://marketingby.wetechforu.com/api/auth/google/callback
```

**Replace** `your-client-id-here` and `your-client-secret-here` with the actual values from Google Cloud Console.

### Step 3: Restart Backend Server

```bash
# Stop the backend server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

---

## ✅ Option 2: Store in Database (Recommended for Production)

### Step 1: Get OAuth Credentials
(Same as Option 1, Step 1 above)

### Step 2: Run the Setup Script

```bash
cd backend
node add-oauth-credentials.js
```

The script will ask you for:
- Google OAuth Client ID
- Google OAuth Client Secret  
- Redirect URI (default provided)

It will automatically:
- Encrypt the credentials
- Store them in `encrypted_credentials` table
- Service: `google_analytics`
- Keys: `client_id`, `client_secret`, `redirect_uri`

### Step 3: Verify

```bash
node check-oauth-credentials.js
```

This will show you if credentials are configured correctly.

---

## 🔍 Check Current Status

Run this command to check if OAuth credentials are configured:

```bash
node backend/check-oauth-credentials.js
```

**Output will show:**
- ✅ If credentials are in `.env` file
- ✅ If credentials are in `encrypted_credentials` table
- ❌ What's missing if not configured

---

## 📋 What These Credentials Are Used For

Once configured, the system will:

1. **Use `refresh_token`** to get/refresh `access_token`
2. **Call GA4 API** with `access_token`
3. **Fetch analytics data** (pageViews, sessions, users, etc.)
4. **Store data** in `google_analytics_data` table

---

## 🚨 Troubleshooting

### "Could not determine client ID from request"
- **Cause**: OAuth credentials not configured
- **Fix**: Use Option 1 or Option 2 above

### "Decryption failed" 
- **Cause**: Wrong encryption key or credentials encrypted with different key
- **Fix**: Re-add credentials using `add-oauth-credentials.js`

### "Invalid grant" when refreshing token
- **Cause**: `refresh_token` is invalid or expired
- **Fix**: User needs to reconnect via OAuth flow

---

## ✅ After Configuration

Once OAuth credentials are configured:

1. ✅ `refresh_token` will work
2. ✅ `access_token` will be refreshed automatically
3. ✅ GA4 API calls will succeed
4. ✅ Data will be stored in `google_analytics_data` table

---

## 📝 Quick Setup Commands

```bash
# Check current status
node backend/check-oauth-credentials.js

# Add credentials to database
node backend/add-oauth-credentials.js

# Test fetching Client 1 data
node backend/test-fetch-client1-data.js
```

