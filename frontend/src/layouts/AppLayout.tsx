import { Link, Outlet } from 'react-router-dom'
import '../theme/brand.css'

export default function AppLayout() {
  return (
    <div>
      <nav style={{ padding: 8, background: 'var(--primary-dark)' }}>
        <Link to="/app/admin" style={{ color: 'white', marginRight: 12 }}>Admin</Link>
        <Link to="/app/users" style={{ color: 'white', marginRight: 12 }}>Users</Link>
        <Link to="/app/clients" style={{ color: 'white', marginRight: 12 }}>Clients</Link>
        <Link to="/app/leads" style={{ color: 'white', marginRight: 12 }}>Leads</Link>
        <Link to="/app/campaigns" style={{ color: 'white', marginRight: 12 }}>Campaigns</Link>
        <Link to="/app/analytics" style={{ color: 'white' }}>Analytics</Link>
      </nav>
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  )
}


