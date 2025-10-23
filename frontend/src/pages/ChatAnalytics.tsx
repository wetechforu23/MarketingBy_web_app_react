import { useState, useEffect } from 'react'
import http from '../api/http'

export default function ChatAnalytics() {
  const [widgets, setWidgets] = useState<any[]>([])
  const [selectedWidget, setSelectedWidget] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchWidgets()
  }, [])

  useEffect(() => {
    if (selectedWidget) {
      fetchAnalytics()
    }
  }, [selectedWidget])

  const fetchWidgets = async () => {
    try {
      const response = await http.get('/chat-widget/widgets')
      setWidgets(response.data)
      if (response.data.length > 0) {
        setSelectedWidget(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load widgets')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await http.get(`/chat-widget/widgets/${selectedWidget}/analytics`)
      setAnalytics(response.data)
    } catch (err: any) {
      console.error('Failed to load analytics:', err)
    }
  }

  // Calculate totals from analytics data
  const totals = analytics.reduce(
    (acc, day) => ({
      conversations: acc.conversations + (day.total_conversations || 0),
      completed: acc.completed + (day.completed_conversations || 0),
      abandoned: acc.abandoned + (day.abandoned_conversations || 0),
      leads: acc.leads + (day.leads_captured || 0),
      avgMessages: acc.avgMessages + (day.avg_messages_per_conversation || 0),
      avgRating: acc.avgRating + (day.avg_satisfaction_rating || 0)
    }),
    { conversations: 0, completed: 0, abandoned: 0, leads: 0, avgMessages: 0, avgRating: 0 }
  )

  const avgMessages = analytics.length > 0 ? (totals.avgMessages / analytics.length).toFixed(1) : '0'
  const avgRating = analytics.length > 0 ? (totals.avgRating / analytics.length).toFixed(1) : '0'
  const conversionRate = totals.conversations > 0 
    ? ((totals.leads / totals.conversations) * 100).toFixed(1) 
    : '0'

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading analytics...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Chat Widget Analytics</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Track performance and engagement metrics for your chat widgets
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

      {widgets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <i className="fas fa-chart-bar" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h2>No Widgets to Analyze</h2>
          <p style={{ color: '#666' }}>
            Create a widget first to start seeing analytics data.
          </p>
        </div>
      ) : (
        <>
          {/* Widget Selector */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Select Widget
            </label>
            <select
              value={selectedWidget || ''}
              onChange={(e) => setSelectedWidget(parseInt(e.target.value))}
              style={{
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '300px'
              }}
            >
              {widgets.map(widget => (
                <option key={widget.id} value={widget.id}>
                  {widget.widget_name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Total Conversations
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>
                {totals.conversations}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Leads Captured
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>
                {totals.leads}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '0.5rem' }}>
                {conversionRate}% conversion rate
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Completed
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>
                {totals.completed}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '0.5rem' }}>
                {totals.abandoned} abandoned
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Avg Messages / Conv
              </div>
              <div style={{ fontSize: '36px', fontWeight: '700' }}>
                {avgMessages}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '0.5rem' }}>
                {avgRating}/5.0 satisfaction
              </div>
            </div>
          </div>

          {/* Daily Analytics Table */}
          {analytics.length > 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ margin: 0 }}>Daily Analytics</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Conversations</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Completed</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Leads</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Avg Messages</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Satisfaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.slice(0, 30).map(day => (
                      <tr key={day.date} style={{ borderTop: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '1rem' }}>
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                          {day.total_conversations || 0}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {day.completed_conversations || 0}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#28a745' }}>
                          {day.leads_captured || 0}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {day.avg_messages_per_conversation?.toFixed(1) || '0'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {day.avg_satisfaction_rating?.toFixed(1) || '-'} ⭐
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <i className="fas fa-chart-line" style={{ fontSize: '64px', color: '#ccc', marginBottom: '1rem' }}></i>
              <h2>No Analytics Data Yet</h2>
              <p style={{ color: '#666' }}>
                Analytics will appear once your widget starts receiving conversations.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

