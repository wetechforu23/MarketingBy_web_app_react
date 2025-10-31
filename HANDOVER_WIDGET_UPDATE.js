// ========================================
// ADD THIS TO wetechforu-widget-v2.js
// Replace the existing requestLiveAgent() function
// ========================================

// Request live agent - Show handover choice modal
async requestLiveAgent() {
  // Load handover configuration
  try {
    const configResponse = await fetch(`${this.config.backendUrl}/api/handover/config/${this.config.widgetId}`);
    const handoverConfig = await configResponse.json();
    
    // If choice is disabled or only one option, use default
    if (!handoverConfig.enable_handover_choice) {
      this.startHandoverFlow(handoverConfig.default_handover_method || 'portal', handoverConfig);
      return;
    }
    
    // Show handover choice modal
    this.showHandoverChoiceModal(handoverConfig);
  } catch (error) {
    console.error('Failed to load handover config:', error);
    // Fallback to portal
    this.startHandoverFlow('portal', {});
  }
},

// Show handover choice modal
showHandoverChoiceModal(config) {
  const options = config.handover_options || {
    portal: true,
    whatsapp: false,
    email: true,
    phone: false,
    webhook: false
  };
  
  // Count available options
  const availableOptions = Object.entries(options).filter(([, enabled]) => enabled);
  
  // If only one option, skip modal
  if (availableOptions.length === 1) {
    this.startHandoverFlow(availableOptions[0][0], config);
    return;
  }
  
  // Build modal HTML
  let modalHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px 12px 0 0;
      text-align: center;
    ">
      <h3 style="margin: 0 0 8px 0; font-size: 1.3rem; font-weight: 700;">
        🎯 How Would You Like Us to Contact You?
      </h3>
      <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">
        Choose your preferred method below
      </p>
    </div>
    <div style="padding: 1.5rem; background: white;">
  `;
  
  // Add option buttons
  const methodDetails = {
    portal: {
      icon: '💬',
      label: 'Chat Here',
      desc: 'Continue in this chat window',
      color: '#28a745'
    },
    whatsapp: {
      icon: '📱',
      label: 'WhatsApp',
      desc: 'Get a message on WhatsApp',
      color: '#25D366'
    },
    email: {
      icon: '📧',
      label: 'Email',
      desc: 'Receive an email response',
      color: '#dc3545'
    },
    phone: {
      icon: '📞',
      label: 'Phone/SMS',
      desc: 'Get a call or text message',
      color: '#007bff'
    },
    webhook: {
      icon: '🔗',
      label: 'My System',
      desc: 'Connect to your CRM',
      color: '#6f42c1'
    }
  };
  
  availableOptions.forEach(([method]) => {
    const details = methodDetails[method];
    modalHTML += `
      <button 
        onclick="WeTechForUWidget.selectHandoverMethod('${method}')"
        style="
          width: 100%;
          padding: 1rem;
          margin-bottom: 0.75rem;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
        "
        onmouseover="this.style.borderColor='${details.color}'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
        onmouseout="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'"
      >
        <span style="font-size: 2rem;">${details.icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 1rem; color: #333; margin-bottom: 4px;">
            ${details.label}
          </div>
          <div style="font-size: 0.85rem; color: #666;">
            ${details.desc}
          </div>
        </div>
        <i class="fas fa-chevron-right" style="color: #999;"></i>
      </button>
    `;
  });
  
  modalHTML += `
      <button 
        onclick="WeTechForUWidget.closeHandoverModal()"
        style="
          width: 100%;
          padding: 0.75rem;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          color: #666;
          font-size: 0.9rem;
        "
      >
        ❌ Cancel
      </button>
    </div>
  `;
  
  this.addBotMessage(modalHTML, true); // true = raw HTML
  
  // Store config for later use
  this.state.handoverConfig = config;
},

// Select handover method
selectHandoverMethod(method) {
  this.closeHandoverModal();
  this.startHandoverFlow(method, this.state.handoverConfig);
},

// Close handover modal
closeHandoverModal() {
  // Remove the last message (the modal)
  const messages = document.getElementById('wetechforu-messages');
  if (messages && messages.lastChild) {
    messages.removeChild(messages.lastChild);
  }
},

// Start handover flow for selected method
async startHandoverFlow(method, config) {
  const methodLabels = {
    portal: 'Portal Chat',
    whatsapp: 'WhatsApp',
    email: 'Email',
    phone: 'Phone/SMS',
    webhook: 'Your System'
  };
  
  this.addUserMessage(`💬 Contact via: ${methodLabels[method]}`);
  this.addBotMessage(`Great! Let me collect your information for ${methodLabels[method]} contact.`);
  
  // Store selected method
  this.state.selectedHandoverMethod = method;
  
  // Determine required fields
  let requiredFields = ['name', 'message'];
  
  if (method === 'email') {
    requiredFields.push('email');
  } else if (method === 'whatsapp' || method === 'phone') {
    requiredFields.push('phone');
  } else if (method === 'portal') {
    // Portal needs email or phone
    requiredFields.push('contact');
  }
  
  // Start collecting info
  setTimeout(() => {
    this.state.contactInfoStep = 0;
    this.state.contactInfo = {};
    this.state.requiredFields = requiredFields;
    this.askHandoverInfo();
  }, 1000);
},

// Ask for handover information step by step
askHandoverInfo() {
  const method = this.state.selectedHandoverMethod;
  const fields = this.state.requiredFields;
  
  if (!this.state.contactInfoStep) this.state.contactInfoStep = 0;
  
  if (this.state.contactInfoStep < fields.length) {
    const field = fields[this.state.contactInfoStep];
    
    const questions = {
      name: "What's your full name?",
      email: "What's your email address?",
      phone: "What's your phone number? (with country code, e.g., +1234567890)",
      contact: "How should we contact you? (Enter email or phone)",
      message: "Briefly, what can we help you with?"
    };
    
    this.addBotMessage(questions[field]);
    this.state.currentContactField = field;
  } else {
    // All info collected - submit handover request
    this.submitHandoverRequest();
  }
},

// Submit handover request to backend
async submitHandoverRequest() {
  const method = this.state.selectedHandoverMethod;
  const info = this.state.contactInfo;
  
  try {
    this.addBotMessage("⏳ Processing your request...");
    
    const response = await fetch(`${this.config.backendUrl}/api/handover/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_id: this.state.conversationId,
        widget_id: this.config.widgetId,
        client_id: this.config.clientId,
        requested_method: method,
        visitor_name: info.name,
        visitor_email: info.email || info.contact || null,
        visitor_phone: info.phone || info.contact || null,
        visitor_message: info.message
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message based on method
      const successMessages = {
        portal: "✅ Perfect! An agent will respond to you right here in this chat shortly.",
        whatsapp: "✅ Great! You'll receive a WhatsApp message soon. Please check your phone!",
        email: "✅ Thank you! We've sent you a confirmation email. Expect a response within 24 hours.",
        phone: "✅ Got it! We'll call or text you soon at the number you provided.",
        webhook: "✅ Your request has been sent to our system. Someone will reach out shortly!"
      };
      
      this.addBotMessage(successMessages[method] || "✅ Your request has been submitted!");
      
      // Mark as agent handoff requested
      this.state.agentTookOver = true;
      
      // Show option to close or continue
      setTimeout(() => {
        this.showSessionEndOptions();
      }, 2000);
    } else {
      throw new Error(result.error || 'Failed to submit request');
    }
  } catch (error) {
    console.error('Handover request failed:', error);
    this.addBotMessage("❌ Sorry, there was an error submitting your request. Please try again or refresh the page.");
  }
},

// Handle contact info input (modify existing function)
// This gets called when user types and presses Enter during contact collection
// Add this check at the beginning of your existing message handling:
/*
if (this.state.currentContactField) {
  // Store the answer
  this.state.contactInfo[this.state.currentContactField] = userMessage;
  this.state.contactInfoStep++;
  this.state.currentContactField = null;
  
  // Move to next question
  if (this.state.requiredFields) {
    this.askHandoverInfo();
  } else {
    this.askContactInfo(); // Old function for backward compatibility
  }
  return;
}
*/

