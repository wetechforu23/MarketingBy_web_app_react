import { useState, useEffect } from 'react'
import { api } from '../api/http'

interface Client {
  id: number
  name: string
  email: string
  phone: string
  company: string
  industry: string
  status: boolean
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('/clients')
        setClients(response.data)
      } catch (error: any) {
        setError(error.response?.data?.error || 'Failed to fetch clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading clients...
      </div>
    )
  }

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="card-title">Clients Management</h1>
          <p className="card-subtitle">Manage your healthcare marketing clients</p>
        </div>
        <button className="btn btn-primary">Add New Client</button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <span style={{ marginLeft: '8px' }}>{error}</span>
        </div>
      )}

      <div className="card">
        {clients.length === 0 ? (
          <div className="text-center text-muted">
            <p>No clients found. Add your first client to get started.</p>
            <button className="btn btn-primary">Add Client</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>{client.name}</td>
                    <td>{client.email}</td>
                    <td>{client.phone || 'N/A'}</td>
                    <td>{client.company || 'N/A'}</td>
                    <td>{client.industry || 'N/A'}</td>
                    <td>
                      <span className={`badge ${client.status ? 'badge-success' : 'badge-danger'}`}>
                        {client.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{new Date(client.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-outline" style={{ marginRight: '8px' }}>
                        Edit
                      </button>
                      <button className="btn btn-danger">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}