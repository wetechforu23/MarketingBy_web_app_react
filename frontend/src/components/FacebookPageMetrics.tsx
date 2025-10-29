import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface FacebookPageMetricsProps {
  clientId: number;
  refreshKey: number;
}

interface MetricData {
  name: string;
  title: string;
  description?: string;
  period: string;
  value: number;
  end_time?: string;
  error?: string;
}

const FacebookPageMetrics: React.FC<FacebookPageMetricsProps> = ({ clientId, refreshKey }) => {
  const [metrics, setMetrics] = useState<Record<string, MetricData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [clientId, refreshKey]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📊 Fetching Facebook Page metrics for client ${clientId}...`);
      const response = await http.get(`/facebook/core-page-metrics/${clientId}`);
      
      if (response.data.success) {
        setMetrics(response.data.metrics);
        console.log(`✅ Facebook Page metrics loaded:`, response.data.metrics);
      } else {
        setError(response.data.error || 'Failed to load metrics');
      }
    } catch (err: any) {
      console.error('❌ Error fetching Facebook Page metrics:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load metrics';
      console.error('❌ Final error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatMetricName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getMetricIcon = (metricName: string): string => {
    const iconMap: Record<string, string> = {
      page_impressions: '👁️',
      page_impressions_unique: '👥',
      page_views_total: '📄',
      page_posts_impressions: '📝',
      page_posts_impressions_unique: '✨',
      page_fans: '❤️',
      page_fan_adds: '➕',
      page_fan_removes: '➖'
    };
    return iconMap[metricName] || '📊';
  };

  const getMetricColor = (metricName: string): string => {
    const colorMap: Record<string, string> = {
      page_impressions: '#4267B2',
      page_impressions_unique: '#2E86AB',
      page_views_total: '#A23B72',
      page_posts_impressions: '#F18F01',
      page_posts_impressions_unique: '#28a745',
      page_fans: '#dc3545',
      page_fan_adds: '#28a745',
      page_fan_removes: '#ffc107'
    };
    return colorMap[metricName] || '#6c757d';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '25px',
        textAlign: 'center'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#4267B2' }}></i>
        <p style={{ marginTop: '15px', color: '#666' }}>Loading Facebook Page metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fff3cd',
        border: '2px solid #ffc107',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '25px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Error Loading Metrics</h4>
        <p style={{ margin: 0, color: '#856404' }}>{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const metricOrder = [
    'page_impressions',
    'page_impressions_unique',
    'page_views_total',
    'page_posts_impressions',
    'page_posts_impressions_unique',
    'page_fans',
    'page_fan_adds',
    'page_fan_removes'
  ];

  return (
    <div style={{ marginBottom: '25px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4267B2 0%, #2E86AB 100%)',
        padding: '20px 30px',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderBottom: 'none'
      }}>
        <h3 style={{
          margin: 0,
          color: 'white',
          fontSize: '24px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          📱 Facebook Page
        </h3>
        <p style={{
          margin: '5px 0 0 0',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '14px'
        }}>
          Core performance metrics from Facebook Graph API
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderTop: 'none'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}>
          {metricOrder.map((metricName) => {
            const metric = metrics[metricName];
            if (!metric) return null;

            const color = getMetricColor(metricName);
            const icon = getMetricIcon(metricName);

            return (
              <div
                key={metricName}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: `2px solid ${color}`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                {/* Icon & Title */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    fontSize: '28px',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {formatMetricName(metricName)}
                    </div>
                  </div>
                </div>

                {/* Value */}
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#2c3e50',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  {formatNumber(metric.value)}
                </div>

                {/* Period Badge */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '10px'
                }}>
                  <span style={{
                    backgroundColor: color,
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {metric.period}
                  </span>
                </div>

                {/* Description (if available) */}
                {metric.description && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#666',
                    lineHeight: '1.4'
                  }}>
                    {metric.description}
                  </div>
                )}

                {/* Error indicator */}
                {metric.error && (
                  <div style={{
                    marginTop: '10px',
                    padding: '6px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#856404'
                  }}>
                    ⚠️ {metric.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Last Updated */}
        {metrics.page_fans?.end_time && (
          <div style={{
            marginTop: '25px',
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#666'
          }}>
            📅 Last Updated: {new Date(metrics.page_fans.end_time).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookPageMetrics;

