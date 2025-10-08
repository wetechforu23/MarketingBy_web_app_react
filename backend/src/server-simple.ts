import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server is running' });
});

// Basic auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple demo login
  if (email === 'admin@healthcaremarketing.com' && password === 'admin123') {
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: 1,
        email: email,
        role: 'admin',
        permissions: {
          pages: ['admin', 'client-dashboard', 'leads'],
          apis: ['all'],
          actions: ['create', 'read', 'update', 'delete']
        }
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  res.json({
    id: 1,
    email: 'admin@healthcaremarketing.com',
    role: 'admin',
    permissions: {
      pages: ['admin', 'client-dashboard', 'leads'],
      apis: ['all'],
      actions: ['create', 'read', 'update', 'delete']
    }
  });
});

// Mock leads endpoint
app.get('/api/leads', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Elite 360 Health',
      email: 'info@elite360health.com',
      phone: '(972) 230-5601',
      company: 'Elite 360 Health',
      industry_category: 'Healthcare',
      source: 'Website Scraping',
      status: 'new',
      notes: 'Primary care and wellness services',
      created_at: new Date().toISOString()
    }
  ]);
});

// Mock clients endpoint
app.get('/api/clients', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Elite 360 Health',
      email: 'info@elite360health.com',
      phone: '(972) 230-5601',
      company: 'Elite 360 Health',
      industry: 'Healthcare',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ]);
});

// Mock campaigns endpoint
app.get('/api/campaigns', (req, res) => {
  res.json([]);
});

// API credits endpoint
app.get('/api/api-credits', (req, res) => {
  res.json({
    free: true,
    paid: false,
    credits: 0
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
