import { Link, Outlet } from 'react-router-dom'
import '../theme/brand.css'

export default function AppLayout() {
  return (
    <div>
      <nav style={{ padding: 8, background: 'var(--primary-dark)' }}>
        <Link to="/app/admin" style={{ color: 'white', marginRight: 12 }}>Admin</Link>
        <Link to="/app/clients" style={{ color: 'white', marginRight: 12 }}>Clients</Link>
        <Link to="/app/leads" style={{ color: 'white' }}>Leads</Link>
      </nav>
      <div style={{ padding: 16 }}>
        <Outlet />
      </div>
    </div>
  )
}


