import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface UserProfile {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_admin: boolean;
  client_id?: number;
  created_at: string;
  last_login?: string;
  profile_picture_url?: string;
  timezone?: string;
  language?: string;
  notifications_enabled?: boolean;
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await http.get('/auth/me');
      setUser(response.data);
      setEditedUser(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedUser) return;
    
    try {
      await http.put(`/users/${editedUser.id}`, editedUser);
      setUser(editedUser);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    try {
      await http.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="alert alert-danger m-4">
        Failed to load user profile.
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 style={{ color: '#4682B4' }}>
              <i className="fas fa-user-circle me-2"></i>
              My Profile
            </h2>
            {!isEditing ? (
              <button 
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600'
                }}
              >
                <i className="fas fa-edit me-2"></i>
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn-success"
                  onClick={handleSave}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}
                >
                  <i className="fas fa-save me-2"></i>
                  Save Changes
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedUser(user);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}
                >
                  <i className="fas fa-times me-2"></i>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
              {message.text}
              <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
            </div>
          )}

          <div className="row g-4">
            {/* Profile Information Card */}
            <div className="col-lg-4">
              <div className="card shadow-sm h-100">
                <div className="card-body text-center">
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: '#4682B4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: 'white',
                    margin: '0 auto 20px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  }}>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <h4 className="mb-1">{user.email}</h4>
                  <p className="text-muted mb-3">
                    <span className={`badge ${user.is_admin ? 'bg-primary' : 'bg-secondary'}`}>
                      {user.is_admin ? 'Administrator' : 'User'}
                    </span>
                  </p>
                  <div className="text-start mt-4">
                    <div className="mb-3">
                      <small className="text-muted">User ID</small>
                      <div><strong>#{user.id}</strong></div>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted">Member Since</small>
                      <div><strong>{new Date(user.created_at).toLocaleDateString()}</strong></div>
                    </div>
                    {user.last_login && (
                      <div className="mb-3">
                        <small className="text-muted">Last Login</small>
                        <div><strong>{new Date(user.last_login).toLocaleString()}</strong></div>
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn btn-warning w-100 mt-3"
                    onClick={() => setShowPasswordModal(true)}
                    style={{
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}
                  >
                    <i className="fas fa-key me-2"></i>
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Details Card */}
            <div className="col-lg-8">
              <div className="card shadow-sm">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="fas fa-id-card me-2"></i>
                    Personal Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editedUser?.first_name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, first_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editedUser?.last_name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, last_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editedUser?.email || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, email: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editedUser?.phone || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Timezone</label>
                      <select
                        className="form-select"
                        value={editedUser?.timezone || 'America/Los_Angeles'}
                        onChange={(e) => setEditedUser({ ...editedUser!, timezone: e.target.value })}
                        disabled={!isEditing}
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Language</label>
                      <select
                        className="form-select"
                        value={editedUser?.language || 'en'}
                        onChange={(e) => setEditedUser({ ...editedUser!, language: e.target.value })}
                        disabled={!isEditing}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="notificationsEnabled"
                          checked={editedUser?.notifications_enabled !== false}
                          onChange={(e) => setEditedUser({ ...editedUser!, notifications_enabled: e.target.checked })}
                          disabled={!isEditing}
                        />
                        <label className="form-check-label" htmlFor="notificationsEnabled">
                          Enable Email Notifications
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <div className={`modal fade ${showPasswordModal ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                <i className="fas fa-key me-2"></i>
                Change Password
              </h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowPasswordModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <small className="text-muted">Minimum 8 characters</small>
              </div>
              <div className="mb-3">
                <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handlePasswordChange}>
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

