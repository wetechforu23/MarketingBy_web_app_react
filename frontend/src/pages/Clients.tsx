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
                    <button className="btn btn-outline btn-sm">View</button>
                    <button className="btn btn-secondary btn-sm">Edit</button>
                    <button className="btn btn-danger btn-sm">Delete</button>
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

