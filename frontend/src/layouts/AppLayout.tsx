import { Outlet } from 'react-router-dom'
import RoleBasedNav from '../components/RoleBasedNav'
import '../theme/brand.css'

export default function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="WeTechForU" className="brand-logo" />
          <h1>WeTechForU</h1>
        </div>
        <RoleBasedNav />
      </aside>
      <main className="content">
        <div className="content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


