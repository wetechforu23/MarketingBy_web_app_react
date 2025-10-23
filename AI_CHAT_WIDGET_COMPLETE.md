# AI Chat Widget System - Complete Implementation Guide

**Created:** 2025-10-23  
**Status:** ✅ Complete and Ready for Testing  
**Version:** 1.0.0

---

## 📋 OVERVIEW

The AI Chat Widget is a fully-featured, embeddable chatbot system that can be installed on any website (WordPress, HTML, Shopify, etc.). It provides:

- 🤖 **AI-Powered Responses** from customizable knowledge base
- 📧 **Lead Capture** with multiple handoff options
- 📅 **Appointment Booking** directly in chat
- 🔒 **Anti-Spam Protection** with rate limiting and fingerprinting
- 📊 **Analytics Dashboard** for tracking conversations
- 🎨 **Fully Customizable** appearance and behavior

---

## 🏗️ ARCHITECTURE

### Components Built

1. **Database Schema** (`backend/database/add_ai_chat_widget.sql`)
   - 9 tables for widget management, knowledge base, conversations, messages, analytics
   - Anti-spam rules and tracking
   - Appointment booking integration

2. **Backend API** (`backend/src/routes/chatWidget.ts`)
   - Widget configuration endpoints
   - Knowledge base management
   - Public API for website embedding
   - Lead capture and conversation tracking

3. **Embeddable Widget** (`backend/public/wetechforu-widget.js`)
   - Standalone JavaScript widget
   - No dependencies (vanilla JS)
   - Works on any website
   - Responsive design

4. **WordPress Plugin** (`wordpress-plugin/wetechforu-chat-widget/`)
   - One-click installation for WordPress sites
   - Admin panel for configuration
   - Automatic widget injection

---

## 🚀 SETUP INSTRUCTIONS

### Step 1: Run Database Migration

```bash
# From project root
cd backend
psql $DATABASE_URL -f database/add_ai_chat_widget.sql
```

**Or run SQL manually:**
- File: `backend/database/add_ai_chat_widget.sql`
- Contains all table definitions and indexes

### Step 2: Rebuild Backend

```bash
cd backend
npm run build
# Restart your backend server
```

The chat widget API is now available at `/api/chat-widget/*`

### Step 3: Create Your First Widget

**Via API (Postman/cURL):**

```bash
curl -X POST http://localhost:3001/api/chat-widget/widgets \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "client_id": 67,
    "widget_name": "My Website Chat",
    "primary_color": "#4682B4",
    "secondary_color": "#2E86AB",
    "position": "bottom-right",
    "welcome_message": "Hi! How can I help you today?",
    "bot_name": "Assistant",
    "enable_appointment_booking": true,
    "enable_email_capture": true,
    "enable_phone_capture": true
  }'
```

**Response:**
```json
{
  "id": 1,
  "widget_key": "wtfu_abc123def456...",
  "widget_name": "My Website Chat",
  ...
}
```

**Save the `widget_key`** - you'll need it for installation!

### Step 4: Install on Website

#### Option A: HTML Website (Any Site)

Add this code before `</body>`:

```html
<!-- WeTechForU AI Chat Widget -->
<script src="https://your-domain.com/wetechforu-widget.js"></script>
<script>
  WeTechForUWidget.init({
    widgetKey: 'wtfu_your_widget_key_here',
    apiUrl: 'https://your-api-domain.com/api/chat-widget'
  });
</script>
```

#### Option B: WordPress Plugin

1. **Zip the plugin:**
   ```bash
   cd wordpress-plugin
   zip -r wetechforu-chat-widget.zip wetechforu-chat-widget/
   ```

2. **Install in WordPress:**
   - Go to Plugins → Add New → Upload Plugin
   - Choose `wetechforu-chat-widget.zip`
   - Click "Install Now"
   - Activate the plugin

3. **Configure:**
   - Go to "Chat Widget" in WordPress admin
   - Enter your widget key
   - Enable the widget
   - Save settings

---

## 📚 API ENDPOINTS

### Admin Endpoints (Require Authentication)

#### Get All Widgets
```
GET /api/chat-widget/widgets
```

#### Create Widget
```
POST /api/chat-widget/widgets
Body: {
  client_id, widget_name, primary_color, etc.
}
```

#### Update Widget
```
PUT /api/chat-widget/widgets/:id
Body: { field: value }
```

#### Delete Widget
```
DELETE /api/chat-widget/widgets/:id
```

#### Get Knowledge Base
```
GET /api/chat-widget/widgets/:widgetId/knowledge
```

#### Add Knowledge Entry
```
POST /api/chat-widget/widgets/:widgetId/knowledge
Body: {
  category: 'general',
  question: 'What are your hours?',
  answer: 'We are open 9-5 Monday-Friday',
  keywords: ['hours', 'open', 'time'],
  priority: 10
}
```

#### Update Knowledge Entry
```
PUT /api/chat-widget/widgets/:widgetId/knowledge/:knowledgeId
Body: { question, answer, keywords, etc. }
```

#### Delete Knowledge Entry
```
DELETE /api/chat-widget/widgets/:widgetId/knowledge/:knowledgeId
```

#### Get Analytics
```
GET /api/chat-widget/widgets/:widgetId/analytics?start_date=2025-01-01&end_date=2025-01-31
```

#### Get Conversations
```
GET /api/chat-widget/widgets/:widgetId/conversations?status=active&limit=50&offset=0
```

#### Get Messages for Conversation
```
GET /api/chat-widget/conversations/:conversationId/messages
```

### Public Endpoints (No Authentication)

#### Get Widget Config
```
GET /api/chat-widget/public/widget/:widgetKey/config
```

#### Start Conversation
```
POST /api/chat-widget/public/widget/:widgetKey/conversation
Body: {
  session_id: 'sess_abc123',
  page_url: 'https://example.com/page',
  referrer_url: 'https://google.com',
  user_agent: 'Mozilla/5.0...'
}
```

#### Send Message
```
POST /api/chat-widget/public/widget/:widgetKey/message
Body: {
  conversation_id: 123,
  message_text: 'What are your hours?'
}
```

#### Capture Lead
```
POST /api/chat-widget/public/widget/:widgetKey/capture-lead
Body: {
  conversation_id: 123,
  visitor_name: 'John Doe',
  visitor_email: 'john@example.com',
  visitor_phone: '555-1234',
  handoff_type: 'email',
  handoff_details: {}
}
```

#### Submit Feedback
```
POST /api/chat-widget/public/widget/:widgetKey/feedback
Body: {
  message_id: 456,
  was_helpful: true,
  feedback_text: 'Very helpful!'
}
```

---

## 🎨 CUSTOMIZATION

### Widget Appearance

Configure via API when creating/updating widget:

```json
{
  "primary_color": "#4682B4",        // Main color
  "secondary_color": "#2E86AB",      // Accent color
  "position": "bottom-right",        // bottom-right, bottom-left, top-right, top-left
  "welcome_message": "Hi! How can I help?",
  "bot_name": "Assistant",
  "bot_avatar_url": "https://..."    // Optional avatar image
}
```

### Business Hours

```json
{
  "business_hours": {
    "enabled": true,
    "timezone": "America/Chicago",
    "hours": {
      "monday": { "open": "09:00", "close": "17:00" },
      "tuesday": { "open": "09:00", "close": "17:00" },
      "wednesday": { "open": "09:00", "close": "17:00" },
      "thursday": { "open": "09:00", "close": "17:00" },
      "friday": { "open": "09:00", "close": "17:00" },
      "saturday": null,
      "sunday": null
    }
  },
  "offline_message": "We're currently offline. Leave your email!"
}
```

### Anti-Spam Settings

```json
{
  "rate_limit_messages": 10,         // Max messages per session
  "rate_limit_window": 60,           // Time window in seconds
  "require_captcha": false,
  "blocked_ips": ["1.2.3.4"],
  "blocked_keywords": ["spam", "viagra"]
}
```

---

## 📊 DATABASE SCHEMA

### Tables Created

1. **widget_configs** - Widget configuration and settings
2. **widget_knowledge_base** - AI knowledge base entries
3. **widget_conversations** - Chat conversations
4. **widget_messages** - Individual messages
5. **widget_analytics** - Daily analytics aggregates
6. **widget_spam_rules** - Anti-spam rules
7. **widget_appointments** - Appointment bookings
8. **widget_installations** - Track widget installations
9. **session** - Session storage (existing table)

---

## 🔒 SECURITY FEATURES

### Built-in Anti-Spam

1. **Rate Limiting**
   - Configurable message limit per session
   - Time window-based throttling

2. **Spam Detection**
   - Keyword blacklisting
   - IP blocking
   - Spam scoring (0.00 to 1.00)
   - Automatic flagging

3. **Input Sanitization**
   - XSS protection
   - HTML escaping
   - SQL injection prevention

4. **Session Management**
   - Unique session IDs
   - Browser fingerprinting
   - Session expiration

---

## 📈 ANALYTICS & TRACKING

### Metrics Tracked

- **Conversation Metrics:**
  - Total conversations
  - Completed vs abandoned
  - Spam conversations
  - Average duration

- **Message Metrics:**
  - Total messages
  - Avg messages per conversation
  - Response time
  - Confidence scores

- **Lead Metrics:**
  - Leads captured
  - Handoff types (email, phone, AI)
  - Conversion rate

- **Satisfaction:**
  - Ratings (1-5 stars)
  - Helpful/not helpful feedback
  - Knowledge base effectiveness

---

## 🧪 TESTING GUIDE

