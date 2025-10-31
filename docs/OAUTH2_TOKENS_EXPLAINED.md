# 🔐 OAuth2 Tokens Explained: access_token vs refresh_token

## What Are These Tokens?

When you connect Google Analytics using OAuth 2.0, Google gives you **two tokens**:

### 1. **Access Token (`access_token`)**
- **What it is**: A short-lived token (expires in ~1 hour)
- **Purpose**: Used to make API calls to Google Analytics
- **Lifetime**: Usually expires after 3600 seconds (1 hour)
- **Example**: `ya29.a0AfB_byD2...` (starts with `ya29.`)

**Think of it like**: A ticket to a concert that expires after 1 hour

### 2. **Refresh Token (`refresh_token`)**
- **What it is**: A long-lived token (doesn't expire automatically)
- **Purpose**: Used to get a NEW access_token when the old one expires
- **Lifetime**: Usually doesn't expire (unless revoked)
- **Example**: `1//05abcdefgh...` (starts with `1//`)

**Think of it like**: A membership card that lets you get new tickets when yours expire

---

## How They Work Together

```
┌─────────────────────────────────────────────────────┐
│  1. User clicks "Connect Google Analytics"         │
│     → Redirected to Google login page               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  2. User grants permission                          │
│     → Google gives us:                              │
│       • access_token (expires in 1 hour)            │
│       • refresh_token (long-lived)                  │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  3. We store both tokens in database:              │
│     client_credentials table:                       │
│     {                                                │
│       access_token: "ya29.a0AfB_byD2...",           │
│       refresh_token: "1//05abcdefgh...",            │
│       expires_at: "2025-01-15T10:30:00Z"           │
│     }                                               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│  4. When we need to fetch GA4 data:                │
│     → Check if access_token expired?                │
│       • NO: Use it directly ✅                      │
│       • YES: Use refresh_token to get new one 🔄   │
└─────────────────────────────────────────────────────┘
```

---

## Code Flow in Your Application

### **Step 1: Storing Tokens (When User Connects)**

```typescript:backend/src/services/googleAnalyticsService.ts
// When user completes OAuth, we store both tokens
await this.storeClientCredentials(clientId, {
  access_token: tokens.access_token,      // ← Short-lived (1 hour)
  refresh_token: tokens.refresh_token,    // ← Long-lived (doesn't expire)
  expires_at: new Date(Date.now() + 3600 * 1000)  // ← Expires in 1 hour
});
```

**Stored in database** (`client_credentials` table):
```json
{
  "access_token": "ya29.a0AfB_byD2xKj...",
  "refresh_token": "1//05abcdefghijklmn...",
  "expires_at": "2025-01-15T10:30:00Z"
}
```

---

### **Step 2: Using Tokens (When Fetching Data)**

```typescript:backend/src/services/googleAnalyticsService.ts
// Check if access_token expired
if (credentials.expires_at && new Date(credentials.expires_at) <= new Date()) {
  // Access token expired! Use refresh_token to get a new one
  const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
  
  // Save the NEW access_token (keep same refresh_token)
  await this.storeClientCredentials(clientId, {
    access_token: newCredentials.access_token,    // ← NEW token
    refresh_token: credentials.refresh_token,     // ← SAME refresh token
    expires_at: new Date(Date.now() + 3600 * 1000)
  });
}
```

---

## Real Example from Your Code

When you tested Client 1, here's what happened:

```javascript
// Your test showed:
✅ OAuth2: Access Token = true, Refresh Token = true
✅ Property ID: 507323099

// This means:
// 1. access_token exists → Can make API calls (for 1 hour)
// 2. refresh_token exists → Can get new access_token when needed
// 3. Property ID configured → Knows which GA4 property to access
```

---

## Why Two Tokens?

### **Security Benefits:**

1. **Access Token (Short-lived)**
   - If stolen, only valid for 1 hour
   - Limits damage if compromised
   - Must be refreshed frequently

2. **Refresh Token (Long-lived)**
   - Stored securely in your database
   - Only used server-side (never sent to browser)
   - Can revoke it if needed

---

## What Happens in Your App?

### **Scenario 1: Access Token Valid** ✅
```
User clicks "Sync Data"
  → Check access_token expired? NO
  → Use access_token directly
  → Fetch GA4 data ✅
```

### **Scenario 2: Access Token Expired** 🔄
```
User clicks "Sync Data"
  → Check access_token expired? YES
  → Use refresh_token to get NEW access_token
  → Save new access_token to database
  → Use new access_token to fetch data ✅
```

### **Scenario 3: No Tokens** ❌
```
User clicks "Sync Data"
  → No access_token or refresh_token found
  → Show "Not Connected" message
  → User must reconnect via OAuth
```

---

## Comparison: OAuth2 vs Service Account

| Feature | OAuth2 (User Auth) | Service Account |
|---------|-------------------|----------------|
| **Tokens** | access_token + refresh_token | private_key + client_email |
| **Lifetime** | access_token expires (1 hour) | Never expires |
| **Setup** | User must login via Google | Admin sets up once |
| **Access** | User's Google account permissions | Service Account permissions |
| **Stored In** | `client_credentials` table | `encrypted_credentials` table |
| **Best For** | Individual client connections | Centralized automation |

---

## Your Current Situation

For **Client 1**:
- ✅ Has `access_token` → Can make API calls
- ✅ Has `refresh_token` → Can get new tokens automatically
- ❌ **BUT**: Neither token has permission to access Property 507323099

**Solution**: Grant access in GA4 Admin:
1. Go to GA4 → Admin → Property Access
2. Add the Google account (that provided the OAuth tokens) with "Viewer" role
3. OR grant Service Account access (recommended for automation)

---

## Summary

- **access_token**: Short-lived "ticket" to use Google APIs (expires in 1 hour)
- **refresh_token**: Long-lived "membership card" to get new tickets (doesn't expire)
- **Both stored**: In `client_credentials` table as JSON
- **Auto-refresh**: Your code automatically refreshes access_token when expired
- **Current issue**: Tokens exist but need permission to access the GA4 Property

The tokens are like having a **keycard** (access_token) that expires, and a **membership card** (refresh_token) that lets you get new keycards automatically!

