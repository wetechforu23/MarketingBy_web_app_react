# 💰 ChatBot Pricing & Billing System

## Overview
Complete billing system for WeTechForU AI Chat Widget service.

---

## 📊 Cost Analysis

### Google Gemini 2.5 Flash Pricing
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens

### Average Costs Per Interaction
| Interaction Type | Tokens Used | Cost | Your Charge | Profit |
|-----------------|-------------|------|-------------|--------|
| **AI Response** | ~800 tokens | $0.00013 | $0.01 | $0.00987 (7,592%) |
| **Knowledge Base** | 0 tokens | $0 | $0 | $0 |
| **Quick Actions** | 0 tokens | $0 | $0 | $0 |

### Infrastructure Costs (Monthly)
- Heroku Dyno: $7/month
- PostgreSQL: $5/month
- **Total Fixed Cost**: $12/month
- **Break-even**: 2 clients @ $29/month

---

## 💡 Recommended Pricing Tiers

### Subscription Model (Per Bot/Per Month)

#### 🆓 **Free Tier**
- **Price**: $0
- **AI Responses**: 100/month
- **Knowledge Base**: Unlimited
- **Total Messages**: Unlimited
- **Support**: Email only
- **Perfect for**: Testing, small websites

#### 🌟 **Starter** ($29/month)
- **AI Responses**: 1,000/month (~33/day)
- **Knowledge Base**: Unlimited
- **Total Messages**: Unlimited
- **Support**: Email + Chat
- **Analytics**: Basic
- **Visitor Monitoring**: Yes
- **Custom Branding**: Yes
- **Perfect for**: Small clinics, solo practitioners

#### 🚀 **Professional** ($79/month)
- **AI Responses**: 5,000/month (~166/day)
- **Knowledge Base**: Unlimited
- **Total Messages**: Unlimited
- **Support**: Priority email + Chat
- **Analytics**: Advanced
- **Visitor Monitoring**: Yes
- **Custom Branding**: Yes
- **Agent Handoff**: Yes
- **Perfect for**: Medium practices, multi-location

#### 💼 **Enterprise** ($199/month)
- **AI Responses**: 20,000/month (~666/day)
- **Knowledge Base**: Unlimited
- **Total Messages**: Unlimited
- **Support**: Dedicated account manager
- **Analytics**: Full suite
- **Visitor Monitoring**: Yes
- **Custom Branding**: Yes
- **Agent Handoff**: Yes
- **White-label**: Yes
- **API Access**: Yes
- **Perfect for**: Hospital networks, large organizations

#### 🎯 **Pay-As-You-Go Add-On**
- Additional AI responses: **$0.01 each**
- Automatically charged when tier limit exceeded
- Minimum: $10/month if used

---

## 🎁 Free Credit Strategy

### New Widget Creation
```javascript
{
  "free_ai_responses": 100,
  "reset_period": "monthly",
  "expires_after": "never",
  "overuse_action": "upgrade_prompt"
}
```

### Credit Allocation Rules
1. **First 100 AI responses**: FREE every month
2. **After 100**: Upgrade prompt OR pay-per-use
3. **Knowledge base**: Always FREE
4. **Quick actions/forms**: Always FREE

---

## 📐 Profit Margin Calculations

### Starter Tier ($29/month)
- **Revenue**: $29
- **Cost (1,000 AI responses)**: $0.13
- **Infrastructure (allocated)**: $1
- **Net Profit**: $27.87 (96% margin)

### Professional Tier ($79/month)
- **Revenue**: $79
- **Cost (5,000 AI responses)**: $0.65
- **Infrastructure (allocated)**: $1
- **Net Profit**: $77.35 (98% margin)

### Enterprise Tier ($199/month)
- **Revenue**: $199
- **Cost (20,000 AI responses)**: $2.60
- **Infrastructure (allocated)**: $2
- **Net Profit**: $194.40 (98% margin)

**Minimum Profit Per Client**: 96%+

---

## 🗄️ Database Schema

### New Table: `widget_billing`
```sql
CREATE TABLE widget_billing (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER NOT NULL REFERENCES widget_configs(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Pricing Tier
    tier VARCHAR(50) DEFAULT 'free', -- 'free', 'starter', 'professional', 'enterprise', 'custom'
    monthly_price DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Limits
    ai_responses_limit INTEGER DEFAULT 100,
    ai_responses_used INTEGER DEFAULT 0,
    
    -- Usage Tracking
    total_ai_responses BIGINT DEFAULT 0,
    total_kb_responses BIGINT DEFAULT 0,
    total_quick_actions BIGINT DEFAULT 0,
    
    -- Costs
    month_start_date DATE DEFAULT date_trunc('month', CURRENT_DATE),
    current_month_cost DECIMAL(10, 4) DEFAULT 0.00,
    total_cost DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Billing
    billing_status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    last_payment_date TIMESTAMP,
    next_billing_date DATE,
    
    -- Alerts
    usage_alert_sent BOOLEAN DEFAULT false,
    usage_alert_at INTEGER DEFAULT 80, -- Alert at 80% usage
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_widget_billing_widget ON widget_billing(widget_id);
CREATE INDEX idx_widget_billing_client ON widget_billing(client_id);
CREATE INDEX idx_widget_billing_status ON widget_billing(billing_status);
```

