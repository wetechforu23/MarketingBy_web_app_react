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
    if (isEditMode) {
      fetchWidget()
    }
  }, [id])

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
    setSaving(true)
    setError('')

    try {
      if (isEditMode) {
        await api.put(`/chat-widget/widgets/${id}`, formData)
      } else {
        // Get current client_id from user session (you may need to fetch this)
        const userResponse = await api.get('/auth/me')
        const client_id = userResponse.data.client_id || 67 // Default for testing
        
        await api.post('/chat-widget/widgets', {
          ...formData,
          client_id
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

      <form onSubmit={handleSubmit}>
        {/* Basic Settings */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0 }}>Basic Settings</h3>

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
              Bot Avatar URL (optional)
            </label>
            <input
              type="url"
              value={formData.bot_avatar_url}
              onChange={(e) => handleChange('bot_avatar_url', e.target.value)}
              placeholder="https://example.com/avatar.png"
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

