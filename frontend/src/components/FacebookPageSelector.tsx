import React, { useState } from 'react';

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

interface FacebookPageSelectorProps {
  pages: PageInfo[];
  onPageSelected: (pageId: string, pageToken: string, pageName: string) => void;
  onCancel: () => void;
}

const FacebookPageSelector: React.FC<FacebookPageSelectorProps> = ({ 
  pages, 
  onPageSelected,
  onCancel
}) => {
  const [selectedPage, setSelectedPage] = useState<PageInfo | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleConfirmSelection = () => {
    if (!selectedPage) return;

    setProcessing(true);
    onPageSelected(selectedPage.id, selectedPage.access_token, selectedPage.name);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#1a202c',
          marginBottom: '10px'
        }}>
          📄 Select Your Facebook Page
        </h2>
        <p style={{ color: '#718096', fontSize: '15px' }}>
          Choose which Facebook page you'd like to connect
        </p>
      </div>

      {/* Pages List */}
      {pages.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#718096'
        }}>
          <p style={{ fontSize: '48px', marginBottom: '15px' }}>📭</p>
          <p style={{ fontSize: '16px' }}>No pages found</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Make sure your token has access to at least one Facebook page
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: '30px' }}>
          {pages.map((page) => (
            <div
              key={page.id}
              onClick={() => setSelectedPage(page)}
              style={{
                padding: '20px',
                border: selectedPage?.id === page.id ? '3px solid #667eea' : '2px solid #e2e8f0',
                borderRadius: '12px',
                marginBottom: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedPage?.id === page.id ? '#f0f4ff' : 'white'
              }}
              onMouseEnter={(e) => {
                if (selectedPage?.id !== page.id) {
                  e.currentTarget.style.borderColor = '#cbd5e0';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPage?.id !== page.id) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1877f2 0%, #0c63d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: 'white'
                    }}>
                      📘
                    </div>
                    <div>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: '#1a202c',
                        marginBottom: '4px'
                      }}>
                        {page.name}
                      </h3>
                      {page.category && (
                        <p style={{ fontSize: '14px', color: '#718096' }}>
                          {page.category}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '62px' }}>
                    <p style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                      Page ID: {page.id}
                    </p>
                    {page.tasks && page.tasks.length > 0 && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {page.tasks.slice(0, 3).map((task, index) => (
                          <span
                            key={index}
                            style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            {task.replace('_', ' ')}
                          </span>
                        ))}
                        {page.tasks.length > 3 && (
                          <span style={{
                            background: '#f3f4f6',
                            color: '#6b7280',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            +{page.tasks.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedPage?.id === page.id && (
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={handleConfirmSelection}
          disabled={!selectedPage || processing}
          style={{
            flex: 1,
            background: !selectedPage || processing ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '14px 28px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '600',
            cursor: !selectedPage || processing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: !selectedPage || processing ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            if (selectedPage && !processing) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = !selectedPage || processing ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)';
          }}
        >
          {processing ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Connecting...
            </>
          ) : (
            <>
              <span style={{ fontSize: '20px' }}>✓</span>
              Confirm Selection
            </>
          )}
        </button>

        <button
          onClick={onCancel}
          disabled={processing}
          style={{
            padding: '14px 28px',
            background: 'white',
            color: '#6b7280',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: processing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!processing) {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.background = '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.background = 'white';
          }}
        >
          Cancel
        </button>
      </div>

      {/* Selected Page Summary */}
      {selectedPage && !processing && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f0f4ff',
          borderRadius: '8px',
          border: '1px solid #c7d2fe'
        }}>
          <p style={{ fontSize: '14px', color: '#4338ca', marginBottom: '8px' }}>
            <strong>Selected:</strong> {selectedPage.name}
          </p>
          <p style={{ fontSize: '12px', color: '#6366f1' }}>
            ℹ️ A long-lived page access token will be stored securely for this page
          </p>
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

export default FacebookPageSelector;

