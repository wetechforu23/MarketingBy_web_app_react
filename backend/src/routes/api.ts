import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all API routes
router.use(requireAuth);

// Get clients
router.get('/clients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, company, industry, status, created_at FROM clients ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leads
router.get('/leads', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, company, industry_category, industry_subcategory, source, status, notes, created_at FROM leads ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, client_id, type, status, budget, start_date, end_date, created_at FROM campaigns ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Get basic counts
    const [clientsResult, leadsResult, campaignsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM clients'),
      pool.query('SELECT COUNT(*) as count FROM leads'),
      pool.query('SELECT COUNT(*) as count FROM campaigns')
    ]);

    res.json({
      clients: parseInt(clientsResult.rows[0].count),
      leads: parseInt(leadsResult.rows[0].count),
      campaigns: parseInt(campaignsResult.rows[0].count)
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
