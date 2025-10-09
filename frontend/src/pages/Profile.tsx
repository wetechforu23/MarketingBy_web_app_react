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
              <div className="card shadow-sm" style={{ 
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div 
                  className="card-header text-white" 
                  style={{
                    background: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
                    borderBottom: 'none',
                    padding: '1.25rem'
                  }}
                >
                  <h5 className="mb-0" style={{ fontWeight: '700' }}>
                    <i className="fas fa-id-card me-2"></i>
                    Personal Information
                  </h5>
                </div>
                <div className="card-body" style={{ 
                  backgroundColor: '#ffffff',
                  padding: '1.5rem'
                }}>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editedUser?.first_name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, first_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter first name"
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editedUser?.last_name || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, last_name: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter last name"
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={editedUser?.email || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, email: e.target.value })}
                        disabled={!isEditing}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editedUser?.phone || ''}
                        onChange={(e) => setEditedUser({ ...editedUser!, phone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="Enter phone number"
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        Timezone
                      </label>
                      <select
                        className="form-select"
                        value={editedUser?.timezone || 'America/Los_Angeles'}
                        onChange={(e) => setEditedUser({ ...editedUser!, timezone: e.target.value })}
                        disabled={!isEditing}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" style={{ 
                        color: '#2C5F77',
                        fontWeight: '600',
                        marginBottom: '0.5rem'
                      }}>
                        Language
                      </label>
                      <select
                        className="form-select"
                        value={editedUser?.language || 'en'}
                        onChange={(e) => setEditedUser({ ...editedUser!, language: e.target.value })}
                        disabled={!isEditing}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          backgroundColor: isEditing ? '#ffffff' : '#f8f9fa',
                          color: '#495057'
                        }}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch" style={{
                        padding: '0.75rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '2px solid #e9ecef'
                      }}>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="notificationsEnabled"
                          checked={editedUser?.notifications_enabled !== false}
                          onChange={(e) => setEditedUser({ ...editedUser!, notifications_enabled: e.target.checked })}
                          disabled={!isEditing}
                          style={{
                            width: '3rem',
                            height: '1.5rem',
                            cursor: isEditing ? 'pointer' : 'not-allowed'
                          }}
                        />
                        <label 
                          className="form-check-label" 
                          htmlFor="notificationsEnabled"
                          style={{
                            marginLeft: '0.5rem',
                            color: '#2C5F77',
                            fontWeight: '600'
                          }}
                        >
                          <i className="fas fa-bell me-2"></i>
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
      {showPasswordModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex={-1} 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ 
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}>
              <div 
                className="modal-header text-white" 
                style={{
                  background: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
                  borderBottom: 'none',
                  padding: '1.5rem'
                }}
              >
                <h5 className="modal-title" style={{ fontWeight: '700', fontSize: '1.25rem' }}>
                  <i className="fas fa-key me-2"></i>
                  Change Password
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    filter: 'brightness(0) invert(1)'
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ 
                backgroundColor: '#ffffff',
                padding: '2rem'
              }}>
                <div className="mb-4">
                  <label htmlFor="currentPassword" className="form-label" style={{ 
                    color: '#2C5F77',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4682B4'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="newPassword" className="form-label" style={{ 
                    color: '#2C5F77',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Enter your new password"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4682B4'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  />
                  <small className="text-muted d-block mt-2">
                    <i className="fas fa-info-circle me-1"></i>
                    Minimum 8 characters required
                  </small>
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label" style={{ 
                    color: '#2C5F77',
                    fontWeight: '600',
                    marginBottom: '0.5rem'
                  }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm your new password"
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #e9ecef',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4682B4'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ 
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #e9ecef',
                padding: '1.25rem',
                gap: '0.75rem'
              }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: '#6c757d',
                    border: 'none'
                  }}
                >
                  <i className="fas fa-times me-2"></i>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePasswordChange}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    background: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(70, 130, 180, 0.3)'
                  }}
                >
                  <i className="fas fa-check me-2"></i>
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

