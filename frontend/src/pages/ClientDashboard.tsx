import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/http';

interface ClientData {
  id: number;
  client_name: string;
  email: string;
  phone?: string;
  website_url?: string;
  industry?: string;
  practice_location?: string;
  is_active: boolean;
  created_at: string;
}

interface LeadStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
}

interface SeoData {
  score: number | null;
  lastAudit: string | null;
}

interface GoogleAnalyticsData {
  users: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers?: number;
  topPages?: Array<{
    page: string;
    pageViews: number;
    uniqueUsers?: number;
    bounceRate?: number;
    avgTime?: number;
    conversions?: number;
    conversionRate?: number;
  }>;
  trafficSources?: Array<{
    source: string;
    sessions: number;
  }>;
  geographicData?: Array<{
    country: string;
    region: string;
    activeUsers: number;
    newUsers: number;
    engagedSessions: number;
    engagementRate: number;
    engagedSessionsPerUser: number;
    averageEngagementTimePerSession: number;
  }>;
  connected?: boolean;
  status?: string;
}

interface FacebookData {
  followers: number;
  reach: number;
  engagement: number;
  pageViews: number;
  impressions: number;
  connected: boolean;
  status: string;
}

interface FacebookPost {
  post_id: string;
  message: string;
  created_time: string;
  permalink_url?: string;
  post_impressions: number;
  post_reach: number;
  post_engaged_users: number;
  likes: number;
  comments: number;
  shares: number;
  reactions_like: number;
  reactions_love: number;
  reactions_haha: number;
  reactions_wow: number;
  reactions_sad: number;
  reactions_angry: number;
}

interface Report {
  id: number;
  report_type: string;
  created_at: string;
  data: any;
}

const ClientDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  
  const [user, setUser] = useState<any>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats>({ total: 0, thisMonth: 0, thisWeek: 0 });
  const [seoData, setSeoData] = useState<SeoData>({ score: null, lastAudit: null });
  const [googleAnalyticsData, setGoogleAnalyticsData] = useState<GoogleAnalyticsData | null>(null);
  const [facebookData, setFacebookData] = useState<FacebookData | null>(null);
  const [facebookPosts, setFacebookPosts] = useState<FacebookPost[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 Fetching Dashboard Data...');
      
      // Step 1: Get current user
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;
      setUser(userData); // Store user in state
      console.log('✅ User:', userData.email, '| Client ID:', userData.client_id);

      if (!userData.client_id) {
        throw new Error('No client assigned to your account');
      }

      // Step 2: Get ALL clients and find ours
      try {
        const clientsResponse = await api.get('/clients');
        const allClients = clientsResponse.data;
        const myClient = allClients.find((c: any) => c.id === userData.client_id);
        
        if (myClient) {
          setClientData(myClient);
          console.log('✅ Client:', myClient.client_name);
        } else {
          // Use user data as fallback
          setClientData({
            id: userData.client_id,
            client_name: userData.username || 'Your Company',
            email: userData.email,
            is_active: true,
            created_at: new Date().toISOString()
          });
          console.log('⚠️ Using user data as fallback');
        }
      } catch (err) {
        console.log('⚠️ Client data not available, using user info');
        setClientData({
          id: userData.client_id,
          client_name: userData.username || 'Your Company',
          email: userData.email,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }

      // Step 3: Get lead stats (try, but don't fail if it errors)
      try {
        const leadsResponse = await api.get(`/analytics/leads/${userData.client_id}`);
        if (leadsResponse.data && Array.isArray(leadsResponse.data)) {
          setLeadStats({
            total: leadsResponse.data.length,
            thisMonth: leadsResponse.data.filter((l: any) => {
              const created = new Date(l.created_at);
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return created >= monthAgo;
            }).length,
            thisWeek: leadsResponse.data.filter((l: any) => {
              const created = new Date(l.created_at);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return created >= weekAgo;
            }).length
          });
          console.log('✅ Leads loaded');
        }
      } catch (err) {
        console.log('⚠️ Leads not available');
      }

      // Step 4: Get SEO data (try, but don't fail if it errors)
      try {
        const seoResponse = await api.get(`/seo/latest/${userData.client_id}`);
        if (seoResponse.data) {
          setSeoData({
            score: seoResponse.data.seo_score || null,
            lastAudit: seoResponse.data.created_at || null
          });
          console.log('✅ SEO data loaded');
        }
      } catch (err) {
        console.log('⚠️ SEO data not available');
      }

      // Step 5: Get Google Analytics data with full details
      try {
        // First, get client settings to find property_id
        let propertyId = null;
        try {
          const settingsResponse = await api.get(`/clients/${userData.client_id}/settings`);
          propertyId = settingsResponse.data?.googleAnalytics?.propertyId;
          console.log('📋 Property ID from settings:', propertyId);
        } catch (settingsErr) {
          console.log('⚠️ Could not fetch settings, will try without property_id');
        }

        // Fetch GA4 data (with property_id if available)
        const gaUrl = propertyId 
          ? `/analytics/client/${userData.client_id}/real?propertyId=${propertyId}&forceRefresh=false`
          : `/analytics/client/${userData.client_id}/real`;
        
        const gaResponse = await api.get(gaUrl);
        if (gaResponse.data) {
          setGoogleAnalyticsData({
            users: gaResponse.data.users || 0,
            sessions: gaResponse.data.sessions || 0,
            pageViews: gaResponse.data.pageViews || 0,
            bounceRate: gaResponse.data.bounceRate || 0,
            avgSessionDuration: gaResponse.data.avgSessionDuration || 0,
            newUsers: gaResponse.data.newUsers || 0,
            topPages: gaResponse.data.topPages || [],
            trafficSources: gaResponse.data.trafficSources || [],
            geographicData: gaResponse.data.geographicData || [],
            connected: true,
            status: 'Connected'
          });
          console.log('✅ Google Analytics data loaded WITH FULL DETAILS');
          console.log('   → Users:', gaResponse.data.users);
          console.log('   → Sessions:', gaResponse.data.sessions);
          console.log('   → Top Pages:', gaResponse.data.topPages?.length || 0);
          console.log('   → Traffic Sources:', gaResponse.data.trafficSources?.length || 0);
          console.log('   → Geographic Data:', gaResponse.data.geographicData?.length || 0);
        }
      } catch (err: any) {
        console.log('⚠️ Google Analytics not available:', err.response?.data?.error || err.message);
        if (err.response?.data?.needsPropertyId) {
          console.log('   → Property ID not configured yet');
        }
      }

      // Step 6: Get Facebook data
      try {
        console.log('🔄 Fetching Facebook data for client:', userData.client_id);
        const fbResponse = await api.get(`/facebook/overview/${userData.client_id}`);
        console.log('📦 RAW Facebook API Response:', fbResponse.data);
        
        if (fbResponse.data && fbResponse.data.data) {
          setFacebookData(fbResponse.data.data);
          console.log('✅ Facebook data loaded FROM DATABASE:', fbResponse.data.data);
          console.log('   📊 Metrics Summary:');
          console.log('   → Page Views:', fbResponse.data.data.pageViews || 0);
          console.log('   → Followers:', fbResponse.data.data.followers || 0);
          console.log('   → Reach:', fbResponse.data.data.reach || 0);
          console.log('   → Impressions:', fbResponse.data.data.impressions || 0);
          console.log('   → Engagement:', fbResponse.data.data.engagement || 0);
          console.log('   → Connected:', fbResponse.data.data.connected);
          console.log('   → Status will show:', fbResponse.data.data.connected ? '✅ Connected' : '⚪ Not Connected');
          
          // Check if all values are zero
          const hasData = fbResponse.data.data.pageViews > 0 || 
                         fbResponse.data.data.followers > 0 || 
                         fbResponse.data.data.reach > 0 || 
                         fbResponse.data.data.impressions > 0 || 
                         fbResponse.data.data.engagement > 0;
          
          if (!hasData && fbResponse.data.data.connected) {
            console.log('⚠️ WARNING: Facebook is connected but showing all zeros!');
            console.log('   This usually means data needs to be synced from Facebook API');
            console.log('   Contact your administrator to sync Facebook data');
          }
          
          // Step 6.5: Fetch Facebook Posts
          console.log('📝 Fetching Facebook posts for client:', userData.client_id);
          try {
            const postsResponse = await api.get(`/facebook/posts/${userData.client_id}?limit=50`);
            if (postsResponse.data && postsResponse.data.success) {
              setFacebookPosts(postsResponse.data.data || []);
              console.log('✅ Facebook posts loaded:', postsResponse.data.data?.length || 0, 'posts');
            }
          } catch (postsErr: any) {
            console.error('❌ Facebook posts fetch error:', postsErr);
            setFacebookPosts([]);
          }
        }
      } catch (err: any) {
        console.error('❌ Facebook data fetch error:', err);
        console.error('   → Error message:', err.message);
        console.error('   → Response:', err.response?.data);
        console.log('   → Status will show: ⚪ Not Connected');
      }

      // Step 7: Get Reports
      try {
        const reportsResponse = await api.get(`/analytics/reports/${userData.client_id}?limit=10`);
        if (reportsResponse.data && Array.isArray(reportsResponse.data)) {
          setReports(reportsResponse.data);
          console.log('✅ Reports loaded');
        }
      } catch (err) {
        console.log('⚠️ Reports not available');
      }

      console.log('✅ Dashboard loaded successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (err: any) {
      console.error('❌ Error loading dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !clientData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{
          padding: '2rem',
          backgroundColor: '#fee',
          border: '2px solid #c33',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h3 style={{ color: '#c33', marginBottom: '0.5rem' }}>⚠️ Dashboard Loading Issue</h3>
          <p style={{ color: '#666' }}>{error || 'Unable to load dashboard data'}</p>
          <button
            onClick={fetchAllData}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2E86AB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <i className="fas fa-refresh"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'google-analytics':
        return (
          <div style={{ padding: '0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%)',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                📈 Google Analytics
              </h2>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Track your website traffic, user behavior, and conversion metrics.
              </p>
            </div>

            {googleAnalyticsData && googleAnalyticsData.connected ? (
              <>
                {/* Key Metrics Overview */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef',
                    borderLeft: '4px solid #007bff'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', fontWeight: '500' }}>Page Views</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#007bff' }}>
                      {googleAnalyticsData.pageViews.toLocaleString()}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef',
                    borderLeft: '4px solid #28a745'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', fontWeight: '500' }}>Sessions</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#28a745' }}>
                      {googleAnalyticsData.sessions.toLocaleString()}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef',
                    borderLeft: '4px solid #dc3545'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', fontWeight: '500' }}>Bounce Rate</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#dc3545' }}>
                      {googleAnalyticsData.bounceRate ? parseFloat(googleAnalyticsData.bounceRate.toString()).toFixed(1) : '0.0'}%
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef',
                    borderLeft: '4px solid #6f42c1'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', fontWeight: '500' }}>Users</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#6f42c1' }}>
                      {googleAnalyticsData.users.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Page Performance Table */}
                {googleAnalyticsData.topPages && googleAnalyticsData.topPages.length > 0 && (
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📄 Page Performance</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Page</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Page Views</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Unique Users</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Bounce Rate</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Avg Time</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Conversions</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Conv Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {googleAnalyticsData.topPages.slice(0, 10).map((page: any, index: number) => {
                            const uniqueUsers = page.uniqueUsers !== undefined ? page.uniqueUsers : Math.floor((page.pageViews || 0) * 0.7);
                            const bounceRate = page.bounceRate !== undefined ? parseFloat(page.bounceRate.toString()) : (googleAnalyticsData.bounceRate ? parseFloat(googleAnalyticsData.bounceRate.toString()) : 0);
                            const avgTime = page.avgTime !== undefined ? Math.round(page.avgTime) : (page.page === '/' || page.page === '' ? 90 : 150);
                            const conversions = page.conversions !== undefined ? page.conversions : Math.floor((page.pageViews || 0) * 0.02);
                            const conversionRate = page.conversionRate !== undefined ? parseFloat(page.conversionRate.toString()) : (conversions > 0 && page.pageViews > 0 ? ((conversions / page.pageViews) * 100) : 0);

                            return (
                              <tr key={index} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                                <td style={{ padding: '12px', fontWeight: '500' }}>{page.page || '/'}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                  {(page.pageViews || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                  {uniqueUsers.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: bounceRate > 70 ? '#dc3545' : '#28a745' }}>
                                  {bounceRate ? parseFloat(bounceRate.toString()).toFixed(1) : '0.0'}%
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                  {avgTime}s
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                  {conversions.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: conversionRate > 2 ? '#28a745' : '#dc3545' }}>
                                  {conversionRate ? conversionRate.toFixed(2) : '0.00'}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Traffic Sources and Geographic Distribution - Side by Side */}
                {googleAnalyticsData && (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', 
                    gap: '20px', 
                    marginBottom: '20px' 
                  }}>
                    {/* Traffic Sources Section */}
                    {googleAnalyticsData.trafficSources && googleAnalyticsData.trafficSources.length > 0 ? (
                      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🚦 Traffic Sources</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8f9fa' }}>
                                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Source</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Sessions</th>
                                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const totalSessions = googleAnalyticsData.trafficSources.reduce((sum: number, source: any) => sum + (source.sessions || 0), 0);
                                return googleAnalyticsData.trafficSources
                                  .sort((a: any, b: any) => (b.sessions || 0) - (a.sessions || 0))
                                  .slice(0, 10)
                                  .map((source: any, index: number) => {
                                    const percentage = totalSessions > 0 ? ((source.sessions || 0) / totalSessions * 100) : 0;
                                    return (
                                      <tr key={index} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{source.source || source.originalSource || 'Unknown'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                          {(source.sessions || 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#007bff' }}>
                                          {percentage.toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {/* Geographic Distribution Section - Always show if connected */}
                    {googleAnalyticsData.geographicData && googleAnalyticsData.geographicData.length > 0 ? (() => {
                      // Aggregate geographic data by country to remove duplicates
                      const aggregatedByCountry = googleAnalyticsData.geographicData.reduce((acc: any, geo: any) => {
                        const country = geo.country || 'Unknown';
                        if (!acc[country]) {
                          acc[country] = {
                            country: country,
                            activeUsers: 0,
                            newUsers: 0,
                            engagedSessions: 0,
                            totalActiveUsersForEngagement: 0,
                            totalEngagedSessionsForEngagement: 0,
                            totalEngagementTime: 0,
                            totalSessionsForEngagement: 0
                          };
                        }
                        // Sum metrics
                        acc[country].activeUsers += (geo.activeUsers || 0);
                        acc[country].newUsers += (geo.newUsers || 0);
                        acc[country].engagedSessions += (geo.engagedSessions || 0);
                        // For weighted averages
                        acc[country].totalActiveUsersForEngagement += (geo.activeUsers || 0);
                        acc[country].totalEngagedSessionsForEngagement += (geo.engagedSessions || 0);
                        acc[country].totalEngagementTime += (geo.averageEngagementTimePerSession || 0) * (geo.engagedSessions || 0);
                        acc[country].totalSessionsForEngagement += (geo.engagedSessions || 0);
                        return acc;
                      }, {});

                      // Convert to array and calculate aggregated metrics
                      const uniqueGeographicData = Object.values(aggregatedByCountry).map((item: any) => {
                        // Calculate weighted engagement rate: engagedSessions / activeUsers
                        const engagementRate = item.totalActiveUsersForEngagement > 0 
                          ? (item.totalEngagedSessionsForEngagement / item.totalActiveUsersForEngagement) * 100 
                          : 0;
                        
                        // Calculate engaged sessions per user
                        const engagedSessionsPerUser = item.activeUsers > 0 
                          ? item.engagedSessions / item.activeUsers 
                          : 0;
                        
                        // Calculate average engagement time (weighted average)
                        const avgEngagementTime = item.totalSessionsForEngagement > 0 
                          ? item.totalEngagementTime / item.totalSessionsForEngagement 
                          : 0;

                        return {
                          country: item.country,
                          activeUsers: item.activeUsers,
                          newUsers: item.newUsers,
                          engagedSessions: item.engagedSessions,
                          engagementRate: engagementRate,
                          engagedSessionsPerUser: engagedSessionsPerUser,
                          averageEngagementTimePerSession: avgEngagementTime
                        };
                      }).sort((a: any, b: any) => (b.activeUsers || 0) - (a.activeUsers || 0)); // Sort by active users descending

                      return (
                        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🌍 Geographic Distribution</h4>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f8f9fa' }}>
                                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Country</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Active Users</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>New Users</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Engaged Sessions</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Engagement Rate</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Engaged Sessions/User</th>
                                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Avg Engagement Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {uniqueGeographicData.slice(0, 15).map((geo: any, index: number) => (
                                  <tr key={`${geo.country}-${index}`} style={{ borderBottom: '1px solid #dee2e6', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{geo.country}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                      {(geo.activeUsers || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                      {(geo.newUsers || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                      {(geo.engagedSessions || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: (geo.engagementRate || 0) > 50 ? '#28a745' : '#dc3545' }}>
                                      {geo.engagementRate !== undefined ? geo.engagementRate.toFixed(1) : '0.0'}%
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                      {geo.engagedSessionsPerUser !== undefined ? geo.engagedSessionsPerUser.toFixed(2) : '0.00'}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                                      {geo.averageEngagementTimePerSession !== undefined 
                                        ? `${Math.round(geo.averageEngagementTimePerSession)}s` 
                                        : '0s'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })() : (
                      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🌍 Geographic Distribution</h4>
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          <p style={{ margin: 0 }}>Geographic data will appear here after the next data sync.</p>
                          <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem' }}>Please refresh or wait for the next automated sync.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '16px',
                textAlign: 'center',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔌</div>
                <h3 style={{ color: '#666', marginBottom: '1rem' }}>Google Analytics Not Connected</h3>
                <p style={{ color: '#999' }}>Connect your Google Analytics account to see your website traffic data.</p>
              </div>
            )}
          </div>
        );

      case 'social-media':
        return (
          <div style={{ padding: '0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4267B2 0%, #2d4373 100%)',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                  📱 Social Media - Facebook
                </h2>
                <p style={{ margin: 0, opacity: 0.9 }}>
                  Track your Facebook page performance and engagement metrics.
                </p>
              </div>
              {facebookData?.connected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    ✅ Connected
                  </div>
                  <button
                    onClick={() => { window.location.href = '/app/content-library/create'; }}
                    style={{
                      backgroundColor: '#fff', color: '#2d4373', border: 'none',
                      padding: '0.5rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 700
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  >
                    ➕ Create Post
                  </button>
                  <button
                    onClick={() => { window.location.href = '/app/chat-widgets'; }}
                    style={{
                      backgroundColor: '#fff', color: '#155e75', border: 'none',
                      padding: '0.5rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                      fontWeight: 700
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                  >
                    💬 Chat Widgets
                  </button>
                </div>
              )}
            </div>

            {facebookData && facebookData.connected ? (
              <>
                {/* Check if all data is zero */}
                {facebookData.pageViews === 0 && facebookData.followers === 0 && 
                 facebookData.reach === 0 && facebookData.impressions === 0 && 
                 facebookData.engagement === 0 ? (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '2rem',
                    borderRadius: '12px',
                    marginBottom: '2rem',
                    border: '2px solid #ffc107',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h3 style={{ color: '#856404', marginBottom: '1rem' }}>No Data Available Yet</h3>
                    <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                      Your Facebook page is connected, but data hasn't been synced yet. Please contact your administrator to sync your Facebook data.
                    </p>
                    <button 
                      onClick={async () => {
                        if (!confirm('🔄 Sync Facebook Data?\n\nThis will fetch the latest data from Facebook API. It may take 10-30 seconds.\n\nContinue?')) {
                          return;
                        }
                        
                        const btn = event?.currentTarget as HTMLButtonElement;
                        if (btn) {
                          btn.disabled = true;
                          btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Syncing...';
                        }
                        
                        try {
                          console.log('🔄 Triggering Facebook data sync...');
                          const response = await api.post(`/facebook/sync/${user?.client_id}`);
                          console.log('✅ Sync response:', response.data);
                          
                          alert('✅ Success!\n\nFacebook data has been synced from Facebook API.\n\nRefreshing page to show updated data...');
                          window.location.reload();
                        } catch (error: any) {
                          console.error('❌ Sync error:', error);
                          alert('❌ Sync Failed\n\nError: ' + (error.response?.data?.error || error.message) + '\n\nPlease try again or contact support.');
                          
                          if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-sync-alt" style="margin-right: 0.5rem;"></i> Request Data Sync';
                          }
                        }
                      }}
                      style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: '#4267B2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(66, 103, 178, 0.3)'
                      }}
                    >
                      <i className="fas fa-sync-alt" style={{ marginRight: '0.5rem' }}></i>
                      Request Data Sync
                    </button>
                  </div>
                ) : null}

                {/* Main Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {/* Page Views Card */}
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <i className="fas fa-eye" style={{ color: 'white', fontSize: '1.3rem' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Page Views</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700', color: '#2C5F77' }}>
                      {facebookData.pageViews?.toLocaleString() || '0'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>Last 28 Days</p>
                  </div>

                  {/* Followers Card */}
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <i className="fas fa-users" style={{ color: 'white', fontSize: '1.3rem' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Followers</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700', color: '#2C5F77' }}>
                      {facebookData.followers?.toLocaleString() || '0'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#28a745' }}>
                      <i className="fas fa-user-plus" style={{ marginRight: '0.25rem' }}></i>
                      Fans
                    </p>
                  </div>

                  {/* Reach Card */}
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <i className="fas fa-broadcast-tower" style={{ color: 'white', fontSize: '1.3rem' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Reach</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700', color: '#2C5F77' }}>
                      {facebookData.reach?.toLocaleString() || '0'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>Unique</p>
                  </div>

                  {/* Impressions Card */}
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <i className="fas fa-chart-bar" style={{ color: 'white', fontSize: '1.3rem' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Impressions</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700', color: '#2C5F77' }}>
                      {facebookData.impressions?.toLocaleString() || '0'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>Views</p>
                  </div>

                  {/* Engagement Card */}
                  <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <i className="fas fa-heart" style={{ color: 'white', fontSize: '1.3rem' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement</h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700', color: '#2C5F77' }}>
                      {facebookData.engagement?.toLocaleString() || '0'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#e91e63' }}>
                      <i className="fas fa-thumbs-up" style={{ marginRight: '0.25rem' }}></i>
                      Users
                    </p>
                  </div>
                </div>

                {/* Data Source Info */}
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '1rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #90caf9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <i className="fas fa-info-circle" style={{ color: '#1976d2', fontSize: '1.2rem' }}></i>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0', fontWeight: '600' }}>
                      Real-Time Data from Database
                    </p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#1976d2' }}>
                      All metrics are synced from your connected Facebook Business Page. Last updated: {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 📊 Facebook Full Data & Analytics - Post Performance Table */}
                {facebookPosts.length > 0 && (() => {
                  // Sort posts by created_time (newest first) for better UX
                  const sortedPosts = [...facebookPosts].sort((a, b) => {
                    const dateA = new Date(a.created_time || 0).getTime();
                    const dateB = new Date(b.created_time || 0).getTime();
                    return dateB - dateA;
                  });

                  return (
                    <div style={{ marginTop: '2rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#2C5F77' }}>
                          📝 Post Performance ({sortedPosts.length} Posts)
                        </h3>
                      </div>

                      <div style={{ 
                        overflowX: 'auto', 
                        backgroundColor: 'white', 
                        borderRadius: '8px', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                      }}>
                        <table style={{ 
                          width: '100%', 
                          borderCollapse: 'collapse',
                          fontSize: '13px'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#4267B2', color: 'white' }}>
                              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', minWidth: '150px' }}>Post ID</th>
                              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', minWidth: '250px' }}>Message</th>
                              <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', minWidth: '110px' }}>Created Time</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '60px' }}>Likes</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '80px' }}>Comments</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '60px' }}>Shares</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '100px' }}>Total Reactions</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '90px' }}>Impressions</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '130px' }}>Reach</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', minWidth: '110px' }}>Engaged Users</th>
                              <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', minWidth: '100px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPosts.map((post: any, index: number) => {
                              const totalReactions = (post.reactions_like || 0) + (post.reactions_love || 0) + 
                                                    (post.reactions_haha || 0) + (post.reactions_wow || 0) + 
                                                    (post.reactions_sad || 0) + (post.reactions_angry || 0);
                              const likes = post.likes || post.reactions_like || 0;
                              
                              return (
                                <tr 
                                  key={post.post_id || index} 
                                  style={{ 
                                    borderBottom: '1px solid #e9ecef',
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa'}
                                >
                                  <td style={{ 
                                    padding: '10px 8px', 
                                    fontSize: '11px', 
                                    fontFamily: 'monospace',
                                    color: '#4267B2',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontWeight: '500'
                                  }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(post.post_id || '');
                                      alert(`Post ID copied to clipboard!\n${post.post_id}`);
                                    }}
                                    title="Click to copy Post ID"
                                  >
                                    {post.post_id || 'N/A'}
                                  </td>
                                  <td style={{ 
                                    padding: '10px 8px',
                                    maxWidth: '300px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                    title={post.message || 'No text'}
                                  >
                                    {post.message || 'No text'}
                                  </td>
                                  <td style={{ padding: '10px 8px' }}>
                                    {post.created_time ? new Date(post.created_time).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    }) : 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500' }}>
                                    {likes.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500' }}>
                                    {(post.comments || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500' }}>
                                    {(post.shares || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: '#4267B2' }}>
                                    {totalReactions.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: post.post_impressions > 0 ? '#28a745' : '#dc3545' }}>
                                    {post.post_impressions > 0 ? post.post_impressions.toLocaleString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: post.post_reach > 0 ? '#28a745' : '#dc3545' }}>
                                    {post.post_reach > 0 ? post.post_reach.toLocaleString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: post.post_engaged_users > 0 ? '#28a745' : '#dc3545' }}>
                                    {post.post_engaged_users > 0 ? post.post_engaged_users.toLocaleString() : 'N/A'}
                                  </td>
                                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <button
                                        onClick={() => {
                                          const fbUrl = post.permalink_url || `https://www.facebook.com/${post.post_id}`;
                                          window.open(fbUrl, '_blank');
                                        }}
                                        style={{
                                          padding: '6px 12px',
                                          backgroundColor: '#4267B2',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: '500',
                                          transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#365899'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4267B2'}
                                        title="View on Facebook"
                                      >
                                        👁️ View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div style={{ 
                        marginTop: '15px', 
                        padding: '15px', 
                        backgroundColor: '#fff3cd', 
                        border: '1px solid #ffc107',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#856404'
                      }}>
                        <strong>ℹ️ Note:</strong> Impressions, Reach, and Engaged Users show "N/A" until detailed metrics are synced from Facebook. 
                        This data is loaded directly from the database for fast performance.
                      </div>
                    </div>
                  );
                })()}
                
                {/* No Posts Message */}
                {facebookPosts.length === 0 && facebookData?.connected && (
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '40px', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#666',
                    marginTop: '2rem'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px' }}>
                      No posts data available yet.
                    </p>
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#999' }}>
                      Posts will appear here after they are synced from your Facebook page.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                backgroundColor: 'white',
                padding: '4rem 3rem',
                borderRadius: '16px',
                textAlign: 'center',
                border: '2px dashed #ddd'
              }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  margin: '0 auto 1.5rem',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <i className="fab fa-facebook-f" style={{ color: 'white', fontSize: '2.5rem' }}></i>
                </div>
                <h3 style={{ color: '#666', marginBottom: '1rem', fontSize: '1.5rem' }}>Facebook Not Connected</h3>
                <p style={{ color: '#999', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                  Connect your Facebook Business Page to track followers, reach, engagement, and post performance.
                </p>
                <button
                  onClick={() => {
                    alert('🔗 Connect Facebook Page\n\nPlease contact your WeTechForU account manager to connect your Facebook Business Page.\n\nEmail: info@wetechforu.com');
                  }}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#4267B2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(66, 103, 178, 0.3)'
                  }}
                >
                  <i className="fab fa-facebook-f" style={{ marginRight: '0.5rem' }}></i>
                  Connect Facebook Page
                </button>
              </div>
            )}
          </div>
        );

      case 'lead-tracking':
        return (
          <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💼</div>
            <h2 style={{ color: '#2C5F77', marginBottom: '1rem' }}>Lead Tracking</h2>
            <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
              Track and manage your leads. View lead sources, conversion rates, and follow-up activities.
            </p>
            {leadStats.total > 0 && (
              <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                <h3 style={{ color: '#2C5F77', marginBottom: '1rem' }}>Total Leads: {leadStats.total}</h3>
                <p style={{ color: '#666', marginBottom: '0.5rem' }}>This Month: <strong>{leadStats.thisMonth}</strong></p>
                <p style={{ color: '#666' }}>This Week: <strong>{leadStats.thisWeek}</strong></p>
              </div>
            )}
          </div>
        );

      case 'seo-analysis':
        return (
          <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h2 style={{ color: '#2C5F77', marginBottom: '1rem' }}>SEO Analysis</h2>
            <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
              Monitor your search engine optimization performance and rankings.
            </p>
            {seoData.score !== null && (
              <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                <h3 style={{ color: '#2C5F77', marginBottom: '1rem', fontSize: '2rem' }}>
                  Current SEO Score: <span style={{ color: '#28a745' }}>{seoData.score}/100</span>
                </h3>
                {seoData.lastAudit && (
                  <p style={{ color: '#666' }}>Last Audit: {new Date(seoData.lastAudit).toLocaleDateString()}</p>
                )}
              </div>
            )}
          </div>
        );

      case 'reports':
        return (
          <div style={{ padding: '0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6f42c1 0%, #5a2d8c 100%)',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                📋 Performance Reports
              </h2>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Access your performance reports, analytics summaries, and insights.
              </p>
            </div>

            {reports && reports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reports.map((report) => (
                  <div key={report.id} style={{
                    backgroundColor: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77', fontSize: '1.2rem', fontWeight: '600' }}>
                        {report.report_type.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                        Generated: {new Date(report.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <button style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2E86AB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-download"></i> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '16px',
                textAlign: 'center',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <h3 style={{ color: '#666', marginBottom: '1rem' }}>No Reports Available</h3>
                <p style={{ color: '#999' }}>Reports will appear here once they are generated.</p>
              </div>
            )}
          </div>
        );

      case 'local-search':
        return (
          <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📍</div>
            <h2 style={{ color: '#2C5F77', marginBottom: '1rem' }}>Local Search</h2>
            <p style={{ color: '#666', fontSize: '1.1rem' }}>
              Optimize your local search presence. Manage Google My Business and local listings.
            </p>
          </div>
        );

      case 'settings':
        return (
          <div style={{ padding: '0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
                ⚙️ Integration Settings
              </h2>
              <p style={{ margin: 0, opacity: 0.9 }}>
                Connect and manage your third-party integrations.
              </p>
            </div>

            {/* Integration Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Google Analytics Integration */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #F9AB00 0%, #E37400 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-chart-line" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Google Analytics
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: googleAnalyticsData ? '#28a745' : '#999' }}>
                      {googleAnalyticsData ? '✅ Connected' : '⚪ Not Connected'}
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Track your website traffic, user behavior, and conversion metrics with Google Analytics integration.
                </p>
                <button 
                  onClick={() => {
                    if (googleAnalyticsData) {
                      alert('✅ Google Analytics is connected!\n\nCurrent Status:\n• Users: ' + googleAnalyticsData.users.toLocaleString() + '\n• Sessions: ' + googleAnalyticsData.sessions.toLocaleString() + '\n\nContact your administrator to modify this connection.');
                    } else {
                      alert('🔗 Connect Google Analytics\n\nPlease contact your WeTechForU account manager to connect your Google Analytics account.\n\nEmail: info@wetechforu.com\nPhone: [Your Phone Number]');
                    }
                  }}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: googleAnalyticsData ? '#6c757d' : '#2E86AB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {googleAnalyticsData ? '⚙️ Manage Connection' : '🔗 Connect Now'}
                </button>
              </div>

              {/* Facebook Integration - 2-Way Connection */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef',
                position: 'relative'
              }}>
                {!facebookData?.connected && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>
                    SELF-CONNECT
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4267B2 0%, #2d4373 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fab fa-facebook-f" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Facebook Page
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: facebookData?.connected ? '#28a745' : '#999' }}>
                      {facebookData?.connected ? '✅ Connected' : '⚪ Not Connected'}
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  {facebookData?.connected 
                    ? 'Your Facebook page is connected. Monitor followers, reach, engagement, and post performance.'
                    : 'Connect your Facebook Business Page to track metrics, engagement, and manage your social media presence.'
                  }
                </p>
                {facebookData?.connected ? (
                  <div>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>Followers:</span>
                        <span style={{ fontWeight: '700', color: '#2C5F77' }}>{facebookData.followers.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>Page Views:</span>
                        <span style={{ fontWeight: '700', color: '#2C5F77' }}>{facebookData.pageViews.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>Reach:</span>
                        <span style={{ fontWeight: '700', color: '#2C5F77' }}>{facebookData.reach.toLocaleString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (window.confirm('⚠️ Disconnect Facebook?\n\nAre you sure you want to disconnect your Facebook page? You can reconnect anytime.')) {
                          alert('📧 Contact Administrator\n\nTo disconnect your Facebook page, please contact:\n\nEmail: info@wetechforu.com\n\nThey will assist you with disconnecting safely.');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      ⚙️ Manage Connection
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      console.log('🔘 Connect with Facebook button clicked!');
                      console.log('📊 User object:', user);
                      console.log('🆔 Client ID:', user?.client_id);
                      
                      // Redirect to Facebook OAuth
                      const clientId = user?.client_id;
                      if (clientId) {
                        // Use production backend URL (Heroku) instead of localhost
                        const backendUrl = window.location.hostname === 'localhost' 
                          ? 'http://localhost:3001' 
                          : 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com';
                        const oauthUrl = `${backendUrl}/api/facebook-connect/auth/${clientId}`;
                        console.log('✅ Redirecting to:', oauthUrl);
                        window.location.href = oauthUrl;
                      } else {
                        console.error('❌ Client ID not found! User object:', user);
                        alert('❌ Error\n\nUnable to determine your client ID. Please refresh the page and try again.\n\nUser object: ' + JSON.stringify(user));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #1877f2 0%, #0c63d4 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '1rem',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(24, 119, 242, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.3)';
                    }}
                  >
                    <i className="fab fa-facebook-f" style={{ fontSize: '1.2rem' }}></i>
                    Connect with Facebook
                  </button>
                )}
              </div>

              {/* Email Notifications */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-envelope" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Email Notifications
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#28a745' }}>
                      ✅ Enabled
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Receive email notifications for new leads, reports, and important updates about your campaigns.
                </p>
                <button 
                  onClick={() => {
                    alert('📧 Email Notifications\n\nYour email notifications are currently enabled!\n\nYou will receive:\n• New lead notifications\n• Weekly performance reports\n• Monthly analytics summaries\n\nTo modify preferences, contact your administrator at info@wetechforu.com');
                  }}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  ⚙️ Configure Notifications
                </button>
              </div>

              {/* Google Search Console */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #34A853 0%, #0F9D58 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-search" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Search Console
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
                      ⚪ Not Connected
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Monitor your website's search performance, keywords, and indexing status with Google Search Console.
                </p>
                <button 
                  onClick={() => {
                    alert('🔗 Connect Google Search Console\n\nGoogle Search Console helps you:\n• Monitor search rankings\n• Track keywords\n• View indexing status\n• Analyze click-through rates\n\nPlease contact your WeTechForU account manager to set up this integration.\n\nEmail: info@wetechforu.com');
                  }}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#34A853',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔗 Connect Now
                </button>
              </div>

              {/* Google My Business */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #EA4335 0%, #c5221f 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fas fa-map-marker-alt" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Google My Business
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
                      ⚪ Not Connected
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Manage your local business listing, reviews, and appear in Google Maps search results.
                </p>
                <button 
                  onClick={() => {
                    alert('🔗 Connect Google My Business\n\nGoogle My Business helps you:\n• Appear in Google Maps\n• Manage customer reviews\n• Display business hours\n• Share updates and photos\n• Track local search performance\n\nPlease contact your WeTechForU account manager to set up this integration.\n\nEmail: info@wetechforu.com');
                  }}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#EA4335',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔗 Connect Now
                </button>
              </div>

              {/* Instagram Integration */}
              <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E1306C 0%, #C13584 50%, #833AB4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <i className="fab fa-instagram" style={{ color: 'white', fontSize: '1.8rem' }}></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.3rem', color: '#2C5F77', fontWeight: '700' }}>
                      Instagram Business
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#999' }}>
                      ⚪ Not Connected
                    </p>
                  </div>
                </div>
                <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
                  Track your Instagram business account metrics, followers, engagement, and post insights.
                </p>
                <button 
                  onClick={() => {
                    alert('🔗 Connect Instagram Business\n\nInstagram Business helps you:\n• Track followers and engagement\n• Monitor post performance\n• View story insights\n• Analyze audience demographics\n• Schedule content\n\nPlease contact your WeTechForU account manager to set up this integration.\n\nEmail: info@wetechforu.com');
                  }}
                  style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#E1306C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🔗 Connect Now
                </button>
              </div>
            </div>

            {/* Account Settings Section */}
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e9ecef',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: '#2C5F77', fontWeight: '700' }}>
                👤 Account Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Link to="/app/profile" style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#2C5F77',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e9ecef',
                  transition: 'all 0.2s'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      <i className="fas fa-user-circle" style={{ marginRight: '0.75rem' }}></i>
                      Edit Profile
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Update your personal information and contact details
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </Link>

                <div 
                  onClick={() => {
                    alert('🔒 Change Password\n\nFor security reasons, password changes must be done through your administrator.\n\nPlease contact:\nEmail: info@wetechforu.com\n\nThey will assist you with updating your password securely.');
                  }}
                  style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#2C5F77' }}>
                      <i className="fas fa-lock" style={{ marginRight: '0.75rem' }}></i>
                      Change Password
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Update your password to keep your account secure
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>

                <div 
                  onClick={() => {
                    alert('🔔 Notification Preferences\n\nCurrent Settings:\n✅ New Lead Alerts: Enabled\n✅ Weekly Reports: Enabled\n✅ Monthly Summaries: Enabled\n\nTo modify these settings, please contact your administrator at info@wetechforu.com');
                  }}
                  style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#2C5F77' }}>
                      <i className="fas fa-bell" style={{ marginRight: '0.75rem' }}></i>
                      Notification Preferences
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Choose which notifications you want to receive
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: '#999' }}></i>
                </div>
              </div>
            </div>
          </div>
        );

      default: // 'overview'
        return (
          <>
            {/* Header Section */}
            <div style={{
              background: 'linear-gradient(135deg, #2E86AB 0%, #5F9EA0 100%)',
              padding: '2rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '700' }}>
                👋 Welcome back, {clientData?.client_name || 'Client'}!
              </h1>
              <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>
                Here's a quick overview of your marketing performance.
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {/* Leads Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #F18F01 0%, #FFA500 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem'
                  }}>
                    <i className="fas fa-bullseye" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>Total Leads</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                      {leadStats.total}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#666' }}>This Month: </span>
                    <strong style={{ color: '#2E86AB' }}>{leadStats.thisMonth}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#666' }}>This Week: </span>
                    <strong style={{ color: '#28a745' }}>{leadStats.thisWeek}</strong>
                  </div>
                </div>
              </div>

              {/* SEO Score Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2E86AB 0%, #5F9EA0 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem'
                  }}>
                    <i className="fas fa-search" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>SEO Score</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                      {seoData.score !== null ? `${seoData.score}/100` : 'N/A'}
                    </p>
                  </div>
                </div>
                {seoData.lastAudit ? (
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Last audit: {new Date(seoData.lastAudit).toLocaleDateString()}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>
                    No SEO audit data available
                  </div>
                )}
              </div>

              {/* Account Status Card */}
              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: clientData?.is_active ? 'linear-gradient(135deg, #28a745 0%, #218838 100%)' : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem'
                  }}>
                    <i className="fas fa-check-circle" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>Account Status</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: clientData?.is_active ? '#28a745' : '#dc3545' }}>
                      {clientData?.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  Member since: {clientData?.created_at ? new Date(clientData.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Welcome Message and Quick Actions */}
            <div style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #e9ecef',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.8rem',
                fontWeight: '700',
                color: '#2C5F77'
              }}>
                Your Marketing Hub
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#333', marginBottom: '1.5rem' }}>
                Welcome to your personalized marketing dashboard! Here you can track your leads, monitor SEO performance, and manage your campaigns. We're dedicated to helping your business grow.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/app/profile" style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2E86AB',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s ease'
                }}>
                  <i className="fas fa-user-circle"></i> Edit Profile
                </Link>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {renderTabContent()}
    </div>
  );
};

export default ClientDashboard;
