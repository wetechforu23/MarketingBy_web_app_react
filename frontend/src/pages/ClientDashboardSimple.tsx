import React, { useState, useEffect } from 'react';
import { api } from '../api/http';

interface ClientInfo {
  id: number;
  client_name: string;
  email: string;
  client_id: number;
}

const ClientDashboardSimple: React.FC = () => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientInfo();
  }, []);

  const fetchClientInfo = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching client info...');
      
      // Get current user info which includes client_id
      const userResponse = await api.get('/auth/me');
      const user = userResponse.data;
      
      console.log('✅ User info:', user);
      
      if (!user.client_id) {
        setError('No client assigned to this user');
        setLoading(false);
        return;
      }

      // Get client details
      const clientResponse = await api.get(`/clients/${user.client_id}`);
      console.log('✅ Client info:', clientResponse.data);
      
      setClientInfo({
        ...clientResponse.data,
        client_id: user.client_id
      });
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load client info');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2E86AB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#666', fontSize: '1.1rem' }}>Loading your dashboard...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
        <div style={{
          padding: '2rem',
          backgroundColor: '#fee',
          border: '2px solid #c33',
          borderRadius: '12px'
        }}>
          <h3 style={{ color: '#c33', marginBottom: '1rem' }}>
            <i className="fas fa-exclamation-triangle"></i> Error Loading Dashboard
          </h3>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={fetchClientInfo}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2E86AB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <i className="fas fa-refresh"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#999' }}>No client information available</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: '#f5f7fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2E86AB 0%, #5F9EA0 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>
          👋 Welcome back!
        </h1>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '1.3rem', fontWeight: '600' }}>
          {clientInfo.client_name}
        </p>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
          <i className="fas fa-envelope"></i> {clientInfo.email}
        </p>
      </div>

      {/* Welcome Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e9ecef',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          🎉
        </div>
        
        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '2rem',
          fontWeight: '700',
          color: '#2C5F77'
        }}>
          Your Dashboard is Ready!
        </h2>
        
        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          lineHeight: '1.8',
          marginBottom: '2rem'
        }}>
          Welcome to your MarketingBy client portal. Your account is successfully set up and ready to use.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77' }}>Analytics</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Track your performance
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77' }}>Leads</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Manage your prospects
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77' }}>SEO</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Monitor your rankings
            </p>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📱</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77' }}>Social Media</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Grow your presence
            </p>
          </div>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          border: '1px solid #a5d6a7'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#2C5F77' }}>
            <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i> Account Active
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Your account is fully operational. Use the sidebar to navigate to different sections.
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{
        marginTop: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <a
          href="/app/leads"
          style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef',
            textDecoration: 'none',
            color: '#2C5F77',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            <i className="fas fa-users" style={{ marginRight: '0.5rem', color: '#2E86AB' }}></i>
            View Leads
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Access your lead database
          </p>
        </a>

        <a
          href="/app/profile"
          style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e9ecef',
            textDecoration: 'none',
            color: '#2C5F77',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            <i className="fas fa-user-cog" style={{ marginRight: '0.5rem', color: '#A23B72' }}></i>
            Edit Profile
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Update your account settings
          </p>
        </a>
      </div>
    </div>
  );
};

export default ClientDashboardSimple;

