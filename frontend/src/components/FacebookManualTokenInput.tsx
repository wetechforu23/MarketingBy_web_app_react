import React, { useState } from 'react';
import { http } from '../api/http';

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

interface FacebookManualTokenInputProps {
  clientId: string;
  onPagesReceived: (pages: PageInfo[], token: string) => void;
}

const FacebookManualTokenInput: React.FC<FacebookManualTokenInputProps> = ({ 
  clientId, 
  onPagesReceived 
}) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const handleManualConnect = async () => {
    if (!token.trim()) {
      setError('Please enter a Facebook token');
      return;
    }

    setLoading(true);
    setError('');
    setTokenInfo(null);

    try {
      console.log('📤 Sending manual token to backend...');
      
      const response = await http.post(`/facebook-connect/manual/${clientId}`, { token });

      if (response.data.success) {
        console.log('✅ Token processed successfully');
        
        setTokenInfo(response.data.tokenInfo);
        
        if (response.data.pages && response.data.pages.length > 0) {
          // Pass pages and processed token to parent
          onPagesReceived(response.data.pages, response.data.processedToken);
        } else {
          setError('No pages found for this token. Make sure the token has access to at least one page.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error processing manual token:', error);
      setError(error.response?.data?.error || 'Failed to process token. Please check if the token is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToken(text);
      setError('');
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      setError('Failed to paste from clipboard. Please paste manually.');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#333'
        }}>
          Facebook Access Token
        </label>
        <div style={{ position: 'relative' }}>
          <textarea
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError('');
            }}
            placeholder="Paste your Facebook User or Page Access Token here..."
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: error ? '2px solid #dc3545' : '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = '#1877f2';
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          />
          <button
            onClick={handlePaste}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '6px 12px',
              background: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f0f0f0'}
          >
            📋 Paste
          </button>
        </div>
        {error && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#856404'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Token Info Display */}
      {tokenInfo && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: '#e7f3ff',
          border: '1px solid #1877f2',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1877f2' }}>
            ℹ️ Token Information
          </h4>
          <div style={{ fontSize: '13px', color: '#666' }}>
            <div><strong>Type:</strong> {tokenInfo.type}</div>
            <div><strong>Valid:</strong> {tokenInfo.is_valid ? '✅ Yes' : '❌ No'}</div>
            {tokenInfo.expires_at && (
              <div><strong>Expires:</strong> {new Date(tokenInfo.expires_at * 1000).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleManualConnect}
        disabled={loading || !token.trim()}
        style={{
          width: '100%',
          padding: '16px 32px',
          background: loading || !token.trim() 
            ? '#ccc' 
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '700',
          cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          boxShadow: loading || !token.trim() 
            ? 'none' 
            : '0 6px 20px rgba(240, 147, 251, 0.4)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          if (!loading && token.trim()) {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(240, 147, 251, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && token.trim()) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(240, 147, 251, 0.4)';
          }
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Processing Token...
          </>
        ) : (
          <>
            🎯 Process Manual Token
          </>
        )}
      </button>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
          💡 How to get your token:
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Go to Facebook Graph API Explorer</li>
          <li>Select your app and get a User Access Token</li>
          <li>Request permissions: pages_show_list, pages_read_engagement, read_insights</li>
          <li>Copy the token and paste it above</li>
        </ol>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FacebookManualTokenInput;
