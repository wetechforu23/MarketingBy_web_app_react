# 🤖 LLM Integration Guide - AI-Powered Chat Widget

## 📋 **Overview**

This guide explains how to integrate free LLM (Large Language Model) services into your chat widgets to make them smarter with AI-powered responses. Each client gets **FREE monthly credits** with automatic limits and usage tracking.

---

## 🎯 **Supported LLM Providers**

### 1. **Google Gemini** (RECOMMENDED - Most Generous Free Tier)
- **Free Tier**: 60 requests/minute, 1M tokens/day
- **Model**: `gemini-pro`
- **Cost**: FREE
- **Speed**: Fast
- **Best For**: Production use with high volume

### 2. **Groq** (Fastest)
- **Free Tier**: 30 requests/minute, 14,400 requests/day
- **Model**: `mixtral-8x7b-32768`, `llama3-70b`
- **Cost**: FREE
- **Speed**: VERY FAST (lightning inference)
- **Best For**: Real-time chat applications

### 3. **OpenAI** (Most Advanced)
- **Free Tier**: $5 trial credit for new accounts
- **Model**: `gpt-3.5-turbo`, `gpt-4`
- **Cost**: Pay-per-use after trial
- **Speed**: Medium
- **Best For**: Complex reasoning and high-quality responses

### 4. **Anthropic Claude**
- **Free Tier**: Limited trial credits
- **Model**: `claude-3-haiku-20240307`
- **Cost**: Pay-per-use
- **Speed**: Fast
- **Best For**: Long context and safety-focused applications

---

## 🔑 **Step 1: Get Your API Keys**

### **For Google Gemini (Recommended)**

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key
4. Add to your Heroku environment:
   ```bash
   heroku config:set GEMINI_API_KEY=your_api_key_here --app marketingby-wetechforu
   ```

### **For Groq (Optional - Fast Alternative)**

1. Go to https://console.groq.com/
2. Sign up and create an API key
3. Copy your API key
4. Add to Heroku:
   ```bash
   heroku config:set GROQ_API_KEY=your_api_key_here --app marketingby-wetechforu
   ```

### **For OpenAI (Optional - Advanced)**

1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Add to Heroku:
   ```bash
   heroku config:set OPENAI_API_KEY=your_api_key_here --app marketingby-wetechforu
   ```

---

## 🗄️ **Step 2: Run Database Migration**

```bash
# Connect to production database
heroku pg:psql --app marketingby-wetechforu DATABASE_URL < backend/database/add_llm_integration.sql

# Or for dev/local
psql $DATABASE_URL < backend/database/add_llm_integration.sql
```

This creates:
- `client_llm_usage` table (track credits per client)
- `llm_request_logs` table (detailed analytics)
- Functions for automatic daily/monthly credit reset
- Indexes for performance

---

## ⚙️ **Step 3: Enable LLM for a Widget**

### **Via Database (Quick)**

```sql
UPDATE widget_configs 
SET 
  llm_enabled = true,
  llm_provider = 'gemini', -- or 'groq', 'openai', 'claude'
  llm_model = 'gemini-pro',
  llm_temperature = 0.7,
  llm_max_tokens = 500,
  fallback_to_knowledge_base = true
WHERE id = YOUR_WIDGET_ID;
```

### **Via Admin UI** (Coming Soon)

Navigate to: **Chat Widgets → Edit Widget → AI Settings**

---

## 💳 **Step 4: Set Client Credit Limits**

### **Default Free Limits (Per Client)**
- **Monthly Tokens**: 100,000 (≈ 50,000 words)
- **Daily Tokens**: 5,000 (≈ 2,500 words)
- **Monthly Requests**: 1,000 chat messages
- **Daily Requests**: 100 chat messages

### **Adjust Limits for a Specific Client**

```sql
UPDATE client_llm_usage
SET 
  monthly_token_limit = 200000, -- Increase to 200K
  daily_token_limit = 10000, -- Increase to 10K
  monthly_request_limit = 2000,
  daily_request_limit = 200
WHERE client_id = YOUR_CLIENT_ID AND widget_id = YOUR_WIDGET_ID;
```

