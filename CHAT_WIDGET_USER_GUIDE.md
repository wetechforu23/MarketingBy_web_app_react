# 🤖 AI Chat Widget - Complete User Guide

## 📋 Overview

Your AI Chat Widget is now fully set up! This guide explains how to:
1. Add knowledge to your widget (teach it what to say)
2. Download & install the WordPress plugin
3. Connect the widget to your database
4. Test everything

---

## 🎯 STEP 1: Add Knowledge to Your Widget

### What is Knowledge?

Knowledge entries are Q&A pairs that teach your chatbot how to respond to customers. For example:
- **Question:** "What are your business hours?"
- **Answer:** "We're open Monday-Friday, 9 AM-6 PM"

### How to Add Knowledge:

1. **Go to Your Widget:**
   - Login to: `https://marketingby.wetechforu.com`
   - Click: **Chat Widget** in left navigation
   - You'll see your widget: **"wetechforu test"**

2. **Click "Knowledge" Button** (cyan/turquoise button)
   - This opens the Knowledge Base management page

3. **Click "Add Knowledge Entry"**
   - **Question/Topic:** What customers might ask
   - **Answer/Response:** What the bot should say
   - **Category:** Organize by topic (Hours, Pricing, Services, etc.)

4. **Save and Repeat**
   - Add as many Q&A pairs as you want
   - The more knowledge you add, the smarter your bot becomes!

### Example Knowledge Entries:

```
Question: "How do I book an appointment?"
Answer: "Click the 'Book Appointment' button below to schedule with us!"
Category: Appointments

Question: "What services do you offer?"
Answer: "We offer web development, marketing, SEO, and AI solutions."
Category: Services

Question: "Where are you located?"
Answer: "We're based in Allen, Texas. Contact us for remote services!"
Category: Location
```

---

## 📦 STEP 2: Download WordPress Plugin

### How to Download:

1. **Go to Chat Widgets Page:**
   - `https://marketingby.wetechforu.com/app/chat-widgets`

2. **Click "WP Plugin" Button** (green button with WordPress icon)
   - File downloads automatically: `wetechforu-chat-widget.php`

3. **What You Get:**
   - A PHP file containing your widget code
   - Pre-configured with your unique `widget_key`
   - Ready to install on any WordPress site

---

## 🔌 STEP 3: Install on WordPress Website

### Installation Steps:

#### Option A: Via WordPress Admin (Easiest)

1. **Login to WordPress Admin:**
   ```
   https://your-website.com/wp-admin
   ```

2. **Go to Plugins → Add New**

3. **Click "Upload Plugin"**

4. **Choose File:**
   - Select the `wetechforu-chat-widget.php` file you downloaded

5. **Click "Install Now"**

6. **Click "Activate"**

7. **Done!** ✅ 
   - The chat widget now appears on your website
   - Visit `https://your-website.com` to see it

#### Option B: Via FTP/File Manager

1. **Connect to your website** via FTP or cPanel File Manager

2. **Navigate to:**
   ```
   /wp-content/plugins/
   ```

3. **Create a folder:**
   ```
   /wp-content/plugins/wetechforu-chat-widget/
   ```

4. **Upload** the `wetechforu-chat-widget.php` file into this folder

5. **Go to WordPress Admin → Plugins**

6. **Activate** "WeTechForU Chat Widget"

---

## 🔗 STEP 4: How Database Connection Works

### Automatic Connection (Already Done!)

**Your widget is already connected to your production database!** Here's how:

1. **Widget Key (Unique ID):**
   - Your widget: `wtfw_4525d305fed7021509584adfdd2bcf71`
   - This key is embedded in the WordPress plugin
   - It's the link between your website and database

2. **When Someone Chats:**
   ```
   Website Visitor → Chat Widget → Your Server (Heroku) → Production Database
   ```

3. **What Gets Stored:**
   - All conversations → `widget_conversations` table
   - All messages → `widget_messages` table
   - Lead information → `leads` table
   - Appointments → `appointments` table

4. **View Conversations:**
   - Go to: `https://marketingby.wetechforu.com/app/chat-conversations`
   - See all chats from your widget

---

## 🧪 STEP 5: Testing Your Widget

### Test on Local WordPress (Before Going Live)

1. **Install on a test WordPress site first**

2. **Visit the website**

3. **Look for the chat bubble** in bottom-right corner

4. **Click to open chat**

5. **Try these commands:**
   - "What are your hours?" (if you added this knowledge)
   - "I want to book an appointment"
   - "I need help"

6. **Check WeTechForU Dashboard:**
   - Go to: `https://marketingby.wetechforu.com/app/chat-conversations`
   - Your test chat should appear here!

---

## 📊 How Everything Connects

