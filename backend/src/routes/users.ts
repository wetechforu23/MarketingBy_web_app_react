import { Router, Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default permissions for a role
 */
/**
 * Get comprehensive permissions structure
 * This defines ALL possible permissions in the system
 */
function getAllPermissions(): object {
  return {
    // Page Access
    pages: {
      dashboard: true,
      leads: true,
      clients: true,
      users: true,
      reports: true,
      seo: true,
      analytics: true,
      email: true,
      settings: true,
      clientManagement: true,
      localSearch: true,
    },
    // Feature Access
    leads: { view: true, add: true, edit: true, delete: true, assign: true, convert: true, export: true },
    users: { view: true, add: true, edit: true, delete: true, toggleActive: true, resetPassword: true },
    reports: { view: true, generate: true, export: true, delete: true, schedule: true },
    clients: { view: true, add: true, edit: true, delete: true, toggleActive: true, convertToLead: true },
    seo: { 
      basic: true, 
      comprehensive: true, 
      analysis: true, 
      recommendations: true, 
      checklist: true, 
      configureStandards: true 
    },
    analytics: {
      googleAnalytics: true,
      searchConsole: true,
      facebook: true,
      leadTracking: true,
      heatmap: true,
      sync: true,
      configure: true,
    },
    email: { send: true, templates: true, bulkSend: true, scheduling: true },
    settings: {
      viewAll: true,
      editOwn: true,
      editAll: true,
      credentials: true,
      integrations: true,
      systemConfig: true,
    },
    // Database Table Access
    database: {
      leads: { read: true, write: true, delete: true },
      clients: { read: true, write: true, delete: true },
      users: { read: true, write: true, delete: true },
      campaigns: { read: true, write: true, delete: true },
      reports: { read: true, write: true, delete: true },
      analytics_data: { read: true, write: true, delete: true },
      facebook_insights: { read: true, write: true, delete: true },
      seo_audit_tasks: { read: true, write: true, delete: true },
      client_credentials: { read: true, write: true, delete: true },
    },
    // System Capabilities
    system: {
      viewLogs: true,
      manageBackups: true,
      systemSettings: true,
      apiAccess: true,
      webhooks: true,
      billing: true,
    },
  };
}

function getDefaultPermissions(role: string): object {
  const permissions: { [key: string]: any } = {
    super_admin: getAllPermissions(),
    wtfu_developer: {
      leads: { view: true, add: true, edit: true, delete: false, assign: true },
      users: { view: true, add: false, edit: false, delete: false },
      reports: { view: true, generate: true, export: true },
      clients: { view: true, add: false, edit: false, delete: false },
      seo: { basic: true, comprehensive: true },
      email: { send: true, templates: false },
    },
    wtfu_sales: {
      leads: { view: true, add: true, edit: true, delete: false, assign: false },
      users: { view: false, add: false, edit: false, delete: false },
      reports: { view: true, generate: false, export: true },
      clients: { view: true, add: false, edit: false, delete: false },
      seo: { basic: true, comprehensive: false },
      email: { send: true, templates: false },
    },
    wtfu_manager: {
      leads: { view: true, add: true, edit: true, delete: true, assign: true },
      users: { view: true, add: true, edit: true, delete: false },
      reports: { view: true, generate: true, export: true },
      clients: { view: true, add: false, edit: true, delete: false },
      seo: { basic: true, comprehensive: true },
      email: { send: true, templates: true },
    },
    wtfu_project_manager: {
      leads: { view: true, add: true, edit: true, delete: false, assign: true },
      users: { view: true, add: false, edit: false, delete: false },
      reports: { view: true, generate: true, export: true },
      clients: { view: true, add: false, edit: false, delete: false },
      seo: { basic: true, comprehensive: true },
      email: { send: true, templates: false },
    },
    client_admin: {
      leads: { view: true, add: false, edit: false, delete: false, assign: false },
      users: { view: true, add: true, edit: true, delete: false },
      reports: { view: true, generate: false, export: true },
      clients: { view: false, add: false, edit: false, delete: false },
      seo: { basic: false, comprehensive: false },
      email: { send: false, templates: false },
    },
    client_user: {
      leads: { view: true, add: false, edit: false, delete: false, assign: false },
      users: { view: false, add: false, edit: false, delete: false },
      reports: { view: true, generate: false, export: false },
      clients: { view: false, add: false, edit: false, delete: false },
      seo: { basic: false, comprehensive: false },
      email: { send: false, templates: false },
    },
  };

  return permissions[role] || permissions.client_user;
}

/**
 * Generate a random temporary password
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/users
 * Get all users (filtered by role and client)
 * - super_admin: see all users
 * - client_admin: see only their client's users
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    let query = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.team_type,
        u.client_id,
        u.permissions,
        u.is_active,
        u.last_login,
        u.must_change_password,
        u.created_at,
        u.created_by,
        c.username as created_by_name,
        cl.name as client_name
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      LEFT JOIN clients cl ON u.client_id = cl.id
    `;

    const params: any[] = [];

    // Filter by role
    if (user.role === 'client_admin' && user.client_id) {
      query += ` WHERE u.client_id = $1`;
      params.push(user.client_id);
    } else if (!['super_admin', 'wtfu_manager'].includes(user.role)) {
      // Non-admins can only see themselves
      query += ` WHERE u.id = $1`;
      params.push(user.id);
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    // Debug logging
    console.log('🔍 Users API Debug:');
    console.log('Query:', query);
    console.log('Params:', params);
    console.log('Result rows:', result.rows);

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: (error as Error).message });
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Build query with access control
    let query = `
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.team_type,
        u.client_id,
        u.permissions,
        u.is_active,
        u.last_login,
        u.must_change_password,
        u.created_at,
        u.updated_at,
        u.created_by,
        c.username as created_by_name,
        cl.name as client_name
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      LEFT JOIN clients cl ON u.client_id = cl.id
      WHERE u.id = $1
    `;

    // Access control
    if (user.role === 'client_admin' && user.client_id) {
      query += ` AND u.client_id = $2`;
      const result = await pool.query(query, [id, user.client_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(result.rows[0]);
    } else if (!['super_admin', 'wtfu_manager'].includes(user.role)) {
      // Can only view self
      if (parseInt(id) !== user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: (error as Error).message });
  }
});

/**
 * POST /api/users
 * Create a new user
 * Requires: admin or super_admin
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      role,
      team_type,
      client_id,
      permissions,
      is_active,
      must_change_password,
      send_welcome_email,
    } = req.body;

    const currentUser = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Validation
    if (!username || !email || !role) {
      return res.status(400).json({ message: 'Username, email, and role are required' });
    }

    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Generate temp password if not provided
    const tempPassword = password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Get default permissions for role if not provided
    const userPermissions = permissions || getDefaultPermissions(role);

    // Determine team_type if not provided
    let finalTeamType = team_type;
    if (!finalTeamType) {
      if (role.startsWith('wtfu_') || role === 'super_admin') {
        finalTeamType = 'wetechforu';
      } else if (role.startsWith('client_')) {
        finalTeamType = 'client';
      }
    }

    // Access control: client_admin can only create users for their own client
    let finalClientId = client_id;
    if (currentUser.role === 'client_admin') {
      if (client_id && client_id !== currentUser.client_id) {
        return res.status(403).json({ message: 'Cannot create users for other clients' });
      }
      finalClientId = currentUser.client_id;
    }

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (
        username, 
        email, 
        password_hash, 
        role, 
        team_type, 
        client_id, 
        permissions, 
        is_active, 
        must_change_password, 
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, username, email, role, team_type, client_id, permissions, is_active, must_change_password, created_at`,
      [
        username,
        email,
        hashedPassword,
        role,
        finalTeamType,
        finalClientId,
        JSON.stringify(userPermissions),
        is_active !== undefined ? is_active : true,
        must_change_password !== undefined ? must_change_password : true,
        currentUser.id,
      ]
    );

    const newUser = result.rows[0];

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        'user_created',
        'user',
        newUser.id,
        JSON.stringify({ username: newUser.username, role: newUser.role, email: newUser.email }),
      ]
    );

    // TODO: Send welcome email if requested
    if (send_welcome_email) {
      console.log(`📧 TODO: Send welcome email to ${email} with temp password: ${tempPassword}`);
    }

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
      tempPassword: tempPassword, // Return temp password for admin to share
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user', error: (error as Error).message });
  }
});

/**
 * PUT /api/users/:id
 * Update a user
 * Requires: admin or super_admin
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      role,
      team_type,
      client_id,
      permissions,
      is_active,
      must_change_password,
    } = req.body;

    const currentUser = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Get existing user
    const existingResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = existingResult.rows[0];

    // Access control
    if (currentUser.role === 'client_admin') {
      if (existingUser.client_id !== currentUser.client_id) {
        return res.status(403).json({ message: 'Cannot edit users from other clients' });
      }
      if (client_id && client_id !== currentUser.client_id) {
        return res.status(403).json({ message: 'Cannot assign users to other clients' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (team_type !== undefined) {
      updates.push(`team_type = $${paramIndex++}`);
      values.push(team_type);
    }
    if (client_id !== undefined) {
      updates.push(`client_id = $${paramIndex++}`);
      values.push(client_id);
    }
    if (permissions !== undefined) {
      updates.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(permissions));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }
    if (must_change_password !== undefined) {
      updates.push(`must_change_password = $${paramIndex++}`);
      values.push(must_change_password);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, username, email, role, team_type, client_id, permissions, is_active, must_change_password, updated_at`,
      values
    );

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        'user_updated',
        'user',
        id,
        JSON.stringify({ changes: req.body }),
      ]
    );

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user', error: (error as Error).message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 * Requires: super_admin or wtfu_manager
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Only super_admin and wtfu_manager can delete users
    if (!['super_admin', 'wtfu_manager'].includes(currentUser.role)) {
      return res.status(403).json({ message: 'Only super admins and managers can delete users' });
    }

    // Get existing user
    const existingResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cannot delete self
    if (parseInt(id) === currentUser.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        'user_deleted',
        'user',
        id,
        JSON.stringify({ username: existingResult.rows[0].username }),
      ]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user', error: (error as Error).message });
  }
});

/**
 * PATCH /api/users/:id/toggle-active
 * Toggle user active status
 * Requires: admin or super_admin
 */
router.patch('/:id/toggle-active', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Get existing user
    const existingResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = existingResult.rows[0];

    // Access control
    if (currentUser.role === 'client_admin' && existingUser.client_id !== currentUser.client_id) {
      return res.status(403).json({ message: 'Cannot modify users from other clients' });
    }

    // Cannot disable self
    if (parseInt(id) === currentUser.id) {
      return res.status(400).json({ message: 'Cannot disable your own account' });
    }

    // Toggle status
    const newStatus = !existingUser.is_active;
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, is_active',
      [newStatus, id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        newStatus ? 'user_activated' : 'user_deactivated',
        'user',
        id,
        JSON.stringify({ username: existingUser.username, new_status: newStatus }),
      ]
    );

    res.json({
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Failed to toggle user status', error: (error as Error).message });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password
 * Requires: admin or super_admin
 */
router.post('/:id/reset-password', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    const currentUser = {
      id: req.session.userId,
      role: req.session.role,
      client_id: req.session.clientId
    };

    // Get existing user
    const existingResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = existingResult.rows[0];

    // Access control
    if (currentUser.role === 'client_admin' && existingUser.client_id !== currentUser.client_id) {
      return res.status(403).json({ message: 'Cannot reset password for users from other clients' });
    }

    // Generate new password if not provided
    const newPassword = new_password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and force change on next login
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2',
      [hashedPassword, id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        currentUser.id,
        'password_reset',
        'user',
        id,
        JSON.stringify({ username: existingUser.username }),
      ]
    );

    res.json({
      message: 'Password reset successfully',
      tempPassword: newPassword, // Return temp password for admin to share
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: (error as Error).message });
  }
});

