# 📊 Facebook Analytics Time-Series Migration

## ✅ Implementation Complete

Converted `facebook_analytics` table from **single-row-per-client** to **daily time-series storage** (one entry per client per day).

---

## 🎯 **What Changed**

### **Before** (Single Row):
```
client_id | page_views | followers | synced_at
----------|------------|-----------|-------------------
1         | 146        | 45        | 2025-10-24 10:30
```
- ❌ Only latest data
- ❌ No history
- ❌ Can't track trends
- 🔄 UPSERT overwrites previous data

### **After** (Daily Time-Series):
```
client_id | metric_date | page_views | followers | synced_at
----------|-------------|------------|-----------|-------------------
1         | 2025-10-24  | 146        | 45        | 2025-10-24 10:30
1         | 2025-10-23  | 140        | 43        | 2025-10-23 09:15
1         | 2025-10-22  | 138        | 42        | 2025-10-22 08:45
```
- ✅ Historical data preserved
- ✅ One entry per day
- ✅ Can track trends
- ✅ Can generate charts
- 🔄 UPSERT updates if same client + date exists

---

## 🔧 **Technical Changes**

### **1. Database Migration** (`backend/database/migrate_facebook_analytics_to_timeseries.sql`)

```sql
-- Add metric_date column
ALTER TABLE facebook_analytics 
  ADD COLUMN metric_date DATE DEFAULT CURRENT_DATE;

-- Change unique constraint
ALTER TABLE facebook_analytics 
  DROP CONSTRAINT IF EXISTS facebook_analytics_client_id_key;

ALTER TABLE facebook_analytics 
  ADD CONSTRAINT facebook_analytics_unique_client_date 
  UNIQUE(client_id, metric_date);

-- Add indexes for performance
CREATE INDEX idx_facebook_analytics_client_date 
  ON facebook_analytics(client_id, metric_date DESC);

CREATE INDEX idx_facebook_analytics_date 
  ON facebook_analytics(metric_date DESC);
```

### **2. Backend Service Updates** (`backend/src/services/facebookService.ts`)

#### **Storage Method** (Lines 515-524):
```typescript
// Now includes metric_date in INSERT
INSERT INTO facebook_analytics (
  client_id, page_views, followers, engagement, reach, 
  impressions, engagement_rate, metric_date, synced_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, NOW())
ON CONFLICT (client_id, metric_date)  // NEW: conflict on both columns
DO UPDATE SET 
  page_views = $2, followers = $3, engagement = $4, 
  reach = $5, impressions = $6, engagement_rate = $7, 
  synced_at = NOW()
```

#### **Retrieval Method** (Lines 639-649):
```typescript
// Now orders by metric_date DESC to get latest day
SELECT page_views, followers, engagement, reach, impressions, 
       engagement_rate, metric_date
FROM facebook_analytics 
WHERE client_id = $1 
ORDER BY metric_date DESC, synced_at DESC  // NEW: order by date first
LIMIT 1
```

#### **New Historical Data Method** (Lines 1429-1456):
```typescript
async getHistoricalData(clientId: number, days: number = 30) {
  // Fetch last N days of data for trend analysis
  SELECT metric_date, page_views, followers, engagement, 
         reach, impressions, engagement_rate, synced_at
  FROM facebook_analytics
  WHERE client_id = $1
    AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
  ORDER BY metric_date DESC
}
```

---

## 📊 **How It Works**

### **Daily Sync Process**:

```
1. User clicks "Refresh All Data" or scheduled job runs
   ↓
2. Fetch metrics from Facebook API
   ↓
3. Store in database with CURRENT_DATE as metric_date
   ↓
4. If entry for today already exists → UPDATE
5. If entry for today doesn't exist → INSERT
   ↓
6. Historical data preserved (yesterday, last week, etc.)
```

### **Data Retrieval**:

```
Latest Data (for dashboard):
  SELECT * FROM facebook_analytics 
  WHERE client_id = 1
  ORDER BY metric_date DESC
  LIMIT 1

Last 30 Days (for charts):
  SELECT * FROM facebook_analytics 
  WHERE client_id = 1
    AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY metric_date DESC
```

---

## 🎯 **Benefits**

| Feature | Before | After |
|---------|--------|-------|
| **Historical Data** | ❌ Lost on refresh | ✅ Preserved forever |
| **Trend Analysis** | ❌ Impossible | ✅ Easy queries |
| **Chart Generation** | ❌ No data | ✅ Full history |
| **Daily Snapshots** | ❌ Not tracked | ✅ One per day |
| **Data Loss Risk** | ❌ High (overwrites) | ✅ None |
| **Storage** | ✅ Minimal (1 row) | ⚠️ More (1 row/day) |

---

