# API Keys Setup Guide - ProMed Healthcare PPC Tracking

## 🔑 **REQUIRED API KEYS**

You need to add these API keys to your `.env` file for ProMed Healthcare PPC tracking and Google Sheets integration.

## 📊 **GOOGLE ADS API KEYS**

### 1. **GOOGLE_ADS_API_KEY**
**Purpose**: Campaign management and data access
**How to Get**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the "Google Ads API" 
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the generated API key
6. Restrict the key to Google Ads API only

**Add to .env**:
```
GOOGLE_ADS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. **GOOGLE_ADS_CLIENT_ID**
**Purpose**: ProMed Healthcare's Google Ads account identifier
**How to Get**:
1. Go to [Google Ads](https://ads.google.com/)
2. Sign in with ProMed Healthcare's Google Ads account
3. Go to "Tools & Settings" → "API Center"
4. Your Customer ID is displayed (format: 123-456-7890)
5. Remove dashes for the Client ID (format: 1234567890)

**Add to .env**:
```
GOOGLE_ADS_CLIENT_ID=1234567890
```

### 3. **GOOGLE_ADS_DEVELOPER_TOKEN**
**Purpose**: Developer access to Google Ads API
**How to Get**:
1. Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Click "Apply for access"
3. Fill out the application form
4. Wait for approval (can take 1-3 days)
5. Once approved, copy the Developer Token

**Add to .env**:
```
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxx
```

### 4. **GOOGLE_ADS_REFRESH_TOKEN**
**Purpose**: OAuth 2.0 authentication
**How to Get**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to "APIs & Services" → "Credentials"
3. Create OAuth 2.0 Client ID
4. Set authorized redirect URIs
5. Use OAuth flow to get refresh token

**Add to .env**:
```
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. **GOOGLE_ADS_CONVERSION_ID**
**Purpose**: Conversion tracking for contact forms
**How to Get**:
1. Go to [Google Ads](https://ads.google.com/)
2. Go to "Tools & Settings" → "Conversions"
3. Click "+" to create new conversion action
4. Select "Website" → "Contact form submission"
5. Copy the Conversion ID (format: AW-123456789)

**Add to .env**:
```
GOOGLE_ADS_CONVERSION_ID=AW-123456789
```

### 6. **GOOGLE_ADS_CONVERSION_LABEL**
**Purpose**: Specific conversion tracking label
**How to Get**:
1. In the same conversion action setup
2. Copy the Conversion Label (format: xxxxxxxx)
3. This is provided alongside the Conversion ID

**Add to .env**:
```
GOOGLE_ADS_CONVERSION_LABEL=xxxxxxxx
```

## 📈 **GOOGLE ANALYTICS API KEYS**

### 7. **GOOGLE_ANALYTICS_API_KEY**
**Purpose**: Access to Google Analytics data
**How to Get**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Google Analytics Reporting API"
3. Go to "Credentials" → "Create Credentials" → "API Key"
4. Copy the generated API key

**Add to .env**:
```
GOOGLE_ANALYTICS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 8. **GOOGLE_ANALYTICS_PROPERTY_ID**
**Purpose**: GA4 property identifier for promedhca.com
**How to Get**:
1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your GA4 property for promedhca.com
3. Go to "Admin" → "Property Settings"
4. Copy the Property ID (format: 123456789)

**Add to .env**:
```
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
```

### 9. **GOOGLE_ANALYTICS_MEASUREMENT_ID**
**Purpose**: GA4 measurement ID for tracking
**How to Get**:
1. In the same GA4 property
2. Go to "Admin" → "Data Streams"
3. Select your web stream
4. Copy the Measurement ID (format: G-XXXXXXXXXX)

**Add to .env**:
```
GOOGLE_ANALYTICS_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 📝 **COMPLETE .ENV EXAMPLE**

```bash
# Google Ads PPC Tracking
GOOGLE_ADS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_CLIENT_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxx
GOOGLE_ADS_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ADS_CONVERSION_ID=AW-123456789
GOOGLE_ADS_CONVERSION_LABEL=xxxxxxxx

# Google Analytics Tracking
GOOGLE_ANALYTICS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
GOOGLE_ANALYTICS_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 🚀 **SETUP PRIORITY ORDER**

### **Phase 1 - Essential (Start Here)**:
1. `GOOGLE_ADS_CLIENT_ID` - Easy to get from Google Ads account
2. `GOOGLE_ANALYTICS_PROPERTY_ID` - Easy to get from GA4
3. `GOOGLE_ANALYTICS_MEASUREMENT_ID` - Easy to get from GA4

### **Phase 2 - API Access**:
4. `GOOGLE_ADS_API_KEY` - Google Cloud Console setup
5. `GOOGLE_ANALYTICS_API_KEY` - Google Cloud Console setup
6. `GOOGLE_ADS_DEVELOPER_TOKEN` - Requires approval (1-3 days)

### **Phase 3 - Advanced Tracking**:
7. `GOOGLE_ADS_REFRESH_TOKEN` - OAuth 2.0 setup
8. `GOOGLE_ADS_CONVERSION_ID` - Conversion tracking setup
9. `GOOGLE_ADS_CONVERSION_LABEL` - Conversion tracking setup

## ⚠️ **IMPORTANT NOTES**

### **Security**:
- Never commit your `.env` file to version control
- Keep API keys secure and don't share them
- Use different keys for development and production

### **Billing**:
- Google Ads API has usage limits and may require billing setup
- Google Analytics API has free quotas
- Monitor usage to avoid unexpected charges

### **Access Requirements**:
- You need admin access to ProMed Healthcare's Google Ads account
- You need admin access to ProMed Healthcare's Google Analytics account
- Some API keys require approval from Google

## 🎯 **FOR PROMED HEALTHCARE**

**What ProMed Healthcare needs to provide**:
1. **Google Ads Account Access** - Admin access to their Google Ads account
2. **Google Analytics Access** - Admin access to their GA4 property
3. **Website Access** - Ability to add tracking code to promedhca.com
4. **Approval** - Authorization for you to set up tracking on their behalf

**Estimated Setup Time**:
- Basic setup: 1-2 hours
- Full tracking setup: 4-6 hours
- Google approval for Developer Token: 1-3 days

---

**Once you have all API keys, you can start tracking PPC performance and contact form conversions for ProMed Healthcare!**
