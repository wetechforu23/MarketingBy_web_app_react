import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { http } from '../api/http';

const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [preferences, setPreferences] = useState({
    educational_content: false,
    product_updates: false,
    events: false,
    monthly_digest: false,
  });

  const [action, setAction] = useState<'preferences' | 'pause' | 'unsubscribe'>('unsubscribe');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = searchParams.get('token');
      
      if (action === 'preferences') {
        // Update email preferences
        await http.post('/email-preferences/preferences', {
          email,
          token,
          preferences
        });
        setSuccess(true);
      } else if (action === 'pause') {
        // Pause for 90 days
        await http.post('/email-preferences/pause', {
          email,
          token,
          days: 90
        });
        setSuccess(true);
      } else {
        // Complete unsubscribe
        await http.post('/email-preferences/unsubscribe', {
          email,
          token
        });
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px 40px',
          maxWidth: '600px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h1 style={{ fontSize: '32px', color: '#2d3748', marginBottom: '16px' }}>
            All Set!
          </h1>
          <p style={{ fontSize: '18px', color: '#718096', marginBottom: '30px' }}>
            {action === 'preferences' && 'Your email preferences have been updated successfully.'}
            {action === 'pause' && 'We\'ve paused your emails for 90 days. See you soon!'}
            {action === 'unsubscribe' && 'You\'ve been unsubscribed from all future marketing emails.'}
          </p>
          <p style={{ fontSize: '14px', color: '#a0aec0' }}>
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', color: '#2d3748', marginBottom: '12px' }}>
            Let's communicate better!
          </h1>
          <p style={{ fontSize: '16px', color: '#718096' }}>
            Tell us what YOU want to keep hearing about.
          </p>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: '30px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Preference Options */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', marginBottom: '20px' }}>
            Continue hearing about:
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.educational_content ? '#f0f4ff' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.educational_content ? '#667eea' : '#e2e8f0'}
            >
              <input
                type="checkbox"
                checked={preferences.educational_content}
                onChange={(e) => {
                  setPreferences({ ...preferences, educational_content: e.target.checked });
                  setAction('preferences');
                }}
                style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                  Our very best educational content
                </div>
                <div style={{ fontSize: '14px', color: '#718096' }}>
                  Learn about all areas of Healthcare Digital Marketing.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.product_updates ? '#f0f4ff' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.product_updates ? '#667eea' : '#e2e8f0'}
            >
              <input
                type="checkbox"
                checked={preferences.product_updates}
                onChange={(e) => {
                  setPreferences({ ...preferences, product_updates: e.target.checked });
                  setAction('preferences');
                }}
                style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                  Our latest product news and updates
                </div>
                <div style={{ fontSize: '14px', color: '#718096' }}>
                  Get the inside scoop on how to use MarketingBy tools like a pro.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.events ? '#f0f4ff' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.events ? '#667eea' : '#e2e8f0'}
            >
              <input
                type="checkbox"
                checked={preferences.events}
                onChange={(e) => {
                  setPreferences({ ...preferences, events: e.target.checked });
                  setAction('preferences');
                }}
                style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                  Our upcoming events geared toward you
                </div>
                <div style={{ fontSize: '14px', color: '#718096' }}>
                  Don't miss out on exclusive healthcare marketing events and webinars.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #667eea',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.monthly_digest ? '#f0f4ff' : 'white'
            }}>
              <input
                type="checkbox"
                checked={preferences.monthly_digest}
                onChange={(e) => {
                  setPreferences({ ...preferences, monthly_digest: e.target.checked });
                  setAction('preferences');
                }}
                style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                  Or receive just one email per month
                </div>
                <div style={{ fontSize: '14px', color: '#718096' }}>
                  Enjoy our top articles and need-to-know industry news.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Alternative Actions */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', marginBottom: '16px' }}>
            Alternatively, take a break from our emails for 90 days:
          </h3>

          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: action === 'pause' ? '#f0f4ff' : 'white',
              borderColor: action === 'pause' ? '#667eea' : '#e2e8f0'
            }}>
              <input
                type="radio"
                name="action"
                checked={action === 'pause'}
                onChange={() => setAction('pause')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', color: '#2d3748' }}>Pause for 90 days</span>
            </label>

            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: action === 'unsubscribe' ? '#fff5f5' : 'white',
              borderColor: action === 'unsubscribe' ? '#fc8181' : '#e2e8f0'
            }}>
              <input
                type="radio"
                name="action"
                checked={action === 'unsubscribe'}
                onChange={() => setAction('unsubscribe')}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', color: '#2d3748' }}>
                Unsubscribe from all future marketing emails
              </span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#fed7d7',
            color: '#742a2a',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            background: action === 'unsubscribe' 
              ? 'linear-gradient(135deg, #fc8181 0%, #f56565 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !email ? 'not-allowed' : 'pointer',
            opacity: loading || !email ? 0.6 : 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
        >
          {loading ? 'Processing...' : 
           action === 'preferences' ? 'Update My Preferences' :
           action === 'pause' ? 'Pause for 90 Days' :
           'Unsubscribe'}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#a0aec0' }}>
            © {new Date().getFullYear()} WeTechForU Healthcare Marketing. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;

