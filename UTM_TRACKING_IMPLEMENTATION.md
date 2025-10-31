# 🎯 UTM Tracking Implementation - Phase 1: Text Posts Only

**Status**: ✅ **READY FOR LOCAL TESTING**  
**Date**: October 28, 2025  
**Feature**: Automatic UTM parameter tracking for Facebook text posts

---

## 📦 What I Created (So Far)

### 1. **Database Migration** ✅
**File**: `backend/database/add_utm_tracking_to_facebook_posts.sql`

Adds these columns to `facebook_posts` table:
- `utm_campaign` - Unique campaign identifier
- `utm_source` - Always 'facebook'
- `utm_medium` - Always 'social'
- `original_urls` - Array of URLs before tracking
- `tracked_urls` - Array of URLs with UTM params

**Status**: **NOT RUN YET** - Waiting for your approval

---

### 2. **UTM Tracking Service** ✅
**File**: `backend/src/services/utmTrackingService.ts`

New isolated service that:
- ✅ Generates unique campaign names (e.g., `promed_fb_text_1730123456789`)
- ✅ Finds all URLs in post content
- ✅ Adds UTM parameters to each URL
- ✅ Returns tracked content with UTM-enabled URLs

**Example**:
```typescript
Input:  "Check out our services! https://wetechforu.com"
Output: "Check out our services! https://wetechforu.com?utm_source=facebook&utm_medium=social&utm_campaign=promed_fb_text_1730123456789&utm_content=text"
```

**Status**: **READY TO TEST** - No changes to existing code

---

### 3. **Test File** ✅
**File**: `backend/src/services/test_utm_tracking.ts`

Test script to verify UTM tracking works BEFORE integrating with Facebook posting.

---

## 🧪 HOW TO TEST (Step-by-Step)

### Step 1: Run Database Migration on LOCAL Database

```bash
# Option A: If you have psql installed
psql -h localhost -U postgres -d your_database < backend/database/add_utm_tracking_to_facebook_posts.sql

# Option B: Using your database client (pgAdmin, TablePlus, etc.)
# Just copy and paste the SQL from the file
```

**Verify it worked:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'facebook_posts' 
  AND column_name IN ('utm_campaign', 'utm_source', 'utm_medium', 'original_urls', 'tracked_urls');
```

You should see 5 new columns.

---

### Step 2: Test UTM Tracking Service in Isolation

```bash
cd backend
npx ts-node src/services/test_utm_tracking.ts
```

**Expected Output:**
```
🧪 Testing UTM Tracking Service
================================================================================

📝 Test 1: Single URL in message
--------------------------------------------------------------------------------
Original Content:
  "Check out our new services! https://wetechforu.com/services"

Tracked Content:
  "Check out our new services! https://wetechforu.com/services?utm_source=facebook&utm_medium=social&utm_campaign=promed_healthcare_fb_text_1730123456789&utm_content=text"

Campaign: promed_healthcare_fb_text_1730123456789
Original URLs: 1
Tracked URLs: 1
...
```

If you see this output, **UTM tracking is working!** ✅

---

### Step 3: Review Before I Modify `facebookService.ts`

**⚠️ I HAVE NOT TOUCHED `facebookService.ts` YET** (as you requested)

Before I proceed, please confirm:
1. ✅ Database migration ran successfully
2. ✅ Test script shows correct output
3. ✅ You approve integrating into `createTextPost()` method

---

## 🔄 NEXT STEP: Integrate with Facebook Posting

**Once you approve**, I will:

1. **Modify** `backend/src/services/facebookService.ts`:
   - Import the new `UTMTrackingService`
   - Update `createTextPost()` method to:
     - Get client name from database
     - Process message content with UTM tracking
     - Post tracked content to Facebook
     - Store UTM data in database

2. **Add Feature Flag** (optional safety):
   ```typescript
   const ENABLE_UTM_TRACKING = process.env.ENABLE_UTM_TRACKING === 'true';
   ```

3. **Graceful Fallback**:
   - If UTM tracking fails → post without tracking (don't break posting)

---

## 📊 What Will Change in `createTextPost()`

**BEFORE** (Current Code):
```typescript
async createTextPost(clientId: number, message: string) {
  const credentials = await this.getClientCredentials(clientId);
  
  const response = await axios.post(
    `${this.baseUrl}/${credentials.page_id}/feed`,
    { message: message, access_token: credentials.access_token }
  );
  
  return { success: true, postId: response.data.id };
}
```

**AFTER** (With UTM Tracking):
```typescript
async createTextPost(clientId: number, message: string) {
  const credentials = await this.getClientCredentials(clientId);
  
  // NEW: Get client name
  const clientResult = await this.pool.query(
    'SELECT name FROM clients WHERE id = $1', [clientId]
  );
  const clientName = clientResult.rows[0]?.name || 'client';
  
  // NEW: Process content with UTM tracking
  const { trackedContent, utmCampaign, originalUrls, trackedUrls } = 
    UTMTrackingService.processPostContent(message, clientId, clientName, 'text');
  
  console.log('🔗 Posting with UTM tracking');
  console.log(`   Campaign: ${utmCampaign}`);
  
  // Post with tracked content
  const response = await axios.post(
    `${this.baseUrl}/${credentials.page_id}/feed`,
    { message: trackedContent, access_token: credentials.access_token }
  );
  
  const postId = response.data.id;
  
  // NEW: Store UTM data in database
  await this.pool.query(
    `INSERT INTO facebook_posts (..., utm_campaign, utm_source, utm_medium, original_urls, tracked_urls)
     VALUES (..., $5, $6, $7, $8, $9)`,
    [..., utmCampaign, 'facebook', 'social', originalUrls, trackedUrls]
  );
  
  return { success: true, postId, utmCampaign };
}
```

---

## ⚠️ IMPORTANT: What I'm NOT Changing (Yet)

- ❌ `createImagePost()` - Not touching yet
- ❌ `createVideoPost()` - Not touching yet
- ❌ `createMultiImagePost()` - Not touching yet
- ❌ Any other existing methods

**Only `createTextPost()` for now** (as you requested - start with #2)

---

## ✅ FILES CREATED (Summary)

1. ✅ `backend/database/add_utm_tracking_to_facebook_posts.sql` - Migration
2. ✅ `backend/src/services/utmTrackingService.ts` - Service (isolated)
3. ✅ `backend/src/services/test_utm_tracking.ts` - Test script
4. ✅ `UTM_TRACKING_IMPLEMENTATION.md` - This file

**Files NOT Modified**: `facebookService.ts` (waiting for approval)

---

## 🎯 YOUR ACTION ITEMS

1. **Run database migration** (Step 1 above)
2. **Run test script** (Step 2 above)
3. **Verify test output** looks correct
4. **Tell me**: "Looks good, proceed with facebookService.ts integration"

**OR**

**Tell me**: What needs to change before proceeding

---

## 🚀 After Your Approval

Once you test locally and confirm it works, I will:
1. Integrate UTM tracking into `createTextPost()`
2. Test the full flow (create Facebook post with URL)
3. Verify database stores UTM data
4. Verify Facebook post has tracked URLs
5. Show you the changes for final approval before pushing to production

---

## 📞 Questions?

If anything is unclear or you need help running the tests, just ask!

**Remember**: No changes to production code yet. Everything is isolated and safe to test. 🔒

