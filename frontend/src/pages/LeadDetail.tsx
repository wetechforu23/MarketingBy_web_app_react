import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { http } from '../api/http';

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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: ''
  });
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'emails' | 'seo'>('details');

  useEffect(() => {
    fetchLeadData();
  }, [id]);

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

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      alert('Please fill in both subject and body');
      return;
    }
    
    try {
      await http.post(`/leads/${id}/send-email`, emailForm);
      alert('Email sent successfully');
      setShowEmailModal(false);
      setEmailForm({ subject: '', body: '' });
      fetchLeadData(); // Refresh to show new email
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
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
      try {
        const res = await http.post(`/leads/${id}/generate-seo-report`, {
          reportType,
          sendEmail
        });
        
        const successMessage = res.data.emailSent
          ? `✅ ${reportType} SEO report generated and sent to ${lead.email}`
          : `✅ ${reportType} SEO report generated successfully`;
        
        alert(successMessage);
        fetchLeadData(); // Refresh to show new report
      } catch (error: any) {
        console.error('Error generating SEO report:', error);
        alert(error.response?.data?.details || 'Failed to generate SEO report');
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
              <button 
                className="btn btn-success" 
                onClick={() => setShowEmailModal(true)}
                style={{ minWidth: '100px' }}
              >
                <i className="fas fa-envelope me-2"></i>Send Email
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
                onClick={() => setShowEmailModal(true)}
              >
                <i className="fas fa-plus me-2"></i>Send New Email
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, fontWeight: '600' }}>SEO Reports</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => handleGenerateSEOReport('basic', false)}
                >
                  <i className="fas fa-chart-line me-2"></i>Basic Report
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleGenerateSEOReport('basic', true)}
                  disabled={!lead?.email}
                  title={!lead?.email ? 'No email address' : 'Generate & email basic SEO report'}
                >
                  <i className="fas fa-envelope me-2"></i>Basic + Email
                </button>
                <button 
                  className="btn btn-outline-success"
                  onClick={() => handleGenerateSEOReport('comprehensive', false)}
                >
                  <i className="fas fa-chart-bar me-2"></i>Comprehensive
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => handleGenerateSEOReport('comprehensive', true)}
                  disabled={!lead?.email}
                  title={!lead?.email ? 'No email address' : 'Generate & email comprehensive SEO report'}
                >
                  <i className="fas fa-paper-plane me-2"></i>Comprehensive + Email
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
              <div className="seo-report-list">
                {seoReports.map((report) => (
                  <div key={report.id} style={{
                    padding: '15px',
                    marginBottom: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h5 style={{ margin: 0, fontWeight: '600' }}>
                        {report.report_type.toUpperCase()} SEO Report
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
                      <div style={{ marginTop: '10px' }}>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => {
                            // TODO: Open report in modal or new page
                            alert('View Report functionality coming soon');
                          }}
                        >
                          <i className="fas fa-eye me-2"></i>View Report
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowEmailModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h5 style={{ margin: 0, color: '#1976d2', fontWeight: 700, fontSize: '20px' }}>
                <i className="fas fa-envelope me-2"></i>Send Email to {lead.company}
              </h5>
              <button 
                className="btn-close" 
                onClick={() => setShowEmailModal(false)}
              ></button>
            </div>
            
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600' }}>To:</label>
              <input 
                type="email" 
                className="form-control" 
                value={lead.email} 
                disabled 
                style={{ backgroundColor: '#e9ecef' }}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600' }}>Subject:</label>
              <input 
                type="text" 
                className="form-control" 
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject"
              />
            </div>

            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600' }}>Body:</label>
              <textarea 
                className="form-control" 
                rows={8}
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                placeholder="Email body"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSendEmail}
              >
                <i className="fas fa-paper-plane me-2"></i>Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;

