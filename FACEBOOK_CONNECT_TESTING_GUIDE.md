# 🧪 Facebook Connect Feature - Testing Guide

## ✅ Setup Complete!

**Backend**: Running on port 3001 ✅  
**Frontend**: Running on port 5173 ✅  
**Button Added**: Integration Settings ✅

---

## 🎯 How to Test the Feature

### Step 1: Navigate to Integration Settings
1. Open your browser: `http://localhost:5173/app/client-management`
2. Select **"WeTechForU"** or any client from the dropdown
3. Click on the **"⚙️ Settings"** tab

### Step 2: Find the New Button
Scroll down to the **"Facebook Page"** section. You'll see a new blue box with:

```
🚀 New: Advanced Connection System

Use our new 2-way Facebook connection system with automatic 
token management, permission verification, and OAuth support.

[🔗 Advanced Facebook Connect] BETA
```

### Step 3: Click the Button
- Click the **"🔗 Advanced Facebook Connect"** button
- You'll be redirected to: `http://localhost:5173/app/facebook-connect/{clientId}`

### Step 4: Test the Two Connection Methods

#### **Method 1: OAuth Flow (Recommended)**
1. Click **"🔗 Connect with Facebook"** button
2. You'll be redirected to Facebook login
3. Authorize the app
4. Select which Facebook page to connect
5. Confirm selection
6. You'll be redirected back with success message

#### **Method 2: Manual Token Input**
1. Paste any Facebook token in the input field (User or Page Token)
2. Click **"✋ Connect Manually"**
3. The system will:
   - Detect if it's a User Token or Page Token
   - If User Token is short-lived → Auto-convert to long-lived
   - If Page Token → Verify permissions
   - Show page selection dropdown
4. Select the page to connect
5. Confirm and save

---

## 🔍 What to Check

### ✅ Integration Settings Page
- [ ] Can you see the new blue "Advanced Connection System" box?
- [ ] Does the button show "BETA" badge?
- [ ] Does clicking the button navigate to the new page?

### ✅ Facebook Connect Page
- [ ] Do you see two connection method sections?
- [ ] Does the OAuth button show a gradient blue color?
- [ ] Does the manual input have a text field?

### ✅ OAuth Flow
- [ ] Does clicking OAuth button redirect to Facebook?
- [ ] After authorization, are you redirected back?
- [ ] Do you see a page selection dropdown?

### ✅ Manual Token Flow
- [ ] Can you paste a token in the input field?
- [ ] Does it detect token type (User/Page)?
- [ ] Does it show appropriate messages?
- [ ] Do you see page selection dropdown after successful detection?

### ✅ Error Handling
- [ ] Invalid tokens show error messages
- [ ] Missing permissions show warnings
- [ ] Connection failures display user-friendly errors

---

## 📊 Backend Logs to Monitor

Open your backend terminal and watch for:
- `📊 Fetching 8 core Facebook Page metrics for client X`
- `✅ Token is valid` or `❌ Token is invalid`
- `ℹ️  Short-lived user token detected, exchanging for long-lived...`
- `✅ Stored Facebook credentials for client X`

---

## 🐛 Common Issues & Solutions

### Issue: Button not visible
**Solution**: Refresh the page (Ctrl+R)

### Issue: OAuth URL not generating
**Check**: `.env` file has `FACEBOOK_APP_ID` and `FACEBOOK_REDIRECT_URI`

### Issue: Manual token fails
**Check**: Token has required permissions: `pages_manage_posts`, `pages_read_engagement`, `read_insights`, `pages_show_list`

### Issue: Page selection empty
**Check**: The token belongs to a user who manages at least one Facebook page

---

## 🎨 What You Should See

### Integration Settings Page:
```
┌─────────────────────────────────────────┐
│ Facebook Page        [Connected/Not]    │
│                                          │
│ [Page ID Input]                         │
│ [Access Token Input]                    │
│ [Connect Facebook] or [Disconnect]      │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 🚀 New: Advanced Connection System  │ │
│ │                                     │ │
│ │ Use our new 2-way Facebook          │ │
│ │ connection system...                │ │
│ │                                     │ │
│ │ [🔗 Advanced Facebook Connect] BETA │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Facebook Connect Page:
```
┌───────────────────────────────────────────────┐
│ 📘 Facebook Connection for Client X           │
│                                                │
│ ┌───────────────────────────────────────────┐ │
│ │ Method 1: Connect with Link (Recommended)│ │
│ │                                           │ │
│ │ Use the secure OAuth flow...              │ │
│ │ [🔗 Connect with Facebook]                │ │
│ └───────────────────────────────────────────┘ │
│                                                │
│ ┌───────────────────────────────────────────┐ │
│ │ Method 2: Manual Token Input              │ │
│ │                                           │ │
│ │ Paste any Facebook token...               │ │
│ │ [Input Field________________________]     │ │
│ │ [✋ Connect Manually]                      │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

---

## 📝 Next Steps After Testing

1. **If everything works**: 
   - Commit changes to `feature/facebook-connect-isolated` branch
   - Create a pull request to merge into `main`
   - Deploy to production

2. **If there are issues**:
   - Check browser console (F12) for errors
   - Check backend terminal for error logs
   - Share screenshots/logs for debugging

---

## 🚀 Ready to Test!

Open: **http://localhost:5173/app/client-management**

Select a client → Go to Settings tab → Click "Advanced Facebook Connect" button!

