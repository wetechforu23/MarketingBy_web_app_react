# 🔑 How to Save Google API Key for Widget

**Widget:** `wtfu_464ed6cab852594fce9034020d77dee3`  
**API Key:** `AIzaSyDACu87GKFpSqhrReeDXVMjknKL85f1pLw`

---

## ✅ **Option 1: Use Widget Editor (Easiest - Recommended)**

1. Go to Widget Editor for `wtfu_464ed6cab852594fce9034020d77dee3`
2. Scroll to "🤖 AI Smart Responses (Google Gemini)" section
3. Check "Enable AI-powered responses"
4. Paste API key: `AIzaSyDACu87GKFpSqhrReeDXVMjknKL85f1pLw`
5. Click "Save Widget"

**✅ The backend will now automatically encrypt it!**

---

## 🔧 **Option 2: Manual SQL Update (If Editor Doesn't Work)**

### Step 1: Connect to Heroku Database
```bash
heroku pg:psql --app marketingby-wetechforu
```

### Step 2: Encrypt and Save API Key

```sql
-- First, encrypt the API key (using Node.js encryption format)
-- Note: You'll need ENCRYPTION_KEY from Heroku config

-- Get widget ID
SELECT id, widget_key, widget_name, client_id 
FROM widget_configs 
WHERE widget_key = 'wtfu_464ed6cab852594fce9034020d77dee3';

-- Then use the widget editor or API to save (encryption happens automatically)
```

**Better:** Just use the Widget Editor - it will encrypt automatically now!

---

## 🎯 **What Was Fixed**

The backend `PUT /widgets/:id` endpoint now:
- ✅ Automatically encrypts `widget_specific_llm_key` if provided
- ✅ Detects if already encrypted (skips re-encryption)
- ✅ Stores encrypted value in database

**After saving, the widget editor will show:**
- ✅ API Key Status: **Configured**
- ✅ Partial Key: `AIzaSy...pLw` (first 6 + last 6 chars)
- ✅ Source: **Widget-Specific**

---

## 📝 **Quick Test**

After saving, refresh the widget editor page and you should see:

```
🤖 AI Smart Responses (Google Gemini) ✓ Active

📊 Current Configuration Status
Provider: gemini ✅
Model: gemini-2.0-flash
API Key Status: ✅ Configured
Monthly Limit: 1,000 tokens

Current Key: AIzaSy...pLw (Widget-Specific)
```

