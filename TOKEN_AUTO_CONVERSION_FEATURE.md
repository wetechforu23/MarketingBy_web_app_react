# Facebook Token Auto-Conversion Feature

## Overview
Added automatic short-lived to long-lived token conversion for both OAuth and Manual Token methods in Facebook connection flow.

## Changes Made

### 1. New Method: `processPageToken()` in `facebookTokenService.ts`

**Location**: `backend/src/services/facebookTokenService.ts` (lines 275-320)

**Purpose**: Automatically checks if a page token is short-lived or long-lived, and converts it if needed.

**Logic**:
- Checks token expiry using `debugToken()` API
- If token expires in < 30 days (720 hours), attempts to exchange for long-lived token
- If token expires in > 30 days or has no expiry, uses as-is
- Gracefully handles errors and proceeds with original token if exchange fails

**Code Flow**:
```
1. Debug token to get expiry info
2. Calculate hours until expiry
3. If < 720 hours (30 days):
   - Try to exchange for long-lived token
   - Return long-lived token on success
   - Return original token if exchange fails (with warning)
4. If > 720 hours or no expiry:
   - Return original token (already long-lived)
```

### 2. Updated Method: `storePageCredentials()`

**Location**: `backend/src/services/facebookTokenService.ts` (lines 322-366)

**New 3-Step Process**:
1. **Step 1**: Process token to ensure it's long-lived (calls `processPageToken()`)
2. **Step 2**: Verify token has required permissions
3. **Step 3**: UPSERT credentials to database

**Before**:
```typescript
async storePageCredentials(clientId, pageId, pageToken, pageName) {
  // Verify permissions
  // Store in database
}
```

**After**:
```typescript
async storePageCredentials(clientId, pageId, pageToken, pageName) {
  // STEP 1: Process token (check expiry, convert if needed)
  const processedToken = await this.processPageToken(pageToken);
  
  // STEP 2: Verify permissions
  const verification = await this.verifyTokenPermissions(processedToken);
  
  // STEP 3: UPSERT to database
  await this.pool.query(/* INSERT ... ON CONFLICT ... UPDATE */);
}
```

### 3. Updated Endpoints in `facebookConnect.ts`

#### OAuth Flow - Step 3 (lines 70-102)
```typescript
router.post('/facebook-connect/oauth/complete/:clientId', ...)
```
- Added comments explaining auto-conversion
- Updated success message: "Facebook page connected successfully with long-lived token"

#### Manual Token Flow - Step 2 (lines 142-174)
```typescript
router.post('/facebook-connect/manual/complete/:clientId', ...)
```
- Added comments explaining auto-conversion
- Updated success message: "Facebook page connected successfully with long-lived token"

## Console Logging

The feature includes comprehensive console logging:

```
🔍 Checking page token expiry...
📋 Token type: PAGE
⏰ Token expires at: 2025-11-28T12:00:00.000Z
⏳ Hours until expiry: 168.00
🔄 Short-lived token detected, attempting to exchange for long-lived token...
✅ Successfully exchanged for long-lived token
```

Or for long-lived tokens:
```
🔍 Checking page token expiry...
📋 Token type: PAGE
⏰ Token expires at: 2025-12-28T12:00:00.000Z
⏳ Hours until expiry: 1440.00
✅ Token is already long-lived (expires in > 30 days)
```

Or for never-expiring tokens:
```
🔍 Checking page token expiry...
📋 Token type: PAGE
✅ Token has no expiry (never expires)
```

## Benefits

1. **Automatic**: No manual intervention required
2. **Transparent**: User doesn't need to know about token types
3. **Safe**: Gracefully handles errors, never fails the connection
4. **Smart**: Only converts when necessary (< 30 days expiry)
5. **Universal**: Works for both OAuth and Manual Token methods
6. **UPSERT**: Updates existing credentials or creates new ones

## Technical Details

### Token Types Handled
- **Short-lived tokens**: < 30 days expiry → Automatically converted
- **Long-lived tokens**: > 30 days expiry → Used as-is
- **Never-expiring tokens**: No expiry date → Used as-is

### Expiry Threshold
- **30 days (720 hours)**: Tokens expiring in less than 30 days are considered short-lived
- This ensures optimal token longevity for the application

### Error Handling
- If token conversion fails, proceeds with original token
- Logs warning but doesn't block the connection
- Ensures connection always succeeds if token is valid

### Database UPSERT
```sql
INSERT INTO client_credentials (client_id, service_type, credentials, created_at, updated_at)
VALUES ($1, $2, $3, NOW(), NOW())
ON CONFLICT (client_id, service_type)
DO UPDATE SET 
  credentials = $3,
  updated_at = NOW()
```

## Files Modified

1. `backend/src/services/facebookTokenService.ts`
   - Added `processPageToken()` method
   - Updated `storePageCredentials()` method

2. `backend/src/routes/facebookConnect.ts`
   - Updated OAuth complete endpoint with comments
   - Updated Manual Token complete endpoint with comments
   - Updated success messages

## Testing

To test this feature:

1. **Method 1 (OAuth)**:
   - Connect via OAuth flow
   - Check console logs for token processing
   - Verify long-lived token stored in database

2. **Method 2 (Manual)**:
   - Paste a short-lived token
   - Check console logs for auto-conversion
   - Verify long-lived token stored in database

3. **Database Verification**:
```sql
SELECT client_id, service_type, credentials->>'page_id', credentials->>'page_name', updated_at
FROM client_credentials 
WHERE service_type = 'facebook';
```

## Version
- **Date**: October 28, 2025
- **Version**: 1.0
- **Status**: ✅ Complete

## Related Features
- Facebook OAuth Connection (Method 1)
- Manual Token Input (Method 2)
- Facebook Token Service
- Token Debug API
- Long-lived Token Exchange API

