import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import PermissionsEditor from '../components/PermissionsEditor';
import '../theme/brand.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  team_type?: string;
  client_id?: number;
  client_name?: string;
  permissions: any;
  is_active: boolean;
  last_login?: string;
  must_change_password: boolean;
  created_at: string;
  created_by?: number;
  created_by_name?: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  website?: string;
}

interface PermissionGroup {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  assign?: boolean;
  generate?: boolean;
  export?: boolean;
  manage?: boolean;
  basic?: boolean;
  comprehensive?: boolean;
  send?: boolean;
  templates?: boolean;
}

interface Permissions {
  leads?: PermissionGroup;
  users?: PermissionGroup;
  reports?: PermissionGroup;
  clients?: PermissionGroup;
  seo?: PermissionGroup;
  email?: PermissionGroup;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'client_user',
    team_type: 'client',
    client_id: null as number | null,
    is_active: true,
    must_change_password: true,
    send_welcome_email: false,
  });

  const [permissions, setPermissions] = useState<Permissions>({
    leads: { view: false, add: false, edit: false, delete: false, assign: false },
    users: { view: false, add: false, edit: false, delete: false },
    reports: { view: false, generate: false, export: false },
    clients: { view: false, add: false, edit: false, delete: false },
    seo: { basic: false, comprehensive: false },
    email: { send: false, templates: false },
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Add aggressive cache-busting parameters to force fresh data
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&v=1.0.3`;
      console.log('🔄 Fetching fresh user data with cache-buster:', cacheBuster);
      
      const [usersRes, clientsRes] = await Promise.all([
        http.get(`/users${cacheBuster}`),
        http.get(`/users/clients/list${cacheBuster}`),
      ]);
      
      console.log('📊 Users data received:', usersRes.data);
      setUsers(usersRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ROLE & PERMISSION HELPERS
  // ============================================================================

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      super_admin: '👑 Super Admin',
      wtfu_developer: '💻 Developer',
      wtfu_sales: '💼 Sales',
      wtfu_manager: '📊 Manager',
      wtfu_project_manager: '🎯 Project Manager',
      client_admin: '🔑 Client Admin',
      client_user: '👤 Client User',
    };
    return labels[role] || role;
  };

  const getDefaultPermissions = (role: string): Permissions => {
    const perms: { [key: string]: Permissions } = {
      super_admin: {
        leads: { view: true, add: true, edit: true, delete: true, assign: true },
        users: { view: true, add: true, edit: true, delete: true },
        reports: { view: true, generate: true, export: true },
        clients: { view: true, add: true, edit: true, delete: true },
        seo: { basic: true, comprehensive: true },
        email: { send: true, templates: true },
      },
      wtfu_developer: {
        leads: { view: true, add: true, edit: true, delete: false, assign: true },
        users: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, generate: true, export: true },
        clients: { view: true, add: false, edit: false, delete: false },
        seo: { basic: true, comprehensive: true },
        email: { send: true, templates: false },
      },
      wtfu_sales: {
        leads: { view: true, add: true, edit: true, delete: false, assign: false },
        users: { view: false, add: false, edit: false, delete: false },
        reports: { view: true, generate: false, export: true },
        clients: { view: true, add: false, edit: false, delete: false },
        seo: { basic: true, comprehensive: false },
        email: { send: true, templates: false },
      },
      wtfu_manager: {
        leads: { view: true, add: true, edit: true, delete: true, assign: true },
        users: { view: true, add: true, edit: true, delete: false },
        reports: { view: true, generate: true, export: true },
        clients: { view: true, add: false, edit: true, delete: false },
        seo: { basic: true, comprehensive: true },
        email: { send: true, templates: true },
      },
      wtfu_project_manager: {
        leads: { view: true, add: true, edit: true, delete: false, assign: true },
        users: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, generate: true, export: true },
        clients: { view: true, add: false, edit: false, delete: false },
        seo: { basic: true, comprehensive: true },
        email: { send: true, templates: false },
      },
      client_admin: {
        leads: { view: true, add: false, edit: false, delete: false, assign: false },
        users: { view: true, add: true, edit: true, delete: false },
        reports: { view: true, generate: false, export: true },
        clients: { view: false, add: false, edit: false, delete: false },
        seo: { basic: false, comprehensive: false },
        email: { send: false, templates: false },
      },
      client_user: {
        leads: { view: true, add: false, edit: false, delete: false, assign: false },
        users: { view: false, add: false, edit: false, delete: false },
        reports: { view: true, generate: false, export: false },
        clients: { view: false, add: false, edit: false, delete: false },
        seo: { basic: false, comprehensive: false },
        email: { send: false, templates: false },
      },
    };
    return perms[role] || perms.client_user;
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'client_user',
      team_type: 'client',
      client_id: null,
      is_active: true,
      must_change_password: true,
      send_welcome_email: false,
    });
    setPermissions(getDefaultPermissions('client_user'));
    setShowModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setIsEditing(true);
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      team_type: user.team_type || 'client',
      client_id: user.client_id || null,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      send_welcome_email: false,
    });
    setPermissions(user.permissions || getDefaultPermissions(user.role));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        permissions,
      };

      if (isEditing && selectedUser) {
        await http.put(`/users/${selectedUser.id}`, payload);
        alert('User updated successfully!');
      } else {
        const response = await http.post('/users', payload);
        if (response.data.tempPassword) {
          alert(`User created successfully!\n\nTemporary Password: ${response.data.tempPassword}\n\nPlease share this with the user.`);
        } else {
          alert('User created successfully!');
        }
      }

      setShowModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!window.confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.username}?`)) {
      return;
    }

    try {
      await http.patch(`/users/${user.id}/toggle-active`);
      alert(`User ${user.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchData();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`Reset password for ${user.username}?`)) {
      return;
    }

    try {
      const response = await http.post(`/users/${user.id}/reset-password`, {});
      if (response.data.tempPassword) {
        alert(`Password reset successfully!\n\nTemporary Password: ${response.data.tempPassword}\n\nPlease share this with the user.`);
      } else {
        alert('Password reset successfully!');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to DELETE ${user.username}? This action cannot be undone!`)) {
      return;
    }

    try {
      await http.delete(`/users/${user.id}`);
      alert('User deleted successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  // ============================================================================
  // PERMISSION TOGGLES
  // ============================================================================

  const togglePermission = (category: keyof Permissions, permission: string) => {
    setPermissions({
      ...permissions,
      [category]: {
        ...(permissions[category] || {}),
        [permission]: !(permissions[category] as any)?.[permission],
      },
    });
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', color: '#666' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50', marginBottom: '0.5rem' }}>
            <i className="fas fa-users me-3" style={{ color: '#4682B4' }}></i>
            User Management
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#666', margin: 0 }}>
            Manage users, roles, and permissions
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: '12px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(40, 167, 69, 0.3)',
            transition: 'all 0.2s',
            marginRight: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e7e34';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#28a745';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(40, 167, 69, 0.3)';
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
        <button
          onClick={handleOpenAddModal}
          style={{
            padding: '12px 24px',
            backgroundColor: '#4682B4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(70, 130, 180, 0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3a6d99';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(70, 130, 180, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4682B4';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(70, 130, 180, 0.3)';
          }}
        >
          <i className="fas fa-plus-circle"></i>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid #ddd',
            fontSize: '14px',
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid #ddd',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '180px',
          }}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="wtfu_developer">Developer</option>
          <option value="wtfu_sales">Sales</option>
          <option value="wtfu_manager">Manager</option>
          <option value="wtfu_project_manager">Project Manager</option>
          <option value="client_admin">Client Admin</option>
          <option value="client_user">Client User</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid #ddd',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                User
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                Role
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                Type
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                Last Login
              </th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: '#495057', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
                  <i className="fas fa-users" style={{ fontSize: '3rem', color: '#ddd', marginBottom: '1rem' }}></i>
                  <div>No users found</div>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>{user.username}</div>
                      <div style={{ fontSize: '13px', color: '#666' }}>{user.email}</div>
                      {user.client_name && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                          <i className="fas fa-building me-1"></i>
                          {user.client_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#e7f3ff',
                        color: '#0d6efd',
                        fontSize: '13px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: user.team_type === 'wetechforu' ? '#d4edda' : '#fff3cd',
                        color: user.team_type === 'wetechforu' ? '#155724' : '#856404',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      {user.team_type === 'wetechforu' ? 'WeTechForU' : 'Client'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: user.is_active ? '#d4edda' : '#f8d7da',
                        color: user.is_active ? '#155724' : '#721c24',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      {user.is_active ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#666' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title="Edit User"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: user.is_active ? '#ffc107' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`fas fa-${user.is_active ? 'ban' : 'check'}`}></i>
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title="Reset Password"
                      >
                        <i className="fas fa-key"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                        title="Delete User"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal - Will continue in next message due to length */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          overflow: 'auto',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            {/* Modal content continues... */}
            <div style={{ padding: '24px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
                <i className={`fas fa-${isEditing ? 'user-edit' : 'user-plus'} me-2`} style={{ color: '#4682B4' }}></i>
                {isEditing ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Form content will continue in the file... */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '1rem', borderBottom: '2px solid #4682B4', paddingBottom: '0.5rem' }}>
                  Basic Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      Temporary Password
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave empty to auto-generate"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '2px solid #ddd',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={generateTempPassword}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <i className="fas fa-refresh me-2"></i>
                        Generate
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Role and Type Selection */}
              <div style={{ marginTop: '24px', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '1rem', borderBottom: '2px solid #4682B4', paddingBottom: '0.5rem' }}>
                  Role & Type Configuration
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      User Type *
                    </label>
                    <select
                      value={formData.team_type}
                      onChange={(e) => {
                        const teamType = e.target.value;
                        setFormData({ 
                          ...formData, 
                          team_type: teamType,
                          role: teamType === 'wetechforu' ? 'wtfu_developer' : 'client_user'
                        });
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="client">Client User</option>
                      <option value="wetechforu">WeTechForU Team</option>
                    </select>
                    <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {formData.team_type === 'client' 
                        ? 'For client company users (admin or regular user)' 
                        : 'For WeTechForU team members (developer, sales, manager, etc.)'
                      }
                    </small>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      {formData.team_type === 'client' ? (
                        <>
                          <option value="client_admin">Client Admin</option>
                          <option value="client_user">Client Regular User</option>
                        </>
                      ) : (
                        <>
                          <option value="super_admin">Super Admin</option>
                          <option value="wtfu_developer">Developer</option>
                          <option value="wtfu_sales">Sales</option>
                          <option value="wtfu_manager">Manager</option>
                          <option value="wtfu_project_manager">Project Manager</option>
                        </>
                      )}
                    </select>
                    <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {formData.role === 'super_admin' && 'Full system access and control'}
                      {formData.role === 'wtfu_developer' && 'Technical development and system access'}
                      {formData.role === 'wtfu_sales' && 'Sales activities and lead management'}
                      {formData.role === 'wtfu_manager' && 'Team management and oversight'}
                      {formData.role === 'wtfu_project_manager' && 'Project coordination and management'}
                      {formData.role === 'client_admin' && 'Client company administrator'}
                      {formData.role === 'client_user' && 'Regular client user with limited access'}
                    </small>
                  </div>
                </div>
                
                {/* Client Selection (only for client users) */}
                {formData.team_type === 'client' && (
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#495057' }}>
                      Assign to Client *
                    </label>
                    <select
                      value={formData.client_id || ''}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value ? parseInt(e.target.value) : null })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '2px solid #ddd',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Select a client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Comprehensive Permissions Editor */}
              <PermissionsEditor 
                permissions={permissions}
                onChange={setPermissions}
              />

              {/* Additional Options */}
              <div style={{ marginTop: '24px', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '1rem', borderBottom: '2px solid #4682B4', paddingBottom: '0.5rem' }}>
                  Additional Options
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0d6efd' }}
                    />
                    <span style={{ fontWeight: '500' }}>
                      <i className="fas fa-check-circle me-2" style={{ color: '#28a745' }}></i>
                      Account Active
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.must_change_password}
                      onChange={(e) => setFormData({ ...formData, must_change_password: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0d6efd' }}
                    />
                    <span style={{ fontWeight: '500' }}>
                      <i className="fas fa-key me-2" style={{ color: '#ffc107' }}></i>
                      Must Change Password on First Login
                    </span>
                  </label>
                  {!isEditing && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.send_welcome_email}
                        onChange={(e) => setFormData({ ...formData, send_welcome_email: e.target.checked })}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0d6efd' }}
                      />
                      <span style={{ fontWeight: '500' }}>
                        <i className="fas fa-envelope me-2" style={{ color: '#0d6efd' }}></i>
                        Send Welcome Email with Credentials
                      </span>
                    </label>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #dee2e6' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#4682B4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <i className={`fas fa-${isEditing ? 'save' : 'plus'} me-2`}></i>
                  {isEditing ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
