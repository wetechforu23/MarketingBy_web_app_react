import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface PageInsights {
  page: string;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;
  avgTimeOnPage: number;
  exitRate: number;
  conversions: number;
  conversionRate: number;
}

interface GeographicData {
  country: string;
  city: string;
  users: number;
  sessions: number;
  bounceRate: number;
}

interface KeywordAnalysis {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  category: 'high-value' | 'medium-value' | 'low-value';
}

interface MonthlyComparison {
  month: string;
  pageViews: number;
  sessions: number;
  users: number;
  bounceRate: number;
  conversions: number;
  improvement: {
    pageViews: number;
    sessions: number;
    users: number;
    bounceRate: number;
    conversions: number;
  };
}

interface DeveloperInsights {
  topPerformingPages: PageInsights[];
  underperformingPages: PageInsights[];
  highBouncePages: PageInsights[];
  conversionOpportunities: PageInsights[];
  technicalIssues: {
    brokenLinks: any[];
    slowPages: PageInsights[];
    mobileIssues: PageInsights[];
  };
  recommendations: string[];
}

interface ClientReport {
  executiveSummary: {
    totalTraffic: number;
    growthRate: number;
    topPerformingContent: string;
    keyImprovements: string[];
  };
  monthlyComparison: MonthlyComparison[];
  geographicInsights: GeographicData[];
  keywordPerformance: KeywordAnalysis[];
  technicalHealth: {
    brokenLinks: number;
    pageSpeed: number;
    mobileOptimization: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface Client {
  id: number;
  name: string;
  email: string;
  status: string;
}

const ComprehensiveAnalyticsDashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'geographic' | 'keywords' | 'developer' | 'client-report'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [pageInsights, setPageInsights] = useState<PageInsights[]>([]);
  const [geographicData, setGeographicData] = useState<GeographicData[]>([]);
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison[]>([]);
  const [developerInsights, setDeveloperInsights] = useState<DeveloperInsights | null>(null);
  const [clientReport, setClientReport] = useState<ClientReport | null>(null);
  
  // Date range
  const [dateFrom, setDateFrom] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchAllAnalyticsData();
    }
  }, [selectedClient, dateFrom, dateTo]);

  const fetchClients = async () => {
    try {
      const response = await http.get('/admin/clients');
      setClients(response.data);
      if (response.data.length > 0) {
        setSelectedClient(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchAllAnalyticsData = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [pageInsightsRes, geographicRes, keywordsRes, monthlyRes, developerRes, clientReportRes] = await Promise.all([
        http.get(`/analytics/page-insights/${selectedClient.id}?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        http.get(`/analytics/geographic/${selectedClient.id}?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        http.get(`/analytics/keywords/${selectedClient.id}?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        http.get(`/analytics/monthly-comparison/${selectedClient.id}?months=6`),
        http.get(`/analytics/developer-insights/${selectedClient.id}?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        http.get(`/analytics/client-report/${selectedClient.id}?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      ]);

      setPageInsights(pageInsightsRes.data.data || []);
      setGeographicData(geographicRes.data.data || []);
      setKeywordAnalysis(keywordsRes.data.data || []);
      setMonthlyComparison(monthlyRes.data.data || []);
      setDeveloperInsights(developerRes.data.data || null);
      setClientReport(clientReportRes.data.data || null);
    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      setError(error.response?.data?.error || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'high-value': return '#28a745';
      case 'medium-value': return '#ffc107';
      case 'low-value': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getImprovementColor = (value: number) => {
    if (value > 0) return '#28a745';
    if (value < 0) return '#dc3545';
    return '#6c757d';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '2rem', fontWeight: 'bold' }}>Comprehensive Analytics Dashboard</h1>
          <p style={{ margin: '0', color: '#666' }}>Detailed insights for developers and clients</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Client:</label>
            <select 
              value={selectedClient?.id || ''} 
              onChange={(e) => {
                const client = clients.find(c => c.id === parseInt(e.target.value));
                setSelectedClient(client || null);
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px' }}>Date Range:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0', 
        marginBottom: '30px',
        borderBottom: '2px solid #e9ecef'
      }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'pages', label: '📄 Page Insights' },
          { key: 'geographic', label: '🌍 Geographic' },
          { key: 'keywords', label: '🔍 Keywords' },
          { key: 'developer', label: '👨‍💻 Developer' },
          { key: 'client-report', label: '📋 Client Report' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? '#007bff' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading comprehensive analytics data...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '15px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tab Content */}
      {!loading && !error && selectedClient && (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && clientReport && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Total Traffic</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                    {clientReport.executiveSummary.totalTraffic.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Growth Rate</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getImprovementColor(clientReport.executiveSummary.growthRate) }}>
                    {clientReport.executiveSummary.growthRate.toFixed(1)}%
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Top Content</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>
                    {clientReport.executiveSummary.topPerformingContent}
                  </div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Technical Health</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6f42c1' }}>
                    {clientReport.technicalHealth.pageSpeed}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Page Speed Score</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Key Improvements</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {clientReport.executiveSummary.keyImprovements.map((improvement, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{improvement}</li>
                    ))}
                  </ul>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Immediate Recommendations</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {clientReport.recommendations.immediate.map((rec, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Page Insights Tab */}
          {activeTab === 'pages' && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Page-Level Performance</h3>
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
                    {pageInsights.slice(0, 20).map((page, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{page.page}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {page.pageViews.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {page.uniqueUsers.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: page.bounceRate > 70 ? '#dc3545' : '#28a745' }}>
                          {page.bounceRate.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {Math.round(page.avgTimeOnPage)}s
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {page.conversions}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: page.conversionRate > 2 ? '#28a745' : '#dc3545' }}>
                          {page.conversionRate.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Geographic Tab */}
          {activeTab === 'geographic' && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Geographic Distribution</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Country</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>City</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Users</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Sessions</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Bounce Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geographicData.slice(0, 30).map((geo, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{geo.country}</td>
                        <td style={{ padding: '12px' }}>{geo.city}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {geo.users.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {geo.sessions.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: geo.bounceRate > 70 ? '#dc3545' : '#28a745' }}>
                          {geo.bounceRate.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Keyword Performance</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Keyword</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Impressions</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Clicks</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>CTR</th>
                      <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Position</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywordAnalysis.slice(0, 50).map((keyword, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{keyword.keyword}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {keyword.impressions.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {keyword.clicks.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {(keyword.ctr * 100).toFixed(2)}%
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                          {keyword.position.toFixed(1)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: getCategoryColor(keyword.category) + '20',
                            color: getCategoryColor(keyword.category)
                          }}>
                            {keyword.category.replace('-', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Developer Tab */}
          {activeTab === 'developer' && developerInsights && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Top Performing Pages</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {developerInsights.topPerformingPages.slice(0, 10).map((page, index) => (
                      <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{page.page}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {page.pageViews.toLocaleString()} views • {page.conversionRate.toFixed(2)}% conversion
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>High Bounce Pages</h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {developerInsights.highBouncePages.slice(0, 10).map((page, index) => (
                      <div key={index} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{page.page}</div>
                        <div style={{ fontSize: '12px', color: '#dc3545' }}>
                          {page.bounceRate.toFixed(1)}% bounce rate
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Developer Recommendations</h4>
                <ul style={{ margin: '0', paddingLeft: '20px' }}>
                  {developerInsights.recommendations.map((rec, index) => (
                    <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Client Report Tab */}
          {activeTab === 'client-report' && clientReport && (
            <div>
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Executive Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Total Traffic</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                      {clientReport.executiveSummary.totalTraffic.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Growth Rate</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getImprovementColor(clientReport.executiveSummary.growthRate) }}>
                      {clientReport.executiveSummary.growthRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Top Content</h4>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#28a745' }}>
                      {clientReport.executiveSummary.topPerformingContent}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Short-term Recommendations</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {clientReport.recommendations.shortTerm.map((rec, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Long-term Strategy</h4>
                  <ul style={{ margin: '0', paddingLeft: '20px' }}>
                    {clientReport.recommendations.longTerm.map((rec, index) => (
                      <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ComprehensiveAnalyticsDashboard;
