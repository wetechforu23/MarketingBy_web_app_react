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

  useEffect(() => {
    fetchContent();
  }, [token]);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`/api/content/approve/${token}`);
      setContent(response.data.content);
      setLoading(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Invalid or expired approval link');
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approverName || !approverEmail) {
      alert('Please enter your name and email');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/approve-client`, {
        token,
        feedback,
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('approve');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approverName || !approverEmail) {
      alert('Please enter your name and email');
      return;
    }
    
    if (!feedback) {
      alert('Please provide feedback for rejection');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`/api/content/${content?.id}/reject-client`, {
        token,
        feedback,
        approver_name: approverName,
        approver_email: approverEmail,
        access_method: 'secure_link'
      });
      
      setSuccess(true);
      setAction('reject');
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
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

