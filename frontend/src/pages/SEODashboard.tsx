import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface SEOScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  mobile: number;
  accessibility: number;
}

interface SEORecommendation {
  category: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  priority: number;
}

interface PageSEOData {
  url: string;
  title: string;
  metaDescription: string;
  h1Count: number;
  h2Count: number;
  imageCount: number;
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
  loadTime: number;
  mobileFriendly: boolean;
  seoScore: number;
}

interface TechnicalSEO {
  sitemapExists: boolean;
  robotsTxtExists: boolean;
  httpsEnabled: boolean;
  mobileResponsive: boolean;
  pageSpeedScore: number;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
  };
}

interface SEOChecklistItem {
  id: string;
  name: string;
  category: 'title' | 'meta' | 'content' | 'technical' | 'performance' | 'schema' | 'links' | 'images';
  status: 'passed' | 'failed' | 'warning' | 'not_checked';
  current_value?: string | number;
  target_value?: string | number;
  score: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  page_specific: boolean;
}

interface PageSEOResult {
  page_url: string;
  page_title: string;
  overall_score: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  checklist: SEOChecklistItem[];
  last_audited: string;
}

interface ClientSEOChecklist {
  client_id: number;
  client_name: string;
  overall_score: number;
  total_pages: number;
  pages_audited: number;
  pages: PageSEOResult[];
  summary: {
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
    warning_checks: number;
    critical_issues: number;
    improvement_opportunities: number;
  };
  last_updated: string;
}

interface SEODashboardProps {
  clientId: number;
  clientName: string;
}

// Helper functions for colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'passed': return '#28a745';
    case 'failed': return '#dc3545';
    case 'warning': return '#ffc107';
    default: return '#6c757d';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#dc3545';
    case 'medium': return '#ffc107';
    case 'low': return '#28a745';
    default: return '#6c757d';
  }
};

