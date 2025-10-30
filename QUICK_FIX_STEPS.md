# 🚀 Quick Fix - 3 Steps to Get Facebook Connect Working

## ✅ Step 1: Whitelist OAuth Redirect URI in Facebook App

**Problem**: "URL Blocked" error when clicking "Connect with Facebook"

**Solution**:
1. Go to: https://developers.facebook.com/apps/1518539219154610/use-cases/customize/
2. Or navigate: **Your App** → **Use Cases** → **Customize** → **Settings**
3. Find **"Valid OAuth Redirect URIs"** section
4. Add these two URLs (one per line):
   ```
   http://localhost:3001/api/facebook-connect/callback
   https://marketingby.wetechforu.com/api/facebook-connect/callback
   ```
5. Click **"Save Changes"**

---

## ✅ Step 2: Restart Backend Server

**Problem**: 404 error `POST /api/facebook-connect/complete/199`

**Solution**: The backend needs to restart to load the new routes + CORS fix

### Option A: Kill and Restart
```powershell
# Find and kill backend process
$pid = (netstat -ano | Select-String ":3001" | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
Stop-Process -Id $pid -Force

# Restart backend
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react\backend"
npm run dev
```

### Option B: If Nodemon is Running
Just type `rs` in the backend terminal and press Enter.

---

## ✅ Step 3: Test Both Connection Methods

### Method 1: OAuth Flow (After Whitelisting)
1. Go to: `http://localhost:5173/app/client-management`
2. Select a client
3. Go to **Settings** tab
4. Scroll to **Facebook Page** section
5. In the **"🚀 Advanced Connection System"** box:
6. Click **"🔗 Connect with Facebook"**
7. ✅ Should redirect to Facebook (no more "URL Blocked")
8. Log in and authorize
9. Select your page
10. Done!

### Method 2: Manual Token (Easier for Testing)
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app
3. Click **"Generate Access Token"** → **"Get User Access Token"**
4. Select these permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `read_insights`
   - `pages_show_list`
5. Copy the token
6. Go back to your app Settings → Facebook Page section
7. In the **"✋ Method 2: Manual Token Input"** box:
8. Paste the token
9. Click **"✋ Connect Manually"**
10. ✅ Should show your pages in dropdown
11. Select a page
12. Click to connect
13. Done!

---

## 📊 What Was Fixed?

1. **CORS Issue**: Admin routes now get proper CORS (not wildcard `*`)
2. **Routes**: Backend has the new Facebook Connect routes
3. **OAuth**: Redirect URI will be whitelisted in Facebook App

---

## 🧪 Verification

After restart, check backend logs for:
```
Server running on port 3001
```

When you use manual token, you should see:
```
🔍 Processing manual token for client X
✅ Long-lived user token obtained
📄 Fetching user pages...
✅ Found X pages
```

When you select a page:
```
✅ Stored Facebook credentials for client X, page [Page Name]
```

---

## ❓ Still Getting Errors?

### If OAuth still shows "URL Blocked":
- Double-check the redirect URI is EXACTLY:
  ```
  http://localhost:3001/api/facebook-connect/callback
  ```
- Make sure you clicked **"Save Changes"** in Facebook App settings
- Try a different browser or incognito mode

### If Manual Token shows 404:
- Backend may not have restarted properly
- Check backend terminal for errors
- Try stopping ALL node processes and restarting:
  ```powershell
  Get-Process node | Stop-Process -Force
  cd backend
  npm run dev
  ```

### If CORS errors persist:
- Hard refresh your browser (Ctrl+Shift+R)
- Clear browser cache
- Restart frontend:
  ```powershell
  cd frontend
  npm run dev
  ```

---

**🎉 That's it! Both OAuth and Manual Token methods should now work perfectly!**