/**
 * GET /api/users/clients/list
 * Get list of clients for dropdown
 * Requires: auth
 */
router.get('/clients/list', requireAuth, async (req: Request, res: Response) => {
  try {
    // Get user info from session instead of req.user
    const currentUserRole = req.session.role;

    // Only super_admin and wtfu team can see all clients
    if (!['super_admin', 'wtfu_manager', 'wtfu_developer'].includes(currentUserRole || '')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT id, client_name as name, email, phone, contact_name as company, created_at FROM clients ORDER BY client_name ASC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Failed to fetch clients', error: (error as Error).message });
  }
});

/**
 * GET /api/users/permissions/defaults/:role
 * Get default permissions for a role
 * Requires: admin
 */
router.get('/permissions/defaults/:role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const permissions = getDefaultPermissions(role);

    res.json({
      role,
      permissions,
    });
  } catch (error) {
    console.error('Get default permissions error:', error);
    res.status(500).json({ message: 'Failed to fetch default permissions', error: (error as Error).message });
  }
});

/**
 * GET /api/users/permissions/all
 * Get all available permissions in the system
 * Requires: admin
 */
router.get('/permissions/all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const allPermissions = getAllPermissions();

    res.json({
      success: true,
      permissions: allPermissions,
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ message: 'Failed to fetch permissions', error: (error as Error).message });
  }
});

export default router;

