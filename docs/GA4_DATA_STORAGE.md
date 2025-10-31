# 📊 Where GA4 Data is Stored

## Database Table: `google_analytics_data`

All Google Analytics data fetched from the GA4 API is stored in the **`google_analytics_data`** table in your PostgreSQL database.

---

## Table Structure

```sql
CREATE TABLE google_analytics_data (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    property_id VARCHAR(100),          -- GA4 Property ID (e.g., "507323099")
    date DATE NOT NULL,                 -- Date of the data (one record per client per day)
    
    -- Main Metrics
    page_views INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    avg_session_duration DECIMAL(10,2) DEFAULT 0,
    
    -- JSONB Data (stored as JSON)
    top_pages JSONB,                   -- Array: [{page: "/", pageViews: 125}, ...]
    traffic_sources JSONB,             -- Array: [{source: "Google", sessions: 50}, ...]
    country_breakdown JSONB,           -- Object: {"United States": 45, "Canada": 10}
    state_breakdown JSONB,             -- Object: {"California": 20, "New York": 15}
    
    -- Metadata
    metadata JSONB,                    -- {source: "ga4_api", cached_at: "...", auth_method: "oauth2"}
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(client_id, date)  -- One record per client per day
);
```

---

## Storage Location

**Database**: Your PostgreSQL database (same as `DATABASE_URL` in `.env`)
**Table**: `google_analytics_data`
**Unique Constraint**: One record per `client_id` per `date` (prevents duplicates)

---

## How Data is Stored

### **When Data is Fetched:**
1. Fetch GA4 data using `access_token` (from `refresh_token`)
2. Process metrics (pageViews, sessions, users, etc.)
3. **Auto-store** in `google_analytics_data` table
4. Uses `ON CONFLICT (client_id, date) DO UPDATE` - Updates if record exists for that date

### **What Gets Stored:**

| Column | Example Value | Description |
|--------|--------------|-------------|
| `client_id` | `1` | Which client this data belongs to |
| `property_id` | `"507323099"` | GA4 Property ID |
| `date` | `"2025-01-15"` | Date of the data |
| `page_views` | `15234` | Total page views |
| `sessions` | `8934` | Total sessions |
| `users` | `6543` | Total users |
| `new_users` | `1234` | New users |
| `bounce_rate` | `45.23` | Bounce rate percentage |
| `avg_session_duration` | `125.5` | Average session duration in seconds |
| `top_pages` | `[{"page": "/", "pageViews": 125}, ...]` | Top pages (JSON array) |
| `traffic_sources` | `[{"source": "Google", "sessions": 50}, ...]` | Traffic sources (JSON array) |
| `country_breakdown` | `{"United States": 45, "Canada": 10}` | Users by country (JSON object) |
| `state_breakdown` | `{"California": 20, "New York": 15}` | Users by US state (JSON object) |

---

## Query Examples

### **Get Latest Data for Client 1:**
```sql
SELECT * FROM google_analytics_data 
WHERE client_id = 1 
ORDER BY date DESC 
LIMIT 1;
```

### **Get All Data for Client 1 (Last 30 Days):**
```sql
SELECT date, page_views, sessions, users, bounce_rate
FROM google_analytics_data 
WHERE client_id = 1 
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### **Get Top Pages for Client 1:**
```sql
SELECT date, top_pages 
FROM google_analytics_data 
WHERE client_id = 1 
ORDER BY date DESC 
LIMIT 1;
```

### **Get Traffic Sources:**
```sql
SELECT date, traffic_sources 
FROM google_analytics_data 
WHERE client_id = 1 
ORDER BY date DESC 
LIMIT 1;
```

### **Count Total Records:**
```sql
SELECT COUNT(*) as total_records, 
       MIN(date) as earliest_date, 
       MAX(date) as latest_date
FROM google_analytics_data 
WHERE client_id = 1;
```

---

## Storage Process Flow

```
1. User clicks "Sync Data" or API is called
   ↓
2. refresh_token → get/refresh access_token
   ↓
3. access_token → Call GA4 API
   ↓
4. GA4 API → Returns data
   ↓
5. Process data → Extract metrics
   ↓
6. Store in database → INSERT INTO google_analytics_data
   ↓
7. ON CONFLICT → UPDATE if record exists for that date
   ↓
8. ✅ Data stored! (one record per client per day)
```

---

## Important Notes

### **One Record Per Day:**
- Each client has **ONE record per date** in the table
- If you fetch data multiple times on the same day, it **updates** the existing record
- This prevents duplicates and ensures you always have the latest data for each day

### **Cache Strategy:**
- Data is cached for **6 hours**
- If data is fresh (updated within 6 hours), API won't be called
- Set `forceRefresh=true` to bypass cache and fetch fresh data

### **Data Format:**
- **Numbers**: Stored as INTEGER or DECIMAL
- **Arrays**: Stored as JSONB (top_pages, traffic_sources)
- **Objects**: Stored as JSONB (country_breakdown, state_breakdown)

---

## Frontend Retrieval

The frontend gets data from:
1. **Cache-first**: Checks `google_analytics_data` table first
2. **If stale/missing**: Calls API → Auto-stores in database
3. **Displays**: Data from database (fast loading)

---

## Summary

✅ **Table**: `google_analytics_data`  
✅ **Database**: Your PostgreSQL database  
✅ **Structure**: One record per client per date  
✅ **Auto-stored**: After every API fetch  
✅ **Auto-updated**: If record exists for that date  
✅ **Cached**: For 6 hours (fast page loads)  

All GA4 data fetched using `refresh_token` → `access_token` → GA4 API is automatically stored in this table!

