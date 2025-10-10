import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import { EmailComposer } from '../components/EmailComposer';

interface Lead {
  id: number;
  company: string;
  email: string;
  phone: string;
  website_url: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  contact_first_name: string;
  contact_last_name: string;
  industry_category: string;
  industry_subcategory: string;
  source: string;
  status: string;
  compliance_status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
}

interface LeadActivity {
  id: number;
  lead_id: number;
  activity_type: string; // 'email_sent', 'email_opened', 'email_clicked', 'seo_report_sent', 'status_changed', 'note_added'
  activity_data: any;
  created_at: string;
}

interface EmailHistory {
  id: number;
  lead_id: number;
  subject: string;
  body: string;
  status: string; // 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
}

interface SEOReport {
  id: number;
  lead_id: number;
  report_type: string; // 'basic', 'comprehensive'
  report_data: any;
  sent_at: string;
  viewed_at?: string;
  offer_token?: string; // Unique token for shareable offer link
  offer_expires_at?: string; // Expiration timestamp (72 hours)
  offer_claimed?: boolean; // Whether customer claimed the offer
  report_name?: string; // Human-readable name: SEO_Report_CompanyName_Client_Date
}

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailHistory[]>([]);
  const [seoReports, setSeoReports] = useState<SEOReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'emails' | 'seo'>('details');
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showSEOModal, setShowSEOModal] = useState(false);
  const [seoReportType, setSeoReportType] = useState<'basic' | 'comprehensive'>('basic');
  const [sendEmailWithReport, setSendEmailWithReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportProgressMessage, setReportProgressMessage] = useState('');
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SEOReport | null>(null);

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  // Close email composer when switching tabs
  useEffect(() => {
    if (activeTab !== 'emails') {
      setShowEmailComposer(false);
    }
  }, [activeTab]);

  const fetchLeadData = async () => {
    try {
      setLoading(true);
      const [leadRes, activityRes, emailRes, seoRes] = await Promise.all([
        http.get(`/leads/${id}`),
        http.get(`/leads/${id}/activity`),
        http.get(`/leads/${id}/emails`),
        http.get(`/leads/${id}/seo-reports`)
      ]);
      
      setLead(leadRes.data);
      setEditedLead(leadRes.data);
      setActivities(activityRes.data);
      setEmailHistory(emailRes.data);
      setSeoReports(seoRes.data);
    } catch (error) {
      console.error('Error fetching lead data:', error);
      alert('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedLead) return;
    
    try {
      await http.put(`/leads/${id}`, editedLead);
      setLead(editedLead);
      setIsEditing(false);
      alert('Lead updated successfully');
      fetchLeadData(); // Refresh to get updated activity
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead');
    }
  };

  const handleCancel = () => {
    setEditedLead(lead);
    setIsEditing(false);
  };

  const handleGenerateSEOReport = async (reportType: 'basic' | 'comprehensive', sendEmail: boolean = false) => {
    if (!lead?.website_url) {
      alert('No website URL available for this lead');
      return;
    }
    
    const confirmMessage = sendEmail
      ? `Generate ${reportType} SEO report for ${lead.website_url} and send email to ${lead.email}?`
      : `Generate ${reportType} SEO report for ${lead.website_url}?`;
    
    if (window.confirm(confirmMessage)) {
      setGeneratingReport(true);
      setReportProgress(0);
      setReportProgressMessage('Initializing SEO analysis...');
      
      // Simulate progress for better UX
      const progressSteps = reportType === 'basic' 
        ? [
            { progress: 10, message: 'Fetching website content...' },
            { progress: 30, message: 'Analyzing meta tags...' },
            { progress: 50, message: 'Checking page structure...' },
            { progress: 70, message: 'Running performance tests...' },
            { progress: 90, message: 'Generating recommendations...' },
            { progress: 95, message: 'Finalizing report...' }
          ]
        : [
            { progress: 5, message: 'Fetching website content...' },
            { progress: 15, message: 'Analyzing meta tags & structure...' },
            { progress: 25, message: 'Checking technical SEO...' },
            { progress: 35, message: 'Scanning for broken links...' },
            { progress: 45, message: 'Analyzing competitor data...' },
            { progress: 55, message: 'Researching keywords...' },
            { progress: 65, message: 'Checking backlink profile...' },
            { progress: 75, message: 'Running performance analysis...' },
            { progress: 85, message: 'Auditing content quality...' },
            { progress: 95, message: 'Compiling comprehensive report...' }
          ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setReportProgress(progressSteps[currentStep].progress);
          setReportProgressMessage(progressSteps[currentStep].message);
          currentStep++;
        }
      }, reportType === 'basic' ? 1500 : 2500); // Slower for comprehensive

      try {
        const res = await http.post(`/leads/${id}/generate-seo-report`, {
          reportType,
          sendEmail
        });
        
        clearInterval(progressInterval);
        setReportProgress(100);
        setReportProgressMessage('Report generated successfully!');
        
        // Show success for a moment
        setTimeout(() => {
          const successMessage = res.data.emailSent
            ? `✅ ${reportType} SEO report generated and sent to ${lead.email}`
            : `✅ ${reportType} SEO report generated successfully`;
          
          alert(successMessage);
          setShowSEOModal(false);
          setGeneratingReport(false);
          setReportProgress(0);
          setReportProgressMessage('');
          fetchLeadData(); // Refresh to show new report
        }, 1000);
      } catch (error: any) {
        clearInterval(progressInterval);
        setGeneratingReport(false);
        setReportProgress(0);
        setReportProgressMessage('');
        console.error('Error generating SEO report:', error);
        alert(error.response?.data?.details || 'Failed to generate SEO report. Please try again.');
      }
    }
  };

  const handleOpenSEOModal = () => {
    setSeoReportType('basic');
    setSendEmailWithReport(false);
    setShowSEOModal(true);
  };

  const handleViewReport = (report: SEOReport) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleToggleReportSelection = (reportId: number) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleToggleAllReports = () => {
    if (selectedReports.length === seoReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(seoReports.map(r => r.id));
    }
  };

  const handleCopyOfferLink = (report: SEOReport) => {
    if (!report.offer_token) {
      alert('⚠️ This report doesn\'t have an offer link yet. Please regenerate the report.');
      return;
    }

    const offerLink = `https://www.marketingby.wetechforu.com/api/public/offer/${report.offer_token}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(offerLink).then(() => {
      alert(`✅ Offer link copied to clipboard!\n\n${offerLink}\n\nYou can now paste this link anywhere to send to your customer.`);
    }).catch(err => {
      console.error('Failed to copy link:', err);
      // Fallback: show the link in a prompt
      prompt('📋 Copy this offer link:', offerLink);
    });
  };

  const handleDeleteSelectedReports = async () => {
    if (selectedReports.length === 0) {
      alert('Please select reports to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedReports.length} report(s)?`)) {
      try {
        await Promise.all(
          selectedReports.map(reportId =>
            http.delete(`/leads/${id}/seo-reports/${reportId}`)
          )
        );
        alert(`✅ Successfully deleted ${selectedReports.length} report(s)`);
        setSelectedReports([]);
        fetchLeadData(); // Refresh the list
      } catch (error) {
        console.error('Error deleting reports:', error);
        alert('Failed to delete some reports');
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'badge bg-primary';
      case 'contacted': return 'badge bg-info';
      case 'qualified': return 'badge bg-success';
      case 'converted': return 'badge bg-success';
      case 'rejected': return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email_sent': return 'fa-envelope';
      case 'email_opened': return 'fa-envelope-open';
      case 'email_clicked': return 'fa-mouse-pointer';
      case 'seo_report_sent': return 'fa-chart-line';
      case 'status_changed': return 'fa-exchange-alt';
      case 'note_added': return 'fa-sticky-note';
      default: return 'fa-info-circle';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-circle"></i>
        <p>Lead not found</p>
        <button className="btn btn-primary" onClick={() => navigate('/leads')}>
          Back to Leads
        </button>
      </div>
    );
  }

  return (
    <div className="lead-detail-page" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '1px solid #e9ecef'
      }}>
        <div>
          <button 
            className="btn btn-link" 
            onClick={() => {
              console.log('📍 Navigating back to leads list');
              navigate('/app/leads');
            }}
            style={{ padding: 0, marginBottom: '10px', textDecoration: 'none' }}
          >
            <i className="fas fa-arrow-left me-2"></i>Back to Leads
          </button>
          <h2 style={{ margin: 0, fontWeight: '700', fontSize: '28px', color: '#1976d2' }}>
            {lead.company}
          </h2>
          <span className={getStatusBadgeClass(lead.status)} style={{ marginTop: '10px', display: 'inline-block' }}>
            {lead.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isEditing ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={() => setIsEditing(true)}
                style={{ minWidth: '100px' }}
              >
                <i className="fas fa-edit me-2"></i>Edit
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-success" 
                onClick={handleSave}
                style={{ minWidth: '100px' }}
              >
                <i className="fas fa-save me-2"></i>Save
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancel}
                style={{ minWidth: '100px' }}
              >
                <i className="fas fa-times me-2"></i>Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #e9ecef' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['details', 'activity', 'emails', 'seo'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #1976d2' : '3px solid transparent',
                backgroundColor: activeTab === tab ? '#e3f2fd' : 'transparent',
                color: activeTab === tab ? '#1976d2' : '#666',
                fontWeight: activeTab === tab ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e9ecef' }}>
        {activeTab === 'details' && (
          <div className="details-tab">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.company : lead.company}
                  onChange={(e) => setEditedLead({ ...editedLead!, company: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={isEditing ? editedLead?.email : lead.email}
                  onChange={(e) => setEditedLead({ ...editedLead!, email: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={isEditing ? editedLead?.phone : lead.phone}
                  onChange={(e) => setEditedLead({ ...editedLead!, phone: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Website</label>
                <input
                  type="url"
                  className="form-control"
                  value={isEditing ? editedLead?.website_url : lead.website_url}
                  onChange={(e) => setEditedLead({ ...editedLead!, website_url: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Contact First Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.contact_first_name : lead.contact_first_name}
                  onChange={(e) => setEditedLead({ ...editedLead!, contact_first_name: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Contact Last Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.contact_last_name : lead.contact_last_name}
                  onChange={(e) => setEditedLead({ ...editedLead!, contact_last_name: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-12 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Address</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.address : lead.address}
                  onChange={(e) => setEditedLead({ ...editedLead!, address: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>City</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.city : lead.city}
                  onChange={(e) => setEditedLead({ ...editedLead!, city: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>State</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.state : lead.state}
                  onChange={(e) => setEditedLead({ ...editedLead!, state: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-4 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>ZIP Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.zip_code : lead.zip_code}
                  onChange={(e) => setEditedLead({ ...editedLead!, zip_code: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Status</label>
                <select
                  className="form-control"
                  value={isEditing ? editedLead?.status : lead.status}
                  onChange={(e) => setEditedLead({ ...editedLead!, status: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="converted">Converted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Source</label>
                <input
                  type="text"
                  className="form-control"
                  value={isEditing ? editedLead?.source : lead.source}
                  onChange={(e) => setEditedLead({ ...editedLead!, source: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="col-md-12 mb-3">
                <label style={{ fontWeight: '600', color: '#666', marginBottom: '5px' }}>Notes</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={isEditing ? editedLead?.notes : lead.notes}
                  onChange={(e) => setEditedLead({ ...editedLead!, notes: e.target.value })}
                  disabled={!isEditing}
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-tab">
            <h4 style={{ marginBottom: '20px', fontWeight: '600' }}>Recent Activity</h4>
            {activities.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}></i>
                No activity yet
              </p>
            ) : (
              <div className="timeline" style={{ position: 'relative', paddingLeft: '40px' }}>
                {activities.map((activity) => (
                  <div key={activity.id} style={{ marginBottom: '20px', position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-40px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className={`fas ${getActivityIcon(activity.activity_type)}`}></i>
                    </div>
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        {activity.activity_type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                      {activity.activity_data && (
                        <div style={{ marginTop: '10px', fontSize: '14px' }}>
                          <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
                            {JSON.stringify(activity.activity_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="emails-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontWeight: '600' }}>Email History</h4>
              <button 
                className="btn btn-primary"
                onClick={() => setShowEmailComposer(true)}
              >
                <i className="fas fa-envelope me-2"></i>Compose Email
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#1976d2', fontWeight: '600' }}>
                Total Emails Sent: {emailHistory.length}
              </div>
              <div style={{ fontSize: '14px', color: '#1976d2' }}>
                Opened: {emailHistory.filter(e => e.opened_at).length} | 
                Clicked: {emailHistory.filter(e => e.clicked_at).length}
              </div>
            </div>

            {emailHistory.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}></i>
                No emails sent yet
              </p>
            ) : (
              <div className="email-list">
                {emailHistory.map((email) => (
                  <div key={email.id} style={{
                    padding: '15px',
                    marginBottom: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h5 style={{ margin: 0, fontWeight: '600' }}>{email.subject}</h5>
                      <span className={`badge ${
                        email.status === 'opened' ? 'bg-success' :
                        email.status === 'clicked' ? 'bg-info' :
                        email.status === 'sent' ? 'bg-primary' :
                        'bg-secondary'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                      Sent: {new Date(email.sent_at).toLocaleString()}
                    </div>
                    {email.opened_at && (
                      <div style={{ fontSize: '14px', color: '#28a745' }}>
                        <i className="fas fa-envelope-open me-2"></i>
                        Opened: {new Date(email.opened_at).toLocaleString()}
                      </div>
                    )}
                    {email.clicked_at && (
                      <div style={{ fontSize: '14px', color: '#17a2b8' }}>
                        <i className="fas fa-mouse-pointer me-2"></i>
                        Clicked: {new Date(email.clicked_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="seo-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, fontWeight: '600' }}>SEO Reports</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {selectedReports.length > 0 && (
                  <button 
                    className="btn btn-danger"
                    onClick={handleDeleteSelectedReports}
                    style={{ fontWeight: '600' }}
                  >
                    <i className="fas fa-trash me-2"></i>Delete Selected ({selectedReports.length})
                  </button>
                )}
                <button 
                  className="btn btn-primary"
                  onClick={handleOpenSEOModal}
                  style={{ 
                    minWidth: '180px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <i className="fas fa-chart-line me-2"></i>Generate SEO Report
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <div style={{ fontSize: '14px', color: '#1976d2', fontWeight: '600' }}>
                Total Reports: {seoReports.length}
              </div>
              <div style={{ fontSize: '14px', color: '#1976d2' }}>
                Basic: {seoReports.filter(r => r.report_type === 'basic').length} | 
                Comprehensive: {seoReports.filter(r => r.report_type === 'comprehensive').length}
              </div>
            </div>

            {seoReports.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}></i>
                No SEO reports generated yet
              </p>
            ) : (
              <>
                {seoReports.length > 1 && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedReports.length === seoReports.length}
                        onChange={handleToggleAllReports}
                        style={{ marginRight: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      Select All Reports
                    </label>
                  </div>
                )}
                <div className="seo-report-list">
                  {seoReports.map((report) => (
                    <div key={report.id} style={{
                      padding: '15px',
                      marginBottom: '15px',
                      backgroundColor: selectedReports.includes(report.id) ? '#e3f2fd' : '#f8f9fa',
                      borderRadius: '8px',
                      border: `2px solid ${selectedReports.includes(report.id) ? '#4682B4' : '#e9ecef'}`,
                      transition: 'all 0.3s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.id)}
                          onChange={() => handleToggleReportSelection(report.id)}
                          style={{ marginTop: '5px', width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h5 style={{ margin: 0, fontWeight: '600' }}>
                              {report.report_name || `${report.report_type.toUpperCase()} SEO Report`}
                            </h5>
                            <span className="badge bg-primary">{report.report_type}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                            Generated: {new Date(report.sent_at).toLocaleString()}
                          </div>
                          {report.viewed_at && (
                            <div style={{ fontSize: '14px', color: '#28a745' }}>
                              <i className="fas fa-eye me-2"></i>
                              Viewed: {new Date(report.viewed_at).toLocaleString()}
                            </div>
                          )}
                          {report.report_data && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleViewReport(report)}
                              >
                                <i className="fas fa-eye me-2"></i>View Report
                              </button>
                              
                              {/* Copy Offer Link Button */}
                              {report.offer_token && (
                                <button 
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleCopyOfferLink(report)}
                                  title="Copy shareable offer link for customer"
                                >
                                  <i className="fas fa-link me-2"></i>Copy Link
                                </button>
                              )}
                              
                              {/* Show expiration status */}
                              {report.offer_token && report.offer_expires_at && (
                                <small style={{ 
                                  marginLeft: '10px', 
                                  color: new Date(report.offer_expires_at) > new Date() ? '#28a745' : '#dc3545',
                                  alignSelf: 'center',
                                  fontWeight: '600'
                                }}>
                                  {new Date(report.offer_expires_at) > new Date() ? (
                                    <>
                                      <i className="fas fa-clock me-1"></i>
                                      Expires: {new Date(report.offer_expires_at).toLocaleDateString()}
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-exclamation-triangle me-1"></i>
                                      Expired
                                    </>
                                  )}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Email Composer Modal */}
      {showEmailComposer && lead && (
        <EmailComposer
          leadId={parseInt(id!)}
          leadData={{
            company: lead.company,
            email: lead.email,
            contact_first_name: lead.contact_first_name,
            contact_last_name: lead.contact_last_name,
            website_url: lead.website_url
          }}
          onClose={() => setShowEmailComposer(false)}
          onSuccess={() => {
            fetchLeadData(); // Refresh email history
            setActiveTab('emails'); // Switch to emails tab
          }}
        />
      )}

      {/* SEO Report Generation Modal */}
      {showSEOModal && lead && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1050
          }}
          onClick={() => setShowSEOModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ 
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              {/* Modal Header */}
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #4682B4 0%, #87CEEB 100%)',
                color: 'white',
                borderRadius: '12px 12px 0 0',
                padding: '20px 24px'
              }}>
                <h5 className="modal-title" style={{ fontWeight: '700', fontSize: '1.4rem' }}>
                  <i className="fas fa-chart-line me-2"></i>
                  Generate SEO Report
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowSEOModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body" style={{ padding: '24px' }}>
                {/* Lead Information Preview */}
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  border: '1px solid #dee2e6'
                }}>
                  <h6 style={{ fontWeight: '600', marginBottom: '12px', color: '#495057' }}>
                    <i className="fas fa-building me-2" style={{ color: '#4682B4' }}></i>
                    Report Details
                  </h6>
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div><strong>Company:</strong> {lead.company}</div>
                    <div><strong>Website:</strong> <a href={lead.website_url} target="_blank" rel="noopener noreferrer">{lead.website_url}</a></div>
                    <div><strong>Client ID:</strong> {lead.client_id || 'N/A'}</div>
                    <div><strong>Report Name:</strong> SEO_Report_{lead.company.replace(/\s+/g, '_')}_Client{lead.client_id}_{new Date().toISOString().split('T')[0]}</div>
                    <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
                  </div>
                </div>

                {/* Report Type Selection */}
                <div className="mb-4">
                  <label className="form-label fw-bold" style={{ fontSize: '15px', color: '#495057' }}>
                    <i className="fas fa-list-check me-2" style={{ color: '#4682B4' }}></i>
                    Select Report Type
                  </label>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div 
                        className={`card h-100 ${seoReportType === 'basic' ? 'border-primary' : ''}`}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          boxShadow: seoReportType === 'basic' ? '0 4px 12px rgba(70, 130, 180, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setSeoReportType('basic')}
                      >
                        <div className="card-body">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="reportType" 
                              id="basicReport"
                              checked={seoReportType === 'basic'}
                              onChange={() => setSeoReportType('basic')}
                            />
                            <label className="form-check-label w-100" htmlFor="basicReport">
                              <h6 className="mb-2" style={{ fontWeight: '600' }}>
                                <i className="fas fa-chart-line me-2" style={{ color: '#4682B4' }}></i>
                                Basic SEO Report
                              </h6>
                              <small className="text-muted d-block">
                                • On-page SEO analysis<br/>
                                • Meta tags check<br/>
                                • Basic performance metrics<br/>
                                • Quick recommendations
                              </small>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div 
                        className={`card h-100 ${seoReportType === 'comprehensive' ? 'border-success' : ''}`}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          boxShadow: seoReportType === 'comprehensive' ? '0 4px 12px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => setSeoReportType('comprehensive')}
                      >
                        <div className="card-body">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="reportType" 
                              id="comprehensiveReport"
                              checked={seoReportType === 'comprehensive'}
                              onChange={() => setSeoReportType('comprehensive')}
                            />
                            <label className="form-check-label w-100" htmlFor="comprehensiveReport">
                              <h6 className="mb-2" style={{ fontWeight: '600' }}>
                                <i className="fas fa-chart-bar me-2" style={{ color: '#28a745' }}></i>
                                Comprehensive SEO Report
                              </h6>
                              <small className="text-muted d-block">
                                • Full technical SEO audit<br/>
                                • Competitor analysis<br/>
                                • Backlink profile<br/>
                                • Detailed action plan
                              </small>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Option */}
                <div className="mb-4">
                  <div className="form-check" style={{ 
                    padding: '16px',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '8px',
                    border: '1px solid #b3d9ff'
                  }}>
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="sendEmailCheck"
                      checked={sendEmailWithReport}
                      onChange={(e) => setSendEmailWithReport(e.target.checked)}
                      disabled={!lead.email}
                    />
                    <label className="form-check-label" htmlFor="sendEmailCheck" style={{ fontWeight: '500' }}>
                      <i className="fas fa-envelope me-2" style={{ color: '#4682B4' }}></i>
                      Send report via email to: <strong>{lead.email || 'No email address'}</strong>
                    </label>
                    {!lead.email && (
                      <small className="text-danger d-block mt-1">
                        <i className="fas fa-exclamation-circle me-1"></i>
                        Email address not available for this lead
                      </small>
                    )}
                  </div>
                </div>

                {/* Preview Section */}
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#fff9e6',
                  borderRadius: '8px',
                  border: '1px solid #ffe066',
                  marginBottom: '16px'
                }}>
                  <h6 style={{ fontWeight: '600', marginBottom: '12px', color: '#856404' }}>
                    <i className="fas fa-eye me-2"></i>
                    Report Preview
                  </h6>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#856404' }}>
                    <div><strong>Type:</strong> {seoReportType === 'basic' ? 'Basic' : 'Comprehensive'} SEO Analysis</div>
                    <div><strong>For:</strong> {lead.company} ({lead.website_url})</div>
                    <div><strong>File Name:</strong> SEO_Report_{lead.company.replace(/\s+/g, '_')}_Client{lead.client_id}_{new Date().toISOString().split('T')[0]}.pdf</div>
                    <div><strong>Will Include:</strong></div>
                    <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                      {seoReportType === 'basic' ? (
                        <>
                          <li>On-page SEO score and analysis</li>
                          <li>Meta tags and heading structure</li>
                          <li>Page speed and mobile optimization</li>
                          <li>Top 5 quick-win recommendations</li>
                        </>
                      ) : (
                        <>
                          <li>Complete technical SEO audit (100+ checks)</li>
                          <li>Competitor comparison and analysis</li>
                          <li>Backlink profile and domain authority</li>
                          <li>Keyword ranking opportunities</li>
                          <li>Detailed 30-day action plan</li>
                          <li>Custom recommendations for healthcare industry</li>
                        </>
                      )}
                    </ul>
                    {sendEmailWithReport && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #ffe066' }}>
                        <strong><i className="fas fa-paper-plane me-2"></i>Email will be sent to:</strong> {lead.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar (when generating) */}
                {generatingReport && (
                  <div style={{ 
                    padding: '16px',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '8px',
                    border: '2px solid #4682B4',
                    marginBottom: '16px'
                  }}>
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h6 style={{ fontWeight: '600', margin: 0, color: '#4682B4' }}>
                        <i className="fas fa-cog fa-spin me-2"></i>
                        Generating Report
                      </h6>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#4682B4' }}>
                        {reportProgress}%
                      </span>
                    </div>
                    <div className="progress" style={{ height: '25px', marginBottom: '10px' }}>
                      <div 
                        className="progress-bar progress-bar-striped progress-bar-animated bg-info" 
                        role="progressbar" 
                        style={{ width: `${reportProgress}%`, fontSize: '14px', fontWeight: '600' }}
                        aria-valuenow={reportProgress} 
                        aria-valuemin={0} 
                        aria-valuemax={100}
                      >
                        {reportProgress > 10 && `${reportProgress}%`}
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#495057', fontStyle: 'italic' }}>
                      <i className="fas fa-info-circle me-2" style={{ color: '#4682B4' }}></i>
                      {reportProgressMessage}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                      <i className="fas fa-clock me-1"></i>
                      Estimated time: {seoReportType === 'basic' ? '10-15 seconds' : '25-30 seconds'}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ 
                padding: '16px 24px',
                backgroundColor: '#f8f9fa',
                borderRadius: '0 0 12px 12px'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowSEOModal(false)}
                  disabled={generatingReport}
                  style={{ minWidth: '100px' }}
                >
                  <i className="fas fa-times me-2"></i>Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => handleGenerateSEOReport(seoReportType, sendEmailWithReport)}
                  disabled={generatingReport}
                  style={{ minWidth: '150px', fontWeight: '600' }}
                >
                  {generatingReport ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-rocket me-2"></i>Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report View Modal */}
      {showReportModal && selectedReport && (
        <div 
          className="modal show d-block" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1050
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{ 
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              maxHeight: '90vh'
            }}>
              {/* Modal Header */}
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #4682B4 0%, #87CEEB 100%)',
                color: 'white',
                borderRadius: '12px 12px 0 0',
                padding: '20px 24px'
              }}>
                <h5 className="modal-title" style={{ fontWeight: '700', fontSize: '1.4rem' }}>
                  <i className="fas fa-chart-line me-2"></i>
                  {selectedReport.report_type.toUpperCase()} SEO Report
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowReportModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body" style={{ padding: '0', overflowY: 'auto' }}>
                {/* Render HTML Report if available, otherwise show JSON */}
                {(selectedReport as any).html_report ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: (selectedReport as any).html_report }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <>
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <h6 style={{ fontWeight: '600', marginBottom: '8px' }}>Report Information</h6>
                      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                        <div><strong>Generated:</strong> {new Date(selectedReport.sent_at).toLocaleString()}</div>
                        {selectedReport.viewed_at && (
                          <div><strong>Last Viewed:</strong> {new Date(selectedReport.viewed_at).toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    {/* Report Data Display */}
                    <div style={{ 
                      padding: '20px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}>
                      <pre style={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '13px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        margin: 0
                      }}>
                        {JSON.stringify(selectedReport.report_data, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ 
                padding: '16px 24px',
                backgroundColor: '#f8f9fa',
                borderRadius: '0 0 12px 12px'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowReportModal(false)}
                  style={{ minWidth: '100px' }}
                >
                  <i className="fas fa-times me-2"></i>Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;

