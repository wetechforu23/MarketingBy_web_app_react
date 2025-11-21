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
      pollingIntervalMs: 3000, // ✅ Current polling interval (starts at 3s, increases with backoff)
      consecutiveEmptyPolls: 0, // ✅ Track consecutive polls with no messages (for exponential backoff)
      agentTookOver: false, // ✅ NEW: Track if agent took over conversation
      conversationEnded: false, // ✅ Track if conversation has ended
      closedConversationId: null, // ✅ Track closed conversation ID for reopen
      closedConversationData: null, // ✅ Track closed conversation data for reopen
      clickOutsideListener: null, // ✅ Track click outside listener for cleanup
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
      // 📞 Voice calling state
      voiceCallingEnabled: false,
      callSettings: null,
      activeCallSid: null,
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
          console.log('🤖 Auto-popup enabled - showing bot in', this.config.autoPopupDelay, 'ms');
          setTimeout(() => {
            console.log('🔔 Auto-popup timeout fired - calling openChat()');
            this.openChat();
            
            // ✅ Double-check visibility after a short delay
            setTimeout(() => {
              const chatWindow = document.getElementById('wetechforu-chat-window');
              if (chatWindow) {
                const rect = chatWindow.getBoundingClientRect();
                const isVisible = getComputedStyle(chatWindow).display !== 'none' && 
                                 getComputedStyle(chatWindow).visibility !== 'hidden' &&
                                 rect.width > 0 && rect.height > 0;
                
                if (!isVisible) {
                  console.warn('⚠️ Widget not visible after auto-popup - forcing visibility');
                  chatWindow.style.setProperty('display', 'flex', 'important');
                  chatWindow.style.setProperty('visibility', 'visible', 'important');
                  chatWindow.style.setProperty('opacity', '1', 'important');
                  chatWindow.style.setProperty('z-index', '999998', 'important');
                } else {
                  console.log('✅ Widget is visible after auto-popup');
                }
              }
            }, 200);
          }, this.config.autoPopupDelay || 1000);
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
        
        // Check if voice calling is enabled and show/hide call button
        this.checkVoiceCallingEnabled();
      } catch (error) {
        console.error('Failed to load widget config:', error);
        // Continue with default config
      }
    },
    
    // Check if voice calling is enabled for this widget
    async checkVoiceCallingEnabled() {
      try {
        // Get widget ID from config
        let widgetId = this.config.widgetId;
        if (!widgetId) {
          try {
            const configResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
            if (configResponse.ok) {
              const widgetConfig = await configResponse.json();
              widgetId = widgetConfig.id || widgetConfig.widget_id;
              this.config.widgetId = widgetId;
            }
          } catch (error) {
            console.warn('Could not get widget ID for voice calling check:', error);
            return;
          }
        }
        
        if (!widgetId) return;
        
        const response = await fetch(`${this.config.backendUrl}/api/twilio/voice/widgets/${widgetId}/settings`);
        if (response.ok) {
          const settings = await response.json();
          if (settings.enable_voice_calling) {
            const callButton = document.getElementById('wetechforu-call-button');
            if (callButton) {
              callButton.style.display = 'flex';
              this.state.voiceCallingEnabled = true;
              this.state.callSettings = settings;
              console.log('✅ Voice calling enabled - call button shown');
            }
          }
        }
      } catch (error) {
        // Voice calling not configured or not available - hide button
        const callButton = document.getElementById('wetechforu-call-button');
        if (callButton) {
          callButton.style.display = 'none';
        }
        console.log('ℹ️ Voice calling not available for this widget');
      }
    },
    
    // Initiate a voice call
    async initiateCall() {
      try {
        const callButton = document.getElementById('wetechforu-call-button');
        if (callButton) {
          callButton.disabled = true;
          callButton.style.opacity = '0.6';
        }
        
        // Get visitor phone number from form data
        const phone = this.state.introFlow?.answers?.phone || 
                     this.state.introFlow?.answers?.phone_number ||
                     this.state.contactInfo?.phone;
        
        if (!phone) {
          this.addBotMessage('📞 Please provide your phone number in the form to make a call.');
          if (callButton) {
            callButton.disabled = false;
            callButton.style.opacity = '1';
          }
          return;
        }
        
        // Get agent phone from call settings
        const agentPhone = this.state.callSettings?.default_agent_phone;
        if (!agentPhone) {
          this.addBotMessage('📞 Sorry, no agent is available to take your call right now.');
          if (callButton) {
            callButton.disabled = false;
            callButton.style.opacity = '1';
          }
          return;
        }
        
        this.addBotMessage('📞 Initiating call... Please wait.');
        
        // Get widget ID
        let widgetId = this.config.widgetId;
        if (!widgetId) {
          try {
            const configResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
            if (configResponse.ok) {
              const widgetConfig = await configResponse.json();
              widgetId = widgetConfig.id || widgetConfig.widget_id;
            }
          } catch (error) {
            console.error('Failed to get widget ID:', error);
          }
        }
        
        // Initiate call via API
        const response = await fetch(`${this.config.backendUrl}/api/twilio/voice/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            widgetId: widgetId,
            conversationId: this.state.conversationId,
            fromNumber: phone.replace(/\D/g, ''), // Remove non-digits
            toNumber: agentPhone.replace(/\D/g, ''),
            callerName: this.state.introFlow?.answers?.name || 
                       this.state.introFlow?.answers?.first_name ||
                       'Customer',
            recordingEnabled: this.state.callSettings?.enable_call_recording || false,
            transcriptionEnabled: this.state.callSettings?.enable_call_transcription || false
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.callSid) {
          this.addBotMessage(`📞 Call initiated! You should receive a call shortly. Call ID: ${result.callSid.substring(0, 12)}...`);
          this.state.activeCallSid = result.callSid;
        } else {
          this.addBotMessage(`📞 Failed to initiate call: ${result.error || 'Unknown error'}`);
        }
        
        if (callButton) {
          callButton.disabled = false;
          callButton.style.opacity = '1';
        }
      } catch (error) {
        console.error('Error initiating call:', error);
        this.addBotMessage('📞 Sorry, there was an error initiating the call. Please try again later.');
        const callButton = document.getElementById('wetechforu-call-button');
        if (callButton) {
          callButton.disabled = false;
          callButton.style.opacity = '1';
        }
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
            position: fixed !important;
            ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex !important;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            animation: pulse 2s infinite;
            z-index: 999999 !important;
            overflow: visible !important;
            clip: auto !important;
            clip-path: none !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
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
            position: fixed;
            ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            bottom: 20px;
            width: 100%;
            max-width: 380px;
            height: 600px;
            max-height: calc(100vh - 40px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
            cursor: default;
            z-index: 999998;
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
                  <div style="font-size: 12px; opacity: 0.9;" id="wetechforu-status">
                    Online <span id="wetechforu-conversation-id" style="opacity: 0.7; margin-left: 6px; font-family: monospace; font-size: 11px;"></span>
                  </div>
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
              cursor: default;
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
            
            <!-- ✅ REMOVED: Resize handle - Widget is fixed size (Industry Standard) -->

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
              <!-- Call Button (if voice calling is enabled) -->
              <button id="wetechforu-call-button" style="
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #25D366;
                border: none;
                color: white;
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-size: 18px;
              " title="Call us">📞</button>
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

            <!-- Tab Navigation (Below input box) -->
            <div id="wetechforu-tab-navigation" style="
              background: white;
              border-top: 1px solid #e0e0e0;
              padding: 12px 20px;
              display: flex;
              justify-content: space-around;
              gap: 20px;
            ">
              <button id="wetechforu-tab-home-main" class="wetechforu-tab-btn" style="
                flex: 1;
                background: transparent;
                border: none;
                color: #666;
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s;
              " title="Home">🏠</button>
              <button id="wetechforu-tab-conversation-main" class="wetechforu-tab-btn active" style="
                flex: 1;
                background: #f5f5f5;
                border: none;
                color: ${this.config.primaryColor};
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.2s;
              " title="Conversation">💬</button>
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

          #wetechforu-chat-button {
            overflow: visible !important;
            clip: auto !important;
            clip-path: none !important;
            max-width: none !important;
            max-height: none !important;
            min-width: 60px !important;
            min-height: 60px !important;
          }
          
          #wetechforu-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
          }
          
          /* ✅ Ensure button is always fully visible - prevent clipping */
          /* ✅ CRITICAL: Always allow body/html scrolling - never disable it */
          body, html {
            overflow-x: visible !important;
            overflow-y: auto !important;
          }
          
          /* ✅ Prevent parent containers from clipping the button */
          * {
            overflow-x: visible !important;
          }
          
          /* ✅ Ensure body scrolling is never disabled when chat is open */
          body.wetechforu-chat-open,
          html.wetechforu-chat-open {
            overflow-y: auto !important;
            position: relative !important;
          }
          
          @media (max-width: 768px) {
            #wetechforu-chat-button {
              right: 15px !important;
              bottom: 15px !important;
              width: 56px !important;
              height: 56px !important;
            }
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
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
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
          
          /* Resize handle - ✅ Top-left corner (Industry Standard) - More visible */
          .wetechforu-resize-handle {
            position: absolute;
            top: 0;
            left: 0;
            width: 40px;
            height: 40px;
            cursor: nwse-resize !important;
            background: rgba(0,0,0,0.08);
            border-bottom-right-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 1001;
            color: ${this.config.primaryColor || '#4682B4'};
            pointer-events: auto;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .wetechforu-resize-handle:hover {
            background: rgba(0,0,0,0.15);
            transform: scale(1.15);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          
          .wetechforu-resize-handle svg {
            width: 18px;
            height: 18px;
            opacity: 0.7;
          }
          
          .wetechforu-resize-handle:hover svg {
            opacity: 1;
          }
          
          /* ✅ Resize handles - only show cursor on edges */
          .wetechforu-resize-right,
          .wetechforu-resize-left {
            cursor: ew-resize !important;
            pointer-events: auto;
          }
          
          .wetechforu-resize-top,
          .wetechforu-resize-bottom {
            cursor: ns-resize !important;
            pointer-events: auto;
          }
          
          /* ✅ Ensure main widget doesn't change cursor */
          #wetechforu-chat-window {
            cursor: default !important;
          }
          
          #wetechforu-chat-window * {
            cursor: inherit;
          }
          
          /* ✅ Restore normal cursors for interactive elements */
          #wetechforu-input,
          #wetechforu-send-button,
          button,
          a {
            cursor: pointer !important;
          }
          
          input[type="text"],
          textarea {
            cursor: text !important;
          }
          
          #wetechforu-minimize-button:hover,
          #wetechforu-close-button:hover {
            background: rgba(255,255,255,0.3);
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

      // ✅ Ensure chat button is visible and clickable - Industry Standard Approach
      if (chatButton) {
        // ✅ Force button visibility and clickability
        chatButton.style.setProperty('display', 'flex', 'important');
        chatButton.style.setProperty('z-index', '999999', 'important');
        chatButton.style.setProperty('pointer-events', 'auto', 'important');
        chatButton.style.setProperty('cursor', 'pointer', 'important');
        chatButton.style.setProperty('position', 'fixed', 'important');
        chatButton.style.setProperty('visibility', 'visible', 'important');
        chatButton.style.setProperty('opacity', '1', 'important');
        
        // ✅ Remove any existing listeners to prevent duplicates
        const newButton = chatButton.cloneNode(true);
        chatButton.parentNode.replaceChild(newButton, chatButton);
        
        // ✅ Add click listener with explicit handling - Multiple event types for reliability
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('🖱️ Chat button clicked - opening chat');
          
          // ✅ Force open chat (don't toggle if already open)
          if (!this.state.isOpen) {
            console.log('🔓 Chat is closed - opening now');
            this.openChat();
          } else {
            console.log('ℹ️ Chat already open');
          }
        };
        
        // ✅ Use both capture and bubble phases for maximum reliability
        newButton.addEventListener('click', handleClick, true); // Capture phase
        newButton.addEventListener('click', handleClick, false); // Bubble phase
        newButton.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, true);
        
        // ✅ Also handle touch events for mobile
        newButton.addEventListener('touchend', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick(e);
        }, true);
        
        console.log('✅ Chat button event listener attached (multiple phases for reliability)');
      } else {
        console.error('❌ Chat button not found - widget may not work');
      }
      closeButton.addEventListener('click', () => this.closeChat());
      minimizeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header drag
        this.minimizeChat();
      });
      sendButton.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
      
      // Call button event listener
      const callButton = document.getElementById('wetechforu-call-button');
      if (callButton) {
        callButton.addEventListener('click', () => this.initiateCall());
      }
      
      // Tab navigation listeners
      const tabHomeMain = document.getElementById('wetechforu-tab-home-main');
      const tabConversationMain = document.getElementById('wetechforu-tab-conversation-main');
      
      if (tabHomeMain) {
        tabHomeMain.addEventListener('click', () => this.switchTab('home'));
      }
      
      if (tabConversationMain) {
        tabConversationMain.addEventListener('click', () => this.switchTab('conversation'));
      }
      
      // ✅ REMOVED: Drag and resize functionality (Industry Standard - Fixed Position)
      // Widget stays in fixed position, responsive sizing only
      
      // ✅ REMOVED: Click outside to minimize (causes issues - Industry Standard doesn't minimize on click inside)
      
      // ✅ Load saved position and size
      this.loadWidgetPosition(chatWindow);
    },
    
    // Make widget draggable from anywhere (not just header)
    makeDraggable(element) {
      const header = element.querySelector('div'); // First div is header
      let isDragging = false;
      let startX, startY, startLeft, startBottom;
      let dragStartElement = null; // Track where drag started
      
      // ✅ Make entire widget draggable (not just header)
      const startDrag = (e) => {
        // Don't drag if clicking on buttons, inputs, or resize handles
        if (e.target.id.includes('button') || 
            e.target.id === 'wetechforu-input' ||
            e.target.closest('.wetechforu-resize-handle') ||
            e.target.closest('.wetechforu-resize-right') ||
            e.target.closest('.wetechforu-resize-bottom') ||
            e.target.closest('.wetechforu-resize-left') ||
            e.target.closest('.wetechforu-resize-top')) {
          return;
        }
        
        isDragging = true;
        dragStartElement = e.target;
        element.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startBottom = window.innerHeight - rect.bottom;
        
        element.style.cursor = 'move';
        e.preventDefault();
      };
      
      // Allow dragging from header (most common)
      header.addEventListener('mousedown', startDrag);
      
      // ✅ Also allow dragging from anywhere in the widget (but not from interactive elements)
      element.addEventListener('mousedown', (e) => {
        // Only allow dragging from non-interactive areas
        const interactiveElements = ['input', 'button', 'a', 'textarea', 'select'];
        if (interactiveElements.includes(e.target.tagName.toLowerCase())) {
          return;
        }
        // Allow dragging from message area, header, etc.
        if (e.target.id === 'wetechforu-messages' || 
            e.target.closest('#wetechforu-messages') ||
            e.target === header ||
            e.target.closest('div') === header) {
          startDrag(e);
        }
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
        
        const finalLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const finalBottom = Math.max(0, Math.min(newBottom, maxBottom));
        
        element.style.left = finalLeft + 'px';
        element.style.bottom = finalBottom + 'px';
        element.style.right = 'auto'; // Override right positioning
        
        // ✅ Ensure widget stays within viewport while dragging
        this.ensureWidgetInViewport(element);
        
        // ✅ Save position to localStorage
        this.saveWidgetPosition(element);
      });
      
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          element.classList.remove('dragging');
          element.style.cursor = '';
          dragStartElement = null;
          
          // ✅ Save position after drag ends
          this.saveWidgetPosition(element);
        }
      });
    },
    
    // ✅ Save widget position and size to localStorage
    saveWidgetPosition(element) {
      try {
        const position = {
          left: element.style.left || null,
          bottom: element.style.bottom || null,
          right: element.style.right || null,
          width: element.style.width || null,
          height: element.style.height || null,
        };
        localStorage.setItem(`wetechforu_widget_position_${this.config.widgetKey}`, JSON.stringify(position));
      } catch (e) {
        console.warn('Could not save widget position:', e);
      }
    },
    
    // ✅ Load widget position from localStorage
    loadWidgetPosition(element) {
      try {
        const saved = localStorage.getItem(`wetechforu_widget_position_${this.config.widgetKey}`);
        if (saved) {
          const position = JSON.parse(saved);
          
          // ✅ Restore size first
          if (position.width) element.style.width = position.width;
          if (position.height) element.style.height = position.height;
          
          // ✅ Restore position (prioritize left/bottom, then right)
          if (position.left) {
            element.style.left = position.left;
            element.style.right = 'auto';
          } else if (position.right) {
            element.style.right = position.right;
            element.style.left = 'auto';
          }
          
          if (position.bottom) {
            element.style.bottom = position.bottom;
            element.style.top = 'auto';
          } else if (position.top) {
            element.style.top = position.top;
            element.style.bottom = 'auto';
          }
          
          
          console.log('✅ Restored widget position and size');
        }
      } catch (e) {
        console.warn('Could not load widget position:', e);
      }
    },
    
    // ✅ Reset widget to safe position if it's in an invalid state
    resetWidgetPosition(element) {
      if (!element) return;
      
      // ✅ Reset to default safe position (bottom-right or bottom-left)
      const isRight = this.config.position.includes('right');
      element.style.width = '380px';
      element.style.height = '600px';
      element.style.bottom = '80px';
      element.style.top = 'auto';
      
      if (isRight) {
        element.style.right = '20px';
        element.style.left = 'auto';
      } else {
        element.style.left = '20px';
        element.style.right = 'auto';
      }
      
      // ✅ Clear saved position to force reset
      localStorage.removeItem(`wetechforu_widget_position_${this.config.widgetKey}`);
      localStorage.removeItem(`wetechforu_widget_size_${this.config.widgetKey}`);
      
      // ✅ Force visibility
      element.style.setProperty('display', 'flex', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('z-index', '999998', 'important');
      
      console.log('✅ Widget position reset to safe default');
    },
    
    // ✅ Ensure widget is within viewport bounds
    ensureWidgetInViewport(element) {
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let needsAdjustment = false;
      let newLeft = element.style.left ? parseFloat(element.style.left) : null;
      let newBottom = element.style.bottom ? parseFloat(element.style.bottom) : null;
      
      // Check if widget goes off right edge
      if (rect.right > viewportWidth) {
        newLeft = viewportWidth - rect.width - 20; // 20px padding
        needsAdjustment = true;
      }
      
      // Check if widget goes off left edge
      if (rect.left < 0) {
        newLeft = 20; // 20px padding
        needsAdjustment = true;
      }
      
      // Check if widget goes off top edge
      if (rect.top < 0) {
        newBottom = viewportHeight - rect.height - 20; // 20px padding
        needsAdjustment = true;
      }
      
      // Check if widget goes off bottom edge
      if (rect.bottom > viewportHeight) {
        newBottom = 80; // Keep above badge
        needsAdjustment = true;
      }
      
      if (needsAdjustment) {
        if (newLeft !== null) {
          element.style.left = newLeft + 'px';
          element.style.right = 'auto';
        }
        if (newBottom !== null) {
          element.style.bottom = newBottom + 'px';
          element.style.top = 'auto';
        }
        console.log('✅ Adjusted widget position to stay within viewport');
        this.saveWidgetPosition(element);
      }
    },
    
    // ✅ REMOVED: makeResizable() - Widget is fixed size with responsive breakpoints (Industry Standard)
    // Function removed - widget uses fixed positioning with responsive CSS
    
    // ✅ REMOVED: Click outside to minimize (causes issues - Industry Standard doesn't minimize on click inside)
    // Widget stays open until explicitly closed by user
    
    // ✅ Minimize chat (preserve conversation state - can be reopened)
    minimizeChat() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      const badge = document.getElementById('wetechforu-badge');
      const chatButton = document.getElementById('wetechforu-chat-button');
      
      if (!chatWindow) return;
      
      // ✅ CRITICAL: Ensure body/html scrolling remains enabled
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.classList.remove('wetechforu-chat-open');
      document.documentElement.classList.remove('wetechforu-chat-open');
      
      chatWindow.style.display = 'none';
      
      // ✅ Ensure badge and button are visible and clickable when minimized
      if (badge) {
        badge.style.display = 'flex';
        badge.textContent = '1'; // Reset badge
      }
      
      if (chatButton) {
        // ✅ Show chat button only when minimized
        chatButton.style.display = 'flex';
        chatButton.style.visibility = 'visible';
        chatButton.style.opacity = '1';
        chatButton.style.zIndex = '999999';
        chatButton.style.pointerEvents = 'auto';
        chatButton.style.cursor = 'pointer';
      }
      
      this.state.isOpen = false;
      
      // ✅ DO NOT clear conversation or localStorage - preserve state
      // ✅ DO NOT mark as closed - allow reopening by clicking badge
      // ✅ DO NOT set sessionStorage closed flag - so it can reopen
      console.log('📦 Chat minimized - conversation state preserved, can reopen by clicking badge or button');
      
      // ✅ Stop polling when minimized (will resume on reopen with faster interval)
      this.stopPollingForAgentMessages();
    },

    // Toggle chat window
    toggleChat() {
      if (this.state.isOpen) {
        // If open, minimize (don't close with confirmation)
        this.minimizeChat();
      } else {
        // If closed/minimized, open and restore conversation
        this.openChat();
      }
    },

    // Open chat
    async openChat() {
      const chatWindow = document.getElementById('wetechforu-chat-window');
      const badge = document.getElementById('wetechforu-badge');
      const chatButton = document.getElementById('wetechforu-chat-button');
      
      if (!chatWindow) {
        console.error('❌ Chat window not found');
        return;
      }
      
      // ✅ CRITICAL: Ensure body/html scrolling is always enabled
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.classList.add('wetechforu-chat-open');
      document.documentElement.classList.add('wetechforu-chat-open');
      
      // ✅ Hide chat button when chat is open (only show when minimized)
      if (chatButton) {
        chatButton.style.display = 'none';
        chatButton.style.visibility = 'hidden';
      }
      
      console.log('🔍 Opening chat - current state:', {
        display: chatWindow.style.display,
        visibility: chatWindow.style.visibility,
        opacity: chatWindow.style.opacity,
        zIndex: chatWindow.style.zIndex,
        isOpen: this.state.isOpen
      });
      
      // ✅ Ensure chat window is visible and properly positioned - Force all styles
      chatWindow.style.setProperty('display', 'flex', 'important');
      chatWindow.style.setProperty('visibility', 'visible', 'important');
      chatWindow.style.setProperty('opacity', '1', 'important');
      chatWindow.style.setProperty('z-index', '999998', 'important');
      chatWindow.style.setProperty('pointer-events', 'auto', 'important');
      chatWindow.style.setProperty('position', 'absolute', 'important');
      
      // ✅ Remove any inline styles that might hide it
      chatWindow.style.removeProperty('transform');
      chatWindow.style.removeProperty('clip');
      chatWindow.style.removeProperty('clip-path');
      
      if (badge) {
        badge.style.display = 'none';
        badge.textContent = '1'; // Reset badge
      }
      
      this.state.isOpen = true;
      
      // ✅ Update conversation ID display in header
      this.updateConversationIdDisplay();
      
      // ✅ Set responsive size based on device (Industry Standard)
      const setResponsiveSize = () => {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        if (isMobile) {
          // Mobile: Full width minus padding, max height
          chatWindow.style.width = 'calc(100vw - 40px)';
          chatWindow.style.height = 'calc(100vh - 40px)';
          chatWindow.style.maxHeight = 'calc(100vh - 40px)';
          chatWindow.style.bottom = '20px';
          chatWindow.style.left = '20px';
          chatWindow.style.right = '20px';
        } else if (isTablet) {
          // Tablet: Medium size
          chatWindow.style.width = '400px';
          chatWindow.style.height = '650px';
          chatWindow.style.maxHeight = 'calc(100vh - 40px)';
        } else {
          // Desktop: Standard size
          chatWindow.style.width = '380px';
          chatWindow.style.height = '600px';
          chatWindow.style.maxHeight = 'calc(100vh - 40px)';
        }
        
        // ✅ Fixed position (no dragging)
        const isRight = this.config.position.includes('right');
        chatWindow.style.position = 'fixed';
        if (isRight) {
          chatWindow.style.right = '20px';
          chatWindow.style.left = 'auto';
        } else {
          chatWindow.style.left = '20px';
          chatWindow.style.right = 'auto';
        }
        chatWindow.style.bottom = '20px';
        chatWindow.style.top = 'auto';
      };
      
      setResponsiveSize();
      
      // ✅ Update size on window resize
      window.addEventListener('resize', () => {
        if (this.state.isOpen) {
          setResponsiveSize();
        }
      });
      
      // ✅ Force visibility with !important
      chatWindow.style.setProperty('display', 'flex', 'important');
      chatWindow.style.setProperty('visibility', 'visible', 'important');
      chatWindow.style.setProperty('opacity', '1', 'important');
      chatWindow.style.setProperty('z-index', '999998', 'important');
      chatWindow.style.setProperty('pointer-events', 'auto', 'important');
      
      // ✅ Ensure input field is enabled and focusable
      const input = document.getElementById('wetechforu-input');
      if (input) {
        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';
        input.style.opacity = '1';
        // Focus input after a short delay to ensure widget is fully rendered
        setTimeout(() => {
          input.focus();
        }, 100);
      }
      
      console.log('✅ Chat opened - widget should be visible');
      
      // ✅ Load existing messages when chat opens (if conversation exists)
      // Note: loadPreviousMessages is called later in the conversation restore logic
      // No need to call it here - it will be called automatically when conversation is found
      
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
                this.updateConversationIdDisplay(); // Update header display
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
      // ✅ IMPORTANT: Don't show intro form again if conversation was restored and intro was already completed
      if (!conversationRestored || !hasMessages) {
        // Check if intro was already completed before showing form again
        const conversationId = await this.ensureConversation();
        let introAlreadyCompleted = false;
        
        if (conversationId) {
          try {
            const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.intro_completed) {
                introAlreadyCompleted = true;
                this.state.introFlow.isComplete = true;
                this.state.hasShownIntro = true;
                console.log('✅ Intro already completed for this conversation - skipping form');
                
                // Show summary if data exists (but only if no messages were loaded)
                if (statusData.intro_data && !hasMessages) {
                  this.state.introFlow.answers = statusData.intro_data;
                  setTimeout(() => {
                    this.showFormSummary(statusData.intro_data);
                    setTimeout(() => {
                      this.addBotMessage("How can I help you today? Feel free to ask me anything! 😊");
                    }, 1000);
                  }, 500);
                } else if (statusData.intro_data && hasMessages) {
                  // Just restore the data silently, don't show summary or message
                  this.state.introFlow.answers = statusData.intro_data;
                } else {
                  // Just show welcome message
                  setTimeout(() => {
                    this.startDefaultIntroFlow();
                  }, 500);
                }
              }
            }
          } catch (error) {
            console.warn('Could not check intro status:', error);
          }
        }
        
        // Only show intro flow if it wasn't already completed
        if (!introAlreadyCompleted) {
          // For new conversations, show standardized initial view
          console.log('🎉 New conversation or no messages - showing standardized initial view');
          
          // Show standardized initial view (with search and new conversation)
          setTimeout(() => {
            this.showStandardizedInitialView();
          }, 300);
        }
      } else {
        // Conversation was restored with messages - check if we should still show something
        const hasShownWelcome = sessionStorage.getItem(`wetechforu_welcome_shown_${this.config.widgetKey}`);
        if (!hasShownWelcome) {
          // Even though we restored messages, if this is first time in this session, 
          // we've already shown "Welcome back!" in loadPreviousMessages()
          sessionStorage.setItem(`wetechforu_welcome_shown_${this.config.widgetKey}`, 'true');
        }
        
        // ✅ If conversation was restored with messages, also restore intro data silently
        if (conversationRestored && hasMessages) {
          try {
            const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${this.state.conversationId}/status`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.intro_data) {
                this.state.introFlow.answers = statusData.intro_data;
                this.state.introFlow.isComplete = true;
                this.state.hasShownIntro = true;
                console.log('✅ Silently restored intro data for conversation with messages');
              }
            }
          } catch (error) {
            console.warn('Could not restore intro data:', error);
          }
        }
      }

      // Focus input
      setTimeout(() => {
        document.getElementById('wetechforu-input').focus();
      }, 300);
      
      // 📨 Start polling for agent messages (only if agent handoff is active)
      if (this.state.agentTookOver) {
      this.startPollingForAgentMessages();
      }
      
      // ✅ Resume polling when chat is reopened (if agent handoff was active)
      // Reset backoff to fast polling when user returns
      if (this.state.agentTookOver && !this.state.pollingInterval) {
        this.state.pollingIntervalMs = 3000;
        this.state.consecutiveEmptyPolls = 0;
        this.startPollingForAgentMessages();
      }
    },

    // Close chat with combined confirmation and email (Industry Standard)
    async closeChat() {
      // Check if there's an active conversation
      const conversationId = this.state.conversationId;
      if (!conversationId) {
        // No conversation - just close
        this.performClose();
        return;
      }

      // ✅ Combined: Show confirmation dialog with email option (Industry Standard)
      const closeResult = await this.showCloseConfirmationWithEmail();
      if (!closeResult.close) {
        return; // User cancelled
      }

      let emailToSend = closeResult.email || null;

      if (closeResult.sendEmail && !emailToSend) {
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
          body: JSON.stringify({ send_email: closeResult.sendEmail, email: emailToSend })
        });
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }

      // Perform close
      this.performClose();
    },

    // Show close confirmation dialog - ✅ FIX: Small popup inside chat widget instead of full-screen
    // ✅ Combined close confirmation with email option (Industry Standard)
    showCloseConfirmationWithEmail() {
      return new Promise((resolve) => {
      const chatWindow = document.getElementById('wetechforu-chat-window');
        const messagesContainer = document.getElementById('wetechforu-messages');
        
        if (!chatWindow || !messagesContainer) {
          resolve({ close: false, sendEmail: false, email: null });
          return;
        }

        // ✅ Get existing email from form/intro flow
        const existingEmail = this.state.introFlow?.answers?.email || 
                             this.state.introFlow?.answers?.email_address ||
                             this.state.contactInfo?.email;

        // Create overlay inside chat window
        const overlay = document.createElement('div');
        overlay.id = 'wetechforu-close-overlay';
        overlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          border-radius: 16px;
        `;

        // ✅ Create combined popup with close confirmation + email option (Industry Standard)
        const popup = document.createElement('div');
        popup.style.cssText = `
          background: white;
          border-radius: 12px;
          padding: 20px;
          max-width: 320px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: slideUp 0.2s ease-out;
        `;

        popup.innerHTML = '<h3 style="margin-top: 0; color: rgb(51, 51, 51); font-size: 16px; margin-bottom: 12px;">⚠️ Close Chat?</h3>' +
          '<p style="color: rgb(102, 102, 102); font-size: 13px; line-height: 1.5; margin-bottom: 16px;">' +
          'You will <strong>lose all chat history</strong> in this window.</p>' +
          '<div style="margin-bottom: 16px;">' +
          '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: rgb(51, 51, 51);">' +
          '<input type="checkbox" id="send-email-checkbox" style="width: 16px; height: 16px; cursor: pointer;" ' + (existingEmail ? 'checked' : '') + ' />' +
          '<span>📧 Send conversation summary via email</span></label></div>' +
          '<div id="email-input-container" style="display: ' + (existingEmail ? 'none' : 'block') + '; margin-bottom: 16px;">' +
          '<input type="email" id="email-input" placeholder="Enter your email..." value="' + (existingEmail || '') + '" style="width: 100%; padding: 8px 12px; border: 2px solid rgb(224, 224, 224); border-radius: 6px; font-size: 13px; outline: none;" /></div>' +
          '<div style="display: flex; gap: 8px; justify-content: flex-end;">' +
          '<button id="close-cancel" style="padding: 8px 16px; border: 2px solid rgb(224, 224, 224); border-radius: 6px; background: white; color: rgb(51, 51, 51); cursor: pointer; font-size: 13px; font-weight: 600;">Cancel</button>' +
          '<button id="close-confirm" style="padding: 8px 16px; border: none; border-radius: 6px; background: rgb(220, 53, 69); color: white; cursor: pointer; font-size: 13px; font-weight: 600;">Close</button></div>';

        overlay.appendChild(popup);
        chatWindow.appendChild(overlay);

        // Make chat window position relative if not already
        if (getComputedStyle(chatWindow).position === 'static') {
          chatWindow.style.position = 'relative';
        }

        const cleanup = () => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        };

        // ✅ Toggle email input visibility
        const emailCheckbox = popup.querySelector('#send-email-checkbox');
        const emailInputContainer = popup.querySelector('#email-input-container');
        const emailInput = popup.querySelector('#email-input');
        
        emailCheckbox.addEventListener('change', () => {
          emailInputContainer.style.display = emailCheckbox.checked ? 'block' : 'none';
          if (!emailCheckbox.checked) {
            emailInput.value = '';
          }
        });

        popup.querySelector('#close-cancel').addEventListener('click', () => {
          cleanup();
          resolve({ close: false, sendEmail: false, email: null });
        });

        popup.querySelector('#close-confirm').addEventListener('click', () => {
          const sendEmail = emailCheckbox.checked;
          const email = sendEmail ? (emailInput.value.trim() || existingEmail || null) : null;
          
          // ✅ Validate email if checkbox is checked
          if (sendEmail && !email) {
            emailInput.style.borderColor = 'rgb(220, 53, 69)';
            emailInput.focus();
            return;
          }
          
          cleanup();
          resolve({ close: true, sendEmail, email });
        });

        // Close on overlay click (outside popup)
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            cleanup();
            resolve({ close: false, sendEmail: false, email: null });
          }
        });
      });
    },
    
    // ✅ Ask for email (if not provided in combined dialog)
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

        modal.innerHTML = '<div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">' +
          '<h3 style="margin-top: 0; color: rgb(51, 51, 51); font-size: 18px; margin-bottom: 12px;">📧 Enter Your Email</h3>' +
          '<p style="color: rgb(102, 102, 102); font-size: 14px; line-height: 1.6; margin-bottom: 20px;">' +
          'Please enter your email address to receive the conversation summary:</p>' +
          '<input type="email" id="email-modal-input" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 2px solid rgb(224, 224, 224); border-radius: 6px; font-size: 14px; margin-bottom: 20px; outline: none;" />' +
          '<div style="display: flex; gap: 12px; justify-content: flex-end;">' +
          '<button id="email-skip" style="padding: 10px 20px; border: 2px solid rgb(224, 224, 224); border-radius: 6px; background: white; color: rgb(51, 51, 51); cursor: pointer; font-size: 14px; font-weight: 600;">Skip</button>' +
          '<button id="email-send" style="padding: 10px 20px; border: none; border-radius: 6px; background: rgb(46, 134, 171); color: white; cursor: pointer; font-size: 14px; font-weight: 600;">Send</button></div></div>';

        document.body.appendChild(modal);
        const emailInput = modal.querySelector('#email-modal-input');
        emailInput.focus();

        const cleanup = () => {
          if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }
        };

        modal.querySelector('#email-skip').addEventListener('click', () => {
          cleanup();
          resolve(null);
        });

        modal.querySelector('#email-send').addEventListener('click', () => {
          const email = emailInput.value.trim();
          if (email && email.includes('@')) {
            cleanup();
            resolve(email);
          } else {
            emailInput.style.borderColor = 'rgb(220, 53, 69)';
            emailInput.focus();
          }
        });

        emailInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            modal.querySelector('#email-send').click();
          }
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            cleanup();
            resolve(null);
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
      const badge = document.getElementById('wetechforu-badge');
      const chatButton = document.getElementById('wetechforu-chat-button');
      
      // ✅ CRITICAL: Ensure body/html scrolling remains enabled
      document.body.style.overflowY = 'auto';
      document.documentElement.style.overflowY = 'auto';
      document.body.classList.remove('wetechforu-chat-open');
      document.documentElement.classList.remove('wetechforu-chat-open');
      
      chatWindow.style.display = 'none';
      badge.style.display = 'flex';
      this.state.isOpen = false;
      
      // ✅ Restore chat button visibility when chat is closed
      if (chatButton) {
        chatButton.style.display = 'flex';
        chatButton.style.visibility = 'visible';
        chatButton.style.opacity = '1';
        chatButton.style.zIndex = '999999';
        chatButton.style.pointerEvents = 'auto';
        chatButton.style.cursor = 'pointer';
      }
      
      // ✅ Clear conversation from localStorage (only on explicit close, not minimize)
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
                      // Scroll to top to show first messages
                      setTimeout(() => {
                        this.scrollToTop();
                      }, 100);
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
            
            // ✅ NEW FLOW: Show form directly (no welcome message, no waiting)
            if (!formDataExists) {
              // Show form immediately
              this.state.introFlow.enabled = true;
              this.state.introFlow.questions = enabledQuestions;
              console.log('✅ Showing form directly');
              setTimeout(() => {
                this.showIntroForm(enabledQuestions);
              }, 300);
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

    // Default intro flow (no questions) - Show standardized initial view
    startDefaultIntroFlow() {
      // Show standardized initial view with search and new conversation
      this.showStandardizedInitialView();
    },
    
    // Show standardized initial view (Industry Standard)
    showStandardizedInitialView() {
      const messagesContainer = document.getElementById('wetechforu-messages');
      messagesContainer.innerHTML = ''; // Clear any existing messages
      
      const initialViewHTML = `
        <div id="wetechforu-initial-view" style="
          padding: 0;
          background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
          color: white;
          min-height: 100%;
          display: flex;
          flex-direction: column;
        ">
          <!-- Header -->
          <div style="padding: 16px 16px 12px 16px;">
            <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 600;">Hi there 👋</h2>
            <p style="margin: 0; font-size: 12px; opacity: 0.9; line-height: 1.4;">Need help? Search our knowledge base for answers or start a conversation:</p>
          </div>
          
          <!-- Content Cards -->
          <div style="flex: 1; padding: 0 16px 12px 16px; overflow-y: auto; min-height: 0;">
            <!-- Search Section -->
            <div style="
              background: white;
              border-radius: 12px;
              padding: 14px;
              margin-bottom: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            ">
              <h3 style="margin: 0 0 12px 0; color: #333; font-size: 16px; font-weight: 600;">Search Knowledge Base</h3>
              <div style="position: relative;">
                <input 
                  type="text" 
                  id="wetechforu-search-input" 
                  placeholder="Search for answers"
                  style="
                    width: 100%;
                    padding: 12px 16px 12px 40px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                  "
                />
                <span style="
                  position: absolute;
                  left: 12px;
                  top: 50%;
                  transform: translateY(-50%);
                  color: #999;
                  font-size: 18px;
                ">🔍</span>
              </div>
              <div id="wetechforu-search-results" style="
                margin-top: 16px;
                max-height: 300px;
                overflow-y: auto;
                display: none;
              "></div>
            </div>
            
            <!-- New Conversation Section -->
            <div style="
              background: white;
              border-radius: 12px;
              padding: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            ">
              <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: 600;">New Conversation</h3>
              <p style="margin: 0 0 12px 0; color: #666; font-size: 12px; display: flex; align-items: center; gap: 6px;">
                <span>We typically reply in a few minutes</span>
                <span style="font-size: 14px;">✈️</span>
              </p>
              <button id="wetechforu-start-conversation-btn" style="
                width: 100%;
                padding: 10px;
                background: ${this.config.primaryColor};
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
              ">Start Conversation</button>
            </div>
          </div>
        </div>
      `;
      
      messagesContainer.insertAdjacentHTML('beforeend', initialViewHTML);
      
      // Add event listeners
      const searchInput = document.getElementById('wetechforu-search-input');
      const startConversationBtn = document.getElementById('wetechforu-start-conversation-btn');
      
      // Search functionality
      let searchTimeout;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          const query = e.target.value.trim();
          
          if (query.length === 0) {
            document.getElementById('wetechforu-search-results').style.display = 'none';
            return;
          }
          
          searchTimeout = setTimeout(() => {
            this.searchKnowledgeBase(query);
          }, 300);
        });
        
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.trim();
            if (query.length > 0) {
              this.searchKnowledgeBase(query);
            }
          }
        });
      }
      
      // Start conversation button
      if (startConversationBtn) {
        startConversationBtn.addEventListener('click', () => {
          this.startNewConversation();
        });
      }
    },
    
    // Search knowledge base
    async searchKnowledgeBase(query) {
      const resultsContainer = document.getElementById('wetechforu-search-results');
      if (!resultsContainer) return;
      
      resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: #666;">Searching...</div>';
      resultsContainer.style.display = 'block';
      
      try {
        const searchUrl = `${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/knowledge/search?query=${encodeURIComponent(query)}`;
        console.log('🔍 Searching knowledge base:', searchUrl);
        
        const response = await fetch(searchUrl);
        const responseText = await response.text();
        
        console.log('📥 Search response status:', response.status);
        console.log('📥 Search response:', responseText);
        
        if (response.ok) {
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse search response:', parseError, responseText);
            resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: #f44336; font-size: 13px;">Error parsing search results. Please try again.</div>';
            return;
          }
          
          const results = data.results || [];
          console.log('📊 Search results:', results.length, 'found');
          
          if (results.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: #666; font-size: 13px;">No results found. Try different keywords.</div>';
          } else {
            resultsContainer.innerHTML = results.map((item, index) => `
              <div class="wetechforu-search-result-item" data-result-id="${item.id}" style="
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: background 0.2s;
                border-radius: 4px;
                margin-bottom: 4px;
              " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                <div style="font-weight: 600; color: #333; font-size: 14px; margin-bottom: 4px;">${this.escapeHTML(item.question)}</div>
                ${item.category ? `<div style="font-size: 11px; color: #999;">${this.escapeHTML(item.category)}</div>` : ''}
              </div>
            `).join('');
            
            // Add click handlers
            resultsContainer.querySelectorAll('.wetechforu-search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                const resultId = item.getAttribute('data-result-id');
                const result = results.find(r => r.id == resultId);
                if (result) {
                  this.showSearchResultAnswer(result);
                }
              });
            });
          }
        } else {
          console.error('❌ Search failed:', response.status, responseText);
          const errorData = responseText ? (responseText.startsWith('{') ? JSON.parse(responseText) : { error: responseText }) : { error: 'Unknown error' };
          resultsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: #f44336; font-size: 13px;">Error: ${errorData.error || 'Search failed'}. Please try again.</div>`;
        }
      } catch (error) {
        console.error('❌ Search error:', error);
        resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: #f44336; font-size: 13px;">Error searching. Please try again.</div>';
      }
    },
    
    // Show search result answer
    showSearchResultAnswer(result) {
      // Remove initial view and show answer
      const initialView = document.getElementById('wetechforu-initial-view');
      if (initialView) {
        initialView.remove();
      }
      
      // Show question and answer in conversation format
      const questionText = `**${result.question}**`;
      this.addBotMessage(questionText);
      
      // Show answer after a brief delay
      setTimeout(() => {
        this.addBotMessage(result.answer);
      }, 300);
      
      // Switch to conversation tab
      this.switchTab('conversation');
      
      // Update knowledge base usage stats
      if (result.id) {
        fetch(`${this.config.backendUrl}/api/chat-widget/widgets/${this.config.widgetId || 'unknown'}/knowledge/${result.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ times_used: 'increment' })
        }).catch(err => console.warn('Could not update KB usage:', err));
      }
    },
    
    // Start new conversation
    async startNewConversation() {
      // Remove initial view
      const initialView = document.getElementById('wetechforu-initial-view');
      if (initialView) {
        initialView.remove();
      }
      
      // Switch to conversation tab
      this.switchTab('conversation');
      
      // Ensure conversation exists
      const conversationId = await this.ensureConversation();
      if (!conversationId) {
        this.addBotMessage("Sorry, I'm having trouble connecting. Please try again.");
        return;
      }
      
      // Show form immediately if intro flow is enabled (no welcome message)
      if (this.config.enableIntroFlow && this.config.introQuestions && this.config.introQuestions.length > 0) {
        // Show form directly without welcome message
        this.startIntroFlow();
      } else {
        this.addBotMessage(this.config.welcomeMessage || "Hi! 👋 How can I help you today?");
        // Scroll to top to show first message
        setTimeout(() => {
          this.scrollToTop();
        }, 100);
      }
    },
    
    // Switch tabs
    switchTab(tab) {
      const tabHomeMain = document.getElementById('wetechforu-tab-home-main');
      const tabConversationMain = document.getElementById('wetechforu-tab-conversation-main');
      const inputArea = document.getElementById('wetechforu-input')?.parentElement;
      
      if (tab === 'home') {
        // Show initial view
        if (!document.getElementById('wetechforu-initial-view')) {
          this.showStandardizedInitialView();
        } else {
          const initialView = document.getElementById('wetechforu-initial-view');
          if (initialView) {
            initialView.style.display = 'flex';
          }
        }
        
        // Hide input area when on home tab
        if (inputArea) {
          inputArea.style.display = 'none';
        }
        
        // Update main tab styles
        if (tabHomeMain) {
          tabHomeMain.style.color = this.config.primaryColor;
          tabHomeMain.style.background = '#f5f5f5';
        }
        if (tabConversationMain) {
          tabConversationMain.style.color = '#666';
          tabConversationMain.style.background = 'transparent';
        }
      } else if (tab === 'conversation') {
        // Hide initial view, show messages
        const initialView = document.getElementById('wetechforu-initial-view');
        if (initialView) {
          initialView.style.display = 'none';
        }
        
        // Show input area when on conversation tab
        if (inputArea) {
          inputArea.style.display = 'flex';
        }
        
        // Update main tab styles
        if (tabHomeMain) {
          tabHomeMain.style.color = '#666';
          tabHomeMain.style.background = 'transparent';
        }
        if (tabConversationMain) {
          tabConversationMain.style.color = this.config.primaryColor;
          tabConversationMain.style.background = '#f5f5f5';
        }
      }
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

    // ✅ Show intro form as a single form UI (matching screenshot design)
    showIntroForm(questions) {
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (!messagesDiv) return;
      
      // Clear messages container and show form in full-screen style
      messagesDiv.innerHTML = '';
      
      // Scroll to top to ensure form is visible
      setTimeout(() => {
        this.scrollToTop();
      }, 50);
      
      const formContainer = document.createElement('div');
      formContainer.id = 'wetechforu-intro-form-container';
      formContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.secondaryColor});
        display: flex;
        flex-direction: column;
        z-index: 10;
        animation: slideUp 0.3s ease-out;
      `;
      
      // Header with back button and message
      const headerHTML = `
        <div style="
          padding: 20px;
          color: white;
          display: flex;
          flex-direction: column;
          gap: 16px;
        ">
          <button 
            id="wetechforu-form-back-btn"
            style="
              background: transparent;
              border: none;
              color: white;
              font-size: 24px;
              cursor: pointer;
              align-self: flex-start;
              padding: 0;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
            title="Back"
          >←</button>
          <p style="
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            text-align: center;
            opacity: 0.95;
          ">Please fill out this form before starting the chat. It will help us connect with you more efficiently.</p>
        </div>
      `;
      
      // Form card
      const formDiv = document.createElement('div');
      formDiv.id = 'wetechforu-intro-form';
      formDiv.style.cssText = `
        flex: 1;
        background: white;
        border-radius: 20px 20px 0 0;
        padding: 24px 20px;
        overflow-y: auto;
        margin-top: auto;
      `;
      
      let formHTML = '<form id="wetechforu-form-form">';
      
      questions.forEach((question, index) => {
        const fieldName = question.id || question.field || `field_${index}`;
        const label = question.question || question.label || '';
        const required = question.required ? '<span style="color: red;">*</span>' : '';
        const placeholder = question.placeholder || '';
        
        // Check if this is a message/textarea field
        if (question.type === 'textarea' || fieldName.toLowerCase().includes('message') || label.toLowerCase().includes('message')) {
          formHTML += `
            <div style="margin-bottom: 20px;">
              <textarea 
                name="${fieldName}" 
                id="form_${fieldName}"
                placeholder="${placeholder || 'Please Write Your Message..'}"
                ${question.required ? 'required' : ''}
                rows="4"
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; font-family: inherit; resize: vertical; min-height: 100px;"
              ></textarea>
            </div>
          `;
        } else if (question.type === 'tel' || question.type === 'phone' || fieldName.toLowerCase().includes('phone')) {
          // Phone field with country code selector
          formHTML += `
            <div style="margin-bottom: 20px;">
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                <select 
                  name="${fieldName}_country_code" 
                  id="form_${fieldName}_country_code"
                  style="
                    padding: 12px 8px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    background: white;
                    width: 100px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                  "
                >
                  <option value="+1" selected>🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+7">🇷🇺 +7</option>
                  <option value="+55">🇧🇷 +55</option>
                </select>
                <input 
                  type="tel" 
                  name="${fieldName}" 
                  id="form_${fieldName}"
                  placeholder="${placeholder || '+1'}"
                  pattern="[0-9\\s\\+\\-\\(\\)]{10,}"
                  ${question.required ? 'required' : ''}
                  style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
                />
              </div>
            </div>
          `;
        } else if (question.type === 'email' || fieldName.toLowerCase().includes('email')) {
          formHTML += `
            <div style="margin-bottom: 20px;">
              <input 
                type="email" 
                name="${fieldName}" 
                id="form_${fieldName}"
                placeholder="${placeholder || 'Email'}"
                ${question.required ? 'required' : ''}
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
              />
            </div>
          `;
        } else if (question.type === 'select' && question.options) {
          formHTML += `
            <div style="margin-bottom: 20px;">
              <select 
                name="${fieldName}" 
                id="form_${fieldName}"
                ${question.required ? 'required' : ''}
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white; box-sizing: border-box;"
              >
                <option value="">-- Select --</option>
                ${question.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
              </select>
            </div>
          `;
        } else {
          // Text input (Name, etc.)
          formHTML += `
            <div style="margin-bottom: 20px;">
              <input 
                type="text" 
                name="${fieldName}" 
                id="form_${fieldName}"
                placeholder="${placeholder || label}"
                ${question.required ? 'required' : ''}
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box;"
                ${question.field === 'first_name' || question.id === 'first_name' ? 'pattern="[A-Za-z\\s]{2,}" title="First name should contain only letters"' : ''}
              />
            </div>
          `;
        }
        
      });
      
      formHTML += `
        <button 
          type="submit"
          style="
            width: 100%; 
            padding: 14px 20px; 
            background: ${this.config.primaryColor || '#2E86AB'}; 
            color: white; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: 600; 
            cursor: pointer; 
            margin-top: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#1e6a8a'"
          onmouseout="this.style.background='${this.config.primaryColor || '#2E86AB'}'"
        >
          <span style="font-size: 18px;">✈️</span>
          <span>Start Chat</span>
        </button>
      </form>`;
      
      formDiv.innerHTML = formHTML;
      formContainer.innerHTML = headerHTML;
      formContainer.appendChild(formDiv);
      messagesDiv.appendChild(formContainer);
      
      // Add back button handler
      const backBtn = document.getElementById('wetechforu-form-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          formContainer.remove();
          this.showStandardizedInitialView();
        });
      }
      
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
        
        // Phone validation and country code handling
        if ((question.type === 'tel' || question.type === 'phone' || fieldName.toLowerCase().includes('phone')) && value) {
          // Get country code if available
          const countryCodeField = document.getElementById(`form_${fieldName}_country_code`);
          const countryCode = countryCodeField ? countryCodeField.value : '+1';
          
          // Combine country code with phone number
          const fullPhone = countryCode + value.replace(/\s/g, '');
          answers[fieldName] = fullPhone;
          
          const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
          if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            hasErrors = true;
            errors.push('Please enter a valid phone number');
          }
        } else if (question.type === 'email' && value) {
          // Email validation (HTML5 does this, but double-check)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            hasErrors = true;
            errors.push('Please enter a valid email address');
          } else {
            answers[fieldName] = value;
          }
        } else if (value) {
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
      
      // Show summary (this will remove the form container)
      this.showFormSummary(answers);
      
      // Complete intro flow
      await this.completeIntroFlow();
      
      // Ensure intro is marked as complete
      console.log('✅ Intro flow marked as complete:', this.state.introFlow.isComplete);
    },
    
    // ✅ Update conversation ID display in header
    updateConversationIdDisplay() {
      const conversationIdElement = document.getElementById('wetechforu-conversation-id');
      if (conversationIdElement && this.state.conversationId) {
        conversationIdElement.textContent = `#${this.state.conversationId}`;
        conversationIdElement.style.display = 'inline';
      } else if (conversationIdElement) {
        conversationIdElement.textContent = '';
        conversationIdElement.style.display = 'none';
      }
    },
    
    // ✅ Show form summary
    showFormSummary(answers) {
      // Remove form container
      const formContainer = document.getElementById('wetechforu-intro-form-container');
      if (formContainer) {
        formContainer.remove();
      }
      
      // Scroll to top to show first messages
      setTimeout(() => {
        this.scrollToTop();
      }, 100);
      
      // Build summary text in format matching screenshot
      let summaryText = '';
      const questions = this.state.introFlow.questions || [];
      
      // Map answers to their question labels
      questions.forEach(question => {
        const fieldName = question.id || question.field;
        const label = question.question || question.label || fieldName;
        const value = answers[fieldName];
        
        if (value) {
          // Format label to match screenshot (e.g., "Name :", "Email :")
          const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
          summaryText += `${formattedLabel} : ${value}\n`;
        }
      });
      
      // If no questions mapping, use direct answers
      if (!summaryText) {
        Object.keys(answers).forEach(key => {
          const value = answers[key];
          if (value) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            summaryText += `${label} : ${value}\n`;
          }
        });
      }
      
      // Display as user message (matching screenshot format)
      if (summaryText.trim()) {
        this.addUserMessage(summaryText.trim());
      }
      
      // Show bot greeting after form submission
      setTimeout(() => {
        this.addBotMessage("👋 Hi! How can we help?");
      }, 500);
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

      // Show completion message
      setTimeout(() => {
        this.addBotMessage("✅ We have received your response. We will connect you with the next available agent.");
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
          // Double-check that intro is marked as complete
          this.state.introFlow.isComplete = true;
          console.log('✅ Intro flow completion confirmed - messages should now work');
        } else {
          console.error('Failed to save intro data:', response.status, response.statusText);
          // Still mark as complete locally so user can continue
          this.state.introFlow.isComplete = true;
        }
      } catch (error) {
        console.error('Failed to save intro data:', error);
        // Mark as complete locally even if save fails, so user can continue
        this.state.introFlow.isComplete = true;
      }

      // 🏥 Show HIPAA/Emergency Disclaimer for Healthcare Clients
      if (this.config.showEmergencyWarning && this.config.industry === 'healthcare') {
        setTimeout(() => {
          this.addEmergencyDisclaimer();
        }, 500);
      }

      // ✅ NEW FLOW: After form completion, check agent availability and handle handover
      setTimeout(async () => {
        await this.checkAgentAvailabilityAndHandover(conversationId);
      }, 1500);
    },
    
    // ✅ NEW: Check agent availability and handle handover after form completion
    async checkAgentAvailabilityAndHandover(conversationId) {
      try {
        console.log('🔍 Checking agent availability and handover for conversation:', conversationId);
        
        // Get widget config to check handover settings
        const configResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/config`);
        const widgetConfig = await configResponse.json();
        
        console.log('📋 Widget config received:', {
          id: widgetConfig.id,
          widget_id: widgetConfig.widget_id,
          client_id: widgetConfig.client_id,
          handover_whatsapp_number: widgetConfig.handover_whatsapp_number,
          enable_whatsapp: widgetConfig.enable_whatsapp,
          enable_multiple_whatsapp_chats: widgetConfig.enable_multiple_whatsapp_chats
        });
        
        // Get conversation info to get client_id
        const convResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
        const convData = await convResponse.json();
        
        // Check if WhatsApp is configured and check agent availability
        const whatsappConfigured = widgetConfig.handover_whatsapp_number && widgetConfig.handover_whatsapp_number.trim() !== '';
        
        console.log('📱 WhatsApp configuration check:', {
          whatsappConfigured: whatsappConfigured,
          handover_whatsapp_number: widgetConfig.handover_whatsapp_number,
          enable_whatsapp: widgetConfig.enable_whatsapp
        });
        
        if (whatsappConfigured) {
          // Try to create a handover request - this will tell us if agent is busy
          const answers = this.state.introFlow.answers || {};
          const fullName = (answers.first_name && answers.last_name) 
            ? `${answers.first_name} ${answers.last_name}` 
            : (answers.first_name || answers.name || '');
          const email = answers.email || answers.email_address || '';
          const phone = answers.phone || answers.phone_number || answers.mobile || '';
          
          const handoverRequestData = {
            conversation_id: conversationId,
            widget_id: widgetConfig.id || widgetConfig.widget_id,
            client_id: widgetConfig.client_id,
            requested_method: 'whatsapp',
            visitor_name: fullName,
            visitor_email: email,
            visitor_phone: phone,
            visitor_message: 'Form completed - ready for agent handover'
          };
          
          console.log('📤 Sending handover request:', handoverRequestData);
          
          const handoverResponse = await fetch(`${this.config.backendUrl}/api/handover/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(handoverRequestData)
          });
          
          const handoverData = await handoverResponse.json();
          console.log('📥 Handover response:', handoverData);
          
          if (handoverData.agent_busy) {
            // Agent is busy - show message and ask for email
            setTimeout(() => {
              this.addBotMessage("⏳ All agents are currently busy. Please send us an email with your question, and our agent will get back to you as soon as possible.");
              if (email) {
                setTimeout(() => {
                  this.addBotMessage(`📧 Your email (${email}) has been recorded. We'll contact you soon!`);
                }, 1000);
              } else {
                setTimeout(() => {
                  this.addBotMessage("💬 Feel free to continue chatting with me, and I'll do my best to help you!");
                }, 1000);
              }
            }, 500);
          } else if (handoverData.success) {
            // Agent is available - handover initiated
            setTimeout(() => {
              this.addBotMessage("✅ We will see who is available for chat and connect you shortly.");
              this.state.agentTookOver = true;
              this.startPollingForAgentMessages();
            }, 500);
          } else {
            // Fallback: WhatsApp not properly configured or error
            setTimeout(() => {
              this.addBotMessage("💬 Our agents are currently unavailable. Please send us an email with your question, and we'll get back to you as soon as possible.");
              if (email) {
                setTimeout(() => {
                  this.addBotMessage(`📧 Your email (${email}) has been recorded. We'll contact you soon!`);
                }, 1000);
              }
            }, 500);
          }
        } else {
          // WhatsApp not configured - show message to send email
          const answers = this.state.introFlow.answers || {};
          const email = answers.email || answers.email_address || '';
          
          setTimeout(() => {
            this.addBotMessage("💬 All agents are currently busy. Please send us an email with your question, and our agent will get back to you.");
            if (email) {
              setTimeout(() => {
                this.addBotMessage(`📧 Your email (${email}) has been recorded. We'll contact you soon!`);
              }, 1000);
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error checking agent availability:', error);
        // Fallback message
        setTimeout(() => {
          this.addBotMessage("💬 Feel free to ask me any questions, and I'll do my best to help you!");
        }, 500);
      }
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

    // Handle appointment request - show appointment form
    async handleAppointmentRequest() {
      this.addBotMessage("I'd be happy to help you book an appointment! Let me collect some information.");
      
      // Get appointment questions based on industry
      const industry = this.config.industry || 'general';
      const appointmentQuestions = this.getAppointmentQuestions(industry);
      
      // Show appointment form
      setTimeout(() => {
        this.showAppointmentForm(appointmentQuestions);
      }, 500);
    },
    
    // Get appointment questions based on industry
    getAppointmentQuestions(industry) {
      const baseQuestions = [
        { id: 'appointment_type', type: 'select', question: 'What type of appointment do you need?', required: true, order: 1, options: ['Consultation', 'Follow-up', 'Check-up', 'Other'] },
        { id: 'preferred_date', type: 'date', question: 'What is your preferred date?', required: true, order: 2 },
        { id: 'preferred_time', type: 'select', question: 'What time works best for you?', required: true, order: 3, options: ['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 5 PM)', 'Evening (5 PM - 8 PM)', 'Flexible'] },
        { id: 'reason', type: 'textarea', question: 'What is the reason for your appointment?', required: false, order: 4 },
        { id: 'location_preference', type: 'select', question: 'How would you like to meet?', required: false, order: 5, options: ['In-Person', 'Virtual/Video Call', 'Phone Call'] }
      ];
      
      if (industry === 'healthcare' || industry === 'dental') {
        return [
          ...baseQuestions,
          { id: 'insurance_provider', type: 'select', question: 'What is your insurance provider?', required: false, order: 6, options: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Medicaid', 'Medicare', 'Other', 'No Insurance'] },
          { id: 'insurance_member_id', type: 'text', question: 'Insurance Member ID (if available)', required: false, order: 7 },
          { id: 'symptoms', type: 'textarea', question: 'Please describe any symptoms or concerns', required: false, order: 8 },
          { id: 'special_requirements', type: 'textarea', question: 'Any special requirements or accommodations needed?', required: false, order: 9 }
        ];
      }
      
      if (industry === 'legal') {
        return [
          ...baseQuestions,
          { id: 'case_type', type: 'select', question: 'What type of legal matter?', required: false, order: 6, options: ['Family Law', 'Criminal Defense', 'Personal Injury', 'Business Law', 'Real Estate', 'Estate Planning', 'Other'] },
          { id: 'urgency', type: 'select', question: 'How urgent is this matter?', required: false, order: 7, options: ['Urgent (within 24 hours)', 'Soon (within a week)', 'Not urgent'] },
          { id: 'case_details', type: 'textarea', question: 'Brief description of your legal matter', required: false, order: 8 }
        ];
      }
      
      return baseQuestions;
    },
    
    // Show appointment form
    showAppointmentForm(questions) {
      // Implementation similar to showIntroForm but for appointments
      const formHtml = this.buildAppointmentFormHtml(questions);
      const messagesDiv = document.getElementById('wetechforu-messages');
      if (messagesDiv) {
        const formDiv = document.createElement('div');
        formDiv.id = 'wetechforu-appointment-form';
        formDiv.innerHTML = formHtml;
        messagesDiv.appendChild(formDiv);
      }
    },
    
    // Build appointment form HTML
    buildAppointmentFormHtml(questions) {
      // Similar to intro form but for appointments
      let html = '<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 12px 0;">';
      html += '<h3 style="margin: 0 0 16px 0; color: #2E86AB;">📅 Appointment Booking</h3>';
      
      questions.forEach(q => {
        html += `<div style="margin-bottom: 16px;">`;
        html += `<label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">${q.question}${q.required ? ' *' : ''}</label>`;
        
        if (q.type === 'select') {
          html += `<select id="appointment_${q.id}" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;" ${q.required ? 'required' : ''}>`;
          html += '<option value="">Select...</option>';
          q.options.forEach(opt => {
            html += `<option value="${opt}">${opt}</option>`;
          });
          html += '</select>';
        } else if (q.type === 'date') {
          html += `<input type="date" id="appointment_${q.id}" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;" ${q.required ? 'required' : ''} min="${new Date().toISOString().split('T')[0]}">`;
        } else if (q.type === 'textarea') {
          html += `<textarea id="appointment_${q.id}" rows="3" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; resize: vertical;" ${q.required ? 'required' : ''}></textarea>`;
        } else {
          html += `<input type="${q.type}" id="appointment_${q.id}" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;" ${q.required ? 'required' : ''}>`;
        }
        
        html += '</div>';
      });
      
      html += '<button type="button" id="wetechforu-submit-appointment" style="width: 100%; padding: 12px; background: #2E86AB; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 12px;">Submit Appointment Request</button>';
      html += '</div>';
      
      // Add event listener for submit button after form is added to DOM
      setTimeout(() => {
        const submitBtn = document.getElementById('wetechforu-submit-appointment');
        if (submitBtn) {
          submitBtn.addEventListener('click', () => this.submitAppointment());
        }
      }, 100);
      
      return html;
    },
    
    // Submit appointment
    async submitAppointment() {
      const form = document.getElementById('wetechforu-appointment-form');
      if (!form) return;
      
      const questions = this.getAppointmentQuestions(this.config.industry || 'general');
      const appointmentData = {};
      
      questions.forEach(q => {
        const input = document.getElementById(`appointment_${q.id}`);
        if (input) {
          appointmentData[q.id] = input.value;
        }
      });
      
      // Get customer info from intro data
      const customerName = this.state.introFlow?.answers?.first_name && this.state.introFlow?.answers?.last_name
        ? `${this.state.introFlow.answers.first_name} ${this.state.introFlow.answers.last_name}`
        : this.state.introFlow?.answers?.first_name || 'Customer';
      const customerEmail = this.state.introFlow?.answers?.email || '';
      const customerPhone = this.state.introFlow?.answers?.phone || '';
      
      // Parse date and time
      const preferredDate = appointmentData.preferred_date;
      const preferredTime = appointmentData.preferred_time;
      let appointmentTime = '10:00';
      if (preferredTime) {
        if (preferredTime.includes('Morning')) appointmentTime = '10:00';
        else if (preferredTime.includes('Afternoon')) appointmentTime = '14:00';
        else if (preferredTime.includes('Evening')) appointmentTime = '17:00';
        else appointmentTime = '10:00';
      }
      
      try {
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: this.state.conversationId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            appointment_type: appointmentData.appointment_type || 'consultation',
            appointment_date: preferredDate,
            appointment_time: appointmentTime,
            duration_minutes: 60,
            reason: appointmentData.reason || null,
            notes: appointmentData.symptoms || appointmentData.case_details || null,
            special_requirements: appointmentData.special_requirements || null,
            location_type: appointmentData.location_preference?.toLowerCase().includes('virtual') ? 'virtual' : 
                          appointmentData.location_preference?.toLowerCase().includes('phone') ? 'phone' : 'in-person',
            insurance_provider: appointmentData.insurance_provider || null,
            insurance_member_id: appointmentData.insurance_member_id || null,
            preferred_contact_method: this.state.introFlow?.answers?.preferred_contact?.toLowerCase() || 'email'
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.addBotMessage(`✅ Great! Your appointment has been scheduled for ${preferredDate} at ${appointmentTime}. We'll send you a confirmation email shortly.`);
          form.remove();
        } else {
          throw new Error(data.error || 'Failed to book appointment');
        }
      } catch (error) {
        console.error('Appointment booking error:', error);
        this.addBotMessage('❌ Sorry, there was an error booking your appointment. Please try again or contact us directly.');
      }
    },

    // Request live agent - Collect contact info
    async requestLiveAgent() {
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
      
      // ✅ THIRD: No contact info - show form if available, otherwise proceed with minimal info
      if (this.config.enableIntroFlow && this.config.introQuestions && this.config.introQuestions.length > 0) {
        // Show form to collect info
        this.addBotMessage("Before I connect you with an agent, please fill in your information:");
        setTimeout(() => {
          this.startIntroFlow();
        }, 500);
      } else {
        // No form configured - proceed with minimal info
        console.log('⚠️ No form configured, proceeding with minimal contact info');
        this.state.contactInfo = {
          name: 'Visitor',
          email: null,
          phone: null,
          reason: 'Visitor requested to speak with an agent'
        };
        
        // 📊 Track live agent request event
        this.trackEvent('live_agent_requested', {
          page_url: window.location.href,
          timestamp: new Date().toISOString()
        });
        
        // Submit handover request
        this.addBotMessage("⏳ Processing your request...");
        setTimeout(() => {
          this.submitToLiveAgent();
        }, 500);
      }
    },

    // ✅ REMOVED: Hardcoded askContactInfo() - form now handles all contact collection
    // Contact info is collected via intro form (from widget config), not hardcoded questions

    // Show conversation stopped message with reactivate/close buttons (Industry Standard)
    showConversationStoppedMessage(data) {
      const messagesContainer = document.getElementById('wetechforu-messages');
      
      const statsHtml = data.duration_minutes || data.user_messages || data.bot_messages || data.agent_messages
        ? `<div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 12px; color: #1976D2;">
            <strong>📊 Conversation Summary:</strong><br>
            ${data.duration_minutes ? `Duration: ${data.duration_minutes} minutes<br>` : ''}
            ${data.user_messages ? `Your Messages: ${data.user_messages}<br>` : ''}
            ${data.bot_messages ? `Bot Messages: ${data.bot_messages}<br>` : ''}
            ${data.agent_messages ? `Agent Messages: ${data.agent_messages}` : ''}
          </div>`
        : '';
      
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-bot" data-conversation-stopped="true">
          <div class="wetechforu-message-avatar">🤖</div>
          <div style="flex: 1;">
            <div class="wetechforu-message-content">
              ${this.escapeHTML(data.message || '👋 Our agent has stopped this conversation.')}
              ${statsHtml}
              <div style="margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="wetechforu-reactivate-btn" style="
                  padding: 10px 20px;
                  background: #4CAF50;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: background 0.2s;
                " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
                  ✅ Reactivate Chat
                </button>
                <button id="wetechforu-close-btn" style="
                  padding: 10px 20px;
                  background: #f44336;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                  transition: background 0.2s;
                " onmouseover="this.style.background='#da190b'" onmouseout="this.style.background='#f44336'">
                  ❌ Close Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      this.scrollToBottom();
      
      // Add event listeners
      const reactivateBtn = document.getElementById('wetechforu-reactivate-btn');
      const closeBtn = document.getElementById('wetechforu-close-btn');
      
      if (reactivateBtn) {
        reactivateBtn.addEventListener('click', () => this.handleReactivateConversation(data.conversation_id));
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.handleCloseConversation(data.conversation_id));
      }
      
      // Mark conversation as ended
      this.state.conversationEnded = true;
      this.stopPollingForAgentMessages();
    },
    
    // Handle reactivate conversation
    async handleReactivateConversation(conversationId) {
      try {
        const response = await fetch(
          `${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/reactivate-or-close`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reactivate' })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          this.addBotMessage('✅ Conversation reactivated! How can I help you?');
          this.state.conversationEnded = false;
          this.state.conversationId = conversationId;
          // Remove buttons
          const stoppedMsg = document.querySelector('[data-conversation-stopped="true"]');
          if (stoppedMsg) {
            const buttons = stoppedMsg.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());
          }
        } else {
          this.addBotMessage('❌ Failed to reactivate conversation. Please try again.');
        }
      } catch (error) {
        console.error('Failed to reactivate conversation:', error);
        this.addBotMessage('❌ Sorry, there was an error. Please try again.');
      }
    },
    
    // Handle close conversation permanently
    async handleCloseConversation(conversationId) {
      try {
        const response = await fetch(
          `${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/reactivate-or-close`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'close' })
          }
        );
        
        if (response.ok) {
          this.addBotMessage('✅ Conversation closed. Thank you for chatting with us!');
          this.state.conversationEnded = true;
          // Remove buttons
          const stoppedMsg = document.querySelector('[data-conversation-stopped="true"]');
          if (stoppedMsg) {
            const buttons = stoppedMsg.querySelectorAll('button');
            buttons.forEach(btn => btn.remove());
          }
          // Optionally minimize chat after a delay
          setTimeout(() => {
            this.minimizeChat();
          }, 2000);
        } else {
          this.addBotMessage('❌ Failed to close conversation. Please try again.');
        }
      } catch (error) {
        console.error('Failed to close conversation:', error);
        this.addBotMessage('❌ Sorry, there was an error. Please try again.');
      }
    },

    // Add bot message
    addBotMessage(text, isAgent = false, agentName = null, autoScroll = false) {
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
      
      // Add new message indicator
      const newMessageIndicator = '<span style="display: inline-block; width: 8px; height: 8px; background: #4CAF50; border-radius: 50%; margin-right: 6px; animation: pulse 2s infinite;"></span>';
      
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-bot" ${isAgent ? 'data-agent="true"' : ''} data-new-message="true">
          <div class="wetechforu-message-avatar">${avatarHTML}</div>
          <div style="flex: 1;">
            ${isAgent ? `<div style="font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600;">
              ${senderName}
            </div>` : ''}
            <div class="wetechforu-message-content">${newMessageIndicator}${this.escapeHTML(text)}</div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      
      // Only auto-scroll if explicitly requested (e.g., for typing indicators)
      if (autoScroll) {
        this.scrollToBottom();
      }
      
      // Remove new message indicator after 3 seconds
      setTimeout(() => {
        const messageEl = messagesContainer.querySelector('[data-new-message="true"]:last-child');
        if (messageEl) {
          messageEl.removeAttribute('data-new-message');
          const contentEl = messageEl.querySelector('.wetechforu-message-content');
          if (contentEl) {
            contentEl.innerHTML = contentEl.innerHTML.replace(/<span[^>]*>.*?<\/span>/, '');
          }
        }
      }, 3000);
      
      // 🔔 Show notification if agent responded and chat is minimized
      if (isAgent && !this.state.isOpen) {
        this.showNotification(agentName || 'Agent', text);
      }
    },

    // Add user message
    addUserMessage(text, autoScroll = false) {
      const messagesContainer = document.getElementById('wetechforu-messages');
      
      // Add new message indicator
      const newMessageIndicator = '<span style="display: inline-block; width: 8px; height: 8px; background: #2196F3; border-radius: 50%; margin-right: 6px; animation: pulse 2s infinite;"></span>';
      
      const messageHTML = `
        <div class="wetechforu-message wetechforu-message-user" data-new-message="true">
          <div class="wetechforu-message-avatar">👤</div>
          <div class="wetechforu-message-content">${newMessageIndicator}${this.escapeHTML(text)}</div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      
      // Only auto-scroll if explicitly requested
      if (autoScroll) {
        this.scrollToBottom();
      }
      
      // Remove new message indicator after 3 seconds
      setTimeout(() => {
        const messageEl = messagesContainer.querySelector('[data-new-message="true"]:last-child');
        if (messageEl) {
          messageEl.removeAttribute('data-new-message');
          const contentEl = messageEl.querySelector('.wetechforu-message-content');
          if (contentEl) {
            contentEl.innerHTML = contentEl.innerHTML.replace(/<span[^>]*>.*?<\/span>/, '');
          }
        }
      }, 3000);
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
      // Don't auto-scroll for typing indicator - let user see their message
    },

    // Hide typing indicator
    hideTyping() {
      const typingIndicator = document.getElementById('wetechforu-typing-indicator');
      if (typingIndicator) typingIndicator.remove();
    },

    // Send message
    async sendMessage() {
      const input = document.getElementById('wetechforu-input');
      const message = input.value.trim();
      
      console.log('📝 sendMessage() called, input value:', message);
      
      if (!message) {
        console.log('⚠️  Empty message, skipping');
        return;
      }

      // ✅ Check if user typed a number (1, 2, 3) to select a suggestion
      const numberMatch = message.match(/^(\d+)$/);
      if (numberMatch && this.state.currentSuggestions && this.state.currentSuggestions.length > 0) {
        const selectedIndex = parseInt(numberMatch[1]) - 1;
        if (selectedIndex >= 0 && selectedIndex < this.state.currentSuggestions.length) {
          const selectedSuggestion = this.state.currentSuggestions[selectedIndex];
          // Show answer directly if available
          if (selectedSuggestion.answer) {
            this.addUserMessage(`${selectedIndex + 1}. ${selectedSuggestion.question}`);
            setTimeout(() => {
              this.addBotMessage(selectedSuggestion.answer);
            }, 300);
            input.value = '';
            this.state.currentSuggestions = null;
            const quickActions = document.getElementById('wetechforu-quick-actions');
            if (quickActions) quickActions.style.display = 'none';
            return;
          } else {
            // No answer available, send question to backend
            this.addUserMessage(`${selectedIndex + 1}. ${selectedSuggestion.question}`);
            input.value = '';
            this.state.currentSuggestions = null;
            const quickActions = document.getElementById('wetechforu-quick-actions');
            if (quickActions) quickActions.style.display = 'none';
            this.sendMessageToBackend(selectedSuggestion.question);
            return;
          }
        }
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

      // ✅ REMOVED: Contact info collection via one-by-one questions
      // All contact info is now collected via intro form (from widget config)
      
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

      // ✅ CHECK FOR REOPEN REQUEST (before other checks)
      if (this.state.closedConversationId && this.state.closedConversationData) {
        const messageLower = message.toLowerCase().trim();
        const isReopenRequest = messageLower === 'yes' || messageLower === 'y' || messageLower === 'reopen';
        
        if (isReopenRequest) {
          // Reopen the closed conversation
          await this.reopenConversation(this.state.closedConversationId, this.state.closedConversationData);
          this.state.closedConversationId = null;
          this.state.closedConversationData = null;
          return;
        }
      }
      
      // ✅ SECOND: Check if intro form is displayed and not completed
      if (this.state.introFlow.enabled && !this.state.introFlow.isComplete) {
        const formExists = document.getElementById('wetechforu-intro-form') !== null;
        if (formExists) {
          this.addBotMessage("Please complete the information form above first. 😊");
          return;
      } else {
          // Form doesn't exist but intro is enabled and not complete - this shouldn't happen
          // But if it does, mark as complete and allow messages (fallback)
          console.log('⚠️ Form not found but intro enabled - marking as complete and allowing messages');
          this.state.introFlow.isComplete = true;
          // Continue to send message (don't return)
        }
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

      // ✅ Only show processing message if agent hasn't taken over yet
      if (!this.state.agentTookOver) {
        this.addBotMessage(`⏳ Processing your request...`);
      }

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
          // Mark as agent handoff and start polling for agent messages if WhatsApp or portal
          this.state.agentTookOver = true;
          if (method === 'whatsapp' || method === 'portal') {
            console.log('🔄 Starting polling for agent messages after handover request');
            this.startPollingForAgentMessages();
          }
          
          // ✅ Only show confirmation if agent hasn't replied yet (check after a short delay)
          setTimeout(async () => {
            // Check if agent has already replied by polling messages
            try {
              const messagesResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/messages`);
              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                const hasAgentMessage = messagesData.messages && messagesData.messages.some((m) => 
                  m.type === 'agent' || m.type === 'human' || (m.type === 'system' && m.text && m.text.includes('connected'))
                );
                
                // Only show confirmation if agent hasn't replied yet
                if (!hasAgentMessage) {
                  const confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent.";
                  this.addBotMessage(confirmationMessage);
                }
              }
            } catch (error) {
              // If check fails, show confirmation anyway (better safe than sorry)
              const confirmationMessage = "✅ Your request has been submitted! We'll connect you with the next available agent.";
              this.addBotMessage(confirmationMessage);
            }
          }, 1500); // Wait 1.5s to see if agent has replied
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
            } else if (statusData.status === 'closed') {
              console.log('⚠️ Previous conversation was closed:', statusData.status);
              // ✅ Show reopen prompt instead of clearing
              this.state.closedConversationId = persistedConvId;
              this.state.closedConversationData = statusData;
              
              // Show reopen prompt
              setTimeout(() => {
                this.addBotMessage('📞 This conversation has been closed. Would you like to reopen it?');
                this.addBotMessage('Reply "yes" or "y" to reopen, or start a new conversation.');
              }, 500);
              
              // Don't clear - keep it for potential reopen
              return null; // Return null to indicate we need user input
            } else {
              // Other status (inactive, etc.) - clear it
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
          this.state.conversationId = data.conversation_id;
          this.updateConversationIdDisplay(); // Update header display
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
    
    // Reopen a closed conversation
    async reopenConversation(conversationId, conversationData) {
      try {
        console.log('🔄 Reopening conversation:', conversationId);
        
        // Call backend to reopen conversation
        const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/reopen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error('Failed to reopen conversation');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Restore conversation state
          this.state.conversationId = conversationId;
          this.state.conversationEnded = false;
          
          // Restore intro flow data if available
          if (data.intro_data || (conversationData && conversationData.intro_data)) {
            const introData = data.intro_data || conversationData.intro_data;
            this.state.introFlow.answers = introData;
            this.state.introFlow.isComplete = true;
            this.state.hasShownIntro = true;
            console.log('✅ Restored intro flow data from previous conversation');
          }
          
          // Load previous messages
          await this.loadPreviousMessages(conversationId);
          
          // Clear closed conversation flag
          sessionStorage.removeItem(`wetechforu_conversation_closed_${this.config.widgetKey}`);
          
          // Show success message
          this.addBotMessage('✅ Conversation reopened! How can I help you?');
          
          // Resume polling if agent handoff was active
          if (data.agent_handoff) {
            this.state.agentTookOver = true;
            this.startPollingForAgentMessages();
          }
        } else {
          throw new Error(data.error || 'Failed to reopen conversation');
        }
      } catch (error) {
        console.error('❌ Error reopening conversation:', error);
        this.addBotMessage('❌ Sorry, there was an error reopening the conversation. Please start a new conversation.');
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
            
            // Don't add "Welcome back" message - just restore the messages silently
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
            
              // Don't add continuation message if conversation has messages - user can just continue chatting
            
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
        
        // ✅ Check if appointment was requested
        if (data.appointment_requested) {
          await this.handleAppointmentRequest();
          return;
        }
        
        // ✅ Check if conversation has ended
        if (data.conversation_ended) {
          // Store closed conversation info for reopen prompt
          if (conversationId) {
            this.state.closedConversationId = conversationId;
            // Fetch conversation data for reopen
            try {
              const statusResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
              if (statusResponse.ok) {
                this.state.closedConversationData = await statusResponse.json();
              }
            } catch (error) {
              console.warn('Could not fetch conversation data for reopen:', error);
            }
          }
          
          this.addBotMessage(data.message || '📞 This conversation has been closed.');
          this.addBotMessage('Would you like to reopen it? Reply "yes" or "y" to reopen.');
          this.state.conversationEnded = true;
          this.stopPollingForAgentMessages(); // Stop polling
          return;
        }
        
        // ✅ Check if agent has taken over conversation
        if (data.agent_handoff) {
          // Only show message if provided (first time only, when agent hasn't replied yet)
          if (data.message) {
            this.addBotMessage('👨‍💼 ' + data.message);
          }
          // Stop polling for bot, start polling for agent messages (including WhatsApp)
          this.state.agentTookOver = true;
          this.startPollingForAgentMessages(); // Start polling for agent replies (WhatsApp or portal)
          return;
        }
        
        // ✅ Resume polling if it was paused (user sent message = activity)
        this.resumePollingOnActivity();
        
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
            // 🤔 MEDIUM CONFIDENCE (30-70%) - Show similar questions with answers
            this.state.unsuccessfulAttempts = 0; // Reset counter on suggestions
            this.state.currentSuggestions = data.suggestions; // Store for number input handling
            setTimeout(() => {
              this.showSmartSuggestions(data.suggestions);
            }, 500);
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
          // Check if we have contact info, if not, show form first
          if (!this.state.introFlow?.isComplete || !this.state.introFlow?.answers) {
            // Show form if not completed
            if (this.config.enableIntroFlow && this.config.introQuestions && this.config.introQuestions.length > 0) {
              this.addBotMessage("First, please fill in your information so our agent can contact you:");
              setTimeout(() => {
                this.startIntroFlow();
              }, 500);
            } else {
              // No form configured, proceed with handover
              this.requestLiveAgent();
            }
          } else {
            // Form already completed, proceed with handover
            this.requestLiveAgent();
          }
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
          💡 Did you mean one of these? (Click or type the number)
        </div>
        ${suggestions.map((sug, index) => {
          const questionText = sug.question.replace(/'/g, "\\'").replace(/"/g, '&quot;');
          return `<button class="wetechforu-quick-action" onclick="WeTechForUWidget.handleSuggestionClick(${index})">${index + 1}. ${sug.question}</button>`;
        }).join('')}
      `;
    },

    // Handle suggestion click
    handleSuggestionClick(index) {
      const quickActions = document.getElementById('wetechforu-quick-actions');
      if (quickActions) quickActions.style.display = 'none';

      if (!this.state.currentSuggestions || !this.state.currentSuggestions[index]) {
        return;
      }

      const suggestion = this.state.currentSuggestions[index];
      
      // Show question
      this.addUserMessage(`${index + 1}. ${suggestion.question}`);
      
      // Show answer directly if available
      if (suggestion.answer) {
        setTimeout(() => {
          this.addBotMessage(suggestion.answer);
        }, 300);
      } else {
        // No answer available, send to backend
        this.sendMessageToBackend(suggestion.question);
      }
      
      // Clear suggestions
      this.state.currentSuggestions = null;
    },

    // Scroll to bottom
    scrollToBottom() {
      const messagesContainer = document.getElementById('wetechforu-messages');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    // Scroll to top (for showing first messages when conversation starts)
    scrollToTop() {
      const messagesContainer = document.getElementById('wetechforu-messages');
      messagesContainer.scrollTop = 0;
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
    
    // 📨 Poll for new agent messages - ✅ OPTIMIZED: Exponential backoff, page visibility, smart polling
    startPollingForAgentMessages() {
      if (this.state.pollingInterval) {
        return; // Already polling
      }
      
      // Reset polling state
      this.state.pollingIntervalMs = 3000; // Start at 3 seconds
      this.state.consecutiveEmptyPolls = 0;
      
      // ✅ Only log once on start (not every poll)
      console.log('🔄 Starting smart polling for agent messages (with exponential backoff)');
      
      const poll = async () => {
        // ✅ Stop polling if chat is closed/minimized or tab is hidden
        if (!this.state.isOpen || document.hidden) {
          return; // Skip this poll, but keep interval running
        }
        
        if (!this.state.conversationId) {
          this.stopPollingForAgentMessages();
          return;
        }
        
        try {
          const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${this.state.conversationId}/messages`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            const messages = Array.isArray(data) ? data : (data.messages || []);
            
            // Check for agent messages
            const newMessages = messages.filter(msg => 
              msg.message_type === 'human' && 
              msg.id && 
              !this.state.displayedMessageIds.includes(msg.id)
            );
            
            // Check for system messages (conversation stopped, etc.)
            const newSystemMessages = messages.filter(msg => 
              msg.message_type === 'system' && 
              msg.id && 
              !this.state.displayedMessageIds.includes(msg.id)
            );
            
            if (newMessages.length > 0) {
              // ✅ Found new messages - reset backoff and log only once
              this.state.consecutiveEmptyPolls = 0;
              this.state.pollingIntervalMs = 3000; // Reset to fast polling
              console.log(`📨 Found ${newMessages.length} new agent message(s)`);
            
            newMessages.forEach(msg => {
              this.addBotMessage(msg.message_text, true, msg.agent_name || 'Agent');
              this.state.displayedMessageIds.push(msg.id);
            });
              
              // ✅ Restart polling with faster interval when messages found
              this.restartPollingWithInterval(3000);
            }
            
            // Handle system messages (conversation stopped, etc.)
            if (newSystemMessages.length > 0) {
              newSystemMessages.forEach(msg => {
                try {
                  // Try to parse as JSON (for conversation_stopped type)
                  const parsed = JSON.parse(msg.message_text);
                  if (parsed.type === 'conversation_stopped' && parsed.show_buttons) {
                    this.showConversationStoppedMessage(parsed);
                    this.state.displayedMessageIds.push(msg.id);
                  } else {
                    // Regular system message
                    this.addBotMessage(parsed.message || msg.message_text);
                    this.state.displayedMessageIds.push(msg.id);
                  }
                } catch (e) {
                  // Not JSON, treat as regular system message
                  this.addBotMessage(msg.message_text);
                  this.state.displayedMessageIds.push(msg.id);
                }
              });
            }
            
            if (newMessages.length === 0 && newSystemMessages.length === 0) {
              // ✅ No new messages - implement exponential backoff
              this.state.consecutiveEmptyPolls++;
              
              // Exponential backoff: 3s → 5s → 10s → 30s → 60s (max)
              const intervals = [3000, 5000, 10000, 30000, 60000];
              const backoffIndex = Math.min(this.state.consecutiveEmptyPolls - 1, intervals.length - 1);
              const newInterval = intervals[backoffIndex];
              
              if (newInterval !== this.state.pollingIntervalMs) {
                this.state.pollingIntervalMs = newInterval;
                console.log(`⏱️ No messages found, slowing polling to ${newInterval / 1000}s`);
                this.restartPollingWithInterval(newInterval);
              }
              
              // ✅ Stop polling after 5 minutes of no messages (idle)
              if (this.state.consecutiveEmptyPolls >= 10 && this.state.pollingIntervalMs >= 30000) {
                console.log('⏸️ No messages for 5+ minutes - pausing polling (will resume on user activity)');
                this.stopPollingForAgentMessages();
              }
            }
          } else {
            // Only log errors, not every failed request
            if (response.status !== 404) {
              console.error('❌ Failed to fetch messages:', response.status);
            }
          }
        } catch (error) {
          // Only log actual errors
          if (error.name !== 'TypeError') {
            console.error('❌ Polling error:', error);
          }
        }
      };
      
      // Start polling with initial interval
      poll(); // Immediate first poll
      this.state.pollingInterval = setInterval(poll, this.state.pollingIntervalMs);
    },
    
    // ✅ Restart polling with new interval (for exponential backoff)
    restartPollingWithInterval(newInterval) {
      if (this.state.pollingInterval) {
        clearInterval(this.state.pollingInterval);
        this.state.pollingInterval = null;
      }
      this.state.pollingIntervalMs = newInterval;
      
      const poll = async () => {
        if (!this.state.isOpen || document.hidden) return;
        if (!this.state.conversationId) {
          this.stopPollingForAgentMessages();
          return;
        }
        
        try {
          const response = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${this.state.conversationId}/messages`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            const messages = Array.isArray(data) ? data : (data.messages || []);
            const newMessages = messages.filter(msg => 
              msg.message_type === 'human' && 
              msg.id && 
              !this.state.displayedMessageIds.includes(msg.id)
            );
            
            if (newMessages.length > 0) {
              this.state.consecutiveEmptyPolls = 0;
              this.state.pollingIntervalMs = 3000;
              console.log(`📨 Found ${newMessages.length} new agent message(s)`);
              newMessages.forEach(msg => {
                this.addBotMessage(msg.message_text, true, msg.agent_name || 'Agent');
                this.state.displayedMessageIds.push(msg.id);
              });
              this.restartPollingWithInterval(3000);
            } else {
              this.state.consecutiveEmptyPolls++;
              const intervals = [3000, 5000, 10000, 30000, 60000];
              const backoffIndex = Math.min(this.state.consecutiveEmptyPolls - 1, intervals.length - 1);
              const nextInterval = intervals[backoffIndex];
              if (nextInterval !== this.state.pollingIntervalMs) {
                this.state.pollingIntervalMs = nextInterval;
                console.log(`⏱️ No messages, slowing to ${nextInterval / 1000}s`);
                this.restartPollingWithInterval(nextInterval);
              }
              if (this.state.consecutiveEmptyPolls >= 10 && this.state.pollingIntervalMs >= 30000) {
                console.log('⏸️ Pausing polling after 5+ minutes idle');
                this.stopPollingForAgentMessages();
              }
            }
          }
        } catch (error) {
          if (error.name !== 'TypeError') {
            console.error('❌ Polling error:', error);
          }
        }
      };
      
      this.state.pollingInterval = setInterval(poll, newInterval);
    },
    
    // Stop polling
    stopPollingForAgentMessages() {
      if (this.state.pollingInterval) {
        clearInterval(this.state.pollingInterval);
        this.state.pollingInterval = null;
      }
      // ✅ Reset polling state when stopped (but keep consecutiveEmptyPolls for resume logic)
      this.state.pollingIntervalMs = 3000;
    },
    
    // ✅ Resume polling on user activity (industry standard - when user sends message)
    resumePollingOnActivity() {
      if (this.state.agentTookOver && !this.state.pollingInterval && this.state.isOpen) {
        // Reset backoff when user is active
        this.state.pollingIntervalMs = 3000;
        this.state.consecutiveEmptyPolls = 0;
        this.startPollingForAgentMessages();
        console.log('🔄 Resumed polling due to user activity');
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
                setTimeout(async () => {
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
                  
                  // ✅ Check if intro was already completed - don't show "start fresh" message if it was
                  try {
                    const statusCheckResponse = await fetch(`${this.config.backendUrl}/api/chat-widget/public/widget/${this.config.widgetKey}/conversations/${conversationId}/status`);
                    if (statusCheckResponse.ok) {
                      const statusCheckData = await statusCheckResponse.json();
                      if (statusCheckData.intro_completed) {
                        // Intro was already completed - don't ask again
                        this.addBotMessage('🔄 Conversation restarted. How can I help you today?');
                        this.state.introFlow.isComplete = true;
                        this.state.hasShownIntro = true;
                        
                        // Show form summary if data exists
                        if (statusCheckData.intro_data) {
                          this.state.introFlow.answers = statusCheckData.intro_data;
                          setTimeout(() => {
                            this.showFormSummary(statusCheckData.intro_data);
                          }, 500);
                        }
                      } else {
                        // Intro not completed - show start fresh message
                        this.addBotMessage('🔄 Let\'s start fresh! I\'ll ask you a few questions again to help you better.');
                      }
                    }
                  } catch (error) {
                    console.warn('Could not check intro status after expiry:', error);
                    this.addBotMessage('🔄 Let\'s start fresh! I\'ll ask you a few questions again to help you better.');
                  }
                }, 800);
              }

              // ⚠️ IMPORTANT: Don't clear conversationId or reset intro flow when conversation expires
              // The conversation still exists in database with intro_completed flag
              // Only clear localStorage so it can be restored from database
              localStorage.removeItem(`wetechforu_conversation_${this.config.widgetKey}`);

              // ✅ Keep conversationId so we can check if intro was already completed
              // Don't reset intro flow - it will be checked when conversation is restored
              // this.state.conversationId = null; // ❌ REMOVED - keep conversationId
              // this.state.introFlow.isComplete = false; // ❌ REMOVED - keep state
              this.state.hasShownIntro = false; // Allow welcome message but check intro_completed in DB

              console.log('⏰ Conversation expired - cleared localStorage but keeping conversationId for intro check');
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

