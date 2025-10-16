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

interface SEODashboardProps {
  clientId: number;
  clientName: string;
}

const SEODashboard: React.FC<SEODashboardProps> = ({ clientId, clientName }) => {
  const [seoData, setSeoData] = useState<{
    seoScore: SEOScore;
    recommendations: SEORecommendation[];
    pageData: PageSEOData[];
    technicalSEO: TechnicalSEO;
    keywordAnalysis: any[];
    competitorAnalysis: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('2025-09-16');
  const [dateTo, setDateTo] = useState('2025-10-16');

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

  useEffect(() => {
    if (clientId) {
      fetchSEOData();
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
    </div>
  );
};

export default SEODashboard;
