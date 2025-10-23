import { useState, useEffect } from 'react'
import http from '../api/http'

interface Conversation {
  id: number
  widget_id: number
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  message_count: number
  bot_response_count: number
  status: string
  lead_captured: boolean
  handoff_type: string
  created_at: string
  updated_at: string
}

export default function ChatConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedConv, setSelectedConv] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      // Get all widgets first
      const widgetsResponse = await http.get('/chat-widget/widgets')
      const widgets = widgetsResponse.data
      
      // Fetch conversations for all widgets
      let allConversations: Conversation[] = []
      for (const widget of widgets) {
        const convResponse = await http.get(`/chat-widget/widgets/${widget.id}/conversations?limit=50`)
        allConversations = [...allConversations, ...convResponse.data]
      }
      
      setConversations(allConversations.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (convId: number) => {
    try {
      const response = await http.get(`/chat-widget/conversations/${convId}/messages`)
      setMessages(response.data)
      setSelectedConv(convId)
    } catch (err: any) {
      alert('Failed to load messages')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745'
      case 'completed': return '#007bff'
      case 'abandoned': return '#ffc107'
      case 'spam': return '#dc3545'
      default: return '#6c757d'
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading conversations...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Chat Conversations</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        View and manage all chat widget conversations
      </p>

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

      {conversations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <i className="fas fa-comments" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h2>No Conversations Yet</h2>
          <p style={{ color: '#666' }}>
            Once visitors start chatting with your widgets, conversations will appear here.
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Visitor</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Contact</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Messages</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Lead</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(conv => (
                <tr key={conv.id} style={{ borderTop: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600' }}>
                      {conv.visitor_name || 'Anonymous'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      ID: {conv.id}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '14px' }}>
                    {conv.visitor_email && (
                      <div style={{ marginBottom: '4px' }}>
                        <i className="fas fa-envelope" style={{ marginRight: '6px', color: '#4682B4' }}></i>
                        {conv.visitor_email}
                      </div>
                    )}
                    {conv.visitor_phone && (
                      <div>
                        <i className="fas fa-phone" style={{ marginRight: '6px', color: '#4682B4' }}></i>
                        {conv.visitor_phone}
                      </div>
                    )}
                    {!conv.visitor_email && !conv.visitor_phone && (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600' }}>{conv.message_count}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {conv.bot_response_count} bot
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'white',
                      background: getStatusColor(conv.status),
                      display: 'inline-block'
                    }}>
                      {conv.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {conv.lead_captured ? (
                      <div>
                        <div style={{ color: '#28a745', fontWeight: '600', marginBottom: '4px' }}>
                          ✓ Captured
                        </div>
                        {conv.handoff_type && (
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            {conv.handoff_type}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '14px' }}>
                    {new Date(conv.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => fetchMessages(conv.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#4682B4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-eye" style={{ marginRight: '6px' }}></i>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Messages Modal */}
      {selectedConv && messages.length > 0 && (
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
            padding: 0,
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>Conversation #{selectedConv}</h2>
              <button
                onClick={() => {
                  setSelectedConv(null)
                  setMessages([])
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

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              background: '#f8f9fa'
            }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: msg.message_type === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.message_type === 'user' ? '#4682B4' : 'white',
                    color: msg.message_type === 'user' ? 'white' : '#333',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      {msg.message_text}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      textAlign: 'right'
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

