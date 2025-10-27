import React, { useEffect, useState } from 'react';
import { http } from '../api/http';

interface Client {
  id: number;
  client_name: string; // mapped from API 'name'
  email: string;
  contact_name: string; // mapped from API 'company'
  is_active: boolean; // mapped from API 'status'
  created_at: string;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await http.get('/admin/clients');
        const apiClients = (response.data?.clients || []) as Array<{
          id: number;
          name?: string;
          email: string;
          company?: string;
          phone?: string;
          status?: boolean;
          created_at: string;
        }>;

        // Map API aliases to UI model to ensure proper display
        const mapped: Client[] = apiClients.map(c => ({
          id: c.id,
          client_name: c.name || '',
          email: c.email,
          contact_name: c.company || '',
          is_active: Boolean(c.status),
          created_at: c.created_at
        }));

        setClients(mapped);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
        setError('Failed to load clients.');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleToggleClientStatus = async (clientId: number, isActive: boolean) => {
    try {
      setActionLoading(prev => ({ ...prev, [clientId]: true }));
      await http.patch(`/clients/${clientId}/toggle-active`, { is_active: isActive });
      alert(`Client ${isActive ? 'activated' : 'deactivated'} successfully`);
      // Refresh the clients list
      const response = await http.get('/admin/clients');
      const apiClients = (response.data?.clients || []) as Array<any>;
      const mapped: Client[] = apiClients.map((c: any) => ({
        id: c.id,
        client_name: c.name || '',
        email: c.email,
        contact_name: c.company || '',
        is_active: Boolean(c.status),
        created_at: c.created_at
      }));
      setClients(mapped);
    } catch (error) {
      console.error('Error toggling client status:', error);
      alert('Failed to update client status. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const handleConvertClientToLead = async (clientId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [`convert_${clientId}`]: true }));
      await http.post('/clients/convert-to-lead', { clientId });
      alert('Client converted back to lead successfully');
      // Refresh the clients list
      const response = await http.get('/admin/clients');
      const apiClients = (response.data?.clients || []) as Array<any>;
      const mapped: Client[] = apiClients.map((c: any) => ({
        id: c.id,
        client_name: c.name || '',
        email: c.email,
        contact_name: c.company || '',
        is_active: Boolean(c.status),
        created_at: c.created_at
      }));
      setClients(mapped);
    } catch (error) {
      console.error('Error converting client to lead:', error);
      alert('Failed to convert client to lead. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [`convert_${clientId}`]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4682B4', marginBottom: '1rem' }}></i>
          <div style={{ fontSize: '18px', color: '#666', fontWeight: '600' }}>Loading clients...</div>
          <div style={{ fontSize: '14px', color: '#999', marginTop: '0.5rem' }}>Please wait while we fetch the data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="clients-page">
      <div className="page-header">
        <h1>Client Management</h1>
        <p className="text-muted">Manage all client accounts and their information.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Clients</h2>
          <button className="btn btn-primary">
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
            Add Client
          </button>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client Name</th>
                <th>Email</th>
                <th>Contact Name</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>{client.id}</td>
                  <td>{client.client_name}</td>
                  <td>{client.email}</td>
                  <td>{client.contact_name}</td>
                  <td>
                    {actionLoading[client.id] ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-spinner fa-spin" style={{ color: '#4682B4', fontSize: '16px' }}></i>
                        <span style={{ fontSize: '12px', color: '#666' }}>Updating...</span>
                      </div>
                    ) : (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={client.is_active}
                          onChange={(e) => handleToggleClientStatus(client.id, e.target.checked)}
                          style={{ width: '0', height: '0', opacity: 0, position: 'absolute' }}
                        />
                        <span 
                          aria-label={client.is_active ? 'Active' : 'Inactive'}
                          title={client.is_active ? 'Active' : 'Inactive'}
                          style={{
                            display: 'inline-block',
                            width: '40px',
                            height: '22px',
                            backgroundColor: client.is_active ? '#28a745' : '#dc3545',
                            borderRadius: '999px',
                            position: 'relative',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span 
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: client.is_active ? '20px' : '2px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: '#fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease'
                            }}
                          />
                        </span>
                        <span style={{ fontSize: '12px', color: client.is_active ? '#28a745' : '#dc3545', fontWeight: 600 }}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </label>
                    )}
                  </td>
                  <td>{new Date(client.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* View Button - Navigate to client portal */}
                      <button
                        onClick={() => {
                          // Navigate to client portal
                          window.open(`/app/customer/seo-reports?client_id=${client.id}`, '_blank');
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #007bff',
                          backgroundColor: '#007bff',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0056b3';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#007bff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="View Client Portal"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      
                      {/* Status toggle moved into Status column */}
                      
                      {/* Convert back to Lead */}
                      <button
                        onClick={() => {
                          if (window.confirm('Convert this client back to a lead?')) {
                            handleConvertClientToLead(client.id);
                          }
                        }}
                        disabled={actionLoading[`convert_${client.id}`]}
                        style={{
                          padding: '4px 8px',
                          opacity: actionLoading[`convert_${client.id}`] ? 0.6 : 1,
                          cursor: actionLoading[`convert_${client.id}`] ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #6c757d',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#545b62';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#6c757d';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Convert Back to Lead"
                      >
                        <i className={`fas ${actionLoading[`convert_${client.id}`] ? 'fa-spinner fa-spin' : 'fa-undo'}`}></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Clients;

