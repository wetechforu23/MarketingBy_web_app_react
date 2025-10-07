import React, { useEffect, useState } from 'react';
import { http } from '../api/http';

interface User {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  client_id?: number;
  created_at: string;
}

interface UserStats {
  totalUsers: number;
  adminUsers: number;
  clientUsers: number;
  newUsersThisWeek: number;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await http.get('/admin/users');
        const usersData = response.data.users || [];
        setUsers(usersData);

        // Calculate stats
        const totalUsers = usersData.length;
        const adminUsers = usersData.filter((u: User) => u.is_admin).length;
        const clientUsers = totalUsers - adminUsers;
        const newUsersThisWeek = usersData.filter((u: User) => {
          const createdDate = new Date(u.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate > weekAgo;
        }).length;

        setUserStats({
          totalUsers,
          adminUsers,
          clientUsers,
          newUsersThisWeek
        });
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || 
                       (filterRole === 'admin' && user.is_admin) ||
                       (filterRole === 'user' && !user.is_admin);
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
        <p className="text-muted">Manage system users and their permissions.</p>
      </div>

      {/* User Stats */}
      {userStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.totalUsers}</h3>
              <p className="stat-label">Total Users</p>
              <div className="stat-trend">
                <i className="fas fa-arrow-up text-success"></i>
                <span className="text-success">+{userStats.newUsersThisWeek} this week</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.adminUsers}</h3>
              <p className="stat-label">Admin Users</p>
              <div className="stat-trend">
                <i className="fas fa-shield-alt text-primary"></i>
                <span className="text-primary">System administrators</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-user"></i>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.clientUsers}</h3>
              <p className="stat-label">Client Users</p>
              <div className="stat-trend">
                <i className="fas fa-building text-info"></i>
                <span className="text-info">Client accounts</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{userStats.newUsersThisWeek}</h3>
              <p className="stat-label">New This Week</p>
              <div className="stat-trend">
                <i className="fas fa-arrow-up text-success"></i>
                <span className="text-success">Recent signups</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Users ({filteredUsers.length})</h2>
          <div className="header-actions">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin Only</option>
              <option value="user">Users Only</option>
            </select>
            <button className="btn btn-primary">
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Add User
            </button>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Client</th>
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.username}</div>
                        <div className="user-email text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${user.is_admin ? 'badge-primary' : 'badge-secondary'}`}>
                      <i className={`fas ${user.is_admin ? 'fa-shield-alt' : 'fa-user'}`} style={{ marginRight: '4px' }}></i>
                      {user.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>
                    {user.client_id ? (
                      <span className="badge badge-info">Client #{user.client_id}</span>
                    ) : (
                      <span className="text-muted">System</span>
                    )}
                  </td>
                  <td>
                    <div className="date-info">
                      <div>{new Date(user.created_at).toLocaleDateString()}</div>
                      <div className="text-muted text-small">
                        {new Date(user.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                      Active
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-outline btn-sm" title="View Details">
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Edit User">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button className="btn btn-danger btn-sm" title="Delete User">
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <h3>No users found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Users;
