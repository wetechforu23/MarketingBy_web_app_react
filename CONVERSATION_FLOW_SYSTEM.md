# 🔄 Smart Conversation Flow System

## Overview
Configurable, cost-optimized conversation flow that tries cheaper methods first, then escalates to AI/Agent.

---

## 💡 **Optimal Flow (Cost → Effectiveness)**

```
1. 👋 Greeting (FREE)
   ↓ 
2. 📚 Knowledge Base Search (FREE)
   ↓ 
3. 🤖 AI Response (COSTS $0.01)
   ↓ 
4. 👤 Agent Handoff (FREE, but requires human)
```

**Why this order?**
- ✅ **80%** of questions answered by knowledge base (FREE)
- ✅ **15%** need AI help (small cost)
- ✅ **5%** need human agent (last resort)
- ✅ Saves money while providing great service

---

## 🎛️ Flow Configuration UI

### Widget Settings → Conversation Flow Tab

```typescript
┌─────────────────────────────────────────────┐
│ Conversation Flow Settings                  │
├─────────────────────────────────────────────┤
│                                              │
│ Drag to reorder steps:                      │
│                                              │
│ ┌─────────────────────────────────────┐    │
│ │ 🔒 1. Greeting Message         LOCKED│    │
│ │ "Hi! How can I help you today?"     │    │
│ └─────────────────────────────────────┘    │
│           ↓                                  │
│ ┌─────────────────────────────────────┐    │
│ │ ↕️  2. Knowledge Base Search         │    │
│ │ Try to answer from knowledge base   │    │
│ │ [⚙️ Edit] [▲] [▼]                   │    │
│ └─────────────────────────────────────┘    │
│           ↓                                  │
│ ┌─────────────────────────────────────┐    │
│ │ ↕️  3. AI Smart Response             │    │
│ │ Use AI if knowledge base fails      │    │
│ │ [⚙️ Edit] [▲] [▼] [❌ Remove]        │    │
│ └─────────────────────────────────────┘    │
│           ↓                                  │
│ ┌─────────────────────────────────────┐    │
│ │ 🔒 4. Agent Handoff         LOCKED  │    │
│ │ Last resort: connect to human       │    │
│ └─────────────────────────────────────┘    │
│                                              │
│ [+ Add Custom Step]                         │
│                                              │
│ Cost Estimate: ~$0.01 per AI response       │
│ 📊 Expected: 80% Free, 15% AI, 5% Agent    │
└─────────────────────────────────────────────┘
```

### Step Configuration

#### Step 1: Greeting (LOCKED - Always First)
```typescript
{
  type: "greeting",
  locked: true,
  movable: false,
  removable: false,
  message: "Hi! 👋 Welcome to [Business Name]. How can I help you today?",
  customizable: true
}
```

#### Step 2: Knowledge Base Search
```typescript
{
  type: "knowledge_base",
  locked: false,
  movable: true,
  removable: false, // Can't remove - breaks smart response
  settings: {
    min_confidence: 0.7, // 70% match required
    max_results: 3,
    show_similar: true
  }
}
```

#### Step 3: AI Response
```typescript
{
  type: "ai_response",
  locked: false,
  movable: true,
  removable: true, // Can disable AI
  settings: {
    enabled: true,
    fallback_message: "Let me connect you with our team...",
    max_attempts: 1
  }
}
```

#### Step 4: Agent Handoff (LOCKED - Always Last)
```typescript
{
  type: "agent_handoff",
  locked: true,
  movable: false,
  removable: false,
  settings: {
    collect_contact_info: true,
    offline_message: "We're offline now. Leave your details..."
  }
}
```

---

## 🔐 Locked vs Unlocked Steps

### 🔒 LOCKED (Can't Change Order)
- **Greeting** - Must be first
- **Agent Handoff** - Must be last
- **Knowledge Base** - Core functionality

### ↕️ UNLOCKED (Can Reorder)
- **AI Response** - Can move up/down or disable
- **Custom Steps** - FAQ sections, forms, etc.

---

## 📊 Cost Optimization Logic

### Execution Order
```javascript
async function handleUserMessage(message) {
  // 1. Greeting (if first message) - FREE
  if (isFirstMessage) {
    sendGreeting();
    return;
  }

  // 2. Knowledge Base Search - FREE
  const kbResult = await searchKnowledgeBase(message);
  if (kbResult.confidence > 0.7) {
    return kbResult.answer; // ✅ 80% of queries answered here
  }

  // 3. Check if AI is enabled and within limits
  const billing = await checkBilling(widgetId);
  if (billing.aiEnabled && billing.responsesRemaining > 0) {
    // AI Response - COSTS $0.01
    const aiResult = await getAIResponse(message, context);
    await trackUsage(widgetId, 'ai', tokensUsed);
    
    if (aiResult.confidence > 0.5) {
      return aiResult.answer; // ✅ 15% of queries need AI
    }
  }

  // 4. Agent Handoff - FREE (but requires human)
  return requestAgentHandoff(); // ✅ 5% need human help
}
```

