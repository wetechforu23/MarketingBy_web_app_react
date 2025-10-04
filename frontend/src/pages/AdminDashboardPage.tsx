import { useState, useEffect } from 'react'
import { api } from '../api/http'

interface Analytics {
  clients: number
  leads: number
  campaigns: number
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics>({ clients: 0, leads: 0, campaigns: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/analytics')
        setAnalytics(response.data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="card-title">Admin Dashboard</h1>
          <p className="card-subtitle">Welcome to WeTechForU Healthcare Marketing Platform</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <h2 className="stat-value">{analytics.clients}</h2>
          <p className="stat-label">Total Clients</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <h2 className="stat-value">{analytics.leads}</h2>
          <p className="stat-label">Active Leads</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <h2 className="stat-value">{analytics.campaigns}</h2>
          <p className="stat-label">Running Campaigns</p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <h2 className="stat-value">$0</h2>
          <p className="stat-label">Monthly Revenue</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="text-center text-muted">
            <p>No recent activity to display</p>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn btn-primary">Add New Client</button>
            <button className="btn btn-secondary">Create Campaign</button>
            <button className="btn btn-outline">Generate Report</button>
          </div>
        </div>
      </div>
    </div>
  )
}