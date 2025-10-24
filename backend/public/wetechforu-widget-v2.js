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
      autoPopupDelay: 1000, // 1 second (faster response!)
      enableIntroFlow: true,
      compatibilityCheck: true,
      rateLimit: {
        maxMessages: 10,
        timeWindow: 60000 // 10 messages per minute
      }
    },

    state: {
      isOpen: false,
      conversationId: null,
      hasShownIntro: false,
      isTyping: false,
      messages: [],
      messageHistory: [], // For rate limiting
      lastMessageTime: null,
      compatibility: {
        supported: true,
        version: null,
        platform: null
      },
      // Intro flow state
      introFlow: {
        enabled: false,
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        isActive: false,
        isComplete: false
      }
    },

    // Initialize widget
    async init(options) {
      if (!options.widgetKey || !options.backendUrl) {
        console.error('WeTechForU Widget: widgetKey and backendUrl are required');
        return;
      }

      this.config = { ...this.config, ...options };
      
      // Load widget configuration from database
      await this.loadWidgetConfig();
      
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

    // Load widget configuration from database
    async loadWidgetConfig() {
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
        
        if (!response.ok) {
          console.warn('Failed to load widget config, using defaults');
          return;
        }

        const config = await response.json();
        
        // Update config with database values
        if (config.bot_name) this.config.botName = config.bot_name;
        if (config.welcome_message) this.config.welcomeMessage = config.welcome_message;
        if (config.bot_avatar_url) this.config.botAvatarUrl = config.bot_avatar_url;
        if (config.primary_color) this.config.primaryColor = config.primary_color;
        if (config.secondary_color) this.config.secondaryColor = config.secondary_color;
        if (config.position) this.config.position = config.position;
        
        // Store intro flow settings
        if (config.intro_flow_enabled !== undefined) {
          this.config.enableIntroFlow = config.intro_flow_enabled;
        }
        
        console.log('✅ Widget config loaded from database:', config);
      } catch (error) {
        console.error('Failed to load widget config:', error);
        // Continue with default config
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
            width: 360px;
            max-width: calc(100vw - 20px);
            height: 500px;
            max-height: calc(100vh - 100px);
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
                  overflow: hidden;
                ">
                  ${this.config.botAvatarUrl 
                    ? `<img src="${this.config.botAvatarUrl}" alt="Bot Avatar" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='🤖';" />` 
                    : '🤖'}
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 16px;">${this.config.botName}</div>
                  <div style="font-size: 12px; opacity: 0.9;" id="wetechforu-status">Online</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="wetechforu-minimize-button" style="
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
                  font-size: 18px;
                  font-weight: bold;
                " title="Minimize">−</button>
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
                " title="Close">✕</button>
              </div>
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
              padding: 8px 12px;
              background: white;
              border-top: 1px solid #e0e0e0;
              display: none;
              gap: 6px;
              flex-wrap: wrap;
              font-size: 11px;
            "></div>
            
            <!-- Resize Handle -->
            <div class="wetechforu-resize-handle" id="wetechforu-resize-handle" title="Drag to resize"></div>

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

          #wetechforu-close-button:hover,
          #wetechforu-minimize-button:hover {
            background: rgba(255,255,255,0.3);
          }

          /* Mobile responsive */
          @media (max-width: 480px) {
            #wetechforu-chat-window {
              width: calc(100vw - 16px) !important;
              height: calc(100vh - 90px) !important;
              max-height: calc(100vh - 90px) !important;
              bottom: 10px !important;
              left: 8px !important;
              right: 8px !important;
              border-radius: 12px !important;
            }
            #wetechforu-chat-window > div:first-child {
              padding: 14px !important;
            }
            #wetechforu-chat-button {
              width: 50px !important;
              height: 50px !important;
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
            padding: 6px 12px;
            background: white;
            border: 1.5px solid ${this.config.primaryColor};
            color: ${this.config.primaryColor};
            border-radius: 16px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
          }

          .wetechforu-quick-action:hover {
            background: ${this.config.primaryColor};
            color: white;
            transform: scale(1.05);
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          }
          
          /* Draggable widget cursor */
          #wetechforu-chat-window.dragging {
            cursor: move !important;
            user-select: none;
          }
          
          /* Resize handle */
          .wetechforu-resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 20px;
            height: 20px;
            cursor: nwse-resize;
            background: linear-gradient(135deg, transparent 50%, ${this.config.primaryColor} 50%);
            border-bottom-right-radius: 16px;
            opacity: 0.5;
            transition: opacity 0.2s;
          }
          
          .wetechforu-resize-handle:hover {
            opacity: 1;
          }
        </style>
      `;

      document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },

    // Attach event listeners
    attachEventListeners() {
      const chatButton = document.getElementById('wetechforu-chat-button');
      const closeButton = document.getElementById('wetechforu-close-button');
      const minimizeButton = document.getElementById('wetechforu-minimize-button');
      const sendButton = document.getElementById('wetechforu-send-button');
      const input = document.getElementById('wetechforu-input');
      const chatWindow = document.getElementById('wetechforu-chat-window');
      const resizeHandle = document.getElementById('wetechforu-resize-handle');

      chatButton.addEventListener('click', () => this.toggleChat());
      closeButton.addEventListener('click', () => this.closeChat());
      minimizeButton.addEventListener('click', () => this.closeChat()); // Minimize = same as close
      sendButton.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
      
      // ✅ Make widget draggable by header
      this.makeDraggable(chatWindow);
      
      // ✅ Make widget resizable
      this.makeResizable(chatWindow, resizeHandle);
    },
    
    // Make widget draggable
    makeDraggable(element) {
      const header = element.querySelector('div'); // First div is header
      let isDragging = false;
      let startX, startY, startLeft, startBottom;
      
      header.addEventListener('mousedown', (e) => {
        // Don't drag if clicking on buttons
        if (e.target.id.includes('button')) return;
        
        isDragging = true;
        element.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startBottom = window.innerHeight - rect.bottom;
        
        header.style.cursor = 'move';
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = startLeft + deltaX;
        const newBottom = startBottom - deltaY;
        
        // Keep within viewport
        const maxLeft = window.innerWidth - element.offsetWidth;
        const maxBottom = window.innerHeight - element.offsetHeight;
        
        element.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
        element.style.bottom = Math.max(0, Math.min(newBottom, maxBottom)) + 'px';
        element.style.right = 'auto'; // Override right positioning
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          element.classList.remove('dragging');
          header.style.cursor = '';
        }
      });
    },
    
    // Make widget resizable
    makeResizable(element, handle) {
      let isResizing = false;
      let startX, startY, startWidth, startHeight;
      
      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newWidth = Math.max(300, Math.min(600, startWidth + deltaX));
        const newHeight = Math.max(400, Math.min(800, startHeight + deltaY));
        
        element.style.width = newWidth + 'px';
        element.style.height = newHeight + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        isResizing = false;
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

    // Start intro flow (Enhanced with database questions)
    async startIntroFlow() {
      if (this.state.hasShownIntro) return;
      this.state.hasShownIntro = true;

      // Fetch widget config including intro questions
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
        const config = await response.json();

        // Check if intro flow is enabled
        if (config.intro_flow_enabled && config.intro_questions && config.intro_questions.length > 0) {
          this.state.introFlow.enabled = true;
          this.state.introFlow.questions = config.intro_questions;
          this.state.introFlow.isActive = true;

          // Start with welcome message
          setTimeout(() => {
            this.addBotMessage(`👋 Welcome! I'm ${this.config.botName}.`);
          }, 500);

          setTimeout(() => {
            this.addBotMessage("Before we begin, I'd like to know a bit more about you.");
          }, 1500);

          setTimeout(() => {
            this.askIntroQuestion();
          }, 2500);

        } else {
          // Original intro flow (no questions)
          this.startDefaultIntroFlow();
        }
      } catch (error) {
        console.error('Failed to load intro flow config:', error);
        // Fall back to default intro
        this.startDefaultIntroFlow();
      }
    },

    // Default intro flow (no questions)
    startDefaultIntroFlow() {
      const introMessages = [
        {
          text: `👋 Welcome! I'm ${this.config.botName}.`,
          delay: 500
        },
        {
          text: this.config.welcomeMessage || "How can I help you today?",
          delay: 1500,
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

    // Ask current intro question
    askIntroQuestion() {
      if (this.state.introFlow.currentQuestionIndex >= this.state.introFlow.questions.length) {
        this.completeIntroFlow();
        return;
      }

      const question = this.state.introFlow.questions[this.state.introFlow.currentQuestionIndex];
      const required = question.required ? '*' : '';
      
      // Display question
      this.addBotMessage(`${question.question}${required}`);

      // If it's a select type, show options as buttons
      if (question.type === 'select' && question.options && question.options.length > 0) {
        setTimeout(() => {
          this.showIntroOptions(question.options, question.id);
        }, 500);
      }
    },

    // Show intro question options as buttons
    showIntroOptions(options, questionId) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (!quickActions) return;

      quickActions.style.display = 'flex';
      quickActions.innerHTML = options.map(option => 
        `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleIntroOption('${questionId}', '${option.replace(/'/g, "\\'")}')">${option}</button>`
      ).join('');
    },

    // Handle intro option selection
    handleIntroOption(questionId, answer) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (quickActions) quickActions.style.display = 'none';

      // Save answer and show as user message
      this.addUserMessage(answer);
      this.saveIntroAnswer(questionId, answer);

      // Move to next question
      setTimeout(() => {
        this.state.introFlow.currentQuestionIndex++;
        this.askIntroQuestion();
      }, 500);
    },

    // Save intro answer
    saveIntroAnswer(questionId, answer) {
      this.state.introFlow.answers[questionId] = answer;
    },

    // Complete intro flow
    async completeIntroFlow() {
      this.state.introFlow.isActive = false;
      this.state.introFlow.isComplete = true;

      // Show completion message
      this.addBotMessage("✅ Thank you! I have all the information I need.");

      // Submit answers to backend
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/intro-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: this.state.conversationId,
            intro_data: this.state.introFlow.answers
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.conversation_id) {
            this.state.conversationId = data.conversation_id;
          }
          console.log('✅ Intro data saved successfully');
        }
      } catch (error) {
        console.error('Failed to save intro data:', error);
      }

      // Show "how can I help" message
      setTimeout(() => {
        this.addBotMessage("How can I help you today?");
        this.showQuickActions();
      }, 1000);
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
      
      // If intro flow is active, treat as intro answer
      if (this.state.introFlow.isActive) {
        const question = this.state.introFlow.questions[this.state.introFlow.currentQuestionIndex];
        
        // Validate required fields
        if (question.required && !message) {
          this.addBotMessage("This field is required. Please provide an answer.");
          return;
        }

        // Save answer
        this.saveIntroAnswer(question.id, message);

        // Move to next question
        setTimeout(() => {
          this.state.introFlow.currentQuestionIndex++;
          this.askIntroQuestion();
        }, 500);
      } else {
        // Normal chat mode
        this.sendMessageToBackend(message);
      }
    },

    // Send message to backend
    async sendMessageToBackend(message) {
      // 🛡️ Rate Limiting Check
      const now = Date.now();
      
      // Clean up old messages from history (older than time window)
      this.state.messageHistory = this.state.messageHistory.filter(
        timestamp => now - timestamp < this.config.rateLimit.timeWindow
      );
      
      // Check if rate limit exceeded
      if (this.state.messageHistory.length >= this.config.rateLimit.maxMessages) {
        this.addBotMessage('⏳ Please slow down! You\'re sending messages too quickly. Please wait a moment before trying again.');
        return;
      }
      
      // Add current message to history
      this.state.messageHistory.push(now);
      
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

        // 🎯 Handle smart suggestions (if provided)
        if (data.suggestions && data.suggestions.length > 0) {
          setTimeout(() => {
            this.showSmartSuggestions(data.suggestions);
          }, 500);
        }
      } catch (error) {
        this.hideTyping();
        this.addBotMessage("I'm sorry, I'm having trouble connecting. Please try again later.");
        console.error('Widget error:', error);
      }
    },

    // Show smart suggestions as clickable buttons
    showSmartSuggestions(suggestions) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (!quickActions) return;

      quickActions.style.display = 'flex';
      quickActions.innerHTML = `
        <div style="width: 100%; font-size: 12px; color: #666; margin-bottom: 8px;">
          💡 Did you mean one of these?
        </div>
        ${suggestions.map((sug, index) => 
          `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleSuggestionClick('${sug.question.replace(/'/g, "\\'")}')">${index + 1}. ${sug.question} (${sug.similarity}% match)</button>`
        ).join('')}
      `;
    },

    // Handle suggestion click
    handleSuggestionClick(question) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (quickActions) quickActions.style.display = 'none';

      // Send the suggested question as user message
      this.addUserMessage(question);
      this.sendMessageToBackend(question);
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

