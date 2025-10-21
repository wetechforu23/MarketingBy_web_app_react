import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface Client {
  id: number;
  client_name: string;
  email: string;
  status?: string;
}

interface ClientAccessEditorProps {
  permissions: any;
  onChange: (permissions: any) => void;
  userRole: string;
  teamType: string;
}

export default function ClientAccessEditor({ permissions, onChange, userRole, teamType }: ClientAccessEditorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    // Update selectAll based on current selection
    if (clients.length > 0 && permissions.client_access) {
      const clientAccess = permissions.client_access || {};
      const allSelected = clients.every(client => clientAccess[client.id] === true);
      setSelectAll(allSelected);
    }
  }, [permissions, clients]);

  const fetchClients = async () => {
    try {
      const response = await http.get('/users/clients/list');
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleClient = (clientId: number) => {
    const updated = {
      ...permissions,
      client_access: {
        ...(permissions.client_access || {}),
        [clientId]: !(permissions.client_access?.[clientId] || false),
      },
    };
    onChange(updated);
  };

  const toggleAllClients = (value: boolean) => {
    const updated = { ...permissions };
    updated.client_access = {};
    
    clients.forEach(client => {
      updated.client_access[client.id] = value;
    });
    
    onChange(updated);
    setSelectAll(value);
  };

  const getSelectedCount = () => {
    if (!permissions.client_access) return 0;
    return Object.values(permissions.client_access).filter(v => v === true).length;
  };

  // Only show for WeTechForU team members
  if (teamType !== 'wetechforu') {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <i className="fas fa-spinner fa-spin me-2"></i>
        Loading clients...
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px', marginBottom: '1.5rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #4682B4'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
          🏢 Client Access Control
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {getSelectedCount()} of {clients.length} clients selected
          </span>
          <button
            type="button"
            onClick={() => toggleAllClients(true)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✓ All Clients
          </button>
          <button
            type="button"
            onClick={() => toggleAllClients(false)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✗ None
          </button>
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #dee2e6'
      }}>
        <p style={{ 
          fontSize: '13px', 
          color: '#666', 
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px'
        }}>
          <i className="fas fa-info-circle me-2" style={{ color: '#856404' }}></i>
          <strong>Important:</strong> This user will ONLY be able to access and manage the clients checked below. 
          If no clients are selected, they won't see any client data in Client Management.
        </p>

        {clients.length === 0 ? (
          <div style={{ 
            padding: '2rem', 
            textAlign: 'center', 
            color: '#666',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <i className="fas fa-building" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem' }}></i>
            <div>No clients found in the system</div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '12px' 
          }}>
            {clients.map((client) => {
              const isChecked = permissions.client_access?.[client.id] === true;
              return (
                <label
                  key={client.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: isChecked ? '#e7f3ff' : 'white',
                    borderRadius: '8px',
                    border: `2px solid ${isChecked ? '#0d6efd' : '#dee2e6'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isChecked ? '0 2px 8px rgba(13, 110, 253, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#adb5bd';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#dee2e6';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleClient(client.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#0d6efd'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: isChecked ? '600' : '500',
                      color: isChecked ? '#0d6efd' : '#2c3e50',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      <i className="fas fa-building me-2" style={{ fontSize: '12px' }}></i>
                      {client.client_name}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666'
                    }}>
                      {client.email}
                    </div>
                    {client.status && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        padding: '2px 8px',
                        backgroundColor: client.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: client.status === 'active' ? '#155724' : '#721c24',
                        fontSize: '10px',
                        borderRadius: '12px',
                        fontWeight: '600'
                      }}>
                        {client.status}
                      </span>
                    )}
                  </div>
                  {isChecked && (
                    <i className="fas fa-check-circle" style={{ color: '#0d6efd', fontSize: '18px' }}></i>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: getSelectedCount() > 0 ? '#e7f3ff' : '#fff3cd',
        borderRadius: '8px',
        border: `1px solid ${getSelectedCount() > 0 ? '#0d6efd' : '#ffc107'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: getSelectedCount() > 0 ? '#0d6efd' : '#856404' }}>
          <i className={`fas fa-${getSelectedCount() > 0 ? 'shield-alt' : 'exclamation-triangle'} me-2`}></i>
          {getSelectedCount() > 0 
            ? `Access granted to ${getSelectedCount()} client${getSelectedCount() > 1 ? 's' : ''}`
            : 'No client access granted - user will not see any clients'}
        </div>
        {getSelectedCount() > 0 && getSelectedCount() === clients.length && (
          <span style={{
            fontSize: '11px',
            padding: '4px 10px',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '12px',
            fontWeight: '600'
          }}>
            FULL ACCESS
          </span>
        )}
      </div>
    </div>
  );
}

