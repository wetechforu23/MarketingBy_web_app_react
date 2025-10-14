import React, { useEffect, useState } from 'react';
import { http } from '../api/http';

interface Client {
  id: number;
  client_name: string;
  email: string;
  contact_name: string;
  is_active: boolean;
  created_at: string;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await http.get('/admin/clients');
        setClients(response.data.clients || []);
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
      await http.patch(`/clients/${clientId}/toggle-active`, { is_active: isActive });
      alert(`Client ${isActive ? 'activated' : 'deactivated'} successfully`);
      // Refresh the clients list
      const response = await http.get('/admin/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error toggling client status:', error);
      alert('Failed to update client status. Please try again.');
    }
  };

  const handleConvertClientToLead = async (clientId: number) => {
    try {
      await http.post('/clients/convert-to-lead', { clientId });
      alert('Client converted back to lead successfully');
      // Refresh the clients list
      const response = await http.get('/admin/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error converting client to lead:', error);
      alert('Failed to convert client to lead. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading clients...</div>;
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
                    <span className={`badge ${client.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
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
                      
                      {/* Mark as Inactive/Active */}
                      <button
                        onClick={() => {
                          const action = client.is_active ? 'inactive' : 'active';
                          if (window.confirm(`Mark this client as ${action}?`)) {
                            handleToggleClientStatus(client.id, !client.is_active);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: `1px solid ${client.is_active ? '#ffc107' : '#28a745'}`,
                          backgroundColor: client.is_active ? '#ffc107' : '#28a745',
                          color: client.is_active ? '#333' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = client.is_active ? '#e0a800' : '#1e7e34';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = client.is_active ? '#ffc107' : '#28a745';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title={client.is_active ? 'Mark as Inactive' : 'Mark as Active'}
                      >
                        <i className={`fas ${client.is_active ? 'fa-pause' : 'fa-play'}`}></i>
                      </button>
                      
                      {/* Convert back to Lead */}
                      <button
                        onClick={() => {
                          if (window.confirm('Convert this client back to a lead?')) {
                            handleConvertClientToLead(client.id);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid #6c757d',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          cursor: 'pointer',
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
                        <i className="fas fa-undo"></i>
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

