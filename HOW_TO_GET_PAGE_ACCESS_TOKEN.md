# 🔑 How to Get the Correct Facebook Page Access Token

## ⚠️ **The Problem**

You're currently using a **User Access Token**, but Facebook Insights require a **Page Access Token**.

---

## ✅ **Solution: Get the Page Access Token**

### **Option 1: Using Graph API Explorer (Recommended)**

1. **Go to Graph API Explorer:**
   https://developers.facebook.com/tools/explorer/

2. **Select Your App:**
   - Click the "Meta App" dropdown at the top
   - Select your app (or use "Graph API Explorer")

3. **Get User Access Token:**
   - Click "Get User Access Token" button
   - Check these permissions:
     - ✅ `pages_show_list`
     - ✅ `pages_read_engagement`
     - ✅ `read_insights`
     - ✅ `pages_manage_posts` (optional, for posting)
   - Click "Generate Access Token"
   - Login and approve

4. **Exchange for Page Token:**
   - In the Graph API Explorer, run this query:
   ```
   /me/accounts
   ```
   - Click "Submit"
   - You'll see a list of your pages
   - Each page has its own `access_token` - **THIS is your Page Access Token!**

5. **Copy the Right Token:**
   - Find your page in the list
   - Copy the `access_token` field for that specific page
   - Copy the `id` field (this is your Page ID)

6. **Use in Your App:**
   - Go to your app's Social Media tab
   - Enter the **Page ID** (from step 5)
   - Enter the **Page Access Token** (from step 5)
   - Click "Save & Load Data"

---

### **Option 2: Using Your App's API**

1. **Get a User Access Token first:**
   - Go to https://developers.facebook.com/tools/explorer/
   - Get User Access Token with permissions:
     - `pages_show_list`
     - `pages_read_engagement`
     - `read_insights`

2. **Exchange it in browser console:**
   ```javascript
   fetch('http://localhost:3001/api/facebook/exchange-for-page-token/1', {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       userAccessToken: 'YOUR_USER_ACCESS_TOKEN_HERE'
     })
   })
   .then(r => r.json())
   .then(data => {
     console.log('Your Pages:', data.pages);
     // Each page object has: pageId, pageName, pageAccessToken
   });
   ```

3. **Use the returned Page Access Token:**
   - Find your page in the results
   - Copy the `pageAccessToken`
   - Use it in your app

---

## 🎯 **What Changed in Your Code:**

### **1. Changed API Endpoint:**
```javascript
// OLD (won't work for insights):
/posts

// NEW (works with insights):
/published_posts
```

### **2. Added Exchange Endpoint:**
```
POST /api/facebook/exchange-for-page-token/:clientId
Body: { "userAccessToken": "..." }
```

### **3. Added Token Test Endpoint:**
```
GET /api/facebook/test-token/:clientId
```

---

## 📊 **How to Verify You Have the Right Token:**

### **Method 1: Test in Graph API Explorer**

1. Paste your token in Graph API Explorer
2. Run this query:
   ```
   /YOUR_PAGE_ID/published_posts?fields=id,message,created_time,insights.metric(post_impressions)
   ```
3. If you see posts with insights data → ✅ Token is correct!
4. If you get permission error → ❌ Token missing permissions

### **Method 2: Use Our Test Endpoint**

After restarting backend, visit:
```
http://localhost:3001/api/facebook/test-token/1
```

Check backend terminal for detailed test results.

---

## 🔄 **Steps to Fix Your App Right Now:**

### **1. Restart Backend:**
```bash
# Stop backend (Ctrl + C)
# Start again
npm run dev
```

### **2. Get the Correct Token:**
- Follow **Option 1** above (Graph API Explorer)
- Get the **Page Access Token** for your specific page

### **3. Enter in Your App:**
- Go to Social Media tab
- Enter **Page ID** (e.g., `744651835408507`)
- Enter **Page Access Token** (the long token from `/me/accounts`)
- Click "Save & Load Data"

### **4. Verify:**
- You should see data loading
- Backend terminal should show:
  ```
  📝 [INLINE INSIGHTS] Found X posts in batch 1
  ✅ Fetched X posts with inline insights
  ```

---

## 🐛 **Common Errors & Solutions:**

### **Error: "Insufficient permissions"**
**Fix:** Your token needs these permissions:
- `pages_read_engagement`
- `read_insights`
- `pages_show_list`

### **Error: "Invalid OAuth access token"**
**Fix:** You're using a User Token. Get the Page Token instead.

### **Error: "No posts found"**
**Options:**
1. Your page actually has no posts (create a test post)
2. Using `/posts` instead of `/published_posts` (already fixed)
3. Token doesn't have access to this page

### **Data shows 0 everywhere**
**Most likely:** 
1. Page has no posts yet
2. Using User Token instead of Page Token
3. Token expired (get a new one)

---

## 📝 **Quick Reference:**

### **User Access Token:**
- ❌ Can't read insights
- ❌ Can't get post metrics
- ✅ Can list your pages

### **Page Access Token:**
- ✅ Can read insights
- ✅ Can get post metrics
- ✅ Can manage page
- ✅ What you need!

---

## 🆘 **Still Not Working?**

1. **Check your Facebook Page:**
   - Does it have any posts?
   - Are you the admin?

2. **Check token permissions:**
   - Run: `http://localhost:3001/api/facebook/test-token/1`
   - Look for "Scopes" in the output

3. **Share these with me:**
   - Backend terminal logs (when you click "Save & Load Data")
   - Browser console errors
   - Result from test-token endpoint

---

## ✅ **Summary:**

**You need:**
1. ✅ **Page Access Token** (not User Access Token)
2. ✅ From `/me/accounts` endpoint
3. ✅ With `read_insights` permission
4. ✅ For the specific page you want to track

**Quick test:**
Go to https://developers.facebook.com/tools/explorer/
→ Run `/me/accounts`
→ Copy `access_token` from your page
→ Use that in your app!

That's it! 🚀

