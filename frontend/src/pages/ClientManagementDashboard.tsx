import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import SEODashboard from './SEODashboard';
import LeadHeatmap from '../components/LeadHeatmap';

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
    users?: number;
    newUsers?: number;
    avgSessionDuration?: number;
    topPages?: any[];
    trafficSources?: any[];
    connected?: boolean;
    status?: string;
  };
  facebook: {
    pageViews: number;
    followers: number;
    engagement: number;
    connected?: boolean;
    status?: string;
  };
  leads: {
    total: number;
    thisMonth: number;
    conversion: number;
    connected?: boolean;
    status?: string;
  };
  posts: {
    total: number;
    thisMonth: number;
    engagement: number;
  };
  content?: {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'social-media' | 'lead-tracking' | 'seo' | 'reports' | 'local-search' | 'settings'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analyticsReportData, setAnalyticsReportData] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [geocodingStatus, setGeocodingStatus] = useState<any>(null);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(50);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pageInsights, setPageInsights] = useState<any[]>([]);
  const [geographicData, setGeographicData] = useState<any[]>([]);
  const [keywordAnalysis, setKeywordAnalysis] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessageText, setSuccessMessageText] = useState<string>('');
  const [syncDateFrom, setSyncDateFrom] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [syncDateTo, setSyncDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportDateFrom, setReportDateFrom] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [reportDateTo, setReportDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLocalSearchModal, setShowLocalSearchModal] = useState(false);
  const [localSearchLoading, setLocalSearchLoading] = useState(false);
  const [localSearchQueries, setLocalSearchQueries] = useState<string>('');
  const [localSearchRadius, setLocalSearchRadius] = useState<number>(10000);
  const [analyticsReports, setAnalyticsReports] = useState<any[]>([]);

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

  // Fetch date range for GA leads
  const fetchLeadDateRange = async (clientId: number) => {
    try {
      const response = await http.get(`/analytics/leads/${clientId}/date-range`);
      if (response.data.success && response.data.earliest_date) {
        const earliestDate = new Date(response.data.earliest_date).toISOString().split('T')[0];
        setStartDate(earliestDate);
        console.log(`📅 Set startDate to earliest lead date: ${earliestDate}`);
      } else {
        // No leads yet, default to 30 days ago
        const defaultStart = new Date();
        defaultStart.setDate(defaultStart.getDate() - 30);
        setStartDate(defaultStart.toISOString().split('T')[0]);
        console.log(`📅 No leads found, set startDate to 30 days ago`);
      }
    } catch (error) {
      console.error('Error fetching lead date range:', error);
      // Fallback to 30 days ago
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      setStartDate(defaultStart.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    console.log('🔄 Client changed, selectedClient:', selectedClient);
    if (selectedClient) {
      console.log('📊 Fetching data for client:', selectedClient.id, selectedClient.name);
      fetchClientData(selectedClient.id);
      // Check geocoding status for the selected client
      checkGeocodingStatus();
      // Auto-capture leads when switching clinics
      autoCaptureLeadsForClient(selectedClient.id);
      // Fetch lead date range to set the min date filter
      fetchLeadDateRange(selectedClient.id);
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
      } catch (realError: any) {
        console.log('⚠️ Real Search Console not available:', realError);
        
        // Check if it's a permission error and show helpful message
        if (realError.response?.status === 500 && realError.response?.data?.error?.includes('permission denied')) {
          console.log('❌ Search Console permission issue detected');
          console.log('💡 To fix: Verify the site in Google Search Console and ensure OAuth account has access');
          // You could show a toast notification here if you have a toast system
        }
      }

      // Fetch Google Analytics leads data for this client (ONLY GOOGLE ANALYTICS LEADS)
      try {
        console.log(`🔍 Fetching Google Analytics leads data for client ${clientId}`);
        const leadsResponse = await http.get(`/analytics/leads/${clientId}`);
        console.log('📊 Raw leads response:', leadsResponse);
        console.log('📊 Response data:', leadsResponse.data);
        
        const leads = leadsResponse.data.leads || [];
        console.log('📊 Processed leads array:', leads);
        console.log('📊 Leads count:', leads.length);
        
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
        
        console.log('✅ Google Analytics leads data loaded:', analyticsData.leads);
      } catch (leadsError) {
        console.error('❌ Google Analytics leads data error:', leadsError);
        console.log('⚠️ Google Analytics leads data not available - showing 0 values');
        analyticsData.leads = {
          total: 0,
          thisMonth: 0,
          conversion: 0,
          connected: false,
          status: 'Not Connected'
        };
      }

      // Fetch real Facebook data
      const facebookConnected = settingsResponse.data?.facebook?.connected;
      if (facebookConnected) {
        try {
          console.log('📘 Fetching real Facebook insights...');
          const facebookResponse = await http.get(`/facebook/insights/${clientId}`);
          if (facebookResponse.data.success && facebookResponse.data.connected) {
            const fbData = facebookResponse.data.data;
            analyticsData.facebook = {
              pageViews: fbData.page_views || 0,
              followers: fbData.followers || 0,
              engagement: parseFloat(fbData.engagement_rate) || 0,
              page_likes: fbData.page_likes || 0,
              impressions: fbData.impressions || 0,
              post_engagements: fbData.post_engagements || 0,
              connected: true,
              status: 'Connected'
            };
            console.log('✅ Real Facebook data loaded:', analyticsData.facebook);
          } else {
            analyticsData.facebook.connected = false;
            analyticsData.facebook.status = 'Not Connected';
            console.log('⚠️ Facebook connected but failed to fetch data');
          }
        } catch (error) {
          console.error('Error fetching Facebook data:', error);
          analyticsData.facebook.connected = false;
          analyticsData.facebook.status = 'Error';
          console.log('⚠️ Facebook API error - showing 0 values');
        }
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

  // Auto-capture leads when switching clinics
  const autoCaptureLeadsForClient = async (clientId: number) => {
    try {
      console.log(`🎯 Auto-capturing leads for client ${clientId}`);
      
      // Capture leads from Google Analytics with current radius
      const captureResponse = await http.post(`/analytics/capture-leads/${clientId}`, {
        radiusMiles: heatmapRadius
      });
      
      if (captureResponse.data.success && captureResponse.data.leads_captured > 0) {
        console.log(`✅ Auto-captured ${captureResponse.data.leads_captured} leads for client ${clientId}`);
        
        // Geocode the new leads
        const geocodeResponse = await http.post('/geocoding/batch');
        
        if (geocodeResponse.data.success) {
          console.log(`✅ Auto-geocoded leads for client ${clientId}`);
        }
      }
    } catch (error: any) {
      console.error(`Auto-capture error for client ${clientId}:`, error);
      // Don't show error to user for auto-capture, just log it
    }
  };

  // Sync Latest Data function - combines capture and geocoding
  const syncLatestData = async () => {
    if (!selectedClient) return;
    
    try {
      setRefreshing(true);
      console.log(`🔄 Syncing latest data for client ${selectedClient.id}`);
      
      // Step 1: Capture leads from Google Analytics
      const captureResponse = await http.post(`/analytics/capture-leads/${selectedClient.id}`, {
        radiusMiles: heatmapRadius
      });
      
      if (captureResponse.data.success) {
        console.log(`✅ Captured ${captureResponse.data.leads_captured} leads`);
        
        // Step 2: Geocode the leads
        const geocodeResponse = await http.post('/geocoding/batch');
        
        if (geocodeResponse.data.success) {
          console.log(`✅ Geocoded leads successfully`);
          
          // Step 3: Refresh all data
          await fetchClientData(selectedClient.id);
          checkGeocodingStatus();
          
          // Step 4: Refresh the date range to include newly captured leads
          await fetchLeadDateRange(selectedClient.id);
          
          setSuccessMessage(`✅ Synced successfully! Captured ${captureResponse.data.leads_captured} leads and geocoded them.`);
        } else {
          setError('Failed to geocode leads');
        }
      } else {
        setError(captureResponse.data.message || 'Failed to capture leads from Google Analytics');
      }
    } catch (error: any) {
      console.error('Sync data error:', error);
      setError(error.response?.data?.message || 'Failed to sync latest data');
    } finally {
      setRefreshing(false);
    }
  };

  // Google Analytics Lead Capture function (kept for backward compatibility)
  const captureGoogleAnalyticsLeads = async () => {
    if (!selectedClient) return;
    
    try {
      setRefreshing(true);
      console.log(`🎯 Capturing leads from Google Analytics for client ${selectedClient.id}`);
      
      const response = await http.post(`/analytics/capture-leads/${selectedClient.id}`, {
        radiusMiles: heatmapRadius
      });
      
      if (response.data.success) {
        setSuccessMessage(`✅ ${response.data.message}`);
        // Refresh the client data to show new leads
        await fetchClientData(selectedClient.id);
        // Refresh geocoding status
        checkGeocodingStatus();
      } else {
        setError(response.data.message || 'Failed to capture leads from Google Analytics');
      }
    } catch (error: any) {
      console.error('Google Analytics lead capture error:', error);
      setError(error.response?.data?.message || 'Failed to capture leads from Google Analytics');
    } finally {
      setRefreshing(false);
    }
  };

  // Geocoding functions
  const geocodeLeads = async () => {
    if (!selectedClient) return;
    
    try {
      setRefreshing(true);
      const response = await http.post('/geocoding/batch');
      
      if (response.data.success) {
        setSuccessMessage(`✅ ${response.data.message}`);
        // Refresh geocoding status
        checkGeocodingStatus();
      } else {
        setError('Failed to geocode leads');
      }
    } catch (error: any) {
      console.error('Geocoding error:', error);
      setError(error.response?.data?.error || 'Failed to geocode leads');
    } finally {
      setRefreshing(false);
    }
  };

  const checkGeocodingStatus = async () => {
    if (!selectedClient) return;
    
    try {
      console.log(`🔍 Checking geocoding status for client ${selectedClient.id}`);
      // Get Google Analytics leads geocoding status
      const leadsResponse = await http.get(`/analytics/leads/${selectedClient.id}`);
      console.log('🗺️ Geocoding leads response:', leadsResponse.data);
      
      const leads = leadsResponse.data.leads || [];
      console.log('🗺️ Leads for geocoding:', leads);
      
      // Calculate geocoding status for Google Analytics leads only
      const totalLeads = leads.length;
      const geocodedLeads = leads.filter((lead: any) => lead.geocoding_status === 'completed').length;
      const pendingLeads = leads.filter((lead: any) => lead.geocoding_status === 'pending').length;
      const failedLeads = leads.filter((lead: any) => lead.geocoding_status === 'failed').length;
      
      const status = {
        total_leads: totalLeads,
        geocoded_leads: geocodedLeads,
        pending_leads: pendingLeads,
        failed_leads: failedLeads,
        geocoding_percentage: totalLeads > 0 ? Math.round((geocodedLeads / totalLeads) * 100) : 0
      };
      
      console.log('🗺️ Geocoding status calculated:', status);
      setGeocodingStatus(status);
    } catch (error: any) {
      console.error('❌ Error checking geocoding status:', error);
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

  // Analytics functions
  const syncAnalyticsData = async (dateFrom: string, dateTo: string) => {
    if (!selectedClient) return;
    
    setSyncLoading(true);
    try {
      // Use comprehensive sync for all useful data
      const syncResponse = await http.post(`/analytics/comprehensive-sync/${selectedClient.id}`, {
        dateFrom,
        dateTo
      });
      
      setSuccessMessageText('✅ Data synced successfully! (Google Analytics, Search Console, Leads)');
      setShowSuccessModal(true);
      setShowSyncModal(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to sync analytics data';
      setErrorMessage(`❌ ${errorMsg}`);
      setShowErrorModal(true);
    } finally {
      setSyncLoading(false);
    }
  };

  const generateReport = async (reportName: string, reportType: string, dateFrom: string, dateTo: string) => {
    if (!selectedClient) return;
    
    setReportLoading(true);
    try {
      // Generate modern comprehensive report with all sections
      const response = await http.post(`/analytics/modern-report/${selectedClient.id}`, {
        reportName: `${reportName} - Comprehensive Report`,
        reportType: 'comprehensive',
        dateFrom,
        dateTo,
        groupBy: 'daily',
        includeSections: {
          overview: true,
          analytics: true,
          seo: true,
          pages: true,
          technical: true,
          recommendations: true,
          comparison: true,
          businessExplanations: true
        }
      });
      
      setSuccessMessageText('✅ Comprehensive modern report generated successfully! Includes overview, analytics, SEO, pages, technical insights, recommendations, and business explanations.');
      setShowSuccessModal(true);
      await fetchAnalyticsReports();
      setShowReportModal(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to generate comprehensive report';
      setErrorMessage(`❌ ${errorMsg}`);
      setShowErrorModal(true);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchAnalyticsReports = async () => {
    if (!selectedClient) return;
    
    try {
      const response = await http.get(`/analytics/reports/${selectedClient.id}`);
      const reportsData = response.data.data || [];
      setReports(reportsData);
      setAnalyticsReports(reportsData);
    } catch (error) {
      console.error('Error fetching analytics reports:', error);
    }
  };

  const fetchComprehensiveAnalytics = async () => {
    if (!selectedClient) return;
    
    try {
      const [pageInsightsRes, geographicRes, keywordsRes, monthlyRes] = await Promise.all([
        http.get(`/analytics/page-insights/${selectedClient.id}?dateFrom=${syncDateFrom}&dateTo=${syncDateTo}`),
        http.get(`/analytics/geographic/${selectedClient.id}?dateFrom=${syncDateFrom}&dateTo=${syncDateTo}`),
        http.get(`/analytics/keywords/${selectedClient.id}?dateFrom=${syncDateFrom}&dateTo=${syncDateTo}`),
        http.get(`/analytics/monthly-comparison/${selectedClient.id}?months=6`)
      ]);

      setPageInsights(pageInsightsRes.data.data || []);
      setGeographicData(geographicRes.data.data || []);
      setKeywordAnalysis(keywordsRes.data.data || []);
      setMonthlyComparison(monthlyRes.data.data || []);
    } catch (error) {
      console.error('Error fetching comprehensive analytics:', error);
    }
  };

  const exportReport = async (reportId: number) => {
    try {
      const response = await http.post(`/analytics/export/${reportId}`, {
        format: 'pdf'
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccessMessageText('✅ Report exported successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to export report';
      setErrorMessage(`❌ ${errorMsg}`);
      setShowErrorModal(true);
    }
  };

  const viewReport = async (reportId: number) => {
    try {
      console.log('👁️ Viewing report:', reportId);
      
      // Get the report data directly by ID using the new endpoint
      const response = await http.get(`/analytics/report/${reportId}`);
      
      if (!response.data.success || !response.data.report) {
        console.error('❌ Report not found:', response.data);
        setErrorMessage(`❌ Report ID ${reportId} not found`);
        setShowErrorModal(true);
        return;
      }
      
      const report = response.data.report;
      console.log('📊 Report found:', report);
      
      // Parse the report data
      const reportData = typeof report.report_data === 'string' 
        ? JSON.parse(report.report_data) 
        : report.report_data;
      
      console.log('📈 Parsed report data:', reportData);
      
          // Show the report data in a modal or new window
          const reportWindow = window.open('', '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
          if (reportWindow) {
            reportWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Report: ${report.report_name}</title>
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
                  .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                  .section { margin: 25px 0; padding: 25px; background: white; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                  .metric { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; }
                  .metric-value { font-size: 32px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
                  .metric-label { font-size: 14px; color: #666; text-transform: uppercase; font-weight: 500; }
                  .metric-explanation { font-size: 12px; color: #888; margin-top: 8px; font-style: italic; }
                  .data-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                  .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                  .data-table th { background: #f8f9fa; font-weight: 600; color: #333; }
                  .data-table tr:hover { background: #f8f9fa; }
                  .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
                  .status-connected { background: #d4edda; color: #155724; }
                  .status-not-connected { background: #f8d7da; color: #721c24; }
                  .status-not-checked { background: #fff3cd; color: #856404; }
                  .section-title { color: #333; margin-bottom: 20px; font-size: 20px; font-weight: 600; }
                  .subsection { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
                  .subsection h4 { margin: 0 0 10px 0; color: #555; }
                  .business-explanation { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #2196f3; }
                  .business-explanation h5 { margin: 0 0 8px 0; color: #1976d2; }
                  .business-explanation p { margin: 0; color: #424242; }
                  .page-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
                  .page-item { padding: 15px; background: white; border: 1px solid #e0e0e0; border-radius: 8px; }
                  .page-url { font-weight: 600; color: #007bff; margin-bottom: 5px; }
                  .page-views { font-size: 18px; font-weight: bold; color: #28a745; }
                  .checklist-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: white; border-radius: 6px; border: 1px solid #e0e0e0; }
                  .checklist-name { font-weight: 500; }
                  .checklist-status { font-size: 12px; }
                  .empty-data { text-align: center; color: #666; font-style: italic; padding: 20px; }
                </style>
              </head>
              <body>
                 <div class="header">
                   <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                     <h1 style="margin: 0;">${report.report_name}</h1>
                     <button onclick="downloadReport()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                       <i class="fas fa-download"></i> Download PDF
                     </button>
                   </div>
                   <p><strong>Generated:</strong> ${report.created_at ? new Date(report.created_at).toLocaleString() : new Date().toLocaleString()}</p>
                   <p><strong>📅 Report Period:</strong> ${report.date_from ? new Date(report.date_from).toLocaleDateString() : new Date().toLocaleDateString()} to ${report.date_to ? new Date(report.date_to).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                   <p><strong>📊 Data Sources:</strong> Google Analytics, Search Console, SEO Analysis, Local Search</p>
                 </div>
                
                <!-- Overview Section -->
                <div class="section">
                  <h2 class="section-title">📊 Executive Summary</h2>
                  <div class="metrics-grid">
                    <div class="metric">
                      <div class="metric-value">${reportData.summary?.totalPageViews || 0}</div>
                      <div class="metric-label">Total Page Views</div>
                      <div class="metric-explanation">${reportData.overview?.businessImpact?.pageViews || 'Page views indicate content engagement'}</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${reportData.summary?.totalSessions || 0}</div>
                      <div class="metric-label">Total Sessions</div>
                      <div class="metric-explanation">${reportData.overview?.businessImpact?.sessions || 'Sessions represent individual visits'}</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${reportData.summary?.totalUsers || 0}</div>
                      <div class="metric-label">Unique Users</div>
                      <div class="metric-explanation">${reportData.overview?.businessImpact?.users || 'Users show unique visitor count'}</div>
                    </div>
                     <div class="metric">
                       <div class="metric-value">${reportData.geographicLeads?.data?.total_leads || reportData.summary?.totalLeads || 0}</div>
                       <div class="metric-label">Total Leads</div>
                       <div class="metric-explanation">${reportData.overview?.businessImpact?.leads || 'Leads are potential patients who have shown interest in your services. This directly impacts your practice\'s revenue potential.'}</div>
                     </div>
                    <div class="metric">
                      <div class="metric-value">${Math.round(reportData.summary?.avgBounceRate || 0)}%</div>
                      <div class="metric-label">Bounce Rate</div>
                      <div class="metric-explanation">Lower bounce rates indicate better engagement</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${Math.round(reportData.summary?.avgSessionDuration || 0)}s</div>
                      <div class="metric-label">Avg Session Duration</div>
                      <div class="metric-explanation">Time spent on your website</div>
                    </div>
                  </div>
                </div>

                <!-- Top Pages Section -->
                ${reportData.topPages && reportData.topPages.length > 0 ? `
                <div class="section">
                  <h2 class="section-title">📄 Top Performing Pages</h2>
                  <div class="page-list">
                    ${reportData.topPages.slice(0, 10).map(page => `
                      <div class="page-item">
                        <div class="page-url">${page.page}</div>
                        <div class="page-views">${page.pageViews} views</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                 <!-- Traffic Sources Section -->
                 ${reportData.trafficSourceBreakdown && reportData.trafficSourceBreakdown.length > 0 ? `
                 <div class="section">
                   <h2 class="section-title">🚦 Traffic Sources</h2>
                   <table class="data-table">
                     <thead>
                       <tr>
                         <th>Source</th>
                         <th>Sessions</th>
                         <th>Percentage</th>
                       </tr>
                     </thead>
                     <tbody>
                       ${reportData.trafficSourceBreakdown.map(source => {
                         const total = reportData.trafficSourceBreakdown.reduce((sum, s) => sum + s.sessions, 0);
                         const percentage = total > 0 ? Math.round((source.sessions / total) * 100) : 0;
                         return `
                           <tr>
                             <td>${source.source}</td>
                             <td>${source.sessions}</td>
                             <td>${percentage}%</td>
                           </tr>
                         `;
                       }).join('')}
                     </tbody>
                   </table>
                   <div class="business-explanation">
                     <h5>💡 What This Means:</h5>
                     <p>${reportData.analytics?.businessExplanations?.trafficSources || 'Understanding traffic sources helps optimize marketing spend and focus on channels that bring quality patients.'}</p>
                   </div>
                 </div>
                 ` : ''}

                 <!-- Geographic Users Section -->
                 ${reportData.analytics?.countryBreakdown || reportData.analytics?.stateBreakdown ? `
                 <div class="section">
                   <h2 class="section-title">🌍 User Geographic Distribution</h2>
                   ${reportData.analytics?.countryBreakdown ? `
                   <div class="subsection">
                     <h4>Users by Country</h4>
                     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                       ${Object.entries(reportData.analytics.countryBreakdown).slice(0, 6).map(([country, users]) => `
                         <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; text-align: center;">
                           <div style="font-weight: 600; color: #007bff; margin-bottom: 5px;">${country}</div>
                           <div style="font-size: 18px; font-weight: bold; color: #28a745;">${users} users</div>
                         </div>
                       `).join('')}
                     </div>
                   </div>
                   ` : ''}
                   
                   ${reportData.analytics?.stateBreakdown ? `
                   <div class="subsection">
                     <h4>Users by State (US)</h4>
                     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0;">
                       ${Object.entries(reportData.analytics.stateBreakdown).slice(0, 8).map(([state, users]) => `
                         <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid #dee2e6; text-align: center;">
                           <div style="font-weight: 600; color: #007bff; margin-bottom: 3px;">${state}</div>
                           <div style="font-size: 16px; font-weight: bold; color: #28a745;">${users}</div>
                         </div>
                       `).join('')}
                     </div>
                   </div>
                   ` : ''}
                   
                   <div class="business-explanation">
                     <h5>🌍 Geographic Insights:</h5>
                     <p>Understanding where your users come from helps optimize marketing campaigns and identify expansion opportunities in new geographic markets.</p>
                   </div>
                 </div>
                 ` : ''}

                 <!-- Backlinks and Blogs Section -->
                 ${reportData.backlinks?.data || reportData.blogs?.data ? `
                 <div class="section">
                   <h2 class="section-title">🔗 Content & Link Analysis</h2>
                   
                   ${reportData.backlinks?.data ? `
                   <div class="subsection">
                     <h4>Backlinks Summary</h4>
                     <div class="metrics-grid">
                       <div class="metric">
                         <div class="metric-value">${reportData.backlinks.data.total}</div>
                         <div class="metric-label">Total Backlinks</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.backlinks.data.active}</div>
                         <div class="metric-label">Active Links</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.backlinks.data.dofollow}</div>
                         <div class="metric-label">Dofollow Links</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${Math.round(reportData.backlinks.data.average_domain_authority)}</div>
                         <div class="metric-label">Avg Domain Authority</div>
                       </div>
                     </div>
                   </div>
                   ` : ''}
                   
                   ${reportData.blogs?.data ? `
                   <div class="subsection">
                     <h4>Blog Content Summary</h4>
                     <div class="metrics-grid">
                       <div class="metric">
                         <div class="metric-value">${reportData.blogs.data.total}</div>
                         <div class="metric-label">Total Blog Posts</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.blogs.data.total_views}</div>
                         <div class="metric-label">Total Views</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.blogs.data.total_shares}</div>
                         <div class="metric-label">Social Shares</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${Math.round(reportData.blogs.data.average_seo_score)}</div>
                         <div class="metric-label">Avg SEO Score</div>
                       </div>
                     </div>
                   </div>
                   ` : ''}
                   
                   <div class="business-explanation">
                     <h5>🔗 Content Strategy Impact:</h5>
                     <p>Quality backlinks and engaging blog content improve your website's authority and help attract more patients through search engines and social media.</p>
                   </div>
                 </div>
                 ` : ''}

                <!-- SEO Analysis Section -->
                <div class="section">
                  <h2 class="section-title">🔍 SEO Analysis</h2>
                  <div class="subsection">
                    <h4>Search Performance</h4>
                    <div class="metrics-grid">
                      <div class="metric">
                        <div class="metric-value">${reportData.seo?.searchPerformance?.organicTraffic || 'N/A'}</div>
                        <div class="metric-label">Organic Traffic</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.seo?.searchPerformance?.keywordRankings || 'N/A'}</div>
                        <div class="metric-label">Keyword Rankings</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.seo?.searchPerformance?.searchVisibility || 'N/A'}</div>
                        <div class="metric-label">Search Visibility</div>
                      </div>
                    </div>
                  </div>
                  <div class="business-explanation">
                    <h5>💡 SEO Business Impact:</h5>
                    <p>${reportData.seo?.businessExplanations?.organicTraffic || 'Organic traffic from search engines is free and high-quality. Improving SEO increases patient discovery without advertising costs.'}</p>
                  </div>
                </div>

                <!-- SEO Checklist Section -->
                ${reportData.seoChecklist?.data?.pages && reportData.seoChecklist.data.pages.length > 0 ? `
                <div class="section">
                  <h2 class="section-title">✅ SEO Checklist Status</h2>
                  <div class="subsection">
                    <h4>Overall Summary</h4>
                    <div class="metrics-grid">
                      <div class="metric">
                        <div class="metric-value">${reportData.seoChecklist.data.summary?.total_checks || 0}</div>
                        <div class="metric-label">Total Checks</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.seoChecklist.data.summary?.passed_checks || 0}</div>
                        <div class="metric-label">Passed</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.seoChecklist.data.summary?.failed_checks || 0}</div>
                        <div class="metric-label">Failed</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.seoChecklist.data.summary?.warning_checks || 0}</div>
                        <div class="metric-label">Warnings</div>
                      </div>
                    </div>
                  </div>
                  <div class="subsection">
                    <h4>Page-by-Page Analysis</h4>
                    ${reportData.seoChecklist.data.pages.slice(0, 5).map(page => `
                      <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h5 style="margin: 0 0 10px 0; color: #007bff;">${page.page_url}</h5>
                        <p style="margin: 0 0 10px 0; color: #666;">${page.page_title}</p>
                        <div style="display: flex; gap: 15px; font-size: 14px;">
                          <span>Total Checks: <strong>${page.total_checks}</strong></span>
                          <span>Passed: <strong style="color: #28a745;">${page.passed_checks}</strong></span>
                          <span>Failed: <strong style="color: #dc3545;">${page.failed_checks}</strong></span>
                          <span>Warnings: <strong style="color: #ffc107;">${page.warning_checks}</strong></span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                ` : ''}

                <!-- Technical Analysis Section -->
                <div class="section">
                  <h2 class="section-title">⚙️ Technical Analysis</h2>
                  <div class="subsection">
                    <h4>Site Health</h4>
                    <div class="metrics-grid">
                      <div class="metric">
                        <div class="metric-value">${reportData.technical?.siteHealth?.siteHealth || 'N/A'}</div>
                        <div class="metric-label">Overall Health</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.technical?.performanceMetrics?.performanceScore || 'N/A'}</div>
                        <div class="metric-label">Performance Score</div>
                      </div>
                      <div class="metric">
                        <div class="metric-value">${reportData.technical?.siteHealth?.mobileFriendly ? 'Yes' : 'No'}</div>
                        <div class="metric-label">Mobile Friendly</div>
                      </div>
                    </div>
                  </div>
                  <div class="business-explanation">
                    <h5>💡 Technical Impact:</h5>
                    <p>${reportData.technical?.businessExplanations?.siteHealth || 'A healthy website loads quickly and works properly, improving patient experience and search rankings.'}</p>
                  </div>
                </div>

                 <!-- Current vs Previous Comparison Section -->
                 <div class="section">
                   <h2 class="section-title">📈 Performance Trends</h2>
                   <div class="subsection">
                     <h4>Current vs Previous Period Comparison</h4>
                     <div class="metrics-grid">
                       <div class="metric">
                         <div class="metric-value">${reportData.summary?.totalPageViews || 0}</div>
                         <div class="metric-label">Current Page Views</div>
                         <div class="metric-explanation">${reportData.comparison?.periodComparison?.pageViewsChange ? `(${reportData.comparison.periodComparison.pageViewsChange > 0 ? '+' : ''}${reportData.comparison.periodComparison.pageViewsChange}% vs previous)` : 'No previous data available'}</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.summary?.totalSessions || 0}</div>
                         <div class="metric-label">Current Sessions</div>
                         <div class="metric-explanation">${reportData.comparison?.periodComparison?.sessionsChange ? `(${reportData.comparison.periodComparison.sessionsChange > 0 ? '+' : ''}${reportData.comparison.periodComparison.sessionsChange}% vs previous)` : 'No previous data available'}</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.summary?.totalUsers || 0}</div>
                         <div class="metric-label">Current Users</div>
                         <div class="metric-explanation">${reportData.comparison?.periodComparison?.usersChange ? `(${reportData.comparison.periodComparison.usersChange > 0 ? '+' : ''}${reportData.comparison.periodComparison.usersChange}% vs previous)` : 'No previous data available'}</div>
                       </div>
                       <div class="metric">
                         <div class="metric-value">${reportData.geographicLeads?.data?.total_leads || reportData.summary?.totalLeads || 0}</div>
                         <div class="metric-label">Current Leads</div>
                         <div class="metric-explanation">${reportData.comparison?.periodComparison?.leadsChange ? `(${reportData.comparison.periodComparison.leadsChange > 0 ? '+' : ''}${reportData.comparison.periodComparison.leadsChange}% vs previous)` : 'No previous data available'}</div>
                       </div>
                     </div>
                   </div>
                   
                   <!-- Time-based Trends -->
                   <div class="subsection">
                     <h4>📅 Time-based Performance</h4>
                     <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center;">
                       <div style="color: #666; font-size: 16px; padding: 20px;">
                         <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                         <div style="font-weight: 600; margin-bottom: 10px;">No Time-based Data Available</div>
                         <div style="font-size: 14px;">Historical performance data requires additional data collection and time-series analysis.</div>
                       </div>
                     </div>
                   </div>
                   
                   <div class="business-explanation">
                     <h5>📊 Trend Analysis:</h5>
                     <p>${reportData.comparison?.businessExplanations?.trendAnalysis || 'Comparing current performance with previous periods helps identify growth patterns and areas for improvement. Regular monitoring helps optimize marketing strategies and patient acquisition efforts.'}</p>
                   </div>
                 </div>

                <!-- Leads Map View Section -->
                <div class="section">
                  <h2 class="section-title">🗺️ Leads Geographic Distribution & Heatmap</h2>
                  <div class="subsection">
                    <h4>Practice Location & Lead Sources</h4>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                      <div style="font-size: 18px; font-weight: bold; color: #007bff; margin-bottom: 10px;">📍 Practice Location</div>
                      <div style="color: #666; margin-bottom: 15px;">
                        ${reportData.geographicLeads?.data?.practice_location ? 
                          `${reportData.geographicLeads.data.practice_location.city}, ${reportData.geographicLeads.data.practice_location.state}` : 
                          (report.client_name || 'Practice Location')
                        }
                      </div>
                      <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6;">
                        <div style="font-weight: 600; color: #28a745; margin-bottom: 5px;">Total Leads: ${reportData.geographicLeads?.data?.total_leads || reportData.summary?.totalLeads || 0}</div>
                        <div style="font-size: 14px; color: #666;">
                          ${reportData.geographicLeads?.data?.leads_within_25_miles || 0} within 25 miles • 
                          ${reportData.geographicLeads?.data?.leads_within_50_miles || 0} within 50 miles • 
                          ${reportData.geographicLeads?.data?.leads_within_100_miles || 0} within 100 miles
                        </div>
                        ${reportData.geographicLeads?.data?.average_distance ? 
                          `<div style="font-size: 12px; color: #888; margin-top: 5px;">Average Distance: ${reportData.geographicLeads.data.average_distance} miles</div>` : ''
                        }
                      </div>
                    </div>
                    
                    <!-- Heatmap Visualization -->
                    <div class="subsection">
                      <h4>🔥 Lead Density Heatmap</h4>
                      <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 15px 0; text-align: center;">
                        <div style="color: #666; font-size: 16px; padding: 40px 20px;">
                          <div style="font-size: 48px; margin-bottom: 15px;">🗺️</div>
                          <div style="font-weight: 600; margin-bottom: 10px;">No Heatmap Data Available</div>
                          <div style="font-size: 14px;">Real-time geographic lead density analysis requires additional data collection and mapping integration.</div>
                        </div>
                      </div>
                    </div>
                    
                    ${reportData.geographicLeads?.data?.leads_by_city && reportData.geographicLeads.data.leads_by_city.length > 0 ? `
                    <div class="subsection">
                      <h4>Leads by City</h4>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 15px 0;">
                        ${reportData.geographicLeads.data.leads_by_city.slice(0, 6).map(city => `
                          <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; text-align: center;">
                            <div style="font-weight: 600; color: #007bff; margin-bottom: 5px;">${city.city}, ${city.state}</div>
                            <div style="font-size: 18px; font-weight: bold; color: #28a745;">${city.count} leads</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                    ` : ''}
                    
                    <div class="business-explanation">
                      <h5>🗺️ Geographic Insights:</h5>
                      <p>${reportData.geographicLeads?.businessExplanations?.geographicDistribution || 'Understanding where your leads come from helps optimize local marketing efforts and identify expansion opportunities in underserved areas. The heatmap visualization helps identify high-potential areas for targeted marketing campaigns.'}</p>
                    </div>
                  </div>
                </div>

                <!-- Recommendations Section -->
                <div class="section">
                  <h2 class="section-title">🎯 Recommendations</h2>
                  <div class="business-explanation">
                    <h5>💡 Strategic Focus:</h5>
                    <p>${reportData.recommendations?.businessImpact?.priorityRanking || 'Focusing on high-impact actions maximizes ROI and patient acquisition.'}</p>
                  </div>
                  <div class="business-explanation">
                    <h5>⚡ Immediate Actions:</h5>
                    <p>${reportData.recommendations?.businessImpact?.immediateActions || 'Quick fixes can improve patient experience and search rankings within days.'}</p>
                  </div>
                  <div class="business-explanation">
                    <h5>📈 Long-term Strategy:</h5>
                    <p>${reportData.recommendations?.businessImpact?.longTermStrategy || 'Strategic improvements build sustainable growth and competitive advantage.'}</p>
                  </div>
                </div>

                <!-- Data Sources Section -->
                <div class="section">
                  <h2 class="section-title">📊 Data Sources</h2>
                  <div class="metrics-grid">
                    <div class="metric">
                      <div class="metric-value">${reportData.seo?.searchPerformance?.searchConsoleData === 'Connected' ? '✅' : '❌'}</div>
                      <div class="metric-label">Google Search Console</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${reportData.summary?.totalPageViews > 0 ? '✅' : '❌'}</div>
                      <div class="metric-label">Google Analytics</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${reportData.facebook?.data?.connected ? '✅' : '❌'}</div>
                      <div class="metric-label">Facebook Integration</div>
                    </div>
                    <div class="metric">
                      <div class="metric-value">${reportData.seoChecklist?.data?.pages?.length > 0 ? '✅' : '❌'}</div>
                      <div class="metric-label">SEO Checklist</div>
                    </div>
                  </div>
                 </div>
                 
                 <script>
                   function downloadReport() {
                     // Call the export API
                     fetch('/api/analytics/export/${report.id}', {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                       },
                       credentials: 'include'
                     })
                     .then(response => {
                       if (!response.ok) {
                         throw new Error('Export failed');
                       }
                       return response.blob();
                     })
                     .then(blob => {
                       const url = window.URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = 'analytics-report-${report.id}.pdf';
                       document.body.appendChild(a);
                       a.click();
                       window.URL.revokeObjectURL(url);
                       document.body.removeChild(a);
                     })
                     .catch(error => {
                       console.error('Download failed:', error);
                       alert('Failed to download report. Please try again.');
                     });
                   }
                 </script>
               </body>
               </html>
             `);
             reportWindow.document.close();
          }
      
    } catch (error: any) {
      console.error('❌ Error viewing report:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to view report';
      setErrorMessage(`❌ ${errorMsg}`);
      setShowErrorModal(true);
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await http.delete(`/analytics/reports/${reportId}`);
      
      // Refresh the reports list
      await fetchAnalyticsReports();
      
      setSuccessMessageText('✅ Report deleted successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete report';
      setErrorMessage(`❌ ${errorMsg}`);
      setShowErrorModal(true);
    }
  };

  // Fetch analytics data when client changes
  useEffect(() => {
    if (selectedClient && (activeTab === 'analytics' || activeTab === 'reports')) {
      fetchAnalyticsReports();
      if (activeTab === 'analytics') {
        fetchComprehensiveAnalytics();
      }
    }
  }, [selectedClient, activeTab, syncDateFrom, syncDateTo]);

  // Set default report name when modal opens
  useEffect(() => {
    if (showReportModal && selectedClient) {
      const reportNameInput = document.getElementById('report-name') as HTMLInputElement;
      const reportTypeSelect = document.getElementById('report-type') as HTMLSelectElement;
      
      if (reportNameInput && reportTypeSelect) {
        // Set default to daily report
        reportTypeSelect.value = 'daily';
        
        // Trigger the onChange to generate the report name
        const event = new Event('change', { bubbles: true });
        reportTypeSelect.dispatchEvent(event);
      }
    }
  }, [showReportModal, selectedClient]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => window.history.back()}
            style={{
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
          <div>
            <h1>Client Management</h1>
            <p>Manage client analytics, settings, and integrations</p>
          </div>
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
                📊 Google Analytics
              </button>
              <button 
                onClick={() => setActiveTab('social-media')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'social-media' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'social-media' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📱 Social Media
              </button>
              <button 
                onClick={() => setActiveTab('lead-tracking')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'lead-tracking' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'lead-tracking' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🗺️ Lead Tracking
              </button>
              <button 
                onClick={() => setActiveTab('seo')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'seo' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'seo' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔍 SEO Analysis
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'reports' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'reports' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📋 Reports
              </button>
              <button 
                onClick={() => setActiveTab('local-search')}
                style={{
                  padding: '16px 24px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'local-search' ? '3px solid #007bff' : '3px solid transparent',
                  color: activeTab === 'local-search' ? '#007bff' : '#6c757d',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📍 Local Search
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
              {activeTab === 'lead-tracking' && selectedClient && (
                <div>
                  {/* Lead Density Heatmap Section */}
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#333' }}>🗺️ Lead Density Heatmap</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Distance Filter */}
                        <select
                          value={heatmapRadius}
                          onChange={(e) => setHeatmapRadius(parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            fontSize: '14px'
                          }}
                        >
                          <option value={5}>5 miles</option>
                          <option value={10}>10 miles</option>
                          <option value={15}>15 miles</option>
                          <option value={20}>20 miles</option>
                          <option value={30}>30 miles</option>
                          <option value={40}>40 miles</option>
                          <option value={50}>50 miles</option>
                        </select>
                        
                        {/* Date Range Filter */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <label style={{ fontSize: '12px', color: '#666', marginRight: '5px' }}>From:</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            placeholder="Start Date"
                            title={startDate ? `Showing leads from ${startDate}` : 'Auto-set to earliest lead date'}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              fontSize: '14px',
                              width: '140px'
                            }}
                          />
                          <span style={{ fontSize: '12px', color: '#666' }}>to</span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="End date (always current date)"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ddd',
                              fontSize: '14px',
                              width: '140px',
                              backgroundColor: '#f8f9fa'
                            }}
                            disabled
                          />
                        </div>
                        
                        {/* Sync Button */}
                        <button
                          onClick={() => syncLatestData()}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          🔄 Sync Latest Data
                        </button>
                      </div>
                    </div>
                    
                    {geocodingStatus && (
                      <div style={{ 
                        marginBottom: '20px', 
                        padding: '15px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Lead Processing Status</h4>
                        
                        {/* Geocoding Status Counts */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                              {geocodingStatus.total_leads}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Leads</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>All Google Analytics leads</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                              {geocodingStatus.geocoded_leads}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Geocoded ✓</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Has map coordinates</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                              {geocodingStatus.pending_leads}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Pending ⏳</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Waiting to geocode</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                              {geocodingStatus.failed_leads}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Failed ✗</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>No address found</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                              {geocodingStatus.geocoding_percentage}%
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Success Rate</div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>Geocoded / Total</div>
                          </div>
                        </div>
                        
                        {/* Filter Flow Explanation */}
                        <div style={{ 
                          padding: '10px', 
                          backgroundColor: '#fff', 
                          borderRadius: '6px', 
                          border: '1px solid #e0e0e0',
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          <strong style={{ color: '#333' }}>🔍 Map Display Filter:</strong> {geocodingStatus.total_leads} Total → {geocodingStatus.geocoded_leads} Geocoded → Filtered by {heatmapRadius} miles radius → Displayed on map
                        </div>
                      </div>
                    )}

                    <LeadHeatmap 
                      clientId={selectedClient.id}
                      practiceLocation={selectedClient.practice_location}
                      radiusMiles={heatmapRadius}
                      startDate={startDate}
                      endDate={endDate}
                      onLeadsLoaded={(leads) => {
                        console.log('🗺️ Heatmap loaded with leads:', leads);
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'seo' && selectedClient && (
                <SEODashboard clientId={selectedClient.id} clientName={selectedClient.name} />
              )}

              {activeTab === 'reports' && (
                <div className="reports-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Generate Comprehensive Reports</h3>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Modern Analytics Report</h4>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                      Generate a comprehensive report with overview graphs, analytics data, SEO analysis, pages analysis, 
                      technical insights, and recommendations. Includes previous vs current data comparison with detailed 
                      business explanations.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>📊 Overview</strong><br/>
                        <small>Graphs and key metrics</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>📈 Analytics</strong><br/>
                        <small>Traffic and user data</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>🔍 SEO Analysis</strong><br/>
                        <small>Search performance</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>📄 Pages</strong><br/>
                        <small>Page performance</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>⚙️ Technical</strong><br/>
                        <small>Technical insights</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>💡 Recommendations</strong><br/>
                        <small>Actionable insights</small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        onClick={async () => {
                          if (!selectedClient) {
                            setError('Please select a client first');
                            return;
                          }
                          
                          console.log('🚀 Generating modern report for client:', selectedClient.id);
                          setReportLoading(true);
                          
                          try {
                            // Auto-generate report name and dates
                            const today = new Date();
                            const reportName = `${selectedClient.name} - Daily Report - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                            const dateFrom = today.toISOString().split('T')[0];
                            const dateTo = today.toISOString().split('T')[0];
                            
                            console.log('📊 Report details:', { reportName, dateFrom, dateTo });
                            
                            // Generate modern comprehensive report with all sections
                            const response = await http.post(`/analytics/modern-report/${selectedClient.id}`, {
                              reportName: `${reportName} - Comprehensive Report`,
                              reportType: 'comprehensive',
                              dateFrom,
                              dateTo,
                              includeSections: ['overview', 'analytics', 'seo', 'pages', 'technical', 'recommendations', 'comparison']
                            });
                            
                            console.log('✅ Report generated successfully:', response.data);
                            setSuccessMessage('Modern comprehensive report generated successfully!');
                            
                            // Refresh the reports list
                            await fetchAnalyticsReports();
                            
                          } catch (error) {
                            console.error('❌ Error generating report:', error);
                            setError('Failed to generate report. Please try again.');
                          } finally {
                            setReportLoading(false);
                          }
                        }}
                        disabled={reportLoading}
                        style={{
                          backgroundColor: reportLoading ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: reportLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <i className="fas fa-file-pdf"></i>
                        {reportLoading ? 'Generating...' : 'Generate Modern Report'}
                      </button>
                    </div>
                  </div>

                  {/* Generated Reports List */}
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                  }}>
                    <h4 style={{ margin: '0 0 20px 0', color: '#333' }}>Generated Reports</h4>
                    
                    {analyticsReports && analyticsReports.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {analyticsReports.map((report: any) => (
                          <div key={report.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '15px',
                            border: '1px solid #dee2e6',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa'
                          }}>
                            <div>
                              <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                                {report.report_name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {new Date(report.date_from).toLocaleDateString()} to {new Date(report.date_to).toLocaleDateString()} • {report.group_by}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => viewReport(report.id)}
                                style={{
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                <i className="fas fa-eye"></i> View
                              </button>
                              <button
                                onClick={() => deleteReport(report.id)}
                                style={{
                                  backgroundColor: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                <i className="fas fa-trash"></i> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                        No reports generated yet. Generate your first comprehensive report above.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'local-search' && (
                <div className="local-search-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Local Search Analysis</h3>
                    <button
                      onClick={() => setShowLocalSearchModal(true)}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className="fas fa-search"></i>
                      Generate Local Search Grid
                    </button>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Local Search Overview</h4>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                      Analyze your local search presence and competitor landscape using real Google Places data. 
                      Track your rankings, identify competitors, and discover market opportunities.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>🔍 Search Rankings</strong><br/>
                        <small>Track your position in local search results</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>🏢 Competitor Analysis</strong><br/>
                        <small>Identify and analyze local competitors</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>📊 Market Share</strong><br/>
                        <small>Estimate your local market position</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>📈 Ranking Trends</strong><br/>
                        <small>Monitor ranking changes over time</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>🎯 Market Gaps</strong><br/>
                        <small>Discover untapped opportunities</small>
                      </div>
                      <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <strong>💡 Local SEO Score</strong><br/>
                        <small>Overall local search performance</small>
                      </div>
                    </div>

                    <div style={{ 
                      backgroundColor: '#e3f2fd', 
                      padding: '15px', 
                      borderRadius: '8px', 
                      border: '1px solid #bbdefb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px', marginRight: '8px' }}>ℹ️</span>
                        <strong style={{ color: '#1976d2' }}>Real Data Analysis</strong>
                      </div>
                      <p style={{ margin: '0', color: '#1976d2', fontSize: '14px' }}>
                        This analysis uses real Google Places API data to provide accurate local search insights. 
                        No mock data is used - all rankings, competitor information, and market analysis are based on actual search results.
                      </p>
                    </div>
                  </div>

                  {/* Local Search Results */}
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
                  }}>
                    <h4 style={{ margin: '0 0 20px 0', color: '#333' }}>Local Search Results</h4>
                    
                    <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '20px', 
                      borderRadius: '8px', 
                      textAlign: 'center',
                      border: '1px solid #dee2e6'
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '10px', color: '#6c757d' }}>
                        🗺️ No Local Search Data Yet
                      </div>
                      <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                        Generate your first local search analysis to see rankings, competitors, and market insights.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

              {activeTab === 'overview' && selectedClient && (
                <div>
                  {/* Overview content - Lead Heatmap moved to separate tab */}
                  <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <p>📊 View detailed analytics and lead tracking in their respective tabs above.</p>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="analytics-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Analytics Reports</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {/* Date Range Filter */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>Date Range:</label>
                        <input 
                          type="date" 
                          value={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          onChange={(e) => setSyncDateFrom(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                        <span style={{ fontSize: '14px' }}>to</span>
                        <input 
                          type="date" 
                          value={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setSyncDateTo(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <button 
                        onClick={() => setShowSyncModal(true)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <i className="fas fa-sync-alt"></i>
                        Sync Data
                      </button>
                    </div>
                  </div>

                  {/* Analytics Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Total Page Views</h4>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>
                        {analyticsData?.googleAnalytics?.pageViews?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Total Sessions</h4>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                        {analyticsData?.googleAnalytics?.sessions?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Bounce Rate</h4>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
                        {analyticsData?.googleAnalytics?.bounceRate?.toFixed(1) || 0}%
                      </div>
                    </div>
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Total Users</h4>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6f42c1' }}>
                        {analyticsData?.googleAnalytics?.users?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>

                  {/* Page Insights */}
                  {pageInsights.length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
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
                            {pageInsights.slice(0, 10).map((page, index) => (
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

                  {/* Geographic Data */}
                  {geographicData.length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🌍 Geographic Distribution</h4>
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
                            {geographicData.slice(0, 15).map((geo, index) => (
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

                  {/* Keyword Analysis */}
                  {keywordAnalysis.length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🔍 Keyword Performance</h4>
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
                            {keywordAnalysis.slice(0, 20).map((keyword, index) => (
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
                                    backgroundColor: keyword.category === 'high-value' ? '#28a74520' : keyword.category === 'medium-value' ? '#ffc10720' : '#dc354520',
                                    color: keyword.category === 'high-value' ? '#28a745' : keyword.category === 'medium-value' ? '#ffc107' : '#dc3545'
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

                  {/* Device Breakdown */}
                  {analyticsReportData?.deviceBreakdown && Object.keys(analyticsReportData.deviceBreakdown).length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Device Breakdown</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                        {Object.entries(analyticsReportData.deviceBreakdown).map(([device, views]: [string, any]) => (
                          <div key={device} style={{ 
                            padding: '10px 15px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{device}</div>
                            <div style={{ color: '#666' }}>{views.toLocaleString()} views</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Traffic Source Breakdown */}
                  {analyticsReportData?.trafficSourceBreakdown && Object.keys(analyticsReportData.trafficSourceBreakdown).length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Traffic Sources</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                        {Object.entries(analyticsReportData.trafficSourceBreakdown).map(([source, views]: [string, any]) => (
                          <div key={source} style={{ 
                            padding: '10px 15px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div style={{ fontWeight: 'bold', color: '#333' }}>{source}</div>
                            <div style={{ color: '#666' }}>{views.toLocaleString()} views</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Analytics Data Table */}
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: '0', color: '#333' }}>Detailed Analytics Data</h4>
                      <button 
                        onClick={async () => {
                          if (selectedClient) {
                            try {
                              const response = await http.get(`/analytics/data/${selectedClient.id}?dateFrom=${syncDateFrom}&dateTo=${syncDateTo}`);
                              setAnalyticsReportData(response.data.data);
                            } catch (error) {
                              console.error('Failed to fetch analytics data:', error);
                            }
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fas fa-refresh"></i>
                        Refresh Data
                      </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Metric</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Service</th>
                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Value</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: '600' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>Page Views</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2'
                              }}>
                                Google Analytics
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.googleAnalytics?.pageViews?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: analyticsData?.googleAnalytics?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.googleAnalytics?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>Sessions</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2'
                              }}>
                                Google Analytics
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.googleAnalytics?.sessions?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: analyticsData?.googleAnalytics?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.googleAnalytics?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>Users</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2'
                              }}>
                                Google Analytics
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.googleAnalytics?.users?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: analyticsData?.googleAnalytics?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.googleAnalytics?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>Bounce Rate</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2'
                              }}>
                                Google Analytics
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.googleAnalytics?.bounceRate?.toFixed(1) || '0'}%
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: analyticsData?.googleAnalytics?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.googleAnalytics?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>Total Leads</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#e8f5e8',
                                color: '#388e3c'
                              }}>
                                Leads
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.leads?.total?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '12px', fontSize: '12px', color: analyticsData?.leads?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.leads?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Reports */}
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Generated Reports</h4>
                    {reports.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {reports.map((report: any) => (
                          <div key={report.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}>
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#333' }}>{report.report_name}</div>
                              <div style={{ color: '#666', fontSize: '14px' }}>
                                {report.date_from} to {report.date_to} • {report.report_type}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                onClick={() => viewReport(report.id)}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                <i className="fas fa-eye"></i> View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                        No reports generated yet. Click "Sync Data" to sync your analytics data, then go to the "Reports" tab to generate reports.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'social-media' && selectedClient && (
                <div className="social-media-content">
                  <div style={{ 
                    backgroundColor: 'white', 
                    padding: '30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📱 Social Media Analytics</h3>
                    
                    {/* Facebook Insights Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '20px', 
                        borderRadius: '10px',
                        border: '2px solid #4267B2'
                      }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Page Views</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4267B2' }}>
                          {analyticsData?.facebook?.pageViews?.toLocaleString() || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>📘 Facebook</div>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '20px', 
                        borderRadius: '10px',
                        border: '2px solid #4267B2'
                      }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Followers</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4267B2' }}>
                          {analyticsData?.facebook?.followers?.toLocaleString() || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>👥 Followers</div>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '20px', 
                        borderRadius: '10px',
                        border: '2px solid #4267B2'
                      }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Engagement Rate</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4267B2' }}>
                          {analyticsData?.facebook?.engagement?.toFixed(1) || 0}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>💬 Engagement</div>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '20px', 
                        borderRadius: '10px',
                        border: '2px solid #28a745'
                      }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Connection Status</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: analyticsData?.facebook?.connected ? '#28a745' : '#dc3545', marginTop: '10px' }}>
                          {analyticsData?.facebook?.connected ? '✅ Connected' : '❌ Not Connected'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                          {analyticsData?.facebook?.status || 'Not Connected'}
                        </div>
                      </div>
                    </div>

                    {/* Connection Instructions */}
                    {!analyticsData?.facebook?.connected && (
                      <div style={{ 
                        backgroundColor: '#fff3cd', 
                        border: '1px solid #ffc107', 
                        borderRadius: '8px', 
                        padding: '20px',
                        marginBottom: '20px'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Facebook Not Connected</h4>
                        <p style={{ margin: '0 0 10px 0', color: '#856404', lineHeight: '1.6' }}>
                          To view Facebook analytics, please connect your Facebook page in the Settings tab.
                        </p>
                        <button 
                          onClick={() => setActiveTab('settings')}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Go to Settings
                        </button>
                      </div>
                    )}

                    {/* Detailed Facebook Metrics */}
                    {analyticsData?.facebook?.connected && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📊 Detailed Facebook Insights</h4>
                        
                        {/* Additional metrics will be displayed here */}
                        <div style={{ 
                          backgroundColor: '#f8f9fa', 
                          padding: '20px', 
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#666'
                        }}>
                          <p style={{ margin: 0 }}>
                            🚧 More detailed Facebook analytics coming soon!
                          </p>
                          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                            This section will include post performance, audience demographics, engagement trends, and more.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Quick Stats Table */}
                    <div style={{ marginTop: '30px' }}>
                      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>📈 Social Media Overview</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#4267B2', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Platform</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Page Views</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Followers</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Engagement</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📘 Facebook
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.facebook?.pageViews?.toLocaleString() || 0}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.facebook?.followers?.toLocaleString() || 0}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {analyticsData?.facebook?.engagement?.toFixed(1) || 0}%
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: analyticsData?.facebook?.connected ? '#28a745' : '#dc3545' }}>
                              {analyticsData?.facebook?.connected ? '✅ Connected' : '❌ Not Connected'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
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
                        id="facebook-page-id"
                        placeholder="Page ID (e.g., 744651835408507)" 
                        defaultValue={clientSettings?.facebook?.pageId || ''}
                      />
                      <input 
                        type="text" 
                        id="facebook-access-token"
                        placeholder="Page Access Token" 
                        defaultValue={clientSettings?.facebook?.accessToken || ''}
                      />
                      {!clientSettings?.facebook?.connected ? (
                        <button 
                          onClick={async () => {
                            const pageIdInput = document.getElementById('facebook-page-id') as HTMLInputElement;
                            const tokenInput = document.getElementById('facebook-access-token') as HTMLInputElement;
                            const pageId = pageIdInput.value;
                            const accessToken = tokenInput.value;
                            
                            if (!pageId || !accessToken) {
                              alert('Please enter both Page ID and Access Token');
                              return;
                            }
                            
                            try {
                              const response = await http.post(`/facebook/connect/${selectedClient?.id}`, {
                                pageId,
                                accessToken
                              });
                              
                              if (response.data.success) {
                                alert('Facebook page connected successfully!');
                                // Refresh client settings
                                fetchClientData(selectedClient!.id);
                              }
                            } catch (error) {
                              console.error('Connect Facebook error:', error);
                              alert('Failed to connect Facebook page. Please check your credentials.');
                            }
                          }}
                          className="connect-btn"
                        >
                          Connect Facebook
                        </button>
                      ) : (
                        <button 
                          onClick={async () => {
                            if (!confirm('Are you sure you want to disconnect Facebook?')) return;
                            
                            try {
                              await http.post(`/facebook/disconnect/${selectedClient?.id}`);
                              alert('Facebook disconnected successfully!');
                              fetchClientData(selectedClient!.id);
                            } catch (error) {
                              console.error('Disconnect Facebook error:', error);
                              alert('Failed to disconnect Facebook');
                            }
                          }}
                          className="disconnect-btn"
                          style={{ backgroundColor: '#dc3545' }}
                        >
                          Disconnect
                        </button>
                      )}
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
                            siteUrl: clientSettings?.searchConsole?.siteUrl?.trim()
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
                                  siteUrl: siteUrl.trim() // Trim whitespace before sending
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

      <style>{`
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

      {/* Sync Data Modal */}
      {showSyncModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px'
          }}>
             <h3 style={{ margin: '0 0 20px 0' }}>Sync Analytics Data</h3>
             <p style={{ color: '#666', marginBottom: '20px' }}>
               This will sync ALL analytics data for <strong>{selectedClient?.name}</strong> from <strong>{syncDateFrom}</strong> to <strong>{syncDateTo}</strong>:<br/><br/>
               • Google Analytics (page views, sessions, users, devices, traffic sources)<br/>
               • Search Console (search queries, impressions, clicks)<br/>
               • Leads data (conversions, sources, daily counts)<br/><br/>
               <strong>Note:</strong> After syncing, go to the "Reports" tab to generate comprehensive reports.
             </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowSyncModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => syncAnalyticsData(syncDateFrom, syncDateTo)}
                disabled={syncLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: syncLoading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: syncLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {syncLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Syncing Data...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    Start Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px'
          }}>
             <h3 style={{ margin: '0 0 20px 0' }}>Generate Modern Comprehensive Report</h3>
             <p style={{ color: '#666', marginBottom: '20px' }}>
               Create a comprehensive modern report for <strong>{selectedClient?.name}</strong> with:<br/><br/>
               <strong>📊 Overview:</strong> Graphs and key performance indicators<br/>
               <strong>📈 Analytics:</strong> Traffic, users, and engagement metrics<br/>
               <strong>🔍 SEO Analysis:</strong> Search performance and rankings<br/>
               <strong>📄 Pages:</strong> Individual page performance analysis<br/>
               <strong>⚙️ Technical:</strong> Technical SEO and site health<br/>
               <strong>💡 Recommendations:</strong> Actionable business insights<br/>
               <strong>📊 Comparison:</strong> Previous vs current data with explanations<br/>
               <strong>💼 Business Impact:</strong> What each metric means for your business
             </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Report Name:</label>
                <input 
                  type="text" 
                  id="report-name"
                  placeholder="Auto-generated report name"
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Report Type:</label>
                <select 
                  id="report-type"
                  onChange={(e) => {
                    const reportType = e.target.value;
                    const reportNameInput = document.getElementById('report-name') as HTMLInputElement;
                    if (reportNameInput) {
                      const clientName = selectedClient?.name || 'Client';
                      const today = new Date();
                      let reportName = '';
                      
                      if (reportType === 'daily') {
                        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        reportName = `${clientName} - Daily Report - ${dateStr}`;
                      } else if (reportType === 'weekly') {
                        const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                        const weekEnd = today;
                        const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        reportName = `${clientName} - Weekly Report - ${startStr} to ${endStr}`;
                      } else if (reportType === 'monthly') {
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        const startStr = monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        const endStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        reportName = `${clientName} - Monthly Report - ${startStr} to ${endStr}`;
                      }
                      
                      reportNameInput.value = reportName;
                    }
                  }}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="daily">Daily Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowReportModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const reportName = (document.getElementById('report-name') as HTMLInputElement)?.value;
                  const reportType = (document.getElementById('report-type') as HTMLSelectElement)?.value;
                  
                  if (reportName && reportType) {
                    const today = new Date();
                    let dateFrom = '';
                    let dateTo = today.toISOString().split('T')[0];
                    
                    if (reportType === 'daily') {
                      dateFrom = today.toISOString().split('T')[0];
                    } else if (reportType === 'weekly') {
                      const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                      dateFrom = weekStart.toISOString().split('T')[0];
                    } else if (reportType === 'monthly') {
                      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                      dateFrom = monthStart.toISOString().split('T')[0];
                    }
                    
                    generateReport(reportName, reportType, dateFrom, dateTo);
                  } else {
                    setError('Please fill in all fields');
                  }
                }}
                disabled={reportLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: reportLoading ? 'not-allowed' : 'pointer',
                  opacity: reportLoading ? 0.6 : 1
                }}
              >
                {reportLoading ? 'Generating Comprehensive Report...' : 'Generate Comprehensive Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              color: '#dc3545', 
              marginBottom: '20px' 
            }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Error</h3>
            <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowErrorModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              color: '#28a745', 
              marginBottom: '20px' 
            }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>Success</h3>
            <p style={{ color: '#666', marginBottom: '30px', fontSize: '16px' }}>
              {successMessageText}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowSuccessModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local Search Modal */}
      {showLocalSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px'
          }}>
             <h3 style={{ margin: '0 0 20px 0' }}>Generate Local Search Analysis</h3>
             <p style={{ color: '#666', marginBottom: '20px' }}>
               Create a comprehensive local search analysis for <strong>{selectedClient?.name}</strong> using real Google Places data:<br/><br/>
               <strong>🔍 Search Rankings:</strong> Track your position in local search results<br/>
               <strong>🏢 Competitor Analysis:</strong> Identify and analyze local competitors<br/>
               <strong>📊 Market Share:</strong> Estimate your local market position<br/>
               <strong>📈 Ranking Trends:</strong> Monitor ranking changes over time<br/>
               <strong>🎯 Market Gaps:</strong> Discover untapped opportunities<br/>
               <strong>💡 Local SEO Score:</strong> Overall local search performance
             </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Search Queries (one per line):</label>
                <textarea 
                  value={localSearchQueries}
                  onChange={(e) => setLocalSearchQueries(e.target.value)}
                  placeholder="e.g.,&#10;medical clinic near me&#10;family doctor&#10;healthcare services&#10;urgent care"
                  style={{ 
                    width: '100%', 
                    height: '120px',
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Enter search terms that potential patients might use to find your practice
                </small>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Search Radius (meters):</label>
                <select 
                  value={localSearchRadius}
                  onChange={(e) => setLocalSearchRadius(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value={5000}>5 km (5,000 meters)</option>
                  <option value={10000}>10 km (10,000 meters)</option>
                  <option value={15000}>15 km (15,000 meters)</option>
                  <option value={25000}>25 km (25,000 meters)</option>
                  <option value={50000}>50 km (50,000 meters)</option>
                </select>
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Larger radius will include more competitors but may be less relevant
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowLocalSearchModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!localSearchQueries.trim()) {
                    setErrorMessage('Please enter at least one search query');
                    setShowErrorModal(true);
                    return;
                  }

                  setLocalSearchLoading(true);
                  try {
                    const queries = localSearchQueries.split('\n').filter(q => q.trim());
                    
                    const response = await http.post(`/local-search/generate/${selectedClient?.id}`, {
                      search_queries: queries,
                      radius: localSearchRadius,
                      include_competitors: true,
                      include_rankings: true,
                      include_analysis: true
                    });

                    setSuccessMessageText('✅ Local search analysis generated successfully! Real Google Places data analyzed.');
                    setShowSuccessModal(true);
                    setShowLocalSearchModal(false);
                  } catch (error: any) {
                    const errorMsg = error.response?.data?.error || error.message || 'Failed to generate local search analysis';
                    setErrorMessage(`❌ ${errorMsg}`);
                    setShowErrorModal(true);
                  } finally {
                    setLocalSearchLoading(false);
                  }
                }}
                disabled={localSearchLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: localSearchLoading ? 'not-allowed' : 'pointer',
                  opacity: localSearchLoading ? 0.6 : 1
                }}
              >
                {localSearchLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Generating Analysis...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    Generate Local Search Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagementDashboard;
