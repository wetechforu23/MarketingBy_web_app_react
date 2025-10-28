import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import pool from './config/database';

// Import session types
import './types/session';

// Import routes
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import seoRoutes from './routes/seo';
import emailRoutes from './routes/email';
import complianceRoutes from './routes/compliance';
import tasksRoutes from './routes/tasks';
import leadAssignmentRoutes from './routes/leadAssignment';
import usersRoutes from './routes/users';
// Social Media Content Management routes
import contentRoutes from './routes/content';
import approvalsRoutes from './routes/approvals';
import postsRoutes from './routes/posts';
import uploadRoutes from './routes/upload';
// Email Preferences & Unsubscribe routes
import emailPreferencesRoutes from './routes/emailPreferences';
// SMS Preferences & Unsubscribe routes
import smsPreferencesRoutes from './routes/smsPreferences';
// AI Chat Widget routes
import chatWidgetRoutes from './routes/chatWidget';
// Visitor Tracking & Monitoring routes
import visitorTrackingRoutes from './routes/visitorTracking';
// Test Email routes (for debugging email service)
import testEmailRoutes from './routes/testEmail';
// Duplicate Management routes
import duplicateManagementRoutes from './routes/duplicateManagement';
// Blog Management routes
import blogRoutes from './routes/blogs';
// Facebook Connect routes (2-Way Integration)
import facebookConnectRoutes from './routes/facebookConnect';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// WIDGET FILES - MUST BE FIRST (Before Helmet/CORS)
// ==========================================
// Serve widget JavaScript files with CORS enabled for ALL origins
// This MUST be BEFORE Helmet to avoid CSP/CORS conflicts
app.use('/public', (req, res, next) => {
  // Allow ALL origins for widget files (they're embedded on customer websites)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  
  // ✅ REDUCED CACHE: 5 minutes instead of 24 hours (for faster updates during development)
  // Change to 'public, max-age=86400' for production (24 hours)
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}, express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware
// Configure Helmet with relaxed CSP for production
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
      fontSrc: ["'self'", "https:", "data:"],
    },
  },
}));
app.use(morgan('combined'));

// ==========================================
// CORS Configuration (with public widget exemption)
// ==========================================
app.use((req, res, next) => {
  // ✅ Allow ALL origins for public widget API routes (customer websites)
  // This includes: chat widget routes + visitor tracking routes
  const isPublicChatWidget = req.path.startsWith('/api/chat-widget/public/');
  const isPublicVisitorTracking = req.path.startsWith('/api/visitor-tracking/public/');
  const isChatWidgetKey = /^\/api\/chat-widget\/wtfu_[a-f0-9]+\//.test(req.path);
  const isVisitorTrackingKey = /^\/api\/visitor-tracking\/public\/widget\/wtfu_[a-f0-9]+\//.test(req.path);
  
  if (isPublicChatWidget || isPublicVisitorTracking || isChatWidgetKey || isVisitorTrackingKey) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    return next();
  }
  
  // ✅ Restrictive CORS for admin/internal routes
  return cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:5176',
      'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com',
      'https://www.marketingby.wetechforu.com',
      'https://marketingby.wetechforu.com',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ],
    credentials: true
  })(req, res, next);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret',
  resave: false,
  saveUninitialized: false,
  store: new (require('connect-pg-simple')(session))({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  cookie: {
    secure: false, // false for local development
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/'
  },
  proxy: true, // Trust the reverse proxy (Heroku)
  name: 'marketingby.sid' // Custom session cookie name
}));

// Health check (before auth middleware)
app.get('/api/health', (req, res) => {
  res.json({
    service: 'MarketingBy Node.js Backend',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Routes (Order Matters! Specific routes BEFORE generic routes)
// ==========================================

// PUBLIC ROUTES (No authentication required) - MUST BE FIRST
// AI Chat Widget (includes public routes for website embedding)
app.use('/api/chat-widget', chatWidgetRoutes);
// Visitor Tracking & Monitoring (includes public tracking routes)
app.use('/api/visitor-tracking', visitorTrackingRoutes);
// Email Preferences & Unsubscribe (public routes - no auth required)
app.use('/api/email-preferences', emailPreferencesRoutes);
// SMS Preferences & Unsubscribe (public routes - no auth required)
app.use('/api/sms-preferences', smsPreferencesRoutes);

// AUTHENTICATED ROUTES (Require session/auth)
app.use('/api/auth', authRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/email', emailRoutes);
// Test Email routes (authenticated - for admins only)
app.use('/api/test-email', testEmailRoutes);
// Duplicate Management routes (authenticated)
app.use('/api/duplicates', duplicateManagementRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/lead-assignment', leadAssignmentRoutes);
app.use('/api/users', usersRoutes);
// Social Media Content Management routes
app.use('/api/content', contentRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/upload', uploadRoutes);
// Blog Management routes
app.use('/api/blogs', blogRoutes);
// Facebook Connect routes (2-Way Integration)
app.use('/api', facebookConnectRoutes);

// GENERIC API ROUTE (Catches all other /api/* routes) - MUST BE LAST
app.use('/api', apiRoutes);

// Serve React app (static files from public directory) - Only in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, 'public');
  app.use(express.static(frontendPath));

  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Development mode - API only
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      return res.status(200).json({ 
        message: 'MarketingBy API Server',
        mode: 'development',
        frontend: 'http://localhost:5173',
        docs: 'Use /api/* endpoints'
      });
    }
    res.status(404).json({ error: 'API endpoint not found' });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 MarketingBy Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
