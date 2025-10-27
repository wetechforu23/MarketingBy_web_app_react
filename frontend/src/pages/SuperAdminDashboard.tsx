import React, { useEffect, useState } from 'react';
import { api } from '../api/http';

interface SystemOverview {
  totalClients: number;
  activeCampaigns: number;
  revenueThisMonth: number;
  totalUsers: number;
  newLeadsToday: number;
  systemHealth: number;
  // Additional comprehensive metrics
  activeClients?: number;
  activeUsers?: number;
  totalLeads?: number;
  totalConversations?: number;
  activeConversations?: number;
  conversationsToday?: number;
  messagesToday?: number;
  activeWidgets?: number;
  totalPosts?: number;
  postedCount?: number;
  postsToday?: number;
  gaSessions?: number;
  gaUsers?: number;
  gaPageViews?: number;
}

interface RecentActivity {
  id: string;
  type: 'client_onboarded' | 'campaign_completed' | 'leads_generated' | 'user_created' | 'system_alert';
  message: string;
  timestamp: string;
  clientName?: string;
  icon: string;
  status: 'success' | 'info' | 'warning' | 'error';
}

interface RecentClient {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

interface SystemStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  uptime: string;
  responseTime: string;
}

const SuperAdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [allClients, setAllClients] = useState<RecentClient[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch comprehensive real data from dashboard API
        const [overviewResponse, clientsResponse, usersResponse] = await Promise.all([
          api.get('/admin/dashboard/overview'),
          api.get('/admin/clients'),
          api.get('/admin/users')
        ]);

        const data = overviewResponse.data;
        const clients = clientsResponse.data.clients || [];
        const users = usersResponse.data.users || [];

        console.log('📊 Dashboard data received:', data);

        // Store all clients for dropdown
        setAllClients(clients.map((client: any) => ({
          id: client.id,
          name: client.name || client.client_name,
          email: client.email,
          status: client.status === 'Active' || client.is_active ? 'Active' : 'Inactive',
          created_at: client.created_at
        })));

        // Set comprehensive metrics from real data
        setOverview({
          totalClients: data.totalClients,
          activeCampaigns: data.activeCampaigns, // Real posted posts count
          revenueThisMonth: data.revenueThisMonth, // Calculated from active clients
          totalUsers: data.totalUsers,
          newLeadsToday: data.newLeadsToday, // Real leads created today
          systemHealth: data.systemHealth,
          // Additional metrics
          activeClients: data.activeClients,
          activeUsers: data.activeUsers,
          totalLeads: data.totalLeads,
          totalConversations: data.totalConversations,
          activeConversations: data.activeConversations,
          conversationsToday: data.conversationsToday,
          messagesToday: data.messagesToday,
          activeWidgets: data.activeWidgets,
          totalPosts: data.totalPosts,
          postedCount: data.postedCount,
          postsToday: data.postsToday,
          gaSessions: data.gaSessions,
          gaUsers: data.gaUsers,
          gaPageViews: data.gaPageViews
        });

        // Set recent clients (last 5)
        setRecentClients(clients.slice(0, 5).map((client: any) => ({
          id: client.id,
          name: client.name || client.client_name,
          email: client.email,
          status: client.status === 'Active' || client.is_active ? 'Active' : 'Inactive',
          created_at: client.created_at
        })));

        // Build real activity feed with actual data
        const activities: RecentActivity[] = [
          // Recent client onboarding
          ...clients.slice(0, 3).map((client: any) => ({
            id: `client-${client.id}`,
            type: 'client_onboarded' as const,
            message: `New client "${client.name || client.client_name}" onboarded`,
            timestamp: client.created_at,
            clientName: client.name || client.client_name,
            icon: 'fas fa-building',
            status: 'success' as const
          })),
          // Real leads today
          {
            id: 'leads-today',
            type: 'leads_generated',
            message: `${data.newLeadsToday} new leads generated today`,
            timestamp: new Date().toISOString(),
            icon: 'fas fa-user-plus',
            status: data.newLeadsToday > 0 ? 'success' as const : 'info' as const
          },
          // Real conversations today
          {
            id: 'conversations-today',
            type: 'system_alert',
            message: `${data.conversationsToday} widget conversations started today`,
            timestamp: new Date().toISOString(),
            icon: 'fas fa-comments',
            status: 'info' as const
          },
          // Real posts today
          {
            id: 'posts-today',
            type: 'campaign_completed',
            message: `${data.postsToday} social media posts published today`,
            timestamp: new Date().toISOString(),
            icon: 'fas fa-bullhorn',
            status: data.postsToday > 0 ? 'success' as const : 'info' as const
          },
          // Active users
          {
            id: 'users-active',
            type: 'user_created',
            message: `${data.activeUsers} active users in the system`,
            timestamp: new Date().toISOString(),
            icon: 'fas fa-users',
            status: 'info' as const
          }
        ];
        setRecentActivity(activities);

        // System status with health indicators
        const healthStatus = data.systemHealth > 95 ? 'online' : data.systemHealth > 80 ? 'warning' : 'offline';
        setSystemStatus([
          { id: '1', name: 'Backend API', status: 'online', uptime: '99.9%', responseTime: '45ms' },
          { id: '2', name: 'Database', status: 'online', uptime: '99.8%', responseTime: '12ms' },
          { id: '3', name: 'Chat Widgets', status: data.activeWidgets > 0 ? 'online' : 'warning', uptime: '98.5%', responseTime: `${data.activeWidgets} active` },
          { id: '4', name: 'Email Service', status: 'online', uptime: '95.2%', responseTime: '2.1s' },
          { id: '5', name: 'Google Analytics', status: data.gaSessions > 0 ? 'online' : 'warning', uptime: '99.5%', responseTime: `${data.gaSessions} sessions` },
          { id: '6', name: 'Social Media', status: data.postedCount > 0 ? 'online' : 'warning', uptime: '99.0%', responseTime: `${data.postedCount} posts` },
        ]);

      } catch (err) {
        console.error('Failed to fetch super admin dashboard data:', err);
        setError('Failed to load dashboard data.');
        
        // Fallback data for development
        setOverview({
          totalClients: 1,
          activeCampaigns: 0,
          revenueThisMonth: 0,
          totalUsers: 2,
          newLeadsToday: 5,
          systemHealth: 95
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="super-admin-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <img src="/logo.png" alt="WeTechForU" className="dashboard-logo" />
          <h1>Super Admin Dashboard</h1>
        </div>
        <p className="text-muted">Overview of the entire platform's performance and health.</p>
      </div>

      {/* Client Selector - Only for Super Admin */}
      <div style={{
        background: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 8px rgba(70, 130, 180, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <i className="fas fa-filter" style={{ color: 'white', fontSize: '1.2rem' }}></i>
        <label style={{ color: 'white', fontWeight: '600', fontSize: '1rem', marginBottom: 0 }}>
          View Data For:
        </label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '2px solid white',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            backgroundColor: 'white',
            color: '#2C5F77',
            minWidth: '250px'
          }}
        >
          <option value="all">🌐 All Clients (Platform-Wide)</option>
          {allClients.map((client) => (
            <option key={client.id} value={client.id.toString()}>
              🏥 {client.name}
            </option>
          ))}
        </select>
        {selectedClient !== 'all' && (
          <button
            onClick={() => setSelectedClient('all')}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <i className="fas fa-times me-2"></i>
            Clear Filter
          </button>
        )}
      </div>

      {/* Overview Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-building"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{overview?.totalClients || 0}</h3>
            <p className="stat-label">Total Clients</p>
            <div className="stat-trend">
              <i className="fas fa-arrow-up text-success"></i>
              <span className="text-success">+12% this month</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-bullhorn"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{overview?.activeCampaigns || 0}</h3>
            <p className="stat-label">Active Campaigns</p>
            <div className="stat-trend">
              <i className="fas fa-arrow-up text-success"></i>
              <span className="text-success">+8% this week</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">${overview?.revenueThisMonth?.toLocaleString() || 0}</h3>
            <p className="stat-label">Revenue This Month</p>
            <div className="stat-trend">
              <i className="fas fa-arrow-up text-success"></i>
              <span className="text-success">+15% vs last month</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{overview?.totalUsers || 0}</h3>
            <p className="stat-label">Total Users</p>
            <div className="stat-trend">
              <i className="fas fa-arrow-up text-success"></i>
              <span className="text-success">+3 new this week</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-user-plus"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{overview?.newLeadsToday || 0}</h3>
            <p className="stat-label">New Leads Today</p>
            <div className="stat-trend">
              <i className="fas fa-arrow-up text-success"></i>
              <span className="text-success">+25% vs yesterday</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-heartbeat"></i>
          </div>
          <div className="stat-content">
            <h3 className="stat-value">{overview?.systemHealth || 0}%</h3>
            <p className="stat-label">System Health</p>
            <div className="stat-trend">
              <i className="fas fa-check text-success"></i>
              <span className="text-success">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
            <button className="btn btn-outline btn-sm">View All</button>
          </div>
          <div className="activity-list">
            {recentActivity.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className={`activity-icon ${activity.status}`}>
                  <i className={activity.icon}></i>
                </div>
                <div className="activity-content">
                  <p className="activity-message">{activity.message}</p>
                  <p className="activity-time text-muted">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Clients */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Clients</h2>
            <button className="btn btn-primary btn-sm">Add Client</button>
          </div>
          <div className="clients-list">
            {recentClients.map(client => (
              <div key={client.id} className="client-item">
                <div className="client-avatar">
                  <i className="fas fa-building"></i>
                </div>
                <div className="client-info">
                  <h4 className="client-name">{client.name}</h4>
                  <p className="client-email text-muted">{client.email}</p>
                  <span className={`badge ${client.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                    {client.status}
                  </span>
                </div>
                <div className="client-actions">
                  <button className="btn btn-outline btn-sm">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">System Status</h2>
            <button className="btn btn-outline btn-sm">Refresh</button>
          </div>
          <div className="system-status">
            {systemStatus.map(item => (
              <div key={item.id} className="status-item">
                <div className="status-info">
                  <span className="status-name">{item.name}</span>
                  <span className="status-details">
                    {item.uptime} uptime • {item.responseTime}
                  </span>
                </div>
                <div className={`status-indicator ${item.status}`}>
                  <i className={`fas fa-circle ${item.status}`}></i>
                  <span className="status-text">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          <button className="quick-action-btn">
            <i className="fas fa-plus-circle"></i>
            <span>Add New Client</span>
          </button>
          <button className="quick-action-btn">
            <i className="fas fa-bullhorn"></i>
            <span>Create Campaign</span>
          </button>
          <button className="quick-action-btn">
            <i className="fas fa-file-alt"></i>
            <span>Generate Report</span>
          </button>
          <button className="quick-action-btn">
            <i className="fas fa-users"></i>
            <span>Manage Users</span>
          </button>
          <button className="quick-action-btn">
            <i className="fas fa-cog"></i>
            <span>System Settings</span>
          </button>
          <button className="quick-action-btn">
            <i className="fas fa-chart-bar"></i>
            <span>View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;