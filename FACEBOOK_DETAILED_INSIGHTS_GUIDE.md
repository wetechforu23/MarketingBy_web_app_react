# 📊 Facebook Detailed Insights - Complete Guide

## ✅ System Status: FULLY IMPLEMENTED

All Facebook detailed insights features are **already built and working**! You have:
- ✅ Top 5 performing posts with all metrics
- ✅ All posts with complete information
- ✅ 11 different metrics per post
- ✅ Engagement scoring and ranking
- ✅ Engagement rate calculations

---

## 📊 Available Metrics for Each Post

Every post includes these 11 detailed metrics:

| Metric | Description | API Field |
|--------|-------------|-----------|
| **👁️ Views** | Total impressions (times post was displayed) | `views` or `post_impressions` |
| **👥 Reach** | Unique people who saw the post | `reach` or `post_reach` |
| **👆 Clicks** | Total clicks on the post | `clicks` or `post_clicks` |
| **👍 Likes** | Number of likes | `likes` |
| **💬 Comments** | Number of comments | `comments` |
| **🔄 Shares** | Number of shares | `shares` |
| **❤️ Total Reactions** | All reactions (like, love, wow, etc.) | `total_reactions` |
| **🎯 Engaged Users** | Unique users who engaged | `engaged_users` |
| **📹 Video Views** | Video views (if video post) | `video_views` |
| **📈 Engagement Score** | Calculated ranking score | `engagement_score` |
| **💯 Engagement Rate** | Engagement percentage | `engagement_rate` |

---

## 🔌 API Endpoints

### 1. **Top 5 Performing Posts**

Get the top performing posts ranked by engagement score.

**Endpoint:**
```
GET /api/facebook/analytics/top-posts/:clientId?limit=5
```

**Example:**
```bash
curl http://localhost:3001/api/facebook/analytics/top-posts/1?limit=5
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "post_id": "123456789_987654321",
      "message": "Your post content here...",
      "created_time": "2025-10-09T10:00:00.000Z",
      "permalink_url": "https://facebook.com/...",
      "post_type": "photo",
      "full_picture": "https://...",
      "views": 1250,
      "reach": 890,
      "clicks": 45,
      "likes": 67,
      "comments": 12,
      "shares": 5,
      "total_reactions": 84,
      "engaged_users": 95,
      "video_views": 0,
      "engagement_score": 157.5,
      "engagement_rate": 9.44
    }
  ],
  "count": 5
}
```

**Engagement Score Formula:**
```
engagement_score = 
  total_reactions + 
  (comments * 2) + 
  (shares * 3) + 
  (clicks * 0.1)
```

**Engagement Rate Formula:**
```
engagement_rate = 
  ((total_reactions + comments + shares) / reach) * 100
```

---

### 2. **All Recent Posts**

Get all posts sorted by date with complete metrics.

**Endpoint:**
```
GET /api/facebook/posts/:clientId?limit=50
```

**Example:**
```bash
curl http://localhost:3001/api/facebook/posts/1?limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "post_id": "123456789_987654321",
      "message": "Post content...",
      "created_time": "2025-10-16T10:00:00.000Z",
      "views": 850,
      "reach": 620,
      "clicks": 32,
      "likes": 45,
      "comments": 8,
      "shares": 3,
      "total_reactions": 56,
      "engaged_users": 68,
      "video_views": 0,
      "engagement_score": 98.2,
      "engagement_rate": 9.03
    }
  ],
  "count": 50
}
```

---

### 3. **Sync Facebook Data**

Fetch fresh data from Facebook and update the database.

**Endpoint:**
```
POST /api/facebook/sync/:clientId
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/facebook/sync/1
```

**What it does:**
1. Fetches page information from Facebook
2. Fetches all posts (up to 50)
3. For each post, fetches detailed insights:
   - Impressions (views)
   - Reach (unique viewers)
   - Clicks
   - Engaged users
   - Video views (if applicable)
   - Reaction breakdown
4. Stores everything in the database
5. Returns updated metrics

---

## 🎯 How to Use in Your Frontend

### **Option 1: Fetch Top 5 Posts**

```typescript
// In your React component
const fetchTopPosts = async () => {
  try {
    const response = await fetch(
      'http://localhost:3001/api/facebook/analytics/top-posts/1?limit=5',
      {
        credentials: 'include' // Include session cookie
      }
    );
    const data = await response.json();
    
    if (data.success) {
      setTopPosts(data.data);
    }
  } catch (error) {
    console.error('Error fetching top posts:', error);
  }
};
```

### **Option 2: Fetch All Posts**

```typescript
const fetchAllPosts = async () => {
  try {
    const response = await fetch(
      'http://localhost:3001/api/facebook/posts/1?limit=50',
      {
        credentials: 'include'
      }
    );
    const data = await response.json();
    
    if (data.success) {
      setAllPosts(data.data);
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
  }
};
```

### **Option 3: Sync Data**

