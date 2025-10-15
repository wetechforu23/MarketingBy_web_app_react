import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface Client {
  id: number;
  name: string;
  email: string;
  website: string;
  is_active: boolean;
  created_at: string;
}

interface AnalyticsData {
  googleAnalytics: {
    pageViews: number;
    sessions: number;
    bounceRate: number;
  };
  facebook: {
    pageViews: number;
    followers: number;
    engagement: number;
  };
  leads: {
    total: number;
    thisMonth: number;
    conversion: number;
  };
  posts: {
    total: number;
    thisMonth: number;
    engagement: number;
  };
}

interface ClientSettings {
  googleAnalytics: {
    connected: boolean;
    propertyId: string;
    viewId: string;
    lastConnected?: string | null;
  };
  facebook: {
    connected: boolean;
    pageId: string;
    accessToken: string;
  };
  searchConsole: {
    connected: boolean;
    siteUrl: string;
    lastConnected?: string | null;
  };
  googleTag: {
    connected: boolean;
    tagId: string;
  };
  businessManager: {
    connected: boolean;
    managerId: string;
  };
}

const ClientManagementDashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [clientSettings, setClientSettings] = useState<ClientSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'settings'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Handle OAuth success/error messages from URL parameters (no refetch here)
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const clientId = urlParams.get('clientId');
    const error = urlParams.get('error');

    if (connected && clientId) {
      const serviceName = connected === 'google_analytics' ? 'Google Analytics' :
                         connected === 'google_search_console' ? 'Google Search Console' :
                         connected;
      setSuccessMessage(`✅ Successfully connected to ${serviceName}!`);

      // Auto-select the client if it matches
      setTimeout(() => {
        const client = clients.find(c => c.id === parseInt(clientId));
        if (client) {
          setSelectedClient(client);
        }
      }, 1000);

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setError(`❌ Connection failed: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clients]);

  useEffect(() => {
    console.log('🔄 Client changed, selectedClient:', selectedClient);
    if (selectedClient) {
      console.log('📊 Fetching data for client:', selectedClient.id, selectedClient.name);
      fetchClientData(selectedClient.id);
    }
  }, [selectedClient]);

  // Function to refresh all data for current client
  const refreshClientData = async () => {
    if (selectedClient) {
      console.log('🔄 Refreshing all data for client:', selectedClient.id);
      setRefreshing(true);
      try {
        await fetchClientData(selectedClient.id);
        console.log('✅ Client data refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing client data:', error);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching clients from /admin/clients...');
      
      // Add cache-busting parameters
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&v=1.0.4`;
      
      const response = await http.get(`/admin/clients${cacheBuster}`);
      console.log('📊 Clients API response:', response);
      console.log('📊 Response data:', response.data);
      console.log('📊 Response data type:', typeof response.data);
      console.log('📊 Is array?', Array.isArray(response.data));
      
      // Handle the response structure: {clients: [...], pagination: {...}}
      let clientsData = [];
      
      if (Array.isArray(response.data)) {
        // If response.data is directly an array
        clientsData = response.data;
      } else if (response.data && typeof response.data === 'object' && Array.isArray(response.data.clients)) {
        // If response.data is an object with clients array
        clientsData = response.data.clients;
      } else {
        // Fallback: try to extract any array from the response
        console.log('⚠️ Unexpected response structure, attempting to extract clients...');
        clientsData = [];
      }
      
      console.log('📊 Processed clients data:', clientsData);
      console.log('📊 Clients data length:', clientsData.length);
      
      setClients(clientsData);
      
      if (clientsData.length > 0) {
        setSelectedClient(clientsData[0]);
        console.log('📊 Selected first client:', clientsData[0]);
      } else {
        console.log('📊 No clients found');
      }
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      setError('Failed to load clients. Please try again.');
      setClients([]); // Ensure clients is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchClientData = async (clientId: number) => {
    console.log(`🔄 Fetching REAL data only for client ${clientId}...`);
    
    try {
      // Fetch client settings first to get property IDs and configuration
          const settingsResponse = await http.get(`/clients/${clientId}/settings`);
      setClientSettings(settingsResponse.data);
      console.log('✅ Client settings loaded:', settingsResponse.data);

      // Initialize analytics data structure with ZERO values (NO MOCK DATA)
      let analyticsData = {
        googleAnalytics: {
          pageViews: 0,
          sessions: 0,
          bounceRate: 0,
          users: 0,
          newUsers: 0,
          avgSessionDuration: 0,
          topPages: [],
          trafficSources: [],
          connected: false,
          status: 'Not Connected'
        },
        facebook: {
          pageViews: 0,
          followers: 0,
          engagement: 0,
          connected: false,
          status: 'Not Connected'
        },
        leads: {
          total: 0,
          thisMonth: 0,
          conversion: 0,
          connected: true, // Leads are always connected (from our database)
          status: 'Connected'
        },
        content: {
          total: 0,
          thisMonth: 0,
          engagement: 0,
          connected: false,
          status: 'Not Connected'
        }
      };

      // Try to fetch real Google Analytics data ONLY
      try {
        const propertyId = settingsResponse.data?.googleAnalytics?.propertyId;
        const isConnected = settingsResponse.data?.googleAnalytics?.connected;
        
        if (propertyId && isConnected) {
          console.log(`🔍 Fetching real Google Analytics data for property: ${propertyId}`);
          const realAnalyticsResponse = await http.get(`/analytics/client/${clientId}/real?propertyId=${propertyId}`);
          console.log('✅ Real Google Analytics data loaded:', realAnalyticsResponse.data);
          
          // Map real data to our structure
          analyticsData.googleAnalytics = {
            pageViews: realAnalyticsResponse.data.pageViews || 0,
            sessions: realAnalyticsResponse.data.sessions || 0,
            bounceRate: realAnalyticsResponse.data.bounceRate || 0,
            users: realAnalyticsResponse.data.users || 0,
            newUsers: realAnalyticsResponse.data.newUsers || 0,
            avgSessionDuration: realAnalyticsResponse.data.avgSessionDuration || 0,
            topPages: realAnalyticsResponse.data.topPages || [],
            trafficSources: realAnalyticsResponse.data.trafficSources || [],
            connected: true,
            status: 'Connected'
          };
        } else {
          console.log('⚠️ Google Analytics not connected - showing 0 values');
          analyticsData.googleAnalytics.connected = false;
          analyticsData.googleAnalytics.status = 'Not Connected';
        }
      } catch (realError) {
        console.log('⚠️ Real Google Analytics not available - showing 0 values:', realError);
        analyticsData.googleAnalytics.connected = false;
        analyticsData.googleAnalytics.status = 'Not Connected';
      }

      // Try to fetch real Search Console data ONLY
      try {
        const siteUrl = settingsResponse.data?.searchConsole?.siteUrl;
        const isConnected = settingsResponse.data?.searchConsole?.connected;
        
        if (siteUrl && isConnected) {
          console.log(`🔍 Fetching real Search Console data for site: ${siteUrl}`);
          const realSearchConsoleResponse = await http.get(`/search-console/client/${clientId}/real?siteUrl=${siteUrl}`);
          console.log('✅ Real Search Console data loaded:', realSearchConsoleResponse.data);
          
          // Add search console data to analytics
          analyticsData.googleAnalytics.searchConsoleData = realSearchConsoleResponse.data;
        } else {
          console.log('⚠️ Search Console not connected - no data available');
        }
      } catch (realError) {
        console.log('⚠️ Real Search Console not available:', realError);
      }

      // Fetch real leads data for this client (ALWAYS REAL DATA)
      try {
        console.log(`🔍 Fetching real leads data for client ${clientId}`);
        const leadsResponse = await http.get(`/leads?client_id=${clientId}`);
        const leads = leadsResponse.data.leads || leadsResponse.data || [];
        
        // Calculate lead metrics
        const totalLeads = leads.length;
        const thisMonth = new Date();
        const thisMonthLeads = leads.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate.getMonth() === thisMonth.getMonth() && 
                 leadDate.getFullYear() === thisMonth.getFullYear();
        }).length;
        
        analyticsData.leads = {
          total: totalLeads,
          thisMonth: thisMonthLeads,
          conversion: totalLeads > 0 ? Math.round((thisMonthLeads / totalLeads) * 100) : 0,
          connected: true,
          status: 'Connected'
        };
        
        console.log('✅ Real leads data loaded:', analyticsData.leads);
      } catch (leadsError) {
        console.log('⚠️ Real leads data not available - showing 0 values:', leadsError);
        analyticsData.leads = {
          total: 0,
          thisMonth: 0,
          conversion: 0,
          connected: false,
          status: 'Not Connected'
        };
      }

      // Check Facebook connection status (NO MOCK DATA)
      const facebookConnected = settingsResponse.data?.facebook?.connected;
      if (facebookConnected) {
        analyticsData.facebook.connected = true;
        analyticsData.facebook.status = 'Connected';
        // TODO: Add real Facebook API integration here
        console.log('⚠️ Facebook connected but no real API integration yet - showing 0 values');
      } else {
        analyticsData.facebook.connected = false;
        analyticsData.facebook.status = 'Not Connected';
        console.log('⚠️ Facebook not connected - showing 0 values');
      }

      // Content is always not connected (NO MOCK DATA)
      analyticsData.content.connected = false;
      analyticsData.content.status = 'Not Connected';
      console.log('⚠️ Content management not connected - showing 0 values');

      // Set the combined analytics data
      setAnalyticsData(analyticsData);
      console.log('✅ All REAL client data loaded successfully:', analyticsData);

    } catch (error) {
      console.error('❌ Error fetching client data:', error);
      // Set default data structure on error (ALL ZEROS, NO MOCK DATA)
      setAnalyticsData({
        googleAnalytics: { 
          pageViews: 0, sessions: 0, bounceRate: 0, users: 0, newUsers: 0, 
          avgSessionDuration: 0, topPages: [], trafficSources: [], 
          connected: false, status: 'Not Connected' 
        },
        facebook: { 
          pageViews: 0, followers: 0, engagement: 0, 
          connected: false, status: 'Not Connected' 
        },
        leads: { 
          total: 0, thisMonth: 0, conversion: 0, 
          connected: false, status: 'Not Connected' 
        },
        content: { 
          total: 0, thisMonth: 0, engagement: 0, 
          connected: false, status: 'Not Connected' 
        }
      });
    }
  };

  const handleConnectService = async (service: string, data: any) => {
    if (!selectedClient) return;
    
    try {
      if (service === 'google-analytics' || service === 'google_search_console') {
        // Handle OAuth flow for Google services
        const serviceName = service === 'google-analytics' ? 'analytics' : 'search-console';
        const response = await http.get(`/auth/google/${serviceName}?clientId=${selectedClient.id}`);
        
        // Redirect to Google OAuth
        window.location.href = response.data.authUrl;
      } else {
        // Handle other services with mock connection
        await http.post(`/clients/${selectedClient.id}/connect/${service}`, data);
        // Refresh client settings
        fetchClientData(selectedClient.id);
        alert(`${service} connected successfully!`);
      }
    } catch (error) {
      console.error(`Error connecting ${service}:`, error);
      alert(`Failed to connect ${service}`);
    }
  };

  if (loading) {
    return (
      <div className="loading-full-screen">
        <div className="spinner"></div>
        <p>Loading client management...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>Error Loading Client Management</h2>
          <p>{error}</p>
          <button onClick={fetchClients} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-management-dashboard">
      {/* Header with Title and Profile */}
      <div className="page-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h1>Client Management</h1>
          <p>Manage client analytics, settings, and integrations</p>
        </div>
        {/* Profile will be handled by the main layout */}
      </div>

      {/* Left Side Practice Switcher */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '15px',
        marginBottom: '20px',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>Switch Practice:</label>
          <select 
            value={selectedClient?.id || ''} 
            onChange={(e) => {
              console.log('🎯 Client selection changed to:', e.target.value);
              const client = clients.find(c => c.id === parseInt(e.target.value));
              console.log('🎯 Found client:', client);
              // Clear stale state while switching clients
              setClientSettings(null);
              setAnalyticsData(null);
              setSuccessMessage(null);
              setSelectedClient(client || null);
            }}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '2px solid #ddd',
              fontSize: '16px',
              minWidth: '250px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Choose a practice...</option>
            {Array.isArray(clients) && clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          margin: '20px',
          padding: '15px 20px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '8px',
          color: '#155724',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.5s ease-in'
        }}>
          <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>
          {successMessage}
          <button
            onClick={() => setSuccessMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#155724',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="dashboard-content">

        {selectedClient && (
          <>
            {/* Practice Title Block */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
                    {selectedClient.name}
                  </h2>
                  <p style={{ margin: '0 0 12px 0', color: '#6c757d', fontSize: '16px' }}>
                    {selectedClient.email} • {selectedClient.website}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: selectedClient.is_active ? '#d4edda' : '#f8d7da',
                    color: selectedClient.is_active ? '#155724' : '#721c24',
                    border: `1px solid ${selectedClient.is_active ? '#c3e6cb' : '#f5c6cb'}`
                  }}>
                    {selectedClient.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button 
                  onClick={() => selectedClient && fetchClientData(selectedClient.id)}
                  disabled={!selectedClient || refreshing}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: (selectedClient && !refreshing) ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: (selectedClient && !refreshing) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (selectedClient && !refreshing) ? 1 : 0.6
                  }}
                >
                  <i className={`fas ${refreshing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #e9ecef',
              marginBottom: '20px',
              backgroundColor: 'white',
              borderRadius: '8px 8px 0 0',
              padding: '0 20px'
            }}>
              <button 
                onClick={() => setActiveTab('overview')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'overview' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'overview' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'analytics' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'analytics' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📈 Analytics
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'settings' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'settings' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ⚙️ Settings
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-grid">
                  {/* Google Analytics Card */}
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Google Analytics</h3>
                      <span className={`status ${analyticsData?.googleAnalytics?.connected ? 'connected' : 'disconnected'}`}>
                        {analyticsData?.googleAnalytics?.status || 'Not Connected'}
                      </span>
                    </div>
                    <div className="metric-stats">
                      <div className="stat">
                        <span className="value">{analyticsData?.googleAnalytics?.pageViews || 0}</span>
                        <span className="label">Page Views</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.googleAnalytics?.sessions || 0}</span>
                        <span className="label">Sessions</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.googleAnalytics?.bounceRate || 0}%</span>
                        <span className="label">Bounce Rate</span>
                      </div>
                    </div>
                  </div>

                  {/* Facebook Card */}
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Facebook</h3>
                      <span className={`status ${analyticsData?.facebook?.connected ? 'connected' : 'disconnected'}`}>
                        {analyticsData?.facebook?.status || 'Not Connected'}
                      </span>
                    </div>
                    <div className="metric-stats">
                      <div className="stat">
                        <span className="value">{analyticsData?.facebook?.pageViews || 0}</span>
                        <span className="label">Page Views</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.facebook?.followers || 0}</span>
                        <span className="label">Followers</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.facebook?.engagement || 0}%</span>
                        <span className="label">Engagement</span>
                      </div>
                    </div>
                  </div>

                  {/* Leads Card */}
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Leads</h3>
                      <span className={`status ${analyticsData?.leads?.connected ? 'connected' : 'disconnected'}`}>
                        {analyticsData?.leads?.status || 'Not Connected'}
                      </span>
                    </div>
                    <div className="metric-stats">
                      <div className="stat">
                        <span className="value">{analyticsData?.leads?.total || 0}</span>
                        <span className="label">Total Leads</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.leads?.thisMonth || 0}</span>
                        <span className="label">This Month</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.leads?.conversion || 0}%</span>
                        <span className="label">Conversion</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="metric-card">
                    <div className="metric-header">
                      <h3>Content</h3>
                      <span className={`status ${analyticsData?.content?.connected ? 'connected' : 'disconnected'}`}>
                        {analyticsData?.content?.status || 'Not Connected'}
                      </span>
                    </div>
                    <div className="metric-stats">
                      <div className="stat">
                        <span className="value">{analyticsData?.content?.total || 0}</span>
                        <span className="label">Total Posts</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.content?.thisMonth || 0}</span>
                        <span className="label">This Month</span>
                      </div>
                      <div className="stat">
                        <span className="value">{analyticsData?.content?.engagement || 0}%</span>
                        <span className="label">Engagement</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="analytics-content">
                  <h3>Detailed Analytics</h3>
                  <p>Detailed analytics charts and reports will be displayed here.</p>
                  {/* Placeholder for charts */}
                  <div className="chart-placeholder">
                    <div className="placeholder-content">
                      <i className="fas fa-chart-line" style={{ fontSize: '3rem', color: '#ddd' }}></i>
                      <p>Analytics charts coming soon...</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="settings-content">
                  <h3>Integration Settings</h3>
                  
                  {/* Google Analytics Settings */}
                  <div className="integration-card">
                    <div className="integration-header">
                      <h4>Google Analytics</h4>
                      <span className={`status ${clientSettings?.googleAnalytics?.connected ? 'connected' : 'disconnected'}`}>
                        {clientSettings?.googleAnalytics?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="integration-form">
                      <input 
                        type="text" 
                        placeholder="Property ID (numeric)" 
                        value={clientSettings?.googleAnalytics?.propertyId || ''}
                        onChange={(e) => {
                          if (clientSettings) {
                            setClientSettings({
                              ...clientSettings,
                              googleAnalytics: {
                                ...clientSettings.googleAnalytics,
                                propertyId: e.target.value
                              }
                            });
                          }
                        }}
                        id="ga-property-id"
                        disabled={clientSettings?.googleAnalytics?.connected}
                      />
                      <input 
                        type="text" 
                        placeholder="View ID (optional)" 
                        value={clientSettings?.googleAnalytics?.viewId || ''}
                        onChange={(e) => {
                          if (clientSettings) {
                            setClientSettings({
                              ...clientSettings,
                              googleAnalytics: {
                                ...clientSettings.googleAnalytics,
                                viewId: e.target.value
                              }
                            });
                          }
                        }}
                        id="ga-view-id"
                        disabled={clientSettings?.googleAnalytics?.connected}
                      />
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleConnectService('google-analytics', {
                            propertyId: clientSettings?.googleAnalytics?.propertyId,
                            viewId: clientSettings?.googleAnalytics?.viewId
                          })}
                          className="connect-btn"
                          disabled={clientSettings?.googleAnalytics?.connected}
                        >
                          <i className="fab fa-google" style={{ marginRight: '8px' }}></i>
                          Connect Google Analytics
                        </button>
                        <button 
                          onClick={async () => {
                            const propertyId = clientSettings?.googleAnalytics?.propertyId;
                            if (propertyId && selectedClient) {
                              try {
                                await http.put(`/clients/${selectedClient.id}/service/google_analytics/config`, {
                                  propertyId: propertyId
                                });
                                setSuccessMessage('✅ Property ID updated successfully!');
                                fetchClientData(selectedClient.id);
                              } catch (error) {
                                setError('❌ Failed to update Property ID');
                              }
                            } else {
                              setError('❌ Please enter a Property ID');
                            }
                          }}
                          className="connect-btn"
                          style={{ backgroundColor: '#6c757d' }}
                          disabled={clientSettings?.googleAnalytics?.connected}
                        >
                          <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                          Save Property ID
                        </button>
                        {clientSettings?.googleAnalytics?.connected && selectedClient && (
                          <button
                            onClick={async () => {
                              try {
                                await http.post(`/clients/${selectedClient.id}/service/google_analytics/disconnect`, {});
                                setSuccessMessage('✅ Disconnected Google Analytics');
                                await fetchClientData(selectedClient.id);
                              } catch (e) {
                                setError('❌ Failed to disconnect Google Analytics');
                              }
                            }}
                            className="connect-btn"
                            style={{ backgroundColor: '#dc3545' }}
                          >
                            <i className="fas fa-unlink" style={{ marginRight: '8px' }}></i>
                            Disconnect
                          </button>
                        )}
                      </div>
                      {clientSettings?.googleAnalytics?.connected && clientSettings?.googleAnalytics?.lastConnected && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
                          Last connected: {new Date(clientSettings.googleAnalytics.lastConnected).toLocaleString()}
                        </div>
                      )}
                      {selectedClient && (
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                          Current client: {selectedClient.name}. {clientSettings?.googleAnalytics?.propertyId ? `Property ID: ${clientSettings.googleAnalytics.propertyId}` : 'No Property ID saved yet.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Facebook Settings */}
                  <div className="integration-card">
                    <div className="integration-header">
                      <h4>Facebook Page</h4>
                      <span className={`status ${clientSettings?.facebook?.connected ? 'connected' : 'disconnected'}`}>
                        {clientSettings?.facebook?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="integration-form">
                      <input 
                        type="text" 
                        placeholder="Page ID" 
                        defaultValue={clientSettings?.facebook?.pageId || ''}
                      />
                      <input 
                        type="text" 
                        placeholder="Access Token" 
                        defaultValue={clientSettings?.facebook?.accessToken || ''}
                      />
                      <button 
                        onClick={() => handleConnectService('facebook', {
                          pageId: '123456789',
                          accessToken: 'your-access-token'
                        })}
                        className="connect-btn"
                      >
                        Connect Facebook
                      </button>
                    </div>
                  </div>

                  {/* Google Search Console */}
                  <div className="integration-card">
                    <div className="integration-header">
                      <h4>Google Search Console</h4>
                      <span className={`status ${clientSettings?.searchConsole?.connected ? 'connected' : 'disconnected'}`}>
                        {clientSettings?.searchConsole?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="integration-form">
                      <input 
                        type="text" 
                        placeholder="Site URL (e.g., https://alignprimary.com)" 
                        value={clientSettings?.searchConsole?.siteUrl || ''}
                        onChange={(e) => {
                          if (clientSettings) {
                            setClientSettings({
                              ...clientSettings,
                              searchConsole: {
                                ...clientSettings.searchConsole,
                                siteUrl: e.target.value
                              }
                            });
                          }
                        }}
                        id="gsc-site-url"
                        disabled={clientSettings?.searchConsole?.connected}
                      />
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handleConnectService('google_search_console', {
                            siteUrl: clientSettings?.searchConsole?.siteUrl
                          })}
                          className="connect-btn"
                          disabled={clientSettings?.searchConsole?.connected}
                        >
                          <i className="fab fa-google" style={{ marginRight: '8px' }}></i>
                          Connect Search Console
                        </button>
                        <button 
                          onClick={async () => {
                            const siteUrl = clientSettings?.searchConsole?.siteUrl;
                            if (siteUrl && selectedClient) {
                              try {
                                await http.put(`/clients/${selectedClient.id}/service/google_search_console/config`, {
                                  siteUrl: siteUrl
                                });
                                setSuccessMessage('✅ Site URL updated successfully!');
                                fetchClientData(selectedClient.id);
                              } catch (error) {
                                setError('❌ Failed to update Site URL');
                              }
                            } else {
                              setError('❌ Please enter a Site URL');
                            }
                          }}
                          className="connect-btn"
                          style={{ backgroundColor: '#6c757d' }}
                          disabled={clientSettings?.searchConsole?.connected}
                        >
                          <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                          Save Site URL
                        </button>
                        {clientSettings?.searchConsole?.connected && selectedClient && (
                          <button
                            onClick={async () => {
                              try {
                                await http.post(`/clients/${selectedClient.id}/service/google_search_console/disconnect`, {});
                                setSuccessMessage('✅ Disconnected Search Console');
                                await fetchClientData(selectedClient.id);
                              } catch (e) {
                                setError('❌ Failed to disconnect Search Console');
                              }
                            }}
                            className="connect-btn"
                            style={{ backgroundColor: '#dc3545' }}
                          >
                            <i className="fas fa-unlink" style={{ marginRight: '8px' }}></i>
                            Disconnect
                          </button>
                        )}
                      </div>
                      {clientSettings?.searchConsole?.connected && clientSettings?.searchConsole?.lastConnected && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
                          Last connected: {new Date(clientSettings.searchConsole.lastConnected).toLocaleString()}
                        </div>
                      )}
                      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        <strong>For alignprimary:</strong> https://alignprimary.com<br/>
                        <strong>For PROMEDHCA:</strong> https://promedhca.com
                      </div>
                    </div>
                  </div>

                  {/* Google Tag Manager */}
                  <div className="integration-card">
                    <div className="integration-header">
                      <h4>Google Tag Manager</h4>
                      <span className={`status ${clientSettings?.googleTag?.connected ? 'connected' : 'disconnected'}`}>
                        {clientSettings?.googleTag?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="integration-form">
                      <input 
                        type="text" 
                        placeholder="Tag ID (GTM-XXXXXXX)" 
                        defaultValue={clientSettings?.googleTag?.tagId || ''}
                      />
                      <button 
                        onClick={() => handleConnectService('google-tag', {
                          tagId: 'GTM-XXXXXXX'
                        })}
                        className="connect-btn"
                      >
                        Connect GTM
                      </button>
                    </div>
                  </div>

                  {/* Facebook Business Manager */}
                  <div className="integration-card">
                    <div className="integration-header">
                      <h4>Facebook Business Manager</h4>
                      <span className={`status ${clientSettings?.businessManager?.connected ? 'connected' : 'disconnected'}`}>
                        {clientSettings?.businessManager?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="integration-form">
                      <input 
                        type="text" 
                        placeholder="Business Manager ID" 
                        defaultValue={clientSettings?.businessManager?.managerId || ''}
                      />
                      <button 
                        onClick={() => handleConnectService('business-manager', {
                          managerId: '123456789'
                        })}
                        className="connect-btn"
                      >
                        Connect Business Manager
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .client-management-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #2c3e50;
          margin-bottom: 5px;
        }

        .page-header p {
          color: #666;
          margin: 0;
        }

        .client-selector {
          margin-bottom: 30px;
        }

        .client-selector label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #2c3e50;
        }

        .client-header {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .client-info h2 {
          margin: 0 0 5px 0;
          color: #2c3e50;
        }

        .client-info p {
          margin: 0 0 10px 0;
          color: #666;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab {
          padding: 12px 24px;
          border: none;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .tab.active {
          background: #007bff;
          color: white;
        }

        .tab:hover:not(.active) {
          background: #e9ecef;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .metric-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .metric-header h3 {
          margin: 0;
          color: #2c3e50;
        }

        .status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .status.connected {
          background: #d4edda;
          color: #155724;
        }

        .status.disconnected {
          background: #f8d7da;
          color: #721c24;
        }

        .status.active {
          background: #d1ecf1;
          color: #0c5460;
        }

        .metric-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .stat {
          text-align: center;
        }

        .stat .value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }

        .stat .label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }

        .analytics-content, .settings-content {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .chart-placeholder {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          border-radius: 8px;
          margin-top: 20px;
        }

        .placeholder-content {
          text-align: center;
          color: #666;
        }

        .integration-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .integration-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .integration-header h4 {
          margin: 0;
          color: #2c3e50;
        }

        .integration-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .integration-form input {
          flex: 1;
          min-width: 200px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .connect-btn {
          padding: 10px 20px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .connect-btn:hover {
          background: #218838;
        }

        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          padding: 20px;
        }

        .error-message {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 500px;
        }

        .error-message h2 {
          color: #dc3545;
          margin-bottom: 15px;
        }

        .error-message p {
          color: #666;
          margin-bottom: 20px;
        }

        .retry-btn {
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .retry-btn:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default ClientManagementDashboard;
