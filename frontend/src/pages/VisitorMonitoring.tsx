import { useState, useEffect, useRef } from 'react'
import { api } from '../api/http'

interface Widget {
  id: number
  widget_name: string
  widget_key: string
  is_active: boolean
}

interface VisitorSession {
  id: number
  session_id: string
  widget_id: number
  widget_name: string
  visitor_name: string | null
  visitor_email: string | null
  visitor_phone: string | null
  
  // Location
  ip_address: string
  country: string | null
  city: string | null
  region: string | null
  
  // Device
  browser: string
  browser_version: string
  os: string
  os_version: string
  device_type: string
  
  // Activity
  current_page_url: string
  current_page_title: string
  referrer_url: string | null
  landing_page_url: string
  
  // Metrics
  is_active: boolean
  page_views: number
  total_time_seconds: number
  time_on_site_seconds: number
  last_active_at: string
  session_started_at: string
  
  // Engagement
  messages_sent: number
  has_chatted: boolean
  conversation_id: number | null
  message_count: number
}

interface VisitorStats {
  total_visitors: number
  active_visitors: number
  visitors_who_chatted: number
  avg_time_on_site: number
  avg_page_views: number
  countries_count: number
}

export default function VisitorMonitoring() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedWidgetId, setSelectedWidgetId] = useState<number | null>(null)
  const [visitors, setVisitors] = useState<VisitorSession[]>([])
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('24h')
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  // Fetch widgets on mount
  useEffect(() => {
    fetchWidgets()
  }, [])

  // Fetch visitors when widget selected
  useEffect(() => {
    if (selectedWidgetId) {
      fetchActiveVisitors()
      fetchStats()
    }
  }, [selectedWidgetId])

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh && selectedWidgetId) {
      pollingInterval.current = setInterval(() => {
        fetchActiveVisitors()
        fetchStats()
      }, 5000) // Poll every 5 seconds
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
        pollingInterval.current = null
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [autoRefresh, selectedWidgetId])

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

  const fetchActiveVisitors = async () => {
    if (!selectedWidgetId) return
    
    try {
      const response = await api.get(`/visitor-tracking/widgets/${selectedWidgetId}/active-visitors`)
      setVisitors(response.data)
    } catch (err: any) {
      console.error('Failed to fetch visitors:', err)
    }
  }

  const fetchStats = async () => {
    if (!selectedWidgetId) return
    
    try {
      const response = await api.get(`/visitor-tracking/widgets/${selectedWidgetId}/visitor-stats?period=${selectedPeriod}`)
      setStats(response.data)
    } catch (err: any) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile') return '📱'
    if (deviceType === 'tablet') return '📋'
    return '💻'
  }

  const getBrowserIcon = (browser: string) => {
    if (browser.includes('Chrome')) return '🌐'
    if (browser.includes('Firefox')) return '🦊'
    if (browser.includes('Safari')) return '🧭'
    if (browser.includes('Edge')) return '🌊'
    return '🌍'
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner-border" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', color: '#2c3e50' }}>
              📊 Visitor Monitoring
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
              Real-time visitor tracking and analytics
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">{error}</div>
        )}

        {/* Widget Selector & Controls */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
              Select Widget:
            </label>
            <select
              value={selectedWidgetId || ''}
              onChange={(e) => setSelectedWidgetId(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select Widget --</option>
              {widgets.map((widget) => (
                <option key={widget.id} value={widget.id}>
                  {widget.widget_name} {widget.is_active ? '🟢' : '🔴'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: '600' }}>
                🔄 Auto-refresh (5s)
              </span>
            </label>

            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value)
                fetchStats()
              }}
              style={{
                padding: '8px 12px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              onClick={() => {
                fetchActiveVisitors()
                fetchStats()
              }}
              style={{
                padding: '8px 16px',
                background: '#4682B4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Now
            </button>
          </div>
        </div>

        {!selectedWidgetId ? (
          <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#666'
          }}>
            <h3>👆 Select a widget above to view visitor monitoring</h3>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            {stats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Visitors</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.total_visitors}</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>🟢 Active Now</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>{visitors.length}</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>💬 Chatted</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>
                    {stats.visitors_who_chatted} 
                    <span style={{ fontSize: '16px', marginLeft: '8px', opacity: 0.9 }}>
                      ({stats.total_visitors > 0 ? Math.round((stats.visitors_who_chatted / stats.total_visitors) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>⏱️ Avg Time</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>{formatTime(stats.avg_time_on_site || 0)}</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>📄 Avg Pages</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.avg_page_views || 0}</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  color: '#333',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>🌍 Countries</div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.countries_count || 0}</div>
                </div>
              </div>
            )}

            {/* Active Visitors List */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '1.5rem 2rem',
                color: 'white'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                  🟢 Active Visitors ({visitors.length})
                </h2>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  Visitors active in the last 5 minutes
                </p>
              </div>

              <div style={{ padding: '2rem' }}>
                {visitors.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>👥</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>No active visitors right now</h3>
                    <p>Visitors will appear here when they're browsing your website</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gap: '1.5rem'
                  }}>
                    {visitors.map((visitor) => (
                      <div
                        key={visitor.id}
                        style={{
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          background: '#f8f9fa',
                          transition: 'all 0.3s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#4682B4'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(70, 130, 180, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e0e0e0'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#2c3e50', marginBottom: '0.5rem' }}>
                              {visitor.visitor_name || `Visitor ${visitor.session_id.substring(0, 12)}`}
                            </div>
                            <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                              <span>📍 {visitor.ip_address}</span>
                              {visitor.country && <span>🌍 {visitor.country}</span>}
                              {visitor.city && <span>📌 {visitor.city}</span>}
                            </div>
                          </div>
                          <div style={{
                            background: visitor.has_chatted ? '#28a745' : '#ffc107',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {visitor.has_chatted ? '💬 Chatted' : '👀 Browsing'}
                          </div>
                        </div>

                        <div style={{
                          background: 'white',
                          padding: '1rem',
                          borderRadius: '8px',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '0.5rem' }}>Current Page:</div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50', wordBreak: 'break-all' }}>
                            🌐 {visitor.current_page_title || visitor.current_page_url}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '0.25rem' }}>
                            {visitor.current_page_url}
                          </div>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>⏱️ Time on Site:</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                              {formatTime(visitor.time_on_site_seconds)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>📄 Pages Viewed:</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                              {visitor.page_views}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>💬 Messages:</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                              {visitor.message_count || 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#666' }}>🕐 Last Active:</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                              {formatTimestamp(visitor.last_active_at)}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            padding: '6px 12px',
                            background: '#e3f2fd',
                            border: '1px solid #2196f3',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1976d2'
                          }}>
                            {getDeviceIcon(visitor.device_type)} {visitor.device_type}
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            background: '#fff3e0',
                            border: '1px solid #ff9800',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#f57c00'
                          }}>
                            {getBrowserIcon(visitor.browser)} {visitor.browser} {visitor.browser_version}
                          </div>
                          <div style={{
                            padding: '6px 12px',
                            background: '#f3e5f5',
                            border: '1px solid #9c27b0',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#7b1fa2'
                          }}>
                            💻 {visitor.os} {visitor.os_version}
                          </div>
                        </div>

                        {visitor.conversation_id && (
                          <button
                            onClick={() => window.location.href = `/app/chat-conversations?conversation_id=${visitor.conversation_id}`}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: '#4682B4',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            💬 View Conversation
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </div>
  )
}

