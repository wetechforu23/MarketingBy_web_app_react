# Facebook Posting Fixes - Tracking Document

**Last Updated:** 2025-11-06  
**Status:** ✅ Immediate Posting Working | ⚠️ Scheduled Posting Needs Fix

---

## 📋 Summary

This document tracks all fixes and issues related to Facebook posting functionality, including immediate posting and scheduled posting.

---

## ✅ Fixed Issues

### 1. **Immediate Posting - Image URL Issues** (FIXED)
**Date:** 2025-11-06  
**Issue:** Facebook posting was failing with "Invalid parameter" and "url should represent a valid URL" errors.

**Root Causes:**
- Path resolution for local files was incorrect
- Relative URLs were not being converted to absolute URLs
- Implementation didn't match the working `client-dashboard` branch

**Fixes Applied:**
1. **Path Resolution (`getLocalFilePath`):**
   - Simplified to match working branch: `path.join(__dirname, '../../uploads', path.basename(urlPath))`
   - Works correctly from both compiled (`dist`) and source directories

2. **URL Conversion:**
   - Added conversion of relative URLs to absolute URLs before sending to Facebook
   - Handles `/uploads/`, `uploads/`, and other relative path formats
   - Uses `BACKEND_URL` or `API_URL` env vars, defaults to `http://localhost:3001`

3. **Posting Logic:**
   - Matched working branch behavior:
     - **No link URL**: Simple one-step photo upload (direct to `/photos` endpoint)
     - **With link URL**: Two-step process (upload photo, then create feed post with link)
   - Properly handles hashtags (added after UTM URL in message)

**Files Modified:**
- `backend/src/services/facebookService.ts`
  - `getLocalFilePath()` method
  - `createImagePost()` method
  - `createMultiImagePost()` method

**Testing:**
- ✅ Immediate posting with images works
- ✅ Immediate posting with images + links works
- ✅ Immediate posting with hashtags works

---

## ⚠️ Current Issues

### 1. **Scheduled Posting Not Working** (FIXED)
**Date:** 2025-11-06  
**Status:** ✅ FIXED

**Symptoms:**
- Posts can be scheduled successfully (status: 'scheduled')
- Posts are not being posted when scheduled time arrives
- Cron job may not be processing scheduled posts

**Root Cause:**
- SQL query in `processScheduledPosts()` was failing when `attempt_count` or `max_attempts` were NULL
- Comparison `attempt_count < max_attempts` fails when either value is NULL in PostgreSQL

**Fixes Applied:**
1. **Fixed SQL Query:**
   - Changed: `AND p.attempt_count < p.max_attempts`
   - To: `AND COALESCE(p.attempt_count, 0) < COALESCE(p.max_attempts, 3)`
   - Now handles NULL values properly

2. **Fixed Attempt Count Update:**
   - Changed: `attempt_count = attempt_count + 1`
   - To: `attempt_count = COALESCE(attempt_count, 0) + 1`
   - Handles NULL attempt_count on first attempt

3. **Fixed Max Attempts Check:**
   - Added proper NULL handling when checking if max attempts reached
   - Uses defaults: `attempt_count = 0`, `max_attempts = 3`

4. **Added Debug Logging:**
   - Added logging when no posts are found to help debug
   - Shows counts of scheduled posts, ready to post, and max attempts reached

**Files Modified:**
- `backend/src/services/socialMediaPostingService.ts`
  - `processScheduledPosts()` function

**Testing:**
- ⏳ Needs testing: Schedule a post and verify it gets posted when time arrives
- ⏳ Verify cron job runs every 10 minutes
- ⏳ Check logs for `📅 [Scheduled Posts] Found X posts to process...`

---

## 🔧 Implementation Details

### Immediate Posting Flow

```
1. User clicks "Post Now"
   ↓
2. POST /api/content/:id/post-now
   ↓
3. postingService.schedulePost() with no scheduledTime
   ↓
4. Creates post record with status='posting'
   ↓
5. Immediately calls postToPlatform()
   ↓
6. postToFacebook() → facebookService.createPost()
   ↓
7. createImagePost() or createTextPost()
   ↓
8. Updates post status to 'posted' or 'failed'
```

### Scheduled Posting Flow

```
1. User clicks "Schedule Post"
   ↓
2. POST /api/content/:id/schedule
   ↓
3. postingService.schedulePost() with scheduledTime
   ↓
4. Creates post record with status='scheduled'
   ↓
5. [WAIT FOR SCHEDULED TIME]
   ↓
6. Cron job runs every 10 minutes
   ↓
7. processScheduledPosts() finds posts where:
   - status = 'scheduled'
   - scheduled_time <= NOW()
   - attempt_count < max_attempts
   ↓
8. For each post:
   - Update status to 'posting'
   - Call postToPlatform()
   - Update status to 'posted' or 'failed'
```

---

## 📊 Database Schema

### `social_media_posts` Table
```sql
- id (SERIAL PRIMARY KEY)
- client_id (INTEGER)
- content_id (INTEGER)
- platform (VARCHAR) -- 'facebook', 'linkedin', etc.
- status (VARCHAR) -- 'scheduled', 'posting', 'posted', 'failed'
- scheduled_time (TIMESTAMP)
- posted_at (TIMESTAMP)
- platform_post_id (VARCHAR)
- platform_url (TEXT)
- attempt_count (INTEGER) -- Should default to 0
- max_attempts (INTEGER) -- Should default to 3
- error_message (TEXT)
```

---

## 🐛 Debugging Commands

### Check Scheduled Posts
```sql
SELECT id, content_id, platform, status, scheduled_time, attempt_count, max_attempts
FROM social_media_posts
WHERE status = 'scheduled'
ORDER BY scheduled_time ASC;
```

### Check Posts Ready to Process
```sql
SELECT id, content_id, platform, status, scheduled_time, attempt_count, max_attempts
FROM social_media_posts
WHERE status = 'scheduled'
  AND scheduled_time <= NOW()
  AND attempt_count < COALESCE(max_attempts, 3)
ORDER BY scheduled_time ASC;
```

### Manual Test of processScheduledPosts
```javascript
// In backend console or test script
const { processScheduledPosts } = require('./services/socialMediaPostingService');
const result = await processScheduledPosts();
console.log(result);
```

---

## 📝 Version History

### 2025-11-06 - Initial Fixes
- ✅ Fixed immediate posting with images
- ✅ Fixed URL conversion for relative paths
- ✅ Matched working branch implementation
- ⚠️ Scheduled posting needs investigation

---

## 🔗 Related Files

- `backend/src/services/facebookService.ts` - Facebook API integration
- `backend/src/services/socialMediaPostingService.ts` - Posting service
- `backend/src/routes/content.ts` - Content routes (post-now, schedule)
- `backend/src/server.ts` - Cron job initialization
- `FACEBOOK_SCHEDULING_WORKFLOW.md` - Detailed scheduling workflow

---

## 📌 Notes

- Always use the working `client-dashboard` branch as reference
- Test both immediate and scheduled posting after any changes
- Verify cron job is running in production/staging environments
- Check logs for cron job execution: `⏰ [Cron Job] Checking for scheduled posts...`

