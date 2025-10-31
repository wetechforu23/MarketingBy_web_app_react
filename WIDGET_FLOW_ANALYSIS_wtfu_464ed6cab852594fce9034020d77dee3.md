# 📊 Widget Flow Analysis
## Widget Key: `wtfu_464ed6cab852594fce9034020d77dee3`

**Generated:** October 31, 2025  
**Widget ID:** 7  
**Widget Name:** Wetechforu Chat Widget  
**Status:** ✅ ACTIVE

---

## 🔧 CURRENT DATABASE CONFIGURATION

### **Basic Settings:**
- **Bot Name:** `Wetechforu Assistant`
- **Welcome Message:** `Hi! 👋 Welcome to WeTechForU. How can I help you today?`
- **Bot Avatar:** `https://cdn-icons-png.flaticon.com/512/4712/4712109.png`
- **Position:** `bottom-right`
- **Colors:** Primary `#4682B4`, Secondary `#2E86AB`

### **Intro Flow Settings:**
- **Intro Flow:** ✅ **ENABLED**
- **Intro Questions:** 4 questions configured:
  1. **First Name** (text, required, order: 1)
  2. **Last Name** (text, required, order: 2)
  3. **Email** (email, required, order: 3)
  4. **Phone** (tel, optional, order: 4)

### **Feature Flags:**
- ❌ Appointment Booking: **DISABLED**
- ❌ Email Capture: **DISABLED**
- ❌ Phone Capture: **DISABLED**
- ❌ AI Handoff: **DISABLED**
- ❌ LLM Enabled: **DISABLED** (Uses Knowledge Base)

### **Handover Configuration:**
- **Enable Handover Choice:** ✅ YES
- **Available Methods:**
  - ✅ WhatsApp: **ENABLED**
  - ❌ Portal: DISABLED
  - ❌ Email: DISABLED
  - ❌ Phone: DISABLED
  - ❌ Webhook: DISABLED
- **Default Method:** `whatsapp`
- **WhatsApp Number:** `+14698880705`
- **WhatsApp Template SID:** `HX659835c73e53f7d35320f3d3c3e5f259`

### **Healthcare Settings:**
- **Industry:** `general`
- **Practice Phone:** `(888) 123-4567`
- **Show Emergency Warning:** ❌ NO
- **Auto Detect Emergency:** ❌ NO

---

## 🔄 COMPLETE WIDGET FLOW

### **1. WIDGET INITIALIZATION (Page Load)**

```javascript
1. Widget Script Loads: /public/wetechforu-widget-v2.js
2. WeTechForUWidget.init({
     widgetKey: 'wtfu_464ed6cab852594fce9034020d77dee3',
     backendUrl: 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com'
   })
3. Load Widget Config: GET /api/chat-widget/public/widget/{widgetKey}/config
4. Start Visitor Tracking: Event-driven + 120s visibility-gated heartbeat
```

**Config Loaded:**
- Bot name, welcome message, colors, intro questions
- All settings from `widget_configs` table (ID: 7)

---

### **2. AUTO-POPUP & SESSION RESTORE**

```javascript
✅ Auto-popup: Enabled (if not closed in session)
✅ Session Check: 
   - Checks localStorage for visitorSessionId
   - Checks for existing active conversation
   - If found: Restore conversation + load previous messages
   - If intro_completed = true: Skip intro flow
```

**Session Storage Keys:**
- `wetechforu_visitor_session_id` - Persistent across tabs
- `wetechforu_conversation_{widgetKey}` - Conversation ID
- `wetechforu_welcome_shown_{widgetKey}` - Welcome shown flag
- `wetechforu_closed_{widgetKey}` - Bot closed flag

---

### **3. WELCOME MESSAGE & INTRO FLOW**

#### **Scenario A: New Visitor (First Time)**

```
1. Widget opens → Checks sessionStorage: hasShownWelcome = false
2. Sets: sessionStorage.setItem('wetechforu_welcome_shown_{widgetKey}', 'true')
3. Checks: intro_flow_enabled = true
4. Calls: startIntroFlow()
```

**Intro Flow Execution:**
```javascript
1. Check intro_completed flag from conversation status
2. If intro_completed = false:
   ✅ Show: "👋 Welcome! I'm Wetechforu Assistant."
   ✅ Show: "Before we begin, I'd like to know a bit more about you."
   ✅ Ask Question 1: "What is your first name?" (required)
   ✅ User answers → Save to introFlow.answers
   ✅ Ask Question 2: "What is your last name?" (required)
   ✅ User answers → Save to introFlow.answers
   ✅ Ask Question 3: "What is your email address?" (required)
   ✅ User answers → Save to introFlow.answers
   ✅ Ask Question 4: "What is your phone number?" (optional)
   ✅ User answers or skips → Save to introFlow.answers
   ✅ Submit to: POST /api/chat-widget/public/widget/{widgetKey}/intro-data
   ✅ Set intro_completed = true in database
   ✅ Show: "✅ Thank you! I have all the information I need."
   ✅ Show: "How can I help you today? Feel free to ask me anything! 😊"
```

