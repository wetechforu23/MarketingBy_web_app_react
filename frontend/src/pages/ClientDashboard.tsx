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
  detailedGeographicData?: any[]; // Region-level detailed geographic data
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
  const [pageInsights, setPageInsights] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
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

      // Step 5: Get Google Analytics data (checks database first, then API)
      try {
        const gaResponse = await api.get(`/analytics/client/${userData.client_id}/real`);
        console.log('✅ Google Analytics API response:', gaResponse.data);
        
        // Check if we have actual data (non-zero values)
        const hasData = gaResponse.data && (
          gaResponse.data.pageViews > 0 ||
          gaResponse.data.sessions > 0 ||
          gaResponse.data.users > 0
        );
        
        if (hasData) {
          // Set all Google Analytics data including detailedGeographicData
          setGoogleAnalyticsData({
            users: gaResponse.data.users || 0,
            sessions: gaResponse.data.sessions || 0,
            pageViews: gaResponse.data.pageViews || 0,
            bounceRate: gaResponse.data.bounceRate || 0,
            avgSessionDuration: gaResponse.data.avgSessionDuration || 0,
            detailedGeographicData: gaResponse.data.detailedGeographicData || [] // Include detailed geographic data
          });
          
          // Set traffic sources from the response (REAL DATA)
          if (gaResponse.data.trafficSources && Array.isArray(gaResponse.data.trafficSources)) {
            setTrafficSources(gaResponse.data.trafficSources);
            console.log('✅ Traffic sources loaded (REAL DATA):', gaResponse.data.trafficSources.length);
          }
          
          // Set page insights from the response (REAL DATA - no mock values)
          if (gaResponse.data.topPages && Array.isArray(gaResponse.data.topPages)) {
            // Use real data from backend - it now includes uniqueUsers, bounceRate, avgTimeOnPage, conversions, conversionRate
            setPageInsights(gaResponse.data.topPages);
            console.log('✅ Page insights loaded (REAL DATA):', gaResponse.data.topPages.length);
          }
          
          // Set geographic data from the response (REAL DATA - includes country, users, sessions, bounceRate)
          if (gaResponse.data.geographicData && Array.isArray(gaResponse.data.geographicData)) {
            setGeographicData(gaResponse.data.geographicData);
            console.log('✅ Geographic data loaded (REAL DATA):', gaResponse.data.geographicData.length);
          }
          
          // Log detailed geographic data if available
          if (gaResponse.data.detailedGeographicData && Array.isArray(gaResponse.data.detailedGeographicData)) {
            console.log('✅ Detailed geographic data loaded (REAL DATA):', gaResponse.data.detailedGeographicData.length);
            console.log('📊 Sample region data:', gaResponse.data.detailedGeographicData[0]);
          } else {
            console.log('⚠️ No detailedGeographicData in response:', {
              hasDetailedData: !!gaResponse.data.detailedGeographicData,
              keys: Object.keys(gaResponse.data || {}),
              fullResponse: gaResponse.data
            });
          }
          
          if (!gaResponse.data.geographicData && !gaResponse.data.detailedGeographicData) {
            // Fallback: Try separate endpoint if not in main response
            const dateTo = new Date().toISOString().split('T')[0];
            const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            try {
              const geographicRes = await api.get(`/analytics/geographic/${userData.client_id}?dateFrom=${dateFrom}&dateTo=${dateTo}`).catch(() => ({ data: { data: [] } }));
              setGeographicData(geographicRes.data?.data || []);
              console.log('✅ Geographic data loaded from separate endpoint:', geographicRes.data?.data?.length || 0);
            } catch (err: any) {
              console.log('⚠️ Could not fetch geographic data:', err.message);
            }
          }
          
          console.log('✅ Google Analytics data loaded:', gaResponse.data);
          console.log('   → Users:', gaResponse.data.users);
          console.log('   → Sessions:', gaResponse.data.sessions);
          console.log('   → Page Views:', gaResponse.data.pageViews);
          console.log('   → Source:', gaResponse.data.source || 'unknown');
          console.log('   → Status will show: ✅ Connected');
        } else {
          console.log('⚠️ Google Analytics response received but no data available');
          console.log('   → Status will show: ⚪ Not Connected');
        }
      } catch (err: any) {
        // Check if error response has data
        if (err.response?.data && (
          err.response.data.pageViews > 0 ||
          err.response.data.sessions > 0 ||
          err.response.data.users > 0
        )) {
          setGoogleAnalyticsData({
            users: err.response.data.users || 0,
            sessions: err.response.data.sessions || 0,
            pageViews: err.response.data.pageViews || 0,
            bounceRate: err.response.data.bounceRate || 0,
            avgSessionDuration: err.response.data.avgSessionDuration || 0
          });
          console.log('✅ Google Analytics data loaded from error response:', err.response.data);
          console.log('   → Status will show: ✅ Connected');
        } else {
          console.log('⚠️ Google Analytics not available:', err.response?.data?.error || err.message);
          console.log('   → Status will show: ⚪ Not Connected');
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

            {googleAnalyticsData ? (
              <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginTop: '1.5rem'
              }}>
                {/* Users Card */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(46, 134, 171, 0.1)',
                  border: '1px solid rgba(46, 134, 171, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    marginBottom: '0.75rem',
                    color: '#2E86AB'
                  }}>👥</div>
                  <h3 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#666', 
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif'
                  }}>Total Users</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: '#2E86AB',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {googleAnalyticsData.users.toLocaleString()}
                  </p>
                </div>

                {/* Sessions Card */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(241, 143, 1, 0.1)',
                  border: '1px solid rgba(241, 143, 1, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    marginBottom: '0.75rem',
                    color: '#F18F01'
                  }}>🔄</div>
                  <h3 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#666', 
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif'
                  }}>Sessions</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: '#F18F01',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {googleAnalyticsData.sessions.toLocaleString()}
                  </p>
                </div>

                {/* Page Views Card */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(162, 59, 114, 0.1)',
                  border: '1px solid rgba(162, 59, 114, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    marginBottom: '0.75rem',
                    color: '#A23B72'
                  }}>📄</div>
                  <h3 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#666', 
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif'
                  }}>Page Views</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: '#A23B72',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {googleAnalyticsData.pageViews.toLocaleString()}
                  </p>
                </div>

                {/* Bounce Rate Card */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(241, 143, 1, 0.1)',
                  border: '1px solid rgba(241, 143, 1, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    marginBottom: '0.75rem',
                    color: googleAnalyticsData.bounceRate > 70 ? '#dc3545' : '#2E86AB'
                  }}>📊</div>
                  <h3 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#666', 
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif'
                  }}>Bounce Rate</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: googleAnalyticsData.bounceRate > 70 ? '#dc3545' : '#2E86AB',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {googleAnalyticsData.bounceRate.toFixed(1)}%
                  </p>
                </div>

                {/* Avg Session Duration Card */}
                <div style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(46, 134, 171, 0.1)',
                  border: '1px solid rgba(46, 134, 171, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    marginBottom: '0.75rem',
                    color: '#2E86AB'
                  }}>⏱️</div>
                  <h3 style={{ 
                    margin: '0 0 0.75rem 0', 
                    color: '#666', 
                    fontSize: '0.875rem',
                    fontWeight: '400',
                    fontFamily: 'Inter, sans-serif'
                  }}>Avg Session</h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: '#2E86AB',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    {Math.floor(googleAnalyticsData.avgSessionDuration / 60)}m {Math.round(googleAnalyticsData.avgSessionDuration % 60)}s
                  </p>
                </div>
              </div>

              {/* Page Performance Table */}
              {pageInsights.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(46, 134, 171, 0.1)',
                  marginTop: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(46, 134, 171, 0.1)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#2E86AB', 
                    fontSize: '1.25rem', 
                    fontWeight: '600',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    📄 Page Performance
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#2E86AB', color: 'white' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Page</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Page Views</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Unique Users</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Bounce Rate</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Avg Time</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Conversions</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Conv Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageInsights.slice(0, 10).map((page, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(46, 134, 171, 0.1)', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                            <td style={{ padding: '12px', fontWeight: '400', fontFamily: 'Inter, sans-serif' }}>{page.page}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                              {page.pageViews.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                              {(page.uniqueUsers || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: (page.bounceRate || 0) > 70 ? '#dc3545' : '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                              {(page.bounceRate || 0).toFixed(1)}%
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                              {Math.round(page.avgTimeOnPage || 0)}s
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#F18F01', fontFamily: 'Inter, sans-serif' }}>
                              {page.conversions || 0}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: (page.conversionRate || 0) > 2 ? '#2E86AB' : '#666', fontFamily: 'Inter, sans-serif' }}>
                              {(page.conversionRate || 0).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Traffic Sources Table */}
              {trafficSources.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(241, 143, 1, 0.1)',
                  marginTop: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(241, 143, 1, 0.1)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#F18F01', 
                    fontSize: '1.25rem', 
                    fontWeight: '600',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    🚦 Traffic Sources
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F18F01', color: 'white' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #c97200', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Source</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #c97200', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Sessions</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #c97200', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficSources
                          .slice(0, 15)
                          .map((source: any, index: number) => {
                            // Use percentage from backend if available, otherwise calculate it
                            const percentage = source.percentage !== undefined 
                              ? source.percentage 
                              : 0; // Backend now calculates this
                            // Use source name from backend (sessionSource)
                            const displaySource = source.source || 'Unknown';
                            return (
                              <tr key={index} style={{ borderBottom: '1px solid rgba(241, 143, 1, 0.1)', backgroundColor: index % 2 === 0 ? 'white' : '#fff8f0' }}>
                                <td style={{ padding: '12px', fontWeight: '400', fontFamily: 'Inter, sans-serif' }}>{displaySource}</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#F18F01', fontFamily: 'Inter, sans-serif' }}>
                                  {(source.sessions || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                  {percentage.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Geographic Distribution Table */}
              {geographicData.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(162, 59, 114, 0.1)',
                  marginTop: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(162, 59, 114, 0.1)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#A23B72', 
                    fontSize: '1.25rem', 
                    fontWeight: '600',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    🌍 Geographic Distribution
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#A23B72', color: 'white' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #7a2d56', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Country</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #7a2d56', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Users</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #7a2d56', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Sessions</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #7a2d56', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Bounce Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {geographicData
                          .filter((geo: any) => geo.country && geo.country !== 'Unknown')
                          .slice(0, 15)
                          .map((geo: any, index: number) => (
                            <tr key={index} style={{ borderBottom: '1px solid rgba(162, 59, 114, 0.1)', backgroundColor: index % 2 === 0 ? 'white' : '#faf5f8' }}>
                              <td style={{ padding: '12px', fontWeight: '400', fontFamily: 'Inter, sans-serif' }}>{geo.country || 'Unknown'}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#A23B72', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.users || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#A23B72', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.sessions || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: (geo.bounceRate || 0) > 70 ? '#dc3545' : '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.bounceRate || 0).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Region Performance Table - Detailed Region Data */}
              {googleAnalyticsData?.detailedGeographicData && googleAnalyticsData.detailedGeographicData.length > 0 && (
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(46, 134, 171, 0.1)',
                  marginTop: '2rem',
                  marginBottom: '2rem',
                  border: '1px solid rgba(46, 134, 171, 0.1)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    color: '#2E86AB', 
                    fontSize: '1.25rem', 
                    fontWeight: '600',
                    fontFamily: 'Inter, sans-serif'
                  }}>
                    📊 Region Performance
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#2E86AB', color: 'white' }}>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Region</th>
                          <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Country</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>New Users</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Active Users</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Engagement Rate</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Engaged Sessions</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Sessions/User</th>
                          <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #1a5f7a', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Avg Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {googleAnalyticsData.detailedGeographicData
                          .filter((geo: any) => geo.country && geo.country !== 'Unknown' && geo.country !== '(not set)')
                          .slice(0, 20)
                          .map((geo: any, index: number) => (
                            <tr key={index} style={{ borderBottom: '1px solid rgba(46, 134, 171, 0.1)', backgroundColor: index % 2 === 0 ? 'white' : '#f0f7fa' }}>
                              <td style={{ padding: '12px', fontWeight: '400', fontFamily: 'Inter, sans-serif' }}>{geo.region || 'Unknown'}</td>
                              <td style={{ padding: '12px', fontWeight: '400', fontFamily: 'Inter, sans-serif' }}>{geo.country || 'Unknown'}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.newUsers || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.activeUsers || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: (geo.engagementRate || 0) > 50 ? '#2E86AB' : '#dc3545', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.engagementRate || 0).toFixed(1)}%
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#F18F01', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.engagedSessions || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                {(geo.engagedSessionsPerUser || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#2E86AB', fontFamily: 'Inter, sans-serif' }}>
                                {Math.round(geo.averageEngagementTimePerSession || 0)}s
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
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
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  ✅ Connected
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
                      onClick={() => {
                        alert('📊 Sync Facebook Data\n\nTo sync your Facebook page data, please contact:\n\nEmail: info@wetechforu.com\n\nThey will sync your latest Facebook metrics including followers, reach, engagement, and post performance.');
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

                {/* Facebook Posts Table */}
                {facebookPosts.length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.5rem'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#2C5F77' }}>
                        📝 All Posts ({facebookPosts.length})
                      </h3>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '0.9rem'
                        }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>Post</th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-eye" style={{ marginRight: '0.5rem', color: '#667eea' }}></i>
                                Impressions
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-thumbs-up" style={{ marginRight: '0.5rem', color: '#f5576c' }}></i>
                                Reactions
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-comment" style={{ marginRight: '0.5rem', color: '#00f2fe' }}></i>
                                Comments
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-share" style={{ marginRight: '0.5rem', color: '#38f9d7' }}></i>
                                Shares
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-broadcast-tower" style={{ marginRight: '0.5rem', color: '#fee140' }}></i>
                                Reach
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-heart" style={{ marginRight: '0.5rem', color: '#e91e63' }}></i>
                                Engaged
                              </th>
                              <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {facebookPosts.map((post, index) => {
                              const totalReactions = (post.reactions_like || 0) + (post.reactions_love || 0) + 
                                                    (post.reactions_haha || 0) + (post.reactions_wow || 0) + 
                                                    (post.reactions_sad || 0) + (post.reactions_angry || 0);
                              
                              return (
                                <tr key={post.post_id} style={{
                                  borderBottom: '1px solid #e9ecef',
                                  transition: 'background-color 0.2s',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                >
                                  <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                    {post.permalink_url ? (
                                      <a
                                        href={post.permalink_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ 
                                          fontWeight: '500', 
                                          color: '#4267B2',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          lineHeight: '1.4',
                                          textDecoration: 'none',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.color = '#365899';
                                          e.currentTarget.style.textDecoration = 'underline';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.color = '#4267B2';
                                          e.currentTarget.style.textDecoration = 'none';
                                        }}
                                        title="Click to view post on Facebook"
                                      >
                                        <i className="fab fa-facebook-f" style={{ marginRight: '0.5rem', fontSize: '0.9rem' }}></i>
                                        {post.message || 'View Facebook Post'}
                                      </a>
                                    ) : (
                                      <div style={{ 
                                        fontWeight: '500', 
                                        color: '#2C5F77',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.4'
                                      }}>
                                        {post.message || 'No text'}
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#667eea' }}>
                                    {(post.post_impressions || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#f5576c' }}>
                                    {totalReactions.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#00f2fe' }}>
                                    {(post.comments || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#38f9d7' }}>
                                    {(post.shares || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#fee140' }}>
                                    {(post.post_reach || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#e91e63' }}>
                                    {(post.post_engaged_users || 0).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#6c757d', whiteSpace: 'nowrap' }}>
                                    {new Date(post.created_time).toLocaleDateString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
