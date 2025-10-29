import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/http';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireSuperAdmin?: boolean;
  requireWeTechForU?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [],
  requireSuperAdmin = false,
  requireWeTechForU = false
}) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      setUser(userData);

      // Check if user has access
      const isSuperAdmin = userData.role === 'super_admin';
      const isWeTechForU = userData.team_type === 'wetechforu';
      const roleMatches = allowedRoles.length === 0 || allowedRoles.includes(userData.role);

      let access = false;

      if (requireSuperAdmin) {
        access = isSuperAdmin;
      } else if (requireWeTechForU) {
        access = isSuperAdmin || isWeTechForU;
      } else if (allowedRoles.length > 0) {
        access = roleMatches;
      } else {
        access = true; // No restrictions
      }

      setHasAccess(access);
    } catch (error) {
      console.error('Access check failed:', error);
      setHasAccess(false);
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
        <p style={{ color: '#666' }}>Verifying access...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          padding: '2rem',
          backgroundColor: '#fee',
          border: '2px solid #c33',
          borderRadius: '16px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
          <h2 style={{ color: '#c33', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '2rem', lineHeight: '1.6' }}>
            You don't have permission to access this page.
          </p>
          <a
            href="/app/dashboard"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              backgroundColor: '#2E86AB',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: '600'
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

