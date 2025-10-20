# How to Test Heroku Database Locally

## 🎯 Purpose

This script (`test-facebook-db.js`) connects to your Heroku production database and tests the stored Facebook credentials directly, bypassing the need for deployment.

## 📋 Prerequisites

1. Node.js installed
2. Heroku CLI installed and logged in
3. Access to the Heroku app

## 🚀 Quick Start

### Step 1: Get Database URL

Once Heroku API is back online, run:

```bash
heroku config:get DATABASE_URL --app marketingby-wetechforu
```

This will output something like:
```
postgres://username:password@host:5432/database
```

### Step 2: Run the Test Script

**Option A: Using environment variable**
```bash
DATABASE_URL="postgres://your-connection-string" node test-facebook-db.js
```

**Option B: Using .env file (safer)**

Create a `.env` file in the project root:
```env
DATABASE_URL=postgres://your-connection-string
```

Then run:
```bash
npm install dotenv pg
node test-facebook-db.js
```

## 📊 What the Script Does

The script will:

1. ✅ **Connect to Heroku database**
2. ✅ **Fetch Facebook credentials for ProMed (client 1)**
3. ✅ **Display credential details:**
   - Page ID
   - Token length
   - Token format
   - Last connected date
4. ✅ **Test with Facebook API:**
   - Test 1: Fetch page info (name, followers)
   - Test 2: Fetch posts
   - Test 3: Fetch insights
5. ✅ **Report results with detailed error messages**

## 📈 Expected Output

### ✅ If Everything Works:

```
🔍 Connecting to Heroku database...

✅ Database connected: 2025-10-20T...

📋 Fetching Facebook credentials for client 1...

📊 Credentials found in database:
   Client ID: 1
   Service Type: facebook
   Last Connected: 2025-10-20T...
   Has Page ID: true
   Has Access Token: true

🔑 Credential Details:
   Page ID: 744651835408507
   Token Length: 256
   Token Prefix: EAAxxxxxxxxxxxxx...
   Token Starts With: EAA

🧪 Test 1: Fetching page info from Facebook...
✅ Test 1 PASSED
   Page Name: ProMed Healthcare Associates
   Page ID: 744651835408507
   Followers: 150

🧪 Test 2: Fetching page posts from Facebook...
✅ Test 2 PASSED
   Posts Found: 5
   Latest Post: 2025-10-15T...

🧪 Test 3: Fetching page insights from Facebook...
✅ Test 3 PASSED
   Insights accessible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SUCCESS! Your Facebook credentials are VALID!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Credentials are stored correctly in database
✅ Token is valid and working
✅ Token has access to the Facebook page

📝 Next Steps:
   1. Wait for Heroku deployment to complete
   2. Go to Social Media tab
   3. Click "Sync Facebook Data"
   4. Data should sync successfully!
```

### ❌ If Credentials Not Found:

```
❌ No Facebook credentials found in database for client 1

💡 This means no credentials have been saved yet.
   Go to Settings → Facebook → Enter credentials and click Connect
```

### ❌ If Token is Invalid:

```
❌ Test 1 FAILED
   Facebook Error: {
     "message": "Error validating access token: Session has expired...",
     "type": "OAuthException",
     "code": 190
   }

🔧 Common Error Codes:
   190 = Invalid/Expired Token
   102 = API Session Error
   200 = Permission Denied
   10  = No access to this page

💡 Solution: Get a new long-lived Page Access Token
   See FACEBOOK_TOKEN_ISSUE.md for instructions
```

## 🔧 Troubleshooting

### "DATABASE_URL not set"
**Solution:** Make sure you've set the DATABASE_URL environment variable or created a .env file

### "Error: connect ECONNREFUSED"
**Solution:** Check that the DATABASE_URL is correct and that your IP has access to Heroku database

### "SSL connection required"
**Solution:** The script already handles SSL. If this error appears, it's a database configuration issue.

### Heroku API still down (503 error)
**Solution:** 
1. Try again in a few minutes
2. Check https://status.heroku.com for Heroku platform status
3. Or use the HTML tester (`facebook-token-tester.html`) which doesn't need database access

## 🎯 Alternative: Direct Database Query

If you prefer, you can also use `psql` or any PostgreSQL client:

```bash
# Connect to database
heroku pg:psql --app marketingby-wetechforu

# Query credentials
SELECT 
  client_id,
  service_type,
  credentials->>'page_id' as page_id,
  LENGTH(credentials->>'access_token') as token_length,
  SUBSTRING(credentials->>'access_token', 1, 20) as token_prefix,
  last_connected_at
FROM client_credentials
WHERE client_id = 1 AND service_type = 'facebook';
```

**Expected Result:**
```
 client_id | service_type |     page_id      | token_length |    token_prefix     |     last_connected_at
-----------+--------------+------------------+--------------+--------------------+--------------------------
         1 | facebook     | 744651835408507  |          256 | EAAxxxxxxxxxxxxx   | 2025-10-20 12:34:56.789
```

## 📊 What Each Test Means

| Test | Purpose | What it Proves |
|------|---------|---------------|
| **Test 1: Page Info** | Fetch basic page details | Token is valid and has basic page access |
| **Test 2: Posts** | Fetch page posts | Token has `pages_read_user_content` permission |
| **Test 3: Insights** | Fetch page metrics | Token has `pages_read_engagement` permission |

If **all 3 tests pass**, your token is perfect and ready to use!

If **any test fails**, you'll see the exact Facebook error code and message, which tells you exactly what's wrong.

## 🚀 Benefits of Local Testing

1. ✅ **No deployment needed** - Test immediately
2. ✅ **Direct database access** - See exactly what's stored
3. ✅ **Real Facebook API tests** - Verify token works
4. ✅ **Detailed error messages** - Know exactly what to fix
5. ✅ **Safe testing** - Read-only, no changes to database

## 📝 Summary

This script is the **fastest way** to diagnose Facebook credential issues:

1. Get DATABASE_URL from Heroku
2. Run `test-facebook-db.js`
3. See immediately if credentials are valid
4. If valid → wait for deployment and sync
5. If invalid → get new token and update in app

---

**Created:** October 20, 2025  
**Purpose:** Test Facebook credentials without deployment  
**Safe:** Read-only database access, no modifications made

