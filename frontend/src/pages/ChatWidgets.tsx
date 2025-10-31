import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/http'

interface Widget {
  id: number
  widget_key: string
  widget_name: string
  primary_color: string
  secondary_color: string
  position: string
  bot_name: string
  enable_appointment_booking: boolean
  enable_email_capture: boolean
  enable_phone_capture: boolean
  is_active: boolean
  created_at: string
}

export default function ChatWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null)
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  useEffect(() => {
    fetchWidgets()
  }, [])

  const fetchWidgets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/chat-widget/widgets')
      setWidgets(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widgets')
    } finally {
      setLoading(false)
    }
  }

  const toggleWidgetStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.put(`/chat-widget/widgets/${id}`, {
        is_active: !currentStatus
      })
      fetchWidgets()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update widget status')
    }
  }

  const deleteWidget = async (id: number) => {
    try {
      await api.delete(`/chat-widget/widgets/${id}`)
      fetchWidgets()
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete widget')
    }
  }

  const getEmbedCode = (widget: Widget) => {
    const backendUrl = 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
    return `<!-- WeTechForU AI Chat Widget V2 -->
<script src="${backendUrl}/public/wetechforu-widget-v2.js?v=${Date.now()}"></script>
<script>
  if (window.WeTechForUWidget) {
    WeTechForUWidget.init({
      widgetKey: '${widget.widget_key}',
      backendUrl: '${backendUrl}'
    });
  }
</script>`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Embed code copied to clipboard!')
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Loading widgets...</h1>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>AI Chat Widgets</h1>
          <p style={{ margin: 0, color: '#666' }}>
            Manage your embeddable chat widgets for customer websites
          </p>
        </div>
        <Link 
          to="/app/chat-widgets/create"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #4682B4, #2E86AB)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <i className="fas fa-plus-circle" style={{ marginRight: '8px' }}></i>
          Create New Widget
        </Link>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#fee', 
          color: '#c00',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {widgets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <i className="fas fa-robot" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h2>No Widgets Yet</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Create your first AI chat widget to start engaging with visitors!
          </p>
          <Link 
            to="/app/chat-widgets/create"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #4682B4, #2E86AB)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Create Your First Widget
          </Link>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {widgets.map(widget => (
            <div
              key={widget.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{widget.widget_name}</h3>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: widget.is_active ? '#d4edda' : '#f8d7da',
                    color: widget.is_active ? '#155724' : '#721c24'
                  }}>
                    {widget.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
                <div style={{ 
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${widget.primary_color}, ${widget.secondary_color})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px'
                }}>
                  <i className="fas fa-robot"></i>
                </div>
              </div>

              {/* Client Info - Important! Shows which client owns this widget */}
              {widget.client_id && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: '8px',
                  border: '2px solid #2196f3'
                }}>
                  <div style={{ fontSize: '12px', color: '#1976d2', marginBottom: '4px', fontWeight: '600' }}>
                    <i className="fas fa-building" style={{ marginRight: '6px' }}></i>
                    Client Owner
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d47a1' }}>
                    Client ID: {widget.client_id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                    This client manages knowledge & conversations for this widget
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Widget Key</div>
                <code style={{
                  display: 'block',
                  padding: '8px',
                  background: '#f5f5f5',
                  borderRadius: '4px',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {widget.widget_key}
                </code>
              </div>

              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1rem',
                fontSize: '14px'
              }}>
                <div>
                  <span style={{ color: '#666' }}>Bot Name:</span> {widget.bot_name}
                </div>
                <div>
                  <span style={{ color: '#666' }}>Position:</span> {widget.position}
                </div>
                <div>
                  <span style={{ color: '#666' }}>Appointments:</span> 
                  {widget.enable_appointment_booking ? ' ✓' : ' ✗'}
                </div>
                <div>
                  <span style={{ color: '#666' }}>Lead Capture:</span> 
                  {widget.enable_email_capture ? ' ✓' : ' ✗'}
                </div>
              </div>

              <div style={{ 
                fontSize: '12px',
                color: '#888',
                marginBottom: '1rem'
              }}>
                Created: {new Date(widget.created_at).toLocaleDateString()}
              </div>

              <div style={{ 
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => {
                    setSelectedWidget(widget)
                    setShowEmbedCode(true)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#4682B4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-code" style={{ marginRight: '6px' }}></i>
                  Embed Code
                </button>

                <button
                  onClick={() => window.location.href = `/app/chat-widgets/${widget.id}/knowledge`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-brain" style={{ marginRight: '6px' }}></i>
                  Knowledge
                </button>

                <button
                  onClick={() => {
                    // Download WordPress plugin
                    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/chat-widget/${widget.widget_key}/download-plugin`
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Download WordPress Plugin ZIP"
                >
                  <i className="fab fa-wordpress" style={{ marginRight: '6px' }}></i>
                  WP Plugin
                </button>
                
                <Link
                  to={`/app/chat-widgets/${widget.id}/edit`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-edit" style={{ marginRight: '6px' }}></i>
                  Edit
                </Link>

                <Link
                  to={`/app/chat-widgets/${widget.id}/flow`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: '#2E86AB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title="Configure conversation flow"
                >
                  <i className="fas fa-route"></i>
                  Flow
                </Link>

                <button
                  onClick={() => toggleWidgetStatus(widget.id, widget.is_active)}
                  style={{
                    padding: '8px 12px',
                    background: widget.is_active ? '#ffc107' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title={widget.is_active ? 'Deactivate' : 'Activate'}
                >
                  <i className={`fas fa-${widget.is_active ? 'pause' : 'play'}`}></i>
                </button>

                <button
                  onClick={() => setDeleteConfirm(widget.id)}
                  style={{
                    padding: '8px 12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  title="Delete"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>

              {deleteConfirm === widget.id && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#fff3cd',
                  borderRadius: '6px',
                  border: '1px solid #ffc107'
                }}>
                  <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                    Delete this widget?
                  </div>
                  <div style={{ marginBottom: '1rem', fontSize: '14px' }}>
                    This will remove all conversations and analytics data.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => deleteWidget(widget.id)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Embed Code Modal */}
      {showEmbedCode && selectedWidget && (
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
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0 }}>Embed Code</h2>
              <button
                onClick={() => {
                  setShowEmbedCode(false)
                  setSelectedWidget(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Add this code to your website before the closing <code>&lt;/body&gt;</code> tag:
            </p>

            <pre style={{
              background: '#f5f5f5',
              padding: '1rem',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '13px',
              marginBottom: '1rem'
            }}>
              {getEmbedCode(selectedWidget)}
            </pre>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => copyToClipboard(getEmbedCode(selectedWidget))}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4682B4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-copy" style={{ marginRight: '8px' }}></i>
                Copy to Clipboard
              </button>
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#e7f3ff',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <strong>💡 Tip:</strong> For WordPress sites, download our plugin from the{' '}
              <Link to="/app/chat-widgets" style={{ color: '#4682B4' }}>
                WordPress repository
              </Link>
              {' '}for easier installation!
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

