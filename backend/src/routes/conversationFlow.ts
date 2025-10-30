import express, { Request, Response } from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ==========================================
// CONVERSATION FLOW API ROUTES
// ==========================================
// Manage configurable conversation flows
// ==========================================

// ==========================================
// GET /api/widgets/:id/flow
// Get conversation flow for a widget
// ==========================================

router.get('/widgets/:id/flow', requireAuth, async (req: Request, res: Response) => {
  try {
    const widgetId = parseInt(req.params.id);
    const userId = req.session.userId;
    const userRole = req.session.role;
    const userClientId = req.session.clientId;

    // Fetch user to check admin status
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Check if user has access to this widget
    const widgetCheck = await pool.query(
      `SELECT w.*, c.id as client_id
       FROM widget_configs w
       JOIN clients c ON w.client_id = c.id
       WHERE w.id = $1`,
      [widgetId]
    );

    if (widgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetCheck.rows[0];

    // Check permissions (super admin or widget owner)
    if (!isAdmin && userClientId !== widget.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get conversation flow
    const result = await pool.query(
      'SELECT conversation_flow FROM widget_configs WHERE id = $1',
      [widgetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const conversationFlow = result.rows[0].conversation_flow || [];

    res.json({
      widget_id: widgetId,
      conversation_flow: conversationFlow
    });

  } catch (error) {
    console.error('Error fetching conversation flow:', error);
    res.status(500).json({ error: 'Failed to fetch conversation flow' });
  }
});

// ==========================================
// PUT /api/widgets/:id/flow
// Update conversation flow for a widget
// ==========================================

router.put('/widgets/:id/flow', requireAuth, async (req: Request, res: Response) => {
  try {
    const widgetId = parseInt(req.params.id);
    const userId = req.session.userId;
    const userClientId = req.session.clientId;
    const { conversation_flow } = req.body;

    if (!conversation_flow || !Array.isArray(conversation_flow)) {
      return res.status(400).json({ error: 'conversation_flow must be an array' });
    }

    // Fetch user to check admin status
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Check if user has access to this widget
    const widgetCheck = await pool.query(
      `SELECT w.*, c.id as client_id
       FROM widget_configs w
       JOIN clients c ON w.client_id = c.id
       WHERE w.id = $1`,
      [widgetId]
    );

    if (widgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetCheck.rows[0];

    // Check permissions (super admin or widget owner)
    if (!isAdmin && userClientId !== widget.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate flow structure
    const validation = validateConversationFlow(conversation_flow);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Update conversation flow
    await pool.query(
      `UPDATE widget_configs 
       SET conversation_flow = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(conversation_flow), widgetId]
    );

    res.json({
      success: true,
      message: 'Conversation flow updated successfully',
      conversation_flow
    });

  } catch (error) {
    console.error('Error updating conversation flow:', error);
    res.status(500).json({ error: 'Failed to update conversation flow' });
  }
});

// ==========================================
// GET /api/widgets/:id/flow/analytics
// Get flow performance analytics
// ==========================================

router.get('/widgets/:id/flow/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const widgetId = parseInt(req.params.id);
    const userId = req.session.userId;
    const userClientId = req.session.clientId;
    const { period = '7d' } = req.query;

    // Fetch user to check admin status
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Calculate date range
    let dateFilter = "created_at > NOW() - INTERVAL '7 days'";
    if (period === '30d') dateFilter = "created_at > NOW() - INTERVAL '30 days'";
    if (period === '90d') dateFilter = "created_at > NOW() - INTERVAL '90 days'";

    // Check if user has access to this widget
    const widgetCheck = await pool.query(
      `SELECT w.*, c.id as client_id
       FROM widget_configs w
       JOIN clients c ON w.client_id = c.id
       WHERE w.id = $1`,
      [widgetId]
    );

    if (widgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetCheck.rows[0];

    // Check permissions
    if (!isAdmin && userClientId !== widget.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get analytics
    const analyticsQuery = `
      SELECT 
        step_type,
        COUNT(*) as total_executions,
        SUM(CASE WHEN resolved = true THEN 1 ELSE 0 END) as resolved_count,
        ROUND(AVG(confidence_score), 2) as avg_confidence,
        SUM(tokens_used) as total_tokens,
        SUM(estimated_cost) as total_cost,
        ROUND(AVG(response_time_ms)) as avg_response_time_ms
      FROM conversation_flow_analytics
      WHERE widget_id = $1
        AND ${dateFilter}
      GROUP BY step_type
      ORDER BY step_type
    `;

    const analyticsResult = await pool.query(analyticsQuery, [widgetId]);

    // Calculate overall stats
    const overallQuery = `
      SELECT 
        COUNT(DISTINCT conversation_id) as total_conversations,
        SUM(estimated_cost) as total_cost,
        SUM(tokens_used) as total_tokens
      FROM conversation_flow_analytics
      WHERE widget_id = $1
        AND ${dateFilter}
    `;

    const overallResult = await pool.query(overallQuery, [widgetId]);
    const overall = overallResult.rows[0];

    // Calculate resolution rates
    const stepAnalytics = analyticsResult.rows;
    const kbResolved = stepAnalytics.find((s: any) => s.step_type === 'knowledge_base')?.resolved_count || 0;
    const aiResolved = stepAnalytics.find((s: any) => s.step_type === 'ai_response')?.resolved_count || 0;
    const agentHandoffs = stepAnalytics.find((s: any) => s.step_type === 'agent_handoff')?.total_executions || 0;

    const totalConversations = parseInt(overall.total_conversations) || 1; // Avoid division by zero

    res.json({
      period,
      overall: {
        total_conversations: parseInt(overall.total_conversations) || 0,
        total_cost: parseFloat(overall.total_cost) || 0,
        total_tokens: parseInt(overall.total_tokens) || 0
      },
      by_step: stepAnalytics,
      resolution_rates: {
        knowledge_base: Math.round((kbResolved / totalConversations) * 100),
        ai_response: Math.round((aiResolved / totalConversations) * 100),
        agent_handoff: Math.round((agentHandoffs / totalConversations) * 100)
      },
      cost_efficiency: {
        free_resolutions: kbResolved,
        paid_resolutions: aiResolved,
        avg_cost_per_conversation: parseFloat(overall.total_cost) / totalConversations || 0
      }
    });

  } catch (error) {
    console.error('Error fetching flow analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==========================================
// POST /api/widgets/:id/flow/reset
// Reset to default flow
// ==========================================

router.post('/widgets/:id/flow/reset', requireAuth, async (req: Request, res: Response) => {
  try {
    const widgetId = parseInt(req.params.id);
    const userId = req.session.userId;
    const userClientId = req.session.clientId;

    // Fetch user to check admin status
    const userResult = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const isAdmin = userResult.rows[0]?.is_admin || false;

    // Check if user has access to this widget
    const widgetCheck = await pool.query(
      `SELECT w.*, c.id as client_id
       FROM widget_configs w
       JOIN clients c ON w.client_id = c.id
       WHERE w.id = $1`,
      [widgetId]
    );

    if (widgetCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const widget = widgetCheck.rows[0];

    // Check permissions
    if (!isAdmin && userClientId !== widget.client_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Reset to default flow
    const defaultFlow = [
      {
        id: 1,
        type: 'greeting',
        order: 1,
        locked: true,
        enabled: true,
        removable: false,
        settings: {
          message: 'Hi! 👋 How can I help you today?'
        }
      },
      {
        id: 2,
        type: 'knowledge_base',
        order: 2,
        locked: false,
        enabled: true,
        removable: false,
        settings: {
          min_confidence: 0.7,
          max_results: 3,
          show_similar: true,
          fallback_message: 'I couldn\'t find an exact answer, but here are some similar topics...'
        }
      },
      {
        id: 3,
        type: 'ai_response',
        order: 3,
        locked: false,
        enabled: true,
        removable: true,
        settings: {
          fallback_message: 'Let me connect you with our team for personalized assistance...',
          max_attempts: 1
        }
      },
      {
        id: 4,
        type: 'agent_handoff',
        order: 4,
        locked: true,
        enabled: true,
        removable: false,
        settings: {
          collect_contact_info: true,
          offline_message: 'Our team is currently offline. Please leave your details and we\'ll get back to you soon.',
          online_message: 'Let me connect you with a live agent...'
        }
      }
    ];

    await pool.query(
      `UPDATE widget_configs 
       SET conversation_flow = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(defaultFlow), widgetId]
    );

    res.json({
      success: true,
      message: 'Conversation flow reset to default',
      conversation_flow: defaultFlow
    });

  } catch (error) {
    console.error('Error resetting conversation flow:', error);
    res.status(500).json({ error: 'Failed to reset conversation flow' });
  }
});

// ==========================================
// VALIDATION HELPER
// ==========================================

function validateConversationFlow(flow: any[]): { valid: boolean; error?: string } {
  // Check for greeting (must be first and locked)
  const greeting = flow.find((s: any) => s.type === 'greeting');
  if (!greeting) {
    return { valid: false, error: 'Flow must include a greeting step' };
  }
  if (greeting.order !== 1 || !greeting.locked) {
    return { valid: false, error: 'Greeting must be first and locked' };
  }

  // Check for agent_handoff (must be last and locked)
  const agentHandoff = flow.find((s: any) => s.type === 'agent_handoff');
  if (!agentHandoff) {
    return { valid: false, error: 'Flow must include an agent handoff step' };
  }
  const maxOrder = Math.max(...flow.map((s: any) => s.order));
  if (agentHandoff.order !== maxOrder || !agentHandoff.locked) {
    return { valid: false, error: 'Agent handoff must be last and locked' };
  }

  // Check for knowledge_base (required)
  const kb = flow.find((s: any) => s.type === 'knowledge_base');
  if (!kb) {
    return { valid: false, error: 'Flow must include a knowledge base step' };
  }

  // Check for duplicate orders
  const orders = flow.map((s: any) => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    return { valid: false, error: 'Flow steps must have unique order values' };
  }

  // Validate each step has required fields
  for (const step of flow) {
    if (!step.id || !step.type || step.order === undefined) {
      return { valid: false, error: 'Each step must have id, type, and order' };
    }
    if (step.locked === undefined || step.enabled === undefined || step.removable === undefined) {
      return { valid: false, error: 'Each step must have locked, enabled, and removable properties' };
    }
  }

  return { valid: true };
}

export default router;

