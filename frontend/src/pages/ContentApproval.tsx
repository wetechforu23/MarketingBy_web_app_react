import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// =====================================================
// ContentApproval Component (Public - No Auth Required)
// =====================================================

interface Content {
  id: number;
  client_id: number;
  title: string;
  content_text: string;
  content_type: string;
  media_urls?: string[];
  target_platforms?: string[];
  destination_url?: string;
  status: string;
  created_by_name?: string;
  client_name?: string;
  approval_token_expires_at?: string;
}

const ContentApproval: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [clientEmailHint, setClientEmailHint] = useState<string>('');

  // Function to mask email (joXXXXX@gXXXX format)
  const maskEmail = (email: string): string => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + 'X'.repeat(Math.min(localPart.length - 2, 5))
      : localPart;
    const maskedDomain = domain.length > 1
      ? 'g' + 'X'.repeat(Math.min(domain.length - 1, 4))
      : domain;
    
    return `${maskedLocal}@${maskedDomain}`;
  };

  useEffect(() => {
    fetchContent();
  }, [token]);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`/api/content/approve/${token}`);
      setContent(response.data.content);
      // Set masked email hint if client_email is available
      if (response.data.content.client_email) {
        setClientEmailHint(maskEmail(response.data.content.client_email));
      }
      setLoading(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid or expired approval link');
      setLoading(false);
    }
  };

  // Function to validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Function to show custom error modal
  const showErrorModal = (message: string) => {
    // Create a custom styled modal instead of alert
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      borderRadius: 12px;
      padding: 30px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    `;
    
    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 48px; margin-bottom: 16px;';
    icon.textContent = '⚠️';
    
    const title = document.createElement('h2');
    title.style.cssText = 'font-size: 20px; font-weight: 600; color: #e53e3e; margin-bottom: 12px;';
    title.textContent = 'Validation Error';
    
    const msg = document.createElement('p');
    msg.style.cssText = 'font-size: 16px; color: #4a5568; margin-bottom: 24px; line-height: 1.5;';
    msg.textContent = message;
    
    const button = document.createElement('button');
    button.style.cssText = `
      background: #e53e3e;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    `;
    button.textContent = 'OK';
    button.onmouseover = () => button.style.background = '#c82333';
    button.onmouseout = () => button.style.background = '#e53e3e';
    button.onclick = () => {
      document.body.removeChild(modal);
    };
    
    content.appendChild(icon);
    content.appendChild(title);
    content.appendChild(msg);
    content.appendChild(button);
    modal.appendChild(content);
    document.body.appendChild(modal);
  };

  const handleApprove = async () => {
    if (!approverName || !approverEmail) {
      showErrorModal('Please enter your name and email address to proceed with the approval.');
      return;
    }
    
    // Validate email format
    if (!validateEmail(approverEmail)) {
      showErrorModal('Invalid email address format.\n\nPlease enter a valid email address.\n\nExample: yourname@example.com');
      return;
    }
    
    // Validate email matches client account email
    if (content?.client_email && approverEmail.toLowerCase() !== content.client_email.toLowerCase()) {
      const maskedClientEmail = maskEmail(content.client_email);
      showErrorModal(`The email you entered does not match your account email.\n\nPlease use: ${maskedClientEmail}\n\nOr contact support if you need to use a different email.`);
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/approve-client`, {
        token,
        feedback: feedback.trim() || null, // Send null if empty, or trimmed feedback
        notes: feedback.trim() || null, // Also send as notes for backend compatibility
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('approve');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
      
      // Provide user-friendly error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('null value in column "approved_by"')) {
        userFriendlyMessage = 'Unable to process your approval. Please try again or contact support.';
      } else if (errorMessage.includes('Invalid approval token')) {
        userFriendlyMessage = 'This approval link has expired or is invalid.\n\nPlease request a new approval link from the content team.';
      } else if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        // If error mentions email, show the masked client email hint
        if (content?.client_email) {
          const maskedClientEmail = maskEmail(content.client_email);
          userFriendlyMessage = `The email you entered does not match your account email.\n\nPlease use: ${maskedClientEmail}`;
        }
      }
      
      showErrorModal(`Unable to approve content.\n\n${userFriendlyMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approverName || !approverEmail) {
      showErrorModal('Please enter your name and email address to proceed with the rejection.');
      return;
    }
    
    // Validate email format
    if (!validateEmail(approverEmail)) {
      showErrorModal('Invalid email address format.\n\nPlease enter a valid email address.\n\nExample: yourname@example.com');
      return;
    }
    
    // Validate email matches client account email
    if (content?.client_email && approverEmail.toLowerCase() !== content.client_email.toLowerCase()) {
      const maskedClientEmail = maskEmail(content.client_email);
      showErrorModal(`The email you entered does not match your account email.\n\nPlease use: ${maskedClientEmail}\n\nOr contact support if you need to use a different email.`);
      return;
    }
    
    // Trim feedback to check if it's actually empty (not just whitespace)
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      showErrorModal('Feedback is required when rejecting content.\n\nPlease provide specific feedback about what needs to be changed so we can improve the content.');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/reject-client`, {
        token,
        feedback: trimmedFeedback,
        notes: trimmedFeedback, // Also send as notes for backend compatibility
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('reject');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
      
      // Provide user-friendly error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('null value in column "approved_by"')) {
        userFriendlyMessage = 'Unable to process your rejection. Please try again or contact support.';
      } else if (errorMessage.includes('Feedback is required')) {
        userFriendlyMessage = 'Feedback is required when rejecting content.\n\nPlease provide specific feedback about what needs to be changed.';
      } else if (errorMessage.includes('Invalid approval token')) {
        userFriendlyMessage = 'This approval link has expired or is invalid.\n\nPlease request a new approval link from the content team.';
      } else if (errorMessage.includes('email') || errorMessage.includes('Email')) {
        // If error mentions email, show the masked client email hint
        if (content?.client_email) {
          const maskedClientEmail = maskEmail(content.client_email);
          userFriendlyMessage = `The email you entered does not match your account email.\n\nPlease use: ${maskedClientEmail}`;
        }
      }
      
      showErrorModal(`Unable to reject content.\n\n${userFriendlyMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: any = {
      facebook: '📘',
      linkedin: '💼',
      instagram: '📷',
      twitter: '🐦',
      google_business: '📍',
    };
    return icons[platform.toLowerCase()] || '📱';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '1rem' }}></i>
          <div style={{ fontSize: '18px' }}>Loading content...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          background: 'white',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>❌</div>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', color: '#333' }}>
            Invalid Link
          </h1>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '2rem' }}>
            {error}
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            This approval link may have expired or already been used.
            Please contact the admin for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          background: 'white',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>
            {action === 'approve' ? '✅' : '❌'}
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', color: '#333' }}>
            {action === 'approve' ? 'Content Approved!' : 'Content Rejected'}
          </h1>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '2rem' }}>
            {action === 'approve' 
              ? 'Thank you! The content has been approved and will be posted to social media soon.'
              : 'Your feedback has been sent to the content team. They will revise the content and send it back for your review.'
            }
          </p>
          {feedback && (
            <div style={{
              background: '#f8f9fa',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <strong style={{ color: '#333', fontSize: '14px' }}>Your Feedback:</strong>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '0.5rem' }}>
                {feedback}
              </p>
            </div>
          )}
          <p style={{ color: '#999', fontSize: '14px' }}>
            You can safely close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4682B4, #5a9fd4)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '0.5rem' }}>
            📱 Social Media Content Review
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            Please review and approve or reject this content
          </p>
          
          {/* Expiration Warning */}
          {content?.approval_token_expires_at && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'inline-block'
            }}>
              <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
              <strong>Link Expires:</strong> {new Date(content.approval_token_expires_at).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Content Preview */}
          <div style={{
            marginBottom: '2rem',
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '2px solid #e0e0e0'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '1rem', color: '#333' }}>
              {content?.title}
            </h2>
            
            {/* Content Text */}
            <div style={{
              fontSize: '16px',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '1.5rem',
              whiteSpace: 'pre-wrap'
            }}>
              {content?.content_text}
            </div>

            {/* Media Preview */}
            {content?.media_urls && content.media_urls.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <strong style={{ color: '#666', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                  Media ({content.media_urls.length}):
                </strong>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {content.media_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Media ${idx + 1}`}
                      style={{
                        maxWidth: '200px',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Destination URL */}
            {content?.destination_url && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px' }}>
                <strong style={{ color: '#666', fontSize: '14px', display: 'block', marginBottom: '0.5rem' }}>
                  Destination URL:
                </strong>
                <a 
                  href={content.destination_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#4682B4', wordBreak: 'break-all' }}
                >
                  {content.destination_url}
                </a>
              </div>
            )}
            
            {/* Meta Information */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              fontSize: '14px'
            }}>
              <div>
                <strong style={{ color: '#666' }}>Platforms:</strong>{' '}
                <span style={{ color: '#333' }}>
                  {content?.target_platforms?.map((p: string) => `${getPlatformIcon(p)} ${p}`).join(', ') || 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#666' }}>Type:</strong>{' '}
                <span style={{ color: '#333' }}>{content?.content_type || 'Text'}</span>
              </div>
              {content?.created_by_name && (
                <div>
                  <strong style={{ color: '#666' }}>Created By:</strong>{' '}
                  <span style={{ color: '#333' }}>{content.created_by_name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Approver Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
              Your Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                  Your Email *
                </label>
                <input
                  type="email"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
                {clientEmailHint && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '13px',
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    💡 Hint: {clientEmailHint}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Feedback */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
              Feedback / Comments (Optional for approval, Required for rejection)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback or requested changes..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleApprove}
              disabled={submitting || !approverName || !approverEmail}
              style={{
                padding: '16px 48px',
                background: submitting || !approverName || !approverEmail 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #28a745, #34c759)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: submitting || !approverName || !approverEmail ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  ✅ Approve Content
                </>
              )}
            </button>
            
            <button
              onClick={handleReject}
              disabled={submitting || !approverName || !approverEmail}
              style={{
                padding: '16px 48px',
                background: submitting || !approverName || !approverEmail 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #dc3545, #c82333)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: submitting || !approverName || !approverEmail ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  ❌ Request Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentApproval;

