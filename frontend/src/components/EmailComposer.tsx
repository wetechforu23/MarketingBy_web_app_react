import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface EmailComposerProps {
  leadId: number;
  leadData?: {
    company?: string;
    email?: string;
    contact_first_name?: string;
    contact_last_name?: string;
    website_url?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({ leadId, leadData, onClose, onSuccess }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [seoReports, setSeoReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [showReportSelector, setShowReportSelector] = useState(false);
  const [to, setTo] = useState(leadData?.email || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [sending, setSending] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarSuggestions, setGrammarSuggestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSEOReports();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await http.get(`/leads/${leadId}/email-templates`);
      setTemplates(res.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSEOReports = async () => {
    try {
      const res = await http.get(`/leads/${leadId}/seo-reports`);
      setSeoReports(res.data || []);
    } catch (error) {
      console.error('Error fetching SEO reports:', error);
    }
  };

  const generateModernHTMLEmail = (reportData: any, reportType: string) => {
    const brandColor = '#4682B4';
    const accentColor = '#87CEEB';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${brandColor} 0%, ${accentColor} 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 30px; }
    .score-card { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .score-number { font-size: 48px; font-weight: bold; color: ${brandColor}; margin: 10px 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .metric-card { background: #f8f9fa; border-left: 4px solid ${brandColor}; padding: 15px; border-radius: 5px; }
    .metric-title { font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
    .metric-value { font-size: 24px; font-weight: bold; color: ${brandColor}; }
    .cta-button { display: inline-block; background: ${brandColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { background: #2c5282; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 ${reportType === 'basic' ? 'SEO Analysis Results' : 'Complete SEO & Competitor Analysis'}</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px;">for ${leadData?.company || 'Your Business'}</p>
    </div>
    
    <div class="content">
      <p>Hi ${leadData?.contact_first_name || 'there'},</p>
      
      <p>We've completed a ${reportType} SEO analysis for <strong>${leadData?.company}</strong>, and I wanted to share some key findings with you.</p>
      
      <div class="score-card">
        <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Overall SEO Score</div>
        <div class="score-number">${reportData?.score || 0}<span style="font-size: 24px;">/100</span></div>
        <div style="font-size: 14px; color: #666; margin-top: 10px;">
          ${reportData?.score >= 80 ? '✅ Excellent' : reportData?.score >= 60 ? '⚠️ Good, but room for improvement' : '❌ Needs immediate attention'}
        </div>
      </div>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-title">Mobile Score</div>
          <div class="metric-value">${reportData?.mobile_score || 0}<span style="font-size: 14px;">/100</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Desktop Score</div>
          <div class="metric-value">${reportData?.desktop_score || 0}<span style="font-size: 14px;">/100</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Broken Links</div>
          <div class="metric-value">${reportData?.broken_links || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Recommendations</div>
          <div class="metric-value">${reportData?.recommendations?.length || 0}</div>
        </div>
      </div>

      <h3 style="color: ${brandColor}; margin-top: 30px;">📊 Key Opportunities</h3>
      <ul style="line-height: 1.8;">
        ${(reportData?.recommendations || []).slice(0, 5).map((rec: string) => `<li>${rec}</li>`).join('') || '<li>Full analysis report attached</li>'}
      </ul>

      <p><strong>Why This Matters:</strong></p>
      <p>The healthcare industry is incredibly competitive online, with <strong>93% of patients</strong> starting their search for healthcare providers on Google. Every improvement in your SEO translates to more patient inquiries and appointments.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://calendly.com/wetechforu" class="cta-button">📅 Schedule a Free 15-Min Consultation</a>
      </div>

      <p>I'd love to walk you through these findings and show you exactly how we can help ${leadData?.company} rank higher and attract more patients.</p>

      <p style="margin-top: 30px;">Looking forward to helping you grow!</p>
      
      <p><strong>Best regards,</strong><br>
      WeTechForU Healthcare Marketing Team<br>
      📞 (555) 123-4567<br>
      📧 info@wetechforu.com<br>
      🌐 <a href="https://www.marketingby.wetechforu.com" style="color: ${brandColor};">www.marketingby.wetechforu.com</a></p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} WeTechForU Healthcare Marketing. All rights reserved.</p>
      <p><a href="https://www.marketingby.wetechforu.com/privacy" style="color: #666;">Privacy Policy</a> | <a href="https://www.marketingby.wetechforu.com/terms" style="color: #666;">Terms of Service</a></p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Check if it's an SEO template
    if (templateId === 'basic_seo_followup' || templateId === 'comprehensive_seo_followup') {
      setShowReportSelector(true);
      return;
    }
    
    setShowReportSelector(false);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      applyTemplate(template);
    }
  };

  const handleReportSelect = async (reportId: string) => {
    setSelectedReport(reportId);
    const report = seoReports.find(r => r.id === parseInt(reportId));
    
    if (report) {
      const reportType = report.report_type;
      const reportData = typeof report.report_data === 'string' ? JSON.parse(report.report_data) : report.report_data;
      
      // Generate modern HTML email
      const htmlEmail = generateModernHTMLEmail(reportData, reportType);
      setHtmlBody(htmlEmail);
      
      // Set subject
      setSubject(`🚀 Your ${reportType === 'basic' ? 'Free SEO Analysis' : 'Complete SEO & Competitor Analysis'} Results - ${leadData?.company || 'Your Business'}`);
      
      // Set plain text body for preview
      setBody(`Hi ${leadData?.contact_first_name || 'there'},\n\nWe've completed a ${reportType} SEO analysis for ${leadData?.company}. Please view this email in HTML mode for the best experience.\n\nKey Findings:\n• Overall SEO Score: ${reportData?.score || 0}/100\n• Mobile Score: ${reportData?.mobile_score || 0}/100\n• Desktop Score: ${reportData?.desktop_score || 0}/100\n• Issues Found: ${reportData?.broken_links || 0} broken links\n• Recommendations: ${reportData?.recommendations?.length || 0}\n\nBest regards,\nWeTechForU Healthcare Marketing`);
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    let templateSubject = template.subject;
    let templateBody = template.body;

    const variables = {
      company_name: leadData?.company || '[Company Name]',
      contact_name: `${leadData?.contact_first_name || ''} ${leadData?.contact_last_name || ''}`.trim() || '[Contact Name]',
      website_url: leadData?.website_url || '[Website URL]',
      sender_name: 'WeTechForU Healthcare Marketing',
      sender_email: 'info@wetechforu.com',
      sender_phone: '(555) 123-4567',
      calendar_link: 'https://calendly.com/wetechforu',
      seo_score: '[SEO Score]',
      mobile_score: '[Mobile Score]',
      desktop_score: '[Desktop Score]',
      broken_links_count: '[Broken Links]',
      recommendations_count: '[Recommendations]',
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      templateSubject = templateSubject.replace(regex, value);
      templateBody = templateBody.replace(regex, value);
    });

    setSubject(templateSubject);
    setBody(templateBody);
    setHtmlBody(''); // Clear HTML for non-SEO templates
  };

  const handleCheckGrammar = async () => {
    if (!body) return;
    setCheckingGrammar(true);
    try {
      const res = await http.post('/email/check-grammar', { text: body });
      setGrammarSuggestions(res.data.suggestions || []);
      if (res.data.correctedText) {
        setBody(res.data.correctedText);
      }
      if (res.data.suggestions.length > 0) {
        alert(`Found ${res.data.suggestions.length} suggestions. Text has been auto-corrected.`);
      } else {
        alert('No grammar or spelling issues found! ✓');
      }
    } catch (error) {
      console.error('Error checking grammar:', error);
      alert('Failed to check grammar');
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleSend = async () => {
    if (!to || !subject || (!body && !htmlBody)) {
      alert('Please fill in all required fields (To, Subject, Body)');
      return;
    }

    setSending(true);
    try {
      await http.post(`/leads/${leadId}/send-email`, {
        to,
        cc: cc ? cc.split(',').map(e => e.trim()).filter(e => e) : undefined,
        bcc: bcc ? bcc.split(',').map(e => e.trim()).filter(e => e) : undefined,
        subject,
        body: htmlBody || body, // Send HTML if available, otherwise plain text
        template: selectedTemplate || 'custom'
      });

      alert('✅ Email sent successfully! Tracking is enabled.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(`❌ Failed to send email: ${error.response?.data?.error || 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content" style={{ border: 'none', borderRadius: '15px', overflow: 'hidden' }}>
          {/* Header with brand colors */}
          <div className="modal-header" style={{ 
            background: 'linear-gradient(135deg, #4682B4 0%, #87CEEB 100%)', 
            color: 'white',
            padding: '20px 30px',
            border: 'none'
          }}>
            <h5 className="modal-title" style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              <i className="fas fa-envelope me-3"></i>
              Compose Email - {leadData?.company || 'Lead'}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              style={{ filter: 'brightness(0) invert(1)' }}
            ></button>
          </div>

          <div className="modal-body" style={{ padding: '30px', backgroundColor: '#f8f9fa' }}>
            {/* Template Selector */}
            <div className="mb-4" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <label className="form-label fw-bold" style={{ color: '#4682B4', fontSize: '1.1rem' }}>
                <i className="fas fa-file-alt me-2"></i>
                Email Template
              </label>
              <select 
                className="form-select form-select-lg" 
                value={selectedTemplate} 
                onChange={(e) => handleTemplateSelect(e.target.value)}
                style={{ borderColor: '#87CEEB', fontSize: '1rem' }}
              >
                <option value="">📝 Custom Email (Blank)</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.id.includes('seo') ? '📊' : template.id.includes('intro') ? '👋' : template.id.includes('pricing') ? '💰' : '📧'} {template.name}
                  </option>
                ))}
              </select>
              <small className="text-muted mt-2 d-block">
                <i className="fas fa-info-circle me-1"></i>
                Select a template to auto-fill with professional content
              </small>
            </div>

            {/* SEO Report Selector (shown for SEO templates) */}
            {showReportSelector && (
              <div className="mb-4" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <label className="form-label fw-bold" style={{ color: '#4682B4', fontSize: '1.1rem' }}>
                  <i className="fas fa-chart-bar me-2"></i>
                  Select SEO Report
                </label>
                <select 
                  className="form-select form-select-lg" 
                  value={selectedReport} 
                  onChange={(e) => handleReportSelect(e.target.value)}
                  style={{ borderColor: '#87CEEB' }}
                >
                  <option value="">-- Select a report --</option>
                  {seoReports.map(report => (
                    <option key={report.id} value={report.id}>
                      {report.report_type.toUpperCase()} SEO Report - {new Date(report.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <small className="text-muted mt-2 d-block">
                  <i className="fas fa-database me-1"></i>
                  Choose which report data to include in the email
                </small>
              </div>
            )}

            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              {/* Recipients */}
              <div className="row mb-3">
                <div className="col-md-12 mb-3">
                  <label className="form-label fw-bold" style={{ color: '#333' }}>
                    <i className="fas fa-user me-2" style={{ color: '#4682B4' }}></i>
                    To <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient@example.com"
                    style={{ borderColor: '#87CEEB' }}
                    required
                  />
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label fw-bold" style={{ color: '#333' }}>
                    <i className="fas fa-users me-2" style={{ color: '#4682B4' }}></i>
                    CC
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc1@example.com, cc2@example.com"
                    style={{ borderColor: '#dee2e6' }}
                  />
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label fw-bold" style={{ color: '#333' }}>
                    <i className="fas fa-user-secret me-2" style={{ color: '#4682B4' }}></i>
                    BCC
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc1@example.com, bcc2@example.com"
                    style={{ borderColor: '#dee2e6' }}
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="mb-3">
                <label className="form-label fw-bold" style={{ color: '#333' }}>
                  <i className="fas fa-heading me-2" style={{ color: '#4682B4' }}></i>
                  Subject <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  style={{ borderColor: '#87CEEB' }}
                  required
                />
              </div>

              {/* Body (only show if not HTML) */}
              {!htmlBody && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label fw-bold mb-0" style={{ color: '#333' }}>
                      <i className="fas fa-align-left me-2" style={{ color: '#4682B4' }}></i>
                      Message Body <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleCheckGrammar}
                      disabled={checkingGrammar || !body}
                      style={{ backgroundColor: '#87CEEB', color: 'white', border: 'none' }}
                    >
                      <i className={`fas ${checkingGrammar ? 'fa-spinner fa-spin' : 'fa-spell-check'} me-2`}></i>
                      {checkingGrammar ? 'Checking...' : 'Check Grammar'}
                    </button>
                  </div>
                  <textarea
                    className="form-control"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={10}
                    required
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '14px', 
                      lineHeight: '1.6',
                      borderColor: '#dee2e6'
                    }}
                  />
                </div>
              )}

              {/* HTML Preview Notice */}
              {htmlBody && (
                <div className="alert" style={{ backgroundColor: '#e3f2fd', border: '1px solid #87CEEB', borderRadius: '8px' }}>
                  <h6 style={{ color: '#4682B4', fontWeight: '600' }}>
                    <i className="fas fa-code me-2"></i>
                    Modern HTML Email Template Active
                  </h6>
                  <small style={{ color: '#666' }}>
                    This email uses a professional HTML template with real data from the selected report. 
                    Click "Preview Email" below to see how it will look to the recipient.
                  </small>
                </div>
              )}
            </div>

            {/* Email Tracking Badge */}
            <div className="mt-3" style={{ 
              backgroundColor: '#d4edda', 
              border: '1px solid #c3e6cb', 
              borderRadius: '8px',
              padding: '15px'
            }}>
              <h6 style={{ color: '#155724', fontWeight: '600', marginBottom: '8px' }}>
                <i className="fas fa-chart-line me-2"></i>
                Email Tracking Enabled
              </h6>
              <div style={{ fontSize: '0.9rem', color: '#155724' }}>
                ✓ Open tracking (pixel) &nbsp;|&nbsp; ✓ Click tracking (all links) &nbsp;|&nbsp; ✓ Activity logging
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dee2e6', padding: '20px 30px' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-lg" 
              onClick={onClose} 
              disabled={sending}
              style={{ paddingLeft: '25px', paddingRight: '25px' }}
            >
              <i className="fas fa-times me-2"></i>
              Cancel
            </button>
            
            {htmlBody && (
              <button 
                type="button" 
                className="btn btn-lg" 
                onClick={() => setShowPreview(!showPreview)}
                style={{ backgroundColor: '#87CEEB', color: 'white', border: 'none', paddingLeft: '25px', paddingRight: '25px' }}
              >
                <i className="fas fa-eye me-2"></i>
                {showPreview ? 'Hide Preview' : 'Preview Email'}
              </button>
            )}
            
            <button 
              type="button" 
              className="btn btn-lg" 
              onClick={handleSend} 
              disabled={sending || !to || !subject || (!body && !htmlBody)}
              style={{ backgroundColor: '#4682B4', color: 'white', border: 'none', paddingLeft: '30px', paddingRight: '30px' }}
            >
              {sending ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreview && htmlBody && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }} 
          tabIndex={-1}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#4682B4', color: 'white' }}>
                <h5 className="modal-title">
                  <i className="fas fa-eye me-2"></i>
                  Email Preview - How it will look to recipient
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowPreview(false)}
                ></button>
              </div>
              <div className="modal-body" style={{ padding: 0, backgroundColor: '#f4f4f4' }}>
                <iframe 
                  srcDoc={htmlBody} 
                  style={{ width: '100%', height: '600px', border: 'none' }}
                  title="Email Preview"
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPreview(false)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;
