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
  message_type: 'user' | 'bot' | 'human' | 'system' | 'agent'
  message_text: string
  created_at: string
  agent_name?: string  // Agent name for human responses
  agent_user_id?: number  // Agent user ID
  sender_name?: string  // Sender name for system messages
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
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 💬 WhatsApp State
  const [whatsappEnabled, setWhatsappEnabled] = useState(false)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)

  // Fetch widgets on mount
  useEffect(() => {
    fetchWidgets()
  }, [])

  // Fetch conversations when widget selected
  useEffect(() => {
    if (selectedWidgetId) {
      fetchConversations(selectedWidgetId)
      checkWhatsAppConfig(selectedWidgetId)
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

  const fetchConversations = async (widgetId: number, showLoading = false) => {
    try {
      if (showLoading) setRefreshing(true)
      
      const response = await api.get(`/chat-widget/widgets/${widgetId}/conversations?limit=50`)
      const convList = response.data
      
      // Add widget name to each conversation
      const widget = widgets.find(w => w.id === widgetId)
      const conversationsWithWidget = convList.map((conv: Conversation) => ({
        ...conv,
        widget_name: widget?.widget_name || 'Unknown'
      }))
      
      // Sort: Unread first, then by updated time
      const sorted = conversationsWithWidget.sort((a: Conversation, b: Conversation) => {
        const aUnread = (a as any).unread_agent_messages || 0
        const bUnread = (b as any).unread_agent_messages || 0
        if (bUnread !== aUnread) {
          return bUnread - aUnread
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      })
      
      setConversations(sorted)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load conversations')
    } finally {
      if (showLoading) setRefreshing(false)
    }
  }

  const fetchMessages = async (conv: Conversation) => {
    try {
      setLoadingMessages(true)
      const response = await api.get(`/chat-widget/conversations/${conv.id}/messages`)
      setMessages(response.data)
      setSelectedConv(conv)
      
      // ✅ Mark conversation as read
      try {
        await api.post(`/chat-widget/conversations/${conv.id}/mark-read`)
        
        // Refresh conversations to update unread counts
        if (selectedWidgetId) {
          fetchConversations(selectedWidgetId)
        }
      } catch (markReadErr) {
        console.warn('Failed to mark as read:', markReadErr)
      }
    } catch (err: any) {
      alert('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  // 💬 Check WhatsApp Configuration
  const checkWhatsAppConfig = async (widgetId: number) => {
    try {
      // Find widget to get client_id
      const widget = widgets.find(w => w.id === widgetId)
      if (!widget) return

      const response = await api.get(`/whatsapp/settings/${(widget as any).client_id}`)
      setWhatsappEnabled(response.data.configured && response.data.enable_whatsapp)
    } catch (err) {
      setWhatsappEnabled(false)
    }
  }

  // 💬 Send WhatsApp Message
  const sendViaWhatsApp = async () => {
    if (!replyText.trim() || !selectedConv) return
    
    // Check if visitor has phone number
    if (!selectedConv.visitor_phone) {
      alert('❌ Cannot send WhatsApp: No phone number available for this visitor.')
      return
    }

    try {
      setSendingWhatsApp(true)
      
      await api.post('/whatsapp/send', {
        conversation_id: selectedConv.id,
        message: replyText.trim()
      })

      // Add system message to indicate WhatsApp was sent
      const newMessage: Message = {
        id: Date.now(),
        conversation_id: selectedConv.id,
        message_type: 'system',
        message_text: `📱 WhatsApp sent: ${replyText.trim()}`,
        created_at: new Date().toISOString(),
        sender_name: 'System'
      }
      
      setMessages([...messages, newMessage])
      setReplyText('')
      
      alert('✅ WhatsApp message sent successfully!')
      
      // Refresh conversations
      if (selectedWidgetId) {
        fetchConversations(selectedWidgetId)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send WhatsApp message')
    } finally {
      setSendingWhatsApp(false)
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

  const deleteConversation = async (convId: number, visitorName: string) => {
    const confirmMessage = `Are you sure you want to delete conversation with "${visitorName}"?\n\nThis will permanently delete:\n- All messages in this conversation\n- Conversation history\n\nType "DELETE" to confirm:`
    const confirmation = prompt(confirmMessage)
    
    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        alert('❌ Deletion cancelled. You must type "DELETE" exactly.')
      }
      return
    }

    try {
      await api.delete(`/chat-widget/conversations/${convId}`)
      alert('✅ Conversation deleted successfully!')
      
      // Close modal if this conversation was open
      if (selectedConv?.id === convId) {
        setSelectedConv(null)
        setMessages([])
      }
      
      // Refresh list
      if (selectedWidgetId) {
        fetchConversations(selectedWidgetId)
      }
    } catch (err: any) {
      alert('❌ Failed to delete conversation: ' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }

  const deleteAllConversations = async () => {
    if (!selectedWidgetId) {
      alert('❌ Please select a widget first')
      return
    }

    const widget = widgets.find(w => w.id === selectedWidgetId)
    const widgetName = widget?.widget_name || 'this widget'
    const confirmMessage = `⚠️ WARNING: This will DELETE ALL ${conversations.length} conversations for "${widgetName}"!\n\nThis action CANNOT be undone!\n\nAll messages and conversation history will be permanently deleted.\n\nType "DELETE ALL" to confirm:`
    
    const confirmation = prompt(confirmMessage)
    
    if (confirmation !== 'DELETE ALL') {
      if (confirmation !== null) {
        alert('❌ Deletion cancelled. You must type "DELETE ALL" exactly.')
      }
      return
    }

    try {
      const response = await api.post('/chat-widget/conversations/bulk-delete', {
        widget_id: selectedWidgetId,
        delete_all: true
      })
      
      alert(`✅ Successfully deleted ${response.data.deleted_count} conversation(s)!`)
      
      // Clear UI
      setConversations([])
      setSelectedConv(null)
      setMessages([])
      
      // Refresh
      fetchConversations(selectedWidgetId)
    } catch (err: any) {
      alert('❌ Failed to delete conversations: ' + (err.response?.data?.error || err.message))
      console.error(err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745'  // Green for active conversations
      case 'closed': return '#007bff'  // Blue for closed by user/agent
      case 'inactive': return '#6c757d'  // Gray for auto-closed due to inactivity
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
      case 'human': 
      case 'agent': return '#28a745'
      case 'system': return '#ffc107'
      default: return '#6c757d'
    }
  }

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'user': return '👤 Customer'
      case 'bot': return '🤖 AI Bot'
      case 'human': 
      case 'agent': return '👨‍💼 Agent (You)'
      case 'system': return '⚙️ System'
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
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
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

        {/* Action Buttons */}
        {selectedWidgetId && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => selectedWidgetId && fetchConversations(selectedWidgetId, true)}
              disabled={refreshing}
              style={{
                padding: '10px 20px',
                background: refreshing ? '#ccc' : '#4682B4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className={`fas fa-sync-alt ${refreshing ? 'fa-spin' : ''}`}></i>
              {refreshing ? 'Refreshing...' : '🔄 Refresh Conversations'}
            </button>
            
            {conversations.length > 0 && (
              <>
                <button
                  onClick={deleteAllConversations}
                  style={{
                    padding: '10px 20px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#c82333'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#dc3545'}
                >
                  <i className="fas fa-trash-alt"></i>
                  🗑️ Delete All ({conversations.length})
                </button>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#dc3545',
                  fontStyle: 'italic'
                }}>
                  ⚠️ Permanently deletes ALL conversations
                </p>
              </>
            )}
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
              {conversations.map(conv => {
                const hasUnread = (conv.unread_agent_messages || 0) > 0;
                return (
                <tr
                  key={conv.id}
                  style={{
                    borderTop: '1px solid #e0e0e0',
                    background: hasUnread ? '#fff5f5' : (conv.handoff_requested ? '#fff3cd' : 'white'),
                    cursor: 'pointer',
                    borderLeft: hasUnread ? '4px solid #dc3545' : '4px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => fetchMessages(conv)}
                >
                  <td style={{ padding: '1rem', position: 'relative' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {conv.visitor_name || 'Anonymous'}
                      {hasUnread && (
                        <span style={{
                          background: '#dc3545',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          minWidth: '20px',
                          textAlign: 'center',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          animation: 'pulse 2s infinite'
                        }}>
                          {conv.unread_agent_messages}
                        </span>
                      )}
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conv.id, conv.visitor_name || 'Anonymous Visitor')
                        }}
                        style={{
                          padding: '8px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        title="Delete conversation"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
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

            {/* ✅ VISITOR INFO PANEL */}
            {(selectedConv.visitor_email || selectedConv.visitor_phone) && (
              <div style={{
                padding: '1rem 1.5rem',
                background: 'linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%)',
                borderBottom: '2px solid #2196F3',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1976d2', marginBottom: '8px', width: '100%' }}>
                  📋 Visitor Information:
                </div>
                {selectedConv.visitor_name && selectedConv.visitor_name !== 'Anonymous Visitor' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-user" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                    <span style={{ fontSize: '14px', color: '#333' }}>{selectedConv.visitor_name}</span>
                  </div>
                )}
                {selectedConv.visitor_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-envelope" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                    <a href={`mailto:${selectedConv.visitor_email}`} style={{ fontSize: '14px', color: '#4682B4', textDecoration: 'none' }}>
                      {selectedConv.visitor_email}
                    </a>
                  </div>
                )}
                {selectedConv.visitor_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-phone" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                    <a href={`tel:${selectedConv.visitor_phone}`} style={{ fontSize: '14px', color: '#4682B4', textDecoration: 'none' }}>
                      {selectedConv.visitor_phone}
                    </a>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-comments" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {selectedConv.message_count} messages • {selectedConv.bot_response_count} bot • {selectedConv.human_response_count || 0} you
                  </span>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              background: '#f8f9fa'
            }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4682B4', marginBottom: '1rem' }}></i>
                  <div>Loading messages...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
                  <div>No messages yet</div>
                </div>
              ) : (
                messages.map(msg => {
                  const isSystem = msg.message_type === 'system'
                  const isUser = msg.message_type === 'user'
                  const isAgent = msg.message_type === 'human' || msg.message_type === 'agent'
                  const isBot = msg.message_type === 'bot'
                  
                  return (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isSystem ? 'center' : isUser ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Sender Label */}
                    {!isSystem && (
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: isUser ? '#4682B4' : isAgent ? '#28a745' : '#666',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        background: isUser ? '#e3f2fd' : isAgent ? '#e8f5e9' : isBot ? '#fff8e1' : 'transparent',
                        borderRadius: '6px'
                      }}>
                        {getMessageTypeLabel(msg.message_type)}
                        {isAgent && msg.agent_name && (
                          <span style={{
                            background: '#28a745',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {msg.agent_name}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div style={{
                      maxWidth: isSystem ? '85%' : '75%',
                      padding: isSystem ? '10px 16px' : '12px 16px',
                      borderRadius: isSystem ? '8px' : '12px',
                      background: isUser 
                        ? 'linear-gradient(135deg, #4682B4, #5a9fd4)' 
                        : isAgent
                        ? 'linear-gradient(135deg, #28a745, #34c759)'
                        : isSystem
                        ? '#fff3cd'
                        : 'white',
                      color: isBot ? '#333' : isSystem ? '#856404' : 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: isBot ? '2px solid #e0e0e0' : isSystem ? '2px solid #ffc107' : 'none',
                      fontStyle: isSystem ? 'italic' : 'normal'
                    }}>
                      {isSystem && (
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          marginBottom: '6px',
                          color: '#856404',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          ⚙️ System Notification
                        </div>
                      )}
                      <div style={{
                        fontSize: isSystem ? '14px' : '15px',
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
                  )
                })
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
                
                {/* Send Buttons - Portal & WhatsApp */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: sending ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      minWidth: '140px',
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
                        Send in Portal
                      </>
                    )}
                  </button>

                  {/* WhatsApp Send Button */}
                  {whatsappEnabled && (
                    <button
                      onClick={sendViaWhatsApp}
                      disabled={!replyText.trim() || sendingWhatsApp || !selectedConv?.visitor_phone}
                      title={!selectedConv?.visitor_phone ? 'No phone number available' : 'Send via WhatsApp'}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        background: sendingWhatsApp ? '#ccc' : '#25D366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: (sendingWhatsApp || !selectedConv?.visitor_phone || !replyText.trim()) ? 'not-allowed' : 'pointer',
                        minWidth: '140px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: (!replyText.trim() || sendingWhatsApp || !selectedConv?.visitor_phone) ? 0.5 : 1
                      }}
                    >
                      {sendingWhatsApp ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fab fa-whatsapp"></i>
                          Send WhatsApp
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Help Text */}
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#666'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                {whatsappEnabled ? (
                  <>
                    Send via <strong>Portal</strong> (shows in widget) or <strong>WhatsApp</strong> (SMS notification)
                    {!selectedConv?.visitor_phone && (
                      <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                        ⚠️ WhatsApp unavailable: No phone number
                      </span>
                    )}
                  </>
                ) : (
                  'Your reply will be displayed to the customer in the chat widget on their website.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
