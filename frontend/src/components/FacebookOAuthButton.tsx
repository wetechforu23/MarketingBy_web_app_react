import React, { useState } from 'react';
import { http } from '../api/http';

interface FacebookOAuthButtonProps {
  clientId: string;
}

const FacebookOAuthButton: React.FC<FacebookOAuthButtonProps> = ({ clientId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOAuthConnect = async () => {
    setLoading(true);
    setError('');

    try {
      // Get OAuth URL from backend
      const response = await http.post(`/facebook-connect/oauth/start/${clientId}`);
      
      if (response.data.success && response.data.oauthUrl) {
        // Redirect to Facebook OAuth
        window.location.href = response.data.oauthUrl;
      } else {
        setError('Failed to generate OAuth URL');
      }
    } catch (error: any) {
      console.error('Error starting OAuth:', error);
      setError(error.response?.data?.error || 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleOAuthConnect}
        disabled={loading}
        style={{
          background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1877f2 0%, #0c63d4 100%)',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '10px',
          border: 'none',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 15px rgba(24, 119, 242, 0.3)',
          transition: 'all 0.3s ease',
          width: '100%',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(24, 119, 242, 0.3)';
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
            Redirecting to Facebook...
          </>
        ) : (
          <>
            <span style={{ fontSize: '24px' }}>📘</span>
            Connect with Facebook
          </>
        )}
      </button>

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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FacebookOAuthButton;

