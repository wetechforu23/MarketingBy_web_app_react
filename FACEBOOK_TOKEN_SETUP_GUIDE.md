# 🚀 Facebook Token Setup Guide

## ✅ Your Facebook App Credentials

- **App ID:** `1518539219154610`
- **App Secret:** `6b4924d4db16f9715c6c460f14fe208c`

---

## 📋 Step-by-Step Instructions

### Step 1: Update Your `.env` File

1. Navigate to: `backend/.env`
2. Add these lines (or update if they exist):

```bash
# Facebook App Credentials
FACEBOOK_APP_ID=1518539219154610
FACEBOOK_APP_SECRET=6b4924d4db16f9715c6c460f14fe208c
FACEBOOK_REDIRECT_URI=https://marketingby.wetechforu.com/auth/callback
```

3. Save the file

---

### Step 2: Get Your User Access Token

1. **Go to:** [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)

2. **Select Your App:**
   - Look for the dropdown at the top
   - Select "Marketing Platform" (App ID: 1518539219154610)

3. **Add Permissions:**
   - Click "Add a Permission" or "Permissions" tab
   - Search and select these permissions:
     - ✅ `pages_show_list`
     - ✅ `pages_read_engagement`
     - ✅ `pages_read_user_content`
     - ✅ `pages_manage_posts`
     - ✅ `pages_manage_engagement`
     - ✅ `read_insights`

4. **Generate Token:**
   - Click "Generate Access Token" button
   - Facebook will ask you to log in and grant permissions
   - Click "Continue" and "OK" to all permission requests

5. **Copy the Token:**
   - Copy the entire token from the "Access Token" field
   - It should look like: `EAAVlGna8NrIBPt6T7k0djSXfkv7oGRuf...`

---

### Step 3: Run the Helper Script

Open your terminal and run:

```bash
node backend/get_facebook_page_token.js YOUR_USER_ACCESS_TOKEN_HERE
```

**Example:**
```bash
node backend/get_facebook_page_token.js EAAVlGna8NrIBPt6T7k0djSXfkv7oGRuf...
```

The script will:
- ✅ Exchange your token for a long-lived token (60 days)
- ✅ List all your Facebook Pages
- ✅ Show Page Access Tokens for each page
- ✅ Generate SQL queries to save to your database

---

### Step 4: Save to Database

The script will output SQL queries like this:

```sql
-- Replace CLIENT_ID with your actual client ID (1, 67, 105, etc.)
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES (
  1, -- Replace with actual client ID
  'facebook',
  jsonb_build_object(
    'page_id', '323404977516387',
    'access_token', 'EAAVlGna8NrIBPt...'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (client_id, service_type)
DO UPDATE SET
  credentials = jsonb_build_object(
    'page_id', '323404977516387',
    'access_token', 'EAAVlGna8NrIBPt...'
  ),
  updated_at = NOW();
```

**To run this SQL:**

1. Open pgAdmin
2. Connect to your Heroku database
3. Right-click on your database → Query Tool
4. Paste the SQL query
5. **Replace the client_id** with your actual client ID:
   - Client ID `1` = ProMed Healthcare Associates
   - Client ID `67` = Align Primary
   - Client ID `105` = Wetechforu
6. Click "Execute" (F5)

---

### Step 5: Test Your Setup

1. Go back to your app: `http://localhost:5173/app/client-management`
2. Select a client with Facebook credentials
3. Go to the "Social Media" tab
4. Scroll to "📊 Facebook Full Data & Analytics"
5. Click "🔄 Refresh All Data"
6. Your Facebook data should now appear!

---

## 🔍 Troubleshooting

### Error: "Missing permissions"
**Solution:** Go back to Step 2 and make sure ALL 6 permissions are checked before generating the token.

### Error: "No pages found"
**Solution:** Make sure you are an admin of at least one Facebook Page.

### Error: "Token expired"
**Solution:** Tokens expire after 60 days. Re-run this process to get a new token.

### Error: "Request failed with status code 400"
**Solution:** Your current token doesn't have the required permissions. Follow this guide to get a new one.

---

## 📝 Client ID Reference

Run this query in pgAdmin to see all your clients:

```sql
SELECT id, name, email, company 
FROM clients 
ORDER BY id;
```

---

## 🎯 Quick Checklist

- [ ] Added Facebook credentials to `backend/.env`
- [ ] Generated User Access Token with all 6 permissions
- [ ] Ran `get_facebook_page_token.js` script
- [ ] Copied SQL query from script output
- [ ] Updated SQL query with correct client_id
- [ ] Executed SQL query in pgAdmin
- [ ] Tested "Refresh All Data" in app
- [ ] Confirmed Facebook data is displaying

---

## 💡 Pro Tips

1. **Save Your Page Access Tokens** - They're valid for 60 days
2. **Set a reminder** to renew tokens 2 months from now
3. **Test with one client first** before setting up all clients
4. **Each page needs its own Page Access Token** - not the User Access Token

---

## Need Help?

If you're still having issues, run this diagnostic command:

```bash
node backend/check_facebook_connection.js
```

This will show you which clients have Facebook connected and if there are any issues.

