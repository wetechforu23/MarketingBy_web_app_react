# Facebook Diagnostic - Browser Console Test

Since Heroku is experiencing deployment issues, you can test your Facebook credentials directly from your browser console while on the Client Management page.

## 🔬 Run This Test in Browser Console

### Step 1: Open Browser Console
1. Go to https://marketingby.wetechforu.com/app/client-management
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Click on the "Console" tab

### Step 2: Run Diagnostic Test

Copy and paste this code into the console:

```javascript
// Facebook Credentials Diagnostic Test
(async () => {
  console.log('🔬 Starting Facebook credentials diagnostic...\n');
  
  const clientId = 1; // ProMed
  const baseUrl = 'https://marketingby.wetechforu.com/api';
  
  try {
    // Step 1: Check Settings API
    console.log('📋 Step 1: Checking client settings...');
    const settingsResponse = await fetch(`${baseUrl}/clients/${clientId}/settings`, {
      credentials: 'include'
    });
    const settings = await settingsResponse.json();
    
    console.log('Settings response:', settings);
    console.log('Facebook connected:', settings.facebook?.connected);
    console.log('Has Page ID:', !!settings.facebook?.pageId);
    console.log('Has Access Token:', settings.facebook?.accessToken !== null);
    
    if (!settings.facebook?.connected) {
      console.error('❌ Facebook not connected in database');
      console.log('\n💡 Solution: Go to Settings tab and enter Facebook credentials');
      return;
    }
    
    console.log('✅ Step 1 passed: Credentials exist in database\n');
    
    // Step 2: Try to sync
    console.log('🔄 Step 2: Attempting Facebook sync...');
    const syncResponse = await fetch(`${baseUrl}/facebook/sync/${clientId}`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!syncResponse.ok) {
      console.error('❌ Sync failed with status:', syncResponse.status);
      const errorText = await syncResponse.text();
      console.error('Error response:', errorText);
      
      console.log('\n🔍 Checking error details...');
      
      // If we get here, the token is likely invalid
      console.log('\n⚠️ The sync failed, which means:');
      console.log('1. The Facebook Access Token is INVALID or EXPIRED');
      console.log('2. The token doesn\'t have required permissions');
      console.log('3. The Page ID is incorrect');
      
      console.log('\n📝 Next Steps:');
      console.log('1. Go to Settings tab');
      console.log('2. Click "Disconnect" Facebook');
      console.log('3. Get a NEW long-lived Page Access Token:');
      console.log('   - Visit: https://developers.facebook.com/tools/explorer/');
      console.log('   - Select your app');
      console.log('   - Get User Access Token with permissions:');
      console.log('     • pages_show_list');
      console.log('     • pages_read_engagement');
      console.log('     • pages_read_user_content');
      console.log('   - Exchange for long-lived token (see FACEBOOK_TOKEN_ISSUE.md)');
      console.log('   - Get Page Access Token');
      console.log('4. Enter new credentials and test again');
      
      return;
    }
    
    const syncData = await syncResponse.json();
    console.log('✅ Step 2 passed: Sync successful!');
    console.log('Sync result:', syncData);
    console.log(`\n🎉 SUCCESS! Synced ${syncData.data?.insights || 0} insights, ${syncData.data?.posts || 0} posts`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('\n💡 This usually means the token is invalid or expired.');
    console.log('Follow the steps in FACEBOOK_TOKEN_ISSUE.md to get a new token.');
  }
})();
```

### Step 3: Interpret Results

#### ✅ **If Test Passes:**
```
✅ Step 1 passed: Credentials exist in database
✅ Step 2 passed: Sync successful!
🎉 SUCCESS! Synced X insights, Y posts
```
**What this means:** Your Facebook token is valid and working! Refresh the Social Media tab to see the data.

---

#### ❌ **If Test Fails with "Facebook not connected":**
```
❌ Facebook not connected in database
💡 Solution: Go to Settings tab and enter Facebook credentials
```
**What this means:** No credentials in the database. Go to Settings → Facebook → Enter Page ID and Access Token.

---

#### ❌ **If Test Fails with "Sync failed with status: 500":**
```
❌ Sync failed with status: 500
⚠️ The sync failed, which means:
1. The Facebook Access Token is INVALID or EXPIRED
2. The token doesn't have required permissions
3. The Page ID is incorrect
```
**What this means:** Credentials exist but the token is **invalid/expired**. You need to:

1. **Get a NEW token** - Follow instructions in `FACEBOOK_TOKEN_ISSUE.md`
2. **Test the new token** - Use `node test-facebook-token.js 744651835408507 <NEW_TOKEN>`
3. **Update in app** - Go to Settings → Facebook → Disconnect → Enter new credentials

---

## 🔍 Additional Diagnostic: Check Database Directly

If you have database access, run this query:

```sql
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
- `page_id`: `744651835408507`
- `token_length`: Should be > 50 characters (typically 200-400)
- `token_prefix`: Should start with `EAA` (Facebook tokens start with this)
- `last_connected_at`: When you connected it

**Red Flags:**
- ❌ No results = No credentials stored
- ❌ `token_length` < 50 = Invalid token
- ❌ `token_prefix` doesn't start with `EAA` = Not a valid Facebook token
- ❌ `page_id` is null or empty = Missing Page ID

---

## 📞 What to Do Next

### If token is expired/invalid:
1. **Follow `FACEBOOK_TOKEN_ISSUE.md`** - Step-by-step guide to get a new token
2. **Use `test-facebook-token.js`** - Test the token before using it
3. **Update in Settings** - Enter the new credentials

### If you need help:
1. Run the browser console test above
2. Copy the console output
3. Share it with me - I'll tell you exactly what's wrong

---

## 🎯 Quick Fix Summary

**Most Common Issue:** Expired or invalid Facebook Access Token

**Solution:** Get a new long-lived Page Access Token

**Steps:**
1. Disconnect Facebook in Settings
2. Get new token from https://developers.facebook.com/tools/explorer/
3. Test with `node test-facebook-token.js 744651835408507 <TOKEN>`
4. If test passes, use it in the app
5. Sync again

---

**Updated:** October 20, 2025  
**Note:** Heroku deployment temporarily unavailable, using browser console test instead

