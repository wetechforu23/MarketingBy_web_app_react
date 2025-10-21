/**
 * Lead Assignment API Routes
 * Manage lead assignments to team members
 */

import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * POST /api/lead-assignment/assign
 * Assign a lead to a team member
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { lead_id, assigned_to, notes, reason } = req.body;
    const session = req.session as any;
    const assigned_by = session.userId;

    if (!lead_id || !assigned_to) {
      return res.status(400).json({ error: 'lead_id and assigned_to are required' });
    }

    if (!assigned_by) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current user's role
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [assigned_by]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;

    // Only super_admin and admin can assign leads
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions to assign leads' });
    }

    // Check if the user being assigned to exists and is active
    const userCheck = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [assigned_to]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get current assignment to track in history
    const currentAssignment = await pool.query(
      'SELECT assigned_to FROM leads WHERE id = $1',
      [lead_id]
    );

    if (currentAssignment.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // If there's an existing assignment, mark it as unassigned in history
      if (currentAssignment.rows[0].assigned_to) {
        await pool.query(
          `UPDATE lead_assignment_history 
           SET unassigned_at = NOW() 
           WHERE lead_id = $1 AND assigned_to = $2 AND unassigned_at IS NULL`,
          [lead_id, currentAssignment.rows[0].assigned_to]
        );
      }

      // Update the lead with new assignment
      await pool.query(
        `UPDATE leads 
         SET assigned_to = $1, assigned_at = NOW(), assigned_by = $2, assignment_notes = $3
         WHERE id = $4`,
        [assigned_to, assigned_by, notes, lead_id]
      );

      // Add to assignment history
      await pool.query(
        `INSERT INTO lead_assignment_history (lead_id, assigned_to, assigned_by, notes, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [lead_id, assigned_to, assigned_by, notes, reason || 'manual_assignment']
      );

      await pool.query('COMMIT');

      // Return updated lead with assignment details
      const result = await pool.query(
        `SELECT l.*, 
                u1.username as assigned_to_name,
                u2.username as assigned_by_name
         FROM leads l
         LEFT JOIN users u1 ON l.assigned_to = u1.id
         LEFT JOIN users u2 ON l.assigned_by = u2.id
         WHERE l.id = $1`,
        [lead_id]
      );

      res.json({
        message: 'Lead assigned successfully',
        lead: result.rows[0]
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

/**
 * POST /api/lead-assignment/unassign
 * Unassign a lead (remove assignment)
 */
router.post('/unassign', async (req: Request, res: Response) => {
  try {
    const { lead_id, reason } = req.body;
    const session = req.session as any;
    const unassigned_by = session.userId;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id is required' });
    }

    if (!unassigned_by) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current user's role
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [unassigned_by]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;

    // Only super_admin and admin can unassign leads
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions to unassign leads' });
    }

    // Get current assignment
    const currentAssignment = await pool.query(
      'SELECT assigned_to FROM leads WHERE id = $1',
      [lead_id]
    );

    if (currentAssignment.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!currentAssignment.rows[0].assigned_to) {
      return res.status(400).json({ error: 'Lead is not currently assigned' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Mark as unassigned in history
      await pool.query(
        `UPDATE lead_assignment_history 
         SET unassigned_at = NOW() 
         WHERE lead_id = $1 AND assigned_to = $2 AND unassigned_at IS NULL`,
        [lead_id, currentAssignment.rows[0].assigned_to]
      );

      // Update the lead
      await pool.query(
        `UPDATE leads 
         SET assigned_to = NULL, assigned_at = NULL, assigned_by = NULL, assignment_notes = NULL
         WHERE id = $1`,
        [lead_id]
      );

      await pool.query('COMMIT');

      res.json({
        message: 'Lead unassigned successfully',
        lead_id
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error unassigning lead:', error);
    res.status(500).json({ error: 'Failed to unassign lead' });
  }
});

/**
 * GET /api/lead-assignment/history/:leadId
 * Get assignment history for a lead
 */
router.get('/history/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const result = await pool.query(
      `SELECT lah.*, 
              u1.username as assigned_to_name,
              u2.username as assigned_by_name
       FROM lead_assignment_history lah
       LEFT JOIN users u1 ON lah.assigned_to = u1.id
       LEFT JOIN users u2 ON lah.assigned_by = u2.id
       WHERE lah.lead_id = $1
       ORDER BY lah.assigned_at DESC`,
      [leadId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    res.status(500).json({ error: 'Failed to fetch assignment history' });
  }
});

/**
 * GET /api/lead-assignment/my-leads
 * Get leads assigned to current user
 */
router.get('/my-leads', async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { status, priority } = req.query;

    let query = `
      SELECT l.*, 
             u1.username as assigned_to_name,
             u2.username as assigned_by_name
      FROM leads l
      LEFT JOIN users u1 ON l.assigned_to = u1.id
      LEFT JOIN users u2 ON l.assigned_by = u2.id
      WHERE l.assigned_to = $1
    `;
    const params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my leads:', error);
    res.status(500).json({ error: 'Failed to fetch assigned leads' });
  }
});

/**
 * GET /api/lead-assignment/team-workload
 * Get workload summary for all team members
 */
router.get('/team-workload', async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    const userId = session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current user's role and client_id
    const userResult = await pool.query(
      'SELECT role, client_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;
    const clientId = userResult.rows[0].client_id;

    // Only super_admin and admin can view team workload
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'new' THEN 1 END) as new_leads,
        COUNT(CASE WHEN l.status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) as qualified_leads,
        COUNT(CASE WHEN l.status = 'proposal_sent' THEN 1 END) as proposal_sent_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_to
    `;

    if (userRole === 'admin') {
      query += ` WHERE u.client_id = $1`;
    }

    query += `
      GROUP BY u.id, u.username, u.email, u.role
      ORDER BY total_leads DESC
    `;

    const result = await pool.query(
      query,
      userRole === 'admin' ? [clientId] : []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching team workload:', error);
    res.status(500).json({ error: 'Failed to fetch team workload' });
  }
});

