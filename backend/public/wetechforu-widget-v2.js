/**
 * WeTechForU AI Chat Widget - Enhanced Version 2.0
 * 
 * Features:
 * - Auto-popup on page load
 * - Friendly intro flow
 * - Compatible with all platforms (WordPress, React, Vue, Angular, etc.)
 * - Responsive design
 * - Smart question flow
 * - Version compatibility checker
 */

(function() {
  'use strict';

  const WeTechForUWidget = {
    config: {
      widgetKey: null,
      backendUrl: null,
      position: 'bottom-right',
      primaryColor: '#4682B4',
      secondaryColor: '#2E86AB',
      botName: 'Assistant',
      welcomeMessage: 'Hi! How can I help you today?',
      autoPopup: true,
      autoPopupDelay: 3000, // 3 seconds
      enableIntroFlow: true,
      compatibilityCheck: true
    },

    state: {
      isOpen: false,
      conversationId: null,
      hasShownIntro: false,
      isTyping: false,
      messages: [],
      compatibility: {
        supported: true,
        version: null,
        platform: null
      }
    },

    // Initialize widget
    init(options) {
      if (!options.widgetKey || !options.backendUrl) {
        console.error('WeTechForU Widget: widgetKey and backendUrl are required');
        return;
      }

      this.config = { ...this.config, ...options };
      this.detectCompatibility();
      this.createWidgetHTML();
      this.attachEventListeners();
      
      if (this.config.autoPopup) {
        setTimeout(() => {
          this.openChat();
          if (this.config.enableIntroFlow) {
            this.startIntroFlow();
          }
        }, this.config.autoPopupDelay);
      }
    },

    // Detect platform and version compatibility
    detectCompatibility() {
      const userAgent = navigator.userAgent;
      const platform = {
        isWordPress: document.body.classList.contains('wordpress') || 
                     document.body.classList.contains('wp-site') ||
                     !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
        isReact: !!document.querySelector('[data-reactroot]') || 
                 !!document.querySelector('#root'),
        isVue: !!window.Vue || !!document.querySelector('[data-v-'),
        isAngular: !!window.ng || !!document.querySelector('[ng-version]'),
        isJQuery: !!window.jQuery,
        browserVersion: this.getBrowserVersion(userAgent)
      };

      // WordPress version detection
      if (platform.isWordPress) {
        const wpMeta = document.querySelector('meta[name="generator"][content*="WordPress"]');
        if (wpMeta) {
          const match = wpMeta.content.match(/WordPress\s+([\d.]+)/);
          platform.wpVersion = match ? match[1] : 'Unknown';
        }
      }

      this.state.compatibility = {
        supported: true, // Widget supports all versions!
        platform: this.detectPlatformName(platform),
        version: platform.wpVersion || platform.browserVersion,
        details: platform
      };

      console.log('🤖 WeTechForU Widget initialized:', this.state.compatibility);
    },

    detectPlatformName(platform) {
      if (platform.isWordPress) return 'WordPress';
      if (platform.isReact) return 'React';
      if (platform.isVue) return 'Vue.js';
      if (platform.isAngular) return 'Angular';
      return 'Standard Web';
    },

    getBrowserVersion(userAgent) {
      const match = userAgent.match(/(chrome|safari|firefox|edge|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
      return match[2] || 'Unknown';
    },

    // Create widget HTML with modern design
    createWidgetHTML() {
      const widgetHTML = `
        <div id="wetechforu-widget" style="
          position: fixed;
          ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
        ">
          <!-- Chat Button -->
          <button id="wetechforu-chat-button" style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            animation: pulse 2s infinite;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </button>

          <!-- Badge for notifications -->
          <div id="wetechforu-badge" style="
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">1</div>

          <!-- Chat Window -->
          <div id="wetechforu-chat-window" style="
            position: absolute;
            ${this.config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
            bottom: 80px;
            width: 380px;
            max-width: calc(100vw - 40px);
            height: 600px;
            max-height: calc(100vh - 120px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
          ">
            <!-- Header -->
            <div style="
              background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
              color: white;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            ">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                  width: 40px;
                  height: 40px;
                  border-radius: 50%;
                  background: rgba(255,255,255,0.2);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 20px;
                ">🤖</div>
                <div>
                  <div style="font-weight: 600; font-size: 16px;">${this.config.botName}</div>
                  <div style="font-size: 12px; opacity: 0.9;" id="wetechforu-status">Online</div>
                </div>
              </div>
              <button id="wetechforu-close-button" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
              ">✕</button>
            </div>

            <!-- Compatibility Banner (if needed) -->
            <div id="wetechforu-compat-banner" style="display: none;"></div>

            <!-- Messages Container -->
            <div id="wetechforu-messages" style="
              flex: 1;
              overflow-y: auto;
              padding: 20px;
              background: #f8f9fa;
            ">
              <!-- Messages will be inserted here -->
            </div>

            <!-- Quick Actions (shown during intro) -->
            <div id="wetechforu-quick-actions" style="
              padding: 12px 20px;
              background: white;
              border-top: 1px solid #e0e0e0;
              display: none;
              gap: 8px;
              flex-wrap: wrap;
            "></div>

            <!-- Input Area -->
            <div style="
              padding: 16px 20px;
              background: white;
              border-top: 1px solid #e0e0e0;
              display: flex;
              gap: 12px;
              align-items: center;
            ">
              <input 
                type="text" 
                id="wetechforu-input" 
                placeholder="Type your message..."
                style="
                  flex: 1;
                  padding: 12px 16px;
                  border: 2px solid #e0e0e0;
                  border-radius: 24px;
                  font-size: 14px;
                  outline: none;
                  transition: border-color 0.2s;
                "
              />
              <button id="wetechforu-send-button" style="
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
                transition: transform 0.2s, background 0.2s;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>

            <!-- Powered by WeTechForU -->
            <div style="
              padding: 8px;
              text-align: center;
              font-size: 11px;
              color: #999;
              background: #f8f9fa;
            ">
              Powered by <strong style="color: ${this.config.primaryColor};">WeTechForU</strong>
            </div>
          </div>
        </div>

        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          @keyframes slideUp {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }

          @keyframes typing {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }

          #wetechforu-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          }

          #wetechforu-input:focus {
            border-color: ${this.config.primaryColor};
          }

          #wetechforu-send-button:hover {
            transform: scale(1.1);
            background: ${this.config.secondaryColor};
          }

          #wetechforu-close-button:hover {
            background: rgba(255,255,255,0.3);
          }

          /* Mobile responsive */
          @media (max-width: 480px) {
            #wetechforu-chat-window {
              width: calc(100vw - 20px) !important;
              height: calc(100vh - 100px) !important;
              bottom: 10px !important;
            }
          }

          /* Message styles */
          .wetechforu-message {
            margin-bottom: 16px;
            display: flex;
            gap: 8px;
            animation: slideUp 0.3s ease-out;
          }

          .wetechforu-message-bot {
            flex-direction: row;
          }

          .wetechforu-message-user {
            flex-direction: row-reverse;
          }

          .wetechforu-message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
          }

          .wetechforu-message-bot .wetechforu-message-avatar {
            background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
            color: white;
          }

          .wetechforu-message-user .wetechforu-message-avatar {
            background: #e0e0e0;
          }

          .wetechforu-message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
          }

          .wetechforu-message-bot .wetechforu-message-content {
            background: white;
            color: #333;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          }

          .wetechforu-message-user .wetechforu-message-content {
            background: ${this.config.primaryColor};
            color: white;
          }

          .wetechforu-typing {
            display: flex;
            gap: 4px;
            padding: 12px;
          }

          .wetechforu-typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #999;
            animation: typing 1.4s infinite;
          }

          .wetechforu-typing-dot:nth-child(2) {
            animation-delay: 0.2s;
          }

          .wetechforu-typing-dot:nth-child(3) {
            animation-delay: 0.4s;
          }

          .wetechforu-quick-action {
            padding: 10px 16px;
            background: white;
            border: 2px solid ${this.config.primaryColor};
            color: ${this.config.primaryColor};
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .wetechforu-quick-action:hover {
            background: ${this.config.primaryColor};
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
        </style>
      `;

      document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },

    // Attach event listeners
    attachEventListeners() {
      const chatButton = document.getElementById('wetechforu-chat-button');
      const closeButton = document.getElementById('wetechforu-close-button');
      const sendButton = document.getElementById('wetechforu-send-button');
      const input = document.getElementById('wetechforu-input');

      chatButton.addEventListener('click', () => this.toggleChat());
      closeButton.addEventListener('click', () => this.closeChat());
      sendButton.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    },

    // Toggle chat window
    toggleChat() {
      this.state.isOpen ? this.closeChat() : this.openChat();
    },

    // Open chat
    openChat() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      const badge = document.getElementById('wetechforu-badge');
      chatWindow.style.display = 'flex';
      badge.style.display = 'none';
      this.state.isOpen = true;

      // Focus input
      setTimeout(() => {
        document.getElementById('wetechforu-input').focus();
      }, 300);
    },

    // Close chat
    closeChat() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      chatWindow.style.display = 'none';
      this.state.isOpen = false;
    },

    // Start intro flow
    startIntroFlow() {
      if (this.state.hasShownIntro) return;
      this.state.hasShownIntro = true;

      const introMessages = [
        {
          text: `👋 Welcome! I'm ${this.config.botName}, your virtual assistant.`,
          delay: 500
        },
        {
          text: "I'm here to help you with any questions you might have!",
          delay: 1500
        },
        {
          text: "What can I help you with today?",
          delay: 2500,
          showQuickActions: true
        }
      ];

      introMessages.forEach((msg, index) => {
        setTimeout(() => {
          this.addBotMessage(msg.text);
          if (msg.showQuickActions) {
            this.showQuickActions();
          }
        }, msg.delay);
      });
    },

    // Show quick action buttons
    showQuickActions() {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'flex';

      const actions = [
        "📞 Contact Information",
        "🕐 Business Hours",
        "💼 Our Services",
        "📅 Book Appointment"
      ];

      quickActions.innerHTML = actions.map(action => 
        `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleQuickAction('${action}')">${action}</button>`
      ).join('');
    },

    // Handle quick action click
    handleQuickAction(action) {
      this.addUserMessage(action);
      document.getElementById('wetechforu-quick-actions').style.display = 'none';
      this.sendMessageToBackend(action);
    },

    // Add bot message
    addBotMessage(text) {
      const messagesContainer = document.getElementById('wetechforu-messages');
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-bot">
          <div class="wetechforu-message-avatar">🤖</div>
          <div class="wetechforu-message-content">${this.escapeHTML(text)}</div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      this.scrollToBottom();
    },

    // Add user message
    addUserMessage(text) {
      const messagesContainer = document.getElementById('wetechforu-messages');
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-user">
          <div class="wetechforu-message-avatar">👤</div>
          <div class="wetechforu-message-content">${this.escapeHTML(text)}</div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      this.scrollToBottom();
    },

    // Show typing indicator
    showTyping() {
      const messagesContainer = document.getElementById('wetechforu-messages');
      const typingHTML = `
        <div class="wetechforu-message wetechforu-message-bot" id="wetechforu-typing-indicator">
          <div class="wetechforu-message-avatar">🤖</div>
          <div class="wetechforu-message-content wetechforu-typing">
            <div class="wetechforu-typing-dot"></div>
            <div class="wetechforu-typing-dot"></div>
            <div class="wetechforu-typing-dot"></div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
      this.scrollToBottom();
    },

    // Hide typing indicator
    hideTyping() {
      const typingIndicator = document.getElementById('wetechforu-typing-indicator');
      if (typingIndicator) typingIndicator.remove();
    },

    // Send message
    sendMessage() {
      const input = document.getElementById('wetechforu-input');
      const message = input.value.trim();
      
      if (!message) return;

      this.addUserMessage(message);
      input.value = '';
      
      this.sendMessageToBackend(message);
    },

    // Send message to backend
    async sendMessageToBackend(message) {
      this.showTyping();

      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/${this.config.widgetKey}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            conversationId: this.state.conversationId
          })
        });

        const data = await response.json();
        
        this.hideTyping();
        
        if (data.response) {
          this.addBotMessage(data.response);
        }

        if (data.conversationId) {
          this.state.conversationId = data.conversationId;
        }
      } catch (error) {
        this.hideTyping();
        this.addBotMessage("I'm sorry, I'm having trouble connecting. Please try again later.");
        console.error('Widget error:', error);
      }
    },

    // Scroll to bottom
    scrollToBottom() {
      const messagesContainer = document.getElementById('wetechforu-messages');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    // Escape HTML
    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Expose to global scope
  window.WeTechForUWidget = WeTechForUWidget;
})();

