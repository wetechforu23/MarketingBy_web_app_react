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
    require_captcha: false
  })

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
          require_captcha: widget.require_captcha
        })
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
      if (isEditMode) {
        await api.put(`/chat-widget/widgets/${id}`, formData)
      } else {
        await api.post('/chat-widget/widgets', {
          ...formData,
          client_id: selectedClientId
        })
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
                      setFormData(prev => ({
                        ...prev,
                        widget_name: `${selectedClient.client_name || selectedClient.email || 'Client'} Chat Widget`,
                        welcome_message: `Hi! Welcome to ${selectedClient.client_name || selectedClient.email || 'our website'}. How can we help you today?`,
                        bot_name: `${selectedClient.client_name || 'Support'} Assistant`
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
                    🏢 {client.client_name || client.email || `Client #${client.id}`}
                    {client.email && client.client_name ? ` (${client.email})` : ''}
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