---

## 🧪 **Step 5: Test Your AI Widget**

1. **Open your widget** on a test page
2. **Send a message**: "What are your business hours?"
3. **Check logs** to see LLM response:
   ```bash
   heroku logs --tail --app marketingby-wetechforu | grep "LLM"
   ```
4. **Look for**:
   ```
   🤖 LLM enabled for widget 123 - Attempting AI response...
   ✅ LLM response generated (450 tokens, 1200ms)
   ```

---

## 📊 **How It Works**

### **Smart Response Flow**

```
User sends message
        ↓
   LLM Enabled? 
        ↓
      YES → Check Credits Available?
        ↓
      YES → Call LLM API (Gemini/Groq/OpenAI/Claude)
        ↓
   LLM Success? 
        ↓
      YES → Return AI Response (Confidence: 95%)
      NO  → Fall back to Knowledge Base
        ↓
   Knowledge Base Match?
        ↓
      YES → Return KB Answer (Confidence: 85%+)
      NO  → Return Default Friendly Response
        ↓
   Update Usage Counters
        ↓
   Log Request for Analytics
```

### **Credit Management**

- **Automatic Daily Reset**: Counters reset at midnight
- **Automatic Monthly Reset**: Counters reset on 1st of month
- **Graceful Degradation**: When credits exhausted → Fall back to knowledge base
- **User Notification**: "You've reached your free AI limit. Upgrade for unlimited!"

### **Context-Aware Responses**

The LLM receives:
1. **User's question**
2. **Top 10 knowledge base entries** (for context)
3. **Business information** (from widget config)

This ensures responses are **relevant** and **business-specific**!

---

## 📈 **Monitor Usage**

### **Check Client Usage**

```sql
SELECT 
  c.client_name,
  cu.tokens_used_today,
  cu.daily_token_limit,
  cu.tokens_used_this_month,
  cu.monthly_token_limit,
  cu.requests_made_today,
  cu.requests_made_this_month,
  cu.total_tokens_used,
  cu.total_requests_made
FROM client_llm_usage cu
JOIN clients c ON c.id = cu.client_id
WHERE cu.client_id = YOUR_CLIENT_ID;
```

### **View Request Logs**

```sql
SELECT 
  created_at,
  llm_provider,
  llm_model,
  total_tokens,
  response_time_ms,
  status,
  LEFT(prompt_text, 100) as prompt_preview,
  LEFT(response_text, 100) as response_preview
FROM llm_request_logs
WHERE widget_id = YOUR_WIDGET_ID
ORDER BY created_at DESC
LIMIT 20;
```

### **Analytics Summary (Last 30 Days)**

```sql
SELECT 
  llm_provider,
  COUNT(*) as total_requests,
  SUM(total_tokens) as total_tokens,
  AVG(response_time_ms) as avg_response_time,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'credits_exhausted' THEN 1 END) as exhausted
FROM llm_request_logs
WHERE widget_id = YOUR_WIDGET_ID
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY llm_provider;
```

---

## 🔧 **Troubleshooting**

### **❌ "GEMINI_API_KEY not configured"**
```bash
# Set the API key
heroku config:set GEMINI_API_KEY=your_key --app marketingby-wetechforu

# Verify it's set
heroku config:get GEMINI_API_KEY --app marketingby-wetechforu
```

### **❌ "Credits exhausted" message appearing**
```sql
-- Check current usage
SELECT * FROM client_llm_usage WHERE client_id = YOUR_CLIENT_ID;

-- Manually reset counters
UPDATE client_llm_usage
SET 
  tokens_used_today = 0,
  requests_made_today = 0,
  credits_exhausted = false
WHERE client_id = YOUR_CLIENT_ID;
```

