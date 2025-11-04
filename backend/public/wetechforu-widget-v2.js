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
      autoDetectEmergency: false,
      // 🤝 Handover Configuration
      enableHandoverChoice: false,
      handoverOptions: { portal: true, whatsapp: false, email: true, phone: false, webhook: false },
      defaultHandoverMethod: 'portal'
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
      conversationEnded: false, // ✅ Track if conversation has ended
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
      waitingForFirstInput: false, // ✅ Wait for user's first message before showing form
      pendingFormQuestions: null, // ✅ Store questions to show after first input
      // 📊 Visitor tracking state
      tracking: {
        sessionId: null,
        heartbeatInterval: null,
        lastPageUrl: null,
        pageStartTime: null,
        visitorFingerprint: null,
        lastActivityTime: null,
        lastVisibilityChange: null
      },
      // ⏰ Inactivity monitoring
      inactivityMonitorInterval: null,
      conversationExpired: false,
      // 📝 Form flow control
      shouldShowFormAfterInput: false,
      pendingFormQuestions: null
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
        
        // 🤝 Load handover configuration
        try {
          const handoverResponse = await fetch(`${this.config.backendUrl}/api/handover/config/${config.widget_id || config.id}`);
          if (handoverResponse.ok) {
            const handoverConfig = await handoverResponse.json();
            if (handoverConfig.enable_handover_choice !== undefined) {
              this.config.enableHandoverChoice = handoverConfig.enable_handover_choice;
            }
            if (handoverConfig.handover_options) {
              this.config.handoverOptions = typeof handoverConfig.handover_options === 'string' 
                ? JSON.parse(handoverConfig.handover_options) 
                : handoverConfig.handover_options;
            }
            if (handoverConfig.default_handover_method) {
              this.config.defaultHandoverMethod = handoverConfig.default_handover_method;
            }
            console.log('✅ Handover config loaded:', this.config.handoverOptions);
          }
        } catch (error) {
          console.warn('Could not load handover config:', error);
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
    async openChat() {
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

      // ✅ FIRST: Try to restore existing conversation BEFORE showing welcome message
      let conversationRestored = false;
      let hasMessages = false;
      try {
        // Try to find existing active conversation first
        const visitorSessionId = this.getVisitorSessionId();
        try {
          const findConvResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversation/by-visitor/${visitorSessionId}`);
          if (findConvResponse.ok) {
            const convData = await findConvResponse.json();
            
            // Check conversation status
            const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${convData.conversation_id}/status`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              // Only restore if conversation is active and not expired
              if (convData.conversation_id && statusData.status === 'active' && !statusData.is_expired) {
                this.state.conversationId = convData.conversation_id;
                localStorage.setItem(`wetechforu_conversation_${this.config.widgetKey}`, convData.conversation_id);
                console.log('✅ Found active conversation:', convData.conversation_id);
                
                // Try to load messages
                const messagesLoaded = await this.loadPreviousMessages(convData.conversation_id);
                if (messagesLoaded) {
                  conversationRestored = true;
                  hasMessages = true;
                  console.log('✅ Conversation restored with messages');
                  
                  // Mark welcome as shown since we're showing "Welcome back!"
                  sessionStorage.setItem(`wetechforu_welcome_shown_${this.config.widgetKey}`, 'true');
                  
                  // Check if intro was completed
                  if (statusData.intro_completed) {
                    this.state.introFlow.isComplete = true;
                    this.state.hasShownIntro = true;
                    console.log('✅ Intro already completed - skipping intro flow');
                  }
                } else {
                  console.log('ℹ️ No previous messages found - will show welcome');
                }
              }
            }
          }
        } catch (error) {
          console.warn('Could not find conversation by visitorSessionId:', error);
        }
      } catch (error) {
        console.warn('Could not restore conversation on open:', error);
      }

      // ✅ Only show welcome message if conversation was NOT restored OR has no messages
      if (!conversationRestored || !hasMessages) {
        // For new conversations, always show welcome (ignore sessionStorage)
        console.log('🎉 New conversation or no messages - showing welcome message');
        
        // Ensure conversation exists (creates new one if needed)
        await this.ensureConversation();
        
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
        // Conversation was restored with messages - check if we should still show something
        const hasShownWelcome = sessionStorage.getItem(`wetechforu_welcome_shown_${this.config.widgetKey}`);
        if (!hasShownWelcome) {
          // Even though we restored messages, if this is first time in this session, 
          // we've already shown "Welcome back!" in loadPreviousMessages()
          sessionStorage.setItem(`wetechforu_welcome_shown_${this.config.widgetKey}`, 'true');
        }
      }

      // Focus input
      setTimeout(() => {
        document.getElementById('wetechforu-input').focus();
      }, 300);
      
      // 📨 Start polling for agent messages
      this.startPollingForAgentMessages();
    },

    // Close chat with confirmation and email summary option
    async closeChat() {
      // Check if there's an active conversation
      const conversationId = this.state.conversationId;
      if (!conversationId) {
        // No conversation - just close
        this.performClose();
        return;
      }

      // Show confirmation dialog
      const shouldClose = await this.showCloseConfirmation();
      if (!shouldClose) {
        return; // User cancelled
      }

      // Check if user wants email summary
      const wantsEmail = await this.askForEmailSummary();
      let emailToSend = null;

      if (wantsEmail) {
        // Get email from form data or ask
        const formEmail = this.state.introFlow?.answers?.email || 
                         this.state.introFlow?.answers?.email_address ||
                         this.state.contactInfo?.email;

        if (formEmail) {
          emailToSend = formEmail;
        } else {
          // Ask for email
          emailToSend = await this.askForEmail();
          if (!emailToSend) {
            // User cancelled email - still close
            this.performClose();
            return;
          }
        }

        // Send email summary
        if (emailToSend) {
          try {
            await fetch(`${this.config.backendUrl}/api/chat-widget/conversations/${conversationId}/send-expiry-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailToSend })
            });
            this.addBotMessage(`📧 Conversation summary will be sent to ${emailToSend}`);
          } catch (error) {
            console.error('Failed to send email summary:', error);
          }
        }
      }

      // End conversation on backend
      try {
        await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ send_email: wantsEmail, email: emailToSend })
        });
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }

      // Perform close
      this.performClose();
    },

    // Show close confirmation dialog
    showCloseConfirmation() {
      return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          ">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">⚠️ Close Chat?</h3>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              After closing this conversation, you will <strong>lose all chat history</strong> in this window.
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button id="close-cancel" style="
                padding: 10px 20px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                color: #333;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Cancel</button>
              <button id="close-confirm" style="
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                background: #dc3545;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Close Chat</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#close-cancel').addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(false);
        });

        modal.querySelector('#close-confirm').addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(true);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            document.body.removeChild(modal);
            resolve(false);
          }
        });
      });
    },

    // Ask if user wants email summary
    askForEmailSummary() {
      return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          ">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">📧 Email Summary?</h3>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Would you like us to send a summary of this conversation to your email?
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button id="email-no" style="
                padding: 10px 20px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                color: #333;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">No, Thanks</button>
              <button id="email-yes" style="
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                background: #2E86AB;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Yes, Send Email</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#email-no').addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(false);
        });

        modal.querySelector('#email-yes').addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(true);
        });

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            document.body.removeChild(modal);
            resolve(false);
          }
        });
      });
    },

    // Ask for email if not provided
    askForEmail() {
      return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
          <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          ">
            <h3 style="margin-top: 0; color: #333; font-size: 18px;">📧 Enter Your Email</h3>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
              Please enter your email address to receive the conversation summary:
            </p>
            <input 
              type="email" 
              id="close-email-input" 
              placeholder="your.email@example.com"
              style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                font-size: 14px;
                margin-bottom: 16px;
                box-sizing: border-box;
              "
            />
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button id="email-skip" style="
                padding: 10px 20px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                color: #333;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Skip</button>
              <button id="email-submit" style="
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                background: #2E86AB;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Send</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#close-email-input');
        input.focus();

        modal.querySelector('#email-skip').addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(null);
        });

        const submitEmail = () => {
          const email = input.value.trim();
          if (email && email.includes('@')) {
            document.body.removeChild(modal);
            resolve(email);
          } else {
            alert('Please enter a valid email address');
            input.focus();
          }
        };

        modal.querySelector('#email-submit').addEventListener('click', submitEmail);
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') submitEmail();
        });

        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            document.body.removeChild(modal);
            resolve(null);
          }
        });
      });
    },

    // Perform the actual close (after confirmation)
    performClose() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      chatWindow.style.display = 'none';
      this.state.isOpen = false;
      
      // ✅ Clear conversation from localStorage
      const conversationId = this.state.conversationId;
      if (conversationId) {
        localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);
        console.log('🗑️ Removed conversation from localStorage:', conversationId);
      }
      
      // ✅ Mark bot as closed for this session (don't auto-popup again)
      sessionStorage.setItem(`wetechforu_closed_${this.config.widgetKey}`, 'true');
      console.log('🚫 Bot closed - will not auto-popup again this session');
      
      // 📨 Stop polling for agent messages
      this.stopPollingForAgentMessages();
      
      // Reset conversation state
      this.state.conversationId = null;
      this.state.conversationEnded = true;
    },

    // Start intro flow (Enhanced with database questions)
    async startIntroFlow() {
      if (this.state.hasShownIntro) {
        console.log('⚠️ Intro already shown - skipping');
        return;
      }
      
      // ✅ Check if intro was already completed for this conversation
      const conversationId = await this.ensureConversation();
      if (conversationId) {
        try {
          const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.intro_completed) {
              this.state.introFlow.isComplete = true;
              this.state.hasShownIntro = true;
              console.log('✅ Intro already completed - skipping intro questions');
              // Show default welcome instead
              setTimeout(() => {
                this.startDefaultIntroFlow();
              }, 500);
              return;
            }
          }
        } catch (error) {
          console.warn('Could not check intro status, proceeding:', error);
        }
      }

      this.state.hasShownIntro = true;

      // Fetch widget config including intro questions
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
        const config = await response.json();

        // ✅ Only use questions from widget config (no hardcoded defaults)
        // Check if intro flow is enabled AND has questions configured
        if (config.intro_flow_enabled && config.intro_questions && Array.isArray(config.intro_questions) && config.intro_questions.length > 0) {
          // ✅ Filter only enabled questions (only those in widget config)
          const enabledQuestions = config.intro_questions.filter(q => q !== null && typeof q === 'object');
          
          if (enabledQuestions.length > 0) {
            this.state.introFlow.enabled = true;
            this.state.introFlow.questions = enabledQuestions; // ✅ Only use widget config questions
            this.state.introFlow.isActive = true;

            // ✅ Use database welcome_message instead of hardcoded messages
            const welcomeMsg = config.welcome_message || this.config.welcomeMessage || `👋 Welcome! I'm ${this.config.botName}.`;
            
            setTimeout(() => {
              this.addBotMessage(welcomeMsg);
            }, 500);

            // ✅ Check if form data already exists in database (from conversation or visitor_session_id)
            const conversationId = await this.ensureConversation();
            let formDataExists = false;
            
            if (conversationId) {
              try {
                const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  if (statusData.intro_completed && statusData.intro_data) {
                    formDataExists = true;
                    // Restore form data
                    this.state.introFlow.answers = statusData.intro_data;
                    this.state.introFlow.isComplete = true;
                    console.log('✅ Form data already exists - skipping form');
                    
                    // Show summary of existing data
                    setTimeout(() => {
                      this.showFormSummary(statusData.intro_data);
                      // Show ready message since form is already complete
                      setTimeout(() => {
                        this.addBotMessage("How can I help you today? Feel free to ask me anything! 😊");
                      }, 1000);
                    }, 500);
                  }
                }
              } catch (error) {
                console.warn('Could not check form data:', error);
              }
            }
            
            // ✅ If form data doesn't exist, WAIT for user's first message before showing form
            if (!formDataExists) {
              // Set flag to wait for first user input
              this.state.waitingForFirstInput = true;
              this.state.pendingFormQuestions = enabledQuestions;
              this.state.introFlow.enabled = true;
              this.state.introFlow.questions = enabledQuestions;
              this.state.introFlow.isActive = true;
              console.log('✅ Waiting for user\'s first message before showing form');
            }
          } else {
            // No questions configured - use default intro
            console.log('⚠️ Intro flow enabled but no questions configured - using default intro');
            this.startDefaultIntroFlow();
          }
        } else {
          // Intro flow disabled or no questions - use default intro
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

    // ✅ Show intro form as a single form UI (instead of one-by-one questions)
    showIntroForm(questions) {
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      const formDiv = document.createElement('div');
      formDiv.id = 'wetechforu-intro-form';
      formDiv.style.cssText = `
        margin: 16px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
        border: 2px solid #e0e0e0;
        animation: slideUp 0.3s ease-out;
      `;
      
      let formHTML = '<form id="wetechforu-form-form">';
      
      questions.forEach((question, index) => {
        const fieldName = question.id || question.field || `field_${index}`;
        const label = question.question || question.label || '';
        const required = question.required ? '<span style="color: red;">*</span>' : '';
        const placeholder = question.placeholder || '';
        
        formHTML += `
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 14px;">
              ${label} ${required}
            </label>
        `;
        
        if (question.type === 'select' && question.options) {
          formHTML += `
            <select 
              name="${fieldName}" 
              id="form_${fieldName}"
              ${question.required ? 'required' : ''}
              style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; background: white;"
            >
              <option value="">-- Select --</option>
              ${question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
          `;
        } else if (question.type === 'email') {
          formHTML += `
            <input 
              type="email" 
              name="${fieldName}" 
              id="form_${fieldName}"
              placeholder="${placeholder || 'your@email.com'}"
              ${question.required ? 'required' : ''}
              style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            />
          `;
        } else if (question.type === 'tel' || question.type === 'phone') {
          formHTML += `
            <input 
              type="tel" 
              name="${fieldName}" 
              id="form_${fieldName}"
              placeholder="${placeholder || '+1 (555) 123-4567'}"
              pattern="[0-9\\s\\+\\-\\(\\)]{10,}"
              ${question.required ? 'required' : ''}
              style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
            />
          `;
        } else {
          // Text input
          formHTML += `
            <input 
              type="text" 
              name="${fieldName}" 
              id="form_${fieldName}"
              placeholder="${placeholder}"
              ${question.required ? 'required' : ''}
              style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
              ${question.field === 'first_name' || question.id === 'first_name' ? 'pattern="[A-Za-z\\s]{2,}" title="First name should contain only letters"' : ''}
            />
          `;
        }
        
        formHTML += `
          </div>
        `;
      });
      
      formHTML += `
        <button 
          type="submit"
          style="width: 100%; padding: 12px; background: #2E86AB; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px;"
          onmouseover="this.style.background='#1e6a8a'"
          onmouseout="this.style.background='#2E86AB'"
        >
          Submit Information
        </button>
      </form>`;
      
      formDiv.innerHTML = formHTML;
      messagesDiv.appendChild(formDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      
      // Attach form submit handler
      const form = document.getElementById('wetechforu-form-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit(questions);
        });
      }
      
      // Focus first input
      setTimeout(() => {
        const firstInput = formDiv.querySelector('input, select');
        if (firstInput) firstInput.focus();
      }, 100);
    },
    
    // ✅ Handle form submission with validation
    async handleFormSubmit(questions) {
      const form = document.getElementById('wetechforu-form-form');
      if (!form) return;
      
      const formData = new FormData(form);
      const answers = {};
      let hasErrors = false;
      const errors = [];
      
      // Validate and collect answers
      questions.forEach((question, index) => {
        const fieldName = question.id || question.field || `field_${index}`;
        const value = formData.get(fieldName)?.trim() || '';
        const label = question.question || question.label || fieldName;
        
        // Required field validation
        if (question.required && !value) {
          hasErrors = true;
          errors.push(`${label} is required`);
          return;
        }
        
        // First name validation (should not be number)
        if ((fieldName === 'first_name' || question.id === 'first_name') && value) {
          if (/^\d+$/.test(value) || /^\d/.test(value)) {
            hasErrors = true;
            errors.push('First name should contain only letters, not numbers');
            return;
          }
          if (value.length < 2) {
            hasErrors = true;
            errors.push('First name must be at least 2 characters');
            return;
          }
        }
        
        // Phone validation
        if ((question.type === 'tel' || question.type === 'phone') && value) {
          const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            hasErrors = true;
            errors.push('Please enter a valid phone number (e.g., +1 (555) 123-4567)');
            return;
          }
        }
        
        // Email validation (HTML5 does this, but double-check)
        if (question.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            hasErrors = true;
            errors.push('Please enter a valid email address');
            return;
          }
        }
        
        if (value) {
          answers[fieldName] = value;
        }
      });
      
      // Show errors if any
      if (hasErrors) {
        const errorMsg = errors.join('<br>');
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'margin-top: 10px; padding: 10px; background: #fee; color: #c33; border-radius: 6px; font-size: 13px;';
        errorDiv.innerHTML = `❌ ${errorMsg}`;
        
        const existingError = form.querySelector('.form-error');
        if (existingError) existingError.remove();
        
        form.appendChild(errorDiv);
        errorDiv.className = 'form-error';
        return;
      }
      
      // Store answers
      this.state.introFlow.answers = answers;
      
      // Hide form
      const formDiv = document.getElementById('wetechforu-intro-form');
      if (formDiv) {
        formDiv.style.display = 'none';
      }
      
      // Show summary
      this.showFormSummary(answers);
      
      // Complete intro flow
      await this.completeIntroFlow();
    },
    
    // ✅ Show form summary
    showFormSummary(answers) {
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      const summaryDiv = document.createElement('div');
      summaryDiv.style.cssText = `
        margin: 16px 0;
        padding: 16px;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        border-radius: 12px;
        border: 2px solid #2196F3;
        animation: slideUp 0.3s ease-out;
      `;
      
      let summaryHTML = '<div style="font-weight: 600; margin-bottom: 12px; color: #1976D2; font-size: 15px;">✅ Your Information Summary</div>';
      summaryHTML += '<div style="background: white; padding: 12px; border-radius: 8px;">';
      
      Object.keys(answers).forEach(key => {
        const value = answers[key];
        if (value) {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          summaryHTML += `
            <div style="margin-bottom: 8px; padding: 8px; border-bottom: 1px solid #eee;">
              <strong style="color: #555; font-size: 13px;">${label}:</strong>
              <span style="color: #333; font-size: 14px; margin-left: 8px;">${value}</span>
            </div>
          `;
        }
      });
      
      summaryHTML += '</div>';
      summaryDiv.innerHTML = summaryHTML;
      messagesDiv.appendChild(summaryDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    // Complete intro flow
    async completeIntroFlow() {
      this.state.introFlow.isActive = false;
      this.state.introFlow.isComplete = true;

      // ✅ IMPORTANT: Store form data in a way that's accessible for agent handoff
      // Map form answers to contact info format for easy access
      if (this.state.introFlow.answers) {
        const answers = this.state.introFlow.answers;
        
        // Build full name from first_name and last_name
        let fullName = '';
        if (answers.first_name && answers.last_name) {
          fullName = `${answers.first_name} ${answers.last_name}`;
        } else if (answers.first_name) {
          fullName = answers.first_name;
        } else if (answers.name) {
          fullName = answers.name;
        }
        
        const email = answers.email || answers.email_address || null;
        const phone = answers.phone || answers.phone_number || answers.mobile || null;
        
        // Store in both formats for compatibility
        if (fullName && (email || phone)) {
          this.state.contactInfo = {
            name: fullName,
            email: email,
            phone: phone,
            reason: answers.message || answers.question || answers.reason || 'Visitor requested to speak with an agent'
          };
          console.log('✅ Contact info stored from intro flow:', this.state.contactInfo);
        }
      }

      // Show completion message and ready to help
      setTimeout(() => {
        this.addBotMessage("✅ Thank you! I have all the information I need.");
        // Don't show "How can I help" - let user ask naturally after form
      }, 500);
      
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

      // ✅ Form completed - user can now ask questions naturally (no prompt needed)
      this.state.awaitingUserQuestion = true;
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
      console.log('🔍 requestLiveAgent() called');
      console.log('📋 Intro flow state:', {
        isComplete: this.state.introFlow?.isComplete,
        hasAnswers: !!this.state.introFlow?.answers,
        answers: this.state.introFlow?.answers
      });
      console.log('📋 Contact info state:', this.state.contactInfo);
      
      // ✅ FIRST: Check if contact info already exists (from form or previous collection)
      if (this.state.contactInfo && this.state.contactInfo.name && (this.state.contactInfo.email || this.state.contactInfo.phone)) {
        console.log('✅ Contact info already exists, skipping questions:', this.state.contactInfo);
        this.addBotMessage("⏳ Processing your request...");
        setTimeout(() => {
          this.submitToLiveAgent();
        }, 500);
        return;
      }
      
      // ✅ SECOND: Check if we have contact info from intro flow
      if (this.state.introFlow && this.state.introFlow.isComplete && this.state.introFlow.answers) {
        const answers = this.state.introFlow.answers;
        console.log('📝 Intro flow answers found:', answers);
        
        // Build full name from first_name and last_name
        let fullName = '';
        if (answers.first_name && answers.last_name) {
          fullName = `${answers.first_name} ${answers.last_name}`;
        } else if (answers.first_name) {
          fullName = answers.first_name;
        } else if (answers.name) {
          fullName = answers.name;
        }
        
        const email = answers.email || answers.email_address || null;
        const phone = answers.phone || answers.phone_number || answers.mobile || null;
        
        // If we have name + (email or phone), use intro flow data directly
        if (fullName && (email || phone)) {
          console.log('✅ Using intro flow data directly:', { fullName, email, phone });
          this.state.contactInfo = {
            name: fullName,
            email: email,
            phone: phone,
            reason: answers.message || answers.question || answers.reason || 'Visitor requested to speak with an agent'
          };
          
          // Skip asking questions - go directly to submit
          this.addBotMessage("⏳ Processing your request...");
          setTimeout(() => {
            this.submitToLiveAgent();
          }, 500);
          return;
        }
      }
      
      // ✅ THIRD: Only ask if we don't have the info
      console.log('⚠️  No contact info found, will ask for details');
      this.addBotMessage("Let me connect you with a live agent. To get started, I need a few details:");
      
      // 📊 Track live agent request event
      this.trackEvent('live_agent_requested', {
        page_url: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      // Start contact info collection
      setTimeout(() => {
        // Only reset if we don't have partial data
        if (!this.state.contactInfo || !this.state.contactInfo.name) {
          this.state.contactInfoStep = 0;
          this.state.contactInfo = {};
        }
        this.askContactInfo();
      }, 1000);
    },

    // Ask contact info step by step (only if not already collected in intro flow)
    askContactInfo() {
      // ✅ First, check if intro flow already collected this information
      if (this.state.introFlow && this.state.introFlow.answers && Object.keys(this.state.introFlow.answers).length > 0) {
        // Map intro flow answers to contact info
        const introAnswers = this.state.introFlow.answers;
        
        // Build name from first_name and last_name, or use full name if available
        let fullName = '';
        if (introAnswers.first_name && introAnswers.last_name) {
          fullName = `${introAnswers.first_name} ${introAnswers.last_name}`;
        } else if (introAnswers.first_name) {
          fullName = introAnswers.first_name;
        } else if (introAnswers.name) {
          fullName = introAnswers.name;
        }
        
        // Map email and phone
        const email = introAnswers.email || introAnswers.email_address || null;
        const phone = introAnswers.phone || introAnswers.phone_number || introAnswers.mobile || null;
        
        // If we have name + (email or phone), use intro data directly
        if (fullName && (email || phone)) {
          this.state.contactInfo = {
            name: fullName,
            email: email,
            phone: phone,
            reason: introAnswers.reason || introAnswers.message || introAnswers.question || 'Visitor requested to speak with an agent'
          };
          console.log('✅ Using contact info from intro flow:', this.state.contactInfo);
          // Skip asking - go directly to submit
          this.submitToLiveAgent();
          return;
        }
      }
      
      // ✅ Only ask for missing information (not already in intro flow)
      const steps = [
        { field: 'name', question: "What's your full name?" },
        { field: 'email', question: "What's your email address?" },
        { field: 'phone', question: "What's your phone number?" },
        { field: 'reason', question: "Briefly, what can we help you with?" }
      ];
      
      if (!this.state.contactInfoStep) this.state.contactInfoStep = 0;
      if (!this.state.contactInfo) this.state.contactInfo = {};
      
      // Pre-populate from intro flow if available
      if (this.state.introFlow && this.state.introFlow.answers) {
        const introAnswers = this.state.introFlow.answers;
        if (!this.state.contactInfo.name) {
          if (introAnswers.first_name && introAnswers.last_name) {
            this.state.contactInfo.name = `${introAnswers.first_name} ${introAnswers.last_name}`;
          } else if (introAnswers.first_name) {
            this.state.contactInfo.name = introAnswers.first_name;
          }
        }
        if (!this.state.contactInfo.email) {
          this.state.contactInfo.email = introAnswers.email || introAnswers.email_address || null;
        }
        if (!this.state.contactInfo.phone) {
          this.state.contactInfo.phone = introAnswers.phone || introAnswers.phone_number || introAnswers.mobile || null;
        }
      }
      
      // Find next unanswered question
      let nextStepIndex = this.state.contactInfoStep;
      while (nextStepIndex < steps.length) {
        const step = steps[nextStepIndex];
        if (!this.state.contactInfo[step.field]) {
          // Found unanswered question
          this.addBotMessage(step.question);
          this.state.currentContactField = step.field;
          this.state.contactInfoStep = nextStepIndex;
          return;
        }
        nextStepIndex++;
      }
      
      // All required info collected - submit
      if (this.state.contactInfo.name && (this.state.contactInfo.email || this.state.contactInfo.phone)) {
        this.submitToLiveAgent();
      } else {
        // Missing required fields - ask for at least name + email or phone
        if (!this.state.contactInfo.name) {
          this.addBotMessage("What's your full name?");
          this.state.currentContactField = 'name';
          this.state.contactInfoStep = 0;
        } else if (!this.state.contactInfo.email && !this.state.contactInfo.phone) {
          this.addBotMessage("What's your email address or phone number?");
          // Will handle in message handler
        } else {
          this.submitToLiveAgent();
        }
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
      
        // ✅ Detect agent requests in message (including "staff")
      const agentKeywords = ['agent', 'staff', 'human', 'person', 'live', 'real person', 'talk to someone', 'speak with', 'connect with agent', 'help from', 'representative', 'rep'];
      const messageLower = message.toLowerCase();
      const wantsAgent = agentKeywords.some(keyword => messageLower.includes(keyword));
      
      if (wantsAgent && !this.state.currentContactField && !this.state.contactInfoStep) {
        // User wants to talk to agent - start collection immediately
        setTimeout(() => {
          this.requestLiveAgent();
        }, 500);
        return;
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
      
      // ✅ FIRST: Check if we're waiting for first input - show form after first message
      if (this.state.waitingForFirstInput && this.state.pendingFormQuestions) {
        console.log('✅ User sent first message - showing intro form now');
        // Show form after user's first message
        this.addBotMessage("Thank you for reaching out! 😊 Before I assist you better, please fill in the information below:");
        setTimeout(() => {
          this.showIntroForm(this.state.pendingFormQuestions);
          this.state.waitingForFirstInput = false;
          this.state.pendingFormQuestions = null;
        }, 300);
        // Don't process this message as a regular chat message - wait for form completion
        return;
      }
      
      // ✅ SECOND: Check if intro form is displayed and not completed
      if (this.state.introFlow.enabled && !this.state.introFlow.isComplete) {
        const formExists = document.getElementById('wetechforu-intro-form') !== null;
        if (formExists) {
          this.addBotMessage("Please complete the information form above first. 😊");
        } else {
          // Form doesn't exist but intro is enabled - show form now
          console.log('⚠️ Form not found but intro enabled - showing form');
          if (this.config.introQuestions && this.config.introQuestions.length > 0) {
            const enabledQuestions = this.config.introQuestions.filter(q => q.enabled !== false);
            this.addBotMessage("Thank you for reaching out! 😊 Before I assist you better, please fill in the information below:");
            setTimeout(() => {
              this.showIntroForm(enabledQuestions);
            }, 300);
          }
          this.addBotMessage("Please complete the information form above first. 😊");
        }
        return;
      }

      // Normal chat mode (intro completed or not enabled)
      this.sendMessageToBackend(message);
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
      
      // ✅ FIX: Ensure conversation exists before handoff
      const conversationId = await this.ensureConversation();
      if (!conversationId) {
        this.addBotMessage("Sorry, I'm having trouble connecting. Please try again later.");
        return;
      }
      
      // Get widget ID first
      let widgetId = null;
      try {
        const configResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
        if (configResponse.ok) {
          const widgetConfig = await configResponse.json();
          widgetId = widgetConfig.widget_id || widgetConfig.id;
          console.log('✅ Got widget ID:', widgetId);
        }
      } catch (error) {
        console.error('Failed to get widget ID:', error);
      }

      if (!widgetId) {
        this.addBotMessage("Sorry, there was an issue getting widget configuration. Please try again.");
        return;
      }

      // Always use the client-configured default handover method (visitors don't choose)
      const handoverMethod = this.config.defaultHandoverMethod || 'portal';
      console.log('📞 Using configured handover method:', handoverMethod);
      this.submitHandoverRequest(handoverMethod, info, conversationId, widgetId);
    },

    // Show handover choice modal
    showHandoverChoiceModal(info, conversationId, widgetId) {
      const availableOptions = [];
      if (this.config.handoverOptions.portal) availableOptions.push({ method: 'portal', label: '💬 Portal Chat', desc: 'Continue chatting here' });
      if (this.config.handoverOptions.whatsapp && info.phone) availableOptions.push({ method: 'whatsapp', label: '📱 WhatsApp', desc: 'Get contacted via WhatsApp' });
      if (this.config.handoverOptions.email && info.email) availableOptions.push({ method: 'email', label: '📧 Email', desc: 'Receive email response' });
      if (this.config.handoverOptions.phone && info.phone) availableOptions.push({ method: 'phone', label: '📞 Phone Call/SMS', desc: 'Get a call or text' });
      if (this.config.handoverOptions.webhook) availableOptions.push({ method: 'webhook', label: '🔗 System Integration', desc: 'Send to your system' });

      if (availableOptions.length === 0) {
        // No options available, use default
        this.submitHandoverRequest(this.config.defaultHandoverMethod || 'portal', info, conversationId, widgetId);
        return;
      }

      // Build modal HTML
      const modalHTML = `
        <div id="wetechforu-handover-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          ">
            <h3 style="margin-top: 0; color: #333;">How would you like to be contacted?</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Choose your preferred contact method:</p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${availableOptions.map(opt => `
                <button onclick="WeTechForUWidget.selectHandoverMethod('${opt.method}')" style="
                  padding: 12px 16px;
                  border: 2px solid #e0e0e0;
                  border-radius: 8px;
                  background: white;
                  cursor: pointer;
                  text-align: left;
                  transition: all 0.2s;
                  font-size: 14px;
                " onmouseover="this.style.borderColor='${this.config.primaryColor}'; this.style.background='#f5f5f5';" 
                   onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white';">
                  <div style="font-weight: 600; color: #333;">${opt.label}</div>
                  <div style="font-size: 12px; color: #666; margin-top: 4px;">${opt.desc}</div>
                </button>
              `).join('')}
            </div>
            <button onclick="WeTechForUWidget.closeHandoverModal()" style="
              margin-top: 16px;
              width: 100%;
              padding: 10px;
              border: none;
              border-radius: 6px;
              background: #f0f0f0;
              cursor: pointer;
              color: #666;
              font-size: 14px;
            ">Cancel</button>
          </div>
        </div>
      `;

      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHTML);
      this.state.handoverInfo = info;
      this.state.handoverConversationId = conversationId;
      this.state.handoverWidgetId = widgetId;
    },

    // Close handover modal
    closeHandoverModal() {
      const modal = document.getElementById('wetechforu-handover-modal');
      if (modal) modal.remove();
      this.state.handoverInfo = null;
      this.state.handoverConversationId = null;
    },

    // Select handover method
    async selectHandoverMethod(method) {
      this.closeHandoverModal();
      const info = this.state.handoverInfo;
      const conversationId = this.state.handoverConversationId;
      const widgetId = this.state.handoverWidgetId;
      
      if (!info || !conversationId || !widgetId) {
        this.addBotMessage("Sorry, there was an issue. Please try again.");
        return;
      }

      // Submit handover request
      await this.submitHandoverRequest(method, info, conversationId, widgetId);
    },

    // Submit handover request to backend
    async submitHandoverRequest(method, info, conversationId, widgetId) {
      if (!widgetId) {
        // Try to get widget ID
        try {
          const configResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
          if (configResponse.ok) {
            const config = await configResponse.json();
            widgetId = config.widget_id || config.id;
          }
        } catch (error) {
          console.error('Failed to get widget ID:', error);
        }
      }

      if (!widgetId) {
        this.addBotMessage("Sorry, there was an issue. Please try again.");
        return;
      }

      this.addBotMessage(`⏳ Processing your request...`);

      try {
        const requestBody = {
          conversation_id: conversationId,
          widget_id: widgetId,
          client_id: this.config.clientId || null, // Will be determined by backend from widget_id
          requested_method: method,
          visitor_name: info.name,
          visitor_email: info.email || null,
          visitor_phone: info.phone || null,
          visitor_message: info.reason || 'Visitor requested to speak with an agent'
        };

        console.log('📤 Sending handover request:', requestBody);

        const response = await fetch(`${this.config.backendUrl}/api/handover/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log('📥 Handover response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Handover request failed:', response.status, errorText);
          let errorMessage = "Sorry, there was an error submitting your request.";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Use default error message
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('✅ Handover response:', data);

        // ✅ Check if agent is busy (for WhatsApp handover)
        if (data.agent_busy && data.queued) {
          setTimeout(() => {
            this.addBotMessage("⏳ Our agent is currently busy with another conversation. We will notify you as soon as they're available. Thank you for your patience!");
            // Mark handover as queued (not active yet)
            this.state.handoverQueued = true;
          }, 800);
          return; // Don't mark as agent took over yet
        }

        if (data.success) {
          // Show generic confirmation only (no method details in chat)
          setTimeout(() => {
            // Show method-specific confirmation message
            let confirmationMessage = '';
            if (method === 'whatsapp') {
              confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent via WhatsApp and get back to you shortly. Please keep WhatsApp open for our response.";
            } else if (method === 'email') {
              confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent and get back to you via email shortly.";
            } else if (method === 'phone') {
              confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent and get back to you via phone call or SMS shortly.";
            } else {
              confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent and get back to you shortly.";
            }
            this.addBotMessage(confirmationMessage);
            
            // Start polling for agent messages if WhatsApp or portal
            if (method === 'whatsapp' || method === 'portal') {
              this.state.agentTookOver = true;
              this.startPollingForAgentMessages();
            }
            this.state.agentTookOver = true;
          }, 800);
        } else {
          throw new Error(data.error || 'Request failed');
        }

        // Reset contact info collection
        this.state.contactInfo = {};
        this.state.contactInfoStep = 0;
        this.state.currentContactField = null;
        this.state.handoverInfo = null;
        this.state.handoverConversationId = null;

      } catch (error) {
        console.error('❌ Failed to submit handover request:', error);
        const errorMsg = error.message || "Sorry, there was an error submitting your request. Please try again or refresh the page.";
        this.addBotMessage(`❌ ${errorMsg}`);
      }
    },

    // Create conversation if needed (with persistence across page navigation)
    async ensureConversation() {
      // ✅ 1. Check if already in state
      if (this.state.conversationId) {
        console.log('✅ Using existing conversation ID from state:', this.state.conversationId);
        return this.state.conversationId;
      }
      
      // ✅ 2. FIRST: Try to find active conversation by visitorSessionId (cross-tab persistence)
      const visitorSessionId = this.getVisitorSessionId();
      try {
        const findConvResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversation/by-visitor/${visitorSessionId}`);
          if (findConvResponse.ok) {
          const convData = await findConvResponse.json();
          
          // ✅ Check conversation status for expiration
          const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${convData.conversation_id}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            // ✅ Check if conversation expired
            if (statusData.is_expired) {
              console.log('⏰ Conversation expired due to inactivity:', statusData.minutes_inactive, 'minutes');
              
              // Send email summary if email was provided
              if (statusData.visitor_email) {
                try {
                  await fetch(`${this.config.backendUrl}/api/chat-widget/conversations/${convData.conversation_id}/send-expiry-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                } catch (emailError) {
                  console.warn('Failed to send expiry email:', emailError);
                }
              }
              
              // Don't restore - fall through to create new conversation
              console.log('⚠️ Expired conversation - will create new one');
            } else if (convData.conversation_id && statusData.status === 'active') {
              this.state.conversationId = convData.conversation_id;
              localStorage.setItem(`wetechforu_conversation_${this.config.widgetKey}`, convData.conversation_id);
              console.log('✅ Restored active conversation by visitorSessionId:', convData.conversation_id);
              
              // ✅ Load previous messages
              await this.loadPreviousMessages(convData.conversation_id);
              
              // ✅ Check if intro was completed
              if (statusData.intro_completed) {
                this.state.introFlow.isComplete = true;
                this.state.hasShownIntro = true;
                console.log('✅ Intro already completed - skipping intro flow');
              }
              
              // ✅ Check if agent handoff is active (WhatsApp or portal)
              if (statusData.agent_handoff) {
                this.state.agentTookOver = true;
                this.startPollingForAgentMessages(); // Start polling for agent replies
                console.log('✅ Agent handoff active - started polling for agent messages');
              }
              
              // ✅ Start inactivity monitoring
              this.startInactivityMonitoring(convData.conversation_id);
              
              // ✅ Show warning if approaching expiration
              if (statusData.is_warning_threshold) {
                const minutesLeft = Math.max(0, 15 - statusData.minutes_inactive);
                this.addBotMessage(`⏰ This conversation has been inactive for ${statusData.minutes_inactive} minutes. If inactive for ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}, the chat will turn off and all history will be removed. ${statusData.visitor_email ? 'If you provided an email, we\'ll send you a summary.' : ''}`);
              }
              
              return convData.conversation_id;
            }
          }
        }
      } catch (error) {
        console.warn('Could not find conversation by visitorSessionId:', error);
      }
      
      // ✅ 3. Check localStorage for persisted conversation (not closed)
      const persistedConvId = localStorage.getItem(`wetechforu_conversation_${this.config.widgetKey}`);
      const conversationClosed = sessionStorage.getItem(`wetechforu_conversation_closed_${this.config.widgetKey}`);
      
      if (persistedConvId && !conversationClosed) {
        // Check if conversation is still active on backend
        try {
          const checkResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${persistedConvId}/status`);
          if (checkResponse.ok) {
            const statusData = await checkResponse.json();
            
            // ✅ Check if conversation expired (15+ minutes inactive or status inactive)
            if (statusData.is_expired) {
              console.log('⏰ Conversation expired due to inactivity:', statusData.minutes_inactive, 'minutes');
              
              // Send email summary if email was provided
              if (statusData.visitor_email) {
                try {
                  await fetch(`${this.config.backendUrl}/api/chat-widget/conversations/${persistedConvId}/send-expiry-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                } catch (emailError) {
                  console.warn('Failed to send expiry email:', emailError);
                }
              }
              
              // Show expiration message (but DON'T clear existing messages)
              this.addBotMessage('⏰ This conversation has been inactive for a while. I\'m turning off the chat here.');
              if (statusData.visitor_email) {
                this.addBotMessage(`📧 I've sent a summary of our conversation to ${statusData.visitor_email}. All conversation history will be removed.`);
              }
              this.addBotMessage('🔄 Let\'s start fresh! I\'ll ask you a few questions again to help you better.');
              
              // Clear conversation from localStorage
              localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);
              sessionStorage.setItem(`wetechforu_conversation_reset_${this.config.widgetKey}`, 'true');
              
              // DON'T clear messages UI - keep them visible
              
              // Reset state
              this.state.conversationId = null;
              this.state.introFlow.isComplete = false;
              this.state.hasShownIntro = false;
              this.state.conversationExpired = true;
              
              // Don't return - fall through to create new conversation
            } else if (statusData.status === 'active') {
              this.state.conversationId = persistedConvId;
              console.log('✅ Restored active conversation from localStorage:', persistedConvId);
              
              // ✅ Load previous messages
              await this.loadPreviousMessages(persistedConvId);
              
              // ✅ Check if intro was completed
              if (statusData.intro_completed) {
                this.state.introFlow.isComplete = true;
                this.state.hasShownIntro = true;
                console.log('✅ Intro already completed - skipping intro flow');
              }
              
              // ✅ Start inactivity monitoring (check every minute)
              this.startInactivityMonitoring(persistedConvId);
              
              // ✅ Show warning if approaching expiration (10+ minutes inactive)
              if (statusData.is_warning_threshold) {
                const minutesLeft = Math.max(0, 15 - statusData.minutes_inactive);
                this.addBotMessage(`⏰ This conversation has been inactive for ${statusData.minutes_inactive} minutes. If inactive for ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}, the chat will turn off and all history will be removed. ${statusData.visitor_email ? 'If you provided an email, we\'ll send you a summary.' : ''}`);
              }
              
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
            visitor_session_id: visitorSessionId // ✅ Use persistent visitorSessionId
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
        console.log(`📥 Loading previous messages for conversation ${conversationId}`);
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/messages`);
        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          
          console.log(`📨 Found ${messages.length} messages to restore`);
          
          if (messages.length > 0) {
            // Clear existing messages ONLY if we have messages to restore
            const messagesDiv = document.getElementById('wetechforu-messages');
            if (messagesDiv) {
              // Check if there are existing messages in the UI
              const existingMessages = messagesDiv.querySelectorAll('.wetechforu-message, #wetechforu-intro-form');
              if (existingMessages.length > 0) {
                messagesDiv.innerHTML = '';
                console.log('🧹 Cleared existing UI messages before restoring');
              }
              
              // Add system message about restored conversation
              this.addBotMessage('👋 Welcome back! Here\'s your previous conversation:');
              
              // Display all previous messages with date separators
              let lastDate = null;
              const messagesDiv = document.getElementById('wetechforu-messages');
              
              messages.forEach((msg, index) => {
                // Add date separator if date changed
                const msgDate = new Date(msg.created_at);
                const msgDateStr = msgDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                });
                
                if (lastDate !== msgDateStr) {
                  // Add date separator line
                  const separator = document.createElement('div');
                  separator.style.cssText = `
                    text-align: center;
                    margin: 16px 0;
                    padding: 8px 0;
                    border-top: 1px solid #ddd;
                    border-bottom: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                    font-weight: 600;
                    background: #f9f9f9;
                  `;
                  separator.textContent = `📅 ${msgDateStr}`;
                  if (messagesDiv) {
                    messagesDiv.appendChild(separator);
                  }
                  lastDate = msgDateStr;
                }
                
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
              
              // Add continuation message
              this.addBotMessage('How else can I help you today?');
              
              // Scroll to bottom after loading messages (newest at bottom)
              setTimeout(() => {
                if (messagesDiv) {
                  messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
              }, 100);
              
              console.log(`✅ Successfully restored ${messages.length} messages`);
              return true;
            }
          } else {
            console.log('ℹ️ No previous messages found for this conversation');
          }
        } else {
          console.warn(`⚠️ Failed to load messages: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('❌ Failed to load previous messages:', error);
      }
      return false;
    },
    
    // Get or create session ID (for current session only)
    getSessionId() {
      let sessionId = sessionStorage.getItem('wetechforu_session_id');
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now();
        sessionStorage.setItem('wetechforu_session_id', sessionId);
      }
      return sessionId;
    },
    
    // Get or create persistent visitor session ID (across tabs/devices)
    getVisitorSessionId() {
      const STORAGE_KEY = 'wetechforu_visitor_session_id';
      
      // ✅ Safari compatibility: Check if localStorage is available
      let storage = localStorage;
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
      } catch (e) {
        console.warn('⚠️ localStorage not available (Safari private mode?), using sessionStorage');
        storage = sessionStorage; // Fallback to sessionStorage for Safari private mode
      }
      
      let visitorSessionId = storage.getItem(STORAGE_KEY);
      if (!visitorSessionId) {
        visitorSessionId = 'visitor_' + Math.random().toString(36).substr(2, 12) + Date.now();
        try {
          storage.setItem(STORAGE_KEY, visitorSessionId);
          console.log('✅ Generated new visitorSessionId:', visitorSessionId);
        } catch (e) {
          console.warn('⚠️ Storage not available, using in-memory session ID');
          // If storage completely fails, use in-memory (will reset on page refresh)
          if (!this.state.tracking) this.state.tracking = {};
          if (!this.state.tracking.visitorSessionId) {
            this.state.tracking.visitorSessionId = visitorSessionId;
          }
          return this.state.tracking.visitorSessionId;
        }
      }
      return visitorSessionId;
    },
    
    // Send message to backend
    async sendMessageToBackend(message) {
      console.log('📨 sendMessageToBackend() called with:', message);
      console.log('🔑 Widget Key:', this.config.widgetKey);
      console.log('🔗 Backend URL:', this.config.backendUrl);
      
      // ✅ FIRST: Check for agent keywords BEFORE sending to backend (including "staff")
      const agentKeywords = ['agent', 'staff', 'human', 'person', 'live', 'real person', 'talk to someone', 'speak with', 'connect with agent', 'help from', 'representative', 'rep'];
      const messageLower = message.toLowerCase();
      const wantsAgent = agentKeywords.some(keyword => messageLower.includes(keyword));
      
      if (wantsAgent && !this.state.currentContactField && !this.state.contactInfoStep && !this.state.agentTookOver) {
        console.log('✅ Agent keyword detected, skipping backend and requesting agent directly');
        setTimeout(() => {
          this.requestLiveAgent();
        }, 300);
        return; // Don't send to backend
      }
      
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
        
        // ✅ Check if conversation has ended
        if (data.conversation_ended) {
          this.addBotMessage(data.message || '📞 This conversation has ended. A summary has been sent to your email.');
          this.state.conversationEnded = true;
          this.stopPollingForAgentMessages(); // Stop polling
          return;
        }
        
        // ✅ Check if agent has taken over conversation
        if (data.agent_handoff) {
          this.addBotMessage('👨‍💼 Your message has been sent to our team. An agent will respond shortly...');
          // Stop polling for bot, start polling for agent messages (including WhatsApp)
          this.state.agentTookOver = true;
          this.startPollingForAgentMessages(); // Start polling for agent replies (WhatsApp or portal)
          return;
        }
        
      // ✅ If intro form is not completed, check if form exists and block messages
      if (!this.state.introFlow.isComplete && this.state.introFlow.enabled) {
        // Check if form is actually displayed on the page
        const formExists = document.getElementById('wetechforu-intro-form') !== null;
        
        if (formExists) {
          // Form exists - remind user to complete it
          this.addBotMessage("Please complete the information form above first before sending a message. 😊");
          return; // Don't process the message
        } else {
          // Form doesn't exist but intro is enabled - show form now
          console.log('⚠️ Form not found but intro enabled - showing form');
          if (this.config.introQuestions && this.config.introQuestions.length > 0) {
            this.addBotMessage("Thank you for reaching out! 😊 Before I assist you better, please fill in the information below:");
            setTimeout(() => {
              this.showIntroForm(this.config.introQuestions.filter(q => q.enabled !== false));
            }, 300);
          }
          this.addBotMessage("Please complete the information form above first before sending a message. 😊");
          return;
        }
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
      if (this.state.pollingInterval) {
        console.log('⚠️ Already polling for agent messages');
        return; // Already polling
      }
      
      console.log('🔄 Starting polling for agent messages...');
      
      this.state.pollingInterval = setInterval(async () => {
        if (!this.state.conversationId) {
          console.log('⚠️ No conversation ID, stopping polling');
          this.stopPollingForAgentMessages();
          return;
        }
        
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
            
            if (newMessages.length > 0) {
              console.log(`📨 Found ${newMessages.length} new agent message(s)`);
            }
            
            newMessages.forEach(msg => {
              console.log('📨 Displaying agent message:', msg.message_text.substring(0, 50));
              this.addBotMessage(msg.message_text, true, msg.agent_name || 'Agent');
              this.state.displayedMessageIds.push(msg.id);
            });
          } else {
            console.error('Failed to fetch messages:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Failed to poll for messages:', error);
        }
      }, 3000); // Poll every 3 seconds (faster for WhatsApp)
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
        
        // ✅ Event-driven activity tracking with 120s visibility-gated heartbeat fallback
        this.startEventDrivenTracking();
        
        // Track initial page view
        this.trackPageView();
        
        // Listen for page changes (single page apps)
        this.setupPageChangeListener();
        
        // Track when page is about to close/unload
        window.addEventListener('beforeunload', () => this.stopTracking());
        window.addEventListener('pagehide', () => this.stopTracking());
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            // Page is hidden - send final activity update via sendBeacon
            this.sendActivityUpdate(true); // sendBeacon = true
          } else {
            // Page is visible - resume activity tracking
            this.resetVisibilityHeartbeat();
          }
        });
        
      } catch (error) {
        console.error('Failed to start visitor tracking:', error);
      }
    },
    
    // ✅ Event-driven activity tracking with visibility-gated heartbeat
    startEventDrivenTracking() {
      // Clear any existing interval
      if (this.state.tracking.heartbeatInterval) {
        clearInterval(this.state.tracking.heartbeatInterval);
      }
      
      // Track last activity time
      this.state.tracking.lastActivityTime = Date.now();
      this.state.tracking.lastVisibilityChange = Date.now();
      
      // ✅ Start visibility-gated heartbeat (only when page is visible)
      this.resetVisibilityHeartbeat();
      
      // ✅ Track user interactions (event-driven)
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      activityEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
          this.state.tracking.lastActivityTime = Date.now();
          // Send activity update immediately on interaction
          this.sendActivityUpdate(false);
        }, { passive: true });
      });
      
      console.log('✅ Event-driven activity tracking started');
    },
    
    // ✅ Reset visibility-gated heartbeat (120s when visible, pause when hidden)
    resetVisibilityHeartbeat() {
      // Clear existing interval
      if (this.state.tracking.heartbeatInterval) {
        clearInterval(this.state.tracking.heartbeatInterval);
        this.state.tracking.heartbeatInterval = null;
      }
      
      // Only start heartbeat if page is visible
      if (!document.hidden) {
        this.state.tracking.lastVisibilityChange = Date.now();
        
        // Send heartbeat every 120 seconds (2 minutes) when visible
        this.state.tracking.heartbeatInterval = setInterval(() => {
          // Only send if page is still visible and has been visible for at least 2 minutes
          if (!document.hidden) {
            const timeSinceVisibilityChange = Date.now() - this.state.tracking.lastVisibilityChange;
            if (timeSinceVisibilityChange >= 120000) { // 120 seconds
              this.sendActivityUpdate(false);
              console.log('💓 Visibility-gated heartbeat sent');
            }
          }
        }, 120000); // Check every 120 seconds
      }
    },
    
    // ✅ Send activity update (with sendBeacon option for page unload)
    async sendActivityUpdate(useSendBeacon = false) {
      const activityData = {
        session_id: this.state.tracking.sessionId,
        current_page_url: window.location.href,
        current_page_title: document.title,
        timestamp: new Date().toISOString()
      };
      
      if (useSendBeacon && navigator.sendBeacon) {
        // Use sendBeacon for reliable delivery on page unload
        const success = navigator.sendBeacon(
          `${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-session`,
          JSON.stringify(activityData)
        );
        if (success) {
          console.log('✅ Activity update sent via sendBeacon');
        }
      } else {
        // Use fetch for normal updates
        try {
          await fetch(`${this.config.backendUrl}/api/visitor-tracking/public/widget/${this.config.widgetKey}/track-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activityData)
          });
        } catch (error) {
          console.error('Activity update failed:', error);
        }
      }
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
      
      // ✅ Send final activity update via sendBeacon on page unload
      this.sendActivityUpdate(true); // sendBeacon = true
      
      // Track final page time
      if (this.state.tracking.lastPageUrl && this.state.tracking.pageStartTime) {
        const timeOnPage = Math.floor((Date.now() - this.state.tracking.pageStartTime) / 1000);
        
        // Use sendBeacon for reliable delivery on page unload
        if (navigator.sendBeacon) {
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
      }
      
      // Stop inactivity monitoring
      if (this.state.inactivityMonitorInterval) {
        clearInterval(this.state.inactivityMonitorInterval);
        this.state.inactivityMonitorInterval = null;
      }
      
      console.log('🛑 Visitor tracking stopped');
    },
    
    // ✅ Start inactivity monitoring (check every minute)
    startInactivityMonitoring(conversationId) {
      // Clear existing interval
      if (this.state.inactivityMonitorInterval) {
        clearInterval(this.state.inactivityMonitorInterval);
      }
      
      let hasShownWarning = false;
      
      // Check every 60 seconds (1 minute)
      this.state.inactivityMonitorInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            // Check if expired (only handle once)
            if (statusData.is_expired && !this.state.conversationExpired) {
              this.state.conversationExpired = true; // Mark as expired to prevent multiple triggers
              clearInterval(this.state.inactivityMonitorInterval);
              this.state.inactivityMonitorInterval = null;
              
              // Send email summary if email was provided (don't wait for it)
              if (statusData.visitor_email) {
                fetch(`${this.config.backendUrl}/api/chat-widget/conversations/${conversationId}/send-expiry-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                }).catch(emailError => {
                  console.warn('Failed to send expiry email:', emailError);
                });
              }
              
              // Notify and CLEAR previous messages for privacy
              const messagesDiv = document.getElementById('wetechforu-messages');
              this.addBotMessage('⏰ This conversation has been inactive for a while. I\'m turning off the chat here.');
              this.addBotMessage('🔒 For your privacy, I\'ll remove previous messages from this chat window.');
              if (statusData.visitor_email) {
                this.addBotMessage(`📧 A summary has been sent to ${statusData.visitor_email}, and shared with our agent if needed.`);
              } else {
                this.addBotMessage('📧 A summary has been shared with our agent if needed.');
              }

              if (messagesDiv) {
                setTimeout(() => {
                  messagesDiv.innerHTML = '';
                  const separator = document.createElement('div');
                  separator.style.cssText = `
                    text-align: center;
                    margin: 12px 0;
                    padding: 6px 0;
                    border-top: 1px solid #ddd;
                    border-bottom: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                    background: #f9f9f9;
                  `;
                  separator.textContent = '— Session Ended —';
                  messagesDiv.appendChild(separator);
                  this.addBotMessage('🔄 Let\'s start fresh! I\'ll ask you a few questions again to help you better.');
                }, 800);
              }

              // Clear conversation from localStorage
              localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);

              // Reset state
              this.state.conversationId = null;
              this.state.introFlow.isComplete = false;
              this.state.hasShownIntro = false;

              console.log('⏰ Conversation expired - reset and cleared');
            } else if (statusData.is_warning_threshold && !hasShownWarning) {
              // Show warning only once
              hasShownWarning = true;
              const minutesLeft = Math.max(0, 15 - statusData.minutes_inactive);
              this.addBotMessage(`⏰ This conversation has been inactive for ${statusData.minutes_inactive} minutes. If inactive for ${minutesLeft} more minute${minutesLeft !== 1 ? 's' : ''}, the chat will turn off and all history will be removed. ${statusData.visitor_email ? 'If you provided an email, we\'ll send you a summary.' : ''}`);
            }
          }
        } catch (error) {
          console.warn('Failed to check conversation inactivity:', error);
        }
      }, 60000); // Check every 60 seconds
      
      console.log('⏰ Inactivity monitoring started for conversation:', conversationId);
    }
  };

  // Expose to global scope
  window.WeTechForUWidget = WeTechForUWidget;
})();

