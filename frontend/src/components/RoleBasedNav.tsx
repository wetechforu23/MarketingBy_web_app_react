import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { http } from '../api/http'

interface UserPermissions {
  canViewUsers: boolean
  canManageUsers: boolean
  canViewLeads: boolean
  canManageLeads: boolean
  canViewClients: boolean
  canManageClients: boolean
  canViewSEO: boolean
  canManageSEO: boolean
  canViewAnalytics: boolean
  canViewCalendar: boolean
  canManageCalendar: boolean
  canViewCompliance: boolean
  canManageCompliance: boolean
  canViewAISEO: boolean
  canManageAISEO: boolean
  canViewSEOTasks: boolean
  canManageSEOTasks: boolean
  canViewCredentials: boolean
  canManageCredentials: boolean
}

interface User {
  id: number
  email: string
  role: string
  team_type?: string
  client_id?: number
  permissions?: any
}

interface RoleBasedNavProps {
  isCollapsed?: boolean
  onNavigate?: () => void
}

export default function RoleBasedNav({ isCollapsed = false, onNavigate }: RoleBasedNavProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  // ✅ Fetch unread message counts (only for WeTechForU users, not client users)
  useEffect(() => {
    // Only fetch unread counts if user is NOT a client user
    if (user && user.role !== 'client_admin' && user.role !== 'client_user') {
      const fetchUnreadCounts = async () => {
        try {
          const response = await http.get('/chat-widget/admin/unread-counts')
          const totalUnread = response.data.total_unread || 0
          setUnreadCount(totalUnread)
        } catch (error) {
          console.warn('Failed to fetch unread counts:', error)
        }
      }
      
      // Fetch immediately
      fetchUnreadCounts()
      
      // Poll every 10 seconds for updates
      const interval = setInterval(fetchUnreadCounts, 10000)
      
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await http.get('/auth/me')
        const userData = userResponse.data
        
        setUser(userData)
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Add dropdown functionality
  useEffect(() => {
    const handleDropdownClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('sub-btn')) {
        e.preventDefault()
        const navItem = target.closest('.nav-item')
        if (navItem) {
          const subMenu = navItem.querySelector('.sub-menu') as HTMLElement
          const dropdown = target.querySelector('.dropdown') as HTMLElement
          
          if (subMenu && dropdown) {
            // Toggle submenu
            if (subMenu.style.display === 'block') {
              subMenu.style.display = 'none'
              dropdown.classList.remove('rotate')
            } else {
              subMenu.style.display = 'block'
              dropdown.classList.add('rotate')
            }
          }
        }
      }
    }

    document.addEventListener('click', handleDropdownClick)
    return () => document.removeEventListener('click', handleDropdownClick)
  }, [])

  // Determine user type
  const isSuperAdmin = user?.role === 'super_admin';
  const isClientAdmin = user?.role === 'client_admin';
  const isClientUser = user?.role === 'client_user';
  const isWeTechForUUser = user?.team_type === 'wetechforu';

  const isActive = (path: string) => {
    return location.pathname === path
  }


  const hasPageAccess = (page: string) => {
    // Super Admin can access everything
    if (isSuperAdmin) return true
    
    // Client users (client_admin, client_user) can only access dashboard
    if (isClientAdmin || isClientUser) {
      switch (page) {
        case 'dashboard':
          return true; // Dashboard only
        default:
          return false; // Everything else hidden
      }
    }
    
    // WeTechForU team and other roles
    switch (page) {
      case 'dashboard':
        return true;
      case 'users':
        return isSuperAdmin || isWeTechForUUser;
      case 'clients':
        return isSuperAdmin || isWeTechForUUser;
      case 'leads':
        return isSuperAdmin || isWeTechForUUser;
      case 'seo':
      case 'seo-analysis':
      case 'seo-audit':
        return isSuperAdmin || isWeTechForUUser;
      case 'analytics':
      case 'reports':
        return isSuperAdmin || isWeTechForUUser;
      case 'settings':
      case 'credentials':
        return isSuperAdmin || isWeTechForUUser;
      default:
        return false;
    }
  }

  if (loading) {
    return (
      <div className="sidebar">
        <div className="nav-loading">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      
      <ul className="nav-list">
        {/* Dashboard - Available to all users */}
        {hasPageAccess('dashboard') && (
          <li className="nav-item">
            <Link 
              className={`nav-link ${isActive('/app/dashboard') ? 'active' : ''}`} 
              to="/app/dashboard"
              onClick={onNavigate}
              title={isCollapsed ? 'Dashboard' : ''}
            >
              <i className="fas fa-tachometer-alt"></i>
              {!isCollapsed && 'Dashboard'}
            </Link>
          </li>
        )}

        {/* Client User Navigation - Show only for client users */}
        {(isClientAdmin || isClientUser) && (
          <>
            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=google-analytics') ? 'active' : ''}`} 
                to="/app/dashboard?tab=google-analytics"
                onClick={onNavigate}
                title={isCollapsed ? 'Google Analytics' : ''}
              >
                <i className="fas fa-chart-bar"></i>
                {!isCollapsed && 'Google Analytics'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=social-media') ? 'active' : ''}`} 
                to="/app/dashboard?tab=social-media"
                onClick={onNavigate}
                title={isCollapsed ? 'Social Media' : ''}
              >
                <i className="fas fa-share-alt"></i>
                {!isCollapsed && 'Social Media'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=lead-tracking') ? 'active' : ''}`} 
                to="/app/dashboard?tab=lead-tracking"
                onClick={onNavigate}
                title={isCollapsed ? 'Lead Tracking' : ''}
              >
                <i className="fas fa-briefcase"></i>
                {!isCollapsed && 'Lead Tracking'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=seo-analysis') ? 'active' : ''}`} 
                to="/app/dashboard?tab=seo-analysis"
                onClick={onNavigate}
                title={isCollapsed ? 'SEO Analysis' : ''}
              >
                <i className="fas fa-search"></i>
                {!isCollapsed && 'SEO Analysis'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=reports') ? 'active' : ''}`} 
                to="/app/dashboard?tab=reports"
                onClick={onNavigate}
                title={isCollapsed ? 'Reports' : ''}
              >
                <i className="fas fa-file-alt"></i>
                {!isCollapsed && 'Reports'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=local-search') ? 'active' : ''}`} 
                to="/app/dashboard?tab=local-search"
                onClick={onNavigate}
                title={isCollapsed ? 'Local Search' : ''}
              >
                <i className="fas fa-map-marker-alt"></i>
                {!isCollapsed && 'Local Search'}
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                className={`nav-link ${isActive('/app/dashboard?tab=settings') ? 'active' : ''}`} 
                to="/app/dashboard?tab=settings"
                onClick={onNavigate}
                title={isCollapsed ? 'Settings' : ''}
              >
                <i className="fas fa-cog"></i>
                {!isCollapsed && 'Settings'}
              </Link>
            </li>
          </>
        )}

               {/* Client Management - New Dashboard */}
               {hasPageAccess('clients') && (
                 <li className="nav-item">
                   <Link
                     className={`nav-link ${isActive('/app/client-management') ? 'active' : ''}`}
                     to="/app/client-management"
                     onClick={onNavigate}
                     title={isCollapsed ? 'Client Management' : ''}
                   >
                     <i className="fas fa-chart-line"></i>
                     {!isCollapsed && 'Client Management'}
                   </Link>
                 </li>
               )}

        {/* Social Media Content Management - NEW SECTION */}
        {hasPageAccess('clients') && (
          <li className="nav-item">
            <a className="nav-link sub-btn" title={isCollapsed ? 'Social Media' : ''}>
              <i className="fas fa-share-alt"></i>
              {!isCollapsed && 'Social Media'}
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/content-library') ? 'active' : ''}`} 
                  to="/app/content-library"
                  onClick={onNavigate}
                >
                  <i className="fas fa-book"></i> Content Library
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/content-library/create') ? 'active' : ''}`} 
                  to="/app/content-library/create"
                  onClick={onNavigate}
                >
                  <i className="fas fa-plus-circle"></i> Create Content
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/approvals') ? 'active' : ''}`} 
                  to="/app/approvals"
                  onClick={onNavigate}
                >
                  <i className="fas fa-check-circle"></i> Approval Queue
                </Link>
              </li>
            </ul>
          </li>
        )}

        {/* AI Chat Widget - NEW SECTION */}
        {hasPageAccess('clients') && (
          <li className="nav-item">
            <a className="nav-link sub-btn" title={isCollapsed ? 'Chat Widget' : ''}>
              <i className="fas fa-comments"></i>
              {!isCollapsed && 'Chat Widget'}
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/chat-widgets') ? 'active' : ''}`} 
                  to="/app/chat-widgets"
                  onClick={onNavigate}
                >
                  <i className="fas fa-robot"></i> My Widgets
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/chat-widgets/create') ? 'active' : ''}`} 
                  to="/app/chat-widgets/create"
                  onClick={onNavigate}
                >
                  <i className="fas fa-plus-circle"></i> Create Widget
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/chat-conversations') ? 'active' : ''}`} 
                  to="/app/chat-conversations"
                  onClick={onNavigate}
                  style={{ position: 'relative' }}
                >
                  <i className="fas fa-comments"></i> Conversations
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '12px',
                      background: '#dc3545',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      minWidth: '20px',
                      textAlign: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/visitor-monitoring') ? 'active' : ''}`} 
                  to="/app/visitor-monitoring"
                  onClick={onNavigate}
                >
                  <i className="fas fa-users"></i> Visitor Monitoring
                </Link>
              </li>
            </ul>
          </li>
        )}

        {/* Blog Management - NEW SECTION */}
        {hasPageAccess('clients') && (
          <li className="nav-item">
            <a className="nav-link sub-btn" title={isCollapsed ? 'Blog Management' : ''}>
              <i className="fas fa-blog"></i>
              {!isCollapsed && 'Blog Management'}
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/blogs') ? 'active' : ''}`} 
                  to="/app/blogs"
                  onClick={onNavigate}
                >
                  <i className="fas fa-edit"></i> Manage Blogs
                </Link>
              </li>
              <li>
                <Link 
                  className={`nav-link ${isActive('/app/blog-analytics') ? 'active' : ''}`} 
                  to="/app/blog-analytics"
                  onClick={onNavigate}
                >
                  <i className="fas fa-chart-line"></i> Analytics
                </Link>
              </li>
            </ul>
          </li>
        )}

        {/* Leads - Own Section */}
        {hasPageAccess('leads') && (
          <li className="nav-item">
            <Link 
              className={`nav-link ${isActive('/app/leads') ? 'active' : ''}`} 
              to="/app/leads"
              onClick={onNavigate}
              title={isCollapsed ? 'Leads' : ''}
            >
              <i className="fas fa-user-plus"></i>
              {!isCollapsed && 'Leads'}
            </Link>
          </li>
        )}

        {/* Client Management Section - HIDDEN FOR CLIENT USERS */}
        {false && (isClientAdmin || isClientUser) && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-chart-line"></i>
              Client Management
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('client-dashboard') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/client-dashboard') ? 'active' : ''}`} 
                    to="/app/client-dashboard"
                  >
                    Client Dashboard
                  </Link>
                </li>
              )}
              {hasPageAccess('campaigns') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/campaigns') ? 'active' : ''}`} 
                    to="/app/campaigns"
                  >
                    Campaigns
                  </Link>
                </li>
              )}
            </ul>
          </li>
        )}

        {/* Customer Portal Section */}
        {hasPageAccess('customer') && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-users"></i>
              Customer Portal
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('customer/seo-reports') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/seo-reports') ? 'active' : ''}`} 
                    to="/app/customer/seo-reports"
                  >
                    SEO Reports
                  </Link>
                </li>
              )}
              {hasPageAccess('customer/analytics') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/analytics') ? 'active' : ''}`} 
                    to="/app/customer/analytics"
                  >
                    Analytics
                  </Link>
                </li>
              )}
              {hasPageAccess('customer/leads') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/leads') ? 'active' : ''}`} 
                    to="/app/customer/leads"
                  >
                    Leads
                  </Link>
                </li>
              )}
              {hasPageAccess('customer/performance') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/performance') ? 'active' : ''}`} 
                    to="/app/customer/performance"
                  >
                    Performance
                  </Link>
                </li>
              )}
              {hasPageAccess('customer/communications') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/communications') ? 'active' : ''}`} 
                    to="/app/customer/communications"
                  >
                    Communications
                  </Link>
                </li>
              )}
              {hasPageAccess('customer/plan') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/customer/plan') ? 'active' : ''}`} 
                    to="/app/customer/plan"
                  >
                    Plan
                  </Link>
                </li>
              )}
            </ul>
          </li>
        )}

        {/* System Management Section - Moved to bottom */}
        {isSuperAdmin && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-cog"></i>
              System Management
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('users') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/users') ? 'active' : ''}`} 
                    to="/app/users"
                  >
                    Users
                  </Link>
                </li>
              )}
              {hasPageAccess('clients') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/settings/clients') ? 'active' : ''}`} 
                    to="/app/settings/clients"
                  >
                    Clients
                  </Link>
                </li>
              )}
              {hasPageAccess('credentials') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/credentials') ? 'active' : ''}`} 
                    to="/app/credentials"
                  >
                    Credentials
                  </Link>
                </li>
              )}
              {hasPageAccess('settings') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/settings') ? 'active' : ''}`} 
                    to="/app/settings"
                  >
                    Settings
                  </Link>
                </li>
              )}
            </ul>
          </li>
        )}
      </ul>
    </div>
  )
}