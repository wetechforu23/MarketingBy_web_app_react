import React, { useState } from 'react';
import { http } from '../api/http';

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
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
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input
          type="text"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setError('');
          }}
          placeholder="Paste your Facebook access token here..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
            backgroundColor: loading ? '#f7fafc' : 'white',
            cursor: loading ? 'not-allowed' : 'text'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleManualConnect();
            }
          }}
        />
        <button
          onClick={handlePaste}
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: '#f7fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            color: '#4a5568'
          }}
          title="Paste from clipboard"
        >
          📋 Paste
        </button>
      </div>

      <button
        onClick={handleManualConnect}
        disabled={loading || !token.trim()}
        style={{
          width: '100%',
          background: loading || !token.trim() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '10px',
          border: 'none',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: loading || !token.trim() ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          if (!loading && token.trim()) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = loading || !token.trim() ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)';
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
            <span style={{ fontSize: '20px' }}>✋</span>
            Connect Manually
          </>
        )}
      </button>

      {/* Token Info Display */}
      {tokenInfo && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <p style={{ fontWeight: 'bold', color: '#166534', marginBottom: '8px' }}>
            ✅ Token Validated Successfully
          </p>
          <div style={{ color: '#15803d', lineHeight: '1.6' }}>
            <div>• Type: <strong>{tokenInfo.type}</strong></div>
            <div>• Valid: <strong>{tokenInfo.is_valid ? 'Yes' : 'No'}</strong></div>
            {tokenInfo.expires_at && (
              <div>• Expires: <strong>{new Date(tokenInfo.expires_at * 1000).toLocaleDateString()}</strong></div>
            )}
            {tokenInfo.scopes && (
              <div>• Permissions: <strong>{tokenInfo.scopes.length} granted</strong></div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '15px',
          padding: '12px 16px',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Help Text */}
      <div style={{
        marginTop: '15px',
        padding: '12px 16px',
        background: '#eff6ff',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#1e40af'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>💡 Where to get a token:</p>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>Facebook Graph API Explorer</a></li>
          <li>Select your app and click "Get Token" → "Get Page Access Token"</li>
          <li>Select your page and copy the token</li>
          <li>Paste it here - we'll auto-convert to long-lived if needed</li>
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