#### **Scenario B: Returning Visitor (Session Restored)**

```
1. Widget opens → Finds existing conversation by visitorSessionId
2. Loads previous messages from database
3. Checks conversation status: intro_completed = true
4. Skips intro flow (hasShownIntro = true)
5. Shows: "👋 Welcome back! Here's your previous conversation:"
6. Displays all previous messages
```

---

### **4. USER MESSAGE HANDLING**

#### **Message Flow:**
```
1. User types message → sendMessage()
2. POST /api/chat-widget/public/widget/{widgetKey}/message
   {
     conversation_id: {id},
     message_text: "user message"
   }
```

#### **Backend Processing:**
```javascript
1. Save user message to widget_messages table
2. Check: agent_handoff = true?
   ✅ YES → Bot stays silent, message sent to agent
   ❌ NO → Continue to bot response
3. Check: llm_enabled = false
   ✅ Uses Knowledge Base matching
   ❌ Would use LLM if enabled
4. Search Knowledge Base for matching question
5. Return bot response or "I don't have an answer for that"
```

---

### **5. AUTO MESSAGES SOURCE**

#### **Welcome Messages:**
- **Source:** `widget_configs.welcome_message` column
- **Value:** `"Hi! 👋 Welcome to WeTechForU. How can I help you today?"`
- **When Shown:** Only once per session (checked via `sessionStorage`)

#### **Intro Flow Messages:**
- **Source:** `widget_configs.intro_questions` JSONB column
- **Questions:**
  1. "What is your first name?" (from database)
  2. "What is your last name?" (from database)
  3. "What is your email address?" (from database)
  4. "What is your phone number?" (from database)
- **When Shown:** Only if `intro_completed = false` for conversation
- **Hardcoded Messages:**
  - "👋 Welcome! I'm {bot_name}." (hardcoded in widget)
  - "Before we begin, I'd like to know a bit more about you." (hardcoded in widget)
  - "✅ Thank you! I have all the information I need." (hardcoded in widget)

#### **Bot Responses:**
- **Source:** Knowledge Base (`widget_knowledge_base` table) OR LLM
- **Since LLM is disabled:** Uses Knowledge Base matching only

---

## ⚠️ POTENTIAL CAUSES OF REPEATING MESSAGES

### **1. Intro Questions Repeating**

**Possible Causes:**
- ✅ **FIXED:** Now checks `intro_completed` flag before showing intro
- ⚠️ **Still Possible:** If conversation restored but `intro_completed` not properly checked
- ⚠️ **Still Possible:** Multiple widget instances on same page

**Current Fix Status:**
- ✅ Widget checks `intro_completed` from conversation status API
- ✅ Sets `hasShownIntro = true` if intro already completed
- ✅ Skips intro flow if `intro_completed = true`

---

### **2. Welcome Message Repeating**

**Possible Causes:**
- ⚠️ **Possible:** `sessionStorage` cleared or different tab
- ⚠️ **Possible:** Widget reloaded/reinitialized multiple times
- ⚠️ **Possible:** Multiple conversation instances

**Current Protection:**
- ✅ Uses `sessionStorage.getItem('wetechforu_welcome_shown_{widgetKey}')`
- ✅ Sets flag immediately before showing welcome
- ⚠️ **Issue:** Flag is session-based, so new tab = new welcome

---

### **3. Bot Responses Repeating**

**Possible Causes:**
- ❌ **Unlikely:** Each message creates new DB entry
- ⚠️ **Possible:** Frontend displaying same message multiple times
- ⚠️ **Possible:** Polling fetching duplicate messages

---

### **4. Multiple Conversations**

**Possible Causes:**
- ⚠️ **Possible:** Widget creating new conversation instead of restoring
- ⚠️ **Possible:** `visitorSessionId` not matching existing conversation
- ⚠️ **Possible:** Multiple tabs creating separate conversations

**Current Fix Status:**
- ✅ Widget now checks for conversation by `visitorSessionId` first
- ✅ Restores conversation across tabs using persistent `visitorSessionId`
- ✅ Loads previous messages on restore

---

## 🔍 RECOMMENDED FIXES FOR REPEATING MESSAGES

### **Fix 1: Intro Flow Check on Restore**
✅ **IMPLEMENTED:** Widget now checks `intro_completed` from conversation status when restoring

### **Fix 2: Welcome Message Persistence**
⚠️ **COULD IMPROVE:** Use `localStorage` instead of `sessionStorage` for welcome flag
- Current: `sessionStorage` (clears on tab close)
- Better: `localStorage` (persists across tabs)

