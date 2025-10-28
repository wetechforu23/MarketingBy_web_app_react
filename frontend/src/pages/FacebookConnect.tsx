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
        console.error('Error parsing OAuth callback data:', error);
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
      const response = await http.delete(`/facebook-connect/${clientId}`);
      if (response.data.success) {
        setConnectionStatus('not_connected');
        setConnectedPageName('');
        alert('✅ Facebook disconnected successfully');
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      alert(`❌ Failed to disconnect: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleBackToDashboard = () => {
    navigate(`/app/client-management`);
  };

  if (!clientId) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <h2>❌ No Client Selected</h2>
        <p>Please select a client from the dashboard.</p>
        <button onClick={handleBackToDashboard}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '30px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <button 
            onClick={handleBackToDashboard}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ← Back to Dashboard
          </button>
          
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            📘 Facebook Connection
          </h1>
          <p style={{ color: '#718096', fontSize: '16px' }}>
            Connect your Facebook page to manage posts and analytics
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Connection Status */}
        {connectionStatus === 'loading' ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div className="spinner"></div>
            <p>Loading connection status...</p>
          </div>
        ) : connectionStatus === 'connected' ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px'
              }}>
                ✓
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', marginBottom: '5px' }}>
                  Connected Successfully
                </h3>
                <p style={{ color: '#718096', fontSize: '14px' }}>
                  Page: <strong>{connectedPageName}</strong>
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDisconnect}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔌 Disconnect Facebook
            </button>
          </div>
        ) : (
          <>
            {/* Page Selector */}
            {showPageSelector ? (
              <FacebookPageSelector
                pages={pages}
                onPageSelected={handlePageSelected}
                onCancel={() => {
                  setShowPageSelector(false);
                  setPages([]);
                  setProcessedToken('');
                }}
              />
            ) : (
              <>
                {/* Connection Methods */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '30px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a202c', marginBottom: '15px' }}>
                    Choose Connection Method
                  </h2>
                  <p style={{ color: '#718096', marginBottom: '30px', fontSize: '15px' }}>
                    Select how you'd like to connect your Facebook page
                  </p>

                  {/* Method 1: OAuth (Recommended) */}
                  <div style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '25px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
                        🔗 Method 1: Connect with Link
                      </h3>
                      <span style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        RECOMMENDED
                      </span>
                    </div>
                    <p style={{ color: '#718096', marginBottom: '20px', fontSize: '14px' }}>
                      Secure OAuth flow. You'll login to Facebook and authorize our app to manage your page.
                    </p>
                    <FacebookOAuthButton clientId={clientId} />
                  </div>

                  {/* Method 2: Manual Token */}
                  <div style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '25px'
                  }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c', marginBottom: '15px' }}>
                      ✋ Method 2: Manual Token Input
                    </h3>
                    <p style={{ color: '#718096', marginBottom: '20px', fontSize: '14px' }}>
                      Paste any Facebook token. We'll automatically convert it to a long-lived page token if needed.
                    </p>
                    <FacebookManualTokenInput 
                      clientId={clientId}
                      onPagesReceived={handleManualPagesReceived}
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a202c', marginBottom: '10px' }}>
                    ℹ️ What happens next?
                  </h4>
                  <ul style={{ color: '#718096', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
                    <li>You'll be asked to select which Facebook page to connect</li>
                    <li>We'll store a long-lived page token (never expires)</li>
                    <li>You'll be able to post content and view analytics from your dashboard</li>
                    <li>All permissions are verified for security</li>
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 20px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FacebookConnect;