/**
 * POST /api/lead-assignment/bulk-assign
 * Assign multiple leads to a team member at once
 */
router.post('/bulk-assign', async (req: Request, res: Response) => {
  try {
    const { lead_ids, assigned_to, notes, reason } = req.body;
    const session = req.session as any;
    const assigned_by = session.userId;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ error: 'lead_ids array is required' });
    }

    if (!assigned_to) {
      return res.status(400).json({ error: 'assigned_to is required' });
    }

    if (!assigned_by) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current user's role
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [assigned_by]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;

    // Only super_admin and admin can assign leads
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions to assign leads' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      let successCount = 0;

      for (const lead_id of lead_ids) {
        // Get current assignment
        const currentAssignment = await pool.query(
          'SELECT assigned_to FROM leads WHERE id = $1',
          [lead_id]
        );

        if (currentAssignment.rows.length > 0) {
          // If there's an existing assignment, mark it as unassigned
          if (currentAssignment.rows[0].assigned_to) {
            await pool.query(
              `UPDATE lead_assignment_history 
               SET unassigned_at = NOW() 
               WHERE lead_id = $1 AND assigned_to = $2 AND unassigned_at IS NULL`,
              [lead_id, currentAssignment.rows[0].assigned_to]
            );
          }

          // Update the lead
          await pool.query(
            `UPDATE leads 
             SET assigned_to = $1, assigned_at = NOW(), assigned_by = $2, assignment_notes = $3
             WHERE id = $4`,
            [assigned_to, assigned_by, notes, lead_id]
          );

          // Add to history
          await pool.query(
            `INSERT INTO lead_assignment_history (lead_id, assigned_to, assigned_by, notes, reason)
             VALUES ($1, $2, $3, $4, $5)`,
            [lead_id, assigned_to, assigned_by, notes, reason || 'bulk_assignment']
          );

          successCount++;
        }
      }

      await pool.query('COMMIT');

      res.json({
        message: `Successfully assigned ${successCount} leads`,
        assigned_count: successCount,
        total_requested: lead_ids.length
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ error: 'Failed to bulk assign leads' });
  }
});

export default router;

