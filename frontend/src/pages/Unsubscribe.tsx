import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { http } from '../api/http';

const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');

  const [preferences, setPreferences] = useState({
    educational_content: false,
    product_updates: false,
    events: false,
    monthly_digest: false,
  });

  const [smsPreferences, setSmsPreferences] = useState({
    promotional: false,
    appointment_reminders: false,
    urgent_updates: false,
  });

  const [smsConsent, setSmsConsent] = useState(false);

  const [action, setAction] = useState<'preferences' | 'pause' | 'unsubscribe'>('unsubscribe');
  const [smsAction, setSmsAction] = useState<'preferences' | 'unsubscribe'>('unsubscribe');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');
    const tokenParam = searchParams.get('token');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    if (phoneParam) {
      setPhone(decodeURIComponent(phoneParam));
      setActiveTab('sms');
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    if (activeTab === 'email' && !email) {
      setError('Email address is required');
      return;
    }
    if (activeTab === 'sms' && !phone) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = searchParams.get('token');
      
      if (activeTab === 'email') {
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
      } else {
        // SMS preferences
        if (smsAction === 'preferences') {
          // Update SMS preferences
          await http.post('/sms-preferences/preferences', {
            phone,
            token,
            preferences: smsPreferences
          });
          setSuccess(true);
        } else {
          // Complete SMS unsubscribe
          await http.post('/sms-preferences/unsubscribe', {
            phone,
            token
          });
          setSuccess(true);
        }
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
      background: '#f8f9fa',
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
        <h1 style={{ fontSize: '32px', color: '#2c3e50', marginBottom: '16px', fontWeight: '700' }}>
          All Set!
        </h1>
        <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '30px', lineHeight: '1.6' }}>
          {activeTab === 'email' && action === 'preferences' && 'Your email preferences have been updated successfully.'}
          {activeTab === 'email' && action === 'pause' && 'We\'ve paused your emails for 90 days. See you soon!'}
          {activeTab === 'email' && action === 'unsubscribe' && 'You\'ve been unsubscribed from all future marketing emails.'}
          {activeTab === 'sms' && smsAction === 'preferences' && 'Your text message preferences have been updated successfully.'}
          {activeTab === 'sms' && smsAction === 'unsubscribe' && 'You\'ve been unsubscribed from all future text messages.'}
        </p>
        <p style={{ fontSize: '14px', color: '#6c757d' }}>
          You can close this window now.
        </p>
      </div>
    </div>
  );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '36px', color: '#2c3e50', marginBottom: '12px', fontWeight: '700' }}>
            Let's communicate better!
          </h1>
          <p style={{ fontSize: '16px', color: '#6c757d', lineHeight: '1.6' }}>
            Tell us what YOU want to keep hearing about.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '30px',
          borderBottom: '2px solid #e9ecef'
        }}>
          <button
            onClick={() => setActiveTab('email')}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              color: activeTab === 'email' ? '#4682B4' : '#6c757d',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'email' ? '3px solid #4682B4' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            📧 Email Preferences
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              color: activeTab === 'sms' ? '#4682B4' : '#6c757d',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sms' ? '3px solid #4682B4' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            📱 Text Messages
          </button>
        </div>

        {/* Contact Input */}
        <div style={{ marginBottom: '30px' }}>
          {activeTab === 'email' ? (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4682B4'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            />
          ) : (
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4682B4'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
            />
          )}
        </div>

        {/* Preference Options */}
        {activeTab === 'email' ? (
          <>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px' }}>
                Continue hearing about:
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.educational_content ? '#e3f2fd' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4682B4'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.educational_content ? '#4682B4' : '#e9ecef'}
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
                <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                  Our very best educational content
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  Learn about all areas of Healthcare Digital Marketing.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.product_updates ? '#e3f2fd' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4682B4'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.product_updates ? '#4682B4' : '#e9ecef'}
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
                <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                  Our latest product news and updates
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  Get the inside scoop on how to use MarketingBy tools like a pro.
                </div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: preferences.events ? '#e3f2fd' : 'white'
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4682B4'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = preferences.events ? '#4682B4' : '#e9ecef'}
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
                <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                  Our upcoming events geared toward you
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
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
              backgroundColor: preferences.monthly_digest ? '#e3f2fd' : 'white'
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
                <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                  Or receive just one email per month
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  Enjoy our top articles and need-to-know industry news.
                </div>
              </div>
            </label>
          </div>
            </div>

            {/* Alternative Actions */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
                Alternatively, take a break from our emails for 90 days:
              </h3>

              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: action === 'pause' ? '#e3f2fd' : 'white',
                  borderColor: action === 'pause' ? '#4682B4' : '#e9ecef'
                }}>
                  <input
                    type="radio"
                    name="action"
                    checked={action === 'pause'}
                    onChange={() => setAction('pause')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#2c3e50' }}>Pause for 90 days</span>
                </label>

                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: action === 'unsubscribe' ? '#fff5f5' : 'white',
                  borderColor: action === 'unsubscribe' ? '#fc8181' : '#e9ecef'
                }}>
                  <input
                    type="radio"
                    name="action"
                    checked={action === 'unsubscribe'}
                    onChange={() => setAction('unsubscribe')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#2c3e50' }}>
                    Unsubscribe from all future marketing emails
                  </span>
                </label>
              </div>
            </div>
          </>
        ) : (
          /* SMS Preferences + Twilio-compliant Opt-in Language */
          <>
            {/* Twilio-compliant Opt-in Language */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              border: '2px solid #e9ecef',
              borderRadius: '8px',
              background: '#f7fbff'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#2c3e50', marginBottom: '10px' }}>
                Sign up to receive text messages from WeTechForU
              </h3>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={smsConsent}
                  onChange={(e) => setSmsConsent(e.target.checked)}
                  style={{ marginTop: '3px', width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontWeight: 500, color: '#2c3e50', marginBottom: '8px' }}>
                    I agree to receive text messages from WeTechForU about:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#2c3e50' }}>
                    <li>Promotional offers and discounts</li>
                    <li>Appointment and service reminders</li>
                    <li>Urgent updates</li>
                  </ul>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '10px' }}>
                    Message and data rates may apply. Consent is not a condition of purchase. Reply <strong>STOP</strong> to unsubscribe at any time.
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                    <a href="/privacy" style={{ color: '#4682B4', textDecoration: 'underline' }}>Privacy Policy</a> | <a href="/terms" style={{ color: '#4682B4', textDecoration: 'underline' }}>Terms of Service</a>
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '20px' }}>
                Continue receiving text messages about:
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: smsPreferences.promotional ? '#e3f2fd' : 'white'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4682B4'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = smsPreferences.promotional ? '#4682B4' : '#e9ecef'}
                >
                  <input
                    type="checkbox"
                    checked={smsPreferences.promotional}
                    onChange={(e) => {
                      setSmsPreferences({ ...smsPreferences, promotional: e.target.checked });
                      setSmsAction('preferences');
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                      Promotional offers and discounts
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Get notified about special deals and limited-time offers.
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: smsPreferences.appointment_reminders ? '#e3f2fd' : 'white'
                }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#4682B4'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = smsPreferences.appointment_reminders ? '#4682B4' : '#e9ecef'}
                >
                  <input
                    type="checkbox"
                    checked={smsPreferences.appointment_reminders}
                    onChange={(e) => {
                      setSmsPreferences({ ...smsPreferences, appointment_reminders: e.target.checked });
                      setSmsAction('preferences');
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                      Appointment and service reminders
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Receive important reminders about your appointments.
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
                  backgroundColor: smsPreferences.urgent_updates ? '#e3f2fd' : 'white'
                }}>
                  <input
                    type="checkbox"
                    checked={smsPreferences.urgent_updates}
                    onChange={(e) => {
                      setSmsPreferences({ ...smsPreferences, urgent_updates: e.target.checked });
                      setSmsAction('preferences');
                    }}
                    style={{ marginTop: '2px', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                      Urgent updates only
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>
                      Only receive critical time-sensitive information.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* SMS Unsubscribe Option */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
                Or stop all text messages:
              </h3>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: smsAction === 'unsubscribe' ? '#fff5f5' : 'white',
                borderColor: smsAction === 'unsubscribe' ? '#fc8181' : '#e9ecef'
              }}>
                <input
                  type="radio"
                  name="smsAction"
                  checked={smsAction === 'unsubscribe'}
                  onChange={() => setSmsAction('unsubscribe')}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500', color: '#2c3e50' }}>
                  Unsubscribe from all text messages
                </span>
              </label>
            </div>
          </>
        )}

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
          disabled={loading || (activeTab === 'email' && !email) || (activeTab === 'sms' && !phone)}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            background: (activeTab === 'email' && action === 'unsubscribe') || (activeTab === 'sms' && smsAction === 'unsubscribe')
              ? 'linear-gradient(135deg, #fc8181 0%, #f56565 100%)' 
              : 'linear-gradient(135deg, #4682B4 0%, #87CEEB 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || (activeTab === 'email' && !email) || (activeTab === 'sms' && !phone) ? 'not-allowed' : 'pointer',
            opacity: loading || (activeTab === 'email' && !email) || (activeTab === 'sms' && !phone) ? 0.6 : 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(70, 130, 180, 0.4)'
          }}
        >
          {loading ? 'Processing...' : 
           activeTab === 'email' ? (
             action === 'preferences' ? 'Update My Email Preferences' :
             action === 'pause' ? 'Pause Emails for 90 Days' :
             'Unsubscribe from Emails'
           ) : (
             smsAction === 'preferences' ? 'Update My Text Preferences' :
             'Unsubscribe from Text Messages'
           )}
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

