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
  console.log('🚀 NEW NAVIGATION DESIGN LOADED - v1.0')
  
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

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

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu)
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
          display: window.innerWidth <= 768 ? 'flex' : 'none',
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
          color: '#2C5F77',
          width: '50px',
          height: '50px',
          borderRadius: '12px',
          border: '2px solid rgba(70, 130, 180, 0.3)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Toggle Button (Desktop) */}
        <div 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          style={{
            display: window.innerWidth > 768 ? 'flex' : 'none',
            position: 'absolute',
            top: '20px',
            right: '-15px',
            width: '30px',
            height: '30px',
            background: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
            color: '#2C5F77',
            borderRadius: '50%',
            border: '2px solid rgba(70, 130, 180, 0.3)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
        >
          <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </div>

        <div className="brand">
          <img src="/logo.png" alt="WeTechForU" className="brand-logo" />
          {!isSidebarCollapsed && <h1>WeTechForU</h1>}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RoleBasedNav isCollapsed={isSidebarCollapsed} onNavigate={closeMobileMenu} />
        </div>
        
      </aside>
      
      <main className="content">
        {/* User Profile in Top-Right Corner */}
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          {user && (
            <div 
              className="profile-avatar" 
              onClick={toggleProfileMenu} 
              ref={profileRef}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#007bff',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
              }}
            >
              {user.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '60px',
              right: '0',
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '200px',
              zIndex: 1001
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{user?.username}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{user?.email}</div>
                <div style={{ fontSize: '11px', color: '#007bff', marginTop: '4px' }}>
                  {getRoleDisplay(user?.role || '')}
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                <button 
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#333'
                  }}
                  onClick={() => { navigate('/app/profile'); setShowProfileMenu(false); }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="fas fa-user-circle" style={{ marginRight: '8px' }}></i>
                  Profile Settings
                </button>
                <button 
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#dc3545'
                  }}
                  onClick={handleLogout}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}