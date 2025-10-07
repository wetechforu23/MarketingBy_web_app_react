import React, { useEffect, useState } from 'react';
import { api } from '../api/http';
import SuperAdminDashboard from '../pages/SuperAdminDashboard';
import ClientAdminDashboard from '../pages/ClientAdminDashboard';
import ClientUserDashboard from '../pages/ClientUserDashboard';

interface UserInfo {
  id: number;
  email: string;
  is_admin: boolean;
  client_id?: number;
}

const SmartDashboard: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setLoading(true);
        
        // Fetch user information
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data.user);
        
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        setError('Failed to load user information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-triangle"></i>
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle"></i>
        User information not available. Please log in again.
      </div>
    );
  }

  // Determine user type and render appropriate dashboard
  // Super Admin: is_admin = true AND (client_id = null OR client_id = undefined)
  // Client Admin: is_admin = true AND client_id = [specific_client_id]
  // Client User: is_admin = false AND client_id = [specific_client_id]

  const isSuperAdmin = user.is_admin && (user.client_id === null || user.client_id === undefined || user.client_id === '');
  const isClientAdmin = user.is_admin && user.client_id && user.client_id !== '' && user.client_id > 0;
  const isClientUser = !user.is_admin && user.client_id && user.client_id !== '' && user.client_id > 0;

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  } else if (isClientAdmin) {
    return <ClientAdminDashboard />;
  } else if (isClientUser) {
    return <ClientUserDashboard />;
  } else {
    return (
      <div className="alert alert-warning">
        <i className="fas fa-exclamation-triangle"></i>
        Unable to determine user role. Please contact support.
      </div>
    );
  }
};

export default SmartDashboard;
