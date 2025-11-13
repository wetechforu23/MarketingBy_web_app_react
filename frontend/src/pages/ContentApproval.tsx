import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// =====================================================
// ContentApproval Component (Public - No Auth Required)
// Facebook-Style Post Preview with Interactive Features
// =====================================================

interface Content {
  id: number;
  client_id: number;
  title: string;
  content_text: string;
  content_type: string;
  media_urls?: string[];
  hashtags?: string[];
  target_platforms?: string[];
  destination_url?: string;
  status: string;
  created_by_name?: string;
  client_name?: string;
  facebook_page_name?: string;
  approval_token_expires_at?: string;
  client_email?: string;
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
  
  // Interactive features
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);

  useEffect(() => {
    fetchContent();
  }, [token]);

  useEffect(() => {
    // Extract hashtags from content_text if hashtags array is empty
    if (content) {
      let tags = content.hashtags || [];
      if (tags.length === 0 && content.content_text) {
        const hashtagRegex = /#[\w]+/g;
        const extractedHashtags = content.content_text.match(hashtagRegex) || [];
        tags = [...new Set(extractedHashtags)];
      }
      setHashtags(tags);
      
      // If rejected, show comments section (feedback required)
      if (rejected) {
        setShowComments(true);
      }
    }
  }, [content, rejected]);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`/api/content/approve/${token}`);
      const contentData = response.data.content;
      
      // Debug logging
      console.log('📋 Content received from API:', {
        id: contentData?.id,
        title: contentData?.title,
        destination_url: contentData?.destination_url,
        hashtags: contentData?.hashtags,
        hashtags_type: typeof contentData?.hashtags,
        hashtags_is_array: Array.isArray(contentData?.hashtags),
        media_urls: contentData?.media_urls
      });
      
      setContent(contentData);
      setLoading(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid or expired approval link');
      setLoading(false);
    }
  };

  const maskEmail = (email: string): string => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const maskedLocal = local.length > 2 
      ? `${local.substring(0, 2)}${'X'.repeat(Math.min(local.length - 2, 5))}`
      : 'XX';
    const maskedDomain = domain.length > 1
      ? `${domain.substring(0, 1)}${'X'.repeat(Math.min(domain.length - 1, 4))}`
      : 'X';
    return `${maskedLocal}@${maskedDomain}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showErrorModal = (message: string) => {
    alert(message);
  };

  const handleApprove = () => {
    setApproved(true);
    setRejected(false);
    setShowComments(true); // Open comments section on approve (optional feedback)
  };

  const handleReject = () => {
    setRejected(true);
    setApproved(false);
    setShowComments(true); // Required to show comments on reject (mandatory feedback)
  };

  const handleSubmitApprove = async () => {
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
      const maskedEmail = maskEmail(content.client_email);
      showErrorModal(`The email you entered does not match your account email. Please use: ${maskedEmail}`);
      return;
    }
    
    // Feedback is optional for approval
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/approve-client`, {
        token,
        feedback: feedback.trim() || null,
        notes: feedback.trim() || null,
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('approve');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred';
      showErrorModal(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReject = async () => {
    if (!approverName || !approverEmail) {
      showErrorModal('Please enter your name and email address to proceed.');
      return;
    }
    
    // Validate email format
    if (!validateEmail(approverEmail)) {
      showErrorModal('Invalid email address format.\n\nPlease enter a valid email address.\n\nExample: yourname@example.com');
      return;
    }
    
    // Validate email matches client account email
    if (content?.client_email && approverEmail.toLowerCase() !== content.client_email.toLowerCase()) {
      const maskedEmail = maskEmail(content.client_email);
      showErrorModal(`The email you entered does not match your account email. Please use: ${maskedEmail}`);
      return;
    }
    
    // Feedback is MANDATORY for rejection
    if (!feedback.trim()) {
      showErrorModal('Feedback is required when rejecting content. Please provide your feedback in the comments section.');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/reject-client`, {
        token,
        feedback: feedback.trim(),
        notes: feedback.trim(),
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('reject');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred';
      showErrorModal(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const pageName = content?.facebook_page_name || content?.client_name || 'Page Name';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <div style={{ textAlign: 'center', color: '#65676b' }}>
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
        background: '#f0f2f5',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          background: 'white',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>❌</div>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', color: '#050505' }}>
            Invalid Link
          </h1>
          <p style={{ color: '#65676b', fontSize: '16px', marginBottom: '2rem' }}>
            {error}
          </p>
          <p style={{ color: '#8a8d91', fontSize: '14px' }}>
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
        background: '#f0f2f5',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '600px',
          background: 'white',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>
            {action === 'approve' ? '✅' : '❌'}
          </div>
          <h1 style={{ fontSize: '28px', marginBottom: '1rem', color: '#050505' }}>
            {action === 'approve' ? 'Content Approved!' : 'Content Rejected'}
          </h1>
          <p style={{ color: '#65676b', fontSize: '16px', marginBottom: '2rem' }}>
            {action === 'approve' 
              ? 'Thank you! The content has been approved and will be posted to social media soon.'
              : 'Your feedback has been sent to the content team. They will revise the content and send it back for your review.'
            }
          </p>
          {feedback && (
            <div style={{
              background: '#f0f2f5',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <strong style={{ color: '#050505', fontSize: '14px' }}>Your Feedback:</strong>
              <p style={{ color: '#65676b', fontSize: '14px', marginTop: '0.5rem' }}>
                {feedback}
              </p>
            </div>
          )}
          <p style={{ color: '#8a8d91', fontSize: '14px' }}>
            You can safely close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '680px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '0.5rem', color: '#050505' }}>
            📱 Social Media Content Review
          </h1>
          <p style={{ fontSize: '14px', color: '#65676b', marginBottom: '1rem' }}>
            Please review the content below and provide your feedback
          </p>
          {content?.approval_token_expires_at && (
            <div style={{
              padding: '0.5rem 1rem',
              background: '#f0f2f5',
              borderRadius: '6px',
              display: 'inline-block',
              fontSize: '13px',
              color: '#65676b'
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

        {/* Facebook-Style Post Preview */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          marginBottom: '1rem'
        }}>
          {/* Post Header */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e4e6eb'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2E86AB, #1a5f7a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '8px',
              fontSize: '18px'
            }}>
              {pageName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#050505', marginBottom: '2px' }}>
                {pageName}
              </div>
              <div style={{ fontSize: '13px', color: '#65676b' }}>
                <span>Sponsored</span>
                <span style={{ margin: '0 4px' }}>·</span>
                <span>🌐</span>
              </div>
            </div>
            <div style={{ color: '#65676b', fontSize: '20px', cursor: 'pointer' }}>⋯</div>
          </div>

          {/* Post Content */}
          <div style={{ padding: '12px 16px' }}>
            {content?.content_text && (
              <div style={{
                fontSize: '15px',
                lineHeight: '1.33',
                color: '#050505',
                whiteSpace: 'pre-wrap',
                marginBottom: hashtags.length > 0 ? '8px' : '0'
              }}>
                {content.content_text.split(/(#[\w]+)/g).map((part, idx) => {
                  if (part.match(/#[\w]+/)) {
                    return <span key={idx} style={{ color: '#1877f2' }}>{part}</span>;
                  }
                  return <span key={idx}>{part}</span>;
                })}
              </div>
            )}
            
            {hashtags.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '15px', color: '#1877f2' }}>
                {hashtags.join(' ')}
              </div>
            )}
          </div>

          {/* Post Media */}
          {content?.media_urls && content.media_urls.length > 0 && (
            <div style={{ background: '#f0f2f5' }}>
              {content.media_urls.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImage(url)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <img
                    src={url}
                    alt={`Post Image ${idx + 1}`}
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Link Preview (if destination_url exists) */}
          {content?.destination_url && (
            <div style={{
              borderTop: '1px solid #e4e6eb',
              padding: '12px 16px',
              background: '#f0f2f5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#65676b',
                    textTransform: 'uppercase',
                    marginBottom: '4px'
                  }}>
                    {(() => {
                      try {
                        const url = new URL(content.destination_url.startsWith('http') ? content.destination_url : 'https://' + content.destination_url);
                        return url.hostname.replace('www.', '');
                      } catch {
                        return 'WEBSITENAME.COM';
                      }
                    })()}
                  </div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#050505',
                    marginBottom: '4px'
                  }}>
                    {content.title}
                  </div>
                </div>
                <a
                  href={content.destination_url.startsWith('http') ? content.destination_url : 'https://' + content.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#e4e6eb',
                    color: '#050505',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '600'
                  }}
                >
                  Learn More
                </a>
              </div>
            </div>
          )}

          {/* Approve/Reject Buttons */}
          <div style={{
            borderTop: '1px solid #e4e6eb',
            padding: '8px 16px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleApprove}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: approved ? '#10b981' : 'transparent',
                color: approved ? 'white' : '#65676b',
                border: '1px solid #e4e6eb',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>✅</span>
              <span>Approve</span>
            </button>
            <button
              onClick={handleReject}
              style={{
                flex: 1,
                padding: '8px 16px',
                background: rejected ? '#dc3545' : 'transparent',
                color: rejected ? 'white' : '#65676b',
                border: '1px solid #e4e6eb',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>❌</span>
              <span>Reject</span>
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div style={{
              borderTop: '1px solid #e4e6eb',
              padding: '12px 16px',
              background: '#f0f2f5'
            }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#050505',
                marginBottom: '12px'
              }}>
                💬 Comments / Feedback
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={rejected ? "Enter your comments or feedback (required)..." : "Enter your comments or feedback (optional)..."}
                rows={4}
                required={rejected}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: rejected && !feedback.trim() ? '2px solid #dc3545' : '1px solid #e4e6eb',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              {rejected && !feedback.trim() && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#dc3545',
                  fontWeight: '500'
                }}>
                  ⚠️ Feedback is required when rejecting content
                </div>
              )}
            </div>
          )}
        </div>

        {/* Approver Information */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#050505'
          }}>
            Your Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#050505',
                fontSize: '14px'
              }}>
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
                  borderRadius: '6px',
                  border: '1px solid #e4e6eb',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '600',
                color: '#050505',
                fontSize: '14px'
              }}>
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
                  borderRadius: '6px',
                  border: '1px solid #e4e6eb',
                  fontSize: '15px',
                  boxSizing: 'border-box'
                }}
              />
              {content?.client_email && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: '#65676b',
                  fontStyle: 'italic'
                }}>
                  💡 Hint: {maskEmail(content.client_email)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={approved ? handleSubmitApprove : handleSubmitReject}
            disabled={submitting || !approverName || !approverEmail || (rejected && !feedback.trim())}
            style={{
              minWidth: '300px',
              padding: '14px 32px',
              background: submitting || !approverName || !approverEmail || (rejected && !feedback.trim())
                ? '#e4e6eb'
                : approved 
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: submitting || !approverName || !approverEmail || (rejected && !feedback.trim()) ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Processing...
              </>
            ) : (
              <>📝 Submit {approved ? 'Approval' : 'Rejection'}</>
            )}
          </button>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem',
            cursor: 'pointer'
          }}
        >
          <img
            src={selectedImage}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentApproval;