const SEODashboard: React.FC<SEODashboardProps> = ({ clientId, clientName }) => {
  const [seoData, setSeoData] = useState<{
    seoScore: SEOScore;
    recommendations: SEORecommendation[];
    pageData: PageSEOData[];
    technicalSEO: TechnicalSEO;
    keywordAnalysis: any[];
    competitorAnalysis: any;
  } | null>(null);
  const [seoChecklist, setSeoChecklist] = useState<ClientSEOChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('2025-09-16');
  const [dateTo, setDateTo] = useState('2025-10-16');
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'technical' | 'recommendations' | 'checklist'>('overview');

  const fetchSEOData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get(`/seo/analysis/${clientId}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      setSeoData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch SEO data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSEOChecklist = async () => {
    try {
      const response = await http.get(`/seo/checklist/${clientId}`);
      setSeoChecklist(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch SEO checklist:', err);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchSEOData();
      fetchSEOChecklist();
    }
  }, [clientId, dateFrom, dateTo]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading SEO Analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#dc3545' }}>Error: {error}</div>
        <button 
          onClick={fetchSEOData}
          style={{ 
            marginTop: '10px', 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!seoData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>No SEO data available</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>SEO Analysis Dashboard</h1>
        <p style={{ margin: '0', color: '#666' }}>Comprehensive SEO analysis for {clientName}</p>
        
        {/* Date Range */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: '500' }}>Date Range:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <button 
            onClick={fetchSEOData}
            style={{ 
              padding: '5px 15px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '0', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        marginBottom: '30px',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6' }}>
          {[
            { key: 'overview', label: '📊 Overview', icon: '📊' },
            { key: 'pages', label: '📄 Pages', icon: '📄' },
            { key: 'technical', label: '⚙️ Technical', icon: '⚙️' },
            { key: 'recommendations', label: '💡 Recommendations', icon: '💡' },
            { key: 'checklist', label: '✅ SEO Checklist', icon: '✅' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '16px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.key ? '#007bff' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6c757d',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderBottom: activeTab === tab.key ? '3px solid #0056b3' : '3px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* SEO Score Overview */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '25px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>SEO Score Overview</h2>
        
        {/* Overall Score */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            color: getScoreColor(seoData.seoScore.overall),
            marginBottom: '10px'
          }}>
            {seoData.seoScore.overall}
          </div>
          <div style={{ fontSize: '18px', color: '#666' }}>Overall SEO Score</div>
        </div>

        {/* Category Scores */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Technical SEO', score: seoData.seoScore.technical },
            { label: 'Content Quality', score: seoData.seoScore.content },
            { label: 'Performance', score: seoData.seoScore.performance },
            { label: 'Mobile', score: seoData.seoScore.mobile },
            { label: 'Accessibility', score: seoData.seoScore.accessibility }
          ].map((category, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: getScoreColor(category.score),
                marginBottom: '5px'
              }}>
                {category.score}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>{category.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '25px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>SEO Recommendations</h2>
        
        {seoData.recommendations.map((rec, index) => (
          <div key={index} style={{ 
            padding: '15px', 
            border: '1px solid #dee2e6', 
            borderRadius: '8px', 
            marginBottom: '15px',
            borderLeft: `4px solid ${getImpactColor(rec.impact)}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ marginRight: '8px', fontSize: '18px' }}>{getCategoryIcon(rec.category)}</span>
              <h3 style={{ margin: '0', fontSize: '16px', color: '#333' }}>{rec.title}</h3>
              <span style={{ 
                marginLeft: 'auto', 
                padding: '2px 8px', 
                backgroundColor: getImpactColor(rec.impact),
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {rec.impact.toUpperCase()}
              </span>
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{rec.description}</p>
            <div style={{ marginTop: '8px', display: 'flex', gap: '10px', fontSize: '12px', color: '#888' }}>
              <span>Effort: {rec.effort}</span>
              <span>Priority: {rec.priority}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Technical SEO */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '25px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Technical SEO</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <div style={{ fontWeight: '500', marginBottom: '5px' }}>Page Speed Score</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: getScoreColor(seoData.technicalSEO.pageSpeedScore) }}>
              {seoData.technicalSEO.pageSpeedScore}
            </div>
          </div>
          
          <div style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <div style={{ fontWeight: '500', marginBottom: '5px' }}>HTTPS Enabled</div>
            <div style={{ fontSize: '18px', color: seoData.technicalSEO.httpsEnabled ? '#28a745' : '#dc3545' }}>
              {seoData.technicalSEO.httpsEnabled ? '✅ Yes' : '❌ No'}
            </div>
          </div>
          
          <div style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <div style={{ fontWeight: '500', marginBottom: '5px' }}>Mobile Responsive</div>
            <div style={{ fontSize: '18px', color: seoData.technicalSEO.mobileResponsive ? '#28a745' : '#dc3545' }}>
              {seoData.technicalSEO.mobileResponsive ? '✅ Yes' : '❌ No'}
            </div>
          </div>
          
          <div style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <div style={{ fontWeight: '500', marginBottom: '5px' }}>Sitemap</div>
            <div style={{ fontSize: '18px', color: seoData.technicalSEO.sitemapExists ? '#28a745' : '#dc3545' }}>
              {seoData.technicalSEO.sitemapExists ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Core Web Vitals</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>LCP</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{seoData.technicalSEO.coreWebVitals.lcp.toFixed(2)}s</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>FID</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{seoData.technicalSEO.coreWebVitals.fid.toFixed(0)}ms</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>CLS</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{seoData.technicalSEO.coreWebVitals.cls.toFixed(3)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Analysis */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '25px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
        marginBottom: '30px' 
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Page Analysis</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Page</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>SEO Score</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Word Count</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Load Time</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Images</th>
              </tr>
            </thead>
            <tbody>
              {seoData.pageData.map((page, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{page.url}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: getScoreColor(page.seoScore) }}>
                    {page.seoScore}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{page.wordCount.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{page.loadTime}s</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: page.mobileFriendly ? '#28a745' : '#dc3545' }}>
                    {page.mobileFriendly ? '✅' : '❌'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{page.imageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyword Analysis */}
      {seoData.keywordAnalysis.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Keyword Analysis</h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Keyword</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Impressions</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Clicks</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>CTR</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Position</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Opportunity</th>
                </tr>
              </thead>
              <tbody>
                {seoData.keywordAnalysis.slice(0, 10).map((keyword, index) => (
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
                        backgroundColor: keyword.opportunity === 'high' ? '#28a74520' : keyword.opportunity === 'medium' ? '#ffc10720' : '#dc354520',
                        color: keyword.opportunity === 'high' ? '#28a745' : keyword.opportunity === 'medium' ? '#ffc107' : '#dc3545'
                      }}>
                        {keyword.opportunity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* SEO Checklist Tab */}
      {activeTab === 'checklist' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>SEO Checklist</h2>
          
          {seoChecklist ? (
            <>
              {/* Real Data Notice */}
              <div style={{ 
                backgroundColor: '#fff3cd', 
                border: '1px solid #ffeaa7',
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
                  <strong style={{ color: '#856404' }}>Real Data Analysis Required</strong>
                </div>
                <p style={{ margin: '0', color: '#856404', fontSize: '14px' }}>
                  This SEO checklist shows the framework for analysis. To get real results, we need to implement actual page crawling and real-time analysis. 
                  Currently showing only pages found in Google Analytics and Search Console data.
                </p>
              </div>

              {/* Overall Summary */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '30px' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6c757d' }}>
                      {seoChecklist.overall_score}%
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Overall Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>
                      {seoChecklist.summary.passed_checks}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Passed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>
                      {seoChecklist.summary.failed_checks}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Failed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>
                      {seoChecklist.summary.warning_checks}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Warnings</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6c757d' }}>
                      {seoChecklist.summary.critical_issues}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>Critical Issues</div>
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Pages Analysis ({seoChecklist.pages.length} pages)</h3>
                
                {seoChecklist.pages.length === 0 ? (
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    textAlign: 'center',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '10px', color: '#6c757d' }}>
                      📊 No Real Pages Found
                    </div>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      No pages were found in Google Analytics or Search Console data for this client. 
                      This could mean the client hasn't connected their analytics accounts yet, or there's no traffic data available.
                    </p>
                  </div>
                ) : (
                  seoChecklist.pages.map((page, pageIndex) => (
                  <div key={pageIndex} style={{ 
                    border: '1px solid #dee2e6', 
                    borderRadius: '8px', 
                    marginBottom: '15px',
                    overflow: 'hidden'
                  }}>
                    {/* Page Header */}
                    <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '15px 20px', 
                      borderBottom: '1px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                          {page.page_title}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '2px' }}>
                          {page.page_url}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: getScoreColor(page.overall_score) 
                        }}>
                          {page.overall_score}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {page.passed_checks}/{page.total_checks} passed
                        </div>
                      </div>
                    </div>

                    {/* Checklist Items */}
                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {page.checklist.map((item, itemIndex) => (
                          <div key={itemIndex} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px', 
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            border: `1px solid ${getStatusColor(item.status)}`
                          }}>
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '50%', 
                              backgroundColor: getStatusColor(item.status),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px',
                              flexShrink: 0
                            }}>
                              {item.status === 'passed' ? '✓' : item.status === 'failed' ? '✗' : '⚠'}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: '600', 
                                fontSize: '14px', 
                                color: '#333',
                                marginBottom: '4px'
                              }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                {item.current_value && (
                                  <span>Current: <strong>{item.current_value}</strong></span>
                                )}
                                {item.current_value && item.target_value && <span> • </span>}
                                {item.target_value && (
                                  <span>Target: <strong>{item.target_value}</strong></span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {item.recommendation}
                              </div>
                            </div>

                            <div style={{ 
                              marginLeft: '12px', 
                              textAlign: 'right',
                              flexShrink: 0
                            }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: '600', 
                                color: getScoreColor(item.score),
                                marginBottom: '2px'
                              }}>
                                {item.score}%
                              </div>
                              <div style={{ 
                                fontSize: '10px', 
                                padding: '2px 6px', 
                                borderRadius: '10px',
                                backgroundColor: getPriorityColor(item.priority),
                                color: 'white'
                              }}>
                                {item.priority}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )))
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading SEO Checklist...</div>
              <div style={{ fontSize: '14px' }}>Analyzing your website's SEO performance</div>
            </div>
          )}
        </div>
      )}

      {/* Other tabs content would go here */}
      {activeTab === 'pages' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Page Analysis</h2>
          <p style={{ color: '#666' }}>Detailed page-by-page SEO analysis will be displayed here.</p>
        </div>
      )}

      {activeTab === 'technical' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Technical SEO</h2>
          <p style={{ color: '#666' }}>Technical SEO analysis will be displayed here.</p>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '25px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
          marginBottom: '30px' 
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>SEO Recommendations</h2>
          <p style={{ color: '#666' }}>SEO recommendations will be displayed here.</p>
        </div>
      )}
    </div>
  );
};

export default SEODashboard;