```
┌─────────────────────────────────────────────────────────┐
│                 CUSTOMER'S WEBSITE                       │
│             (WordPress with plugin installed)            │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 1. Visitor clicks chat button
                 ↓
┌─────────────────────────────────────────────────────────┐
│              CHAT WIDGET (JavaScript)                    │
│         Loads from: yourserver.com/public/               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 2. Sends message with widget_key
                 ↓
┌─────────────────────────────────────────────────────────┐
│            YOUR HEROKU BACKEND SERVER                    │
│    marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com    │
│                                                           │
│  API Endpoint: /api/chat-widget/:widgetKey/message      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ 3. Looks up knowledge
                 │    Creates conversation
                 │    Stores lead info
                 ↓
┌─────────────────────────────────────────────────────────┐
│          PRODUCTION DATABASE (PostgreSQL)                │
│                                                           │
│  Tables:                                                  │
│  - widget_configs  (your widget settings)                │
│  - knowledge_base  (Q&A you added)                       │
│  - widget_conversations (chat sessions)                  │
│  - widget_messages (individual messages)                 │
│  - leads (customer contact info)                         │
│  - appointments (booking requests)                        │
└─────────────────────────────────────────────────────────┘
                 │
                 │ 4. You view all data here
                 ↓
┌─────────────────────────────────────────────────────────┐
│         WETECHFORU ADMIN DASHBOARD                       │
│      https://marketingby.wetechforu.com                  │
│                                                           │
│  - View conversations                                     │
│  - Manage knowledge                                       │
│  - See analytics                                          │
│  - Respond to leads                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Customization

### Change Widget Appearance:

1. **Go to:** `https://marketingby.wetechforu.com/app/chat-widgets`

2. **Click "Edit" button** (gray button with pencil icon)

3. **Customize:**
   - Colors (primary, secondary)
   - Position (bottom-right, bottom-left, etc.)
   - Welcome message
   - Bot name
   - Features (appointments, lead capture, etc.)

4. **Save** → Changes appear instantly on all websites using this widget

---

## 🚨 Troubleshooting

### Widget Not Appearing on Website?

1. **Check Plugin is Activated:**
   - WordPress Admin → Plugins → Look for "WeTechForU Chat Widget"
   - Should show "Active"

2. **Clear Browser Cache:**
   - Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

3. **Check Browser Console:**
   - Right-click → Inspect → Console tab
   - Look for errors related to "WeTechForUWidget"

### Widget Showing But Not Responding?

1. **Check Knowledge Base:**
   - Go to Knowledge management page
   - Make sure you have at least 3-5 knowledge entries

2. **Check Backend Logs:**
   - Run: `heroku logs --tail --app marketingby-wetechforu`
   - Look for errors

### Conversations Not Appearing in Dashboard?

1. **Check Widget Key:**
   - Make sure the plugin has the correct `widget_key`
   - Should be: `wtfw_4525d305fed7021509584adfdd2bcf71`

2. **Test API Endpoint:**
   ```bash
   curl https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/chat-widget/wtfw_4525d305fed7021509584adfdd2bcf71/message
   ```

---

## 📚 Quick Reference

### Your Widget Details:

| Property | Value |
|----------|-------|
| **Widget Name** | wetechforu test |
| **Widget Key** | `wtfw_4525d305fed7021509584adfdd2bcf71` |
| **Status** | Active ✅ |
| **Bot Name** | Assistant |
| **Position** | bottom-right |
| **Appointments** | Enabled ✓ |
| **Lead Capture** | Enabled ✓ |

### Important URLs:

| Purpose | URL |
|---------|-----|
| **Admin Dashboard** | https://marketingby.wetechforu.com |
| **Chat Widgets** | https://marketingby.wetechforu.com/app/chat-widgets |
| **Knowledge Base** | https://marketingby.wetechforu.com/app/chat-widgets/1/knowledge |
| **Conversations** | https://marketingby.wetechforu.com/app/chat-conversations |
| **Analytics** | https://marketingby.wetechforu.com/app/chat-analytics |
| **Backend API** | https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com |

### API Endpoints (if needed):

```
GET  /api/chat-widget/widgets/:id/knowledge          # Get all knowledge
POST /api/chat-widget/widgets/:id/knowledge          # Add knowledge
PUT  /api/chat-widget/widgets/:id/knowledge/:knowledgeId  # Update
DELETE /api/chat-widget/widgets/:id/knowledge/:knowledgeId # Delete
GET  /api/chat-widget/:widgetKey/download-plugin     # Download plugin
```

---

## 🎉 Next Steps

1. **Add 10-15 Knowledge Entries** covering:
   - Business hours
   - Services offered
   - Pricing info
   - Location/contact
   - How to book appointments
   - Common FAQs

2. **Install on Test Website First**
   - Test all functionality
   - Make sure conversations appear in dashboard

3. **Install on Client Websites**
   - Download plugin for each client
   - Each client can have their own widget with custom knowledge

4. **Monitor & Improve**
   - Check conversations regularly
   - Add new knowledge based on common questions
   - Update bot responses as needed

---

## 💡 Pro Tips

### Make Your Bot Smarter:

- **Use Natural Language:** Write answers conversationally
- **Be Specific:** Give clear, detailed responses
- **Add Categories:** Organize knowledge for easy management
- **Test Regularly:** Try different questions to see how bot responds
- **Update Often:** Add new Q&A based on actual customer questions

### Multiple Clients:

- Create a separate widget for each client
- Each gets their own `widget_key`
- Each can have unique knowledge, colors, settings
- All conversations tracked separately in database

---

## 📞 Support

If you need help:
1. Check this guide first
2. Review backend logs: `heroku logs --tail --app marketingby-wetechforu`
3. Test API endpoints with `curl`
4. Check browser console for JavaScript errors

---

**🚀 You're all set! Your AI Chat Widget is ready to use!**

Created: October 23, 2025  
Last Updated: October 23, 2025  
Version: 1.0.0

