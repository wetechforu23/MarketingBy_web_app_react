/**
 * WeTechForU AI Chat Widget
 * Version: 1.0.0
 * 
 * Embeddable chat widget for customer websites
 * Features: AI-powered responses, lead capture, appointment booking
 * 
 * Usage:
 * <script src="https://your-domain.com/wetechforu-widget.js"></script>
 * <script>
 *   WeTechForUWidget.init({
 *     widgetKey: 'your_widget_key_here',
 *     apiUrl: 'https://your-api-domain.com/api/chat-widget'
 *   });
 * </script>
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.WeTechForUWidget) {
    return;
  }

  const WeTechForUWidget = {
    config: {
      widgetKey: null,
      apiUrl: null,
      position: 'bottom-right',
      primaryColor: '#4682B4',
      secondaryColor: '#2E86AB'
    },
    state: {
      isOpen: false,
      isMinimized: false,
      conversationId: null,
      sessionId: null,
      messages: [],
      isLoading: false
    },
    elements: {},

    /**
     * Initialize the widget
     */
    init: function(options) {
      if (!options.widgetKey || !options.apiUrl) {
        console.error('WeTechForU Widget: widgetKey and apiUrl are required');
        return;
      }

      this.config = { ...this.config, ...options };
      this.state.sessionId = this.getOrCreateSessionId();
      
      this.loadWidgetConfig().then(() => {
        this.injectStyles();
        this.createWidget();
        this.attachEventListeners();
        console.log('WeTechForU Widget initialized');
      }).catch(error => {
        console.error('WeTechForU Widget: Failed to initialize', error);
      });
    },

    /**
     * Load widget configuration from API
     */
    loadWidgetConfig: async function() {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/public/widget/${this.config.widgetKey}/config`
        );
        
        if (!response.ok) {
          throw new Error('Failed to load widget config');
        }

        const config = await response.json();
        
        // Merge API config with local config
        this.config = {
          ...this.config,
          primaryColor: config.primary_color || this.config.primaryColor,
          secondaryColor: config.secondary_color || this.config.secondaryColor,
          position: config.position || this.config.position,
          welcomeMessage: config.welcome_message,
          botName: config.bot_name,
          botAvatar: config.bot_avatar_url,
          enableAppointmentBooking: config.enable_appointment_booking,
          enableEmailCapture: config.enable_email_capture,
          enablePhoneCapture: config.enable_phone_capture,
          enableAiHandoff: config.enable_ai_handoff,
          aiHandoffUrl: config.ai_handoff_url
        };
      } catch (error) {
        throw error;
      }
    },

    /**
     * Inject widget CSS styles
     */
    injectStyles: function() {
      if (document.getElementById('wt for u-widget-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'wetechforu-widget-styles';
      style.textContent = `
        .wetechforu-widget-container {
          position: fixed;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .wetechforu-widget-container.bottom-right { bottom: 20px; right: 20px; }
        .wetechforu-widget-container.bottom-left { bottom: 20px; left: 20px; }
        .wetechforu-widget-container.top-right { top: 20px; right: 20px; }
        .wetechforu-widget-container.top-left { top: 20px; left: 20px; }
        
        .wetechforu-chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .wetechforu-chat-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }
        .wetechforu-chat-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }
        
        .wetechforu-chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          height: 600px;
          max-height: 80vh;
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .wetechforu-chat-window.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }
        
        .wetechforu-chat-header {
          background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
          color: white;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wetechforu-chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .wetechforu-bot-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .wetechforu-bot-name {
          font-size: 16px;
          font-weight: 600;
        }
        .wetechforu-close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 24px;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .wetechforu-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #f8f9fa;
        }
        .wetechforu-message {
          margin-bottom: 16px;
          display: flex;
          gap: 10px;
        }
        .wetechforu-message.bot {
          justify-content: flex-start;
        }
        .wetechforu-message.user {
          justify-content: flex-end;
        }
        .wetechforu-message-content {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
        }
        .wetechforu-message.bot .wetechforu-message-content {
          background: white;
          color: #333;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .wetechforu-message.user .wetechforu-message-content {
          background: ${this.config.primaryColor};
          color: white;
        }
        
        .wetechforu-chat-input-container {
          padding: 16px;
          background: white;
          border-top: 1px solid #e0e0e0;
        }
        .wetechforu-chat-input-wrapper {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .wetechforu-chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s ease;
        }
        .wetechforu-chat-input:focus {
          border-color: ${this.config.primaryColor};
        }
        .wetechforu-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${this.config.primaryColor};
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .wetechforu-send-btn:hover {
          transform: scale(1.1);
        }
        .wetechforu-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wetechforu-typing-indicator {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
        }
        .wetechforu-typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #999;
          animation: wetechforu-typing 1.4s infinite;
        }
        .wetechforu-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .wetechforu-typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes wetechforu-typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        
        .wetechforu-lead-capture-form {
          padding: 20px;
          background: #f8f9fa;
        }
        .wetechforu-form-group {
          margin-bottom: 16px;
        }
        .wetechforu-form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        .wetechforu-form-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }
        .wetechforu-form-input:focus {
          border-color: ${this.config.primaryColor};
        }
        .wetechforu-form-btn {
          width: 100%;
          padding: 12px;
          background: ${this.config.primaryColor};
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .wetechforu-form-btn:hover {
          background: ${this.config.secondaryColor};
        }
        
        @media (max-width: 480px) {
          .wetechforu-chat-window {
            width: 100vw;
            height: 100vh;
            max-height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
        }
      `;
      document.head.appendChild(style);
    },

    /**
     * Create widget DOM elements
     */
    createWidget: function() {
      const container = document.createElement('div');
      container.className = `wetechforu-widget-container ${this.config.position}`;
      container.id = 'wetechforu-widget';

      container.innerHTML = `
        <button class="wetechforu-chat-button" id="wetechforu-chat-toggle">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </button>
        
        <div class="wetechforu-chat-window" id="wetechforu-chat-window">
          <div class="wetechforu-chat-header">
            <div class="wetechforu-chat-header-info">
              <div class="wetechforu-bot-avatar">
                ${this.config.botAvatar ? `<img src="${this.config.botAvatar}" style="width:100%;height:100%;border-radius:50%;" />` : '🤖'}
              </div>
              <div>
                <div class="wetechforu-bot-name">${this.config.botName || 'Assistant'}</div>
                <div style="font-size:12px;opacity:0.9;">Online</div>
              </div>
            </div>
            <button class="wetechforu-close-btn" id="wetechforu-close">×</button>
          </div>
          
          <div class="wetechforu-chat-messages" id="wetechforu-messages"></div>
          
          <div class="wetechforu-chat-input-container">
            <div class="wetechforu-chat-input-wrapper">
              <input 
                type="text" 
                class="wetechforu-chat-input" 
                id="wetechforu-input"
                placeholder="Type your message..."
              />
              <button class="wetechforu-send-btn" id="wetechforu-send">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Store element references
      this.elements = {
        container,
        toggle: container.querySelector('#wetechforu-chat-toggle'),
        window: container.querySelector('#wetechforu-chat-window'),
        close: container.querySelector('#wetechforu-close'),
        messages: container.querySelector('#wetechforu-messages'),
        input: container.querySelector('#wetechforu-input'),
        send: container.querySelector('#wetechforu-send')
      };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners: function() {
      this.elements.toggle.addEventListener('click', () => this.toggleChat());
      this.elements.close.addEventListener('click', () => this.toggleChat());
      this.elements.send.addEventListener('click', () => this.sendMessage());
      this.elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    },

    /**
     * Toggle chat window open/close
     */
    toggleChat: function() {
      this.state.isOpen = !this.state.isOpen;
      this.elements.window.classList.toggle('open', this.state.isOpen);
      
      if (this.state.isOpen && this.state.messages.length === 0) {
        // Start conversation and show welcome message
        this.startConversation();
      }
      
      if (this.state.isOpen) {
        this.elements.input.focus();
      }
    },

    /**
     * Start a new conversation
     */
    startConversation: async function() {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/public/widget/${this.config.widgetKey}/conversation`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: this.state.sessionId,
              page_url: window.location.href,
              referrer_url: document.referrer,
              user_agent: navigator.userAgent
            })
          }
        );

        const data = await response.json();
        this.state.conversationId = data.conversation_id;

        // Show welcome message
        if (!data.existing) {
          this.addMessage('bot', this.config.welcomeMessage || 'Hi! How can I help you today?');
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
        this.addMessage('bot', 'Sorry, I\'m having trouble connecting. Please try again.');
      }
    },

    /**
     * Send a message
     */
    sendMessage: async function() {
      const message = this.elements.input.value.trim();
      if (!message || this.state.isLoading) {
        return;
      }

      // Add user message
      this.addMessage('user', message);
      this.elements.input.value = '';

      // Show typing indicator
      this.state.isLoading = true;
      this.showTypingIndicator();

      try {
        const response = await fetch(
          `${this.config.apiUrl}/public/widget/${this.config.widgetKey}/message`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: this.state.conversationId,
              message_text: message
            })
          }
        );

        const data = await response.json();

        // Remove typing indicator
        this.hideTypingIndicator();

        // Add bot response
        this.addMessage('bot', data.response);

        // Check if we should show lead capture form
        if (data.confidence < 0.5 && this.config.enableEmailCapture) {
          setTimeout(() => this.showLeadCaptureForm(), 2000);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        this.hideTypingIndicator();
        this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
      } finally {
        this.state.isLoading = false;
      }
    },

    /**
     * Add a message to the chat
     */
    addMessage: function(type, text) {
      const messageEl = document.createElement('div');
      messageEl.className = `wetechforu-message ${type}`;
      messageEl.innerHTML = `
        <div class="wetechforu-message-content">${this.escapeHtml(text)}</div>
      `;
      this.elements.messages.appendChild(messageEl);
      this.scrollToBottom();
      this.state.messages.push({ type, text });
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator: function() {
      const indicator = document.createElement('div');
      indicator.id = 'wetechforu-typing';
      indicator.className = 'wetechforu-message bot';
      indicator.innerHTML = `
        <div class="wetechforu-message-content wetechforu-typing-indicator">
          <div class="wetechforu-typing-dot"></div>
          <div class="wetechforu-typing-dot"></div>
          <div class="wetechforu-typing-dot"></div>
        </div>
      `;
      this.elements.messages.appendChild(indicator);
      this.scrollToBottom();
    },

    /**
     * Hide typing indicator
     */
    hideTypingIndicator: function() {
      const indicator = document.getElementById('wetechforu-typing');
      if (indicator) {
        indicator.remove();
      }
    },

    /**
     * Show lead capture form
     */
    showLeadCaptureForm: function() {
      const formHtml = `
        <div class="wetechforu-message bot">
          <div class="wetechforu-message-content">
            I'd love to connect you with our team! How would you prefer to be contacted?
          </div>
        </div>
        <div class="wetechforu-lead-capture-form">
          <div class="wetechforu-form-group">
            <label class="wetechforu-form-label">Your Name</label>
            <input type="text" class="wetechforu-form-input" id="wetechforu-name" required />
          </div>
          ${this.config.enableEmailCapture ? `
            <div class="wetechforu-form-group">
              <label class="wetechforu-form-label">Email Address</label>
              <input type="email" class="wetechforu-form-input" id="wetechforu-email" required />
            </div>
          ` : ''}
          ${this.config.enablePhoneCapture ? `
            <div class="wetechforu-form-group">
              <label class="wetechforu-form-label">Phone Number</label>
              <input type="tel" class="wetechforu-form-input" id="wetechforu-phone" />
            </div>
          ` : ''}
          <div class="wetechforu-form-group">
            <label class="wetechforu-form-label">Preferred Contact Method</label>
            <select class="wetechforu-form-input" id="wetechforu-contact-method">
              ${this.config.enableEmailCapture ? '<option value="email">Email</option>' : ''}
              ${this.config.enablePhoneCapture ? '<option value="phone">Phone Call</option>' : ''}
              ${this.config.enablePhoneCapture ? '<option value="text">Text Message</option>' : ''}
              ${this.config.enableAiHandoff ? '<option value="ai_agent">AI Agent</option>' : ''}
            </select>
          </div>
          <button class="wetechforu-form-btn" id="wetechforu-submit-lead">Submit</button>
        </div>
      `;
      
      this.elements.messages.insertAdjacentHTML('beforeend', formHtml);
      this.scrollToBottom();

      document.getElementById('wetechforu-submit-lead').addEventListener('click', () => {
        this.submitLeadCapture();
      });
    },

    /**
     * Submit lead capture form
     */
    submitLeadCapture: async function() {
      const name = document.getElementById('wetechforu-name')?.value;
      const email = document.getElementById('wetechforu-email')?.value;
      const phone = document.getElementById('wetechforu-phone')?.value;
      const method = document.getElementById('wetechforu-contact-method')?.value;

      if (!name || !email) {
        alert('Please fill in all required fields');
        return;
      }

      try {
        const response = await fetch(
          `${this.config.apiUrl}/public/widget/${this.config.widgetKey}/capture-lead`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: this.state.conversationId,
              visitor_name: name,
              visitor_email: email,
              visitor_phone: phone,
              handoff_type: method,
              handoff_details: { timestamp: new Date().toISOString() }
            })
          }
        );

        const data = await response.json();

        if (data.success) {
          this.addMessage('bot', data.message);
          // Remove the form
          const form = this.elements.messages.querySelector('.wetechforu-lead-capture-form');
          if (form) {
            form.remove();
          }
        }
      } catch (error) {
        console.error('Failed to capture lead:', error);
        this.addMessage('bot', 'Sorry, there was an error submitting your information. Please try again.');
      }
    },

    /**
     * Scroll chat to bottom
     */
    scrollToBottom: function() {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    },

    /**
     * Get or create session ID
     */
    getOrCreateSessionId: function() {
      let sessionId = localStorage.getItem('wetechforu_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('wetechforu_session_id', sessionId);
      }
      return sessionId;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Expose to global scope
  window.WeTechForUWidget = WeTechForUWidget;

})();

