import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { healthcareTheme } from './theme/healthcareTheme';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import LeadManagement from './pages/LeadManagement';
import ClientManagement from './pages/ClientManagement';
import SEOAnalysis from './pages/SEOAnalysis';
import CampaignManagement from './pages/CampaignManagement';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider theme={healthcareTheme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/admin" replace />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="leads" element={<LeadManagement />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="seo" element={<SEOAnalysis />} />
                <Route path="campaigns" element={<CampaignManagement />} />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