### New Table: `billing_transactions`
```sql
CREATE TABLE billing_transactions (
    id SERIAL PRIMARY KEY,
    widget_id INTEGER NOT NULL REFERENCES widget_configs(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    
    -- Transaction Details
    transaction_type VARCHAR(50), -- 'subscription', 'overage', 'refund'
    amount DECIMAL(10, 2),
    description TEXT,
    
    -- Usage Period
    period_start DATE,
    period_end DATE,
    
    -- Payment
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_transactions_widget ON billing_transactions(widget_id);
CREATE INDEX idx_billing_transactions_client ON billing_transactions(client_id);
CREATE INDEX idx_billing_transactions_status ON billing_transactions(payment_status);
```

---

## 🔧 Usage Tracking Logic

### Track Every Bot Interaction
```typescript
async function trackBotInteraction(
  widgetId: number,
  clientId: number,
  interactionType: 'ai' | 'knowledge_base' | 'quick_action',
  tokensUsed: number = 0
) {
  // Cost calculation
  const inputCost = 0.000075; // per 1K tokens
  const outputCost = 0.0003; // per 1K tokens
  const estimatedCost = (tokensUsed / 1000) * ((inputCost + outputCost) / 2);

  // Update billing usage
  await pool.query(`
    UPDATE widget_billing
    SET 
      ai_responses_used = ai_responses_used + $1,
      total_ai_responses = total_ai_responses + $1,
      total_kb_responses = total_kb_responses + $2,
      total_quick_actions = total_quick_actions + $3,
      current_month_cost = current_month_cost + $4,
      updated_at = NOW()
    WHERE widget_id = $5
  `, [
    interactionType === 'ai' ? 1 : 0,
    interactionType === 'knowledge_base' ? 1 : 0,
    interactionType === 'quick_action' ? 1 : 0,
    estimatedCost,
    widgetId
  ]);

  // Check if limit exceeded
  const result = await pool.query(`
    SELECT ai_responses_used, ai_responses_limit, usage_alert_sent
    FROM widget_billing
    WHERE widget_id = $1
  `, [widgetId]);

  if (result.rows.length > 0) {
    const { ai_responses_used, ai_responses_limit, usage_alert_sent } = result.rows[0];
    const usagePercent = (ai_responses_used / ai_responses_limit) * 100;

    // Send alert at 80%
    if (usagePercent >= 80 && !usage_alert_sent) {
      await sendUsageAlert(clientId, widgetId, usagePercent);
      await pool.query(`
        UPDATE widget_billing SET usage_alert_sent = true WHERE widget_id = $1
      `, [widgetId]);
    }

    // Block AI if limit exceeded (for free tier)
    if (ai_responses_used >= ai_responses_limit) {
      return { blocked: true, reason: 'limit_exceeded' };
    }
  }

  return { blocked: false };
}
```

---

## 📧 Email Notifications

### Usage Alerts
- **80% usage**: Warning email
- **100% usage**: Upgrade prompt
- **Monthly summary**: Usage report with costs

---

## 🎨 UI Components Needed

### 1. Billing Dashboard (Client Portal)
```
📊 Current Plan: Starter ($29/month)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI Responses: 237/1,000 (23.7%)
Knowledge Base: 1,523 (unlimited)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Month Cost: $0.03
Next Billing: Jan 1, 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Upgrade Plan] [View Usage History]
```

### 2. Pricing Page (Public)
- Comparison table
- FAQ section
- Cost calculator

### 3. Admin Panel
- View all client billing
- Adjust limits
- Manual credits
- Revenue dashboard

---

## 🚀 Implementation Checklist

- [ ] Create `widget_billing` table
- [ ] Create `billing_transactions` table
- [ ] Create billing service
- [ ] Add usage tracking to all bot responses
- [ ] Create billing dashboard UI
- [ ] Create pricing page
- [ ] Set up email alerts
- [ ] Add Stripe/payment integration
- [ ] Create admin billing panel
- [ ] Add usage reports
- [ ] Test free tier limits
- [ ] Test upgrade flow

---

## 📌 Key Benefits

### For You (WeTechForU)
✅ **96%+ profit margin**
✅ **Predictable monthly revenue**
✅ **Low infrastructure costs**
✅ **Scalable model**
✅ **Competitive pricing**

### For Your Clients
✅ **Clear, simple pricing**
✅ **Free tier to test**
✅ **No surprise costs**
✅ **Unlimited messages** (only AI responses counted)
✅ **Easy to upgrade/downgrade**

---

## 🎯 Revenue Projections

### Conservative (50 clients)
- 10 Free tier: $0
- 25 Starter: $725/month
- 10 Professional: $790/month
- 5 Enterprise: $995/month
- **Total Revenue**: $2,510/month
- **Total Costs**: ~$100/month
- **Net Profit**: ~$2,410/month (96% margin)

### Moderate (200 clients)
- **Monthly Revenue**: ~$10,000
- **Net Profit**: ~$9,600/month

---

## 📝 Next Steps

1. **Review & approve** pricing tiers
2. **Create database** tables
3. **Build billing** service
4. **Add UI** components
5. **Test** thoroughly
6. **Launch** with promotional pricing
7. **Monitor & adjust** based on usage patterns

---

**Status**: Ready for Implementation
**Priority**: High
**Timeline**: 2-3 days for MVP

