import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import FacebookOAuthButton from '../components/FacebookOAuthButton';
import FacebookManualTokenInput from '../components/FacebookManualTokenInput';
import FacebookPageSelector from '../components/FacebookPageSelector';

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

const FacebookConnect: React.FC = () => {
  const { clientId } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [connectionStatus, setConnectionStatus] = useState<'not_connected' | 'connected' | 'loading'>('loading');
  const [connectedPageName, setConnectedPageName] = useState<string>('');
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [processedToken, setProcessedToken] = useState<string>('');
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'oauth' | 'manual' | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (clientId) {
      checkConnectionStatus();
    }
  }, [clientId]);

  useEffect(() => {
    // Handle OAuth callback
    const pagesParam = searchParams.get('pages');
    const tokenParam = searchParams.get('token');
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`OAuth Error: ${searchParams.get('error_description') || errorParam}`);
    } else if (successParam && pagesParam && tokenParam) {
      try {
        const decodedPages = JSON.parse(decodeURIComponent(pagesParam));
        const decodedToken = decodeURIComponent(tokenParam);
        
        setPages(decodedPages);
        setProcessedToken(decodedToken);
        setShowPageSelector(true);
        setConnectionMethod('oauth');
        
        // Clean up URL
        window.history.replaceState({}, '', `/app/facebook-connect/${clientId}`);
      } catch (error) {
        console.error('Failed to parse OAuth callback data:', error);
        setError('Failed to process OAuth callback');
      }
    }
  }, [searchParams, clientId]);

  const checkConnectionStatus = async () => {
    try {
      const response = await http.get(`/facebook-connect/status/${clientId}`);
      if (response.data.connected) {
        setConnectionStatus('connected');
        setConnectedPageName(response.data.pageName || 'Unknown Page');
      } else {
        setConnectionStatus('not_connected');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus('not_connected');
    }
  };

  const handleManualPagesReceived = (receivedPages: PageInfo[], token: string) => {
    setPages(receivedPages);
    setProcessedToken(token);
    setShowPageSelector(true);
    setConnectionMethod('manual');
  };

  const handlePageSelected = async (pageId: string, pageToken: string, pageName: string) => {
    try {
      const endpoint = connectionMethod === 'oauth' 
        ? `/facebook-connect/oauth/complete/${clientId}`
        : `/facebook-connect/manual/complete/${clientId}`;

      const response = await http.post(endpoint, {
        pageId,
        pageToken,
        pageName
      });

      if (response.data.success) {
        setConnectionStatus('connected');
        setConnectedPageName(pageName);
        setShowPageSelector(false);
        setPages([]);
        alert('✅ Facebook page connected successfully!');
      }
    } catch (error: any) {
      console.error('Error connecting page:', error);
      alert(`❌ Failed to connect page: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Facebook?')) return;

    try {
      await http.post(`/facebook-connect/disconnect/${clientId}`);
      setConnectionStatus('not_connected');
      setConnectedPageName('');
      alert('✅ Facebook disconnected successfully!');
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      alert(`❌ Failed to disconnect: ${error.response?.data?.error || error.message}`);
    }
  };

  if (connectionStatus === 'loading') {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p>Loading connection status...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📘</div>
          <h1 style={{ margin: '0 0 15px 0', fontSize: '36px', color: '#1877f2' }}>
            2-Way Facebook Connection
          </h1>
          <p style={{ margin: 0, fontSize: '18px', color: '#666' }}>
            Connect your Facebook page with automatic token management
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <strong style={{ color: '#856404' }}>⚠️ {error}</strong>
          </div>
        )}

        {/* Connection Status */}
        {connectionStatus === 'connected' ? (
          <div style={{
            background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '30px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            border: '3px solid #28a745'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ margin: '0 0 10px 0', color: '#155724', fontSize: '32px' }}>
                Connected Successfully!
              </h2>
              <p style={{ margin: 0, fontSize: '20px', color: '#155724' }}>
                Page: <strong>{connectedPageName}</strong>
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                width: '100%',
                padding: '16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
            >
              🔌 Disconnect Facebook Page
            </button>
          </div>
        ) : showPageSelector ? (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <FacebookPageSelector
              pages={pages}
              onPageSelected={handlePageSelected}
              onCancel={() => {
                setShowPageSelector(false);
                setPages([]);
                setProcessedToken('');
                setConnectionMethod(null);
              }}
            />
          </div>
        ) : (
          <>
            {/* Method Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '30px',
              marginBottom: '30px'
            }}>
              {/* Method 1: OAuth */}
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: '3px solid #667eea'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '15px' }}>🔐</div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#667eea', fontSize: '28px' }}>
                    Method 1: OAuth
                  </h2>
                  <p style={{ margin: 0, fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                    Secure automatic connection via Facebook OAuth. Recommended for ease of use.
                  </p>
                </div>
                <FacebookOAuthButton clientId={clientId || ''} />
              </div>

              {/* Method 2: Manual Token */}
              <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '40px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                border: '3px solid #f093fb'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '15px' }}>🎯</div>
                  <h2 style={{ margin: '0 0 10px 0', color: '#f093fb', fontSize: '28px' }}>
                    Method 2: Manual Token
                  </h2>
                  <p style={{ margin: 0, fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                    Paste your Facebook token directly. For advanced users with tokens ready.
                  </p>
                </div>
                <FacebookManualTokenInput
                  clientId={clientId || ''}
                  onPagesReceived={handleManualPagesReceived}
                />
              </div>
            </div>

            {/* Features Section */}
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 25px 0', fontSize: '24px', color: '#333', textAlign: 'center' }}>
                ✨ Features Included
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                {[
                  { icon: '🔄', title: 'Auto Token Conversion', desc: 'Converts short-lived to long-lived tokens' },
                  { icon: '📄', title: 'Visual Page Selector', desc: 'Beautiful UI to choose your page' },
                  { icon: '🔒', title: 'Secure Storage', desc: 'Encrypted database storage' },
                  { icon: '📊', title: 'Real-time Analytics', desc: 'Immediate Facebook insights access' },
                  { icon: '⚡', title: 'Instant Validation', desc: 'Token validation before storing' }
                ].map((feature, idx) => (
                  <div key={idx} style={{
                    padding: '20px',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>{feature.icon}</div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>{feature.title}</h4>
                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Back Button */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                onClick={() => navigate('/app/client-management')}
                style={{
                  padding: '14px 32px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid white',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                ← Back to Client Management
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FacebookConnect;