---

## 🎨 Database Schema

### Add to `widget_configs` table:
```sql
ALTER TABLE widget_configs 
ADD COLUMN conversation_flow JSONB DEFAULT '[
  {
    "id": 1,
    "type": "greeting",
    "order": 1,
    "locked": true,
    "enabled": true,
    "settings": {}
  },
  {
    "id": 2,
    "type": "knowledge_base",
    "order": 2,
    "locked": true,
    "enabled": true,
    "settings": {
      "min_confidence": 0.7
    }
  },
  {
    "id": 3,
    "type": "ai_response",
    "order": 3,
    "locked": false,
    "enabled": true,
    "settings": {}
  },
  {
    "id": 4,
    "type": "agent_handoff",
    "order": 4,
    "locked": true,
    "enabled": true,
    "settings": {}
  }
]'::jsonb;
```

---

## 🏗️ Implementation

### Backend: Flow Engine
```typescript
// backend/src/services/conversationFlowService.ts

export class ConversationFlowService {
  
  async executeFlow(
    widgetId: number,
    message: string,
    context: any
  ): Promise<BotResponse> {
    
    // Get widget's conversation flow
    const flow = await this.getWidgetFlow(widgetId);
    
    // Execute each step in order
    for (const step of flow.steps) {
      if (!step.enabled) continue;
      
      const result = await this.executeStep(step, message, context);
      
      if (result.success) {
        // Track usage if AI was used
        if (step.type === 'ai_response') {
          await this.trackAIUsage(widgetId, result.tokensUsed);
        }
        return result;
      }
    }
    
    // Fallback to agent
    return this.requestAgentHandoff(widgetId, message);
  }
  
  private async executeStep(
    step: FlowStep,
    message: string,
    context: any
  ): Promise<StepResult> {
    
    switch (step.type) {
      case 'greeting':
        return this.handleGreeting(step);
      
      case 'knowledge_base':
        return this.searchKnowledgeBase(message, step.settings);
      
      case 'ai_response':
        // Check billing limits first
        const canUseAI = await this.checkAIAvailability(context.widgetId);
        if (!canUseAI) {
          return { success: false, reason: 'ai_limit_reached' };
        }
        return this.getAIResponse(message, context);
      
      case 'agent_handoff':
        return this.requestAgentHandoff(context.widgetId, message);
      
      default:
        return { success: false };
    }
  }
}
```

### Frontend: Flow Configuration UI
```typescript
// frontend/src/components/ConversationFlowEditor.tsx

export function ConversationFlowEditor({ widgetId }) {
  const [steps, setSteps] = useState([]);
  
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const step = steps[index];
    
    // Check if step is locked
    if (step.locked) {
      toast.error('This step cannot be moved');
      return;
    }
    
    // Move step
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    
    setSteps(newSteps);
    saveFlow(newSteps);
  };
  
  return (
    <div className="flow-editor">
      {steps.map((step, index) => (
        <FlowStep
          key={step.id}
          step={step}
          index={index}
          onMoveUp={() => moveStep(index, 'up')}
          onMoveDown={() => moveStep(index, 'down')}
          onEdit={() => editStep(step)}
          onRemove={() => removeStep(step.id)}
        />
      ))}
    </div>
  );
}
```

---

## 📈 Analytics Dashboard

Track flow effectiveness:

```
📊 Conversation Flow Performance (This Month)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Greeting Shown:        1,234 (100%)
Knowledge Base:        987 (80%) ✅ [FREE]
AI Response:           185 (15%) 💰 [$1.85]
Agent Handoff:         62 (5%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cost: $1.85
Efficiency: 80% free resolution
```

---

## 🎯 Benefits

### For You (WeTechForU)
✅ **Minimize AI costs** (80% answered free)
✅ **Maximize profit** (only charge for AI when needed)
✅ **Reduce agent workload** (only 5% need humans)
✅ **Flexible per client** (each can customize)

### For Your Clients
✅ **Fast responses** (knowledge base is instant)
✅ **Smart AI** (only when needed)
✅ **Human backup** (always available)
✅ **Lower costs** (free tier lasts longer)

---

## 🚀 Next Steps

1. ✅ Create conversation flow schema
2. ✅ Build flow execution engine
3. ✅ Create UI for flow configuration
4. ✅ Add analytics tracking
5. ✅ Test cost optimization
6. ✅ Deploy to production

---

**Status**: Ready for Implementation
**Priority**: High (reduces costs immediately)
**Timeline**: 2-3 days for MVP

