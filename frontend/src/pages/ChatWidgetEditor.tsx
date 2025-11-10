import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/http'

export default function ChatWidgetEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Track if we're still loading initial data
  const [changesSummary, setChangesSummary] = useState<string[]>([]) // Track what changed
  const [showCancelConfirm, setShowCancelConfirm] = useState(false) // Show cancel confirmation dialog

  // ✅ UNIVERSAL TEMPLATE DEFAULTS (based on wtfu_464ed6cab852594fce9034020d77dee3)
  const [formData, setFormData] = useState({
    widget_name: '',
    primary_color: '#4682B4',
    secondary_color: '#2E86AB',
    position: 'bottom-right',
    welcome_message: 'Hi! 👋 Welcome to WeTechForU. How can I help you today?',
    bot_name: 'Wetechforu Assistant',
    bot_avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
    enable_appointment_booking: false,
    enable_email_capture: false,
    enable_phone_capture: false,
    enable_ai_handoff: false,
    ai_handoff_url: '',
    rate_limit_messages: 10,
    rate_limit_window: 60,
    require_captcha: false,
    // 📧 Email Notification Settings
    enable_email_notifications: false,
    notification_email: '',
    visitor_engagement_minutes: 5,
    notify_new_conversation: true,
    notify_agent_handoff: true,
    notify_daily_summary: false
  })

  // 🤖 NEW: Intro Questions State (Template defaults)
  const [introFlowEnabled, setIntroFlowEnabledState] = useState(true)
  const setIntroFlowEnabled = (value: boolean) => {
    setIntroFlowEnabledState(value)
    if (!isInitialLoad) {
      trackChange(`Intro Flow ${value ? 'Enabled' : 'Disabled'}`)
    }
  }
  const [introQuestions, setIntroQuestions] = useState([
    { id: 'first_name', question: 'What is your first name?', type: 'text', required: true, order: 1 },
    { id: 'last_name', question: 'What is your last name?', type: 'text', required: true, order: 2 },
    { id: 'email', question: 'What is your email address?', type: 'email', required: true, order: 3 },
    { id: 'phone', question: 'What is your phone number?', type: 'tel', required: false, order: 4 }
  ])
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)

  // 💬 WhatsApp / Twilio Integration State
  const [whatsappEnabled, setWhatsappEnabledState] = useState(false)
  const setWhatsappEnabled = (value: boolean) => {
    setWhatsappEnabledState(value)
    // ✅ SYNC: When WhatsApp handoff is enabled/disabled, also update handover_options.whatsapp
    setHandoverOptions({ ...handoverOptions, whatsapp: value })
    if (!isInitialLoad) {
      trackChange(`WhatsApp Agent Handoff ${value ? 'Enabled' : 'Disabled'}`)
    }
  }
  const [whatsappSettings, setWhatsappSettings] = useState({
    account_sid: '',
    auth_token: '',
    from_number: ''
  })
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [whatsappUsage, setWhatsappUsage] = useState<any>(null)
  const [whatsappCredentialsPartial, setWhatsappCredentialsPartial] = useState<any>(null) // Last 4 digits for display
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)
  const [whatsappTestResult, setWhatsappTestResult] = useState<string | null>(null)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)

  // 🎯 Agent Handover Choice State (Template defaults)
  const [enableHandoverChoice, setEnableHandoverChoice] = useState(false)
  const [handoverOptions, setHandoverOptions] = useState({
    portal: false,
    whatsapp: false,
    email: false,
    phone: false,
    webhook: false
  })
  const [defaultHandoverMethod, setDefaultHandoverMethod] = useState('whatsapp')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [handoverWhatsAppNumber, setHandoverWhatsAppNumber] = useState('')
  const [handoverTemplateSid, setHandoverTemplateSid] = useState('')
  const [enableMultipleWhatsAppChats, setEnableMultipleWhatsAppChats] = useState(true)
  const setEnableMultipleWhatsAppChatsWithTracking = (value: boolean) => {
    setEnableMultipleWhatsAppChats(value)
    if (!isInitialLoad) {
      trackChange(`Multiple WhatsApp Chats ${value ? 'Enabled' : 'Disabled'}`)
    }
  }
  const [enableInactivityReminders, setEnableInactivityReminders] = useState(false)
  const setEnableInactivityRemindersWithTracking = (value: boolean) => {
    setEnableInactivityReminders(value)
    if (!isInitialLoad) {
      trackChange(`Inactivity Reminders ${value ? 'Enabled' : 'Disabled'}`)
    }
  }
  const [savingHandover, setSavingHandover] = useState(false)
  const [whatsappEditMode, setWhatsappEditMode] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null)
  const [testingHandoverWhatsApp, setTestingHandoverWhatsApp] = useState(false)

  // 🤖 AI/LLM Configuration State (Template defaults)
  const [enableAI, setEnableAIState] = useState(true)
  const setEnableAI = (value: boolean) => {
    setEnableAIState(value)
    if (!isInitialLoad) {
      setHasUnsavedChanges(true)
    }
  }
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiMaxTokens, setAiMaxTokens] = useState(1000)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [testingAI, setTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)
  const [savingAI, setSavingAI] = useState(false)
  // 🤖 LLM Usage Stats
  const [llmUsage, setLlmUsage] = useState<any>(null)
  const [llmProvider, setLlmProvider] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [loadingLlmUsage, setLoadingLlmUsage] = useState(false)
  const [apiKeyPartial, setApiKeyPartial] = useState('') // Partial API key for display
  const [apiKeySource, setApiKeySource] = useState<'widget' | 'client' | 'global' | null>(null) // Where the key is stored

  // 🏥 Industry & HIPAA State
  const [industryType, setIndustryType] = useState('general')
  const [enableHipaa, setEnableHipaa] = useState(false)
  const [hipaaDisclaimer, setHipaaDisclaimer] = useState('')
  const [detectSensitiveData, setDetectSensitiveData] = useState(false)
  const [emergencyKeywords, setEmergencyKeywords] = useState(true)
  const [emergencyContact, setEmergencyContact] = useState('Call 911 or visit nearest ER')

  // 📚 Knowledge Base Quick Setup
  const [quickKbEntries, setQuickKbEntries] = useState([{ question: '', answer: '', category: 'General' }])

  useEffect(() => {
    fetchUserAndClients()
    if (isEditMode) {
      fetchWidget()
    }
  }, [id])

  // Track unsaved changes and warn before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchUserAndClients = async () => {
    try {
      const userResponse = await api.get('/auth/me')
      setUserRole(userResponse.data.role)
      
      // If super admin, fetch all clients
      if (userResponse.data.role === 'super_admin' || userResponse.data.role === 'admin') {
        const clientsResponse = await api.get('/admin/clients')
        
        // ✅ FIX: API returns {clients: [], pagination: {}} so extract the clients array
        const responseData = clientsResponse.data
        
        if (responseData.clients && Array.isArray(responseData.clients)) {
          setClients(responseData.clients) // ✅ Extract the clients array
          console.log('✅ Loaded', responseData.clients.length, 'clients')
          console.log('📋 Client details:', responseData.clients.map((c: any) => ({
            id: c.id,
            name: c.name || c.client_name,
            email: c.email,
            status: c.status || c.is_active
          })))
        } else if (Array.isArray(responseData)) {
          // Fallback: in case API returns array directly
          setClients(responseData)
          console.log('✅ Loaded', responseData.length, 'clients (direct array)')
          console.log('📋 Client details:', responseData.map((c: any) => ({
            id: c.id,
            name: c.name || c.client_name,
            email: c.email
          })))
        } else {
          console.error('❌ Clients API returned unexpected format:', responseData)
          console.error('❌ Response type:', typeof responseData)
          console.error('❌ Response keys:', Object.keys(responseData || {}))
          setClients([]) // Fallback to empty array
        }
      } else {
        // Regular user - use their client_id
        setSelectedClientId(userResponse.data.client_id)
        setClients([]) // No client list needed for regular users
      }
    } catch (err: any) {
      console.error('Error fetching user/clients:', err)
      setClients([]) // ✅ FIX: Ensure clients is always an array even on error
      setError('Failed to load clients. Please refresh the page.')
    }
  }

  const fetchWidget = async () => {
    try {
        setIsInitialLoad(true) // Prevent hasUnsavedChanges from being set during load
        setHasUnsavedChanges(false) // Reset unsaved changes flag when loading widget (not a change)
        setChangesSummary([]) // Reset changes summary
      // Use single-widget endpoint so we can determine configured flags without exposing secrets
      const response = await api.get(`/chat-widget/widgets/${id}`)
      const widget = response.data
      if (widget) {
        setFormData({
          widget_name: widget.widget_name,
          primary_color: widget.primary_color,
          secondary_color: widget.secondary_color,
          position: widget.position,
          welcome_message: widget.welcome_message,
          bot_name: widget.bot_name,
          bot_avatar_url: widget.bot_avatar_url || '',
          enable_appointment_booking: widget.enable_appointment_booking,
          enable_email_capture: widget.enable_email_capture,
          enable_phone_capture: widget.enable_phone_capture,
          enable_ai_handoff: widget.enable_ai_handoff,
          ai_handoff_url: widget.ai_handoff_url || '',
          rate_limit_messages: widget.rate_limit_messages,
          rate_limit_window: widget.rate_limit_window,
          require_captcha: widget.require_captcha,
          // 📧 Email Notification Settings
          enable_email_notifications: widget.enable_email_notifications !== undefined ? widget.enable_email_notifications : true,
          notification_email: widget.notification_email || '',
          visitor_engagement_minutes: widget.visitor_engagement_minutes || 5,
          notify_new_conversation: widget.notify_new_conversation !== undefined ? widget.notify_new_conversation : true,
          notify_agent_handoff: widget.notify_agent_handoff !== undefined ? widget.notify_agent_handoff : true,
          notify_daily_summary: widget.notify_daily_summary !== undefined ? widget.notify_daily_summary : false
        })
        
        // ✅ FIX: Load intro flow settings
        if (widget.intro_flow_enabled !== undefined) {
          setIntroFlowEnabledState(widget.intro_flow_enabled)
        }
        
        if (widget.intro_questions) {
          try {
            const questions = typeof widget.intro_questions === 'string' 
              ? JSON.parse(widget.intro_questions) 
              : widget.intro_questions
            setIntroQuestions(questions)
          } catch (e) {
            console.error('Failed to parse intro_questions:', e)
          }
        }
        
        // Load AI settings
        if (widget.llm_enabled !== undefined) {
          setEnableAIState(widget.llm_enabled)
        }
        // ✅ FIX: Check if AI is configured from backend response (checks encrypted_credentials)
        if (widget.ai_configured !== undefined) {
          setAiConfigured(widget.ai_configured)
          console.log(`✅ AI configuration status: ${widget.ai_configured ? 'CONFIGURED' : 'NOT CONFIGURED'}`)
          
          // ✅ Store API key partial and source for display
          if (widget.ai_api_key_partial) {
            setApiKeyPartial(widget.ai_api_key_partial)
          }
          if (widget.ai_api_key_source) {
            setApiKeySource(widget.ai_api_key_source)
            console.log(`📦 API Key Source: ${widget.ai_api_key_source}`)
          }
        } else {
          // Fallback: Check if widget_specific_llm_key exists
          if (widget.widget_specific_llm_key && String(widget.widget_specific_llm_key).trim().length > 0) {
            setAiConfigured(true)
            setApiKeySource('widget')
            console.log('✅ AI API key found in widget_specific_llm_key')
          } else {
            setAiConfigured(false)
            console.log('❌ No AI API key found')
          }
        }
        if (widget.llm_max_tokens) {
          setAiMaxTokens(widget.llm_max_tokens)
        }
        if (widget.llm_provider) {
          setLlmProvider(widget.llm_provider)
        }
        if (widget.llm_model) {
          setLlmModel(widget.llm_model)
        }
        
        // ✅ Load LLM usage stats from widget response (already fetched by backend)
        if (widget.llm_usage_stats) {
          setLlmUsage(widget.llm_usage_stats)
          console.log('✅ LLM usage stats loaded:', widget.llm_usage_stats)
        } else if (widget.llm_enabled && widget.client_id) {
          // Fallback: Fetch if not in response
          fetchLlmUsage(widget.client_id, widget.id)
        }

        // Load Industry & HIPAA settings
        if (widget.industry) {
          setIndustryType(widget.industry)
        }
        if (widget.enable_hipaa !== undefined) {
          setEnableHipaa(widget.enable_hipaa)
        }
        if (widget.hipaa_disclaimer) {
          setHipaaDisclaimer(widget.hipaa_disclaimer)
        }
        if (widget.detect_sensitive_data !== undefined) {
          setDetectSensitiveData(widget.detect_sensitive_data)
        }
        if (widget.emergency_keywords !== undefined) {
          setEmergencyKeywords(widget.emergency_keywords)
        }
        if (widget.emergency_contact) {
          setEmergencyContact(widget.emergency_contact)
        }

        // ✅ FIX: Load WhatsApp settings - check both enable_whatsapp flag and configured status
        if (widget.enable_whatsapp !== undefined) {
          setWhatsappEnabledState(widget.enable_whatsapp)
          console.log(`✅ WhatsApp enabled status from widget: ${widget.enable_whatsapp}`)
        }
        // Note: whatsappConfigured is set by fetchWhatsAppSettings() which checks /whatsapp/settings/{clientId}

        // Load Handover Options
        if (widget.enable_handover_choice !== undefined) {
          setEnableHandoverChoice(widget.enable_handover_choice)
        }
        if (widget.handover_options) {
          try {
            const options = typeof widget.handover_options === 'string'
              ? JSON.parse(widget.handover_options)
              : widget.handover_options
            setHandoverOptions(options)
          } catch (e) {
            console.error('Failed to parse handover_options:', e)
          }
        }
        
        // ✅ SYNC: If enable_whatsapp is true, ensure handover_options.whatsapp is also true
        if (widget.enable_whatsapp && widget.handover_options) {
          try {
            const options = typeof widget.handover_options === 'string'
              ? JSON.parse(widget.handover_options)
              : widget.handover_options
            if (!options.whatsapp) {
              console.log('🔄 Syncing: enable_whatsapp is true, but handover_options.whatsapp is false - updating to true')
              setHandoverOptions({ ...options, whatsapp: true })
            }
          } catch (e) {
            console.error('Failed to sync WhatsApp handover options:', e)
          }
        }
        if (widget.default_handover_method) {
          setDefaultHandoverMethod(widget.default_handover_method)
        }
        if (widget.webhook_url) {
          setWebhookUrl(widget.webhook_url)
        }
        if (widget.webhook_secret) {
          setWebhookSecret(widget.webhook_secret)
        }

        // Set client_id for edit mode
        if (widget.client_id) {
          setSelectedClientId(widget.client_id)
          // Fetch WhatsApp settings for this client
          fetchWhatsAppSettings(widget.client_id)
        }
        
        // Fetch handover configuration
        fetchHandoverConfig(widget.id)
        
        // Load multiple WhatsApp chats setting
        if (widget.enable_multiple_whatsapp_chats !== undefined) {
          setEnableMultipleWhatsAppChats(widget.enable_multiple_whatsapp_chats)
        }
        // Load inactivity reminders setting (default to true if not set)
        if (widget.enable_inactivity_reminders !== undefined) {
          setEnableInactivityReminders(widget.enable_inactivity_reminders)
        } else {
          setEnableInactivityReminders(true) // Default to true
        }
        
        // Reset edit mode when widget loads
        setWhatsappEditMode(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widget')
    } finally {
      setLoading(false)
      // Mark initial load as complete after a short delay to ensure all state updates are done
      setTimeout(() => {
        setIsInitialLoad(false)
        setHasUnsavedChanges(false) // Final reset to ensure no false positives
      }, 100)
    }
  }

  // 🤖 Fetch LLM Usage Stats
  const fetchLlmUsage = async (clientId: number, widgetId: number) => {
    try {
      setLoadingLlmUsage(true)
      const response = await api.get(`/chat-widget/clients/${clientId}/llm-usage`)
      // Find usage for this specific widget
      const widgetUsage = response.data.find((usage: any) => usage.widget_id === widgetId)
      if (widgetUsage) {
        setLlmUsage(widgetUsage)
      } else {
        // No usage record yet - create defaults
        setLlmUsage({
          tokens_used_this_month: 0,
          monthly_token_limit: 100000, // Default 100K
          tokens_used_today: 0,
          daily_token_limit: 5000, // Default 5K
          requests_made_this_month: 0,
          monthly_request_limit: 1000,
          requests_made_today: 0,
          daily_request_limit: 100
        })
      }
    } catch (err) {
      console.error('Failed to fetch LLM usage:', err)
      // Set defaults on error
      setLlmUsage({
        tokens_used_this_month: 0,
        monthly_token_limit: 100000,
        tokens_used_today: 0,
        daily_token_limit: 5000
      })
    } finally {
      setLoadingLlmUsage(false)
    }
  }

  // 💬 Fetch WhatsApp Settings
  const fetchWhatsAppSettings = async (clientId: number) => {
    try {
      console.log(`🔍 Checking WhatsApp configuration for client ${clientId}...`)
      const response = await api.get(`/whatsapp/settings/${clientId}`)
      console.log('WhatsApp settings response:', response.data)
      
      if (response.data.configured) {
        console.log('✅ WhatsApp is configured - showing badge')
        setWhatsappConfigured(true)
        setWhatsappEnabled(response.data.enable_whatsapp || false)
        
        // ✅ Store partial credentials (last 4 digits) for display
        if (response.data.credentials_partial) {
          setWhatsappCredentialsPartial(response.data.credentials_partial)
          console.log('✅ WhatsApp partial credentials loaded:', response.data.credentials_partial)
        }
      } else {
        console.log('❌ WhatsApp is NOT configured')
        setWhatsappCredentialsPartial(null)
      }
      
      // Fetch usage stats (returned from settings endpoint)
      if (response.data.usage) {
        setWhatsappUsage(response.data.usage)
      } else {
        // Fallback: try separate endpoint if it exists
        try {
          const usageResponse = await api.get(`/whatsapp/usage/${clientId}`)
          setWhatsappUsage(usageResponse.data)
        } catch (e) {
          console.warn('Usage endpoint not available, using default values')
          setWhatsappUsage({
            messages_this_month: 0,
            conversations_this_month: 0,
            estimated_cost_this_month: 0,
            actual_cost_this_month: 0,
            cost_this_month: 0,
            has_actual_prices: false,
            next_reset_date: null
          })
        }
      }

      // Fetch per-client handover (phone + template SID)
      try {
        const handover = await api.get(`/handover/config/client/${clientId}`)
        setHandoverWhatsAppNumber(handover.data.handover_whatsapp_number || '')
        setHandoverTemplateSid(handover.data.whatsapp_handover_content_sid || '')
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to load WhatsApp settings:', err)
      // Not an error - just means WhatsApp isn't configured yet
    }
  }

  // 💬 Save WhatsApp Settings
  const handleSaveWhatsAppSettings = async () => {
    if (!selectedClientId) {
      setError('Please select a client first')
      return
    }

    setSavingWhatsApp(true)
    setWhatsappTestResult(null)

    try {
      await api.post('/whatsapp/settings', {
        client_id: selectedClientId,
        account_sid: whatsappSettings.account_sid,
        auth_token: whatsappSettings.auth_token,
        from_number: whatsappSettings.from_number,
        enable_whatsapp: whatsappEnabled
      })

      setWhatsappConfigured(true)
      alert('✅ WhatsApp settings saved successfully!')
      
      // Refresh usage stats and exit edit mode
      fetchWhatsAppSettings(selectedClientId)
      setWhatsappEditMode(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save WhatsApp settings')
    } finally {
      setSavingWhatsApp(false)
    }
  }

  // 💬 Test WhatsApp Connection
  const handleTestWhatsApp = async () => {
    if (!selectedClientId) {
      setWhatsappTestResult('❌ Please select a client first')
      return
    }

    setTestingWhatsApp(true)
    setWhatsappTestResult(null)

    try {
      const response = await api.post('/whatsapp/test-connection', {
        client_id: selectedClientId
      })

      setWhatsappTestResult(`✅ ${response.data.message}`)
    } catch (err: any) {
      setWhatsappTestResult(`❌ ${err.response?.data?.error || 'Connection test failed'}`)
    } finally {
      setTestingWhatsApp(false)
    }
  }

  // 💬 Combined Test: Connection + Test Message
  const handleTestWhatsAppComplete = async () => {
    if (!selectedClientId) {
      alert('❌ Please select a client first')
      return
    }

    if (!handoverWhatsAppNumber.trim()) {
      alert('❌ Please enter WhatsApp handover phone number first')
      return
    }

    setTestingWhatsApp(true)
    setWhatsappTestResult(null)

    try {
      // Step 1: Test Connection
      setWhatsappTestResult('🔄 Testing connection...')
      const connectionResponse = await api.post('/whatsapp/test-connection', {
        client_id: selectedClientId
      })

      if (!connectionResponse.data.success) {
        setWhatsappTestResult(`❌ Connection failed: ${connectionResponse.data.message}`)
        return
      }

      // Step 2: Send Test Message
      setWhatsappTestResult('🔄 Connection OK! Sending test message...')
      const messageResponse = await api.post('/handover/test-whatsapp', {
        client_id: selectedClientId,
        phone_number: handoverWhatsAppNumber.trim()
      })

      if (messageResponse.data.success) {
        setWhatsappTestResult(`✅ Connection & Message Test Complete!\n\n✅ Connection: OK\n✅ Test message sent to ${handoverWhatsAppNumber}\n\nCheck your WhatsApp to confirm receipt.`)
      } else {
        setWhatsappTestResult(`⚠️ Connection OK, but message failed: ${messageResponse.data.error || 'Unknown error'}`)
      }
    } catch (err: any) {
      setWhatsappTestResult(`❌ Test failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setTestingWhatsApp(false)
    }
  }

  // 🎯 Fetch Handover Configuration
  const fetchHandoverConfig = async (widgetId: number) => {
    try {
      const response = await api.get(`/handover/config/${widgetId}`)
      const config = response.data
      
      setEnableHandoverChoice(config.enable_handover_choice ?? true)
      const loadedOptions = config.handover_options || {
        portal: true,
        whatsapp: false,
        email: true,
        phone: false,
        webhook: false
      }
      setHandoverOptions(loadedOptions)
      
      // ✅ SYNC: If WhatsApp is enabled in widget_configs, ensure it's also enabled in handover_options
      // Note: whatsappEnabled state is set earlier in fetchWidget, so we check it here
      if (whatsappEnabled && !loadedOptions.whatsapp) {
        console.log('🔄 Syncing handover_options.whatsapp to match enable_whatsapp')
        setHandoverOptions({ ...loadedOptions, whatsapp: true })
      }
      
      setDefaultHandoverMethod(config.default_handover_method || 'portal')
      setWebhookUrl(config.webhook_url || '')
      // Load handover WhatsApp number if available
      if (config.handover_whatsapp_number) {
        setHandoverWhatsAppNumber(config.handover_whatsapp_number)
      }
      // Don't load webhook_secret for security - it stays on server
      
      // Also fetch client's handover WhatsApp number if widget has client_id
      if (selectedClientId) {
        try {
          const clientHandoverResponse = await api.get(`/handover/config/client/${selectedClientId}`)
          if (clientHandoverResponse.data.handover_whatsapp_number) {
            setHandoverWhatsAppNumber(clientHandoverResponse.data.handover_whatsapp_number)
          }
        } catch (err) {
          // Client handover config might not exist yet - that's OK
          console.log('No client handover config found (this is OK)')
        }
      }
    } catch (err) {
      console.error('Failed to load handover config:', err)
    }
  }

  // 🎯 Save Handover Configuration
  const handleSaveHandoverConfig = async () => {
    if (!id) {
      alert('Please save the widget first before configuring handover options')
      return
    }

    setSavingHandover(true)
    setWebhookTestResult(null)

    try {
      // Save widget handover config
      // Note: enable_handover_choice is always false - visitors don't choose, client configures the method
      await api.put(`/handover/config/${id}`, {
        enable_handover_choice: false, // Visitors don't choose - system uses configured default
        handover_options: handoverOptions,
        default_handover_method: defaultHandoverMethod,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || null,
        handover_whatsapp_number: handoverWhatsAppNumber || null
      })

      // Also save to client config if client_id is set
      if (selectedClientId) {
        try {
          await api.put(`/handover/config/client/${selectedClientId}`, {
            handover_whatsapp_number: handoverWhatsAppNumber,
            whatsapp_handover_content_sid: handoverTemplateSid
          })
        } catch (err) {
          console.error('Failed to save client handover config:', err)
          // Don't fail the whole operation if client save fails
        }
      }

      alert('✅ Handover configuration saved successfully!')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save handover configuration')
    } finally {
      setSavingHandover(false)
    }
  }

  // 🎯 Test Webhook Connection
  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setWebhookTestResult('❌ Please enter a webhook URL first')
      return
    }

    setTestingWebhook(true)
    setWebhookTestResult(null)

    try {
      const response = await api.post('/handover/test-webhook', {
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret || null
      })

      setWebhookTestResult(`✅ ${response.data.message} (Status: ${response.data.status_code})`)
    } catch (err: any) {
      setWebhookTestResult(`❌ ${err.response?.data?.error || 'Webhook test failed'}`)
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isEditMode && !selectedClientId && (userRole === 'super_admin' || userRole === 'admin')) {
      setError('⚠️ REQUIRED: Please select a client in Step 1 before creating the widget!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    
    setSaving(true)
    setError('')

    try {
      const widgetData: any = {
        ...formData,
        intro_flow_enabled: introFlowEnabled,
        intro_questions: JSON.stringify(introQuestions),
        // AI Smart Responses
        llm_enabled: enableAI,
        llm_max_tokens: aiMaxTokens,
        // Industry & HIPAA
        industry: industryType,
        enable_hipaa: enableHipaa,
        hipaa_disclaimer: hipaaDisclaimer,
        detect_sensitive_data: detectSensitiveData,
        emergency_keywords: emergencyKeywords,
        emergency_contact: emergencyContact,
        // WhatsApp
        enable_whatsapp: whatsappEnabled,
        enable_multiple_whatsapp_chats: enableMultipleWhatsAppChats,
        enable_inactivity_reminders: enableInactivityReminders,
        // Handover Options
        enable_handover_choice: false, // Visitors don't choose - system uses configured default
        // ✅ SYNC: Ensure handover_options.whatsapp matches enable_whatsapp
        handover_options: JSON.stringify({
          ...handoverOptions,
          whatsapp: whatsappEnabled
        }),
        default_handover_method: defaultHandoverMethod,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        ...(isEditMode ? {} : { client_id: selectedClientId })
      }

      // Only include AI key if user has entered a new one (to update)
      if (aiApiKey && aiApiKey.trim().length > 0) {
        widgetData.widget_specific_llm_key = aiApiKey
      }

      let savedWidgetId = id
      
      if (isEditMode) {
        await api.put(`/chat-widget/widgets/${id}`, widgetData)
        savedWidgetId = id
      } else {
        const createResponse = await api.post('/chat-widget/widgets', widgetData)
        savedWidgetId = createResponse.data?.id
        if (!savedWidgetId) {
          throw new Error('Failed to create widget - no ID returned')
        }
      }

      // Save WhatsApp settings ONLY if user has entered new credentials (all three fields required)
      // The enable_whatsapp flag is already saved in widget_configs above
      if (selectedClientId && 
          whatsappSettings.account_sid && 
          whatsappSettings.account_sid.trim() &&
          whatsappSettings.auth_token && 
          whatsappSettings.auth_token.trim() &&
          whatsappSettings.from_number && 
          whatsappSettings.from_number.trim()) {
        try {
          await api.post('/whatsapp/settings', {
            client_id: selectedClientId,
            account_sid: whatsappSettings.account_sid.trim(),
            auth_token: whatsappSettings.auth_token.trim(),
            from_number: whatsappSettings.from_number.trim()
          })
        } catch (err: any) {
          console.error('Failed to save WhatsApp settings:', err)
          // Don't fail the whole operation - widget settings are already saved
        }
      }

      // Save Handover Configuration if widget ID exists
      if (savedWidgetId) {
        try {
          await api.put(`/handover/config/${savedWidgetId}`, {
            enable_handover_choice: false,
            // ✅ SYNC: Ensure handover_options.whatsapp matches enable_whatsapp
            handover_options: {
              ...handoverOptions,
              whatsapp: whatsappEnabled
            },
            default_handover_method: defaultHandoverMethod,
            webhook_url: webhookUrl || null,
            webhook_secret: webhookSecret || null,
            handover_whatsapp_number: handoverWhatsAppNumber || null
          })

          // Also save to client config if client_id is set
          if (selectedClientId) {
            await api.put(`/handover/config/client/${selectedClientId}`, {
              handover_whatsapp_number: handoverWhatsAppNumber,
              whatsapp_handover_content_sid: handoverTemplateSid
            })
          }
        } catch (err: any) {
          console.error('Failed to save handover config:', err)
          // Don't fail the whole operation
        }
      }

      setHasUnsavedChanges(false) // Clear unsaved changes flag after successful save
      setChangesSummary([]) // Clear changes summary
      navigate('/app/chat-widgets')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save widget')
    } finally {
      setSaving(false)
    }
  }

  // Track changes with descriptive names
  const trackChange = (description: string) => {
    if (!isInitialLoad && !changesSummary.includes(description)) {
      setChangesSummary(prev => [...prev, description])
      setHasUnsavedChanges(true)
    }
  }

  const handleChange = (field: string, value: any, description?: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (!isInitialLoad) {
      setHasUnsavedChanges(true)
      if (description) {
        trackChange(description)
      } else {
        // Auto-generate description from field name
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        trackChange(`Changed ${fieldName}`)
      }
    }
  }

  // 🤖 Question Management Functions
  const addQuestion = () => {
    const newQuestion = {
      id: `custom_${Date.now()}`,
      question: '',
      type: 'text',
      required: false,
      order: introQuestions.length + 1,
      options: []
    }
    setEditingQuestion(newQuestion)
    setShowQuestionForm(true)
  }

  const saveQuestion = () => {
    if (!editingQuestion.question.trim()) {
      alert('Question text is required')
      return
    }

    if (editingQuestion.id.startsWith('custom_') && !introQuestions.find(q => q.id === editingQuestion.id)) {
      // New question
      setIntroQuestions([...introQuestions, editingQuestion])
    } else {
      // Update existing
      setIntroQuestions(introQuestions.map(q => q.id === editingQuestion.id ? editingQuestion : q))
    }

    setEditingQuestion(null)
    setShowQuestionForm(false)
  }

  const deleteQuestion = (questionId: string) => {
    if (confirm('Delete this question?')) {
      setIntroQuestions(introQuestions.filter(q => q.id !== questionId))
    }
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...introQuestions]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]]
    
    // Update order numbers
    newQuestions.forEach((q, i) => { q.order = i + 1 })
    
    setIntroQuestions(newQuestions)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading widget...</div>
  }

  // ✅ Handle navigation with unsaved changes warning
  const handleNavigateAway = (targetPath: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    navigate(targetPath)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        type="button"
        onClick={() => handleNavigateAway('/app/chat-widgets')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '1.5rem',
          padding: '10px 16px',
          background: '#f8f9fa',
          border: '2px solid #dee2e6',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          color: '#495057',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e9ecef'
          e.currentTarget.style.borderColor = '#adb5bd'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f8f9fa'
          e.currentTarget.style.borderColor = '#dee2e6'
        }}
      >
        <i className="fas fa-arrow-left"></i>
        Back to Chat Widgets
      </button>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div style={{
          marginBottom: '1rem',
          padding: '12px 16px',
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#856404'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
          You have unsaved changes. Don't forget to click "Save Changes" before leaving!
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
          {isEditMode ? 'Edit Widget' : 'Create New Widget'}
        </h1>
        <p style={{ margin: 0, color: '#666' }}>
          Configure your AI chat widget settings and appearance
        </p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          color: '#c00',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {error}
        </div>
      )}

      {/* CLIENT SELECTOR - MUST BE FIRST! */}
      {!isEditMode && (userRole === 'super_admin' || userRole === 'admin') && (
        <div style={{
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 16px rgba(33, 150, 243, 0.3)',
          border: '3px solid #2196f3'
        }}>
          <h3 style={{ 
            marginTop: 0, 
            marginBottom: '1rem', 
            fontSize: '1.5rem', 
            color: '#0d47a1',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <i className="fas fa-building" style={{ fontSize: '1.8rem' }}></i>
            Step 1: Select Client (REQUIRED)
          </h3>

          {clients.length === 0 ? (
            <div style={{
              padding: '1.5rem',
              background: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              color: '#856404',
              marginBottom: '1rem'
            }}>
              <p style={{ margin: 0, fontWeight: '600' }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Loading clients...
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px' }}>
                Please wait while we fetch the client list.
              </p>
            </div>
          ) : (
            <>
              <label style={{ 
                display: 'block', 
                marginBottom: '1rem', 
                fontWeight: '700', 
                color: '#1976d2',
                fontSize: '1.1rem'
              }}>
                <i className="fas fa-users" style={{ marginRight: '8px' }}></i>
                Which client is this widget for? *
              </label>
              <select
                required
                value={selectedClientId || ''}
                onChange={(e) => {
                  const clientId = parseInt(e.target.value)
                  setSelectedClientId(clientId)
                  setError('') // Clear error when client is selected
                  
                  // ✅ Auto-fill widget name and welcome message based on selected client
                  if (clientId && Array.isArray(clients)) {
                    const selectedClient = clients.find((c: any) => c.id === clientId)
                    if (selectedClient) {
                      const clientName = selectedClient.name || selectedClient.client_name || selectedClient.company || selectedClient.email || 'Client'
                      setFormData(prev => ({
                        ...prev,
                        widget_name: `${clientName} Chat Widget`,
                        welcome_message: `Hi! Welcome to ${clientName}. How can we help you today?`,
                        bot_name: `${clientName} Assistant`
                      }))
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '15px',
                  border: selectedClientId ? '3px solid #4caf50' : '3px solid #2196f3',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <option value="">🔽 -- Select a Client First --</option>
                {Array.isArray(clients) && clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    🏢 {client.name || client.client_name || client.company || client.email || `Client #${client.id}`}
                  </option>
                ))}
              </select>
              {selectedClientId && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#e8f5e9',
                  border: '2px solid #4caf50',
                  borderRadius: '8px',
                  color: '#2e7d32'
                }}>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
                    ✅ Client Selected! This widget will belong to this client.
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '13px' }}>
                    <i className="fas fa-brain" style={{ marginRight: '4px' }}></i>
                    They will have their own private knowledge base.
                  </p>
                </div>
              )}
              <p style={{ 
                margin: '1rem 0 0 0', 
                fontSize: '13px', 
                color: '#555',
                lineHeight: '1.6'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '4px', color: '#2196f3' }}></i>
                <strong>Important:</strong> Each widget is assigned to ONE client. The knowledge base, conversations, 
                and settings will be isolated to that client only.
              </p>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Settings */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>
            {!isEditMode && (userRole === 'super_admin' || userRole === 'admin') ? 'Step 2: Basic Settings' : 'Basic Settings'}
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Widget Name *
            </label>
            <input
              type="text"
              required
              value={formData.widget_name}
              onChange={(e) => handleChange('widget_name', e.target.value)}
              placeholder="My Website Chat Widget"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Bot Name
            </label>
            <input
              type="text"
              value={formData.bot_name}
              onChange={(e) => handleChange('bot_name', e.target.value)}
              placeholder="Assistant"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Welcome Message
            </label>
            <textarea
              value={formData.welcome_message}
              onChange={(e) => handleChange('welcome_message', e.target.value)}
              rows={3}
              placeholder="Hi! How can I help you today?"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              <i className="fas fa-robot" style={{ marginRight: '8px', color: '#4682B4' }}></i>
              Bot Avatar / Logo
            </label>
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #e0e0e0'
            }}>
              {/* Avatar Preview */}
              <div style={{ flex: '0 0 80px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '3px solid #4682B4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {formData.bot_avatar_url ? (
                    <img 
                      src={formData.bot_avatar_url} 
                      alt="Bot Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling!.textContent = '🤖' }}
                    />
                  ) : (
                    <span>🤖</span>
                  )}
                </div>
              </div>
              
              {/* URL Input */}
              <div style={{ flex: 1 }}>
                <input
                  type="url"
                  value={formData.bot_avatar_url}
                  onChange={(e) => handleChange('bot_avatar_url', e.target.value)}
                  placeholder="Enter avatar image URL (e.g., https://example.com/logo.png)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 5px 0' }}>
                    <strong>💡 Tips:</strong>
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Leave empty to use default 🤖 robot emoji</li>
                    <li>Use square images (recommended: 200x200px)</li>
                    <li>Supported: PNG, JPG, SVG</li>
                  </ul>
                </div>
                
                {/* Quick Default Options */}
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleChange('bot_avatar_url', '')}
                    style={{
                      padding: '6px 12px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Use Default 🤖
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('bot_avatar_url', 'https://cdn-icons-png.flaticon.com/512/4712/4712027.png')}
                    style={{
                      padding: '6px 12px',
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Medical Bot 🏥
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('bot_avatar_url', 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png')}
                    style={{
                      padding: '6px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Support Bot 💬
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>Appearance</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Primary Color
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Secondary Color
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  style={{
                    width: '60px',
                    height: '40px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Position
            </label>
            <select
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>
        </div>

        {/* Features */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>Features</h3>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enable_appointment_booking}
              onChange={(e) => handleChange('enable_appointment_booking', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable Appointment Booking</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enable_email_capture}
              onChange={(e) => handleChange('enable_email_capture', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable Email Capture</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enable_phone_capture}
              onChange={(e) => handleChange('enable_phone_capture', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable Phone Capture</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enable_ai_handoff}
              onChange={(e) => handleChange('enable_ai_handoff', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable AI Agent Handoff</span>
          </label>

          {formData.enable_ai_handoff && (
            <div style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px' }}>
                AI Agent URL
              </label>
              <input
                type="url"
                value={formData.ai_handoff_url}
                onChange={(e) => handleChange('ai_handoff_url', e.target.value)}
                placeholder="https://your-ai-agent.com"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          )}
        </div>

        {/* Anti-Spam */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>Anti-Spam Settings</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Rate Limit (messages)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.rate_limit_messages}
                onChange={(e) => handleChange('rate_limit_messages', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Time Window (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                value={formData.rate_limit_window}
                onChange={(e) => handleChange('rate_limit_window', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* CAPTCHA hidden until implemented */}
        </div>

        {/* 🤖 AI/LLM Configuration */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤖 AI Smart Responses (Google Gemini)
            {enableAI && aiConfigured && (
              <span style={{
                background: '#28a745',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ✓ Active
              </span>
            )}
            {aiConfigured && !enableAI && (
              <span style={{
                background: '#ffc107',
                color: '#856404',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                ⚙️ Configured (Disabled)
              </span>
            )}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
            Enable AI-powered responses using Google Gemini. AI will answer questions the Knowledge Base can't handle.
          </p>

          {/* ✅ Current Configuration Status */}
          {enableAI && (
            <div style={{
              padding: '1rem',
              background: '#e8f5e9',
              borderRadius: '8px',
              border: '2px solid #4caf50',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#2e7d32' }}>
                📊 Current Configuration Status
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#666' }}>Provider:</span>
                  <strong style={{ marginLeft: '8px', color: '#2e7d32' }}>
                    {llmProvider || 'gemini'} {aiConfigured ? '✅' : '❌'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Model:</span>
                  <strong style={{ marginLeft: '8px', color: '#2e7d32' }}>
                    {llmModel || 'gemini-2.0-flash'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>API Key Status:</span>
                  <strong style={{ marginLeft: '8px', color: aiConfigured ? '#2e7d32' : '#d32f2f' }}>
                    {aiConfigured ? '✅ Configured' : '❌ Not Configured'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Monthly Limit:</span>
                  <strong style={{ marginLeft: '8px', color: '#2e7d32' }}>
                    {aiMaxTokens.toLocaleString()} tokens
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Usage Statistics */}
          {enableAI && llmUsage && (
            <div style={{
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                📈 Current Usage (This Month)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#666' }}>Tokens Used:</span>
                  <strong style={{ 
                    marginLeft: '8px', 
                    color: (llmUsage.tokens_used_this_month / (llmUsage.monthly_token_limit || 100000) > 0.9) ? '#dc3545' : '#28a745'
                  }}>
                    {llmUsage.tokens_used_this_month?.toLocaleString() || 0} / {llmUsage.monthly_token_limit?.toLocaleString() || '100,000'}
                  </strong>
                  <div style={{ 
                    marginTop: '4px',
                    height: '6px',
                    background: '#e0e0e0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((llmUsage.tokens_used_this_month || 0) / (llmUsage.monthly_token_limit || 100000)) * 100)}%`,
                      background: (llmUsage.tokens_used_this_month / (llmUsage.monthly_token_limit || 100000) > 0.9) ? '#dc3545' : '#28a745',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Tokens Remaining:</span>
                  <strong style={{ 
                    marginLeft: '8px',
                    color: (llmUsage.tokens_used_this_month / (llmUsage.monthly_token_limit || 100000) > 0.9) ? '#dc3545' : '#28a745'
                  }}>
                    {((llmUsage.monthly_token_limit || 100000) - (llmUsage.tokens_used_this_month || 0)).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Today's Usage:</span>
                  <strong style={{ marginLeft: '8px' }}>
                    {llmUsage.tokens_used_today?.toLocaleString() || 0} / {llmUsage.daily_token_limit?.toLocaleString() || '5,000'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Requests This Month:</span>
                  <strong style={{ marginLeft: '8px' }}>
                    {llmUsage.requests_made_this_month || 0} / {llmUsage.monthly_request_limit || 1000}
                  </strong>
                </div>
              </div>
              {loadingLlmUsage && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  <i className="fas fa-spinner fa-spin"></i> Loading usage stats...
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableAI}
              onChange={(e) => setEnableAI(e.target.checked)}
              style={{ marginRight: '10px', width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: '700', fontSize: '16px' }}>Enable AI-powered responses</span>
          </label>

          {enableAI && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', marginBottom: '0.5rem', fontWeight: '600', alignItems: 'center', gap: '10px' }}>
                  Google AI API Key *
                  {aiConfigured && (
                    <span style={{
                      background: '#28a745',
                      color: 'white',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      ✓ Configured
                    </span>
                  )}
                </label>
                {aiConfigured && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#155724'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <i className="fas fa-lock"></i>
                      <strong>API key is saved and encrypted.</strong>
                    </div>
                    {apiKeyPartial && (
                      <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }}>
                        Current Key: <strong>{apiKeyPartial}</strong>
                        {apiKeySource && (
                          <span style={{ marginLeft: '8px', fontSize: '10px' }}>
                            ({apiKeySource === 'widget' ? 'Widget-Specific' : apiKeySource === 'client' ? 'Client-Specific' : 'Global'})
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.8 }}>
                      Enter new key below to update.
                    </div>
                  </div>
                )}
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  autoComplete="current-password"
                  placeholder={aiConfigured ? (apiKeyPartial || "AIzaSy••••••••••••••••••••••••") : "AIzaSy..."}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                  Get your free API key from{' '}
                  <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#4682B4' }}>
                    Google AI Studio
                  </a>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Free Credits per Month (tokens)
                </label>
                <input
                  type="number"
                  min="100"
                  max="100000"
                  value={aiMaxTokens}
                  onChange={(e) => setAiMaxTokens(parseInt(e.target.value))}
                  style={{
                    width: '200px',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                  Monthly token limit for AI responses. Resets automatically.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!aiApiKey.trim()) {
                      setAiTestResult('❌ Please enter API key first')
                      return
                    }
                    setTestingAI(true)
                    setAiTestResult(null)
                    try {
                      // Test AI connection (you'll need to implement this endpoint)
                      const response = await api.post('/chat-widget/test-ai', {
                        api_key: aiApiKey
                      })
                      setAiTestResult('✅ ' + response.data.message)
                      setAiConfigured(true)
                    } catch (error: any) {
                      setAiTestResult('❌ ' + (error.response?.data?.error || 'Test failed'))
                      setAiConfigured(false)
                    } finally {
                      setTestingAI(false)
                    }
                  }}
                  disabled={testingAI}
                  style={{
                    padding: '10px 20px',
                    background: testingAI ? '#6c757d' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: testingAI ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {testingAI ? 'Testing...' : '🧪 Test AI Connection'}
                </button>
              </div>

              {aiTestResult && (
                <div style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: aiTestResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${aiTestResult.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: aiTestResult.startsWith('✅') ? '#155724' : '#721c24'
                }}>
                  {aiTestResult}
                </div>
              )}
            </>
          )}
        </div>

        {/* 📧 Email Notification Settings */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📧 Email Notifications
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
            Configure email alerts for new messages, visitors, and agent handoffs
          </p>

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.enable_email_notifications}
              onChange={(e) => handleChange('enable_email_notifications', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
            />
            <span style={{ fontWeight: '700', fontSize: '16px' }}>Enable Email Notifications</span>
          </label>

          {formData.enable_email_notifications && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Notification Email Address *
                </label>
                <input
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => handleChange('notification_email', e.target.value)}
                  placeholder="your-email@example.com"
                  required={formData.enable_email_notifications}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  All email alerts will be sent to this address
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Visitor Engagement Alert (after X minutes on site)
                </label>
                <select
                  value={formData.visitor_engagement_minutes}
                  onChange={(e) => handleChange('visitor_engagement_minutes', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value={1}>After 1 minute</option>
                  <option value={2}>After 2 minutes</option>
                  <option value={3}>After 3 minutes</option>
                  <option value={5}>After 5 minutes (Recommended)</option>
                  <option value={10}>After 10 minutes</option>
                  <option value={15}>After 15 minutes</option>
                  <option value={30}>After 30 minutes</option>
                  <option value={0}>Never (Disabled)</option>
                </select>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Get notified when a visitor stays on your site for this long (potential hot lead!)
                </p>
              </div>

              <div style={{ 
                padding: '1rem', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '1rem' }}>
                  Email Notification Types:
                </p>

                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.notify_new_conversation}
                    onChange={(e) => handleChange('notify_new_conversation', e.target.checked)}
                    style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                  />
                  <span>💬 New Conversation Started</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.notify_agent_handoff}
                    onChange={(e) => handleChange('notify_agent_handoff', e.target.checked)}
                    style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                  />
                  <span>🔴 Agent Handoff Requested (Urgent)</span>
                </label>

                {/* Daily Summary Report temporarily hidden until implemented */}
              </div>

              <div style={{ 
                marginTop: '1rem',
                padding: '1rem',
                background: '#e3f2fd',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#1565c0'
              }}>
                <strong>💡 Tip:</strong> You'll receive instant email alerts for every new message when agent handoff is active.
                This helps you respond quickly to customers waiting for human support!
              </div>
            </>
          )}
        </div>

        {/* 💬 WhatsApp / Twilio Integration - Standard Format */}
        {selectedClientId && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Header with Edit Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fab fa-whatsapp" style={{ color: '#25D366', fontSize: '1.8rem' }}></i>
                  WhatsApp Integration
                </h3>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
                  Enable agent handoff via WhatsApp. Includes <strong>1,000 free conversations/month</strong> per client! 🎉
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappEditMode(!whatsappEditMode)}
                style={{
                  padding: '10px 20px',
                  background: whatsappEditMode ? '#6c757d' : '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className={`fas fa-${whatsappEditMode ? 'times' : 'edit'}`}></i>
                {whatsappEditMode ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {!whatsappEditMode ? (
              /* VIEW MODE - Summary Cards */
              <>
                {/* Status Card */}
                <div style={{
                  padding: '1.5rem',
                  background: whatsappConfigured ? '#e8f5e9' : '#fff3cd',
                  borderRadius: '8px',
                  border: `2px solid ${whatsappConfigured ? '#4caf50' : '#ffc107'}`,
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: whatsappConfigured ? '#2e7d32' : '#856404' }}>
                      Configuration Status
                    </h4>
                    {whatsappConfigured && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✓ Configured
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '14px' }}>
                    <div>
                      <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>Status</span>
                      <strong style={{ color: whatsappConfigured ? '#2e7d32' : '#d32f2f' }}>
                        {whatsappConfigured ? '✅ Configured' : '❌ Not Configured'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>Enabled for Handoff</span>
                      <strong style={{ color: (whatsappEnabled || (whatsappConfigured && handoverWhatsAppNumber)) ? '#2e7d32' : '#666' }}>
                        {(whatsappEnabled || (whatsappConfigured && handoverWhatsAppNumber)) ? '✅ Yes' : '❌ No'}
                      </strong>
                    </div>
                    {enableMultipleWhatsAppChats && (
                      <div>
                        <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>Multiple Chats</span>
                        <strong style={{ color: '#2e7d32' }}>✅ Enabled</strong>
                      </div>
                    )}
                    {handoverWhatsAppNumber && (
                      <div>
                        <span style={{ color: '#666', display: 'block', marginBottom: '4px' }}>Handover Number</span>
                        <strong style={{ color: '#2e7d32', fontFamily: 'monospace' }}>{handoverWhatsAppNumber}</strong>
                      </div>
                    )}
                  </div>
                  {whatsappCredentialsPartial && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <span style={{ color: '#666', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Credentials (Last 4 digits)</span>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '12px', fontFamily: 'monospace' }}>
                        {whatsappCredentialsPartial.account_sid && <span>SID: <strong>{whatsappCredentialsPartial.account_sid}</strong></span>}
                        {whatsappCredentialsPartial.auth_token && <span>Token: <strong>{whatsappCredentialsPartial.auth_token}</strong></span>}
                        {whatsappCredentialsPartial.from_number && <span>From: <strong>{whatsappCredentialsPartial.from_number}</strong></span>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Usage Stats */}
                {whatsappUsage && (
                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1rem',
                    border: '1px solid #dee2e6'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '600' }}>
                      Usage Statistics (This Month)
                    </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: '#666' }}>Conversations:</span>
                    <strong style={{ marginLeft: '8px', color: whatsappUsage.conversations_this_month >= 1000 ? '#dc3545' : '#28a745' }}>
                      {whatsappUsage.conversations_this_month || 0} / 1,000
                    </strong>
                    <div style={{ 
                      marginTop: '4px',
                      height: '6px',
                      background: '#e0e0e0',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, ((whatsappUsage.conversations_this_month || 0) / 1000) * 100)}%`,
                        background: whatsappUsage.conversations_this_month >= 1000 ? '#dc3545' : '#28a745',
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                    {whatsappUsage.conversations_this_month >= 1000 && (
                      <span style={{ color: '#dc3545', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                        ⚠️ Free tier exceeded! Additional costs apply.
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Messages Sent:</span>
                    <strong style={{ marginLeft: '8px' }}>{whatsappUsage.messages_this_month || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Remaining (Free):</span>
                    <strong style={{ marginLeft: '8px', color: '#28a745' }}>
                      {whatsappUsage.free_messages_remaining !== undefined 
                        ? whatsappUsage.free_messages_remaining 
                        : Math.max(0, 1000 - (whatsappUsage.conversations_this_month || 0))}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Cost (This Month):</span>
                    <strong style={{ marginLeft: '8px', color: '#4682B4' }}>
                      {(whatsappUsage.has_actual_prices || (whatsappUsage.cost_this_month !== undefined && whatsappUsage.actual_cost_this_month !== undefined))
                        ? `$${Number(whatsappUsage.cost_this_month || whatsappUsage.actual_cost_this_month || 0).toFixed(2)} USD (Actual)`
                        : `$${(Number(whatsappUsage.estimated_cost_this_month) || 0).toFixed(2)} USD (Estimated)`
                      }
                    </strong>
                    {(whatsappUsage.has_actual_prices || (whatsappUsage.cost_this_month !== undefined && whatsappUsage.actual_cost_this_month !== undefined)) && whatsappUsage.estimated_cost_this_month && whatsappUsage.estimated_cost_this_month > 0 && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                        (Est: ${Number(whatsappUsage.estimated_cost_this_month).toFixed(2)})
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    <i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                    Resets on: {whatsappUsage.next_reset_date 
                      ? new Date(whatsappUsage.next_reset_date + 'T00:00:00').toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) 
                      : 'Not available'}
                  </div>
                </div>
              </div>
            )}

              </>
            ) : (
              /* EDIT MODE - All Settings Editable */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Enable WhatsApp Checkbox */}
                <div style={{
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      style={{ marginRight: '12px', width: '20px', height: '20px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>
                        Enable WhatsApp for Agent Handoff
                      </span>
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
                        When enabled, visitors can request agent handoff via WhatsApp. First 1,000 conversations/month are FREE.
                      </p>
                    </div>
                  </label>
                </div>

                {/* ✅ WhatsApp Handover Settings (Moved here - right after enable toggle) */}
                <div style={{
                  padding: '1.5rem',
                  background: '#e8f5e9',
                  borderRadius: '8px',
                  border: '2px solid #25d366',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fab fa-whatsapp" style={{ color: '#25d366' }}></i>
                    📱 WhatsApp Handover Settings
                  </h4>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
                    Configure where WhatsApp handover notifications are sent.
                  </p>

                  {/* Enable Multiple WhatsApp Chats */}
                  <div style={{ marginBottom: '1rem', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableMultipleWhatsAppChats}
                      onChange={(e) => setEnableMultipleWhatsAppChatsWithTracking(e.target.checked)}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>💬 Enable Multiple Simultaneous WhatsApp Chats</span>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                          Allow agent to chat with multiple users simultaneously via WhatsApp. When enabled, agent must prefix replies with <strong>#conversation_id</strong> to specify which conversation. Each message will show visitor name or session ID.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Enable Inactivity Reminders */}
                  <div style={{ marginBottom: '1rem', padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enableInactivityReminders}
                        onChange={(e) => setEnableInactivityRemindersWithTracking(e.target.checked)}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>⏰ Enable Inactivity Reminders for Agents</span>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0', lineHeight: '1.5' }}>
                          Send WhatsApp reminders to agents when conversations are inactive for 5+ minutes. Helps keep conversations active and reduces auto-ending.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '6px', fontWeight: '600' }}>Handover Phone Number</label>
                      <input
                        type="text"
                        placeholder="+14698880705"
                        value={handoverWhatsAppNumber}
                        onChange={(e) => {
                          setHandoverWhatsAppNumber(e.target.value)
                          if (!isInitialLoad) {
                            trackChange('Changed WhatsApp Handover Phone Number')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #25d366',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Format: Include country code</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '6px', fontWeight: '600' }}>Template SID (Content SID)</label>
                      <input
                        type="text"
                        placeholder="HX..."
                        value={handoverTemplateSid}
                        onChange={(e) => {
                          setHandoverTemplateSid(e.target.value)
                          if (!isInitialLoad) {
                            trackChange('Changed WhatsApp Template SID')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #25d366',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Twilio Content Template SID</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Save button removed - use main "Save Changes" button at bottom of page */}
                    <button
                      type="button"
                      className="connect-btn"
                      style={{ backgroundColor: '#075e54', color: '#fff' }}
                      onClick={async () => {
                        if (!selectedClientId) {
                          alert('Select a client first')
                          return
                        }
                        if (!handoverWhatsAppNumber.trim()) {
                          alert('Enter phone number')
                          return
                        }
                        setTestingHandoverWhatsApp(true)
                        try {
                          await api.post('/handover/test-whatsapp', {
                            client_id: selectedClientId,
                            phone_number: handoverWhatsAppNumber.trim()
                          })
                          alert('✅ Test message sent')
                        } catch (e: any) {
                          alert(`❌ Test failed: ${e?.response?.data?.error || e.message}`)
                        } finally {
                          setTestingHandoverWhatsApp(false)
                        }
                      }}
                      disabled={testingHandoverWhatsApp || !handoverWhatsAppNumber.trim()}
                    >
                      {testingHandoverWhatsApp ? (
                        <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Sending...</>
                      ) : (
                        <><i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i> Send Test Message</>
                      )}
                    </button>
                  </div>
                  {handoverWhatsAppNumber && (
                    <div style={{ marginTop: '12px', padding: '8px', background: '#fff', borderRadius: '6px', fontSize: '12px', color: '#666' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                      Current number: <strong>{handoverWhatsAppNumber}</strong>
                    </div>
                  )}
                </div>

                {/* Twilio Credentials Form */}
                <div style={{
                  padding: '1.5rem',
                  background: '#fafbfc',
                  borderRadius: '8px',
                  border: '1px solid #e1e4e8'
                }}>
                  <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🔐 Twilio WhatsApp Credentials
                    {whatsappConfigured && (
                      <span style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✓ Configured
                      </span>
                    )}
                  </h4>
                  
                  {whatsappConfigured && (
                    <div style={{
                      padding: '10px 15px',
                      background: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '13px',
                      color: '#155724'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <i className="fas fa-check-circle"></i>
                        <strong>WhatsApp credentials are saved and encrypted.</strong>
                      </div>
                      {whatsappCredentialsPartial && (
                        <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }}>
                          {whatsappCredentialsPartial.account_sid && (
                            <div style={{ marginBottom: '4px' }}>
                              Account SID: <strong>{whatsappCredentialsPartial.account_sid}</strong>
                            </div>
                          )}
                          {whatsappCredentialsPartial.auth_token && (
                            <div style={{ marginBottom: '4px' }}>
                              Auth Token: <strong>{whatsappCredentialsPartial.auth_token}</strong>
                            </div>
                          )}
                          {whatsappCredentialsPartial.from_number && (
                            <div>
                              From Number: <strong>{whatsappCredentialsPartial.from_number}</strong>
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ marginTop: '6px', fontSize: '11px', opacity: 0.8 }}>
                        Enter new values below to update them.
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                      Account SID *
                    </label>
                    <input
                      type="text"
                      value={whatsappSettings.account_sid}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, account_sid: e.target.value })}
                      placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.account_sid || "AC•••••••••••••••••••••••••••••") : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                      Auth Token *
                    </label>
                    <input
                      type="password"
                      value={whatsappSettings.auth_token}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, auth_token: e.target.value })}
                      placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.auth_token || "••••••••••••••••••••••••••••••") : "Your Twilio Auth Token"}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                      WhatsApp From Number *
                    </label>
                    <input
                      type="text"
                      value={whatsappSettings.from_number}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, from_number: e.target.value })}
                      placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.from_number || "whatsapp:+1••••••••••") : "whatsapp:+14155238886"}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Format: whatsapp:+1234567890 (must be a Twilio WhatsApp-enabled number)
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {/* Save button removed - use main "Save Changes" button at bottom of page */}

                    <button
                      type="button"
                      onClick={handleTestWhatsApp}
                      disabled={testingWhatsApp || !whatsappConfigured}
                      style={{
                        padding: '12px 20px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap' as any, // React camelCase CSS
                        opacity: (testingWhatsApp || !whatsappConfigured) ? 0.5 : 1
                      }}
                      title={!whatsappConfigured ? 'Save settings first' : 'Test connection only'}
                    >
                      {testingWhatsApp ? (
                        <><i className="fas fa-spinner fa-spin"></i> Testing...</>
                      ) : (
                        <><i className="fas fa-vial"></i> Test Connection</>
                      )}
                    </button>

                    {/* ✅ Combined Test Button */}
                    <button
                      type="button"
                      onClick={handleTestWhatsAppComplete}
                      disabled={testingWhatsApp || !whatsappConfigured || !handoverWhatsAppNumber.trim()}
                      style={{
                        padding: '12px 20px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap' as any, // React camelCase CSS
                        opacity: (testingWhatsApp || !whatsappConfigured || !handoverWhatsAppNumber.trim()) ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title={!whatsappConfigured ? 'Configure WhatsApp first' : !handoverWhatsAppNumber.trim() ? 'Enter handover phone number first' : 'Test connection and send test message'}
                    >
                      {testingWhatsApp ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Testing...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check-circle"></i>
                          Test Connection & Message
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Result */}
                  {whatsappTestResult && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '12px',
                      background: whatsappTestResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
                      border: `2px solid ${whatsappTestResult.startsWith('✅') ? '#28a745' : '#dc3545'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      whiteSpace: 'pre-line' // ✅ Allow multi-line display
                    }}>
                      {whatsappTestResult.split('\n').map((line: string, idx: number) => (
                        <div key={idx} style={{ marginBottom: idx < whatsappTestResult.split('\n').length - 1 ? '6px' : 0 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multiple WhatsApp Chats Checkbox */}
                <div style={{
                  padding: '1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enableMultipleWhatsAppChats}
                      onChange={(e) => setEnableMultipleWhatsAppChatsWithTracking(e.target.checked)}
                      style={{ marginRight: '12px', width: '20px', height: '20px' }}
                    />
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>
                        Enable Multiple Simultaneous WhatsApp Chats
                      </span>
                      <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
                        Allow agent to chat with multiple users simultaneously. Agent must prefix replies with <strong>#conversation_id</strong> to specify which conversation.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Handover Settings */}
                <div style={{
                  padding: '1.5rem',
                  background: '#e8f5e9',
                  borderRadius: '8px',
                  border: '2px solid #25d366'
                }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                    WhatsApp Handover Settings
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Handover Phone Number *
                      </label>
                      <input
                        type="text"
                        placeholder="+14698880705"
                        value={handoverWhatsAppNumber}
                        onChange={(e) => {
                          setHandoverWhatsAppNumber(e.target.value)
                          if (!isInitialLoad) {
                            trackChange('Changed WhatsApp Handover Phone Number')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #25d366',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Include country code (e.g., +14698880705)</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Template SID (Content SID) *
                      </label>
                      <input
                        type="text"
                        placeholder="HX659835c73e53f7d35320f3d3c3e5f259"
                        value={handoverTemplateSid}
                        onChange={(e) => {
                          setHandoverTemplateSid(e.target.value)
                          if (!isInitialLoad) {
                            trackChange('Changed WhatsApp Template SID')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #25d366',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Twilio Content Template SID</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedClientId) {
                          alert('Select a client first')
                          return
                        }
                        try {
                          setSavingHandover(true)
                          await api.put(`/handover/config/client/${selectedClientId}`, {
                            handover_whatsapp_number: handoverWhatsAppNumber,
                            whatsapp_handover_content_sid: handoverTemplateSid
                          })
                          alert('✅ Handover settings saved')
                          setHasUnsavedChanges(false)
                          setWhatsappEditMode(false)
                          // Refresh widget data to show updated state
                          if (id) {
                            fetchWidget()
                          }
                        } catch (e: any) {
                          alert(`❌ Failed to save: ${e?.response?.data?.error || e.message}`)
                        } finally {
                          setSavingHandover(false)
                        }
                      }}
                      disabled={savingHandover}
                      style={{
                        padding: '10px 20px',
                        background: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {/* Save button removed - use main "Save Changes" button at bottom */}
                      Test Message
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedClientId) {
                          alert('Select a client first')
                          return
                        }
                        if (!handoverWhatsAppNumber.trim()) {
                          alert('Enter phone number')
                          return
                        }
                        setTestingHandoverWhatsApp(true)
                        try {
                          await api.post('/handover/test-whatsapp', {
                            client_id: selectedClientId,
                            phone_number: handoverWhatsAppNumber.trim()
                          })
                          alert('✅ Test message sent')
                        } catch (e: any) {
                          alert(`❌ Test failed: ${e?.response?.data?.error || e.message}`)
                        } finally {
                          setTestingHandoverWhatsApp(false)
                        }
                      }}
                      disabled={testingHandoverWhatsApp || !handoverWhatsAppNumber.trim()}
                      style={{
                        padding: '10px 20px',
                        background: '#075e54',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {testingHandoverWhatsApp ? (
                        <><i className="fas fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Sending...</>
                      ) : (
                        <><i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i> Send Test Message</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Twilio Credentials */}
                <div style={{
                  padding: '1.5rem',
                  background: '#fafbfc',
                  borderRadius: '8px',
                  border: '1px solid #e1e4e8'
                }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', fontWeight: '600', marginBottom: '1rem' }}>
                    Twilio WhatsApp Credentials
                    {whatsappConfigured && (
                      <span style={{
                        marginLeft: '10px',
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✓ Configured
                      </span>
                    )}
                  </h4>
                  
                  {whatsappConfigured && whatsappCredentialsPartial && (
                    <div style={{
                      padding: '12px',
                      background: '#d4edda',
                      border: '1px solid #c3e6cb',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '13px'
                    }}>
                      <strong>Current credentials (last 4 digits):</strong>
                      <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {whatsappCredentialsPartial.account_sid && <div>Account SID: <strong>{whatsappCredentialsPartial.account_sid}</strong></div>}
                        {whatsappCredentialsPartial.auth_token && <div>Auth Token: <strong>{whatsappCredentialsPartial.auth_token}</strong></div>}
                        {whatsappCredentialsPartial.from_number && <div>From Number: <strong>{whatsappCredentialsPartial.from_number}</strong></div>}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Account SID *
                      </label>
                      <input
                        type="text"
                        value={whatsappSettings.account_sid}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, account_sid: e.target.value })}
                        placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.account_sid || "AC•••••••••••••••••••••••••••••") : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Auth Token *
                      </label>
                      <input
                        type="password"
                        value={whatsappSettings.auth_token}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, auth_token: e.target.value })}
                        placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.auth_token || "••••••••••••••••••••••••••••••") : "Your Twilio Auth Token"}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        WhatsApp From Number *
                      </label>
                      <input
                        type="text"
                        value={whatsappSettings.from_number}
                        onChange={(e) => setWhatsappSettings({ ...whatsappSettings, from_number: e.target.value })}
                        placeholder={whatsappConfigured ? (whatsappCredentialsPartial?.from_number || "whatsapp:+1••••••••••") : "whatsapp:+14155238886"}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Format: whatsapp:+1234567890 (must be a Twilio WhatsApp-enabled number)
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleSaveWhatsAppSettings}
                      disabled={savingWhatsApp || !whatsappSettings.account_sid || !whatsappSettings.auth_token || !whatsappSettings.from_number}
                      style={{
                        padding: '12px 20px',
                        background: '#4682B4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        opacity: (savingWhatsApp || !whatsappSettings.account_sid || !whatsappSettings.auth_token || !whatsappSettings.from_number) ? 0.5 : 1
                      }}
                    >
                      {savingWhatsApp ? (
                        <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                      ) : (
                        <><i className="fas fa-save"></i> Save Credentials</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestWhatsAppComplete}
                      disabled={testingWhatsApp || !whatsappConfigured || !handoverWhatsAppNumber.trim()}
                      style={{
                        padding: '12px 20px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        opacity: (testingWhatsApp || !whatsappConfigured || !handoverWhatsAppNumber.trim()) ? 0.5 : 1
                      }}
                    >
                      {testingWhatsApp ? (
                        <><i className="fas fa-spinner fa-spin"></i> Testing...</>
                      ) : (
                        <><i className="fas fa-check-circle"></i> Test Connection & Message</>
                      )}
                    </button>
                  </div>
                  
                  {whatsappTestResult && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '12px',
                      background: whatsappTestResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
                      border: `2px solid ${whatsappTestResult.startsWith('✅') ? '#28a745' : '#dc3545'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      whiteSpace: 'pre-line'
                    }}>
                      {whatsappTestResult}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🎯 Agent Handover Choice System */}
        {selectedClientId && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-directions" style={{ color: '#2E86AB', fontSize: '1.6rem' }}></i>
              Agent Handover Configuration
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
              Configure HOW your team will be notified when visitors request agent help. This is a <strong>client-side configuration</strong> - visitors do not choose; the system automatically uses your configured method.
            </p>

            <div style={{
              background: '#e7f3ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '13px',
              lineHeight: '1.6'
            }}>
              <strong>📱 How it works:</strong>
              <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                <li>Visitor clicks "Talk to Agent"</li>
                <li>System automatically uses your configured <strong>Default Contact Method</strong> (selected below)</li>
                <li>Your team is notified via the chosen method</li>
              </ol>
            </div>

                {/* Available Methods */}
                <div style={{
                  padding: '1.5rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', marginBottom: '1rem' }}>
                    ✅ Enabled Contact Methods
                  </h4>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                    Select which contact methods are available for handover. At least one method must be enabled.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Portal */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.portal}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          const newOptions = { ...handoverOptions, portal: newValue }
                          // Check if this would be the last enabled option
                          const enabledCount = Object.values(newOptions).filter(v => v === true).length
                          if (!newValue && enabledCount === 0) {
                            alert('⚠️ At least one contact method must be enabled. Please enable another option first.')
                            return
                          }
                          setHandoverOptions(newOptions)
                          if (!isInitialLoad) {
                            const methodName = method === 'portal' ? 'Portal' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : method === 'phone' ? 'Phone/SMS' : 'Webhook'
                            trackChange(`${methodName} handover ${newOptions[method] ? 'enabled' : 'disabled'}`)
                          }
                        }}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        <i className="fas fa-comment-dots" style={{ marginRight: '6px', color: '#28a745' }}></i>
                        <strong>Portal Chat</strong> (In-widget messaging)
                      </span>
                    </label>

                    {/* WhatsApp */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.whatsapp}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          const newOptions = { ...handoverOptions, whatsapp: newValue }
                          // Check if this would be the last enabled option
                          const enabledCount = Object.values(newOptions).filter(v => v === true).length
                          if (!newValue && enabledCount === 0) {
                            alert('⚠️ At least one contact method must be enabled. Please enable another option first.')
                            return
                          }
                          setHandoverOptions(newOptions)
                          if (!isInitialLoad) {
                            const methodName = method === 'portal' ? 'Portal' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : method === 'phone' ? 'Phone/SMS' : 'Webhook'
                            trackChange(`${methodName} handover ${newOptions[method] ? 'enabled' : 'disabled'}`)
                          }
                        }}
                        disabled={!whatsappConfigured}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', opacity: whatsappConfigured ? 1 : 0.5 }}>
                        <i className="fab fa-whatsapp" style={{ marginRight: '6px', color: '#25D366' }}></i>
                        <strong>WhatsApp</strong> {!whatsappConfigured && '(Configure above)'}
                      </span>
                    </label>

                    {/* Email */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.email}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          const newOptions = { ...handoverOptions, email: newValue }
                          // Check if this would be the last enabled option
                          const enabledCount = Object.values(newOptions).filter(v => v === true).length
                          if (!newValue && enabledCount === 0) {
                            alert('⚠️ At least one contact method must be enabled. Please enable another option first.')
                            return
                          }
                          setHandoverOptions(newOptions)
                          if (!isInitialLoad) {
                            const methodName = method === 'portal' ? 'Portal' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : method === 'phone' ? 'Phone/SMS' : 'Webhook'
                            trackChange(`${methodName} handover ${newOptions[method] ? 'enabled' : 'disabled'}`)
                          }
                        }}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        <i className="fas fa-envelope" style={{ marginRight: '6px', color: '#dc3545' }}></i>
                        <strong>Email</strong> (Professional emails)
                      </span>
                    </label>

                    {/* Phone/SMS */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.phone}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          const newOptions = { ...handoverOptions, phone: newValue }
                          // Check if this would be the last enabled option
                          const enabledCount = Object.values(newOptions).filter(v => v === true).length
                          if (!newValue && enabledCount === 0) {
                            alert('⚠️ At least one contact method must be enabled. Please enable another option first.')
                            return
                          }
                          setHandoverOptions(newOptions)
                          if (!isInitialLoad) {
                            const methodName = method === 'portal' ? 'Portal' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : method === 'phone' ? 'Phone/SMS' : 'Webhook'
                            trackChange(`${methodName} handover ${newOptions[method] ? 'enabled' : 'disabled'}`)
                          }
                        }}
                        disabled={!whatsappConfigured}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', opacity: whatsappConfigured ? 1 : 0.5 }}>
                        <i className="fas fa-phone" style={{ marginRight: '6px', color: '#007bff' }}></i>
                        <strong>Phone/SMS</strong> {!whatsappConfigured && '(Uses Twilio)'}
                      </span>
                    </label>

                    {/* Webhook */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', gridColumn: '1 / -1' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.webhook}
                        onChange={(e) => {
                          const newValue = e.target.checked
                          const newOptions = { ...handoverOptions, webhook: newValue }
                          // Check if this would be the last enabled option
                          const enabledCount = Object.values(newOptions).filter(v => v === true).length
                          if (!newValue && enabledCount === 0) {
                            alert('⚠️ At least one contact method must be enabled. Please enable another option first.')
                            return
                          }
                          setHandoverOptions(newOptions)
                          if (!isInitialLoad) {
                            const methodName = method === 'portal' ? 'Portal' : method === 'whatsapp' ? 'WhatsApp' : method === 'email' ? 'Email' : method === 'phone' ? 'Phone/SMS' : 'Webhook'
                            trackChange(`${methodName} handover ${newOptions[method] ? 'enabled' : 'disabled'}`)
                          }
                        }}
                        style={{ marginRight: '8px', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px' }}>
                        <i className="fas fa-plug" style={{ marginRight: '6px', color: '#6f42c1' }}></i>
                        <strong>Webhook</strong> (Send to your CRM/system)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Default Method */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                    🔵 Default Contact Method
                  </label>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
                    This method will be automatically used when a visitor requests agent help. Must be one of the enabled methods above.
                  </p>
                  <select
                    value={defaultHandoverMethod}
                    onChange={(e) => {
                      setDefaultHandoverMethod(e.target.value)
                      if (!isInitialLoad) {
                        trackChange(`Changed Default Handover Method to ${e.target.value}`)
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    {handoverOptions.portal && <option value="portal">Portal Chat</option>}
                    {handoverOptions.whatsapp && <option value="whatsapp">WhatsApp</option>}
                    {handoverOptions.email && <option value="email">Email</option>}
                    {handoverOptions.phone && <option value="phone">Phone/SMS</option>}
                    {handoverOptions.webhook && <option value="webhook">Webhook</option>}
                  </select>
                </div>

                {/* Webhook Configuration */}
                {handoverOptions.webhook && (
                  <div style={{
                    padding: '1.5rem',
                    background: '#fafbfc',
                    borderRadius: '8px',
                    border: '1px solid #e1e4e8',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', marginBottom: '0.5rem' }}>
                      🔗 Webhook Configuration
                    </h4>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                      Send handover requests to your own CRM or system
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                        Webhook URL *
                      </label>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => {
                          setWebhookUrl(e.target.value)
                          if (!isInitialLoad) {
                            trackChange('Changed Webhook URL')
                          }
                        }}
                        placeholder="https://your-crm.com/webhooks/marketingby"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                        Webhook Secret (Optional - for HMAC signature)
                      </label>
                      <input
                        type="password"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="your-secret-key"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        If provided, requests will include X-MarketingBy-Signature header with HMAC-SHA256
                      </p>
                    </div>

                    {webhookUrl && (
                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={testingWebhook}
                        style={{
                          padding: '10px 16px',
                          background: '#6f42c1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {testingWebhook ? (
                          <><i className="fas fa-spinner fa-spin"></i> Testing...</>
                        ) : (
                          <><i className="fas fa-vial"></i> Test Webhook</>
                        )}
                      </button>
                    )}

                    {webhookTestResult && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '10px',
                        background: webhookTestResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
                        border: `2px solid ${webhookTestResult.startsWith('✅') ? '#28a745' : '#dc3545'}`,
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        {webhookTestResult}
                      </div>
                    )}
                  </div>
                )}

                {/* Save button removed - use main "Save Changes" button at bottom of page */}
                <div style={{
                  padding: '12px',
                  background: '#e3f2fd',
                  borderRadius: '8px',
                  border: '1px solid #2E86AB',
                  fontSize: '14px',
                  color: '#1976d2',
                  textAlign: 'center',
                  marginTop: '1rem'
                }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                  Use the "Save Changes" button at the bottom of the page to save all settings
                </div>
          </div>
        )}

        {/* 🏥 Industry & HIPAA Compliance */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏥 Industry & Compliance Settings
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
            Configure industry-specific settings and compliance requirements
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Industry Type
            </label>
            <select
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="general">General / Business</option>
              <option value="healthcare">Healthcare / Medical</option>
              <option value="finance">Finance / Banking</option>
              <option value="legal">Legal Services</option>
              <option value="education">Education</option>
              <option value="real_estate">Real Estate</option>
              <option value="ecommerce">E-commerce / Retail</option>
            </select>
          </div>

          {industryType === 'healthcare' && (
            <div style={{
              background: '#f0f9ff',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '2px solid #0ea5e9',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', color: '#0369a1' }}>
                🏥 Healthcare-Specific Settings
              </h4>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enableHipaa}
                  onChange={(e) => setEnableHipaa(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '3px', width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ fontWeight: '600' }}>Display HIPAA Disclaimer</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                    Show disclaimer before chatting (required for HIPAA compliance)
                  </p>
                </div>
              </label>

              {enableHipaa && (
                <div style={{ marginLeft: '28px', marginBottom: '1rem' }}>
                  <textarea
                    value={hipaaDisclaimer}
                    onChange={(e) => setHipaaDisclaimer(e.target.value)}
                    placeholder="Enter custom HIPAA disclaimer or leave empty for default message..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={detectSensitiveData}
                  onChange={(e) => setDetectSensitiveData(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '3px', width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ fontWeight: '600' }}>Block Sensitive Information</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                    Detect and block SSN, credit cards, medical records from chat
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={emergencyKeywords}
                  onChange={(e) => setEmergencyKeywords(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '3px', width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ fontWeight: '600' }}>Emergency Keyword Detection</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                    Detect emergency keywords and display emergency contact info
                  </p>
                </div>
              </label>

              {emergencyKeywords && (
                <div style={{ marginLeft: '28px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '13px' }}>
                    Emergency Contact Message
                  </label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g., Call 911 or visit nearest ER"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 🔀 Conversation Flow Configuration */}
        {isEditMode && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            color: 'white'
          }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔀 Conversation Flow Configuration
            </h3>
            <p style={{ fontSize: '14px', marginBottom: '1.5rem', opacity: 0.9 }}>
              Define how the bot handles conversations: Greeting → Knowledge Base → AI → Agent Handoff
            </p>
            <button
              type="button"
              onClick={() => navigate(`/app/chat-widgets/${id}/flow`)}
              style={{
                padding: '12px 24px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-route"></i>
              Configure Conversation Flow
            </button>
          </div>
        )}

        {/* 🤖 Intro Questions Configuration */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-robot" style={{ fontSize: '1.5rem', color: '#4682B4' }}></i>
            Smart Intro Flow - Collect Customer Info Before Chat
          </h3>

          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '2px solid #2196f3'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
              <input
                type="checkbox"
                checked={introFlowEnabled}
                onChange={(e) => setIntroFlowEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '700', fontSize: '16px', color: '#0d47a1' }}>
                ✅ Enable Intro Questions (Collect customer info before chatting)
              </span>
            </label>
            <p style={{ margin: '0.5rem 0 0 30px', fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
              <i className="fas fa-info-circle" style={{ marginRight: '5px' }}></i>
              When enabled, the bot will ask these questions ONE BY ONE before allowing normal chat.
              This helps capture lead information automatically!
            </p>
          </div>

          {introFlowEnabled && (
            <>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
                  📋 {introQuestions.length} Question{introQuestions.length !== 1 ? 's' : ''} Configured
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-plus-circle"></i> Add Question
                </button>
              </div>

              {/* Question List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {introQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      display: 'flex',
                      gap: '15px',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Question Number & Drag Handle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                      <div style={{
                        background: '#4682B4',
                        color: 'white',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: '4px',
                            background: index === 0 ? '#ccc' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '10px'
                          }}
                          title="Move Up"
                        >
                          <i className="fas fa-chevron-up"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === introQuestions.length - 1}
                          style={{
                            padding: '4px',
                            background: index === introQuestions.length - 1 ? '#ccc' : '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: index === introQuestions.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '10px'
                          }}
                          title="Move Down"
                        >
                          <i className="fas fa-chevron-down"></i>
                        </button>
                      </div>
                    </div>

                    {/* Question Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px', color: '#333' }}>
                        {q.question}
                        {q.required && <span style={{ color: '#dc3545', marginLeft: '5px' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <span>
                          <i className="fas fa-tag" style={{ marginRight: '5px' }}></i>
                          Type: <strong>{q.type}</strong>
                        </span>
                        <span>
                          <i className="fas fa-check-circle" style={{ marginRight: '5px' }}></i>
                          {q.required ? 'Required' : 'Optional'}
                        </span>
                        {q.type === 'select' && q.options && (
                          <span>
                            <i className="fas fa-list" style={{ marginRight: '5px' }}></i>
                            Options: {q.options.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(q)
                          setShowQuestionForm(true)
                        }}
                        style={{
                          padding: '6px 10px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        title="Edit"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuestion(q.id)}
                        style={{
                          padding: '6px 10px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        title="Delete"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Question Edit Form (Modal-like) */}
              {showQuestionForm && editingQuestion && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '20px'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                  }}>
                    <h3 style={{ marginTop: 0 }}>
                      {editingQuestion.id.startsWith('custom_') && !introQuestions.find(q => q.id === editingQuestion.id) ? 'Add New Question' : 'Edit Question'}
                    </h3>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Question Text *
                      </label>
                      <input
                        type="text"
                        value={editingQuestion.question}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                        placeholder="e.g., What is your email address?"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                        Input Type
                      </label>
                      <select
                        value={editingQuestion.type}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="text">Text (Single Line)</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone Number</option>
                        <option value="textarea">Textarea (Multiple Lines)</option>
                        <option value="select">Dropdown Select</option>
                      </select>
                    </div>

                    {editingQuestion.type === 'select' && (
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                          Dropdown Options (one per line)
                        </label>
                        <textarea
                          value={(editingQuestion.options || []).join('\n')}
                          onChange={(e) => setEditingQuestion({ 
                            ...editingQuestion, 
                            options: e.target.value.split('\n').filter(o => o.trim())
                          })}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    )}

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editingQuestion.required}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                          style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: '600' }}>Required Field</span>
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={saveQuestion}
                        style={{
                          flex: 1,
                          padding: '10px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-save" style={{ marginRight: '6px' }}></i>
                        Save Question
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestion(null)
                          setShowQuestionForm(false)
                        }}
                        style={{
                          padding: '10px 20px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: '14px',
              background: saving ? '#ccc' : 'linear-gradient(135deg, #4682B4, #2E86AB)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Widget'}
          </button>

          <button
            type="button"
            onClick={() => {
              if (hasUnsavedChanges) {
                setShowCancelConfirm(true)
              } else {
                navigate('/app/chat-widgets')
              }
            }}
            style={{
              padding: '14px 24px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Cancel Confirmation Dialog */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#d32f2f', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-exclamation-triangle"></i>
              You have unsaved changes
            </h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Are you sure you want to leave? All unsaved changes will be lost.
            </p>
            {changesSummary.length > 0 && (
              <div style={{
                background: '#f5f5f5',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#333' }}>Changes Summary:</strong>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#555' }}>
                  {changesSummary.map((change, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{change}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Continue Editing
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(false)
                  setHasUnsavedChanges(false)
                  setChangesSummary([])
                  navigate('/app/chat-widgets')
                }}
                style={{
                  padding: '10px 20px',
                  background: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Discard Changes & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

