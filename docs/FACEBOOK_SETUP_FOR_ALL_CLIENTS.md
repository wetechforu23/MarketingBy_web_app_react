# 📘 Facebook Setup Guide - For ALL Clients

**Global Facebook Integration** - Works for any client in your platform!

---

## 🌍 How It Works Globally

The Facebook integration is **multi-tenant** - each client can connect their own Facebook page independently:

```
Client 1 (ProMed) → Facebook Page A → Stores in DB with client_id = 1
Client 2 (Align Primary) → Facebook Page B → Stores in DB with client_id = 67
Client 3 (New Clinic) → Facebook Page C → Stores in DB with client_id = 99
...and so on for all clients!
```

---

## 📋 Setup Steps for ANY Client

### Step 1: Get Facebook Credentials for the Client

#### A. Get Client's Facebook Page ID
1. Go to the **client's Facebook Page** (must be admin)
2. Click **Settings** → **About**
3. Scroll to **Page ID** and copy it
4. Example: `744651835408507`

#### B. Get Client's Page Access Token
1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Login with an account that has admin access to the client's page
3. Click **Get Token** → **Get Page Access Token**
4. Select the **client's page** from dropdown
5. Add required permissions:
   - ✅ `pages_show_list` - View pages
   - ✅ `pages_read_engagement` - Read engagement metrics
   - ✅ `read_insights` - Read page insights
   - ✅ `pages_manage_posts` (optional) - For future post creation
6. Click **Generate Access Token**
7. Copy the token (starts with `EAA...`)
8. **Important**: This token is page-specific and client-specific

### Step 2: Connect in Dashboard

1. Login to https://marketingby.wetechforu.com/app/client-management
2. **Select the client** from dropdown (top of page)
3. Click **Settings** tab
4. Scroll to **Facebook Page** section
5. Enter:
   - **Page ID**: `[client's page ID]`
   - **Page Access Token**: `[client's token]`
6. Click **Connect Facebook** button
7. Wait for success message ✅

### Step 3: Sync Facebook Data

1. Click **📱 Social Media** tab
2. Click **🔄 Sync Facebook Data** button
3. Wait 5-10 seconds for sync
4. View real Facebook metrics for this client! 🎉

### Step 4: Repeat for Other Clients

**Each client is independent!**
- Switch to different client in dropdown
- Repeat Steps 1-3
- Each client's data is stored separately
- No conflicts between clients

---

## 🏢 Example: Setting Up Multiple Clients

### Client 1: ProMed Healthcare
```
Page ID: 744651835408507
Token: EAA[...ProMed's token...]
Status: ✅ Connected
Followers: 1,234
```

### Client 2: Align Primary Care
```
Page ID: [Align's page ID]
Token: EAA[...Align's token...]
Status: ✅ Connected
Followers: 856
```

### Client 3: New Medical Practice
```
Page ID: [New practice page ID]
Token: EAA[...New practice token...]
Status: ✅ Connected
Followers: 452
```

**All work independently without conflicts!**

---

## 🔍 How to Check Current Status

### For Any Client:

1. **Select client** from dropdown
2. Click **Settings** tab
3. Look at **Facebook Page** section:
   - **Connected** = Green checkmark ✅
   - **Not Connected** = Red cross ❌
   - Shows last connected timestamp

4. Click **📱 Social Media** tab to view metrics:
   - If connected: Shows real data
   - If not connected: Shows 0s with warning

---

## 🗄️ Database Structure (Per Client)

### client_credentials table
```
client_id | service_type | credentials                           | last_connected_at
----------|--------------|---------------------------------------|------------------
1         | facebook     | {"page_id": "xxx", "access_token": "EAA..."} | 2025-10-20
67        | facebook     | {"page_id": "yyy", "access_token": "EAA..."} | 2025-10-20
99        | facebook     | {"page_id": "zzz", "access_token": "EAA..."} | 2025-10-21
```

### facebook_insights table
```
client_id | metric_name         | metric_value | recorded_at
----------|---------------------|--------------|-------------
1         | page_views_total    | 850          | 2025-10-20
1         | page_fans           | 1234         | 2025-10-20
67        | page_views_total    | 623          | 2025-10-20
67        | page_fans           | 856          | 2025-10-20
99        | page_views_total    | 412          | 2025-10-21
99        | page_fans           | 452          | 2025-10-21
```

**Each client's data is completely separate!**

---

## 🔐 Security & Privacy

### Per-Client Isolation
- ✅ Each client's Facebook token is encrypted separately
- ✅ Client A cannot see Client B's Facebook data
- ✅ API endpoints verify client ownership
- ✅ Frontend only shows data for selected client
- ✅ Database enforces client_id foreign key constraints

