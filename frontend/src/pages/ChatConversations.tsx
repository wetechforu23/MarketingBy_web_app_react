import { useState, useEffect, useRef } from 'react'
import { api } from '../api/http'

interface Widget {
  id: number
  widget_name: string
  client_id: number
  is_active: boolean
}

interface Conversation {
  id: number
  widget_id: number
  widget_name?: string
  visitor_name: string
  visitor_email: string
  visitor_phone: string
  message_count: number
  bot_response_count: number
  human_response_count?: number
  status: string
  lead_captured: boolean
  handoff_type: string
  handoff_requested: boolean
  handoff_requested_at: string
  created_at: string
  updated_at: string
  last_message: string
  last_message_at: string
}

interface Message {
  id: number
  conversation_id: number
  message_type: 'user' | 'bot' | 'human'
  message_text: string
  created_at: string
  agent_name?: string  // Agent name for human responses
  agent_user_id?: number  // Agent user ID
}

export default function ChatConversations() {
  // State
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch widgets on mount
  useEffect(() => {
    fetchWidgets()
  }, [])

  // Fetch conversations when widget selected
  useEffect(() => {
    if (selectedWidgetId) {
      fetchConversations(selectedWidgetId)
    }
  }, [selectedWidgetId])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchWidgets = async () => {
    try {
      setLoading(true)
      const response = await api.get('/chat-widget/widgets')
      const widgetList = response.data
      setWidgets(widgetList)
      
      // Auto-select first widget
      if (widgetList.length > 0) {
        setSelectedWidgetId(widgetList[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widgets')
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async (widgetId: number) => {
    try {
      const response = await api.get(`/chat-widget/widgets/${widgetId}/conversations?limit=50`)
      const convList = response.data
      
      // Add widget name to each conversation
      const widget = widgets.find(w => w.id === widgetId)
      const conversationsWithWidget = convList.map((conv: Conversation) => ({
        ...conv,
        widget_name: widget?.widget_name || 'Unknown'
      }))
      
      setConversations(conversationsWithWidget.sort((a: Conversation, b: Conversation) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load conversations')
    }
  }

  const fetchMessages = async (conv: Conversation) => {
    try {
      const response = await api.get(`/chat-widget/conversations/${conv.id}/messages`)
      setMessages(response.data)
      setSelectedConv(conv)
    } catch (err: any) {
      alert('Failed to load messages')
    }
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConv) return

    try {
      setSending(true)
      
      // Send reply via API
      const response = await api.post(`/chat-widget/conversations/${selectedConv.id}/reply`, {
        message: replyText.trim()
      })

      // Add message to UI  
      const newMessage: Message = {
        id: response.data.message_id || Date.now(),
        conversation_id: selectedConv.id,
        message_type: 'human',
        message_text: replyText.trim(),
        created_at: new Date().toISOString(),
        agent_name: response.data.agent_name || 'You'  // Use agent name from response
      }
      
      setMessages([...messages, newMessage])
      setReplyText('')
      
      // Refresh conversations to update counts
      if (selectedWidgetId) {
        fetchConversations(selectedWidgetId)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  const refreshConversation = () => {
    if (selectedConv) {
      fetchMessages(selectedConv)
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

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'user': return '#4682B4'
      case 'bot': return '#e0e0e0'
      case 'human': return '#28a745'
      default: return '#6c757d'
    }
  }

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'user': return '👤 Customer'
      case 'bot': return '🤖 Bot'
      case 'human': return '👨‍💼 You'
      default: return type
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4682B4', marginBottom: '1rem' }}></i>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading conversations...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>
          <i className="fas fa-comments" style={{ marginRight: '12px', color: '#4682B4' }}></i>
          Chat Conversations
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          View and respond to customer conversations
        </p>

        {/* Widget Selector */}
        {widgets.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '2px solid #2196f3',
            marginBottom: '2rem'
          }}>
            <label style={{
              display: 'block',
              fontWeight: '600',
              color: '#1976d2',
              marginBottom: '0.75rem',
              fontSize: '16px'
            }}>
              <i className="fas fa-robot" style={{ marginRight: '8px' }}></i>
              Select Chat Widget:
            </label>
            <select
              value={selectedWidgetId || ''}
              onChange={(e) => {
                setSelectedWidgetId(parseInt(e.target.value))
                setSelectedConv(null)
                setMessages([])
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #2196f3',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {widgets.map(widget => (
                <option key={widget.id} value={widget.id}>
                  {widget.widget_name} {widget.is_active ? '✅' : '⚠️ Inactive'}
                </option>
              ))}
            </select>
            <p style={{
              margin: '0.5rem 0 0 0',
              fontSize: '13px',
              color: '#555'
            }}>
              <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
              Switch between your chat widgets to see their conversations
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee',
          color: '#c00',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          {error}
        </div>
      )}

      {/* Conversations List */}
      {!selectedWidgetId ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <i className="fas fa-robot" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h2>No Widgets Available</h2>
          <p style={{ color: '#666' }}>
            Create a chat widget first to start receiving conversations.
          </p>
        </div>
      ) : conversations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <i className="fas fa-comments" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h2>No Conversations Yet</h2>
          <p style={{ color: '#666' }}>
            Once visitors start chatting with this widget, conversations will appear here.
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Last Message</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Messages</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Handoff</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map(conv => (
                <tr
                  key={conv.id}
                  style={{
                    borderTop: '1px solid #e0e0e0',
                    background: conv.handoff_requested ? '#fff3cd' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => fetchMessages(conv)}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
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
                  <td style={{ padding: '1rem', fontSize: '13px', maxWidth: '200px' }}>
                    <div style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: '#333',
                      marginBottom: '4px'
                    }}>
                      {conv.last_message || '-'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {conv.last_message_at && new Date(conv.last_message_at).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{conv.message_count}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      🤖 {conv.bot_response_count} | 👨‍💼 {conv.human_response_count || 0}
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
                    {conv.handoff_requested ? (
                      <div style={{
                        padding: '6px 12px',
                        background: '#ff9800',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        <i className="fas fa-hand-paper" style={{ marginRight: '6px' }}></i>
                        Needs Response!
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        fetchMessages(conv)
                      }}
                      style={{
                        padding: '8px 16px',
                        background: conv.handoff_requested ? '#ff9800' : '#4682B4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fas fa-comments" style={{ marginRight: '6px' }}></i>
                      {conv.handoff_requested ? 'Respond Now' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Conversation Modal with Reply */}
      {selectedConv && (
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
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #4682B4, #2E86AB)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, marginBottom: '4px' }}>
                  <i className="fas fa-user-circle" style={{ marginRight: '12px' }}></i>
                  {selectedConv.visitor_name || 'Anonymous Visitor'}
                </h2>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  Conversation #{selectedConv.id} • {messages.length} messages
                  {selectedConv.handoff_requested && (
                    <span style={{
                      marginLeft: '12px',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      🚨 Waiting for Your Response
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={refreshConversation}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  title="Refresh messages"
                >
                  <i className="fas fa-sync-alt"></i>
                </button>
                <button
                  onClick={() => {
                    setSelectedConv(null)
                    setMessages([])
                    setReplyText('')
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    fontSize: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              background: '#f8f9fa'
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
                  <div>No messages yet</div>
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.message_type === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Sender Label */}
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {getMessageTypeLabel(msg.message_type)}
                      {msg.message_type === 'human' && msg.agent_name && (
                        <span style={{
                          background: '#28a745',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {msg.agent_name}
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.message_type === 'user' 
                        ? '#4682B4' 
                        : msg.message_type === 'human'
                        ? '#28a745'
                        : 'white',
                      color: msg.message_type === 'bot' ? '#333' : 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: msg.message_type === 'bot' ? '1px solid #e0e0e0' : 'none'
                    }}>
                      <div style={{
                        fontSize: '15px',
                        lineHeight: '1.5',
                        marginBottom: '6px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.message_text}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        opacity: 0.8,
                        textAlign: 'right'
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div style={{
              padding: '1.5rem',
              background: 'white',
              borderTop: '2px solid #e0e0e0'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}>
                    <i className="fas fa-reply" style={{ marginRight: '8px', color: '#28a745' }}></i>
                    Your Reply (will be sent to customer):
                  </label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply here... (Press Enter to send, Shift+Enter for new line)"
                    disabled={sending}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4682B4'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                </div>
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  style={{
                    padding: '12px 24px',
                    background: sending ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    minWidth: '120px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: (!replyText.trim() || sending) ? 0.5 : 1
                  }}
                >
                  {sending ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Send Reply
                    </>
                  )}
                </button>
              </div>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#666'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                Your reply will be displayed to the customer in the chat widget on their website.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
