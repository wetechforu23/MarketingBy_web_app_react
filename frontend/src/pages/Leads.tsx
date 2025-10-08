import React, { useEffect, useState } from 'react';
import { http } from '../api/http';

interface Lead {
  id: number;
  company: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  created_at: string;
  rejection_reason?: string;
  industry_category?: string;
  industry_subcategory?: string;
  website_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  compliance_status?: string;
  notes?: string;
}

interface LeadStats {
  totalLeads: number;
  inProcessLeads: number;
  todayScraped: number;
  violationStopped: number;
}

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [websiteToScrap, setWebsiteToScrap] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [showManualLeadModal, setShowManualLeadModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showEnhancedScrapingModal, setShowEnhancedScrapingModal] = useState(false);
  
  // Manual Lead Form State - matching actual database schema
  const [manualLeadForm, setManualLeadForm] = useState({
    company: '',
    email: '',
    phone: '',
    industry_category: '',
    industry_subcategory: '',
    source: 'Manual Entry',
    status: 'new',
    notes: '',
    website_url: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_first_name: '',
    contact_last_name: '',
    compliance_status: 'pending'
  });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  
  // Enhanced Scraping Form State
  const [enhancedScrapingForm, setEnhancedScrapingForm] = useState({
    type: 'individual', // 'individual' or 'location'
    website: '',
    address: '',
    zipCode: '',
    radius: 5,
    maxLeads: 20,
    state: ''
  });
  const [isEnhancedScraping, setIsEnhancedScraping] = useState(false);
  const [complianceResult, setComplianceResult] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch leads data
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await http.get('/leads');
      setLeads(response.data || []);
    } catch (err) {
      console.error('Failed to fetch leads data:', err);
      setError('Failed to load leads data.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch lead statistics
  const fetchLeadStats = async () => {
    try {
      const response = await http.get('/leads/stats');
      setLeadStats(response.data);
    } catch (err) {
      console.error('Failed to fetch lead stats:', err);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [leadsResponse, statsResponse] = await Promise.all([
          http.get('/leads'),
          http.get('/leads/stats')
        ]);
        
        setLeads(leadsResponse.data || []);
        setLeadStats(statsResponse.data);
      } catch (err) {
        console.error('Failed to fetch leads data:', err);
        setError('Failed to load leads data.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);



  // Filter leads based on search and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.website_url && lead.website_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (lead.source && lead.source.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || (lead.status && lead.status === statusFilter);
    const matchesSource = sourceFilter === 'all' || (lead.source && lead.source === sourceFilter);
    const matchesIndustry = industryFilter === 'all' || (lead.industry_category && lead.industry_category === industryFilter);
    
    // Date filtering
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const leadDate = lead.created_at ? new Date(lead.created_at) : new Date();
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDate = matchesDate && leadDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        matchesDate = matchesDate && leadDate <= toDate;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSource && matchesIndustry && matchesDate;
  });


  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Lead];
    let bValue: any = b[sortBy as keyof Lead];
    
    if (sortBy === 'created_at') {
      aValue = new Date(a.created_at).getTime();
      bValue = new Date(b.created_at).getTime();
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    // Handle undefined values
    if (aValue === undefined) aValue = '';
    if (bValue === undefined) bValue = '';
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedLeads.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedLeads = sortedLeads.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sourceFilter, industryFilter, dateFrom, dateTo, pageSize]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'badge-primary';
      case 'contacted': return 'badge-info';
      case 'qualified': return 'badge-primary';
      case 'converted': return 'badge-info';
      case 'rejected': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  };

  const getSourceBadgeClass = (source: string) => {
    switch (source) {
      case 'Website Scraping': return 'badge-info';
      case 'Google Maps': return 'badge-primary';
      case 'Manual Entry': return 'badge-secondary';
      case 'Referral': return 'badge-info';
      default: return 'badge-primary';
    }
  };

  const handleScrapeWebsite = async () => {
    if (!websiteToScrap.trim()) {
      alert('Please enter a website URL to scrape');
      return;
    }

    try {
      setIsScraping(true);
      const response = await http.post('/leads/scrape', {
        website_url: websiteToScrap
      });
      
      if (response.data.success) {
        // Refresh the leads data
        const [leadsResponse, statsResponse] = await Promise.all([
          http.get('/leads'),
          http.get('/leads/stats')
        ]);
        
        setLeads(leadsResponse.data || []);
        setLeadStats(statsResponse.data);
        setWebsiteToScrap('');
        alert('Website scraped successfully!');
      } else {
        alert('Failed to scrape website: ' + (response.data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to scrape website:', err);
      alert('Failed to scrape website. Please try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddManualLead = () => {
    // Reset form when opening modal
    setManualLeadForm({
      company: '',
      email: '',
      phone: '',
      industry_category: '',
      industry_subcategory: '',
      source: 'Manual Entry',
      status: 'new',
      notes: '',
      website_url: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      contact_first_name: '',
      contact_last_name: '',
      compliance_status: 'pending'
    });
    setShowManualLeadModal(true);
  };

  const handleManualLeadFormChange = (field: string, value: string) => {
    setManualLeadForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitManualLead = async () => {
    // Validate required fields
    if (!manualLeadForm.company || !manualLeadForm.email) {
      alert('Please fill in all required fields: Company and Email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualLeadForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmittingLead(true);
    try {
      // Prepare data exactly as it should be in the database
      const leadData = {
        company: manualLeadForm.company,
        email: manualLeadForm.email,
        phone: manualLeadForm.phone || null,
        industry_category: manualLeadForm.industry_category || null,
        industry_subcategory: manualLeadForm.industry_subcategory || null,
        source: manualLeadForm.source,
        status: manualLeadForm.status,
        notes: manualLeadForm.notes || null,
        website_url: manualLeadForm.website_url || null,
        address: manualLeadForm.address || null,
        city: manualLeadForm.city || null,
        state: manualLeadForm.state || null,
        zip_code: manualLeadForm.zip_code || null,
        contact_first_name: manualLeadForm.contact_first_name || null,
        contact_last_name: manualLeadForm.contact_last_name || null,
        compliance_status: manualLeadForm.compliance_status
      };

      const response = await http.post('/leads', leadData);
      
      if (response.data.success) {
        alert('Manual lead added successfully!');
        setShowManualLeadModal(false);
        
        // Refresh the leads data
        const [leadsResponse, statsResponse] = await Promise.all([
          http.get('/leads'),
          http.get('/leads/stats')
        ]);
        
        setLeads(leadsResponse.data || []);
        setLeadStats(statsResponse.data);
      } else {
        alert('Failed to add manual lead: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding manual lead:', error);
      alert('Failed to add manual lead. Please try again.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleEnhancedScraping = () => {
    setEnhancedScrapingForm({
      type: 'individual',
      website: '',
      address: '',
      zipCode: '',
      radius: 5,
      maxLeads: 20,
      state: ''
    });
    setComplianceResult(null);
    setShowEnhancedScrapingModal(true);
  };

  const handleEnhancedScrapingFormChange = (field: string, value: string | number) => {
    setEnhancedScrapingForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckCompliance = async () => {
    try {
      const response = await http.post('/scraping/check-compliance', enhancedScrapingForm);
      setComplianceResult(response.data.compliance);
    } catch (error) {
      console.error('Compliance check failed:', error);
      alert('Failed to check compliance. Please try again.');
    }
  };

  const handleSubmitEnhancedScraping = async () => {
    if (!complianceResult || !complianceResult.isCompliant) {
      alert('Please check compliance first and ensure all requirements are met.');
      return;
    }

    setIsEnhancedScraping(true);
    try {
      const endpoint = enhancedScrapingForm.type === 'individual' 
        ? '/scraping/individual' 
        : '/scraping/location';
      
      const payload = enhancedScrapingForm.type === 'individual'
        ? { website: enhancedScrapingForm.website, state: enhancedScrapingForm.state }
        : {
            address: enhancedScrapingForm.address,
            zipCode: enhancedScrapingForm.zipCode,
            radius: enhancedScrapingForm.radius,
            maxLeads: enhancedScrapingForm.maxLeads,
            state: enhancedScrapingForm.state
          };

      const response = await http.post(endpoint, payload);
      
      if (response.data.success) {
        const leadCount = response.data.leads.length;
        const leadDetails = response.data.leads.map(lead => `• ${lead.company || 'Unknown Company'}`).join('\n');
        
        alert(`Enhanced scraping completed successfully!\n\nFound ${leadCount} lead(s):\n${leadDetails}\n\nLeads have been saved to the database and will appear in the list below.`);
        
        setShowEnhancedScrapingModal(false);
        // Refresh both leads data and stats
        await fetchData();
        await fetchLeadStats();
      } else {
        alert(`Enhanced scraping failed: ${response.data.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Enhanced scraping failed:', error);
      alert('Enhanced scraping failed. Please try again.');
    } finally {
      setIsEnhancedScraping(false);
    }
  };

  const handleExportLeads = async () => {
    try {
      const response = await http.get('/leads/export');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting leads:', error);
      alert('Failed to export leads. Please try again.');
    }
  };

  const handleAnalytics = () => {
    setShowAnalyticsModal(true);
  };

  const handleCheckDuplicates = () => {
    setShowDuplicateModal(true);
  };

  const handleDeleteAllLeads = async () => {
    if (window.confirm('Are you sure you want to delete ALL leads? This action cannot be undone.')) {
      try {
        await http.delete('/leads/delete-all');
        alert('All leads have been deleted successfully.');
        window.location.reload();
      } catch (error) {
        console.error('Error deleting leads:', error);
        alert('Failed to delete leads. Please try again.');
      }
    }
  };

  const handleViewLead = (leadId: number) => {
    console.log('View lead clicked:', leadId);
    alert(`View lead details for ID: ${leadId} - Feature coming soon`);
  };

  const handleEditLead = (leadId: number) => {
    console.log('Edit lead clicked:', leadId);
    alert(`Edit lead for ID: ${leadId} - Feature coming soon`);
  };

  const handleContactLead = async (leadId: number, email: string) => {
    if (!email || email === 'N/A') {
      alert('No email address available for this lead.');
      return;
    }
    
    try {
      await http.post('/leads/contact', { leadId, email });
      alert(`Email sent successfully to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  const handleSEOAnalysis = async (leadId: number, website: string) => {
    if (!website) {
      alert('No website available for SEO analysis.');
      return;
    }
    
    try {
      const response = await http.post('/seo/analyze', { website, leadId });
      alert(`SEO Analysis completed for ${website}. Score: ${response.data.score}/100`);
    } catch (error) {
      console.error('Error running SEO analysis:', error);
      alert('Failed to run SEO analysis. Please try again.');
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      try {
        await http.delete(`/leads/${leadId}`);
        alert('Lead deleted successfully');
        fetchData();
        fetchLeadStats();
      } catch (error) {
        console.error('Error deleting lead:', error);
        alert('Failed to delete lead. Please try again.');
      }
    }
  };

  const handleSEOBasic = async (leadId: number, website: string) => {
    if (!website) {
      alert('No website available for SEO analysis.');
      return;
    }
    
    try {
      const response = await http.post('/seo/basic', { website, leadId });
      alert(`Basic SEO Analysis completed for ${website}. Score: ${response.data.score}/100`);
    } catch (error) {
      console.error('Error running basic SEO analysis:', error);
      alert('Failed to run basic SEO analysis. Please try again.');
    }
  };

  const handleSEOComprehensive = async (leadId: number, website: string) => {
    if (!website) {
      alert('No website available for SEO analysis.');
      return;
    }
    
    try {
      const response = await http.post('/seo/comprehensive', { website, leadId });
      alert(`Comprehensive SEO Analysis completed for ${website}. Score: ${response.data.score}/100`);
    } catch (error) {
      console.error('Error running comprehensive SEO analysis:', error);
      alert('Failed to run comprehensive SEO analysis. Please try again.');
    }
  };

  const handleConvertToClient = async (leadId: number) => {
    if (window.confirm('Are you sure you want to convert this lead to a client?')) {
      try {
        const response = await http.post('/leads/convert-to-client', { leadId });
        alert('Lead converted to client successfully');
        fetchData();
        fetchLeadStats();
      } catch (error) {
        console.error('Error converting lead to client:', error);
        alert('Failed to convert lead to client. Please try again.');
      }
    }
  };


  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading leads data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="leads-page">
      <style>{`
        /* Individual action buttons styling */
        .leads-page .action-buttons-container {
          display: flex !important;
          gap: 4px !important;
          flex-wrap: wrap !important;
          align-items: center !important;
        }
        
        .leads-page .action-buttons-container .btn {
          transition: all 0.2s ease !important;
          border-radius: 4px !important;
          min-width: 32px !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 11px !important;
          padding: 4px 8px !important;
        }
        
        .leads-page .action-buttons-container .btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        }
        
        .leads-page .action-buttons-container .btn:active {
          transform: translateY(0) !important;
        }
        
        .modern-filter-section {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.2);
        }
        .modern-filter-section .filter-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 16px !important;
        }
        .modern-filter-section .filter-title {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          font-weight: 600 !important;
          color: #1976d2 !important;
          font-size: 16px !important;
        }
        .modern-filter-section .filter-title i {
          color: #2196f3 !important;
          font-size: 18px !important;
        }
        .modern-filter-section .filter-actions {
          margin-left: auto !important;
        }
        .modern-filter-section .btn-clear-filters {
          background: linear-gradient(135deg, #ff5722 0%, #f44336 100%) !important;
          color: white !important;
          border: none !important;
          padding: 10px 16px !important;
          border-radius: 8px !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .modern-filter-section .btn-clear-filters:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4) !important;
        }
        .modern-filter-section .filter-row {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 16px !important;
          overflow-x: auto !important;
          padding-bottom: 8px !important;
          width: 100% !important;
          height: auto !important;
        }
        .modern-filter-section .filter-item {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          flex-shrink: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          float: none !important;
          clear: none !important;
          width: auto !important;
          height: auto !important;
          vertical-align: top !important;
        }
        .modern-filter-section .filter-select-inline,
        .modern-filter-section .filter-input-inline,
        .modern-filter-section .filter-date-inline {
          display: inline-block !important;
          width: 140px !important;
          height: 44px !important;
          margin: 0 !important;
          padding: 12px 16px !important;
          vertical-align: middle !important;
          float: none !important;
          clear: none !important;
          border: 2px solid rgba(33, 150, 243, 0.3) !important;
          border-radius: 10px !important;
          background: white !important;
          color: #1976d2 !important;
          font-weight: 500 !important;
          font-size: 14px !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1) !important;
        }
        .modern-filter-section .filter-select-inline:focus,
        .modern-filter-section .filter-input-inline:focus,
        .modern-filter-section .filter-date-inline:focus {
          outline: none !important;
          border-color: #2196f3 !important;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1) !important;
          transform: translateY(-1px) !important;
        }
        .modern-filter-section .filter-input-inline {
          width: 220px !important;
          min-width: 200px !important;
          max-width: 280px !important;
        }
        .modern-filter-section .filter-date-inline {
          width: 150px !important;
        }
        .modern-filter-section .filter-select-inline option {
          color: #1976d2 !important;
          font-weight: 500 !important;
        }
        
        /* Custom scrollbar for table */
        .table-responsive::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .table-responsive::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Smooth scrolling */
        .table-responsive {
          scroll-behavior: smooth;
        }
        
        /* Table row hover effects */
        .table tbody tr:hover {
          background-color: #f8f9fa;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        
        /* Sticky header styling */
        .table thead th {
          font-weight: 600;
          font-size: 14px;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
        }
        
        
        
      `}</style>
      <div className="page-header">
        <h1>Lead Management</h1>
        <p className="text-muted">Track and manage all leads from various sources with real-time statistics.</p>
      </div>

      {/* Statistics Cards */}
      {leadStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{leadStats.totalLeads}</div>
              <div className="stat-label">Total Leads</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{leadStats.inProcessLeads}</div>
              <div className="stat-label">In Process</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-calendar-day"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{leadStats.todayScraped}</div>
              <div className="stat-label">Today Scraped</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{leadStats.violationStopped}</div>
              <div className="stat-label">Violation Stopped</div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Filter Section */}
      <div className="modern-filter-section">
        <div className="filter-header">
          <div className="filter-title">
            <i className="fas fa-sliders-h"></i>
            <span>Advanced Filters</span>
          </div>
          <div className="filter-actions">
            <button
              className="btn-clear-filters"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setSourceFilter('all');
                setIndustryFilter('all');
                setDateFrom('');
                setDateTo('');
                // Also refresh the data to ensure we have the latest leads
                fetchData();
                fetchLeadStats();
              }}
            >
              <i className="fas fa-times"></i>
              Clear All & Refresh
            </button>
          </div>
        </div>
        
        <div className="filter-row">
          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="Website Scraping">Website Scraping</option>
              <option value="Google Maps">Google Maps</option>
              <option value="Manual Entry">Manual Entry</option>
              <option value="Referral">Referral</option>
            </select>
          </div>

          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
            >
              <option value="all">All Industries</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Dental">Dental</option>
              <option value="Veterinary">Veterinary</option>
              <option value="Fitness">Fitness</option>
            </select>
          </div>

          <div className="filter-item">
            <input
              type="date"
              className="filter-date-inline"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
          </div>

          <div className="filter-item">
            <input
              type="date"
              className="filter-date-inline"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>

          <div className="filter-item filter-search">
            <input
              type="text"
              className="filter-input-inline"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value="10">10/page</option>
              <option value="20">20/page</option>
              <option value="50">50/page</option>
              <option value="100">100/page</option>
            </select>
          </div>

          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at">Created Date</option>
              <option value="name">Business Name</option>
              <option value="status">Status</option>
              <option value="source">Source</option>
              <option value="industry_category">Industry</option>
            </select>
          </div>

          <div className="filter-item">
            <select
              className="filter-select-inline"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>All Leads ({sortedLeads.length})
          </h5>
        </div>
        
        <div className="card-body">
          {/* Action Buttons */}
          <div className="d-flex flex-wrap mb-4" style={{ 
            padding: '16px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '1px solid #e9ecef',
            gap: '12px'
          }}>
            <button 
              className="btn btn-primary" 
              onClick={handleAddManualLead}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-plus me-2"></i>Add Manual Lead
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleEnhancedScraping}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-search me-2"></i>Enhanced Scraping
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                fetchData();
                fetchLeadStats();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-sync-alt me-2"></i>Refresh
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleExportLeads}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-download me-2"></i>Export Leads
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleAnalytics}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-chart-bar me-2"></i>Analytics
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleCheckDuplicates}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-copy me-2"></i>Check Duplicates
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleDeleteAllLeads}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '2px solid #007bff',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minWidth: '140px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 123, 255, 0.2)';
              }}
            >
              <i className="fas fa-trash me-2"></i>Delete All Leads
            </button>
          </div>

        
        <div 
          className="table-responsive" 
          style={{ 
            maxHeight: '600px', 
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <table className="table table-striped table-hover mb-0">
            <thead 
              style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 10,
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}
            >
              <tr>
                <th style={{ minWidth: '60px', padding: '12px 8px' }}>ID</th>
                <th style={{ minWidth: '200px', padding: '12px 8px' }}>Company</th>
                <th style={{ minWidth: '200px', padding: '12px 8px' }}>Contact Email</th>
                <th style={{ minWidth: '150px', padding: '12px 8px' }}>Phone</th>
                <th style={{ minWidth: '200px', padding: '12px 8px' }}>Website</th>
                <th style={{ minWidth: '120px', padding: '12px 8px' }}>Source</th>
                <th style={{ minWidth: '100px', padding: '12px 8px' }}>Status</th>
                <th style={{ minWidth: '150px', padding: '12px 8px' }}>Industry</th>
                <th style={{ minWidth: '100px', padding: '12px 8px' }}>Created</th>
                <th style={{ minWidth: '120px', padding: '12px 8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No leads found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => (
                  <tr key={lead.id}>
                    <td>{lead.id}</td>
                    <td>
                      <div>
                        <strong>{lead.company}</strong>
                        {lead.rejection_reason && (
                          <div className="text-danger" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-exclamation-triangle"></i> {lead.rejection_reason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{lead.email || 'N/A'}</td>
                    <td>{lead.phone || 'N/A'}</td>
                    <td>
                      {lead.website_url ? (
                        <a 
                          href={lead.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary"
                          style={{ textDecoration: 'none' }}
                        >
                          <i className="fas fa-external-link-alt"></i> {lead.website_url}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getSourceBadgeClass(lead.source)}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <div>
                        {lead.industry_category && (
                          <div style={{ fontSize: '0.9rem' }}>{lead.industry_category}</div>
                        )}
                        {lead.industry_subcategory && (
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{lead.industry_subcategory}</div>
                        )}
                      </div>
                    </td>
                    <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons-container" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('View Details clicked for lead:', lead.id);
                            handleViewLead(lead.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="View Details"
                        >
                          <i className="fas fa-eye me-1"></i>View
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Edit Lead clicked for lead:', lead.id);
                            handleEditLead(lead.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Edit Lead"
                        >
                          <i className="fas fa-edit me-1"></i>Edit
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Contact Lead clicked for lead:', lead.id);
                            handleContactLead(lead.id, lead.email || '');
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Contact Lead"
                        >
                          <i className="fas fa-envelope me-1"></i>Contact
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('SEO Basic clicked for lead:', lead.id);
                            handleSEOBasic(lead.id, lead.website_url || lead.company || '');
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="SEO Basic"
                        >
                          <i className="fas fa-search me-1"></i>SEO Basic
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('SEO Comprehensive clicked for lead:', lead.id);
                            handleSEOComprehensive(lead.id, lead.website_url || lead.company || '');
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="SEO Comprehensive"
                        >
                          <i className="fas fa-chart-line me-1"></i>SEO Comp
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Convert to Client clicked for lead:', lead.id);
                            handleConvertToClient(lead.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Convert to Client"
                        >
                          <i className="fas fa-user-check me-1"></i>Convert
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete Lead clicked for lead:', lead.id);
                            handleDeleteLead(lead.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            minWidth: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete Lead"
                        >
                          <i className="fas fa-trash me-1"></i>Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <span className="text-muted">
                Showing {startIndex + 1} to {Math.min(endIndex, sortedLeads.length)} of {sortedLeads.length} leads
              </span>
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Summary Footer */}
        <div className="card-footer" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #dee2e6'
        }}>
          <div>
            Showing {sortedLeads.length} of {leads.length} leads
          </div>
          <div>
            {leadStats && (
              <span className="text-muted">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Manual Lead Modal */}
      {showManualLeadModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowManualLeadModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="modal-content manual-lead-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
              margin: 0,
              transform: 'none',
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            <div 
              className="modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 30px',
                borderBottom: '2px solid #e9ecef',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '16px 16px 0 0'
              }}
            >
              <h5 style={{ margin: 0, color: '#1976d2', fontWeight: 700, fontSize: '20px' }}>
                <i className="fas fa-user-plus me-2"></i>Add Manual Lead
              </h5>
              <button 
                className="btn-close" 
                onClick={() => setShowManualLeadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#6c757d',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#6c757d';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div 
              className="modal-body"
              style={{
                padding: '30px',
                background: 'white'
              }}
            >
              <form className="manual-lead-form">
                {/* Basic Information */}
                <div className="form-section">
                  <h6 className="form-section-title">
                    <i className="fas fa-user me-2"></i>Basic Information
                  </h6>
                  <div className="form-group">
                    <label htmlFor="company">Company Name *</label>
                    <input
                      type="text"
                      id="company"
                      className="form-control"
                      value={manualLeadForm.company}
                      onChange={(e) => handleManualLeadFormChange('company', e.target.value)}
                      placeholder="Enter company name"
                      required
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="contact_first_name">Contact First Name</label>
                        <input
                          type="text"
                          id="contact_first_name"
                          className="form-control"
                          value={manualLeadForm.contact_first_name}
                          onChange={(e) => handleManualLeadFormChange('contact_first_name', e.target.value)}
                          placeholder="Enter contact first name"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="contact_last_name">Contact Last Name</label>
                        <input
                          type="text"
                          id="contact_last_name"
                          className="form-control"
                          value={manualLeadForm.contact_last_name}
                          onChange={(e) => handleManualLeadFormChange('contact_last_name', e.target.value)}
                          placeholder="Enter contact last name"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="form-section">
                  <h6 className="form-section-title">
                    <i className="fas fa-building me-2"></i>Company Information
                  </h6>
                  <div className="form-group">
                    <label htmlFor="company">Company Name</label>
                    <input
                      type="text"
                      id="company"
                      className="form-control"
                      value={manualLeadForm.company}
                      onChange={(e) => handleManualLeadFormChange('company', e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="industry_category">Industry Category</label>
                        <select
                          id="industry_category"
                          className="form-control"
                          value={manualLeadForm.industry_category}
                          onChange={(e) => handleManualLeadFormChange('industry_category', e.target.value)}
                        >
                          <option value="">Select Industry Category</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Dental">Dental</option>
                          <option value="Mental Health">Mental Health</option>
                          <option value="Fitness">Fitness</option>
                          <option value="Beauty">Beauty</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="industry_subcategory">Industry Subcategory</label>
                        <select
                          id="industry_subcategory"
                          className="form-control"
                          value={manualLeadForm.industry_subcategory}
                          onChange={(e) => handleManualLeadFormChange('industry_subcategory', e.target.value)}
                        >
                          <option value="">Select Subcategory</option>
                          <option value="Primary Care">Primary Care</option>
                          <option value="Specialist Care">Specialist Care</option>
                          <option value="Urgent Care">Urgent Care</option>
                          <option value="General Dentistry">General Dentistry</option>
                          <option value="Orthodontics">Orthodontics</option>
                          <option value="Counseling">Counseling</option>
                          <option value="Therapy">Therapy</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                  <h6 className="form-section-title">
                    <i className="fas fa-phone me-2"></i>Contact Information
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="email">Email Address *</label>
                        <input
                          type="email"
                          id="email"
                          className="form-control"
                          value={manualLeadForm.email}
                          onChange={(e) => handleManualLeadFormChange('email', e.target.value)}
                          placeholder="Enter email address"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                          type="tel"
                          id="phone"
                          className="form-control"
                          value={manualLeadForm.phone}
                          onChange={(e) => handleManualLeadFormChange('phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="website_url">Website URL</label>
                    <input
                      type="url"
                      id="website_url"
                      className="form-control"
                      value={manualLeadForm.website_url}
                      onChange={(e) => handleManualLeadFormChange('website_url', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="form-section">
                  <h6 className="form-section-title">
                    <i className="fas fa-map-marker-alt me-2"></i>Address Information
                  </h6>
                  <div className="form-group">
                    <label htmlFor="address">Street Address</label>
                    <input
                      type="text"
                      id="address"
                      className="form-control"
                      value={manualLeadForm.address}
                      onChange={(e) => handleManualLeadFormChange('address', e.target.value)}
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="city">City</label>
                        <input
                          type="text"
                          id="city"
                          className="form-control"
                          value={manualLeadForm.city}
                          onChange={(e) => handleManualLeadFormChange('city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="state">State</label>
                        <input
                          type="text"
                          id="state"
                          className="form-control"
                          value={manualLeadForm.state}
                          onChange={(e) => handleManualLeadFormChange('state', e.target.value)}
                          placeholder="Enter state"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="zip_code">ZIP Code</label>
                        <input
                          type="text"
                          id="zip_code"
                          className="form-control"
                          value={manualLeadForm.zip_code}
                          onChange={(e) => handleManualLeadFormChange('zip_code', e.target.value)}
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lead Management */}
                <div className="form-section">
                  <h6 className="form-section-title">
                    <i className="fas fa-cogs me-2"></i>Lead Management
                  </h6>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                          id="status"
                          className="form-control"
                          value={manualLeadForm.status}
                          onChange={(e) => handleManualLeadFormChange('status', e.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="converted">Converted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="source">Source</label>
                        <select
                          id="source"
                          className="form-control"
                          value={manualLeadForm.source}
                          onChange={(e) => handleManualLeadFormChange('source', e.target.value)}
                        >
                          <option value="Manual Entry">Manual Entry</option>
                          <option value="Website Scraping">Website Scraping</option>
                          <option value="Google Maps">Google Maps</option>
                          <option value="Referral">Referral</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Trade Show">Trade Show</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label htmlFor="compliance_status">Compliance Status</label>
                        <select
                          id="compliance_status"
                          className="form-control"
                          value={manualLeadForm.compliance_status}
                          onChange={(e) => handleManualLeadFormChange('compliance_status', e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="under_review">Under Review</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      className="form-control"
                      rows={3}
                      value={manualLeadForm.notes}
                      onChange={(e) => handleManualLeadFormChange('notes', e.target.value)}
                      placeholder="Enter any additional notes about this lead..."
                    />
                  </div>
                </div>
              </form>
            </div>
            <div 
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '16px',
                padding: '24px 30px',
                borderTop: '2px solid #e9ecef',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '0 0 16px 16px'
              }}
            >
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowManualLeadModal(false)}
                disabled={isSubmittingLead}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #6c757d',
                  background: 'white',
                  color: '#6c757d',
                  fontWeight: '600',
                  cursor: isSubmittingLead ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingLead ? 0.6 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitManualLead}
                disabled={isSubmittingLead}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #1976d2',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: isSubmittingLead ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingLead ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}
              >
                {isSubmittingLead ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Adding Lead...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus me-2"></i>
                    Add Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Scraping Modal */}
      {showEnhancedScrapingModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowEnhancedScrapingModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            <div 
              className="modal-header"
              style={{
                padding: '24px 30px 20px',
                borderBottom: '2px solid #e9ecef',
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                color: 'white',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h5 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600' }}>
                <i className="fas fa-search-plus me-2"></i>
                Enhanced Scraping
              </h5>
              <button 
                className="btn-close"
                onClick={() => setShowEnhancedScrapingModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div 
              className="modal-body"
              style={{
                padding: '30px',
                maxHeight: '60vh',
                overflow: 'auto'
              }}
            >
              {/* Scraping Type Selection */}
              <div className="form-section mb-4">
                <h6 className="form-section-title mb-3">
                  <i className="fas fa-cog me-2"></i>Scraping Type
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="scrapingType"
                        id="individualType"
                        value="individual"
                        checked={enhancedScrapingForm.type === 'individual'}
                        onChange={(e) => handleEnhancedScrapingFormChange('type', e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="individualType">
                        <strong>Individual Website</strong>
                        <br />
                        <small className="text-muted">Scrape a specific website for business information</small>
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="scrapingType"
                        id="locationType"
                        value="location"
                        checked={enhancedScrapingForm.type === 'location'}
                        onChange={(e) => handleEnhancedScrapingFormChange('type', e.target.value)}
                      />
                      <label className="form-check-label" htmlFor="locationType">
                        <strong>Location-Based Search</strong>
                        <br />
                        <small className="text-muted">Find businesses near an address or zip code</small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Website Form */}
              {enhancedScrapingForm.type === 'individual' && (
                <div className="form-section mb-4">
                  <h6 className="form-section-title mb-3">
                    <i className="fas fa-globe me-2"></i>Website Information
                  </h6>
                  <div className="form-group mb-3">
                    <label htmlFor="website">Website URL *</label>
                    <input
                      type="url"
                      id="website"
                      className="form-control"
                      value={enhancedScrapingForm.website}
                      onChange={(e) => handleEnhancedScrapingFormChange('website', e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label htmlFor="state">State (Optional)</label>
                    <select
                      id="state"
                      className="form-control"
                      value={enhancedScrapingForm.state}
                      onChange={(e) => handleEnhancedScrapingFormChange('state', e.target.value)}
                    >
                      <option value="">Select State</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      <option value="IL">Illinois</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="OH">Ohio</option>
                      <option value="GA">Georgia</option>
                      <option value="NC">North Carolina</option>
                      <option value="MI">Michigan</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Location-Based Form */}
              {enhancedScrapingForm.type === 'location' && (
                <div className="form-section mb-4">
                  <h6 className="form-section-title mb-3">
                    <i className="fas fa-map-marker-alt me-2"></i>Location Information
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="address">Address (Optional)</label>
                        <input
                          type="text"
                          id="address"
                          className="form-control"
                          value={enhancedScrapingForm.address}
                          onChange={(e) => handleEnhancedScrapingFormChange('address', e.target.value)}
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="zipCode">Zip Code (Optional)</label>
                        <input
                          type="text"
                          id="zipCode"
                          className="form-control"
                          value={enhancedScrapingForm.zipCode}
                          onChange={(e) => handleEnhancedScrapingFormChange('zipCode', e.target.value)}
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="radius">Search Radius (miles)</label>
                        <input
                          type="number"
                          id="radius"
                          className="form-control"
                          value={enhancedScrapingForm.radius}
                          onChange={(e) => handleEnhancedScrapingFormChange('radius', parseInt(e.target.value))}
                          min="1"
                          max="25"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group mb-3">
                        <label htmlFor="maxLeads">Maximum Leads</label>
                        <input
                          type="number"
                          id="maxLeads"
                          className="form-control"
                          value={enhancedScrapingForm.maxLeads}
                          onChange={(e) => handleEnhancedScrapingFormChange('maxLeads', parseInt(e.target.value))}
                          min="1"
                          max="50"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-group mb-3">
                    <label htmlFor="locationState">State (Optional)</label>
                    <select
                      id="locationState"
                      className="form-control"
                      value={enhancedScrapingForm.state}
                      onChange={(e) => handleEnhancedScrapingFormChange('state', e.target.value)}
                    >
                      <option value="">Select State</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                      <option value="IL">Illinois</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="OH">Ohio</option>
                      <option value="GA">Georgia</option>
                      <option value="NC">North Carolina</option>
                      <option value="MI">Michigan</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Compliance Check Section */}
              <div className="form-section mb-4">
                <h6 className="form-section-title mb-3">
                  <i className="fas fa-shield-alt me-2"></i>Compliance Check
                </h6>
                <button 
                  type="button"
                  className="btn btn-warning mb-3"
                  onClick={handleCheckCompliance}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '2px solid #ffc107',
                    background: 'linear-gradient(135deg, #ffc107 0%, #ff8f00 100%)',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className="fas fa-check-circle me-2"></i>
                  Check Compliance
                </button>

                {complianceResult && (
                  <div 
                    className={`alert ${complianceResult.isCompliant ? 'alert-success' : 'alert-danger'}`}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `2px solid ${complianceResult.isCompliant ? '#28a745' : '#dc3545'}`,
                      background: complianceResult.isCompliant ? '#d4edda' : '#f8d7da',
                      color: complianceResult.isCompliant ? '#155724' : '#721c24'
                    }}
                  >
                    <h6>
                      <i className={`fas ${complianceResult.isCompliant ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                      Compliance Status: {complianceResult.isCompliant ? 'Compliant' : 'Non-Compliant'}
                    </h6>
                    
                    {complianceResult.restrictions.length > 0 && (
                      <div className="mb-2">
                        <strong>Restrictions:</strong>
                        <ul className="mb-0">
                          {complianceResult.restrictions.map((restriction: string, index: number) => (
                            <li key={index}>{restriction}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {complianceResult.warnings.length > 0 && (
                      <div>
                        <strong>Warnings:</strong>
                        <ul className="mb-0">
                          {complianceResult.warnings.map((warning: string, index: number) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div 
              className="modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '16px',
                padding: '24px 30px',
                borderTop: '2px solid #e9ecef',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '0 0 16px 16px'
              }}
            >
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowEnhancedScrapingModal(false)}
                disabled={isEnhancedScraping}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #6c757d',
                  background: 'white',
                  color: '#6c757d',
                  fontWeight: '600',
                  cursor: isEnhancedScraping ? 'not-allowed' : 'pointer',
                  opacity: isEnhancedScraping ? 0.6 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitEnhancedScraping}
                disabled={isEnhancedScraping || !complianceResult || !complianceResult.isCompliant}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: '2px solid #1976d2',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: (isEnhancedScraping || !complianceResult || !complianceResult.isCompliant) ? 'not-allowed' : 'pointer',
                  opacity: (isEnhancedScraping || !complianceResult || !complianceResult.isCompliant) ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                }}
              >
                {isEnhancedScraping ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Scraping...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search me-2"></i>
                    Start Scraping
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="modal-overlay" onClick={() => setShowAnalyticsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5>Lead Analytics</h5>
              <button 
                className="btn-close" 
                onClick={() => setShowAnalyticsModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Analytics dashboard will be implemented here.</p>
              <p>This will include:</p>
              <ul>
                <li>Lead conversion rates</li>
                <li>Source performance</li>
                <li>Industry breakdown</li>
                <li>Time-based trends</li>
                <li>Geographic distribution</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAnalyticsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Check Modal */}
      {showDuplicateModal && (
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5>Check for Duplicates</h5>
              <button 
                className="btn-close" 
                onClick={() => setShowDuplicateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Duplicate detection system will be implemented here.</p>
              <p>This will check for:</p>
              <ul>
                <li>Duplicate email addresses</li>
                <li>Similar business names</li>
                <li>Same phone numbers</li>
                <li>Identical website URLs</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDuplicateModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-warning">
                Check Duplicates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
