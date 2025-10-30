# 🚀 Future Features & Planned Tasks

**Last Updated:** October 29, 2025  
**Purpose:** Track features and improvements planned for future implementation

---

## 📋 Table of Contents

1. [Facebook Connection Management (Flag System)](#1-facebook-connection-management-flag-system)
2. [Client Dashboard Enhancements](#2-client-dashboard-enhancements)
3. [Analytics Improvements](#3-analytics-improvements)
4. [Integration Enhancements](#4-integration-enhancements)
5. [Security & Performance](#5-security--performance)

---

## 1. 🎯 Facebook Connection Management (Flag System)

### **Priority:** HIGH  
### **Status:** PLANNED (Not Started)  
### **Estimated Time:** 30-60 minutes

### **Problem:**
Currently, when a client disconnects Facebook, the data is deleted or the system doesn't handle reconnection gracefully. We need a flag system to manage connection status without data loss.

### **Proposed Solutions:**

#### **Option A: Simple Boolean Flag** ⭐ RECOMMENDED
```sql
-- Add is_active column to client_credentials table
ALTER TABLE client_credentials 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
```

**Features:**
- ✅ Hide/show data on frontend based on flag
- ✅ Keep all data in database (never delete)
- ✅ Quick reconnect (just flip flag)
- ✅ Simple implementation (5-10 mins)

**Implementation Steps:**
1. Add `is_active` column to `client_credentials` table
2. Update backend API to check `is_active` flag
3. Update frontend to show/hide based on flag
4. Add disconnect/reconnect endpoints
5. Test flag toggling

---

#### **Option B: Status ENUM Field**
```sql
ALTER TABLE client_credentials 
ADD COLUMN status VARCHAR(20) DEFAULT 'active';
-- Values: 'active', 'disconnected', 'suspended', 'expired'
```

**Features:**
- ✅ Multiple connection states
- ✅ Track WHY disconnected
- ✅ Better for reporting
- ✅ More professional

**Implementation Steps:**
1. Add `status` column to `client_credentials`
2. Update all connection logic to use status
3. Add status transitions (active → disconnected → active)
4. Update UI to show different statuses
5. Add admin controls for suspended state

---

#### **Option C: Dedicated Connection History Table**
```sql
CREATE TABLE facebook_connections (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  page_id VARCHAR(255),
  access_token TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'active',
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  disconnected_by INTEGER REFERENCES users(id),
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- ✅ Complete audit trail
- ✅ Track who disconnected and when
- ✅ Connection history
- ✅ Multiple connections per client (future-proof)
- ✅ Track last sync time

**Implementation Steps:**
1. Create new `facebook_connections` table
2. Migrate existing data from `client_credentials`
3. Update all Facebook services to use new table
4. Add connection history UI
5. Add admin audit logs

---

### **Technical Details:**

**Backend Changes Needed:**
```typescript
// File: backend/src/services/facebookService.ts
// Update getStoredData() to check is_active flag

async getStoredData(clientId: number) {
  const result = await this.pool.query(
    `SELECT cc.*, fa.* 
     FROM client_credentials cc
     LEFT JOIN facebook_analytics fa ON fa.client_id = cc.client_id
     WHERE cc.client_id = $1 
       AND cc.service_type = 'facebook'
       AND cc.is_active = TRUE`,  // Add this check
    [clientId]
  );
  
  return {
    connected: result.rows.length > 0 && result.rows[0].is_active,
    is_active: result.rows[0]?.is_active || false,
    // ... other data
  };
}
```

**Frontend Changes Needed:**
```typescript
// File: frontend/src/pages/ClientDashboard.tsx
// Check both connected AND is_active

const isFacebookActive = facebookData?.connected && facebookData?.is_active;

{isFacebookActive ? (
  // Show data
) : (
  // Show "Not Connected" with Connect button
)}
```

**New API Endpoints Needed:**
```typescript
// Disconnect (don't delete, just set flag)
POST /api/facebook/disconnect/:clientId
Body: { user_id: number } // who disconnected

// Reconnect (set flag back to active)
POST /api/facebook/reconnect/:clientId

// Check if can quick reconnect (token still valid)
GET /api/facebook/can-reconnect/:clientId
```

---

### **Questions to Decide:**

- [ ] Which option to implement? (A, B, or C)
- [ ] Should we add timestamps? (`disconnected_at`, `reconnected_at`)
- [ ] Should we track WHO disconnected? (`disconnected_by` user_id)
- [ ] Should clients be able to disconnect? Or only admins?
- [ ] Should we auto-sync data when reconnecting?

---

## 2. 📊 Client Dashboard Enhancements

### **Status:** PARTIALLY DONE (Posts table added)

### **Completed:**
- ✅ Facebook posts table with all metrics
- ✅ Clickable post links to Facebook
- ✅ Tabbed navigation (Overview, Leads, Social Media, Reports, Settings)
- ✅ 2-Way Facebook connection button

### **Pending Enhancements:**

#### **A. Make Post Links Actually Clickable** ⭐ PRIORITY
- **Status:** Links in database but not displaying as clickable
- **Issue:** Frontend may need hard refresh to show new code
- **Fix:** Verify `permalink_url` is being passed from backend to frontend
- **Time:** 5 minutes

#### **B. Add Lead Detail Pages**
- **Feature:** Click on a lead to see full details
- **UI:** Modal or separate page with:
  - Lead contact info
  - Communication history
  - SEO reports sent
  - Activity timeline
- **Time:** 1-2 hours

#### **C. Add Export Features**
- **Feature:** Export data to CSV/Excel
- **Options:**
  - Export leads list
  - Export Facebook posts data
  - Export analytics reports
- **Time:** 30 minutes per export type

#### **D. Add Date Range Filters**
- **Feature:** Filter data by custom date ranges
- **Apply to:**
  - Facebook metrics
  - Leads generated
  - Reports created
- **Time:** 1 hour

#### **E. Add Real-time Notifications**
- **Feature:** Show notifications for:
  - New leads
  - Facebook posts published
  - Report generation complete
- **Tech:** WebSocket or Server-Sent Events
- **Time:** 2-3 hours

---

## 3. 📈 Analytics Improvements

### **Status:** BASIC IMPLEMENTATION DONE

### **Pending:**

#### **A. Google Analytics Integration**
- **Status:** Not Connected (shows 400 error)
- **Required:**
  - Add Google Analytics credentials for Demo2
  - Create OAuth flow for clients to connect GA
  - Fetch real GA data (users, sessions, page views, bounce rate)
- **Time:** 2-3 hours

#### **B. SEO Analysis Dashboard**
- **Status:** 404 error on `/api/seo/latest/199`
- **Required:**
  - Implement SEO audit endpoint
  - Create SEO score calculation
  - Add SEO recommendations UI
- **Time:** 3-4 hours

#### **C. Reports Generation**
- **Feature:** Auto-generate PDF reports
- **Include:**
  - Facebook metrics summary
  - Top performing posts
  - Lead generation stats
  - SEO scores
- **Tech:** Puppeteer or jsPDF
- **Time:** 4-5 hours

#### **D. Comparative Analytics**
- **Feature:** Compare metrics month-over-month
- **Show:**
  - Growth percentage
  - Trend graphs
  - Best/worst performing periods
- **Time:** 2-3 hours

---

## 4. 🔗 Integration Enhancements

### **Status:** FACEBOOK PARTIALLY DONE

### **Pending:**

#### **A. Instagram Business Integration**
- **Feature:** Connect Instagram Business account
- **Metrics:**
  - Followers growth
  - Post engagement
  - Story views
  - Profile visits
- **Time:** 4-6 hours

#### **B. Google My Business Integration**
- **Feature:** Track GMB performance
- **Metrics:**
  - Search visibility
  - Customer actions (calls, directions, website clicks)
  - Reviews
  - Photos
- **Time:** 3-4 hours

#### **C. Email Marketing Integration**
- **Feature:** Connect to email service (MailChimp, SendGrid)
- **Metrics:**
  - Email campaigns sent
  - Open rates
  - Click rates
  - Unsubscribes
- **Time:** 2-3 hours

#### **D. Google Search Console Integration**
- **Feature:** SEO performance tracking
- **Metrics:**
  - Search impressions
  - Average position
  - Click-through rate
  - Top keywords
- **Time:** 3-4 hours

---

## 5. 🔒 Security & Performance

### **Status:** BASIC SECURITY IN PLACE

### **Pending Improvements:**

#### **A. Token Refresh Automation**
- **Feature:** Auto-refresh expiring Facebook tokens
- **Alert:** Email notification when token expires in < 7 days
- **Auto-action:** Attempt refresh if < 3 days
- **Time:** 2-3 hours

#### **B. Rate Limiting**
- **Feature:** Protect APIs from abuse
- **Implement:**
  - Rate limits per user/client
  - Throttling for expensive operations
  - DDoS protection
- **Time:** 1-2 hours

#### **C. Audit Logging**
- **Feature:** Track all important actions
- **Log:**
  - User logins
  - Connection/disconnection events
  - Data exports
  - Settings changes
- **Storage:** Dedicated `audit_logs` table
- **Time:** 2-3 hours

#### **D. Database Indexing**
- **Feature:** Optimize slow queries
- **Add indexes on:**
  - `client_credentials.client_id`
  - `facebook_posts.client_id`
  - `facebook_analytics.client_id`
  - `leads.client_id`
- **Time:** 30 minutes

#### **E. Caching Layer**
- **Feature:** Cache frequently accessed data
- **Cache:**
  - Facebook overview metrics (5 min TTL)
  - Client info (10 min TTL)
  - Post lists (2 min TTL)
- **Tech:** Redis or in-memory cache
- **Time:** 2-3 hours

---

## 6. 🎨 UI/UX Enhancements

### **Pending:**

#### **A. Dark Mode**
- **Feature:** Toggle dark/light theme
- **Persist:** Save preference in localStorage
- **Time:** 2-3 hours

#### **B. Mobile Responsive Design**
- **Feature:** Full mobile optimization
- **Test on:** iPhone, iPad, Android
- **Time:** 3-4 hours

#### **C. Loading Skeletons**
- **Feature:** Show skeleton loaders instead of spinners
- **Apply to:**
  - Dashboard cards
  - Tables
  - Charts
- **Time:** 1-2 hours

#### **D. Empty States**
- **Feature:** Better empty state designs
- **When:**
  - No leads yet
  - No Facebook posts
  - No reports generated
- **Include:** Helpful guidance on what to do next
- **Time:** 1 hour

---

## 7. 🧪 Testing & Quality

### **Pending:**

#### **A. Unit Tests**
- **Coverage:** Aim for 70%+ coverage
- **Focus on:**
  - Facebook service
  - Authentication
  - Data fetching
- **Tech:** Jest
- **Time:** 5-10 hours

#### **B. Integration Tests**
- **Test:**
  - API endpoints
  - Database operations
  - OAuth flows
- **Tech:** Supertest
- **Time:** 3-5 hours

#### **C. E2E Tests**
- **Test:**
  - Login flow
  - Dashboard navigation
  - Facebook connection
  - Data display
- **Tech:** Cypress or Playwright
- **Time:** 4-6 hours

---

## 📝 Implementation Priority

### **Phase 1: Critical (Do First)**
1. ⭐ Fix clickable post links (5 mins)
2. ⭐ Facebook connection flag system (30-60 mins)
3. ⭐ Google Analytics integration (2-3 hours)

### **Phase 2: Important (Do Soon)**
1. SEO analysis dashboard (3-4 hours)
2. Reports generation (4-5 hours)
3. Token refresh automation (2-3 hours)
4. Database indexing (30 mins)

### **Phase 3: Nice to Have (Do Later)**
1. Instagram integration (4-6 hours)
2. Comparative analytics (2-3 hours)
3. Dark mode (2-3 hours)
4. Mobile optimization (3-4 hours)

### **Phase 4: Long-term (Future)**
1. Unit/Integration tests (8-15 hours)
2. E2E tests (4-6 hours)
3. Caching layer (2-3 hours)
4. Audit logging (2-3 hours)

---

## 🎯 Quick Wins (< 30 mins each)

- [ ] Add database indexes
- [ ] Fix clickable post links
- [ ] Add loading states
- [ ] Improve error messages
- [ ] Add tooltips to explain metrics
- [ ] Add "Last synced" timestamp to Facebook data

---

## 📊 Estimated Total Time

| Category | Time |
|----------|------|
| **Phase 1 (Critical)** | 3-4 hours |
| **Phase 2 (Important)** | 10-12 hours |
| **Phase 3 (Nice to Have)** | 11-16 hours |
| **Phase 4 (Long-term)** | 14-24 hours |
| **TOTAL** | **38-56 hours** |

---

## 💡 Notes

- All features should follow the existing project rules (see project rules at top of conversation)
- Always use stage server + dev database for testing
- Require double confirmation (`CONFIRM <keyword>`) before any DDL on stage/dev
- Update `API_DATABASE_FLOW_DIAGRAM.md` after every change
- Use feature flags for all new features
- Track API quota usage in database

---

## 🔄 How to Use This File

1. **Before starting work:** Review this file
2. **Pick a task:** Choose from Phase 1 first
3. **Update status:** Change from PLANNED → IN PROGRESS → DONE
4. **Document:** Update main docs when feature is done
5. **Add new ideas:** Add to this file as they come up

---

**Remember:** Always ask for confirmation before implementing! 🚀


