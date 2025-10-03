import { createBrowserRouter } from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboardPage";
import LoginPage from "../pages/LoginPage";
import AppLayout from "../layouts/AppLayout";
import ClientsPage from "../pages/ClientsPage";
import LeadsPage from "../pages/LeadsPage";
import UsersPage from "../pages/UsersPage";
import CampaignsPage from "../pages/CampaignsPage";
import AnalyticsPage from "../pages/AnalyticsPage";

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
    ],
  },
]);