# 🤖 Widget V3 Implementation Guide

## Overview

This guide provides complete implementation details for **wetechforu-widget-v3.js** with smart intro flow and suggestion features.

---

## New Features to Add

### 1. **Intro Flow State Management**

Add to `state` object:
```javascript
state: {
  // Existing...
  isOpen: false,
  conversationId: null,
  
  // NEW: Intro flow state
  introFlow: {
    enabled: false,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
    completed: false,
    isActive: false
  },
  
  // NEW: Suggestions state
  pendingSuggestions: [],
  waitingForSuggestionChoice: false
}
```

### 2. **Fetch Intro Questions on Init**

Update `init()` method:
```javascript
async init(config) {
  // Existing config merge...
  
  // NEW: Fetch widget config including intro questions
  try {
    const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
    const widgetConfig = await response.json();
    
    if (widgetConfig.intro_flow_enabled && widgetConfig.intro_questions) {
      this.state.introFlow.enabled = true;
      this.state.introFlow.questions = JSON.parse(widgetConfig.intro_questions || '[]');
    }
  } catch (error) {
    console.error('Failed to fetch widget config:', error);
  }
  
  // Existing widget creation...
}
```

### 3. **Intro Flow UI**

Add new method `showIntroFlow()`:
```javascript
showIntroFlow() {
  const question = this.state.introFlow.questions[this.state.introFlow.currentQuestionIndex];
  const totalQuestions = this.state.introFlow.questions.length;
  const currentIndex = this.state.introFlow.currentQuestionIndex;
  
  const messagesContainer = document.getElementById('wetechforu-messages');
  
  // Clear messages
  messagesContainer.innerHTML = '';
  
  // Show intro message
  if (currentIndex === 0) {
    this.addBotMessage(`Hi! I'm ${this.config.botName}. Before I help you, I'd like to know a bit about you.`);
  }
  
  // Show current question
  const questionHTML = `
    <div class="wetechforu-intro-question">
      <div class="wetechforu-intro-progress">
        Question ${currentIndex + 1} of ${totalQuestions}
      </div>
      <div class="wetechforu-intro-question-text">
        ${question.question}${question.required ? ' *' : ''}
      </div>
      <div class="wetechforu-intro-input">
        ${this.renderIntroInput(question)}
      </div>
      <div class="wetechforu-intro-buttons">
        ${currentIndex > 0 ? '<button class="wetechforu-intro-back">← Back</button>' : ''}
        ${!question.required ? '<button class="wetechforu-intro-skip">Skip</button>' : ''}
        <button class="wetechforu-intro-next">Next →</button>
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', questionHTML);
  
  // Attach event listeners
  this.attachIntroEventListeners();
}
```

### 4. **Render Input Based on Type**

```javascript
renderIntroInput(question) {
  const value = this.state.introFlow.answers[question.id] || '';
  
  switch (question.type) {
    case 'email':
      return `<input type="email" id="intro-input-${question.id}" value="${value}" 
              placeholder="your@email.com" required="${question.required}">`;
    
    case 'tel':
      return `<input type="tel" id="intro-input-${question.id}" value="${value}" 
              placeholder="(555) 123-4567" required="${question.required}">`;
    
    case 'select':
      const options = question.options || [];
      return `
        <select id="intro-input-${question.id}" required="${question.required}">
          <option value="">-- Select --</option>
          ${options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      `;
    
    case 'textarea':
      return `<textarea id="intro-input-${question.id}" rows="3" 
              placeholder="Tell us more..." required="${question.required}">${value}</textarea>`;
    
    default: // text
      return `<input type="text" id="intro-input-${question.id}" value="${value}" 
              placeholder="Type your answer..." required="${question.required}">`;
  }
}
```

### 5. **Handle Intro Navigation**

```javascript
attachIntroEventListeners() {
  const nextBtn = document.querySelector('.wetechforu-intro-next');
  const backBtn = document.querySelector('.wetechforu-intro-back');
  const skipBtn = document.querySelector('.wetechforu-intro-skip');
  const question = this.state.introFlow.questions[this.state.introFlow.currentQuestionIndex];
  const input = document.getElementById(`intro-input-${question.id}`);
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (question.required && !input.value.trim()) {
        alert('This field is required');
        return;
      }
      
      // Save answer
      this.state.introFlow.answers[question.id] = input.value;
      
      // Move to next question or complete
      if (this.state.introFlow.currentQuestionIndex < this.state.introFlow.questions.length - 1) {
        this.state.introFlow.currentQuestionIndex++;
        this.showIntroFlow();
      } else {
        this.completeIntroFlow();
      }
    });
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      this.state.introFlow.currentQuestionIndex--;
      this.showIntroFlow();
    });
  }
  
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (this.state.introFlow.currentQuestionIndex < this.state.introFlow.questions.length - 1) {
        this.state.introFlow.currentQuestionIndex++;
        this.showIntroFlow();
      } else {
        this.completeIntroFlow();
      }
    });
  }
}
```

### 6. **Complete Intro Flow**

```javascript
async completeIntroFlow() {
  try {
    // Send intro data to backend
    const response = await fetch(
      `${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/intro-data`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: this.state.conversationId,
          intro_data: this.state.introFlow.answers
        })
      }
    );
    
    if (response.ok) {
      this.state.introFlow.completed = true;
      this.state.introFlow.isActive = false;
      
      // Clear messages and show thank you
      const messagesContainer = document.getElementById('wetechforu-messages');
      messagesContainer.innerHTML = '';
      
      const firstName = this.state.introFlow.answers.first_name || 'there';
      this.addBotMessage(`Thanks ${firstName}! Now, how can I help you today?`);
      
      // Show normal chat input
      document.getElementById('wetechforu-input-container').style.display = 'flex';
    }
  } catch (error) {
    console.error('Failed to save intro data:', error);
    alert('Failed to save your information. Please try again.');
  }
}
```

### 7. **Smart Suggestions Display**

Update `handleMessage()` method:
```javascript
async handleMessage(message) {
  // Existing: Add user message, send to backend...
  
  const data = await response.json();
  
  this.hideTyping();
  this.addBotMessage(data.response);
  
  // NEW: Show suggestions if available
  if (data.suggestions && data.suggestions.length > 0) {
    this.showSuggestions(data.suggestions);
  }
}
```

### 8. **Show Suggestion Buttons**

```javascript
showSuggestions(suggestions) {
  const messagesContainer = document.getElementById('wetechforu-messages');
  
  const suggestionsHTML = `
    <div class="wetechforu-suggestions">
      <div class="wetechforu-suggestions-header">
        💡 Did you mean:
      </div>
      <div class="wetechforu-suggestions-list">
        ${suggestions.map(s => `
          <button class="wetechforu-suggestion-btn" data-question-id="${s.id}">
            ${s.question}
            <span class="wetechforu-suggestion-match">${s.similarity}% match</span>
          </button>
        `).join('')}
      </div>
      <div class="wetechforu-suggestions-footer">
        Or rephrase your question
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', suggestionsHTML);
  this.scrollToBottom();
  
  // Attach click handlers
  document.querySelectorAll('.wetechforu-suggestion-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const questionId = btn.getAttribute('data-question-id');
      const questionText = btn.textContent.split('\n')[0].trim();
      
      // Send the suggested question
      this.addUserMessage(questionText);
      this.sendMessageToBackend(questionText);
      
      // Remove suggestions
      document.querySelector('.wetechforu-suggestions').remove();
    });
  });
}
```

### 9. **Update CSS for New Elements**

Add to styles:
```javascript
// Intro flow styles
.wetechforu-intro-question {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 10px;
}

.wetechforu-intro-progress {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
  font-weight: 600;
}

.wetechforu-intro-question-text {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #333;
}

.wetechforu-intro-input input,
.wetechforu-intro-input textarea,
.wetechforu-intro-input select {
  width: 100%;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  margin-bottom: 10px;
}

.wetechforu-intro-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.wetechforu-intro-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.wetechforu-intro-next {
  background: ${this.config.primaryColor};
  color: white;
}

.wetechforu-intro-back,
.wetechforu-intro-skip {
  background: #e0e0e0;
  color: #333;
}

// Suggestions styles
.wetechforu-suggestions {
  padding: 15px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 10px;
}

.wetechforu-suggestions-header {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #856404;
}

.wetechforu-suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.wetechforu-suggestion-btn {
  padding: 10px;
  background: white;
  border: 2px solid #ffc107;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.wetechforu-suggestion-btn:hover {
  background: #fff8e1;
  border-color: #ff9800;
}

.wetechforu-suggestion-match {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #4caf50;
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.wetechforu-suggestions-footer {
  font-size: 12px;
  color: #666;
  text-align: center;
  font-style: italic;
}
```

### 10. **Update `openChat()` to Check Intro Flow**

```javascript
async openChat() {
  this.state.isOpen = true;
  document.getElementById('wetechforu-widget').style.display = 'flex';
  
  // Start conversation if not exists
  if (!this.state.conversationId) {
    await this.startConversation();
  }
  
  // NEW: Check if intro flow should be shown
  if (this.state.introFlow.enabled && !this.state.introFlow.completed) {
    this.state.introFlow.isActive = true;
    document.getElementById('wetechforu-input-container').style.display = 'none'; // Hide input
    this.showIntroFlow();
  }
}
```

---

## Complete Implementation Checklist

- [ ] Add intro flow state to `state` object
- [ ] Fetch widget config in `init()` with intro questions
- [ ] Create `showIntroFlow()` method
- [ ] Create `renderIntroInput()` method
- [ ] Create `attachIntroEventListeners()` method
- [ ] Create `completeIntroFlow()` method
- [ ] Update `handleMessage()` to show suggestions
- [ ] Create `showSuggestions()` method
- [ ] Add CSS for intro flow elements
- [ ] Add CSS for suggestion buttons
- [ ] Update `openChat()` to trigger intro flow
- [ ] Test intro flow progression
- [ ] Test suggestion clicking
- [ ] Test validation (required fields)
- [ ] Test back/skip buttons
- [ ] Test API integration

---

## Testing Scenarios

### Intro Flow:
1. Open widget → Should show "Question 1 of 6"
2. Leave required field empty, click Next → Should show alert
3. Click Back → Should go to previous question
4. Click Skip on optional field → Should advance
5. Complete all questions → Should show "Thanks [Name]!"
6. Should save data to database via API

### Smart Suggestions:
1. Ask vague question → Should show 3 suggestions
2. Click suggestion → Should send that question
3. Each suggestion shows % match
4. Suggestions are clickable buttons
5. Can still type custom question

---

## File Location

`/backend/public/wetechforu-widget-v3.js`

**Estimated Size:** ~1,100 lines
**Current v2 Size:** 678 lines
**New Code:** ~400 lines

---

## Deployment

1. Create `wetechforu-widget-v3.js`
2. Update WordPress plugin download to use v3
3. Test on staging/test page
4. Deploy to production
5. Update existing widgets to use v3

---

**Status:** Ready to implement
**Priority:** HIGH
**Dependencies:** Backend APIs ✅ (Already deployed v315)

