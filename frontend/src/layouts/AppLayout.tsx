import { Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import RoleBasedNav from '../components/RoleBasedNav'
import { http } from '../api/http'
import '../theme/brand.css'

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  client_id?: number;
}

export default function AppLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('🔍 Fetching user data...')
        const response = await http.get('/auth/me')
        console.log('✅ User data fetched:', response.data)
        setUser(response.data)
      } catch (error) {
        console.error('❌ Error fetching user:', error)
      }
    }
    fetchUser()
  }, [])
  
  // Debug: Log user state changes
  useEffect(() => {
    console.log('👤 User state updated:', user)
  }, [user])

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await http.post('/auth/logout')
        navigate('/login')
      } catch (error) {
        console.error('Error logging out:', error)
        // Force logout even if API call fails
        navigate('/login')
      }
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Get role display with emoji
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '👑 Super Admin'
      case 'admin':
        return '🔑 Admin'
      case 'customer':
        return '👤 User'
      case 'client_user':
        return '👁️ Viewer'
      default:
        return '👤 User'
    }
  }

  return (
    <div className="layout">
      {/* Mobile Menu Toggle Button */}
      <div 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        style={{
          display: 'flex',
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          color: 'white',
          width: '50px',
          height: '50px',
          borderRadius: '12px',
          border: '2px solid #fff',
          boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          transition: 'all 0.3s ease'
        }}
      >
        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <img src="/logo.png" alt="WeTechForU" className="brand-logo" />
          <h1>WeTechForU</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RoleBasedNav />
        </div>
        <div className="sidebar-footer">
          {user && (
            <div className="profile-card" onClick={() => navigate('/app/profile')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="profile-avatar">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="profile-info-name">
                    {user.email}
                  </div>
                  <div className="profile-info-role">
                    {getRoleDisplay(user.role)}
                  </div>
                </div>
                <i className="fas fa-user-circle" style={{ fontSize: '1.2rem', color: '#4682B4' }}></i>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>
      <main className="content">
        {/* Top Right Profile/Logout Bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          right: 0,
          zIndex: 100,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderBottom: '2px solid #e9ecef',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {user && (
            <div
              onClick={() => navigate('/app/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef'
                e.currentTarget.style.borderColor = '#adb5bd'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa'
                e.currentTarget.style.borderColor = '#dee2e6'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2C5F77' }}>
                  {user.email}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6c757d' }}>
                  {getRoleDisplay(user.role)}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              color: 'white',
              border: '2px solid rgba(220, 53, 69, 0.5)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.3)'
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
        
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


