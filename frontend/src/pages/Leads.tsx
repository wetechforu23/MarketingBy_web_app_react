import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  assigned_to?: number;
  assigned_to_name?: string;
  assigned_by?: number;
  assigned_by_name?: string;
  assigned_at?: string;
  assignment_notes?: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface LeadStats {
  totalLeads: number;
  inProcessLeads: number;
  todayScraped: number;
  violationStopped: number;
}

const Leads: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Team members list for assignment
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showMyLeadsOnly, setShowMyLeadsOnly] = useState(false);
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
  
  // Selection and bulk delete state
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

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

  // Fetch team members for assignment dropdown
  const fetchTeamMembers = async () => {
    try {
      const response = await http.get('/users');
      setTeamMembers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    }
  };

  // Fetch current user info
  const fetchCurrentUser = async () => {
    try {
      const response = await http.get('/auth/me');
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  // Assign lead to team member
  const handleAssignLead = async (leadId: number, assignedTo: number | null) => {
    try {
      if (assignedTo === null) {
        // Unassign
        await http.post('/lead-assignment/unassign', { lead_id: leadId });
        alert('✅ Lead unassigned successfully');
      } else {
        // Assign
        await http.post('/lead-assignment/assign', {
          lead_id: leadId,
          assigned_to: assignedTo,
          reason: 'manual_assignment'
        });
        alert('✅ Lead assigned successfully');
      }
      
      // Refresh leads
      await fetchData();
    } catch (err) {
      console.error('Failed to assign lead:', err);
      alert('❌ Failed to assign lead. Please try again.');
    }
  };

  // Bulk assign selected leads
  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead');
      return;
    }

    const assignedTo = prompt('Enter user ID to assign these leads to:');
    if (!assignedTo) return;

    try {
      await http.post('/lead-assignment/bulk-assign', {
        lead_ids: selectedLeads,
        assigned_to: parseInt(assignedTo),
        reason: 'bulk_assignment'
      });
      
      alert(`✅ Successfully assigned ${selectedLeads.length} leads`);
      setSelectedLeads([]);
      setSelectAll(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to bulk assign leads:', err);
      alert('❌ Failed to assign leads. Please try again.');
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
        
        // Also fetch team members and current user
        await Promise.all([
          fetchTeamMembers(),
          fetchCurrentUser()
        ]);
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
    
    // Assignment filtering
    let matchesAssignment = true;
    if (assignedToFilter === 'unassigned') {
      matchesAssignment = !lead.assigned_to;
    } else if (assignedToFilter === 'assigned') {
      matchesAssignment = !!lead.assigned_to;
    } else if (assignedToFilter !== 'all') {
      matchesAssignment = lead.assigned_to === parseInt(assignedToFilter);
    }
    
    // "My Leads" filter
    if (showMyLeadsOnly && currentUser) {
      matchesAssignment = lead.assigned_to === currentUser.id;
    }
    
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
    
    return matchesSearch && matchesStatus && matchesSource && matchesIndustry && matchesAssignment && matchesDate;
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
  }, [searchTerm, statusFilter, sourceFilter, industryFilter, assignedToFilter, showMyLeadsOnly, dateFrom, dateTo, pageSize]);

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <i className="fas fa-sort ms-2" style={{ opacity: 0.3 }}></i>;
    }
    return sortOrder === 'asc' 
      ? <i className="fas fa-sort-up ms-2"></i>
      : <i className="fas fa-sort-down ms-2"></i>;
  };

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

    // Auto-generate search query when industry category or subcategory changes
    if (field === 'industryCategory' && value) {
      const categoryKeywords: { [key: string]: string } = {
        'primary_care': 'primary care clinic doctor family medicine',
        'dental': 'dental dentist orthodontist',
        'specialty': 'specialist medical doctor',
        'urgent_care': 'urgent care walk-in clinic emergency',
        'mental_health': 'psychiatrist psychologist therapist counselor',
        'physical_therapy': 'physical therapy rehabilitation',
        'alternative': 'chiropractic acupuncture massage naturopathy',
        'diagnostics': 'radiology laboratory imaging',
        'pharmacy': 'pharmacy pharmacist drugstore'
      };
      setEnhancedScrapingForm(prev => ({
        ...prev,
        [field]: value,
        searchQuery: categoryKeywords[value as string] || ''
      }));
    } else if (field === 'industrySubcategory' && value) {
      const subcategoryKeywords: { [key: string]: string } = {
        // Primary Care
        'family_medicine': 'family medicine doctor physician',
        'internal_medicine': 'internal medicine internist',
        'pediatrics': 'pediatrician pediatric children',
        'general_practice': 'general practitioner doctor',
        // Dental
        'general_dentist': 'general dentist dental',
        'orthodontics': 'orthodontist braces',
        'oral_surgery': 'oral surgeon dental surgery',
        'pediatric_dentist': 'pediatric dentist children',
        'cosmetic_dentist': 'cosmetic dentist',
        // Specialties
        'cardiology': 'cardiologist heart doctor',
        'dermatology': 'dermatologist skin doctor',
        'neurology': 'neurologist brain doctor',
        'oncology': 'oncologist cancer doctor',
        'orthopedics': 'orthopedist bone doctor',
        'gastroenterology': 'gastroenterologist digestive',
        'endocrinology': 'endocrinologist diabetes hormone',
        // Urgent Care
        'urgent_care_center': 'urgent care center',
        'walk_in_clinic': 'walk-in clinic',
        'emergency_room': 'emergency room ER',
        // Mental Health
        'psychiatry': 'psychiatrist mental health',
        'psychology': 'psychologist therapist',
        'counseling': 'counselor therapist',
        'therapy': 'therapist counseling',
        // Physical Therapy
        'physical_therapy': 'physical therapist PT',
        'occupational_therapy': 'occupational therapist OT',
        'sports_medicine': 'sports medicine',
        'rehabilitation': 'rehabilitation rehab',
        // Alternative
        'chiropractic': 'chiropractor chiropractic',
        'acupuncture': 'acupuncture acupuncturist',
        'massage': 'massage therapist',
        'naturopathy': 'naturopath naturopathic',
        // Diagnostics
        'radiology': 'radiology radiologist imaging',
        'laboratory': 'laboratory lab',
        'imaging_center': 'imaging center MRI CT',
        // Pharmacy
        'retail_pharmacy': 'pharmacy drugstore',
        'specialty_pharmacy': 'specialty pharmacy',
        'compounding': 'compounding pharmacy'
      };
      setEnhancedScrapingForm(prev => ({
        ...prev,
        [field]: value,
        searchQuery: subcategoryKeywords[value as string] || prev.searchQuery
      }));
    }
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

    // Validate zip code is required for location-based search
    if (enhancedScrapingForm.type === 'location') {
      if (!enhancedScrapingForm.zipCode || enhancedScrapingForm.zipCode.trim() === '') {
        alert('⚠️ Zip Code is required for location-based search.\n\nPlease enter a valid 5-digit zip code to continue.');
        return;
      }
      
      // Validate zip code format (5 digits)
      if (!/^\d{5}$/.test(enhancedScrapingForm.zipCode.trim())) {
        alert('⚠️ Invalid Zip Code format.\n\nPlease enter a valid 5-digit zip code (e.g., 75013).');
        return;
      }
    }

    setIsEnhancedScraping(true);
    try {
      let endpoint = '';
      let payload: any = {};

      if (enhancedScrapingForm.type === 'individual') {
        endpoint = '/scraping/individual';
        payload = { 
          website: enhancedScrapingForm.website, 
          state: enhancedScrapingForm.state 
        };
      } else if (enhancedScrapingForm.type === 'location') {
        endpoint = '/scraping/location';
        payload = {
          searchQuery: enhancedScrapingForm.searchQuery, // Include keyword search
          address: enhancedScrapingForm.address,
          zipCode: enhancedScrapingForm.zipCode.trim(), // Always use zip code as main criteria
          radius: enhancedScrapingForm.radius,
          maxLeads: enhancedScrapingForm.maxLeads,
          state: enhancedScrapingForm.state
        };
      }

      const response = await http.post(endpoint, payload);
      
      if (response.data.success) {
        const totalFound = response.data.totalFound || response.data.leads.length;
        const totalSaved = response.data.totalSaved || response.data.leads.length;
        const skipped = response.data.skipped || 0;
        
        let message = `Enhanced scraping completed successfully!\n\n`;
        message += `📊 Results:\n`;
        message += `• Total Found: ${totalFound} businesses\n`;
        message += `• New Leads Saved: ${totalSaved}\n`;
        
        if (skipped > 0) {
          message += `• Duplicates Skipped: ${skipped} (already in database)\n\n`;
          message += `ℹ️ Duplicates were detected using:\n`;
          message += `  - Google Place ID\n`;
          message += `  - Phone Number\n`;
          message += `  - Website URL\n\n`;
        }
        
        if (totalSaved > 0) {
          const leadDetails = response.data.leads.slice(0, 5).map(lead => 
            `• ${lead.company || 'Unknown Company'}${lead.city ? ' - ' + lead.city : ''}`
          ).join('\n');
          message += `\n✅ New Leads Added:\n${leadDetails}`;
          if (totalSaved > 5) {
            message += `\n... and ${totalSaved - 5} more`;
          }
        }
        
        message += `\n\n🔄 The leads list will refresh now.`;
        
        alert(message);
        
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
    navigate(`/leads/${leadId}`);
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

  // Checkbox selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(sortedLeads.map(lead => lead.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectLead = (leadId: number) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedLeads, leadId];
      setSelectedLeads(newSelected);
      if (newSelected.length === sortedLeads.length) {
        setSelectAll(true);
      }
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select leads to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedLeads.length} selected lead(s)? This action cannot be undone.`)) {
      try {
        await http.post('/leads/bulk-delete', { leadIds: selectedLeads });
        alert(`${selectedLeads.length} lead(s) deleted successfully`);
        setSelectedLeads([]);
        setSelectAll(false);
        fetchData();
        fetchLeadStats();
      } catch (error) {
        console.error('Error deleting leads:', error);
        alert('Failed to delete leads. Please try again.');
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
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '12px',
            border: '1px solid #e9ecef',
            gap: '16px',
            rowGap: '16px'
          }}>
            <button 
              className="btn btn-primary" 
              onClick={handleAddManualLead}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '160px',
                marginRight: '12px',
                marginBottom: '12px'
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
            
            {/* Delete Selected Button - Only show when leads are selected */}
            {selectedLeads.length > 0 && (
              <>
                <button 
                  className="btn btn-danger" 
                  onClick={handleBulkDelete}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '2px solid #dc3545',
                    boxShadow: '0 2px 6px rgba(220, 53, 69, 0.2)',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    minWidth: '160px',
                    marginRight: '12px',
                    marginBottom: '12px',
                    backgroundColor: '#dc3545',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(220, 53, 69, 0.2)';
                  }}
                >
                  <i className="fas fa-trash me-2"></i>Delete Selected ({selectedLeads.length})
                </button>
                
                {/* Bulk Assign Button */}
                <button 
                  className="btn btn-warning" 
                  onClick={handleBulkAssign}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '2px solid #ffc107',
                    boxShadow: '0 2px 6px rgba(255, 193, 7, 0.2)',
                    fontWeight: '600',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    minWidth: '160px',
                    marginRight: '12px',
                    marginBottom: '12px',
                    backgroundColor: '#ffc107',
                    color: '#333'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(255, 193, 7, 0.2)';
                  }}
                >
                  <i className="fas fa-user-plus me-2"></i>Assign Selected ({selectedLeads.length})
                </button>
              </>
            )}
            
            {/* My Leads Toggle Button */}
            {currentUser && (
              <button 
                className={`btn ${showMyLeadsOnly ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setShowMyLeadsOnly(!showMyLeadsOnly)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '2px solid #28a745',
                  boxShadow: '0 2px 6px rgba(40, 167, 69, 0.2)',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  minWidth: '160px',
                  marginRight: '12px',
                  marginBottom: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(40, 167, 69, 0.2)';
                }}
              >
                <i className={`fas ${showMyLeadsOnly ? 'fa-user-check' : 'fa-user'} me-2`}></i>
                {showMyLeadsOnly ? 'My Leads (ON)' : 'Show My Leads'}
              </button>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={handleEnhancedScraping}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '160px',
                marginRight: '12px',
                marginBottom: '12px'
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
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '160px',
                marginRight: '12px',
                marginBottom: '12px'
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
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '160px',
                marginRight: '12px',
                marginBottom: '12px'
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
              onClick={handleCheckDuplicates}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid #000000',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '160px',
                marginRight: '12px',
                marginBottom: '12px'
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
                <th style={{ minWidth: '50px', padding: '12px 8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </th>
                <th 
                  style={{ minWidth: '60px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('id')}
                >
                  ID {getSortIcon('id')}
                </th>
                <th 
                  style={{ minWidth: '200px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('company')}
                >
                  Company {getSortIcon('company')}
                </th>
                <th 
                  style={{ minWidth: '200px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('email')}
                >
                  Contact Email {getSortIcon('email')}
                </th>
                <th 
                  style={{ minWidth: '150px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('phone')}
                >
                  Phone {getSortIcon('phone')}
                </th>
                <th 
                  style={{ minWidth: '200px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('website_url')}
                >
                  Website {getSortIcon('website_url')}
                </th>
                <th 
                  style={{ minWidth: '250px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('address')}
                >
                  Address {getSortIcon('address')}
                </th>
                <th 
                  style={{ minWidth: '100px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
                <th 
                  style={{ minWidth: '150px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('industry_category')}
                >
                  Industry {getSortIcon('industry_category')}
                </th>
                <th 
                  style={{ minWidth: '160px', padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('created_at')}
                >
                  Created Date & Time {getSortIcon('created_at')}
                </th>
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
                  <tr key={lead.id} style={{ backgroundColor: selectedLeads.includes(lead.id) ? '#e3f2fd' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td>{lead.id}</td>
                    <td>
                      <div>
                        <strong 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔍 Navigating to lead detail page:', lead.id, lead.company);
                            navigate(`/app/leads/${lead.id}`);
                          }}
                          style={{ 
                            cursor: 'pointer', 
                            color: '#1976d2',
                            textDecoration: 'none',
                            position: 'relative',
                            zIndex: 100,
                            display: 'inline-block',
                            padding: '2px 4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                            e.currentTarget.style.color = '#0d47a1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                            e.currentTarget.style.color = '#1976d2';
                          }}
                        >
                          {lead.website_url ? (
                            (() => {
                              try {
                                return new URL(lead.website_url).hostname.replace('www.', '');
                              } catch {
                                return lead.company;
                              }
                            })()
                          ) : (
                            lead.company
                          )}
                        </strong>
                        {lead.rejection_reason && (
                          <div className="text-danger" style={{ fontSize: '0.8rem' }}>
                            <i className="fas fa-exclamation-triangle"></i> {lead.rejection_reason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{lead.email || ''}</td>
                    <td>{lead.phone || ''}</td>
                    <td>
                      {lead.website_url ? (
                        <a 
                          href={lead.website_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary"
                          style={{ textDecoration: 'none' }}
                          title={lead.website_url}
                        >
                          <i className="fas fa-external-link-alt me-1"></i>
                          {(() => {
                            try {
                              return new URL(lead.website_url).hostname.replace('www.', '');
                            } catch {
                              return lead.website_url;
                            }
                          })()}
                        </a>
                      ) : (
                        ''
                      )}
                    </td>
                    <td>
                      {lead.address ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary"
                          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Open in Google Maps"
                        >
                          <i className="fas fa-map-marker-alt" style={{ color: '#dc3545' }}></i>
                          {lead.address.length > 50 ? lead.address.substring(0, 50) + '...' : lead.address}
                        </a>
                      ) : (
                        ''
                      )}
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
                    <td style={{ fontSize: '0.85rem' }}>
                      <div>{new Date(lead.created_at).toLocaleDateString()}</div>
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>
                        {new Date(lead.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination Section - Clean Design */}
        {totalPages > 0 && (
          <div className="mt-3">
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* Left: Pagination Info */}
              <div style={{ 
                fontSize: '0.95rem', 
                color: '#495057',
                fontWeight: '500'
              }}>
                Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(endIndex, sortedLeads.length)}</strong> of <strong>{sortedLeads.length}</strong> leads
              </div>

              {/* Center: Page Navigation */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #4682B4',
                      color: currentPage === 1 ? '#adb5bd' : '#4682B4',
                      backgroundColor: 'white',
                      padding: '8px 14px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      lineHeight: '1'
                    }}
                  >
                    ‹
                  </button>
                  
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
                      <button 
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid #4682B4',
                          color: currentPage === pageNum ? 'white' : '#4682B4',
                          backgroundColor: currentPage === pageNum ? '#4682B4' : 'white',
                          padding: '6px 12px',
                          minWidth: '38px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.backgroundColor = '#e3f2fd';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== pageNum) {
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      borderRadius: '6px',
                      border: '1px solid #4682B4',
                      color: currentPage === totalPages ? '#adb5bd' : '#4682B4',
                      backgroundColor: 'white',
                      padding: '8px 14px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      lineHeight: '1'
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Right: Items per page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ 
                  fontSize: '0.9rem', 
                  color: '#495057',
                  marginBottom: 0,
                  whiteSpace: 'nowrap',
                  fontWeight: '500'
                }}>
                  Per page:
                </label>
                <select 
                  className="form-select form-select-sm"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#4682B4',
                    border: '1px solid #4682B4',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    width: 'auto',
                    minWidth: '80px'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
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
                        <small className="text-muted">Scrape a specific website URL</small>
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
                        <small className="text-muted">Find businesses by location or keywords</small>
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
                  
                  {/* Industry Filters */}
                  <div className="form-group mb-4" style={{
                    backgroundColor: '#fff3e0',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #ff9800'
                  }}>
                    <label style={{ fontWeight: '600', color: '#e65100', marginBottom: '12px' }}>
                      <i className="fas fa-filter me-2"></i>Industry Filters (Optional)
                    </label>
                    
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="industryCategory" className="form-label" style={{ fontSize: '13px' }}>
                          1. Select Industry Category
                        </label>
                        <select
                          id="industryCategory"
                          className="form-control"
                          value={enhancedScrapingForm.industryCategory || ''}
                          onChange={(e) => {
                            handleEnhancedScrapingFormChange('industryCategory', e.target.value);
                            handleEnhancedScrapingFormChange('industrySubcategory', ''); // Reset subcategory
                          }}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #ff9800',
                            padding: '10px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <option value="">All Healthcare Industries</option>
                          <option value="primary_care">Primary Care</option>
                          <option value="dental">Dental</option>
                          <option value="specialty">Medical Specialties</option>
                          <option value="urgent_care">Urgent Care & Emergency</option>
                          <option value="mental_health">Mental Health</option>
                          <option value="physical_therapy">Physical Therapy & Rehab</option>
                          <option value="alternative">Alternative Medicine</option>
                          <option value="diagnostics">Diagnostics & Imaging</option>
                          <option value="pharmacy">Pharmacy</option>
                        </select>
                      </div>

                      <div className="col-md-6 mb-3">
                        <label htmlFor="industrySubcategory" className="form-label" style={{ fontSize: '13px' }}>
                          2. Select Subcategory
                        </label>
                        <select
                          id="industrySubcategory"
                          className="form-control"
                          value={enhancedScrapingForm.industrySubcategory || ''}
                          onChange={(e) => handleEnhancedScrapingFormChange('industrySubcategory', e.target.value)}
                          disabled={!enhancedScrapingForm.industryCategory}
                          style={{
                            borderRadius: '8px',
                            border: '2px solid #ff9800',
                            padding: '10px',
                            fontSize: '14px',
                            fontWeight: '500',
                            opacity: !enhancedScrapingForm.industryCategory ? 0.5 : 1
                          }}
                        >
                          <option value="">All Subcategories</option>
                          {enhancedScrapingForm.industryCategory === 'primary_care' && (
                            <>
                              <option value="family_medicine">Family Medicine</option>
                              <option value="internal_medicine">Internal Medicine</option>
                              <option value="pediatrics">Pediatrics</option>
                              <option value="general_practice">General Practice</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'dental' && (
                            <>
                              <option value="general_dentist">General Dentistry</option>
                              <option value="orthodontics">Orthodontics</option>
                              <option value="oral_surgery">Oral Surgery</option>
                              <option value="pediatric_dentist">Pediatric Dentistry</option>
                              <option value="cosmetic_dentist">Cosmetic Dentistry</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'specialty' && (
                            <>
                              <option value="cardiology">Cardiology</option>
                              <option value="dermatology">Dermatology</option>
                              <option value="neurology">Neurology</option>
                              <option value="oncology">Oncology</option>
                              <option value="orthopedics">Orthopedics</option>
                              <option value="gastroenterology">Gastroenterology</option>
                              <option value="endocrinology">Endocrinology</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'urgent_care' && (
                            <>
                              <option value="urgent_care_center">Urgent Care Center</option>
                              <option value="walk_in_clinic">Walk-in Clinic</option>
                              <option value="emergency_room">Emergency Room</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'mental_health' && (
                            <>
                              <option value="psychiatry">Psychiatry</option>
                              <option value="psychology">Psychology</option>
                              <option value="counseling">Counseling</option>
                              <option value="therapy">Therapy</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'physical_therapy' && (
                            <>
                              <option value="physical_therapy">Physical Therapy</option>
                              <option value="occupational_therapy">Occupational Therapy</option>
                              <option value="sports_medicine">Sports Medicine</option>
                              <option value="rehabilitation">Rehabilitation</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'alternative' && (
                            <>
                              <option value="chiropractic">Chiropractic</option>
                              <option value="acupuncture">Acupuncture</option>
                              <option value="massage">Massage Therapy</option>
                              <option value="naturopathy">Naturopathy</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'diagnostics' && (
                            <>
                              <option value="radiology">Radiology</option>
                              <option value="laboratory">Laboratory</option>
                              <option value="imaging_center">Imaging Center</option>
                            </>
                          )}
                          {enhancedScrapingForm.industryCategory === 'pharmacy' && (
                            <>
                              <option value="retail_pharmacy">Retail Pharmacy</option>
                              <option value="specialty_pharmacy">Specialty Pharmacy</option>
                              <option value="compounding">Compounding Pharmacy</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <small className="text-muted d-block mt-2">
                      <i className="fas fa-info-circle me-1"></i>
                      Select an industry to narrow your search. The keyword field below will be auto-populated based on your selection.
                    </small>
                  </div>

                  {/* Keyword Search Field */}
                  <div className="form-group mb-4" style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e3f2fd'
                  }}>
                    <label htmlFor="searchQuery" style={{ fontWeight: '600', color: '#1976d2' }}>
                      <i className="fas fa-search me-2"></i>3. Search Keywords (Optional) - Supports Wildcards
                    </label>
                    <textarea
                      id="searchQuery"
                      className="form-control"
                      rows={2}
                      value={enhancedScrapingForm.searchQuery || ''}
                      onChange={(e) => handleEnhancedScrapingFormChange('searchQuery', e.target.value)}
                      placeholder='e.g., "primary care*", "*clinic*", "pediatric* dentist", "*urgent care"'
                      style={{
                        borderRadius: '8px',
                        border: '2px solid #bdbdbd',
                        padding: '12px',
                        fontSize: '14px',
                        marginTop: '8px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small className="text-muted mt-2 d-block">
                      <i className="fas fa-magic me-1" style={{ color: '#9c27b0' }}></i>
                      Use <strong>*</strong> as wildcard: <code>*care</code> finds "urgent care", "primary care", etc. | 
                      <code>dental*</code> finds "dental clinic", "dentistry", etc. | 
                      <code>*clinic*</code> finds any clinic
                    </small>
                  </div>

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
                        <label htmlFor="zipCode">
                          Zip Code <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="text"
                          id="zipCode"
                          className="form-control"
                          value={enhancedScrapingForm.zipCode}
                          onChange={(e) => handleEnhancedScrapingFormChange('zipCode', e.target.value)}
                          placeholder="12345"
                          required
                          pattern="[0-9]{5}"
                          title="Please enter a valid 5-digit zip code"
                        />
                        <small className="text-muted mt-1 d-block">
                          <i className="fas fa-info-circle me-1"></i>
                          Required for location-based search
                        </small>
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
