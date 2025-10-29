/**
 * WeTechForU AI Chat Widget - Enhanced Version 2.1
 * 
 * Features:
 * - Auto-popup on page load
 * - Friendly intro flow
 * - Compatible with all platforms (WordPress, React, Vue, Angular, etc.)
 * - Responsive design
 * - Smart question flow
 * - Version compatibility checker
 * - AI-powered responses with Gemini
 * 
 * VERSION: v2.1 (Oct 25, 2024)
 */

(function() {
  'use strict';
  
  console.log('🤖 WeTechForU Widget v2.1 Loading...');

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
      },
      // 🏥 Healthcare Compliance
      industry: 'general',
      practicePhone: null,
      emergencyDisclaimer: 'If this is a medical emergency, please call 911 immediately.',
      hipaaDisclaimer: 'This chat is not for medical emergencies. For urgent medical concerns, please call 911 or visit your nearest emergency room.',
      showEmergencyWarning: false,
      autoDetectEmergency: false
    },

    state: {
      isOpen: false,
      conversationId: null,
      hasShownIntro: false,
      isTyping: false,
      messages: [],
      messageHistory: [], // For rate limiting
      lastMessageTime: null,
      displayedMessageIds: [], // Track displayed agent messages
      pollingInterval: null, // Polling timer
      agentTookOver: false, // ✅ NEW: Track if agent took over conversation
      unsuccessfulAttempts: 0, // Track failed knowledge base matches
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
      },
      // 📊 Visitor tracking state
      tracking: {
        sessionId: null,
        heartbeatInterval: null,
        lastPageUrl: null,
        pageStartTime: null,
        visitorFingerprint: null
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
      
      // 📊 START VISITOR TRACKING
      this.startSessionTracking();
      
      // ✅ Auto-popup ONLY if not closed in this session
      if (this.config.autoPopup) {
        const hasClosedBot = sessionStorage.getItem(`wetechforu_closed_${this.config.widgetKey}`);
        
        if (!hasClosedBot) {
          console.log('🤖 Auto-popup enabled - showing bot');
          setTimeout(() => {
            this.openChat();
          }, this.config.autoPopupDelay);
        } else {
          console.log('🚫 Bot was closed in this session - not auto-popping');
        }
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
        
        // 🏥 Healthcare Compliance Settings
        if (config.industry) this.config.industry = config.industry;
        if (config.practice_phone) this.config.practicePhone = config.practice_phone;
        if (config.emergency_disclaimer) this.config.emergencyDisclaimer = config.emergency_disclaimer;
        if (config.hipaa_disclaimer) this.config.hipaaDisclaimer = config.hipaa_disclaimer;
        if (config.show_emergency_warning !== undefined) this.config.showEmergencyWarning = config.show_emergency_warning;
        if (config.auto_detect_emergency !== undefined) this.config.autoDetectEmergency = config.auto_detect_emergency;
        
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
              justify-content: center;
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
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
            }
            50% { 
              transform: scale(1.02); 
              box-shadow: 0 0 20px 10px rgba(220, 53, 69, 0);
            }
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

          /* Mobile responsive - Like other chat widgets */
          @media (max-width: 480px) {
            #wetechforu-chat-window {
              width: calc(100vw - 16px) !important;
              height: 70vh !important;
              max-height: 600px !important;
              max-width: 100vw !important;
              bottom: 80px !important;
              left: 8px !important;
              right: 8px !important;
              border-radius: 16px !important;
              position: fixed !important;
              z-index: 999999 !important;
              box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            }
            #wetechforu-chat-window > div:first-child {
              padding: 16px !important;
            }
            #wetechforu-chat-button {
              width: 60px !important;
              height: 60px !important;
              bottom: 16px !important;
              right: 16px !important;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            #wetechforu-quick-actions {
              flex-wrap: wrap !important;
              padding: 8px !important;
            }
            .wetechforu-quick-action {
              font-size: 12px !important;
              padding: 6px 10px !important;
            }
            #wetechforu-input {
              font-size: 16px !important; /* Prevents zoom on iOS */
            }
            #wetechforu-close-button,
            #wetechforu-minimize-button {
              width: 36px !important;
              height: 36px !important;
              font-size: 18px !important;
            }
          }
          
          /* Tablet responsive */
          @media (max-width: 768px) and (min-width: 481px) {
            #wetechforu-chat-window {
              width: 400px !important;
              height: 550px !important;
              bottom: 90px !important;
              right: 20px !important;
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
      badge.textContent = '1'; // Reset badge
      this.state.isOpen = true;

      // 📊 Track chat opened event
      this.trackEvent('chat_opened', {
        page_url: window.location.href,
        timestamp: new Date().toISOString()
      });

      // ✅ Show welcome message ONLY on first visit in this session
      const hasShownWelcome = sessionStorage.getItem(`wetechforu_welcome_shown_${this.config.widgetKey}`);
      
      if (!hasShownWelcome) {
        console.log('🎉 First visit - showing welcome message');
        // Mark welcome as shown for this session
        sessionStorage.setItem(`wetechforu_welcome_shown_${this.config.widgetKey}`, 'true');
        
        // Start intro flow or show welcome
        if (this.config.enableIntroFlow) {
          setTimeout(() => {
            this.startIntroFlow();
          }, 500);
        } else {
          setTimeout(() => {
            this.startDefaultIntroFlow();
          }, 500);
        }
      } else {
        console.log('👋 Returning visitor - skipping welcome message');
      }

      // Focus input
      setTimeout(() => {
        document.getElementById('wetechforu-input').focus();
      }, 300);
      
      // 📨 Start polling for agent messages
      this.startPollingForAgentMessages();
    },

    // Close chat
    closeChat() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      chatWindow.style.display = 'none';
      this.state.isOpen = false;
      
      // ✅ Mark bot as closed for this session (don't auto-popup again)
      sessionStorage.setItem(`wetechforu_closed_${this.config.widgetKey}`, 'true');
      console.log('🚫 Bot closed - will not auto-popup again this session');
      
      // 📨 Stop polling for agent messages
      this.stopPollingForAgentMessages();
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
      // Show single welcome message with bot name and custom greeting
      setTimeout(() => {
        this.addBotMessage(this.config.welcomeMessage || "Hi! How can I help you today?");
        this.showQuickActions();
      }, 500);
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
      
      // ✅ FIX: Ensure conversation exists before saving intro data
      const conversationId = await this.ensureConversation();
      if (!conversationId) {
        console.error('Failed to create conversation for intro data');
      }

      // Submit answers to backend
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/intro-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            intro_data: this.state.introFlow.answers
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Intro data saved successfully');
        }
      } catch (error) {
        console.error('Failed to save intro data:', error);
      }

      // 🏥 Show HIPAA/Emergency Disclaimer for Healthcare Clients
      if (this.config.showEmergencyWarning && this.config.industry === 'healthcare') {
        setTimeout(() => {
          this.addEmergencyDisclaimer();
        }, 500);
      }

      // Show "how can I help" message - OPEN-ENDED
      setTimeout(() => {
        this.addBotMessage("How can I help you today? Feel free to ask me anything! 😊");
        // ✅ Don't show quick actions - let user ask naturally
        this.state.awaitingUserQuestion = true;
      }, this.config.showEmergencyWarning ? 2000 : 1000);
    },
    
    // 🚨 Show emergency disclaimer (HIPAA compliance for healthcare)
    addEmergencyDisclaimer() {
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      const disclaimerDiv = document.createElement('div');
      disclaimerDiv.style.cssText = `
        margin-bottom: 16px;
        padding: 12px;
        background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
        border: 2px solid #ff9800;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.6;
        color: #856404;
        animation: slideUp 0.3s ease-out;
      `;
      
      disclaimerDiv.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 8px; color: #dc3545; display: flex; align-items: center; gap: 6px;">
          🚨 IMPORTANT NOTICE
        </div>
        <div style="margin-bottom: 8px;">
          ${this.config.hipaaDisclaimer || 'This chat is not for medical emergencies.'}
        </div>
        <div style="font-weight: 600; color: #dc3545; margin-top: 8px;">
          ${this.config.emergencyDisclaimer || 'If this is a medical emergency, please call 911 immediately.'}
        </div>
        ${this.config.practicePhone ? `
          <div style="margin-top: 10px; padding: 8px; background: white; border-radius: 6px; border: 1px solid #ff9800;">
            <strong>📞 Practice Phone:</strong> <a href="tel:${this.config.practicePhone}" style="color: #4682B4; text-decoration: none; font-weight: 600;">${this.config.practicePhone}</a>
          </div>
        ` : ''}
      `;
      
      messagesDiv.appendChild(disclaimerDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    // Show quick action buttons - ONLY when needed
    showQuickActions(suggestions = []) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'flex';

      if (suggestions && suggestions.length > 0) {
        // Show similar question suggestions
        quickActions.innerHTML = suggestions.map((sug, i) => 
          `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleSuggestionClick(${sug.id})">${i+1}. ${sug.question}</button>`
        ).join('');
      } else {
        // Show default categories only if no suggestions
        const categories = [
          { icon: "💬", label: "Talk to Agent", id: "agent" }
        ];

        // Only show appointment booking if enabled
        if (this.config.enableAppointmentBooking) {
          categories.push({ icon: "📅", label: "Book Appointment", id: "appointment" });
        }

        quickActions.innerHTML = categories.map(cat => 
          `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleCategory('${cat.id}')">${cat.icon} ${cat.label}</button>`
        ).join('');
      }
    },

    // Handle category selection - SMART ROUTING
    handleCategory(categoryId) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      
      if (categoryId === 'agent') {
        // User wants to talk to human - Request contact info
        this.addUserMessage("💬 Talk to Human");
        quickActions.style.display = 'none';
        this.requestLiveAgent();
        return;
      }
      
      if (categoryId === 'appointment') {
        this.addUserMessage("📅 Book Appointment");
        quickActions.style.display = 'none';
        this.handleAppointmentRequest();
        return;
      }
      
      if (categoryId === 'hours') {
        this.addUserMessage("🕐 Business Hours");
        quickActions.style.display = 'none';
        this.sendMessageToBackend("What are your business hours?");
        return;
      }
      
      if (categoryId === 'contact') {
        this.addUserMessage("📞 Contact Us");
        quickActions.style.display = 'none';
        this.sendMessageToBackend("How can I contact you?");
        return;
      }
      
      // Healthcare category - show sub-options
      if (categoryId === 'healthcare') {
        this.addUserMessage("🏥 Healthcare Services");
        this.showHealthcareOptions();
      }
    },

    // Show healthcare sub-options
    showHealthcareOptions() {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'flex';
      
      setTimeout(() => {
        this.addBotMessage("Great! What type of healthcare service are you interested in?");
        
        const services = [
          "🩺 General Consultation",
          "🦷 Dental Services",
          "👁️ Eye Care",
          "💊 Prescription Refill",
          "📋 Lab Results",
          "🔙 Back to Menu"
        ];
        
        quickActions.innerHTML = services.map(service => 
          `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleServiceSelection('${service.replace(/'/g, "\\'")}')">${service}</button>`
        ).join('');
      }, 800);
    },

    // Handle service selection
    handleServiceSelection(service) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      
      if (service.includes('Back to Menu')) {
        this.addUserMessage("🔙 Back to Menu");
        quickActions.style.display = 'none';
        setTimeout(() => {
          this.addBotMessage("How else can I help you?");
          this.showQuickActions();
        }, 800);
        return;
      }
      
      this.addUserMessage(service);
      quickActions.style.display = 'none';
      
      // Send to backend to get answer from knowledge base
      this.sendMessageToBackend(service);
      
      // Show "not helpful" option after response
      setTimeout(() => {
        this.showHelpfulOptions();
      }, 3000);
    },

    // Show "Was this helpful?" options
    showHelpfulOptions() {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'flex';
      
      quickActions.innerHTML = `
        <div style="width: 100%; text-align: center; font-size: 12px; color: #666; margin-bottom: 8px;">
          Was this answer helpful?
        </div>
        <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('yes')" style="background: #28a745; color: white; border-color: #28a745;">
          👍 Yes, Thank You
        </button>
        <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('no')">
          👎 No, Need More Help
        </button>
        <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('agent')">
          💬 Talk to Human
        </button>
      `;
    },

    // Handle feedback
    handleFeedback(type) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'none';
      
      if (type === 'yes') {
        this.addUserMessage("👍 Yes, Thank You");
        this.addBotMessage("Great! Glad I could help. Is there anything else you need?");
        setTimeout(() => this.showQuickActions(), 1500);
      } else if (type === 'no') {
        this.addUserMessage("👎 Need More Help");
        this.addBotMessage("I understand. Let me try to help you better. Could you rephrase your question?");
        setTimeout(() => this.showQuickActions(), 1500);
      } else if (type === 'agent') {
        this.addUserMessage("💬 Talk to Human");
        this.requestLiveAgent();
      }
    },

    // Handle appointment request
    handleAppointmentRequest() {
      this.addBotMessage("I'd be happy to help you book an appointment! Let me connect you with our scheduling team.");
      setTimeout(() => {
        this.requestLiveAgent();
      }, 1500);
    },

    // Request live agent - Collect contact info
    requestLiveAgent() {
      this.addBotMessage("Let me connect you with a live agent. To get started, I need a few details:");
      
      // 📊 Track live agent request event
      this.trackEvent('live_agent_requested', {
        page_url: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      // Start contact info collection
      setTimeout(() => {
        this.state.contactInfoStep = 0;
        this.state.contactInfo = {};
        this.askContactInfo();
      }, 1000);
    },

    // Ask contact info step by step
    askContactInfo() {
      const steps = [
        { field: 'name', question: "What's your full name?" },
        { field: 'email', question: "What's your email address?" },
        { field: 'phone', question: "What's your phone number?" },
        { field: 'reason', question: "Briefly, what can we help you with?" }
      ];
      
      if (!this.state.contactInfoStep) this.state.contactInfoStep = 0;
      
      if (this.state.contactInfoStep < steps.length) {
        const step = steps[this.state.contactInfoStep];
        this.addBotMessage(step.question);
        this.state.currentContactField = step.field;
      } else {
        // All info collected - send to portal
        this.submitToLiveAgent();
      }
    },

    // Add bot message
    addBotMessage(text, isAgent = false, agentName = null) {
      const messagesContainer = document.getElementById('wetechforu-messages');
      
      // Use agent avatar if it's a human response
      const avatarHTML = isAgent 
        ? (this.config.botAvatarUrl 
            ? `<img src="${this.config.botAvatarUrl}" alt="Agent" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='👤';" />`
            : '👤')
        : (this.config.botAvatarUrl 
            ? `<img src="${this.config.botAvatarUrl}" alt="Bot" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='🤖';" />`
            : '🤖');
      
      const senderName = isAgent ? (agentName || 'Agent') : this.config.botName;
      
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-bot" ${isAgent ? 'data-agent="true"' : ''}>
          <div class="wetechforu-message-avatar">${avatarHTML}</div>
          <div style="flex: 1;">
            ${isAgent ? `<div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">
              ${senderName}
            </div>` : ''}
            <div class="wetechforu-message-content">${this.escapeHTML(text)}</div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      this.scrollToBottom();
      
      // 🔔 Show notification if agent responded and chat is minimized
      if (isAgent && !this.state.isOpen) {
        this.showNotification(agentName || 'Agent', text);
      }
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
      
      console.log('📝 sendMessage() called, input value:', message);
      
      if (!message) {
        console.log('⚠️  Empty message, skipping');
        return;
      }

      this.addUserMessage(message);
      input.value = '';
      console.log('✅ User message added to UI');
      
      // 🚨 Emergency keyword detection for healthcare
      if (this.config.autoDetectEmergency && this.config.industry === 'healthcare') {
        const emergencyDetected = this.detectEmergencyKeywords(message);
        if (emergencyDetected) {
          setTimeout(() => {
            this.showEmergencyAlert(emergencyDetected);
          }, 500);
          return; // Stop processing - prioritize emergency
        }
      }
      
      // ✅ If collecting contact info for live agent
      if (this.state.currentContactField) {
        if (!this.state.contactInfo) this.state.contactInfo = {};
        this.state.contactInfo[this.state.currentContactField] = message;
        this.state.contactInfoStep++;
        this.state.currentContactField = null;
        
        setTimeout(() => {
          this.askContactInfo();
        }, 500);
        return;
      }
      
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
    
    // 🚨 Detect emergency keywords in user message
    detectEmergencyKeywords(message) {
      const emergencyKeywords = [
        { words: ['emergency', '911', 'urgent', 'asap', 'immediately'], severity: 'high' },
        { words: ['chest pain', 'heart attack', 'stroke', 'can\'t breathe', 'cant breathe', 'difficulty breathing', 'shortness of breath'], severity: 'high' },
        { words: ['bleeding', 'blood', 'unconscious', 'passed out', 'seizure', 'overdose'], severity: 'high' },
        { words: ['severe pain', 'excruciating', 'unbearable', 'sudden', 'critical'], severity: 'medium' },
        { words: ['pain', 'hurt', 'injured', 'accident', 'fall'], severity: 'low' }
      ];
      
      const messageLower = message.toLowerCase();
      
      for (const category of emergencyKeywords) {
        for (const keyword of category.words) {
          if (messageLower.includes(keyword.toLowerCase())) {
            return { keyword, severity: category.severity };
          }
        }
      }
      
      return null;
    },
    
    // 🚨 Show emergency alert with 911 and practice phone
    showEmergencyAlert(detection) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'none';
      
      // Show urgent warning message
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        margin-bottom: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #fee 0%, #fcc 100%);
        border: 3px solid #dc3545;
        border-radius: 10px;
        font-size: 14px;
        line-height: 1.7;
        color: #721c24;
        animation: pulse 1.5s ease-in-out infinite;
      `;
      
      alertDiv.innerHTML = `
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 10px; color: #dc3545; display: flex; align-items: center; gap: 8px;">
          🚨 MEDICAL EMERGENCY DETECTED
        </div>
        <div style="font-weight: 600; margin-bottom: 12px;">
          It sounds like you may need immediate medical attention.
        </div>
        <div style="background: white; padding: 12px; border-radius: 8px; margin: 12px 0; border: 2px solid #dc3545;">
          <div style="font-weight: 700; font-size: 15px; color: #dc3545; margin-bottom: 8px;">
            ☎️ CALL 911 NOW if this is life-threatening!
          </div>
          <a href="tel:911" style="display: inline-block; padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; font-weight: 700; margin-top: 8px;">
            📞 Call 911 Emergency
          </a>
        </div>
        ${this.config.practicePhone ? `
          <div style="background: white; padding: 12px; border-radius: 8px; border: 2px solid #ff9800;">
            <div style="font-weight: 600; margin-bottom: 6px;">
              For non-life-threatening concerns, call our practice:
            </div>
            <a href="tel:${this.config.practicePhone}" style="display: inline-block; padding: 10px 20px; background: #4682B4; color: white; text-decoration: none; border-radius: 6px; font-weight: 700;">
              📞 Call ${this.config.practicePhone}
            </a>
          </div>
        ` : ''}
        <div style="margin-top: 12px; font-size: 12px; color: #666;">
          💬 This chat is not monitored for emergencies. For immediate medical assistance, please use the phone numbers above.
        </div>
      `;
      
      messagesDiv.appendChild(alertDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      
      // Show option to continue anyway
      setTimeout(() => {
        quickActions.style.display = 'flex';
        quickActions.innerHTML = `
          <button class="wetechforu-quick-action" onclick="WeTechForUWidget.acknowledgeEmergency()" style="background: #4682B4; color: white; border: none;">
            ✅ I understand, continue chat
          </button>
        `;
      }, 2000);
    },
    
    // User acknowledges emergency warning
    acknowledgeEmergency() {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'none';
      
      this.addBotMessage("Understood. I'm here to help with general questions. How can I assist you? (Remember: This is not for emergencies)");
      this.state.awaitingUserQuestion = true;
    },
    
    // Submit collected info to live agent
    async submitToLiveAgent() {
      const info = this.state.contactInfo;
      
      // Show confirmation message
      this.addBotMessage(`Thank you, ${info.name}! I've collected your information:`);
      setTimeout(() => {
        this.addBotMessage(`📧 Email: ${info.email}\n📱 Phone: ${info.phone}\n📝 Question: ${info.reason}`);
      }, 800);
      
      setTimeout(() => {
        this.addBotMessage("Checking agent availability...");
      }, 1600);
      
      // ✅ FIX: Ensure conversation exists before handoff
      const conversationId = await this.ensureConversation();
      if (!conversationId) {
        this.addBotMessage("Sorry, I'm having trouble connecting. Please try again later.");
        return;
      }
      
      // Send handoff request to backend
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/${this.config.widgetKey}/handoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            visitor_name: info.name,
            visitor_email: info.email,
            visitor_phone: info.phone,
            handoff_type: 'live_agent',
            handoff_details: { reason: info.reason }
          })
        });
        
        const data = await response.json();
        
        setTimeout(() => {
          if (data.agent_online) {
            // Agent is online
            this.addBotMessage(`✅ Great news! ${data.agent_name || 'An agent'} is available and will assist you shortly.`);
            setTimeout(() => {
              this.addBotMessage(`You're now connected with ${data.agent_name || 'a live agent'}. They'll respond to you here in this chat.`);
            }, 1500);
          } else {
            // Agent is offline
            this.addBotMessage("Our agents are currently offline. Your message has been sent, and we'll get back to you as soon as possible!");
            setTimeout(() => {
              this.addBotMessage("You can expect a response within 24 hours at the email address you provided.");
            }, 1500);
          }
          
          // Reset contact info collection
          this.state.contactInfo = {};
          this.state.contactInfoStep = 0;
          this.state.currentContactField = null;
        }, 2400);
        
      } catch (error) {
        console.error('Failed to submit to agent:', error);
        this.addBotMessage("Sorry, there was an issue connecting you. Please try again or call us directly.");
      }
    },

    // Create conversation if needed (with persistence across page navigation)
    async ensureConversation() {
      // ✅ 1. Check if already in state
      if (this.state.conversationId) {
        console.log('✅ Using existing conversation ID from state:', this.state.conversationId);
        return this.state.conversationId;
      }
      
      // ✅ 2. Check localStorage for persisted conversation (not closed)
      const persistedConvId = localStorage.getItem(`wetechforu_conversation_${this.config.widgetKey}`);
      const conversationClosed = sessionStorage.getItem(`wetechforu_conversation_closed_${this.config.widgetKey}`);
      
      if (persistedConvId && !conversationClosed) {
        // Check if conversation is still active on backend
        try {
          const checkResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${persistedConvId}/status`);
          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            if (statusData.status === 'active') {
              this.state.conversationId = persistedConvId;
              console.log('✅ Restored active conversation from localStorage:', persistedConvId);
              
              // ✅ Load previous messages
              await this.loadPreviousMessages(persistedConvId);
              
              return persistedConvId;
            } else {
              console.log('⚠️ Previous conversation was closed:', statusData.status);
              // Clear closed conversation
              localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);
            }
          }
        } catch (error) {
          console.warn('Could not check conversation status:', error);
        }
      }
      
      // ✅ 3. Create new conversation
      try {
        // Collect visitor info from intro flow or contact info
        let visitorName = 'Anonymous Visitor';
        let visitorEmail = null;
        let visitorPhone = null;
        
        // Check intro flow answers
        if (this.state.introFlow && this.state.introFlow.answers) {
          visitorName = this.state.introFlow.answers['name'] || 
                       this.state.introFlow.answers['first_name'] || 
                       this.state.introFlow.answers['full_name'] || 
                       visitorName;
          visitorEmail = this.state.introFlow.answers['email'] || null;
          visitorPhone = this.state.introFlow.answers['phone'] || 
                        this.state.introFlow.answers['phone_number'] || null;
        }
        
        // Also check contact info (from live agent request)
        if (this.state.contactInfo) {
          if (this.state.contactInfo.name) visitorName = this.state.contactInfo.name;
          if (this.state.contactInfo.email) visitorEmail = this.state.contactInfo.email;
          if (this.state.contactInfo.phone) visitorPhone = this.state.contactInfo.phone;
        }
        
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.getSessionId(),
            page_url: window.location.href,
            referrer_url: document.referrer,
            user_agent: navigator.userAgent,
            visitor_name: visitorName,
            visitor_email: visitorEmail,
            visitor_phone: visitorPhone,
            visitor_session_id: this.state.tracking.sessionId // Link to visitor tracking
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.state.conversationId = data.conversation_id;
          
          // ✅ Store in localStorage for persistence across pages
          localStorage.setItem(`wetechforu_conversation_${this.config.widgetKey}`, data.conversation_id);
          
          console.log('✅ New conversation created & persisted:', data.conversation_id, 'for', visitorName);
          return data.conversation_id;
        } else {
          console.error('Failed to create conversation');
          return null;
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        return null;
      }
    },
    
    // ✅ Load previous messages from conversation
    async loadPreviousMessages(conversationId) {
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          
          if (messages.length > 0) {
            console.log(`✅ Loading ${messages.length} previous messages`);
            
            // Clear existing messages
            const messagesDiv = document.getElementById('wetechforu-messages');
            if (messagesDiv) {
              messagesDiv.innerHTML = '';
            }
            
            // Add system message about restored conversation
            this.addBotMessage('👋 Welcome back! Here\'s your previous conversation:');
            
            // Display all previous messages
            messages.forEach(msg => {
              if (msg.message_type === 'user') {
                this.addUserMessage(msg.message_text, false); // Don't send to backend
              } else if (msg.message_type === 'bot') {
                this.addBotMessage(msg.message_text);
              } else if (msg.message_type === 'human' && msg.agent_name) {
                this.addBotMessage(msg.message_text, true, msg.agent_name); // Show as agent
              } else if (msg.message_type === 'system') {
                this.addBotMessage(`ℹ️ ${msg.message_text}`);
              }
            });
            
            // Add system message
            this.addBotMessage('How else can I help you today?');
            
            return true;
          }
        }
      } catch (error) {
        console.error('Failed to load previous messages:', error);
      }
      return false;
    },
    
    // Get or create session ID
    getSessionId() {
      let sessionId = sessionStorage.getItem('wetechforu_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
        sessionStorage.setItem('wetechforu_session_id', sessionId);
      }
      return sessionId;
    },
    
    // Send message to backend
    async sendMessageToBackend(message) {
      console.log('📨 sendMessageToBackend() called with:', message);
      console.log('🔑 Widget Key:', this.config.widgetKey);
      console.log('🔗 Backend URL:', this.config.backendUrl);
      
      // 🛡️ Rate Limiting Check
      const now = Date.now();
      
      // Clean up old messages from history (older than time window)
      this.state.messageHistory = this.state.messageHistory.filter(
        timestamp => now - timestamp < this.config.rateLimit.timeWindow
      );
      
      // Check if rate limit exceeded
      if (this.state.messageHistory.length >= this.config.rateLimit.maxMessages) {
        console.log('⚠️  Rate limit exceeded');
        this.addBotMessage('⏳ Please slow down! You\'re sending messages too quickly. Please wait a moment before trying again.');
        return;
      }
      
      // Add current message to history
      this.state.messageHistory.push(now);
      
      // ✅ FIX: Ensure conversation exists before sending message
      console.log('🔄 Ensuring conversation exists...');
      const conversationId = await this.ensureConversation();
      console.log('✅ Conversation ID:', conversationId);
      
      if (!conversationId) {
        console.error('❌ Failed to get conversation ID');
        this.addBotMessage("Sorry, I'm having trouble connecting. Please refresh and try again.");
        return;
      }
      
      this.showTyping();
      
      const endpoint = `${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/message`;
      console.log('📡 Sending POST to:', endpoint);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message_text: message, // ✅ FIX: Changed from 'message' to 'message_text'
            conversation_id: conversationId // ✅ FIX: Use guaranteed conversation ID
          })
        });

        console.log('📥 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        this.hideTyping();
        
        // ✅ Check if agent has taken over conversation
        if (data.agent_handoff) {
          this.addBotMessage('👨‍💼 Your message has been sent to our team. An agent will respond shortly...');
          // Stop polling for bot, start polling for agent
          this.state.agentTookOver = true;
          return;
        }
        
        if (data.response) {
          this.addBotMessage(data.response);
          
          // ✅ SMART FOLLOW-UP FLOW
          const confidence = data.confidence || 0;
          
          if (confidence >= 0.85) {
            // ✅ HIGH CONFIDENCE (85%+) - Answer is good, ask if helpful
            this.state.unsuccessfulAttempts = 0; // Reset counter on good match
            setTimeout(() => {
              this.showHelpfulButtons();
            }, 1500);
          } else if (data.suggestions && data.suggestions.length > 0) {
            // 🤔 MEDIUM CONFIDENCE (50-85%) - Show similar questions
            this.state.unsuccessfulAttempts = 0; // Reset counter on suggestions
            setTimeout(() => {
              this.addBotMessage("Or did you mean one of these?");
              this.showSmartSuggestions(data.suggestions);
            }, 1000);
          } else if (confidence < 0.5) {
            // ❌ LOW CONFIDENCE - Bot is still helpful, doesn't immediately push agent
            // The backend already sent a friendly "tell me more" message
            // Only show agent button after 2-3 unsuccessful attempts
            this.state.unsuccessfulAttempts = (this.state.unsuccessfulAttempts || 0) + 1;
            
            if (this.state.unsuccessfulAttempts >= 2) {
              // After 2 failed attempts, offer agent
              setTimeout(() => {
                this.addBotMessage("I'm sorry I couldn't find the exact information you're looking for. Would you like to speak with someone from our team?");
                this.showHelpfulButtons(true); // Show Yes/No for agent
              }, 1500);
            }
            // Otherwise, let user continue asking (bot already responded with helpful message)
          }
        }
      } catch (error) {
        this.hideTyping();
        this.addBotMessage("I'm sorry, I'm having trouble connecting. Please try again later.");
        console.error('Widget error:', error);
      }
    },
    
    // Show "Was this helpful?" or "Talk to agent?" buttons
    showHelpfulButtons(offerAgent = false) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (!quickActions) return;
      
      quickActions.style.display = 'flex';
      
      if (offerAgent) {
        // Offer to connect with agent
        quickActions.innerHTML = `
          <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('agent')" style="background: #4682B4; color: white; border: none;">
            💬 Yes, connect me with an agent
          </button>
          <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('retry')" style="background: #6c757d; color: white; border: none;">
            🔄 Let me try rephrasing
          </button>
        `;
      } else {
        // Ask if answer was helpful
        quickActions.innerHTML = `
          <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('yes')" style="background: #28a745; color: white; border: none;">
            ✅ Yes, that helped!
          </button>
          <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('no')" style="background: #dc3545; color: white; border: none;">
            ❌ No, I need more help
          </button>
        `;
      }
    },
    
    // Show session end options after successful answer
    showSessionEndOptions() {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (!quickActions) return;
      
      quickActions.style.display = 'flex';
      quickActions.innerHTML = `
        <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('more_questions')" style="background: #4682B4; color: white; border: none;">
          💬 Yes, I have more questions
        </button>
        <button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleFeedback('finish_session')" style="background: #28a745; color: white; border: none;">
          ✅ No, I'm all set. Thanks!
        </button>
      `;
    },
    
    // Close conversation on backend when session ends
    async closeSessionOnBackend() {
      if (!this.state.conversationId) return;
      
      try {
        const backendUrl = this.config.backendUrl || 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
        const response = await fetch(`${backendUrl}/api/chat-widget/conversations/${this.state.conversationId}/close-manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'User finished their questions and ended the session'
          })
        });
        
        if (response.ok) {
          console.log('✅ Session closed on backend');
          
          // ✅ Mark conversation as closed in storage
          sessionStorage.setItem(`wetechforu_conversation_closed_${this.config.widgetKey}`, 'true');
          localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);
          
          // Clear state
          this.state.conversationId = null;
        }
      } catch (error) {
        console.error('Failed to close session on backend:', error);
      }
    },
    
    // ✅ Send quick message (display in UI + send to backend)
    async sendQuickMessage(messageText) {
      // Display message in UI
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      `;
      
      const bubble = document.createElement('div');
      bubble.style.cssText = `
        background: linear-gradient(135deg, #4682B4, #5a9fd4);
        color: white;
        padding: 12px 16px;
        border-radius: 18px 18px 4px 18px;
        max-width: 70%;
        word-wrap: break-word;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      bubble.textContent = messageText;
      
      messageDiv.appendChild(bubble);
      messagesDiv.appendChild(messageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      
      // Send to backend
      try {
        const conversationId = await this.ensureConversation();
        if (!conversationId) {
          console.error('No conversation ID - cannot send message');
          return;
        }
        
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_text: messageText,
            conversation_id: conversationId
          })
        });
        
        if (response.ok) {
          console.log('✅ Quick message sent to backend:', messageText);
        }
      } catch (error) {
        console.error('Failed to send quick message to backend:', error);
      }
    },
    
    // Handle user feedback on bot answers
    async handleFeedback(feedback) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      quickActions.style.display = 'none';
      
      if (feedback === 'yes') {
        // ✅ SEND TO BACKEND: Display AND send message
        await this.sendQuickMessage("✅ Yes, that helped!");
        this.state.unsuccessfulAttempts = 0; // Reset counter on positive feedback
        setTimeout(() => {
          this.addBotMessage("Awesome! 🎉 Is there anything else I can help you with?");
          // Show "More questions" or "Finish session" buttons
          this.showSessionEndOptions();
        }, 500);
      } else if (feedback === 'more_questions') {
        // ✅ SEND TO BACKEND
        await this.sendQuickMessage("Yes, I have more questions");
        setTimeout(() => {
          this.addBotMessage("Great! What else would you like to know?");
          this.showQuickActions(); // Show main category buttons
        }, 500);
      } else if (feedback === 'finish_session') {
        // ✅ SEND TO BACKEND
        await this.sendQuickMessage("No, I'm all set. Thank you!");
        setTimeout(() => {
          this.addBotMessage("Thank you for chatting with us! 😊 If you need anything in the future, just come back and start a new chat. Have a wonderful day!");
          // Hide input and quick actions to indicate session is ending
          const inputContainer = document.getElementById('wetechforu-input-container');
          const quickActions = document.getElementById('wetechforu-quick-actions');
          if (inputContainer) inputContainer.style.display = 'none';
          if (quickActions) quickActions.style.display = 'none';
          
          // Optionally close conversation on backend
          setTimeout(() => {
            this.closeSessionOnBackend();
          }, 1000);
        }, 500);
      } else if (feedback === 'no') {
        this.addUserMessage("❌ No, I need more help");
        setTimeout(() => {
          this.addBotMessage("No problem! Let me connect you with a live agent who can assist you better. 👨‍💼");
          this.requestLiveAgent();
        }, 500);
      } else if (feedback === 'agent') {
        this.addUserMessage("💬 Yes, connect me with an agent");
        setTimeout(() => {
          this.addBotMessage("Great! Let me gather some information so our agent can help you better.");
          this.requestLiveAgent();
        }, 500);
      } else if (feedback === 'retry') {
        this.addUserMessage("🔄 Let me try rephrasing");
        setTimeout(() => {
          this.addBotMessage("Of course! Please go ahead and rephrase your question. I'm here to help! 😊");
          this.state.awaitingUserQuestion = true;
        }, 500);
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
    
    // 🔔 Show notification when agent responds
    showNotification(agentName, message) {
      const badge = document.getElementById('wetechforu-badge');
      const chatButton = document.getElementById('wetechforu-chat-button');
      
      // Update badge with message count
      if (badge) {
        const currentCount = parseInt(badge.textContent) || 0;
        badge.textContent = currentCount + 1;
        badge.style.display = 'flex';
      }
      
      // Add bounce animation to chat button
      if (chatButton) {
        chatButton.style.animation = 'bounce 0.5s ease 3';
        setTimeout(() => {
          chatButton.style.animation = '';
        }, 1500);
      }
      
      // Browser notification (if permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${agentName} replied`, {
          body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          icon: this.config.botAvatarUrl || 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png',
          tag: 'wetechforu-agent-message'
        });
      }
      
      // Play notification sound (optional)
      this.playNotificationSound();
    },
    
    // Play notification sound
    playNotificationSound() {
      try {
        // Simple beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        // Silently fail if audio not supported
      }
    },
    
    // 📨 Poll for new agent messages
    startPollingForAgentMessages() {
      if (this.state.pollingInterval) return; // Already polling
      
      this.state.pollingInterval = setInterval(async () => {
        if (!this.state.conversationId) return;
        
        try {
          const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${this.state.conversationId}/messages`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const messages = await response.json();
            const newMessages = messages.filter(msg => 
              msg.message_type === 'human' && 
              !this.state.displayedMessageIds.includes(msg.id)
            );
            
            newMessages.forEach(msg => {
              this.addBotMessage(msg.message_text, true, msg.agent_name || 'Agent');
              this.state.displayedMessageIds.push(msg.id);
            });
          }
        } catch (error) {
          console.error('Failed to poll for messages:', error);
        }
      }, 5000); // Poll every 5 seconds
    },
    
    // Stop polling
    stopPollingForAgentMessages() {
      if (this.state.pollingInterval) {
        clearInterval(this.state.pollingInterval);
        this.state.pollingInterval = null;
      }
    },

    // Escape HTML
    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    
    // ==========================================
    // 📊 VISITOR TRACKING FUNCTIONS (NEW!)
    // ==========================================
    
    // Detect browser, OS, and device information
    detectBrowserInfo() {
      const ua = navigator.userAgent;
      const info = {
        browser: 'Unknown',
        browser_version: 'Unknown',
        os: 'Unknown',
        os_version: 'Unknown',
        device_type: 'desktop'
      };
      
      // Detect browser
      if (ua.indexOf('Firefox') > -1) {
        info.browser = 'Firefox';
        info.browser_version = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Edg') > -1) {
        info.browser = 'Edge';
        info.browser_version = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Chrome') > -1) {
        info.browser = 'Chrome';
        info.browser_version = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('Safari') > -1) {
        info.browser = 'Safari';
        info.browser_version = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
      }
      
      // Detect OS
      if (ua.indexOf('Windows') > -1) {
        info.os = 'Windows';
        if (ua.indexOf('Windows NT 10.0') > -1) info.os_version = '10';
        else if (ua.indexOf('Windows NT 6.3') > -1) info.os_version = '8.1';
        else if (ua.indexOf('Windows NT 6.2') > -1) info.os_version = '8';
        else if (ua.indexOf('Windows NT 6.1') > -1) info.os_version = '7';
      } else if (ua.indexOf('Mac OS X') > -1) {
        info.os = 'macOS';
        info.os_version = ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
      } else if (ua.indexOf('Linux') > -1) {
        info.os = 'Linux';
      } else if (ua.indexOf('Android') > -1) {
        info.os = 'Android';
        info.os_version = ua.match(/Android ([0-9.]+)/)?.[1] || 'Unknown';
      } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
        info.os = 'iOS';
        info.os_version = ua.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
      }
      
      // Detect device type
      if (/Mobi|Android/i.test(ua)) {
        info.device_type = 'mobile';
      } else if (/Tablet|iPad/i.test(ua)) {
        info.device_type = 'tablet';
      }
      
      return info;
    },
    
    // Generate visitor fingerprint (simple version)
    generateFingerprint() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
      const canvasData = canvas.toDataURL();
      
      const data = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        canvasData.substring(0, 100)
      ].join('|');
      
      // Simple hash
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return 'fp_' + Math.abs(hash).toString(36);
    },
    
    // Start visitor session tracking
    async startSessionTracking() {
      try {
        // Generate or retrieve session ID
        if (!this.state.tracking.sessionId) {
          this.state.tracking.sessionId = this.getSessionId();
        }
        
        // Generate visitor fingerprint
        if (!this.state.tracking.visitorFingerprint) {
          this.state.tracking.visitorFingerprint = this.generateFingerprint();
        }
        
        // Detect browser info
        const browserInfo = this.detectBrowserInfo();
        
        // Send initial session tracking
        await fetch(`${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.state.tracking.sessionId,
            visitor_fingerprint: this.state.tracking.visitorFingerprint,
            current_page_url: window.location.href,
            current_page_title: document.title,
            referrer_url: document.referrer,
            user_agent: navigator.userAgent,
            ...browserInfo
          })
        });
        
        console.log('✅ Visitor tracking started:', this.state.tracking.sessionId);
        
        // Start heartbeat (every 30 seconds)
        this.startHeartbeat();
        
        // Track initial page view
        this.trackPageView();
        
        // Listen for page changes (single page apps)
        this.setupPageChangeListener();
        
        // Track when page is about to close
        window.addEventListener('beforeunload', () => this.stopTracking());
        
      } catch (error) {
        console.error('Failed to start visitor tracking:', error);
      }
    },
    
    // Send heartbeat to keep session active
    startHeartbeat() {
      // Clear any existing interval
      if (this.state.tracking.heartbeatInterval) {
        clearInterval(this.state.tracking.heartbeatInterval);
      }
      
      // Send heartbeat every 30 seconds
      this.state.tracking.heartbeatInterval = setInterval(async () => {
        try {
          await fetch(`${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: this.state.tracking.sessionId,
              current_page_url: window.location.href,
              current_page_title: document.title
            })
          });
          console.log('💓 Heartbeat sent');
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }, 30000); // 30 seconds
    },
    
    // Track page view
    async trackPageView(pageUrl = window.location.href, pageTitle = document.title) {
      try {
        // Calculate time on previous page
        let timeOnPage = 0;
        if (this.state.tracking.lastPageUrl && this.state.tracking.pageStartTime) {
          timeOnPage = Math.floor((Date.now() - this.state.tracking.pageStartTime) / 1000);
        }
        
        // Send page view
        await fetch(`${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.state.tracking.sessionId,
            page_url: pageUrl,
            page_title: pageTitle,
            referrer_url: this.state.tracking.lastPageUrl || document.referrer,
            time_on_page: timeOnPage
          })
        });
        
        // Update tracking state
        this.state.tracking.lastPageUrl = pageUrl;
        this.state.tracking.pageStartTime = Date.now();
        
        console.log('📄 Page view tracked:', pageTitle);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    },
    
    // Track visitor event
    async trackEvent(eventType, eventData = {}) {
      try {
        await fetch(`${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: this.state.tracking.sessionId,
            event_type: eventType,
            event_data: eventData,
            page_url: window.location.href
          })
        });
        
        console.log('📊 Event tracked:', eventType);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    },
    
    // Setup listener for page changes (SPA support)
    setupPageChangeListener() {
      // Listen for popstate (back/forward button)
      window.addEventListener('popstate', () => {
        this.trackPageView();
      });
      
      // Listen for hash changes
      window.addEventListener('hashchange', () => {
        this.trackPageView();
      });
      
      // For SPAs using pushState/replaceState
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      const self = this;
      
      history.pushState = function() {
        originalPushState.apply(this, arguments);
        self.trackPageView();
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        self.trackPageView();
      };
    },
    
    // Stop tracking (cleanup)
    stopTracking() {
      if (this.state.tracking.heartbeatInterval) {
        clearInterval(this.state.tracking.heartbeatInterval);
        this.state.tracking.heartbeatInterval = null;
      }
      
      // Track final page time
      if (this.state.tracking.lastPageUrl && this.state.tracking.pageStartTime) {
        const timeOnPage = Math.floor((Date.now() - this.state.tracking.pageStartTime) / 1000);
        
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(
          `${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-pageview`,
          JSON.stringify({
            session_id: this.state.tracking.sessionId,
            page_url: this.state.tracking.lastPageUrl,
            page_title: document.title,
            time_on_page: timeOnPage
          })
        );
      }
      
      console.log('🛑 Visitor tracking stopped');
    }
  };

  // Expose to global scope
  window.WeTechForUWidget = WeTechForUWidget;
})();

