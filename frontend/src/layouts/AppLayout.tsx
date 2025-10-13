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
        
        <div className="sidebar-footer">
          {user && (
            <div className="profile-card" onClick={toggleProfileMenu}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="profile-avatar">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!isSidebarCollapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="profile-info-name">
                      {user.email}
                    </div>
                    <div className="profile-info-role">
                      {getRoleDisplay(user.role)}
                    </div>
                  </div>
                )}
                <i className="fas fa-user-circle" style={{ fontSize: '1.2rem', color: '#4682B4' }}></i>
              </div>
            </div>
          )}
          
          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className="profile-menu" style={{
              position: 'absolute',
              bottom: '80px',
              left: '20px',
              right: '20px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(70, 130, 180, 0.2)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2C5F77' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '2px' }}>
                  {getRoleDisplay(user?.role || '')}
                </div>
              </div>
              <div style={{ padding: '10px 0' }}>
                <button 
                  onClick={() => {
                    navigate('/app/profile')
                    setShowProfileMenu(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#2C5F77',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fas fa-user-cog"></i>
                  Profile Settings
                </button>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#dc3545',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      
      <main className="content">
        {/* Version Indicator */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: '#28a745',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 1000,
          fontWeight: 'bold'
        }}>
          NEW NAV v1.0
        </div>
        
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}