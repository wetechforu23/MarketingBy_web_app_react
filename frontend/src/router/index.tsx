import { createBrowserRouter } from "react-router-dom";
import SmartDashboard from "../components/SmartDashboard";
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import ClientAdminDashboard from "../pages/ClientAdminDashboard";
import ClientUserDashboard from "../pages/ClientUserDashboard";
import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/home/HomePage";
import AppLayout from "../layouts/AppLayout";
import Clients from "../pages/Clients";
import Leads from "../pages/Leads";
import LeadDetail from "../pages/LeadDetail";
import Users from "../pages/Users";
import Profile from "../pages/Profile";
import CampaignsPage from "../pages/CampaignsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import SEOPage from "../pages/SEOPage";
import CustomerPortalPage from "../pages/CustomerPortalPage";
import CustomerSEOReportsPage from "../pages/CustomerSEOReportsPage";
import CustomerContentApprovalPage from "../pages/CustomerContentApprovalPage";
import CustomerPerformancePage from "../pages/CustomerPerformancePage";
import CustomerCommunicationsPage from "../pages/CustomerCommunicationsPage";
import CustomerPlanInfoPage from "../pages/CustomerPlanInfoPage";
import SecureReportPage from "../pages/SecureReportPage";
import CalendarPage from "../pages/CalendarPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> }, // Public home page
  { path: "/login", element: <LoginPage /> }, // Login page
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { path: "dashboard", element: <SmartDashboard /> }, // Smart dashboard that routes based on user type
      { path: "admin", element: <SuperAdminDashboard /> }, // Super Admin Dashboard
      { path: "client-admin", element: <ClientAdminDashboard /> }, // Client Admin Dashboard
      { path: "client-user", element: <ClientUserDashboard /> }, // Client User Dashboard
      { path: "profile", element: <Profile /> }, // User Profile page
      { path: "users", element: <Users /> },
      { path: "clients", element: <Clients /> },
      { path: "client-dashboard", element: <ClientAdminDashboard /> }, // Client dashboard route
      { path: "leads", element: <Leads /> },
      { path: "leads/:id", element: <LeadDetail /> }, // Lead detail page
      { path: "campaigns", element: <CampaignsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "seo", element: <SEOPage /> },
      { path: "ai-seo", element: <SEOPage /> }, // AI SEO route (using SEO page for now)
      { path: "seo-tasks", element: <SEOPage /> }, // SEO Tasks route (using SEO page for now)
      { path: "calendar", element: <CalendarPage /> },
      { path: "compliance", element: <CalendarPage /> }, // Compliance route (using Calendar page for now)
      { path: "credentials", element: <Users /> }, // Credentials route (using Users page for now)
      { path: "settings", element: <Users /> }, // Settings route (using Users page for now)
      {
        path: "customer",
        element: <CustomerPortalPage />,
        children: [
          { path: "seo-reports", element: <CustomerSEOReportsPage /> },
          { path: "content-approval", element: <CustomerContentApprovalPage /> },
          { path: "performance", element: <CustomerPerformancePage /> },
          { path: "communications", element: <CustomerCommunicationsPage /> },
          { path: "plan", element: <CustomerPlanInfoPage /> },
        ],
      },
      { path: "secure/report/:token", element: <SecureReportPage /> },
    ],
  },
  { path: "*", element: <HomePage /> }, // Catch-all route to home page
]);