import { Link, Outlet } from 'react-router-dom'
import '../theme/brand.css'

export default function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">WeTechForU</div>
        <nav>
          <div className="nav-group">
            <div className="nav-group-title">Dashboard</div>
            <Link className="nav-link" to="/app/admin">Admin</Link>
          </div>
          <div className="nav-group">
            <div className="nav-group-title">Management</div>
            <Link className="nav-link" to="/app/users">Users</Link>
            <Link className="nav-link" to="/app/clients">Clients</Link>
            <Link className="nav-link" to="/app/leads">Leads</Link>
            <Link className="nav-link" to="/app/campaigns">Campaigns</Link>
            <Link className="nav-link" to="/app/analytics">Analytics</Link>
          </div>
          <div className="nav-group">
            <div className="nav-group-title">SEO</div>
            <div className="nav-tree">
              <Link className="nav-link" to="/app/customer/seo-reports">Reports</Link>
            </div>
          </div>
          <div className="nav-group">
            <div className="nav-group-title">Customer</div>
            <div className="nav-tree">
              <Link className="nav-link" to="/app/customer/content-approval">Content Approval</Link>
              <Link className="nav-link" to="/app/customer/performance">Performance</Link>
              <Link className="nav-link" to="/app/customer/communications">Communications</Link>
              <Link className="nav-link" to="/app/customer/plan">Plan</Link>
            </div>
          </div>
          <div className="nav-group">
            <div className="nav-group-title">Secure</div>
            <div className="nav-tree">
              <Link className="nav-link" to="/app/secure/report/TESTTOKEN">Secure Report</Link>
            </div>
          </div>
        </nav>
      </aside>
      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


