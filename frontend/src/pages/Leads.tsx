import React, { useEffect, useState } from 'react';
import { http } from '../api/http';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  created_at: string;
}

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await http.get('/leads');
        setLeads(response.data || []);
      } catch (err) {
        console.error('Failed to fetch leads:', err);
        setError('Failed to load leads.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  if (loading) {
    return <div className="loading">Loading leads...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="leads-page">
      <div className="page-header">
        <h1>Lead Management</h1>
        <p className="text-muted">Track and manage all leads from various sources.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Leads</h2>
          <button className="btn btn-primary">
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
            Add Lead
          </button>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td>{lead.id}</td>
                  <td>{lead.name}</td>
                  <td>{lead.email}</td>
                  <td>{lead.phone || 'N/A'}</td>
                  <td>
                    <span className="badge badge-info">{lead.source}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      lead.status === 'new' ? 'badge-primary' :
                      lead.status === 'contacted' ? 'badge-warning' :
                      lead.status === 'qualified' ? 'badge-success' :
                      'badge-secondary'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-outline btn-sm">View</button>
                    <button className="btn btn-secondary btn-sm">Edit</button>
                    <button className="btn btn-primary btn-sm">Contact</button>
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

export default Leads;
