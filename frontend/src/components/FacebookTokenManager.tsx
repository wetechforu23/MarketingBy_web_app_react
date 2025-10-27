import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface FacebookTokenManagerProps {
  clientId: number;
  onTokenSaved: () => void;
}

const FacebookTokenManager: React.FC<FacebookTokenManagerProps> = ({ clientId, onTokenSaved }) => {
  const [currentToken, setCurrentToken] = useState<string>('');
  const [currentPageId, setCurrentPageId] = useState<string>('');
  const [manualToken, setManualToken] = useState<string>('');
  const [manualPageId, setManualPageId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetchCredentials();
  }, [clientId]);

  const fetchCredentials = async () => {
    try {
      const response = await http.get(`/client-credentials/${clientId}/facebook`);
      if (response.data.success && response.data.credentials) {
        setCurrentToken(response.data.credentials.access_token || '');
        setCurrentPageId(response.data.credentials.page_id || '');
      }
    } catch (error) {
      console.log('No credentials found');
    }
  };

  const handleSave = async () => {
    if (!manualToken || !manualPageId) {
      setMessage('❌ Please enter both Page ID and Access Token');
      return;
    }

    setSaving(true);
    setMessage('🔄 Saving...');

    try {
      const response = await http.post(`/facebook/connect/${clientId}`, {
        pageId: manualPageId,
        accessToken: manualToken
      });

      if (response.data.success) {
        setMessage('✅ Token saved successfully!');
        setCurrentToken(manualToken);
        setCurrentPageId(manualPageId);
        setTimeout(() => {
          onTokenSaved();
        }, 1000);
      } else {
        setMessage('❌ Failed to save: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#17a2b8',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '12px 12px 0 0'
      }}>
        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          🔑 Facebook Access Token Management
        </h4>
      </div>

      {/* Content */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '0 0 12px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '2px solid #17a2b8',
        borderTop: 'none'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '25px'
        }}>
          
          {/* Box 1: Current Token */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            border: '2px solid #28a745'
          }}>
            <h5 style={{ margin: '0 0 15px 0', color: '#28a745' }}>
              📋 Current Credentials
            </h5>

            {currentToken ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px' }}>Page ID:</strong>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    marginTop: '5px',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}>
                    {currentPageId}
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ fontSize: '13px' }}>Token:</strong>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    marginTop: '5px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    wordBreak: 'break-all'
                  }}>
                    {currentToken.substring(0, 20)}...{currentToken.substring(currentToken.length - 15)}
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                      ({currentToken.length} chars)
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#d4edda',
                  padding: '8px',
                  borderRadius: '5px',
                  fontSize: '13px',
                  color: '#155724'
                }}>
                  ✅ Token Configured
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '15px',
                borderRadius: '5px',
                fontSize: '14px',
                color: '#856404'
              }}>
                ⚠️ No token found. Enter one in the box to the right →
              </div>
            )}
          </div>

          {/* Box 2: Manual Input */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            border: '2px solid #4267B2'
          }}>
            <h5 style={{ margin: '0 0 15px 0', color: '#4267B2' }}>
              ✏️ Enter Token Manually
            </h5>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                Facebook Page ID:
              </label>
              <input
                type="text"
                placeholder="e.g., 744651835408507"
                value={manualPageId}
                onChange={(e) => setManualPageId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                Access Token:
              </label>
              <textarea
                placeholder="Paste your Facebook access token here..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !manualToken || !manualPageId}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: saving ? '#6c757d' : '#4267B2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: saving || !manualToken || !manualPageId ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '⏳ Saving...' : '💾 Save & Load Data'}
            </button>

            {message && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                borderRadius: '5px',
                backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
                color: message.includes('✅') ? '#155724' : '#721c24',
                fontSize: '13px'
              }}>
                {message}
              </div>
            )}

            <div style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#e7f3ff',
              borderRadius: '5px',
              fontSize: '12px',
              color: '#004085',
              lineHeight: '1.5'
            }}>
              <strong>💡 How to get token:</strong><br />
              1. Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">Graph API Explorer</a><br />
              2. Select your page<br />
              3. Get User Access Token<br />
              4. Add permissions: pages_show_list, read_insights<br />
              5. Copy and paste above
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookTokenManager;