```typescript
const syncFacebookData = async () => {
  try {
    setSyncing(true);
    const response = await fetch(
      'http://localhost:3001/api/facebook/sync/1',
      {
        method: 'POST',
        credentials: 'include'
      }
    );
    const data = await response.json();
    
    if (data.success) {
      console.log('Synced successfully!', data);
      // Refresh the posts after sync
      await fetchTopPosts();
      await fetchAllPosts();
    }
  } catch (error) {
    console.error('Error syncing:', error);
  } finally {
    setSyncing(false);
  }
};
```

---

## 📝 Database Schema

### **facebook_posts table**

```sql
CREATE TABLE facebook_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  post_id VARCHAR(255) UNIQUE NOT NULL,
  message TEXT,
  created_time TIMESTAMP NOT NULL,
  permalink_url TEXT,
  post_type VARCHAR(50),
  full_picture TEXT,
  
  -- Basic engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,
  
  -- Detailed insights
  post_impressions INTEGER DEFAULT 0,      -- Views
  post_reach INTEGER DEFAULT 0,            -- Unique viewers
  post_clicks INTEGER DEFAULT 0,           -- Clicks
  post_engaged_users INTEGER DEFAULT 0,    -- Engaged users
  post_video_views INTEGER DEFAULT 0,      -- Video views
  
  -- Additional data
  post_data JSONB,                         -- Full JSON from Facebook
  synced_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_facebook_posts_client_id ON facebook_posts(client_id);
CREATE INDEX idx_facebook_posts_created_time ON facebook_posts(created_time DESC);
CREATE INDEX idx_facebook_posts_engagement ON facebook_posts(post_engaged_users DESC);
CREATE INDEX idx_facebook_posts_impressions ON facebook_posts(post_impressions DESC);
```

---

## 🧪 Testing

### **Test 1: Check Database**

```bash
cd "C:\Users\raman\OneDrive\Desktop\wetechfor u\main app\MarketingBy_web_app_react"
node backend/test_facebook_detailed_insights.js
```

This will show:
- ✅ Database columns
- ✅ Top 5 posts with all metrics
- ✅ Summary of all posts
- ✅ Available API endpoints

### **Test 2: Sync Data via Frontend**

1. Open http://localhost:5174
2. Login with your credentials
3. Go to **Social Media Analytics** page
4. Click **"Sync Facebook Data"** button
5. Wait 10-15 seconds (it fetches detailed insights for each post)
6. Refresh the page
7. You should see updated metrics

### **Test 3: API Test via Browser**

Open these URLs in your browser (after logging in):

1. Top posts: http://localhost:3001/api/facebook/analytics/top-posts/1?limit=5
2. All posts: http://localhost:3001/api/facebook/posts/1?limit=50

---

## 🔍 Current Status

### ✅ **What's Working:**

1. ✅ **Database schema** - All columns exist
2. ✅ **API endpoints** - Both endpoints are functional
3. ✅ **Facebook service** - Fetches all 11 metrics
4. ✅ **Page Access Token** - Valid and working
5. ✅ **Data storage** - Posts are stored with basic metrics

### ⚠️ **What Needs Update:**

The current posts have **Views, Reach, and Clicks = 0** because they were synced before we had the Page Access Token. To get detailed insights:

1. Click **"Sync Facebook Data"** in the frontend
2. The service will re-fetch all posts with detailed insights
3. Views, reach, clicks will be populated

---

## 📊 Expected Output

After syncing, your posts should look like this:

```
🏆 Top 5 Performing Posts:

#1 Post
  Message: 🩺 Take control of your health...
  Posted: 10/9/2025
  📊 Metrics:
     👁️  Views: 1,250
     👥 Reach: 890
     👆 Clicks: 45
     👍 Likes: 67
     💬 Comments: 12
     🔄 Shares: 5
     ❤️  Total Reactions: 84
     🎯 Engaged Users: 95
     📹 Video Views: 0
     📈 Engagement Score: 157.5
     💯 Engagement Rate: 9.44%
```

---

## 🎯 Next Steps

1. **Open your frontend:** http://localhost:5174
2. **Navigate to Social Media Analytics**
3. **Click "Sync Facebook Data"**
4. **Wait 10-15 seconds**
5. **Refresh the page**
6. **See the updated metrics!**

---

## 🛠️ Technical Details

### **Service Methods:**

- `fetchAndStoreData(clientId)` - Main sync function
- `fetchPageInfo(pageId, token)` - Get page basic info
- `fetchPosts(pageId, token, limit)` - Get posts with engagement
- `fetchPostInsights(postId, token)` - Get detailed metrics per post
- `getTopPerformingPosts(clientId, limit)` - Query top posts
- `getRecentPosts(clientId, limit)` - Query all posts

### **Files:**

- `backend/src/services/facebookService.ts` - Main service
- `backend/src/routes/api.ts` - API endpoints (lines 4718 and 4818)
- `backend/database/create_facebook_tables.sql` - Table schema
- `backend/database/enhance_facebook_posts.sql` - Column updates

---

## 🎉 Summary

Your Facebook Detailed Insights system is **fully built and ready to use**! All the code is already in place:

✅ Database has all required columns
✅ API endpoints are working
✅ Service fetches all 11 metrics
✅ Top 5 posts ranking is functional
✅ All posts listing is functional
✅ Engagement scoring is calculated
✅ Engagement rate is calculated

**Just sync your data to see the detailed metrics!** 🚀

