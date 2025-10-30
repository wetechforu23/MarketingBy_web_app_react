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

  const [formData, setFormData] = useState({
    widget_name: '',
    primary_color: '#4682B4',
    secondary_color: '#2E86AB',
    position: 'bottom-right',
    welcome_message: 'Hi! How can I help you today?',
    bot_name: 'Assistant',
    bot_avatar_url: '',
    enable_appointment_booking: true,
    enable_email_capture: true,
    enable_phone_capture: true,
    enable_ai_handoff: false,
    ai_handoff_url: '',
    rate_limit_messages: 10,
    rate_limit_window: 60,
    require_captcha: false,
    // 📧 Email Notification Settings
    enable_email_notifications: true,
    notification_email: '',
    visitor_engagement_minutes: 5,
    notify_new_conversation: true,
    notify_agent_handoff: true,
    notify_daily_summary: false
  })

  // 🤖 NEW: Intro Questions State
  const [introFlowEnabled, setIntroFlowEnabled] = useState(true)
  const [introQuestions, setIntroQuestions] = useState([
    { id: 'first_name', question: 'What is your first name?', type: 'text', required: true, order: 1 },
    { id: 'last_name', question: 'What is your last name?', type: 'text', required: true, order: 2 },
    { id: 'email', question: 'What is your email address?', type: 'email', required: true, order: 3 },
    { id: 'phone', question: 'What is your phone number?', type: 'tel', required: false, order: 4 },
    { id: 'contact_method', question: 'How would you like us to contact you?', type: 'select', options: ['Email', 'Phone Call', 'Text Message'], required: true, order: 5 },
    { id: 'services', question: 'What services are you interested in?', type: 'textarea', required: false, order: 6 }
  ])
  const [editingQuestion, setEditingQuestion] = useState<any>(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)

  // 💬 WhatsApp / Twilio Integration State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [whatsappSettings, setWhatsappSettings] = useState({
    account_sid: '',
    auth_token: '',
    from_number: ''
  })
  const [whatsappConfigured, setWhatsappConfigured] = useState(false)
  const [whatsappUsage, setWhatsappUsage] = useState<any>(null)
  const [testingWhatsApp, setTestingWhatsApp] = useState(false)
  const [whatsappTestResult, setWhatsappTestResult] = useState<string | null>(null)
  const [savingWhatsApp, setSavingWhatsApp] = useState(false)

  // 🎯 Agent Handover Choice State
  const [enableHandoverChoice, setEnableHandoverChoice] = useState(true)
  const [handoverOptions, setHandoverOptions] = useState({
    portal: true,
    whatsapp: false,
    email: true,
    phone: false,
    webhook: false
  })
  const [defaultHandoverMethod, setDefaultHandoverMethod] = useState('portal')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [savingHandover, setSavingHandover] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null)

  // 🤖 AI/LLM Configuration State
  const [enableAI, setEnableAI] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiMaxTokens, setAiMaxTokens] = useState(1000)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [testingAI, setTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<string | null>(null)
  const [savingAI, setSavingAI] = useState(false)

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
      const response = await api.get(`/chat-widget/widgets`)
      const widget = response.data.find((w: any) => w.id === parseInt(id!))
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
          setIntroFlowEnabled(widget.intro_flow_enabled)
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
          setEnableAI(widget.llm_enabled)
        }
        if (widget.widget_specific_llm_key) {
          setAiApiKey(widget.widget_specific_llm_key)
          setAiConfigured(true)
        }
        if (widget.llm_max_tokens) {
          setAiMaxTokens(widget.llm_max_tokens)
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

        // Load WhatsApp settings
        if (widget.enable_whatsapp !== undefined) {
          setWhatsappEnabled(widget.enable_whatsapp)
        }

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
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widget')
    } finally {
      setLoading(false)
    }
  }

  // 💬 Fetch WhatsApp Settings
  const fetchWhatsAppSettings = async (clientId: number) => {
    try {
      const response = await api.get(`/whatsapp/settings/${clientId}`)
      if (response.data.configured) {
        setWhatsappConfigured(true)
        setWhatsappEnabled(response.data.enable_whatsapp || false)
        // Don't load sensitive credentials - they're on the server
        // Just show that it's configured
      }
      
      // Fetch usage stats
      const usageResponse = await api.get(`/whatsapp/usage/${clientId}`)
      setWhatsappUsage(usageResponse.data)
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
      
      // Refresh usage stats
      fetchWhatsAppSettings(selectedClientId)
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

  // 🎯 Fetch Handover Configuration
  const fetchHandoverConfig = async (widgetId: number) => {
    try {
      const response = await api.get(`/handover/config/${widgetId}`)
      const config = response.data
      
      setEnableHandoverChoice(config.enable_handover_choice ?? true)
      setHandoverOptions(config.handover_options || {
        portal: true,
        whatsapp: false,
        email: true,
        phone: false,
        webhook: false
      })
      setDefaultHandoverMethod(config.default_handover_method || 'portal')
      setWebhookUrl(config.webhook_url || '')
      // Don't load webhook_secret for security - it stays on server
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
      await api.put(`/handover/config/${id}`, {
        enable_handover_choice: enableHandoverChoice,
        handover_options: handoverOptions,
        default_handover_method: defaultHandoverMethod,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || null
      })

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
      const widgetData = {
        ...formData,
        intro_flow_enabled: introFlowEnabled,
        intro_questions: JSON.stringify(introQuestions),
        // AI Smart Responses
        llm_enabled: enableAI,
        widget_specific_llm_key: aiApiKey,
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
        // Handover Options
        enable_handover_choice: enableHandoverChoice,
        handover_options: JSON.stringify(handoverOptions),
        default_handover_method: defaultHandoverMethod,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret,
        ...(isEditMode ? {} : { client_id: selectedClientId })
      }

      if (isEditMode) {
        await api.put(`/chat-widget/widgets/${id}`, widgetData)
      } else {
        await api.post('/chat-widget/widgets', widgetData)
      }
      navigate('/app/chat-widgets')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save widget')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
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

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.require_captcha}
              onChange={(e) => handleChange('require_captcha', e.target.checked)}
              style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Require CAPTCHA (future feature)</span>
          </label>
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
            {aiConfigured && (
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
          </h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
            Enable AI-powered responses using Google Gemini. AI will answer questions the Knowledge Base can't handle.
          </p>

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
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    padding: '8px 12px',
                    background: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    fontSize: '12px',
                    color: '#155724'
                  }}>
                    <i className="fas fa-lock"></i> API key is saved and encrypted. Enter new key below to update.
                  </div>
                )}
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiConfigured ? "AIzaSy••••••••••••••••••••••••" : "AIzaSy..."}
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

                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.notify_daily_summary}
                    onChange={(e) => handleChange('notify_daily_summary', e.target.checked)}
                    style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                  />
                  <span>📊 Daily Summary Report (Coming Soon)</span>
                </label>
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

        {/* 💬 WhatsApp / Twilio Integration */}
        {selectedClientId && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fab fa-whatsapp" style={{ color: '#25D366', fontSize: '1.8rem' }}></i>
              WhatsApp Integration (Agent Handoff)
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
              Connect your Twilio WhatsApp Business Account to enable agent handoff via WhatsApp. 
              Includes <strong>1,000 free conversations/month</strong> per client! 🎉
            </p>

            {/* Configured Status Badge */}
            {whatsappConfigured && (
              <div style={{
                background: '#d4edda',
                border: '2px solid #28a745',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-check-circle" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                <span style={{ fontWeight: '600', color: '#155724' }}>
                  WhatsApp Configured ✅
                </span>
              </div>
            )}

            {/* Usage Stats */}
            {whatsappUsage && (
              <div style={{
                background: '#f8f9fa',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  📊 Current Usage (This Month)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: '#666' }}>Conversations:</span>
                    <strong style={{ marginLeft: '8px', color: whatsappUsage.conversations_this_month >= 1000 ? '#dc3545' : '#28a745' }}>
                      {whatsappUsage.conversations_this_month} / 1,000
                    </strong>
                    {whatsappUsage.conversations_this_month >= 1000 && (
                      <span style={{ color: '#dc3545', fontSize: '12px', display: 'block' }}>
                        ⚠️ Free tier exceeded! Additional costs apply.
                      </span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>Messages Sent:</span>
                    <strong style={{ marginLeft: '8px' }}>{whatsappUsage.messages_this_month}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#666' }}>Estimated Cost:</span>
                    <strong style={{ marginLeft: '8px', color: '#4682B4' }}>
                      ${(whatsappUsage.estimated_cost_this_month || 0).toFixed(2)} USD
                    </strong>
                    <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
                      Resets on: {new Date(whatsappUsage.next_reset_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enable WhatsApp Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: '700', fontSize: '16px' }}>Enable WhatsApp for Agent Handoff</span>
            </label>

            {whatsappEnabled && (
              <>
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
                    <li>When a visitor requests agent handoff, the conversation switches to WhatsApp</li>
                    <li>Agent receives WhatsApp message notification on their phone</li>
                    <li>Agent responds via WhatsApp, conversation syncs back to portal in real-time</li>
                    <li>First 1,000 conversations/month are FREE per client! 🎉</li>
                  </ol>
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
                      <i className="fas fa-check-circle"></i> WhatsApp credentials are saved and encrypted. Enter new values below to update them.
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
                      placeholder={whatsappConfigured ? "AC•••••••••••••••••••••••••••••" : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
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
                      placeholder={whatsappConfigured ? "••••••••••••••••••••••••••••••" : "Your Twilio Auth Token"}
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
                      placeholder={whatsappConfigured ? "whatsapp:+1••••••••••" : "whatsapp:+14155238886"}
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
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSaveWhatsAppSettings}
                      disabled={savingWhatsApp || !whatsappSettings.account_sid || !whatsappSettings.auth_token || !whatsappSettings.from_number}
                      style={{
                        flex: 1,
                        padding: '12px',
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
                        <><i className="fas fa-save"></i> Save WhatsApp Settings</>
                      )}
                    </button>

                    {whatsappConfigured && (
                      <button
                        type="button"
                        onClick={handleTestWhatsApp}
                        disabled={testingWhatsApp}
                        style={{
                          padding: '12px 20px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {testingWhatsApp ? (
                          <><i className="fas fa-spinner fa-spin"></i> Testing...</>
                        ) : (
                          <><i className="fas fa-vial"></i> Test Connection</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Test Result */}
                  {whatsappTestResult && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '12px',
                      background: whatsappTestResult.startsWith('✅') ? '#d4edda' : '#f8d7da',
                      border: `2px solid ${whatsappTestResult.startsWith('✅') ? '#28a745' : '#dc3545'}`,
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {whatsappTestResult}
                    </div>
                  )}
                </div>

                {/* Setup Guide */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffc107',
                  fontSize: '13px'
                }}>
                  <strong>📚 Don't have Twilio WhatsApp setup?</strong>
                  <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    <li>Go to <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer">Twilio Console</a></li>
                    <li>Navigate to: Messaging → Try it Out → Send a WhatsApp message</li>
                    <li>Follow the setup wizard to enable WhatsApp on your Twilio number</li>
                    <li>Copy your Account SID, Auth Token, and WhatsApp number</li>
                    <li>Paste them above and click Save!</li>
                  </ol>
                  <p style={{ margin: '8px 0 0 0' }}>
                    💡 <strong>Pricing:</strong> First 1,000 conversations/month are FREE, then ~$0.005 per conversation.
                  </p>
                </div>
              </>
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
              Agent Handover Options
            </h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>
              Let visitors choose HOW they want to be contacted when requesting agent help
            </p>

            {/* Enable Handover Choice Toggle */}
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableHandoverChoice}
                onChange={(e) => setEnableHandoverChoice(e.target.checked)}
                style={{ marginRight: '0.5rem', width: '20px', height: '20px' }}
              />
              <span style={{ fontWeight: '700', fontSize: '16px' }}>Allow Visitors to Choose Contact Method</span>
            </label>

            {enableHandoverChoice && (
              <>
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
                    <li>Modal shows available contact methods (checked below)</li>
                    <li>Visitor chooses their preferred method</li>
                    <li>System automatically notifies your team via chosen method</li>
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
                    ✅ Available Contact Methods
                  </h4>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                    Check the methods you want to offer to visitors:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Portal */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={handoverOptions.portal}
                        onChange={(e) => setHandoverOptions({ ...handoverOptions, portal: e.target.checked })}
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
                        onChange={(e) => setHandoverOptions({ ...handoverOptions, whatsapp: e.target.checked })}
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
                        onChange={(e) => setHandoverOptions({ ...handoverOptions, email: e.target.checked })}
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
                        onChange={(e) => setHandoverOptions({ ...handoverOptions, phone: e.target.checked })}
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
                        onChange={(e) => setHandoverOptions({ ...handoverOptions, webhook: e.target.checked })}
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
                    🔵 Default Contact Method (if visitor doesn't choose)
                  </label>
                  <select
                    value={defaultHandoverMethod}
                    onChange={(e) => setDefaultHandoverMethod(e.target.value)}
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
                        onChange={(e) => setWebhookUrl(e.target.value)}
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

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveHandoverConfig}
                  disabled={savingHandover}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#2E86AB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: savingHandover ? 0.6 : 1
                  }}
                >
                  {savingHandover ? (
                    <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                  ) : (
                    <><i className="fas fa-save"></i> Save Handover Configuration</>
                  )}
                </button>
              </>
            )}

            {!enableHandoverChoice && (
              <div style={{
                padding: '1rem',
                background: '#fff3cd',
                borderRadius: '8px',
                border: '1px solid #ffc107',
                fontSize: '14px'
              }}>
                <i className="fas fa-info-circle"></i> Handover choice is disabled. 
                All agent requests will use the default portal chat method.
              </div>
            )}
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
            onClick={() => navigate('/app/chat-widgets')}
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
    </div>
  )
}

