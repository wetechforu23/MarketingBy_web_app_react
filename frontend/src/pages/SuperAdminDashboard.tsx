import React, { useEffect, useState } from 'react';
import { api } from '../api/http';

interface SystemOverview {
  totalClients: number;
  activeCampaigns: number;
  revenueThisMonth?: number; // Optional - not displayed
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
          status: client.is_active === true || client.status === true ? 'Active' : 'Inactive',
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

        // Set recent clients (last 5) - sorted by most recently created
        const sortedClients = [...clients].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentClients(sortedClients.slice(0, 5).map((client: any) => ({
          id: client.id,
          name: client.name || client.client_name,
          email: client.email,
          status: client.is_active === true || client.status === true ? 'Active' : 'Inactive',
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Event</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#333' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map(activity => (
                  <tr key={activity.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          background: activity.status === 'success' ? '#d4edda' : 
                                     activity.status === 'info' ? '#d1ecf1' : 
                                     activity.status === 'warning' ? '#fff3cd' : '#f8d7da',
                          color: activity.status === 'success' ? '#155724' : 
                                 activity.status === 'info' ? '#0c5460' : 
                                 activity.status === 'warning' ? '#856404' : '#721c24'
                        }}>
                          <i className={activity.icon}></i>
                        </div>
                        <span style={{ color: '#333', fontSize: '14px' }}>{activity.message}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#666', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Clients */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Clients</h2>
            <button className="btn btn-primary btn-sm">Add Client</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Client</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentClients.map(client => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-building" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                        <span style={{ fontWeight: '600', color: '#333' }}>{client.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#666' }}>{client.email}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: client.status === 'Active' ? '#d4edda' : '#f8d7da',
                        color: client.status === 'Active' ? '#155724' : '#721c24'
                      }}>
                        {client.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #4682B4',
                        background: 'white',
                        color: '#4682B4',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">System Status</h2>
            <button className="btn btn-outline btn-sm">Refresh</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0', background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Service</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Metrics</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#333' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {systemStatus.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: '600', color: '#333' }}>{item.name}</span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                      {item.uptime} uptime • {item.responseTime}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-circle" style={{
                          fontSize: '8px',
                          color: item.status === 'online' ? '#28a745' : item.status === 'warning' ? '#ffc107' : '#dc3545'
                        }}></i>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: item.status === 'online' ? '#d4edda' : item.status === 'warning' ? '#fff3cd' : '#f8d7da',
                          color: item.status === 'online' ? '#155724' : item.status === 'warning' ? '#856404' : '#721c24',
                          textTransform: 'capitalize'
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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