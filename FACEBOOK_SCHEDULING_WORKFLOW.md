# Facebook Post Scheduling - Complete Workflow

## 📊 Database Tables

### 1. `social_media_content` Table
**Purpose:** Stores the content itself (title, text, media, etc.)

**Status Flow:**
- `draft` → `pending_client_approval` → `approved` → `posted`
- **IMPORTANT:** Content status stays `approved` when scheduled (does NOT change to `scheduled`)
- Content status only changes to `posted` when ALL posts are successfully posted

**Columns:**
- `id` - Content ID
- `client_id` - Client who owns this content
- `title` - Content title
- `content_text` - Post text
- `media_urls` - Array of image/video URLs
- `status` - Content status (draft, approved, posted, etc.)
- `target_platforms` - Array of platforms (facebook, linkedin, etc.)

### 2. `social_media_posts` Table
**Purpose:** Stores individual post records (one per platform per content)

**Status Flow:**
- `draft` → `scheduled` → `posting` → `posted` (or `failed`)

**Columns:**
- `id` - Post ID
- `client_id` - Client ID
- `content_id` - References `social_media_content.id`
- `platform` - Platform name (facebook, linkedin, etc.)
- `status` - Post status (`scheduled`, `posted`, `failed`, etc.)
- `scheduled_time` - When to post (TIMESTAMP)
- `posted_at` - When it was actually posted (TIMESTAMP)
- `platform_post_id` - Facebook post ID after posting
- `platform_url` - URL to the post on Facebook

---

## 🔄 Complete Workflow

### **FRONTEND FLOW:**

1. **User clicks "Schedule Post" button** (ContentEditor.tsx)
   - Opens modal with date/time picker (10-minute intervals)
   - User selects platforms to schedule

2. **Frontend sends request:**
   ```
   POST /api/content/:id/schedule
   Body: {
     platforms: ['facebook'],
     scheduledTime: '2025-11-07T11:40:00.000Z'
   }
   ```

3. **After successful scheduling:**
   - Shows alert: "✅ Post scheduled successfully"
   - Closes modal
   - Refreshes content (but content status stays 'approved')

4. **User navigates to "Scheduled Posts" tab:**
   - Frontend calls: `GET /api/posts?status=scheduled`
   - Displays all scheduled posts in table

---

### **BACKEND FLOW:**

#### **Step 1: Schedule Endpoint** (`POST /api/content/:id/schedule`)

1. **Validate content:**
   - Check if content exists
   - Check if content status is `approved`
   - If not approved → return error

2. **For each platform:**
   - Call `postingService.schedulePost()`

#### **Step 2: Create Post Record** (`schedulePost()` function)

1. **Validate content for platform:**
   - Check character limits
   - Check media requirements
   - Validate hashtags, mentions

2. **Create post record in `social_media_posts`:**
   ```sql
   INSERT INTO social_media_posts (
     client_id,
     content_id,
     platform,
     post_type,
     scheduled_time,
     status,
     created_by
   ) VALUES (
     $1,  -- clientId
     $2,  -- contentId
     $3,  -- platform (e.g., 'facebook')
     'organic',
     $4,  -- scheduledTime (TIMESTAMP)
     'scheduled',  -- Status is 'scheduled'
     $5   -- created_by
   )
   ```

3. **Result:**
   - ✅ Post record created with `status='scheduled'`
   - ✅ `scheduled_time` set to future date
   - ✅ Content status stays `approved` (NOT changed)

#### **Step 3: Cron Job** (runs every 10 minutes)

1. **Find scheduled posts:**
   ```sql
   SELECT * FROM social_media_posts
   WHERE status = 'scheduled'
     AND scheduled_time <= NOW()
     AND attempt_count < max_attempts
   ORDER BY scheduled_time ASC
   LIMIT 100
   ```

2. **For each post:**
   - Update status to `posting`
   - Call Facebook API to post
   - If success:
     - Update `social_media_posts.status = 'posted'`
     - Set `posted_at = NOW()`
     - Set `platform_post_id` and `platform_url`
     - Update `social_media_content.status = 'posted'` (only if all posts are done)
   - If failed:
     - Update `social_media_posts.status = 'failed'` (if max attempts reached)
     - Or keep as `scheduled` to retry

---

## 🔍 Status Updates Explained

### **Content Status (`social_media_content.status`):**
- `approved` → Content is ready to post
- `approved` → **STAYS approved when scheduled** (does NOT change)
- `approved` → `posted` → Only when ALL posts are successfully posted

### **Post Status (`social_media_posts.status`):**
- `scheduled` → Post is scheduled for future
- `posting` → Currently being posted by cron job
- `posted` → Successfully posted to Facebook
- `failed` → Failed after max attempts

---

## 🐛 Current Issues & Fixes

### **Issue 1: Scheduled Posts Not Showing**
**Problem:** Query fails with 500 error

**Root Cause:** Column name mismatch - query uses `cl.business_name` but table has `cl.client_name`

**Fix Applied:** ✅ Changed to `cl.client_name` in:
- `backend/src/routes/posts.ts`
- `backend/src/services/socialMediaPostingService.ts`

### **Issue 2: Content Status Not Updating**
**Expected Behavior:** ✅ Content status should STAY `approved` when scheduled
- Only the post record gets `status='scheduled'`
- Content status only changes to `posted` when all posts are done

**This is CORRECT behavior - no fix needed!**

---

## 📝 Summary

**Tables Used:**
1. `social_media_content` - Stores content (status: approved → posted)
2. `social_media_posts` - Stores individual posts (status: scheduled → posted)

**When Post is Scheduled:**
- ✅ Post record created in `social_media_posts` with `status='scheduled'`
- ✅ Content status stays `approved` (correct!)
- ✅ Post appears in "Scheduled Posts" tab

**When Post is Posted (by cron):**
- ✅ `social_media_posts.status` → `posted`
- ✅ `social_media_posts.posted_at` → Current timestamp
- ✅ `social_media_posts.platform_post_id` → Facebook post ID
- ✅ `social_media_content.status` → `posted` (if all posts done)

**When Post Fails:**
- ✅ `social_media_posts.status` → `failed` (after max attempts)
- ✅ `social_media_posts.error_message` → Error details
- ✅ Content status stays `approved` (can retry)