## 📈 **Use Cases Enabled**

### **1. Growth Charts**
```sql
-- Follower growth over 30 days
SELECT metric_date, followers,
       followers - LAG(followers) OVER (ORDER BY metric_date) as daily_growth
FROM facebook_analytics
WHERE client_id = 1
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY metric_date;
```

### **2. Engagement Trends**
```sql
-- Engagement rate trend
SELECT metric_date, engagement_rate
FROM facebook_analytics
WHERE client_id = 1
  AND metric_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY metric_date;
```

### **3. Compare Periods**
```sql
-- This week vs last week
SELECT 
  SUM(CASE WHEN metric_date >= CURRENT_DATE - 7 THEN page_views ELSE 0 END) as this_week,
  SUM(CASE WHEN metric_date < CURRENT_DATE - 7 AND metric_date >= CURRENT_DATE - 14 THEN page_views ELSE 0 END) as last_week
FROM facebook_analytics
WHERE client_id = 1;
```

### **4. Month-over-Month Growth**
```sql
-- Monthly comparison
SELECT 
  DATE_TRUNC('month', metric_date) as month,
  AVG(followers) as avg_followers,
  SUM(page_views) as total_views
FROM facebook_analytics
WHERE client_id = 1
GROUP BY DATE_TRUNC('month', metric_date)
ORDER BY month DESC;
```

---

## 🚀 **How to Apply**

### **Step 1: Run Migration**

Open pgAdmin and run the migration:

```bash
# In pgAdmin Query Tool:
# Copy and paste content from:
backend/database/migrate_facebook_analytics_to_timeseries.sql
```

Or via command line:
```bash
cd backend
psql $DATABASE_URL -f database/migrate_facebook_analytics_to_timeseries.sql
```

### **Step 2: Restart Backend**

The backend code is already updated. Just restart:

```bash
cd backend
npm run dev
```

### **Step 3: Test**

1. Go to Social Media tab
2. Click "Refresh All Data"
3. Check database:
   ```sql
   SELECT client_id, metric_date, page_views, followers 
   FROM facebook_analytics 
   ORDER BY metric_date DESC;
   ```

---

## 🔍 **Verification Queries**

### **Check Today's Data**:
```sql
SELECT * FROM facebook_analytics 
WHERE metric_date = CURRENT_DATE;
```

### **Check Historical Data**:
```sql
SELECT client_id, metric_date, followers, page_views
FROM facebook_analytics
ORDER BY client_id, metric_date DESC;
```

### **Count Days of Data per Client**:
```sql
SELECT client_id, COUNT(*) as days_tracked
FROM facebook_analytics
GROUP BY client_id
ORDER BY client_id;
```

---

## ⚠️ **Important Notes**

1. **Existing Data Preserved**: 
   - Migration adds `metric_date = CURRENT_DATE` to existing rows
   - No data is lost during migration

2. **Multiple Syncs Same Day**:
   - If you sync multiple times in one day, the data is **UPDATED** (not duplicated)
   - Only one row per client per day

3. **Storage Growth**:
   - 1 row per client per day
   - For 100 clients over 1 year = 36,500 rows (very manageable)

4. **Backward Compatible**:
   - Frontend still works (fetches latest date automatically)
   - No breaking changes to existing queries

5. **Future API Endpoints**:
   - `GET /facebook/historical/:clientId?days=30` - for charts
   - Can be added later when needed

---

## 📁 **Files Modified**

```
NEW:
  backend/database/migrate_facebook_analytics_to_timeseries.sql

MODIFIED:
  backend/src/services/facebookService.ts
    - Line 517: Added metric_date to INSERT
    - Line 519: Changed ON CONFLICT to (client_id, metric_date)
    - Line 646: Changed ORDER BY to metric_date DESC
    - Lines 1429-1456: Added getHistoricalData() method
```

---

## ✅ **Testing Checklist**

- [ ] Run migration SQL in pgAdmin
- [ ] Restart backend server
- [ ] Refresh Facebook data for a client
- [ ] Verify data stored with today's date
- [ ] Refresh again (same day) - should UPDATE not INSERT
- [ ] Check tomorrow - should create new row with tomorrow's date
- [ ] Query historical data using new method

---

## 🎉 **Benefits Summary**

✅ **Historical Tracking**: Never lose data again  
✅ **Trend Analysis**: Track growth over time  
✅ **Chart Ready**: Data structured for visualization  
✅ **No Duplicates**: One entry per client per day  
✅ **Backward Compatible**: Existing code still works  
✅ **Scalable**: Efficient storage and queries  

---

**Implementation Date**: October 24, 2025  
**Migration Status**: ✅ Ready to Apply  
**Breaking Changes**: None  
**Data Loss Risk**: None (all existing data preserved)

