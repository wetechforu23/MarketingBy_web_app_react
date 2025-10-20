# Facebook Token Issue - Diagnostic and Resolution Guide

## 🔍 Current Issue

The Facebook sync is failing with a **400 Bad Request** error when trying to fetch posts. This indicates that the **Facebook Page Access Token** is either:

1. **Invalid** - The token format is incorrect
2. **Expired** - The token has expired (short-lived tokens expire in 1-2 hours)
3. **Missing Permissions** - The token doesn't have the required permissions
4. **Wrong Page ID** - The Page ID doesn't match the token

## 📋 What I've Fixed

### 1. **Improved Error Logging**
- Added detailed error messages from Facebook Graph API
- Now shows the exact error code, type, and message from Facebook
- Better visibility into what's failing during sync

### 2. **Enhanced FacebookService.ts**
- `fetchPosts()` - Now logs full Facebook API error details
- `fetchPageInsights()` - Better error messages for each metric
- `getFollowerStats()` - Detailed error logging for follower stats

## 🔧 How to Fix the Token Issue

### Option 1: Get a Long-Lived Page Access Token (Recommended)

Facebook tokens come in different types:
- **Short-lived User Token** (1-2 hours) - Default when using OAuth
- **Long-lived User Token** (60 days) - Can be extended
- **Page Access Token** (Never expires) - **This is what we need!**

#### Steps to Get a Page Access Token:

1. **Go to Facebook Graph API Explorer**
   - https://developers.facebook.com/tools/explorer/

2. **Select Your App**
   - In the top-right dropdown, select the Facebook app connected to the page

3. **Get User Access Token**
   - Click "Get Token" → "Get User Access Token"
   - Select these permissions:
     - ✅ `pages_show_list`
     - ✅ `pages_read_engagement`
     - ✅ `pages_read_user_content`
     - ✅ `pages_manage_metadata`
   - Click "Generate Access Token"

4. **Exchange for Long-Lived User Token**
   ```bash
   curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN"
   ```

5. **Get Your Page ID**
   ```bash
   curl -i -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
   ```
   - This returns a list of pages you manage
   - Copy the `id` and `access_token` for ProMed Healthcare Associates page

6. **Use the Page Access Token**
   - The `access_token` from step 5 is a **never-expiring Page Access Token**
   - Use this token in the MarketingBy app settings

### Option 2: Use Facebook Business Integration (Future Enhancement)

For a production system, we should implement:
- OAuth flow for Facebook Business Integration
- Automatic token refresh
- Store tokens securely in the database
- Handle token expiration gracefully

## 🧪 Testing the Fix

After getting the proper tokens:

1. **Go to Client Management Dashboard** → **Settings Tab**
2. **Enter the correct Page ID and Page Access Token**
3. **Click "Connect Facebook"**
4. **Go to Social Media Tab**
5. **Click "Sync Facebook Data"**

### Expected Result (After Sync):
```
📊 Successfully fetched X insights metrics
📝 Stored Y Facebook posts for client 1
👥 Follower stats: Z total, +A adds, -B removes
✅ Facebook sync completed for client 1
```

### If Still Failing:
- Check Heroku logs: `heroku logs --tail --app marketingby-wetechforu`
- Look for detailed Facebook API error messages
- The error will now show: `Facebook API Error: [message] (Code: [code], Type: [type])`

## 🔐 ProMed Facebook Page Details

**Page Name:** ProMed Healthcare Associates  
**Page ID:** `744651835408507`  
**Current Token Status:** ⚠️ Likely expired or invalid

## 🎯 Next Steps

1. **Get a proper Page Access Token** using the steps above
2. **Update the token in the Settings tab** for ProMed
3. **Test the sync** - the new error logging will help diagnose any remaining issues
4. **If successful**, repeat for Align Primary Care

## 📞 Need Help?

If the error persists after updating the token:
- Share the exact error message from Heroku logs
- The new error format will be: `Facebook API Error: [specific issue] (Code: XXX)`
- This will help identify if it's a permission issue, page access issue, or token issue

---

**Updated:** October 20, 2025  
**Status:** Enhanced error logging deployed, awaiting valid token setup

