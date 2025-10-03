import { createBrowserRouter } from "react-router-dom";
import AdminDashboard from "../pages/AdminDashboardPage";
import LoginPage from "../pages/LoginPage";
import AppLayout from "../layouts/AppLayout";
import ClientsPage from "../pages/ClientsPage";
import LeadsPage from "../pages/LeadsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { path: "admin", element: <AdminDashboard /> },
      { path: "clients", element: <ClientsPage /> },
      { path: "leads", element: <LeadsPage /> },
    ],
  },
]);