### **Fix 3: Conversation Deduplication**
✅ **IMPLEMENTED:** Widget checks for existing conversation by `visitorSessionId` before creating new one

### **Fix 4: Message Display Deduplication**
- Ensure messages are only added once to UI
- Check `displayedMessageIds` array before adding

---

## 📋 EXPECTED BEHAVIOR SUMMARY

### **For New Visitor:**
1. ✅ Widget auto-pops up (if enabled)
2. ✅ Shows welcome message: "Hi! 👋 Welcome to WeTechForU..."
3. ✅ Shows intro questions (4 questions)
4. ✅ After intro complete, shows: "How can I help you today?"
5. ✅ Bot responds from Knowledge Base

### **For Returning Visitor (Same Tab):**
1. ✅ Restores conversation from `visitorSessionId`
2. ✅ Loads previous messages
3. ✅ Skips intro (if already completed)
4. ✅ Shows: "👋 Welcome back! Here's your previous conversation:"

### **For Returning Visitor (New Tab):**
1. ✅ Finds conversation by `visitorSessionId` (cross-tab)
2. ✅ Loads previous messages
3. ✅ Skips intro (if already completed)
4. ✅ Continues conversation seamlessly

---

## 🎯 ACTION ITEMS

1. ✅ **Session Restore:** Implemented - uses `visitorSessionId`
2. ✅ **Intro Flow Check:** Implemented - checks `intro_completed` flag
3. ✅ **Activity Tracking:** Implemented - event-driven + heartbeat
4. ⚠️ **Welcome Message Persistence:** Could improve to use `localStorage`
5. ⚠️ **Monitor for Duplicates:** Check recent conversations for duplicate bot messages

---

**Last Updated:** October 31, 2025  
**Widget Version:** v2.1  
**Deployment Status:** ✅ Live on Heroku

---

## 🐛 IDENTIFIED ISSUE: DUPLICATE WELCOME MESSAGES

### **Problem:**
When intro flow is enabled, the widget shows **multiple welcome messages**:

1. **First Welcome:** From `startIntroFlow()` (line 902):
   ```javascript
   this.addBotMessage(`👋 Welcome! I'm ${this.config.botName}.`);
   ```

2. **Second Welcome:** From `startIntroFlow()` (line 906):
   ```javascript
   this.addBotMessage("Before we begin, I'd like to know a bit more about you.");
   ```

3. **Possible Third:** The `widget_configs.welcome_message` is NOT used during intro flow, but if intro completes and calls `startDefaultIntroFlow()`, it shows:
   ```javascript
   this.addBotMessage(this.config.welcomeMessage || "Hi! How can I help you today?");
   ```

### **Root Cause:**
- `startIntroFlow()` shows hardcoded welcome messages
- `startDefaultIntroFlow()` shows `widget_configs.welcome_message`
- Both can be called, causing duplicates

### **Current Behavior:**
✅ Widget checks `intro_completed` before showing intro  
✅ Widget checks `hasShownWelcome` before showing welcome  
⚠️ But intro flow shows its own welcome messages (not the database welcome message)

---

## 💡 RECOMMENDED FIXES

### **Fix 1: Use Database Welcome Message in Intro Flow**
Instead of hardcoded messages in `startIntroFlow()`, use the database `welcome_message`:

```javascript
// CURRENT (line 902):
this.addBotMessage(`👋 Welcome! I'm ${this.config.botName}.`);

// SHOULD BE:
this.addBotMessage(this.config.welcomeMessage || `👋 Welcome! I'm ${this.config.botName}.`);
```

### **Fix 2: Ensure Intro Flow Only Shows Once**
Already implemented ✅ - checks `intro_completed` flag

### **Fix 3: Prevent Multiple Conversation Instances**
Already implemented ✅ - uses `visitorSessionId` to restore

---

## 📊 CURRENT LIVE CONFIGURATION SUMMARY

**Widget ID 7 Configuration:**
- ✅ Intro Flow: **ENABLED** with 4 questions
- ✅ Welcome Message: `"Hi! 👋 Welcome to WeTechForU. How can I help you today?"`
- ❌ LLM: **DISABLED** (uses Knowledge Base)
- ✅ Handover: **WhatsApp enabled** only
- ✅ Bot Name: `"Wetechforu Assistant"`

**Flow Behavior:**
1. Widget loads → Shows intro questions (4 questions)
2. After intro → Shows completion message
3. User messages → Bot responds from Knowledge Base
4. Agent handoff → WhatsApp notification sent

**Auto Messages:**
- Welcome: From database (`welcome_message` column) ✅
- Intro Questions: From database (`intro_questions` JSONB) ✅
- Bot Responses: From Knowledge Base (since LLM disabled) ✅