### **❌ LLM not responding, falling back to KB**
```bash
# Check logs
heroku logs --tail --app marketingby-wetechforu | grep "LLM"

# Common issues:
# - API key not set
# - Rate limit exceeded
# - Network timeout (increase timeout in llmService.ts)
```

### **❌ "Rate limit exceeded" errors**
- **Gemini**: 60 requests/min → Implement client-side rate limiting
- **Groq**: 30 requests/min → Use Gemini as primary
- **OpenAI**: $5 trial used → Switch to Gemini (free forever)

---

## 💰 **Cost Comparison**

| Provider | Free Tier | Paid Tier | Best Use Case |
|----------|-----------|-----------|---------------|
| **Gemini** | 1M tokens/day FREE | $0.00025/1K tokens | Production (recommended) |
| **Groq** | 14K requests/day FREE | $0.00027/1K tokens | Speed-critical apps |
| **OpenAI** | $5 trial | $0.002/1K tokens | Advanced reasoning |
| **Claude** | Limited trial | $0.00025/1K tokens | Long context |

**Recommendation**: Start with **Gemini** (free forever), add **Groq** as a fast alternative.

---

## 🎯 **Best Practices**

1. **Start with Conservative Limits**
   - 100K tokens/month = ~1,000 conversations
   - Monitor usage for first month
   - Adjust based on actual usage

2. **Optimize Token Usage**
   - Keep knowledge base entries concise (saves tokens)
   - Use `llm_max_tokens: 500` for chat responses (not essays)
   - Set `temperature: 0.7` for balanced creativity

3. **Monitor Performance**
   - Check `avg_response_time_ms` in logs
   - Gemini: 1-3 seconds typical
   - Groq: 0.5-1 second (fastest)

4. **Fallback Strategy**
   - Always set `fallback_to_knowledge_base: true`
   - Ensure knowledge base is well-populated
   - Test both LLM and fallback scenarios

5. **Security**
   - Never expose API keys in frontend
   - Always use backend proxy
   - Rate limit per session/IP

---

## 📚 **API Documentation**

### **Generate AI Response**
```typescript
POST /api/chat-widget/public/widget/:widgetKey/message
Body: {
  conversation_id: 123,
  message_text: "What are your hours?"
}

Response: {
  message_id: 456,
  response: "We're open Monday-Friday 9 AM to 5 PM...",
  confidence: 0.95, // High confidence for LLM responses
  suggestions: [], // Empty for direct LLM responses
  timestamp: "2025-10-25T..."
}
```

### **Check Client Usage**
```typescript
GET /api/chat-widget/clients/:clientId/llm-usage

Response: [
  {
    client_id: 5,
    widget_id: 10,
    monthly_token_limit: 100000,
    tokens_used_this_month: 15000,
    requests_made_this_month: 150,
    credits_exhausted: false,
    ...
  }
]
```

### **View Analytics**
```typescript
GET /api/chat-widget/widgets/:widgetId/llm-analytics

Response: {
  usage: {
    tokens_used_today: 500,
    tokens_used_this_month: 15000,
    monthly_token_limit: 100000,
    ...
  },
  analytics: {
    total_requests: 150,
    total_tokens: 75000,
    avg_response_time: 1200,
    successful_requests: 148,
    failed_requests: 2,
    credits_exhausted_count: 0
  }
}
```

---

## 🚀 **Next Steps**

1. ✅ Get Gemini API key
2. ✅ Run database migration
3. ✅ Deploy to Heroku
4. ✅ Enable LLM for test widget
5. ✅ Test with real conversations
6. ✅ Monitor usage for 1 week
7. ✅ Adjust limits as needed
8. 🎉 Roll out to all clients!

---

## 📞 **Support**

If you have questions or issues:
1. Check logs: `heroku logs --tail --app marketingby-wetechforu | grep "LLM"`
2. Review SQL queries above for usage/analytics
3. Contact WeTechForU dev team

---

**Version**: 1.0  
**Last Updated**: October 25, 2025  
**Status**: ✅ READY FOR TESTING

