# 🤖 Smart Bot Implementation Plan

## ✅ **COMPLETED: Database Migration**

Added to Heroku Production Database:

### `widget_configs` table:
- `intro_flow_enabled` BOOLEAN - Enable/disable intro questions
- `intro_questions` JSONB - Array of questions to ask

**Default Intro Questions:**
1. First Name (text, required)
2. Last Name (text, required)
3. Email (email, required)
4. Phone (tel, optional)
5. Contact Method (select: Email/Phone/Text, required)
6. Services Interested In (textarea, optional)

### `widget_conversations` table:
- `intro_completed` BOOLEAN - Track if visitor finished intro
- `intro_data` JSONB - Store collected information

---

## 🎯 **FEATURES TO IMPLEMENT**

### **1. Smart Question Matching (Backend)**
- Fuzzy search for similar questions
- Suggest: "Did you mean: [similar question]?"
- Show top 3 matches if no exact match

### **2. Intro Flow (Widget)**
- Collect customer info BEFORE answering questions
- One question at a time
- Skip button for optional questions
- Progress indicator

### **3. Configurable Questions (Frontend)**
- Add/Edit/Remove intro questions
- Drag-and-drop reordering
- Set required/optional
- Different input types: text, email, tel, select, textarea

---

## 📋 **IMPLEMENTATION STEPS**

### Step 1: Backend API Updates ✅ (Database Done)
- [x] Add intro_flow_enabled column
- [x] Add intro_questions JSONB column
- [ ] Add API endpoint to get intro questions
- [ ] Add API endpoint to save intro data
- [ ] Improve bot matching with similarity search

### Step 2: Widget JavaScript
- [ ] Detect if intro flow is enabled
- [ ] Show intro questions one by one
- [ ] Save answers progressively
- [ ] Submit all data when complete
- [ ] Show "Thanks! Now I can help you" message

### Step 3: Frontend Editor
- [ ] Add "Intro Questions" section to widget editor
- [ ] Visual question builder (add/remove/edit)
- [ ] Toggle on/off intro flow
- [ ] Preview mode

### Step 4: Smart Matching Algorithm
- [ ] Implement Levenshtein distance or similar
- [ ] Return top 3 similar questions
- [ ] Allow user to select or rephrase

---

## 🎨 **User Experience Flow**

### **When Widget Opens:**
```
Bot: Hi! I'm [Bot Name]. Before I help you, I'd like to know a bit about you.

Question 1 of 6: What is your first name?
[Input field]
[Next →]

Question 2 of 6: What is your last name?
[Input field]
[← Back] [Next →]

...

Bot: Thanks [First Name]! Now, how can I help you today?
```

### **When Question Not Found:**
```
User: How much does it cost?

Bot: I don't have an exact answer for that, but I found similar questions:
1. "What are your pricing options?"
2. "Do you offer payment plans?"
3. "What is the cost of services?"

Which one are you asking about? Or rephrase your question.
```

---

## 🔧 **Technical Details**

### Intro Questions JSON Structure:
```json
[
  {
    "id": "first_name",
    "question": "What is your first name?",
    "type": "text",
    "required": true,
    "order": 1
  },
  {
    "id": "contact_method",
    "question": "How would you like us to contact you?",
    "type": "select",
    "options": ["Email", "Phone Call", "Text Message"],
    "required": true,
    "order": 5
  }
]
```

### Supported Input Types:
- `text` - Single line text
- `email` - Email validation
- `tel` - Phone number
- `textarea` - Multi-line text
- `select` - Dropdown with options
- `checkbox` - Multiple choice
- `radio` - Single choice from multiple

---

## 🚀 **Next Actions**

1. Update backend chatWidget routes for intro questions
2. Create similarity search function
3. Update widget JS with intro flow
4. Add intro questions editor UI
5. Test end-to-end flow

**Status: In Progress** 🔄

