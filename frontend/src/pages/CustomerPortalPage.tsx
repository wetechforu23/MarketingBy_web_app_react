import { Link, Outlet } from 'react-router-dom'

export default function CustomerPortalPage() {
  return (
    <div>
      <h2>Customer Portal</h2>
      <nav style={{ marginBottom: 12 }}>
        <Link to="seo-reports" style={{ marginRight: 12 }}>SEO Reports</Link>
        <Link to="content-approval" style={{ marginRight: 12 }}>Content Approval</Link>
        <Link to="performance" style={{ marginRight: 12 }}>Performance</Link>
        <Link to="communications" style={{ marginRight: 12 }}>Communications</Link>
        <Link to="plan">Plan</Link>
      </nav>
      <Outlet />
    </div>
  )
}


