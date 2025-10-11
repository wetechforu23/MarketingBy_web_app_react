# 🔐 Encrypted Credentials Reference

## Migration Complete: October 10, 2025

All API keys and sensitive credentials have been migrated from `.env` file to the Heroku PostgreSQL `encrypted_credentials` table using AES-256-CBC encryption.

---

## 📊 Total Credentials: 35 Keys

### 🔷 GOOGLE SERVICES (13 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `google_maps` | `api_key` | Google Maps and Places API Key |
| `google_places` | `api_key` | Google Places API Key |
| `google_service_account` | `private_key` | Google Service Account Private Key |
| `google_service_account` | `client_email` | Google Service Account Email |
| `google_service_account` | `project_id` | Google Project ID |
| `google_ads` | `client_id` | Google Ads Client ID |
| `google_ads` | `client_secret` | Google Ads Client Secret |
| `google_ads` | `project_id` | Google Ads Project ID |
| `google_analytics` | `api_key` | Google Analytics Data API Key |
| `google_calendar` | `api_key` | Google Calendar API Key |
| `google_calendar` | `api_url` | Google Calendar API URL |
| `google_pagespeed` | `api_key` | Google PageSpeed API Key |
| `google_search_console` | `api_key` | Google Search Console API Key |

### 🔷 AZURE (5 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `azure` | `client_id` | Azure Client ID |
| `azure` | `client_secret` | Azure Client Secret |
| `azure` | `tenant_id` | Azure Tenant ID |
| `azure_communication` | `connection_string` | Azure Communication Services Connection String |
| `azure_communication` | `email_from_address` | Azure Email From Address |

### 🔷 STRIPE (3 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `stripe` | `public_key` | Stripe Public Key |
| `stripe` | `secret_key` | Stripe Secret Key |
| `stripe` | `webhook_secret` | Stripe Webhook Secret |

### 🔷 EMAIL SERVICES (5 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `smtp` | `server` | SMTP Server |
| `smtp` | `port` | SMTP Port |
| `smtp` | `username` | SMTP Username |
| `gmail` | `user` | Gmail Username |
| `gmail` | `app_password` | Gmail App Password |

### 🔷 OTHER APIS (5 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `godaddy` | `api_key` | GoDaddy API Key |
| `godaddy` | `api_secret` | GoDaddy API Secret |
| `openai` | `api_key` | OpenAI API Key |
| `seranking` | `api_key` | SEranking API Key |
| `heroku` | `api_key` | Heroku API Key |

### 🔷 COMPANY INFO (4 keys)

| Service | Key Name | Description |
|---------|----------|-------------|
| `company` | `name` | Company Name |
| `company` | `email` | Company Email |
| `company` | `reply_to_email` | Reply To Email |
| `company` | `from_name` | Email From Name |

---

## 🔒 Security Details

- **Encryption Algorithm**: AES-256-CBC
- **Storage Location**: Heroku PostgreSQL `encrypted_credentials` table
- **Encryption Key**: Stored in Heroku config var `ENCRYPTION_KEY`
- **Database Schema**:
  ```sql
  CREATE TABLE encrypted_credentials (
    id SERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service, key_name)
  );
  ```

---

## 🔧 How to Access Credentials in Code

### Backend (Node.js/TypeScript)

```typescript
import { getCredential } from './services/credentialManagementService';

// Example: Get Google Maps API Key
const googleMapsKey = await getCredential('google_maps', 'api_key');

// Example: Get Stripe Secret Key
const stripeSecret = await getCredential('stripe', 'secret_key');

// Example: Get Azure Client Secret
const azureSecret = await getCredential('azure', 'client_secret');
```

### Direct Database Query (if needed)

```typescript
import pool from './config/database';
import { decrypt } from './utils/encryption';

const result = await pool.query(
  'SELECT encrypted_value FROM encrypted_credentials WHERE service = $1 AND key_name = $2',
  ['google_maps', 'api_key']
);

if (result.rows.length > 0) {
  const decryptedValue = decrypt(result.rows[0].encrypted_value);
  // Use decryptedValue
}
```

---

## 🧪 Verification

To verify all credentials are properly encrypted:

```bash
# Connect to Heroku database
heroku pg:psql --app marketingby-wetechforu

# List all credentials (shows encrypted values)
SELECT service, key_name, LEFT(encrypted_value, 30) || '...' as sample 
FROM encrypted_credentials 
ORDER BY service, key_name;

# Count total credentials
SELECT COUNT(*) FROM encrypted_credentials;
```

---

## 📝 Migration Notes

### Phase 1: Initial Migration (13 keys)
- Google Maps/Places APIs
- Google Service Account
- Stripe keys
- Azure credentials
- SMTP configuration

### Phase 2: Missing Keys (22 keys)
- Azure Communication Services
- Gmail credentials
- GoDaddy API
- Google Ads, Analytics, Calendar, PageSpeed, Search Console
- OpenAI, SEranking, Heroku APIs
- Company information

### Not Migrated
- `SMTP_PASSWORD` - Not found in .env file (system uses alternative email methods)

---

## ⚠️ Important Notes

1. **DO NOT** commit `.env` files to Git (already in `.gitignore`)
2. **DO NOT** store decrypted values in code or logs
3. **ALWAYS** use `getCredential()` service to access credentials
4. **Encryption key** (`ENCRYPTION_KEY`) must be set in Heroku config
5. **Database connection** is required to access credentials
6. **Fallback**: Some keys also exist in Heroku config vars for quick access

---

## 🚀 Deployment Checklist

- [x] Created `encrypted_credentials` table
- [x] Migrated all 35 credentials
- [x] Verified encryption (AES-256-CBC)
- [x] Set `GOOGLE_PLACES_API_KEY` in Heroku config (v79)
- [x] Documented all credentials
- [ ] Update backend services to use encrypted DB
- [ ] Test all API integrations
- [ ] Remove `.env` file after confirming everything works

---

## 🔗 Related Files

- `backend/src/services/credentialManagementService.ts` - Credential access service
- `backend/src/config/database.ts` - Database connection
- `backend/src/utils/encryption.ts` - Encryption/decryption utilities
- `API_DATABASE_FLOW_DIAGRAM.md` - Master reference document

---

**Last Updated**: October 10, 2025  
**Migration Script**: Completed and removed  
**Status**: ✅ All credentials encrypted and ready for use

