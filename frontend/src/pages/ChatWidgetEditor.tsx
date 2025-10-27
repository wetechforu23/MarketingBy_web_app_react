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
        } else if (Array.isArray(responseData)) {
          // Fallback: in case API returns array directly
          setClients(responseData)
        } else {
          console.error('Clients API returned unexpected format:', responseData)
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
        
        // Set client_id for edit mode
        if (widget.client_id) {
          setSelectedClientId(widget.client_id)
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widget')
    } finally {
      setLoading(false)
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

