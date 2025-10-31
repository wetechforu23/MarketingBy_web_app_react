import React, { useEffect, useState } from 'react';
import ContentEditor from './ContentEditor';
import ClientCreatePost from './ClientCreatePost';
import { api } from '../api/http';

const ContentCreateRoute: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/auth/me');
        setRole(me?.data?.role || (me?.data?.is_admin ? 'admin' : 'client'));
      } catch (e) {
        setRole('client');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  const isWeTechOrSuperAdmin = Boolean(
    role && (
      role.toLowerCase().includes('admin') ||
      role.toLowerCase().includes('wetechforu') ||
      role.toLowerCase().includes('super')
    )
  );

  return isWeTechOrSuperAdmin ? <ContentEditor /> : <ClientCreatePost />;
};

export default ContentCreateRoute;


