import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface DashboardData {
  client: {
    id: number;
    name: string;
    email: string;
    phone: string;
    website: string;
    industry: string;
    location: string;
    isActive: boolean;
    memberSince: string;
  };
  metrics: {
    leads: {
      total: number;
      thisMonth: number;
      thisWeek: number;
      converted: number;
      conversionRate: string;
    };
    seo: {
      score: number;
      performance: number;
      accessibility: number;
      bestPractices: number;
      lastAudit: string;
    } | null;
    analytics: {
      pageViews: number;
      sessions: number;
      bounceRate: number;
      users: number;
    };
    facebook: {
      followers: number;
      impressions: number;
      engagement: number;
    };
    content: {
      total: number;
      published: number;
      thisMonth: number;
    };
    blogs: {
      total: number;
    };
  };
  connectedServices: {
    googleAnalytics: boolean;
    facebook: boolean;
    searchConsole: boolean;
    googleTag: boolean;
  };
  recentReports: Array<{
    id: number;
    report_name: string;
    report_type: string;
    created_at: string;
  }>;
}

const ClientDashboardNew: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 [FRONTEND] Fetching REAL dashboard data...');
      console.log('🌐 [FRONTEND] API Endpoint: /client-dashboard/overview');
      console.log('🍪 [FRONTEND] Cookies:', document.cookie);
      
      const response = await http.get('/client-dashboard/overview');
      console.log('✅ [FRONTEND] Dashboard data received successfully!');
      console.log('📦 [FRONTEND] Response data:', response.data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      setData(response.data);
    } catch (err: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [FRONTEND] Error fetching dashboard data');
      console.error('📛 [FRONTEND] Error details:', err.response?.data);
      console.error('📛 [FRONTEND] Status code:', err.response?.status);
      console.error('📛 [FRONTEND] Full error:', err);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const errorMessage = err.response?.data?.error || 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2E86AB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#666', fontSize: '1.1rem' }}>Loading your dashboard...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        backgroundColor: '#fee',
        border: '2px solid #c33',
        borderRadius: '12px',
        margin: '2rem'
      }}>
        <h3 style={{ color: '#c33', marginBottom: '0.5rem' }}>
          <i className="fas fa-exclamation-triangle"></i> Error Loading Dashboard
        </h3>
        <p style={{ color: '#666' }}>{error}</p>
        <button 
          onClick={fetchDashboardData}
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
          <i className="fas fa-refresh"></i> Retry
        </button>
      </div>
    );
  }

  if (!data || !data.client) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ 
          padding: '2rem', 
          backgroundColor: '#fff3cd', 
          border: '2px solid #ffc107',
          borderRadius: '12px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h3 style={{ color: '#856404' }}>⚠️ Dashboard Data Not Available</h3>
          <p style={{ color: '#666' }}>
            We couldn't load your dashboard data. This might be because:
          </p>
          <ul style={{ textAlign: 'left', color: '#666', lineHeight: '1.8' }}>
            <li>Your client account is not fully set up</li>
            <li>There's a connection issue with the database</li>
            <li>Your session has expired</li>
          </ul>
          <button 
            onClick={() => window.location.reload()}
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
          <br />
          <button 
            onClick={() => window.location.href = '/app/profile'}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: '#f5f7fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2E86AB 0%, #5F9EA0 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
              👋 Welcome back!
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>
              {data.client.name}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 0.25rem 0', opacity: 0.8, fontSize: '0.9rem' }}>
              Member since
            </p>
            <p style={{ margin: 0, fontWeight: '600' }}>
              {new Date(data.client.memberSince).toLocaleDateString()}
            </p>
          </div>
        </div>
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
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F18F01 0%, #FFA500 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem'
            }}>
              <i className="fas fa-bullseye" style={{ color: 'white', fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>
                Total Leads
              </h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                {data.metrics.leads.total}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#666' }}>This Month: </span>
              <strong style={{ color: '#2E86AB' }}>{data.metrics.leads.thisMonth}</strong>
            </div>
            <div>
              <span style={{ color: '#666' }}>Converted: </span>
              <strong style={{ color: '#28a745' }}>{data.metrics.leads.converted}</strong>
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
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2E86AB 0%, #5F9EA0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem'
            }}>
              <i className="fas fa-search" style={{ color: 'white', fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>
                SEO Score
              </h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                {data.metrics.seo?.score || 'N/A'}/100
              </p>
            </div>
          </div>
          {data.metrics.seo ? (
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              Last audit: {new Date(data.metrics.seo.lastAudit).toLocaleDateString()}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic' }}>
              No SEO audit data available
            </div>
          )}
        </div>

        {/* Website Traffic Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #A23B72 0%, #C84A82 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem'
            }}>
              <i className="fas fa-chart-line" style={{ color: 'white', fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>
                Website Visitors
              </h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                {data.metrics.analytics.users.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#666' }}>Page Views: </span>
            <strong style={{ color: '#2E86AB' }}>{data.metrics.analytics.pageViews.toLocaleString()}</strong>
          </div>
        </div>

        {/* Facebook Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1877F2 0%, #4267B2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '1rem'
            }}>
              <i className="fab fa-facebook-f" style={{ color: 'white', fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>
                Facebook Followers
              </h3>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#2C5F77' }}>
                {data.metrics.facebook.followers.toLocaleString()}
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            <span style={{ color: '#666' }}>Engagement: </span>
            <strong style={{ color: '#2E86AB' }}>{data.metrics.facebook.engagement.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Company Profile */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#2C5F77',
            borderBottom: '2px solid #2E86AB',
            paddingBottom: '0.75rem'
          }}>
            <i className="fas fa-building"></i> Company Profile
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                Business Name
              </label>
              <p style={{ margin: 0, fontSize: '1rem', color: '#2C5F77', fontWeight: '500' }}>
                {data.client.name}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                Industry
              </label>
              <p style={{ margin: 0, fontSize: '1rem', color: '#2C5F77', fontWeight: '500' }}>
                {data.client.industry || 'Not specified'}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                Email
              </label>
              <p style={{ margin: 0, fontSize: '1rem', color: '#2E86AB', fontWeight: '500' }}>
                {data.client.email}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                Phone
              </label>
              <p style={{ margin: 0, fontSize: '1rem', color: '#2C5F77', fontWeight: '500' }}>
                {data.client.phone || 'Not specified'}
              </p>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: '600' }}>
                Website
              </label>
              <a 
                href={data.client.website} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2E86AB', 
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '1rem'
                }}
              >
                {data.client.website || 'Not specified'} <i className="fas fa-external-link-alt" style={{ fontSize: '0.75rem' }}></i>
              </a>
            </div>
          </div>
        </div>

        {/* Connected Services */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e9ecef'
        }}>
          <h2 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#2C5F77',
            borderBottom: '2px solid #2E86AB',
            paddingBottom: '0.75rem'
          }}>
            <i className="fas fa-plug"></i> Services
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Google Analytics', key: 'googleAnalytics', icon: 'fa-chart-bar' },
              { name: 'Facebook', key: 'facebook', icon: 'fa-facebook-f' },
              { name: 'Search Console', key: 'searchConsole', icon: 'fa-search' },
              { name: 'Google Tag', key: 'googleTag', icon: 'fa-tag' }
            ].map((service) => {
              const isConnected = data.connectedServices[service.key as keyof typeof data.connectedServices];
              return (
                <div key={service.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: isConnected ? '#e8f5e9' : '#fef5e7',
                  borderRadius: '8px',
                  border: `1px solid ${isConnected ? '#a5d6a7' : '#fad7a0'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <i className={`fas ${service.icon}`} style={{ 
                      color: isConnected ? '#28a745' : '#f39c12',
                      width: '20px',
                      textAlign: 'center'
                    }}></i>
                    <span style={{ fontWeight: '500', color: '#2C5F77' }}>
                      {service.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: isConnected ? '#28a745' : '#f39c12',
                    backgroundColor: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px'
                  }}>
                    {isConnected ? '✓ Connected' : '○ Not Connected'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#2C5F77',
          borderBottom: '2px solid #2E86AB',
          paddingBottom: '0.75rem'
        }}>
          <i className="fas fa-file-alt"></i> Recent Reports
        </h2>
        
        {data.recentReports.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.recentReports.map((report) => (
              <div key={report.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: '#2C5F77', fontWeight: '600' }}>
                    {report.report_name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                    {report.report_type} • {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2E86AB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}>
                  <i className="fas fa-download"></i> Download
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#999',
            fontStyle: 'italic'
          }}>
            <i className="fas fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
            No reports available yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDashboardNew;

