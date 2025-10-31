# 🔧 Facebook Connect - Fixes for Common Issues

## ❌ Issue 1: "URL Blocked" Error (OAuth)

### Problem:
When you click "Connect with Facebook", you get:
```
URL Blocked
This redirect failed because the redirect URI is not whitelisted 
in the app's Client OAuth Settings.
```

### ✅ Solution: Whitelist Redirect URI in Facebook App

1. **Go to Facebook Developer Portal:**
   - https://developers.facebook.com/apps/

2. **Select your app** (App ID: `1518539219154610`)

3. **Navigate to:**
   - **Use Cases** → **Customize** → **Settings**
   
   OR
   
   - **Facebook Login** → **Settings**

4. **Add Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/api/facebook-connect/callback
   https://marketingby.wetechforu.com/api/facebook-connect/callback
   ```

5. **Save Changes**

6. **Try again!** The OAuth flow should work now.

---

## ❌ Issue 2: 404 Error - `POST /api/facebook-connect/complete/199`

### Problem:
When you select a page after manual token input, you get:
```
POST http://localhost:3001/api/facebook-connect/complete/199 404 (Not Found)
```

### Root Cause:
The backend is running **old code** without the new Facebook Connect routes.

### ✅ Solution: Restart Backend Server

#### Option A: Stop and Restart Backend
```powershell
# Find the backend process
netstat -ano | Select-String ":3001"

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Restart backend
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react\backend"
npm run dev
```

#### Option B: Restart in Nodemon (if running)
Just type `rs` and press Enter in the backend terminal to restart nodemon.

---

## ❌ Issue 3: CORS Error - Chat Widget

### Problem:
```
Access to XMLHttpRequest at 'http://localhost:3001/api/chat-widget/admin/unread-counts' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' 
when the request's credentials mode is 'include'.
```

### Root Cause:
Backend CORS is set to wildcard `*`, but frontend is sending cookies/credentials.

### ✅ Solution: Fix CORS Configuration in Backend

I'll fix this in the backend `server.ts` file.

---

## 🚀 Quick Fix Steps (In Order)

### Step 1: Whitelist OAuth Redirect URI
1. Go to https://developers.facebook.com/apps/1518539219154610
2. Navigate to **Use Cases** → **Customize** → **Settings** (or **Facebook Login** → **Settings**)
3. Add these to **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3001/api/facebook-connect/callback
   https://marketingby.wetechforu.com/api/facebook-connect/callback
   ```
4. Click **Save Changes**

### Step 2: Restart Backend Server
```powershell
# Stop current backend
Get-Process | Where-Object { $_.ProcessName -eq 'node' -and $_.MainWindowTitle -like '*backend*' } | Stop-Process -Force

# OR find by port
$pid = (netstat -ano | Select-String ":3001" | Select-String "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
Stop-Process -Id $pid -Force

# Restart
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react\backend"
npm run dev
```

### Step 3: Test Both Methods

#### Method 1: OAuth (after whitelisting)
1. Go to Settings → Facebook Page section
2. Click **"🔗 Connect with Facebook"**
3. Log in to Facebook
4. Authorize the app
5. Select your page
6. Done! ✅

#### Method 2: Manual Token
1. Get a token from https://developers.facebook.com/tools/explorer/
2. Paste it in the manual input field
3. Click **"✋ Connect Manually"**
4. Select your page from dropdown
5. Done! ✅

---

## 📋 Verification Checklist

- [ ] Facebook App has redirect URIs whitelisted
- [ ] Backend server restarted with new routes
- [ ] Can access `http://localhost:3001/api` without errors
- [ ] OAuth method redirects to Facebook (no "URL Blocked")
- [ ] Manual token method shows page selector
- [ ] Selecting a page connects successfully
- [ ] No 404 errors in console
- [ ] No CORS errors (or minimal/ignorable)

---

## 🐛 Still Having Issues?

### Check Backend Logs:
Look for these success messages:
```
✅ Long-lived user token obtained
📄 Fetching user pages...
✅ Found X pages
```

### Check Frontend Console:
Should see:
```
📤 Sending manual token to backend...
✅ Token processed successfully
```

### Verify Routes Are Loaded:
In backend terminal, you should see:
```
Server running on port 3001
```

And no errors about missing routes.

---

## 💡 Pro Tip

If you're still getting 404 errors after restart, make sure:
1. The backend compiled successfully (check for TypeScript errors)
2. The `dist/` folder has the latest `facebookConnect.js` route file
3. No cached old server process is still running

---

**After following these steps, both OAuth and Manual Token methods should work perfectly! 🎉**