### Access Control
- **Super Admin** (`info@wetechforu.com`): Can connect Facebook for any client
- **Client Admin**: Can only connect Facebook for their own practice
- **Client User**: Can view but not connect/disconnect

---

## 📊 What Each Client Gets

### Social Media Tab Shows:
1. **Page Views** - Client's page views (28 days)
2. **Followers** - Client's total followers
3. **Engagement Rate** - Client's engagement percentage
4. **Connection Status** - Client's connection state

### Sync Button:
- Syncs only the selected client's data
- Fetches insights for that client's page only
- Stores in DB with that client's ID

### Overview Table:
Shows metrics for the selected client only.

---

## 🔄 Switching Between Clients

### In the Dashboard:

1. **Select Client A** from dropdown
   - Social Media tab shows **Client A's Facebook data**
   - Settings shows **Client A's connection status**

2. **Select Client B** from dropdown
   - Social Media tab switches to **Client B's Facebook data**
   - Settings shows **Client B's connection status**

3. **Each client maintains their own**:
   - Connection status
   - Facebook credentials
   - Metrics history
   - Posts data
   - Follower statistics

---

## 🎯 Quick Setup Checklist (Per Client)

- [ ] Get client's Facebook Page ID
- [ ] Get client's Page Access Token (with admin access)
- [ ] Login to dashboard
- [ ] Select the client
- [ ] Go to Settings tab
- [ ] Enter Page ID and Token
- [ ] Click Connect Facebook
- [ ] Verify success message
- [ ] Go to Social Media tab
- [ ] Click Sync Facebook Data
- [ ] Verify metrics appear
- [ ] ✅ Done!

---

## 🆘 Troubleshooting (Per Client)

### Client shows "Not Connected"
**Solution**: Go to Settings → Connect Facebook for that specific client.

### Client shows "0" for all metrics
**Possible causes**:
1. Not synced yet → Click Sync button
2. Token expired → Get new token and reconnect
3. Page has no activity → Normal for new pages

### One client working, another not
**This is normal!** Each client must be connected independently:
- Client A connected → Shows data
- Client B not connected → Shows 0s
- Solution: Connect Client B separately

---

## 📈 Scaling to Many Clients

The system is designed to handle **unlimited clients**:

### Performance Optimizations:
- ✅ Database indexes on `client_id`
- ✅ Independent sync per client
- ✅ Cached credentials per client
- ✅ Efficient queries with foreign keys

### Best Practices:
1. **Connect clients as needed** - Don't need to connect all at once
2. **Sync regularly** - Use sync button or set up auto-sync (future feature)
3. **Monitor token expiry** - Tokens last 60 days, need renewal
4. **Check Heroku logs** - For any client-specific issues

---

## 🎉 Current Clients Ready for Facebook

### ProMed Healthcare (ID: 1)
- Status: Ready to connect
- Need: Page ID + Access Token

### Align Primary Care (ID: 67)
- Status: Ready to connect
- Need: Page ID + Access Token

### Any Future Clients
- Status: Automatically ready!
- Just need: Page ID + Access Token
- No code changes required

---

## 🚀 API Endpoints (Global)

All endpoints support any `clientId`:

```
POST   /api/facebook/connect/:clientId        - Connect any client
POST   /api/facebook/disconnect/:clientId     - Disconnect any client
POST   /api/facebook/sync/:clientId           - Sync any client's data
GET    /api/facebook/overview/:clientId       - Get any client's overview
GET    /api/facebook/posts/:clientId          - Get any client's posts
GET    /api/facebook/followers/:clientId      - Get any client's followers
```

**Just change `:clientId` parameter!**

---

## 📝 Summary

### ✅ Already Global Features:
- Multi-client database schema
- Per-client credential storage
- Independent sync per client
- Client-specific metrics
- Isolated data storage
- Dynamic client switching

### 🎯 How to Use for Any Client:
1. Select client in dashboard
2. Get their Facebook credentials
3. Connect in Settings
4. Sync in Social Media tab
5. Done! Repeat for next client

### 🔒 Security:
- Complete data isolation per client
- Encrypted credentials
- Role-based access control
- No cross-client data leakage

---

## 🎊 Ready for ALL Clients!

The Facebook integration is **fully multi-tenant** and works for:
- ✅ Existing clients (ProMed, Align Primary)
- ✅ New clients you add
- ✅ Future clients (automatic support)
- ✅ Unlimited number of clients

**No code changes needed to add new clients!**

---

**Need Help?**
- Check this guide for setup steps
- Review `FACEBOOK_INTEGRATION_COMPLETE.md` for technical details
- Check Heroku logs for errors: `heroku logs --tail --app marketingby-wetechforu`