### 1. Test Widget Creation

```bash
# Login to your local app
# Navigate to: http://localhost:5173/app/dashboard

# Create widget via API (use Postman or curl)
curl -X POST http://localhost:3001/api/chat-widget/widgets \
  -H "Content-Type: application/json" \
  -H "Cookie: marketingby.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "client_id": YOUR_CLIENT_ID,
    "widget_name": "Test Widget",
    "welcome_message": "Hello! Test widget here."
  }'
```

### 2. Test Embed Code

Create `test-widget.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Test</title>
</head>
<body>
    <h1>Test Page for WeTechForU Chat Widget</h1>
    
    <!-- Widget Code -->
    <script src="http://localhost:3001/wetechforu-widget.js"></script>
    <script>
        WeTechForUWidget.init({
            widgetKey: 'YOUR_WIDGET_KEY_HERE',
            apiUrl: 'http://localhost:3001/api/chat-widget'
        });
    </script>
</body>
</html>
```

Open in browser and test:
- Widget appears in bottom-right
- Click to open chat
- Send messages
- Test lead capture form

### 3. Test Knowledge Base

Add knowledge entries:

```bash
curl -X POST http://localhost:3001/api/chat-widget/widgets/1/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION" \
  -d '{
    "category": "general",
    "question": "What are your business hours?",
    "answer": "We are open Monday-Friday, 9 AM to 6 PM.",
    "keywords": ["hours", "open", "time", "schedule"],
    "priority": 10
  }'
```

Test in widget:
- Ask "What are your hours?"
- Bot should respond with the knowledge base answer

### 4. Test Lead Capture

1. Open widget
2. Ask a question the bot can't answer
3. Bot should offer lead capture form
4. Fill in name, email, phone
5. Submit
6. Check `leads` table in database for new lead

---

## 🐛 TROUBLESHOOTING

### Widget Not Appearing

1. Check browser console for errors
2. Verify widget key is correct
3. Ensure widget is enabled (`is_active = true`)
4. Check CORS settings allow your domain

### Messages Not Getting Responses

1. Verify backend is running
2. Check browser Network tab for API calls
3. Ensure conversation was created successfully
4. Check backend logs for errors

### Lead Capture Not Working

1. Verify email/phone capture is enabled in widget config
2. Check browser console for JavaScript errors
3. Verify conversation_id is being sent
4. Check backend logs for database errors

### WordPress Plugin Issues

1. Check PHP error logs
2. Verify widget key is saved in WordPress options
3. Test connection button in plugin settings
4. Check if widget script is loading (view page source)

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Production:

- [ ] Run database migration on production DB
- [ ] Update widget script URL in WordPress plugin
- [ ] Update API URL in embed code documentation
- [ ] Test widget on staging environment
- [ ] Configure rate limits for production traffic
- [ ] Set up monitoring/alerts for API endpoints
- [ ] Enable HTTPS for widget script
- [ ] Add your production domain to CORS whitelist
- [ ] Test on multiple browsers/devices
- [ ] Document widget keys for each client

### Production URLs:

- **API Endpoint:** `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/chat-widget`
- **Widget Script:** `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/wetechforu-widget.js`

---

## 📖 NEXT STEPS

### Immediate (Testing Phase):

1. ✅ Run database migration locally
2. ✅ Create test widget
3. ✅ Test embed code on HTML page
4. ✅ Test WordPress plugin locally
5. ✅ Add knowledge base entries
6. ✅ Test full conversation flow
7. ✅ Test lead capture
8. ✅ Verify analytics tracking

### Short-Term (After Testing):

1. Add admin UI in dashboard for widget management
2. Build knowledge base management UI
3. Create analytics dashboard page
4. Add conversation history viewer
5. Implement appointment booking calendar integration

### Long-Term (Future Enhancements):

1. AI/ML improvements for better response matching
2. Multi-language support
3. Voice chat capability
4. Video chat handoff
5. Integration with CRM systems
6. Advanced analytics and reporting
7. A/B testing for widget variations
8. Sentiment analysis

---

## 📞 SUPPORT

**Documentation:** This file + inline code comments
**API Testing:** Use Postman collection (create from endpoints above)
**Bugs/Issues:** Add to project issue tracker
**Questions:** Contact development team

---

## ✅ COMPLETION STATUS

- [x] Database schema designed and created
- [x] Backend API endpoints implemented
- [x] Embeddable JavaScript widget created
- [x] WordPress plugin developed
- [x] Anti-spam protection implemented
- [x] Documentation completed
- [ ] Admin UI for widget management (pending)
- [ ] Full end-to-end testing (ready to test)
- [ ] Production deployment (ready after testing)

**Ready for local testing!** 🎉

---

**Built with ❤️ by WeTechForU Development Team**  
**Version:** 1.0.0  
**Last Updated:** 2025-10-23

