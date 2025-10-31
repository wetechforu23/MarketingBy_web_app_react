# GA4 API Testing Guide

## Quick Test Steps

### Step 1: Find Your Client ID
First, you need to know which client you want to test for:

**Option A: From Database**
```sql
SELECT id, name, email FROM clients ORDER BY id LIMIT 10;
```

**Option B: From Frontend**
- Open Client Management Dashboard
- Look at the URL or dropdown - it shows the client ID

### Step 2: Run the Diagnostic Test

Open a terminal in the `backend` folder and run:

```bash
node test-ga4-api.js <CLIENT_ID> [PROPERTY_ID]
```

**Examples:**

```bash
# Test with client ID 1 (will use property ID from database if set)
node test-ga4-api.js 1

# Test with client ID 1 and specific property ID
node test-ga4-api.js 1 123456789
```

### Step 3: What the Test Checks

The script will automatically check:

1. ✅ **Client exists** - Verifies client is in database
2. ✅ **OAuth credentials** - Checks if Google Analytics is connected
3. ✅ **Environment variables** - Verifies GOOGLE_ANALYTICS_CLIENT_ID and SECRET
4. ✅ **Token validity** - Checks and refreshes OAuth token if needed
5. ✅ **Property ID** - Verifies GA4 Property ID format (must be numeric)
6. ✅ **API connection** - Makes actual GA4 API call
7. ✅ **Data retrieval** - Shows real analytics data if successful

### Step 4: Understanding Results

#### ✅ SUCCESS Output:
```
✅ ========================================
   SUCCESS! GA4 API is Working!
========================================

📊 Analytics Data:
   - Page Views: 1234
   - Sessions: 987
   - Total Users: 456
```

#### ❌ Common Errors & Fixes:

**1. "No Google Analytics credentials found"**
```
❌ No Google Analytics credentials found!
💡 You need to connect Google Analytics OAuth first.
   Visit: /api/auth/google/analytics?clientId=1
```
**Fix:** Connect Google Analytics OAuth in the dashboard

**2. "No Property ID found"**
```
❌ No Property ID found!
💡 You need to set the GA4 Property ID
   Use: PUT /api/clients/1/service/google_analytics/config
   Body: { "propertyId": "123456789" }
```
**Fix:** Set the Property ID via API or dashboard

**3. "Permission denied (403)"**
```
❌ Permission denied: The OAuth account doesn't have access to GA4 property
```
**Fix:** 
- Check GA4 Admin → Property Settings → Property Access
- Ensure the OAuth email has "Viewer" or higher permissions

**4. "Property not found (404)"**
```
❌ GA4 Property 123456789 not found
```
**Fix:** Verify the Property ID is correct (numeric, not G-XXXXX-X)

**5. "Token expired (401)"**
```
❌ OAuth token expired or invalid
```
**Fix:** Reconnect Google Analytics OAuth

### Step 5: Test via API Endpoint

Once the diagnostic passes, test the actual API endpoint:

```bash
# Replace with your actual client ID and property ID
curl "http://localhost:3001/api/analytics/client/1/real?propertyId=123456789"
```

Or use in browser/Postman:
```
GET http://localhost:3001/api/analytics/client/1/real?propertyId=123456789
```

### Step 6: Check Backend Logs

When you call the API, watch the backend console for:
- `📡 Making GA4 API request to property: properties/123456789`
- `✅ GA4 API responses received successfully`
- `✅ Geographic data fetched from GA4 API`

If you see errors, the logs will show exactly what went wrong.

## Troubleshooting

### Issue: Script can't find database
**Solution:** Make sure you have a `.env` file in the `backend` folder with:
```
DATABASE_URL=postgres://...
GOOGLE_ANALYTICS_CLIENT_ID=...
GOOGLE_ANALYTICS_CLIENT_SECRET=...
GOOGLE_ANALYTICS_REDIRECT_URI=...
```

### Issue: "Cannot find module 'pg'"
**Solution:** Install dependencies:
```bash
cd backend
npm install
```

### Issue: Property ID format error
**Solution:** 
- ❌ Wrong: `G-ABC123-X` (Measurement ID)
- ✅ Correct: `123456789` (Numeric Property ID)

To find your numeric Property ID:
1. Go to GA4 → Admin → Property Settings
2. Look for "Property ID" (numeric, like 123456789)
3. NOT the "Measurement ID" (G-XXXXX-X)

## Expected Test Results

### ✅ All Systems Working:
```
🔍 ========================================
   GA4 API Diagnostic Test
========================================

📋 Step 1: Checking client 1...
✅ Client found: ProMed Healthcare Associates

📋 Step 2: Checking OAuth credentials...
✅ Credentials found:
   - Has access_token: true
   - Has refresh_token: true
   - Property ID: 123456789
   - Expires at: 2025-01-16T12:00:00Z

📋 Step 3: Checking environment variables...
✅ Environment variables found

📋 Step 4: Initializing OAuth2 client...
✅ OAuth2 client initialized

📋 Step 5: Checking token expiration...
✅ Token is still valid

📋 Step 6: Testing GA4 API with Property ID: 123456789...
📡 Making API request to Google Analytics Data API...

✅ ========================================
   SUCCESS! GA4 API is Working!
========================================

📊 Analytics Data:
   - Page Views: 334
   - Sessions: 270
   - Total Users: 155

✅ All checks passed! GA4 API integration is working correctly.
```

## Next Steps After Successful Test

1. **Frontend should now show real data** - Refresh the dashboard
2. **Check date range** - Make sure it's a past date (not future)
3. **Sync data** - Click "Sync Data" button in dashboard to store in database
4. **View reports** - Generate analytics reports from stored data

