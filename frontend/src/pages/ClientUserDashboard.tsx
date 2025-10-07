import React, { useEffect, useState } from 'react';
import { api } from '../api/http';

interface UserOverview {
  seoScore: number;
  newLeadsThisWeek: number;
  websiteVisitors: number;
  seoScoreStatus: 'excellent' | 'good' | 'needs_improvement';
}

interface RecentActivity {
  id: string;
  type: 'seo_report' | 'new_inquiry' | 'traffic_increase';
  message: string;
  timestamp: string;
  department?: string;
}

interface AvailableReport {
  id: string;
  name: string;
  type: 'seo' | 'analytics' | 'leads';
  description: string;
  lastUpdated: string;
  viewUrl: string;
  downloadUrl: string;
}

const ClientUserDashboard: React.FC = () => {
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [availableReports, setAvailableReports] = useState<AvailableReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch user overview data (limited access)
        const overviewResponse = await api.get('/client-dashboard/overview?view_only=true');
        setOverview(overviewResponse.data);

        // Mock recent activity data
        setRecentActivity([
          {
            id: '1',
            type: 'seo_report',
            message: 'SEO report generated for Cardiology department',
            timestamp: '2025-10-07T09:30:00Z',
            department: 'Cardiology'
          },
          {
            id: '2',
            type: 'new_inquiry',
            message: '3 new patient inquiries received',
            timestamp: '2025-10-07T08:15:00Z'
          },
          {
            id: '3',
            type: 'traffic_increase',
            message: 'Website traffic increased by 12%',
            timestamp: '2025-10-06T16:45:00Z'
          }
        ]);

        // Mock available reports
        setAvailableReports([
          {
            id: '1',
            name: 'SEO Performance Report',
            type: 'seo',
            description: 'Comprehensive SEO analysis and recommendations',
            lastUpdated: '2025-10-07T09:30:00Z',
            viewUrl: '/app/reports/seo/1',
            downloadUrl: '/api/reports/download/seo/1'
          },
          {
            id: '2',
            name: 'Website Analytics',
            type: 'analytics',
            description: 'Traffic, engagement, and conversion metrics',
            lastUpdated: '2025-10-07T08:00:00Z',
            viewUrl: '/app/reports/analytics/2',
            downloadUrl: '/api/reports/download/analytics/2'
          },
          {
            id: '3',
            name: 'Lead Generation Report',
            type: 'leads',
            description: 'New leads and inquiry analysis',
            lastUpdated: '2025-10-07T07:30:00Z',
            viewUrl: '/app/reports/leads/3',
            downloadUrl: '/api/reports/download/leads/3'
          }
        ]);

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
        
        // Fallback data for development
        setOverview({
          seoScore: 85,
          newLeadsThisWeek: 5,
          websiteVisitors: 1247,
          seoScoreStatus: 'good'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleReportAction = (action: string, report: AvailableReport) => {
    console.log(`Report action: ${action} for report ${report.id}`);
    switch (action) {
      case 'view':
        window.location.href = report.viewUrl;
        break;
      case 'download':
        window.open(report.downloadUrl, '_blank');
        break;
    }
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  const getSeoScoreLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'needs_improvement': return 'Needs Improvement';
      default: return 'Good';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="client-user-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>👋 Welcome back, [User Name]!</h1>
        <p className="text-muted">View your marketing performance and access reports</p>
      </div>

      {/* Performance Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-search"></i>
          </div>
          <div className={`stat-value ${getSeoScoreColor(overview?.seoScore || 0)}`}>
            {overview?.seoScore || 0}/100
          </div>
          <div className="stat-label">SEO Score</div>
          <div className="stat-status">
            {getSeoScoreLabel(overview?.seoScoreStatus || 'good')}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-bullseye"></i>
          </div>
          <div className="stat-value">{overview?.newLeadsThisWeek || 0}</div>
          <div className="stat-label">New Leads This Week</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-value">{overview?.websiteVisitors?.toLocaleString() || '0'}</div>
          <div className="stat-label">Website Visitors</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Recent Activity</h3>
          </div>
          <div className="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {activity.type === 'seo_report' && <i className="fas fa-file-alt text-primary"></i>}
                  {activity.type === 'new_inquiry' && <i className="fas fa-envelope text-success"></i>}
                  {activity.type === 'traffic_increase' && <i className="fas fa-chart-line text-accent"></i>}
                </div>
                <div className="activity-content">
                  <div className="activity-message">{activity.message}</div>
                  <div className="activity-time text-muted">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Quick Stats</h3>
          </div>
          <div className="quick-stats">
            <div className="quick-stat-item">
              <div className="quick-stat-value text-primary">85%</div>
              <div className="quick-stat-label">SEO Performance</div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-value text-success">+12%</div>
              <div className="quick-stat-label">Traffic Growth</div>
            </div>
            <div className="quick-stat-item">
              <div className="quick-stat-value text-accent">23</div>
              <div className="quick-stat-label">Total Leads</div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📄 Available Reports</h3>
        </div>
        <div className="reports-grid">
          {availableReports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div className="report-icon">
                  {report.type === 'seo' && <i className="fas fa-search text-primary"></i>}
                  {report.type === 'analytics' && <i className="fas fa-chart-line text-accent"></i>}
                  {report.type === 'leads' && <i className="fas fa-bullseye text-success"></i>}
                </div>
                <div className="report-title">{report.name}</div>
              </div>
              <div className="report-description">{report.description}</div>
              <div className="report-meta text-muted">
                Last updated: {new Date(report.lastUpdated).toLocaleDateString()}
              </div>
              <div className="report-actions">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => handleReportAction('view', report)}
                >
                  <i className="fas fa-eye"></i> View
                </button>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleReportAction('download', report)}
                >
                  <i className="fas fa-download"></i> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientUserDashboard;

