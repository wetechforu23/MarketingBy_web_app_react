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
  const [to, setTo] = useState(leadData?.email || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [grammarSuggestions, setGrammarSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await http.get(`/leads/${leadId}/email-templates`);
      setTemplates(res.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Replace template variables
      let templateSubject = template.subject;
      let templateBody = template.body;

      // Replace variables with lead data
      const variables = {
        company_name: leadData?.company || '[Company Name]',
        contact_name: `${leadData?.contact_first_name || ''} ${leadData?.contact_last_name || ''}`.trim() || '[Contact Name]',
        website_url: leadData?.website_url || '[Website URL]',
        sender_name: 'Your Name',
        sender_email: 'info@wetechforu.com',
        sender_phone: '(555) 123-4567',
        calendar_link: 'https://calendly.com/yourusername',
        // Add more variables as needed
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
    }
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
    if (!to || !subject || !body) {
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
        body,
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
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header" style={{ backgroundColor: '#4682B4', color: 'white' }}>
            <h5 className="modal-title">
              <i className="fas fa-envelope me-2"></i>
              Compose Email - {leadData?.company || 'Lead'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Template Selector */}
            <div className="mb-3">
              <label className="form-label fw-bold">
                <i className="fas fa-file-alt me-2"></i>
                Email Template
              </label>
              <select 
                className="form-select" 
                value={selectedTemplate} 
                onChange={(e) => handleTemplateSelect(e.target.value)}
              >
                <option value="">Custom Email (Blank)</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
              <small className="text-muted">
                Select a template to auto-fill subject and body with professional content
              </small>
            </div>

            <hr />

            {/* Recipients */}
            <div className="row mb-3">
              <div className="col-md-12 mb-2">
                <label className="form-label fw-bold">
                  <i className="fas fa-user me-2"></i>
                  To <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                />
              </div>

              <div className="col-md-6 mb-2">
                <label className="form-label fw-bold">
                  <i className="fas fa-users me-2"></i>
                  CC
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc1@example.com, cc2@example.com"
                />
                <small className="text-muted">Separate multiple emails with commas</small>
              </div>

              <div className="col-md-6 mb-2">
                <label className="form-label fw-bold">
                  <i className="fas fa-user-secret me-2"></i>
                  BCC
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc1@example.com, bcc2@example.com"
                />
                <small className="text-muted">Separate multiple emails with commas</small>
              </div>
            </div>

            {/* Subject */}
            <div className="mb-3">
              <label className="form-label fw-bold">
                <i className="fas fa-heading me-2"></i>
                Subject <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject"
                required
              />
            </div>

            {/* Body */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="form-label fw-bold mb-0">
                  <i className="fas fa-align-left me-2"></i>
                  Message Body <span className="text-danger">*</span>
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleCheckGrammar}
                  disabled={checkingGrammar || !body}
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
                rows={12}
                required
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.6' }}
              />
              <small className="text-muted">
                <i className="fas fa-info-circle me-1"></i>
                Tip: Use Ctrl+Enter to insert line breaks. All links will be automatically tracked.
              </small>
            </div>

            {/* Grammar Suggestions */}
            {grammarSuggestions.length > 0 && (
              <div className="alert alert-info">
                <h6><i className="fas fa-lightbulb me-2"></i>Grammar Suggestions:</h6>
                <ul className="mb-0">
                  {grammarSuggestions.slice(0, 5).map((suggestion, idx) => (
                    <li key={idx}>
                      <strong>{suggestion.type}:</strong> "{suggestion.original}" → "{suggestion.suggestion}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tracking Info */}
            <div className="alert alert-success mb-0">
              <h6><i className="fas fa-chart-line me-2"></i>Email Tracking Enabled</h6>
              <small>
                ✓ Open tracking (pixel)
                <br />
                ✓ Click tracking (all links)
                <br />
                ✓ Activity logging
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
              <i className="fas fa-times me-2"></i>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending || !to || !subject || !body}>
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
    </div>
  );
};

export default EmailComposer;

