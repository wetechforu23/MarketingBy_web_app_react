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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(cors({
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
}));
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
    secure: process.env.NODE_ENV === 'production', // true in production (HTTPS required)
    httpOnly: true,
    sameSite: 'lax', // 'lax' for same-site in production (not cross-origin)
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    // Remove domain restriction - let browser set it automatically
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/lead-assignment', leadAssignmentRoutes);
app.use('/api/users', usersRoutes);
// Social Media Content Management routes
app.use('/api/content', contentRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/posts', postsRoutes);

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
