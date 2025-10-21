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
  const location = useLocation()

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
    
    // Simple role-based access for now
    switch (page) {
      case 'dashboard':
        return true; // All users can access dashboard
      case 'users':
        return isSuperAdmin || isWeTechForUUser;
      case 'clients':
        return isSuperAdmin || isWeTechForUUser;
      case 'leads':
        return true; // All users can view leads (filtered by client)
      case 'seo':
      case 'seo-analysis':
      case 'seo-audit':
        return isSuperAdmin || isWeTechForUUser;
      case 'analytics':
      case 'reports':
        return true; // All users can view analytics (filtered by client)
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

        {/* Client Management Section */}
        {(isClientAdmin || isClientUser) && (
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

        {/* SEO & Marketing Section */}
        {hasPageAccess('seo') && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-search"></i>
              SEO & Marketing
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('seo-analysis') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/seo-analysis') ? 'active' : ''}`} 
                    to="/app/seo-analysis"
                  >
                    SEO Analysis
                  </Link>
                </li>
              )}
              {hasPageAccess('seo-audit') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/seo-audit') ? 'active' : ''}`} 
                    to="/app/seo-audit"
                  >
                    SEO Audit Tasks
                  </Link>
                </li>
              )}
              {hasPageAccess('ai-seo') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/ai-seo') ? 'active' : ''}`} 
                    to="/app/ai-seo"
                  >
                    AI-Based SEO
                  </Link>
                </li>
              )}
            </ul>
          </li>
        )}

        {/* Analytics & Reports Section */}
        {hasPageAccess('analytics') && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-chart-bar"></i>
              Analytics & Reports
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('analytics') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/analytics') ? 'active' : ''}`} 
                    to="/app/analytics"
                  >
                    Analytics
                  </Link>
                </li>
              )}
              {hasPageAccess('reports') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/reports') ? 'active' : ''}`} 
                    to="/app/reports"
                  >
                    Reports
                  </Link>
                </li>
              )}
            </ul>
          </li>
        )}

        {/* Tools & Utilities Section */}
        {hasPageAccess('calendar') && (
          <li className="nav-item">
            <a className="nav-link sub-btn">
              <i className="fas fa-tools"></i>
              Tools & Utilities
              <i className="fas fa-angle-right dropdown"></i>
            </a>
            <ul className="sub-menu">
              {hasPageAccess('calendar') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/calendar') ? 'active' : ''}`} 
                    to="/app/calendar"
                  >
                    Calendar
                  </Link>
                </li>
              )}
              {hasPageAccess('compliance') && (
                <li>
                  <Link 
                    className={`nav-link ${isActive('/app/compliance') ? 'active' : ''}`} 
                    to="/app/compliance"
                  >
                    Compliance
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