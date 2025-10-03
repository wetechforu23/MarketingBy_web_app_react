import { createBrowserRouter } from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboardPage";
import LoginPage from "../pages/LoginPage";
import AppLayout from "../layouts/AppLayout";
import ClientsPage from "../pages/ClientsPage";
import LeadsPage from "../pages/LeadsPage";
import UsersPage from "../pages/UsersPage";
import CampaignsPage from "../pages/CampaignsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import CustomerPortalPage from "../pages/CustomerPortalPage";
import CustomerSEOReportsPage from "../pages/CustomerSEOReportsPage";
import CustomerContentApprovalPage from "../pages/CustomerContentApprovalPage";
import CustomerPerformancePage from "../pages/CustomerPerformancePage";
import CustomerCommunicationsPage from "../pages/CustomerCommunicationsPage";
import CustomerPlanInfoPage from "../pages/CustomerPlanInfoPage";
import SecureReportPage from "../pages/SecureReportPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { path: "admin", element: <AdminDashboard /> },
      { path: "users", element: <UsersPage /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "leads", element: <LeadsPage /> },
      { path: "campaigns", element: <CampaignsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
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
]);