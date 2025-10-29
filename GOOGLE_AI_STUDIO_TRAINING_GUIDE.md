# 🤖 Google AI Studio - Per-Widget Training Guide

**Date:** October 27, 2025  
**Version:** v365  
**Purpose:** Configure individual AI training for each client widget using Google AI Studio

---

## 📚 **Understanding "Training" with Gemini API**

### **Important Clarification:**
Google AI Studio (free tier) does **NOT support traditional fine-tuning**. Instead, you use **context injection** - providing client-specific knowledge with each API request.

### **What This Means:**
- ❌ **No fine-tuning:** You cannot train the model weights
- ✅ **Context-based learning:** Send knowledge base with each request
- ✅ **Per-widget customization:** Different knowledge for each widget
- ✅ **Usage tracking:** Monitor tokens per widget/client

---

## 🎯 **Your Current Setup (Already Working!)**

Your system **already supports** per-widget AI customization:

### **Database Tables:**
```sql
-- Widget-specific LLM configuration
widget_configs:
  - llm_enabled (boolean)
  - llm_provider (gemini/openai/groq/claude)
  - llm_model (gemini-2.0-flash, etc.)
  - widget_specific_llm_key (encrypted API key)
  - llm_temperature (0.7 default)
  - llm_max_tokens (2000 default)

-- Client-specific knowledge base
widget_knowledge_base:
  - widget_id (links to specific widget)
  - question (Q&A pairs)
  - answer
  - category
  - is_active

-- Usage tracking
client_llm_usage:
  - client_id
  - widget_id
  - requests_count
  - tokens_used
  - daily_limit
  - monthly_limit
```

---

## 🔧 **How to Set Up Multiple AI Studio Projects**

### **Option 1: One Project Per Major Client (Recommended)**

**When to Use:**
- High-volume clients
- Clients requiring isolated usage tracking
- Clients paying for premium features

**Steps:**
1. Go to https://aistudio.google.com/
2. Click **"New Project"** (top-right corner)
3. Name it: `[Client Business Name] Widget`
   - Example: "Dr. Smith Dental Clinic Bot"
