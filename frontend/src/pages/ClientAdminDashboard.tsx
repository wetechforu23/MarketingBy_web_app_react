import React, { useEffect, useState } from 'react';
import { api } from '../api/http';

interface ClientOverview {
  seoScore: number;
  leadsThisMonth: number;
  websiteTraffic: number;
  trafficGrowth: number;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
  startDate: string;
  endDate?: string;
}

interface Report {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  downloadUrl: string;
}

const ClientAdminDashboard: React.FC = () => {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch client overview data
        const overviewResponse = await api.get('/client-dashboard/overview');
        setOverview(overviewResponse.data);

        // Fetch client campaigns
        const campaignsResponse = await api.get('/client-dashboard/campaigns');
        setCampaigns(campaignsResponse.data);

        // Mock reports data (replace with actual API call)
        setReports([
          {
            id: '1',
            name: 'SEO Performance Report - October 2025',
            type: 'seo',
            generatedAt: '2025-10-07T10:00:00Z',
            downloadUrl: '/api/reports/download/1'
          },
          {
            id: '2',
            name: 'Campaign Analytics - Q3 2025',
            type: 'analytics',
            generatedAt: '2025-10-01T09:00:00Z',
            downloadUrl: '/api/reports/download/2'
          }
        ]);

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
        
        // Fallback data for development
        setOverview({
          seoScore: 85,
          leadsThisMonth: 23,
          websiteTraffic: 1247,
          trafficGrowth: 12
        });
        
        setCampaigns([
          {
            id: '1',
            name: 'Google Ads - Primary Care',
            type: 'google_ads',
            status: 'active',
            budget: 2400,
            startDate: '2025-09-01',
            endDate: '2025-12-31'
          },
          {
            id: '2',
            name: 'SEO Optimization - Cardiology',
            type: 'seo',
            status: 'in_progress',
            budget: 1500,
            startDate: '2025-10-01'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleReportAction = (action: string, reportId: string) => {
    console.log(`Report action: ${action} for report ${reportId}`);
    switch (action) {
      case 'download':
        window.open(`/api/reports/download/${reportId}`, '_blank');
        break;
      case 'view':
        window.location.href = `/app/reports/${reportId}`;
        break;
    }
  };

  const handleCampaignAction = (action: string, campaignId: string) => {
    console.log(`Campaign action: ${action} for campaign ${campaignId}`);
    switch (action) {
      case 'view':
        window.location.href = `/app/campaigns/${campaignId}`;
        break;
      case 'edit':
        window.location.href = `/app/campaigns/${campaignId}/edit`;
        break;
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
    <div className="client-admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🏥 Welcome to Your Marketing Dashboard</h1>
        <p className="text-muted">Manage your healthcare marketing campaigns and track performance</p>
      </div>

      {/* Performance Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-search"></i>
          </div>
          <div className="stat-value">{overview?.seoScore || 0}/100</div>
          <div className="stat-label">SEO Score</div>
          <div className="stat-change text-success">
            <i className="fas fa-arrow-up"></i> +5
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-bullseye"></i>
          </div>
          <div className="stat-value">{overview?.leadsThisMonth || 0}</div>
          <div className="stat-label">Leads This Month</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="stat-value">{overview?.websiteTraffic?.toLocaleString() || '0'}</div>
          <div className="stat-label">Website Traffic</div>
          <div className="stat-change text-success">
            <i className="fas fa-arrow-up"></i> +{overview?.trafficGrowth || 0}%
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Active Campaigns */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎯 Active Campaigns</h3>
          </div>
          <div className="campaigns-list">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="campaign-item">
                <div className="campaign-info">
                  <div className="campaign-name">{campaign.name}</div>
                  <div className="campaign-details">
                    <span className="campaign-type">{campaign.type.replace('_', ' ').toUpperCase()}</span>
                    <span className="campaign-budget">${campaign.budget.toLocaleString()}/month</span>
                    <span className={`campaign-status status-${campaign.status}`}>
                      {campaign.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="campaign-actions">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => handleCampaignAction('view', campaign.id)}
                  >
                    View
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleCampaignAction('edit', campaign.id)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 Recent Reports</h3>
          </div>
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report.id} className="report-item">
                <div className="report-info">
                  <div className="report-name">{report.name}</div>
                  <div className="report-date text-muted">
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="report-actions">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => handleReportAction('view', report.id)}
                  >
                    View
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleReportAction('download', report.id)}
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ Quick Actions</h3>
        </div>
        <div className="quick-actions-grid">
          <button className="btn btn-primary">
            <i className="fas fa-download"></i>
            Download SEO Report
          </button>
          <button className="btn btn-secondary">
            <i className="fas fa-chart-line"></i>
            View Analytics
          </button>
          <button className="btn btn-outline">
            <i className="fas fa-bullhorn"></i>
            Campaign Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientAdminDashboard;

