# Facebook Sync 500 Error - Resolution Summary

## 🚨 Issue Identified

The Facebook sync is failing with a **500 Internal Server Error**. After analyzing the Heroku logs, I found the root cause:

```
Sync Facebook error: Error: Failed to fetch Facebook posts
data: { error: [Object] }
status: 400
```

The issue is a **400 Bad Request** from Facebook's Graph API when trying to fetch posts. This indicates the **Facebook Page Access Token is invalid, expired, or missing required permissions**.

## ✅ What I Fixed

### 1. **Enhanced Error Logging in FacebookService**
I updated the Facebook service to provide detailed error messages from Facebook Graph API:

**Before:**
```javascript
catch (error) {
  console.error('Error fetching Facebook posts:', error);
  throw new Error('Failed to fetch Facebook posts');
}
```

**After:**
```javascript
catch (error: any) {
  console.error('❌ Error fetching Facebook posts:', {
    pageId,
    error: error.response?.data || error.message,
    status: error.response?.status,
    statusText: error.response?.statusText
  });
  
  const fbError = error.response?.data?.error;
  if (fbError) {
    throw new Error(`Facebook API Error: ${fbError.message} (Code: ${fbError.code}, Type: ${fbError.type})`);
  }
  
  throw new Error('Failed to fetch Facebook posts');
}
```

Now when Facebook sync fails, you'll see the **exact error code, message, and type** from Facebook in the logs.

### 2. **Improved All Facebook API Methods**
- `fetchPageInsights()` - Better error logging for each metric
- `fetchPosts()` - Detailed API error reporting
- `getFollowerStats()` - Enhanced error messages

### 3. **Created Diagnostic Tools**

#### A. Test Script (`test-facebook-token.js`)
A standalone script to test your Facebook token before using it in the app:

```bash
node test-facebook-token.js <PAGE_ID> <ACCESS_TOKEN>
```

This will run 4 tests:
1. ✅ Fetch page info (name, followers)
2. ✅ Fetch page posts
3. ✅ Fetch page insights (requires permissions)
4. ✅ Debug token (shows expiration, scopes, etc.)

#### B. Comprehensive Guide (`FACEBOOK_TOKEN_ISSUE.md`)
Step-by-step instructions on:
- How to get a long-lived Page Access Token
- Required permissions
- Testing the token
- Troubleshooting common issues

## 🔧 How to Fix the Current Issue

### Step 1: Test Your Current Token (If You Have One)

If ProMed already has Facebook credentials saved:

1. **Get the current token from the database:**
   ```sql
   SELECT credentials FROM client_credentials 
   WHERE client_id = 1 AND service_type = 'facebook';
   ```

2. **Test it using the script:**
   ```bash
   node test-facebook-token.js 744651835408507 <ACCESS_TOKEN_FROM_DB>
   ```

3. **Check the results:**
   - If tests fail, the token is expired or invalid → Get a new token
   - If tests pass, the issue might be elsewhere → Check logs again

### Step 2: Get a New Long-Lived Page Access Token

**Option A: Using Facebook Graph API Explorer (Quick)**

1. Go to https://developers.facebook.com/tools/explorer/
2. Select your Facebook app
3. Click "Get Token" → "Get User Access Token"
4. Select permissions:
   - ✅ `pages_show_list`
   - ✅ `pages_read_engagement`
   - ✅ `pages_read_user_content`
   - ✅ `pages_manage_metadata`
5. Click "Generate Access Token"
6. **Get long-lived token:**
   ```bash
   curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN"
   ```
7. **Get Page Access Token:**
   ```bash
   curl -i -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
   ```
   - Find ProMed Healthcare Associates in the response
   - Copy the `id` (Page ID) and `access_token` (Page Access Token)
   - **This Page Access Token never expires!**

**Option B: Manual Testing (If you don't have app credentials)**

If you don't have the Facebook app ID and secret, you can use a short-lived token for testing:

1. Go to https://developers.facebook.com/tools/explorer/
2. Get a User Access Token with the permissions listed above
3. Get the page access token:
   ```bash
   curl "https://graph.facebook.com/v18.0/me/accounts?access_token=USER_ACCESS_TOKEN"
   ```
4. **Note:** Short-lived tokens expire in 1-2 hours. For production, you MUST use long-lived tokens.

### Step 3: Update the Token in the App

1. **Go to Client Management Dashboard**
2. **Select ProMed Healthcare Associates**
3. **Click on "Settings" tab**
4. **Scroll to "Facebook Page" section**
5. **Enter:**
   - Page ID: `744651835408507`
   - Access Token: (paste the Page Access Token you got from Step 2)
6. **Click "Connect Facebook"**
7. **Go to "Social Media" tab**
8. **Click "Sync Facebook Data"**

### Step 4: Verify the Fix

After syncing, check the Heroku logs:

```bash
heroku logs --tail --app marketingby-wetechforu
```

**Expected Success Logs:**
```
📊 Successfully fetched X insights metrics
📝 Stored Y Facebook posts for client 1
👥 Follower stats: Z total, +A adds, -B removes
✅ Facebook sync completed for client 1
```

**If Still Failing:**
The new error logging will show:
```
❌ Error fetching Facebook posts: {
  pageId: '744651835408507',
  error: {
    message: 'Specific error message',
    code: 190,
    type: 'OAuthException'
  }
}
```

## 🔍 Common Facebook API Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 190 | Invalid OAuth Token | Token expired or invalid - get a new one |
| 102 | API Session or User Login Error | Token doesn't have required permissions |
| 200 | Permissions Error | Token missing `pages_read_engagement` |
| 10 | Permission Denied | Token doesn't have access to this page |
| 100 | Invalid Parameter | Wrong Page ID or malformed request |

## 📊 Current Status

### ✅ Fixed
- Enhanced error logging for all Facebook API calls
- Created diagnostic test script
- Detailed troubleshooting guide
- All changes deployed to Heroku

### ⏳ Pending (Your Action Required)
- Get a valid long-lived Page Access Token for ProMed
- Test the token using `test-facebook-token.js`
- Update the token in the app Settings
- Verify sync works

### 🎯 Once Fixed
- Repeat for Align Primary Care
- Test all Social Media analytics features
- Verify data is appearing correctly in dashboard

## 🆘 Need Help?

If you run the test script and it fails, **share the output with me**. The new error format will tell us exactly what's wrong:

```
❌ Test 2 FAILED
Error: {
  message: 'Specific error from Facebook',
  type: 'OAuthException',
  code: 190
}
```

With this information, I can provide targeted help to resolve the issue.

---

**Updated:** October 20, 2025  
**Status:** Enhanced error logging deployed ✅  
**Next Step:** Get valid Facebook token and test using `test-facebook-token.js`