4. Click on **"Get API Key"**
5. Copy the key (looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
6. Store it securely in database (see below)

**Benefits:**
- ✅ Separate rate limits per client
- ✅ Independent usage tracking in AI Studio
- ✅ Can upgrade individual clients to paid tier
- ✅ Better isolation and organization

### **Option 2: One Shared Project (For Small Clients)**

**When to Use:**
- Low-volume clients
- Testing/demo widgets
- Free-tier clients

**Steps:**
1. Use your main project: "Wetechforu widget bot"
2. All small clients share the same API key
3. Track usage in YOUR database (already implemented)

**Current Limits (Free Tier):**
- gemini-2.0-flash: **15 RPM, 1M TPM, 200 RPD**
- gemini-2.5-flash: **10 RPM, 250K TPM, 250 RPD**

---

## 🔐 **How to Store API Keys Securely**

### **Method 1: Store in `encrypted_credentials` Table (BEST)**

```sql
-- Insert encrypted key for a specific client/widget
INSERT INTO encrypted_credentials (
  client_id,
  credential_type,
  encrypted_value,
  credential_name,
  created_at
) VALUES (
  123,  -- client_id
  'llm_api_key',
  encrypt('YOUR_GEMINI_API_KEY', 'YOUR_ENCRYPTION_KEY'),
  'Google AI Studio - Client Widget',
  CURRENT_TIMESTAMP
);
```

### **Method 2: Store Directly in `widget_configs` Table**

```sql
-- Update widget with encrypted API key
UPDATE widget_configs 
SET widget_specific_llm_key = encrypt('YOUR_GEMINI_API_KEY', 'YOUR_ENCRYPTION_KEY')
WHERE id = 1;  -- widget_id
```

### **Encryption/Decryption Functions:**

Your system already has these in `backend/src/services/credentialService.ts`:

```typescript
// Encrypt
const encryptedKey = encryptCredential('AIzaSyXXXXXXXXX');

// Decrypt
const apiKey = decryptCredential(widget.widget_specific_llm_key);
```

---

## 💡 **How "Training" Actually Works**

### **Every API Request Includes:**

```typescript
const context = `
Business Knowledge Base:

Q: What services do you offer?
A: We provide dental care including cleanings, fillings, and cosmetic dentistry.

Q: What are your hours?
A: Monday-Friday 9am-5pm, Saturday 10am-2pm.

Q: How do I book an appointment?
A: Call us at (555) 123-4567 or use our online booking form.
`;

const prompt = `
You are a helpful assistant for [Client Business Name].

${context}

Customer Question: ${userMessage}

Instructions:
- Answer based ONLY on the knowledge base above
- Be friendly and professional
- If you don't know, say so and offer to connect with a human
- Keep answers concise (2-3 sentences)
`;

// Send to Gemini API
const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey  // Widget-specific key
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  })
});
```

### **What Happens:**
1. User sends message
2. System fetches widget's knowledge base from database
3. Builds context prompt with Q&A pairs
4. Sends to Gemini API with widget-specific key
5. Gemini responds based on provided context
6. Usage is tracked in database

---

## 📝 **How to Add/Update Knowledge for a Widget**

### **Via Portal (Admin UI):**

1. Go to: **Chat Widget → My Widgets**
2. Click on a widget
3. Scroll to **"Knowledge Base"** section
4. Click **"Add New Q&A"** or **"Bulk Upload"**
5. Enter question and answer
6. Click **"Save"**

### **Via SQL (Direct Database):**

```sql
-- Add new knowledge
INSERT INTO widget_knowledge_base (
  widget_id,
  question,
  answer,
  category,
  is_active
) VALUES (
  1,  -- widget_id
  'What are your business hours?',
  'We are open Monday through Friday, 9 AM to 6 PM, and Saturday from 10 AM to 3 PM. We are closed on Sundays.',
  'Business Info',
  true
);

-- Update existing knowledge
UPDATE widget_knowledge_base
SET answer = 'Updated answer here'
WHERE id = 123;

-- Delete/Deactivate knowledge
UPDATE widget_knowledge_base
SET is_active = false
WHERE id = 123;
```

### **Via Bulk Upload (CSV/JSON):**

Your portal already supports this! Go to widget settings → Knowledge Base → Bulk Upload.

**CSV Format:**
```csv
question,answer,category
"What services do you offer?","We offer X, Y, and Z","Services"
"How do I contact you?","Call us at (555) 123-4567","Contact"
```

---

## 📊 **Usage Tracking & Limits**

### **Current Free Tier Limits:**
- **gemini-2.0-flash:** 15 requests/min, 1M tokens/min, 200 requests/day
- **gemini-2.5-flash:** 10 requests/min, 250K tokens/min, 250 requests/day

### **Your System Tracking:**

```sql
-- Check widget usage
SELECT 
  w.widget_name,
  lu.requests_count,
  lu.tokens_used,
  lu.daily_limit,
  lu.credits_exhausted
FROM client_llm_usage lu
JOIN widget_configs w ON w.id = lu.widget_id
WHERE lu.widget_id = 1;

-- View request logs
SELECT 
  widget_id,
  model_used,
  tokens_used,
  response_time_ms,
  created_at
FROM llm_request_logs
WHERE widget_id = 1
ORDER BY created_at DESC
LIMIT 100;
```

### **Setting Limits Per Widget:**

```sql
-- Set daily limit for a widget
UPDATE client_llm_usage
SET daily_limit = 100,  -- 100 requests per day
    monthly_limit = 2000  -- 2000 requests per month
WHERE widget_id = 1;
```

---

## 🚀 **Best Practices**

### **1. Organize Knowledge by Category**
```
- Services
- Pricing
- Hours & Location
- Booking/Appointments
- FAQs
- Emergency Info (for healthcare)
```

### **2. Write Clear Q&A Pairs**
```
❌ BAD:
Q: Hours?
A: 9-5

✅ GOOD:
Q: What are your business hours?
A: We are open Monday through Friday from 9 AM to 5 PM, and Saturday from 10 AM to 2 PM. We are closed on Sundays.
```

### **3. Update Knowledge Regularly**
- Add new products/services
- Update pricing
- Change seasonal hours
- Add common questions from conversations

### **4. Monitor Usage**
- Check AI Studio dashboard weekly
- Set up alerts for high usage
- Review request logs for errors
- Track credits exhaustion

### **5. Use Appropriate Models**
- **gemini-2.0-flash:** Fast, good for simple Q&A (your current choice)
- **gemini-2.5-flash:** Better reasoning, use for complex questions
- **gemini-2.5-pro:** Most powerful, but lower rate limits

---

## 🎯 **Quick Setup Checklist**

### **For Each New Client Widget:**

- [ ] Create widget in portal
- [ ] Add client-specific knowledge base (10-20 Q&A pairs minimum)
- [ ] Decide: Shared key or dedicated key?
  - [ ] If dedicated: Create new AI Studio project
  - [ ] Store encrypted API key in database
- [ ] Enable LLM in widget settings
- [ ] Set provider to "gemini"
- [ ] Choose model (gemini-2.0-flash recommended)
- [ ] Set daily/monthly limits
- [ ] Test bot on client's website
- [ ] Monitor usage in first week
- [ ] Refine knowledge base based on conversations

---

## 🔗 **Useful Links**

- **Google AI Studio:** https://aistudio.google.com/
- **Gemini API Docs:** https://ai.google.dev/docs
- **Rate Limits:** https://ai.google.dev/gemini-api/docs/rate-limits
- **Pricing:** https://ai.google.dev/pricing

---

## ❓ **FAQs**

### **Q: Can I fine-tune Gemini models?**
A: No, not on free tier. Use context injection instead (already implemented).

### **Q: How many widgets can share one API key?**
A: Unlimited, but you'll hit rate limits faster. Recommend 5-10 low-volume widgets per key.

### **Q: What happens when limits are exceeded?**
A: Bot falls back to knowledge base matching (no AI). User sees pre-written answers.

### **Q: Can I upgrade to paid tier?**
A: Yes! Go to AI Studio → Billing. Paid tier removes most limits.

### **Q: How do I know which widget used which key?**
A: Check `llm_request_logs` table - it tracks widget_id for every request.

---

## 📞 **Support**

If you have questions about setting up AI Studio or managing widget training:
1. Check this guide first
2. Review `llm_request_logs` for errors
3. Test with `POST /api/chat-widget/test-llm` endpoint
4. Check Heroku logs: `heroku logs --tail`

---

**Last Updated:** October 27, 2025  
**System Version:** v365

