/**
 * Lead Tasks API Routes
 * Manages action items, sales pitches, and work tasks for leads
 */

import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/tasks/lead/:leadId
 * Get all tasks for a specific lead
 */
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { status, type, category } = req.query;

    let query = `
      SELECT t.*, u.username as created_by_name
      FROM lead_tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.lead_id = $1
    `;
    const params: any[] = [leadId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (type) {
      paramCount++;
      query += ` AND t.task_type = $${paramCount}`;
      params.push(type);
    }

    if (category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      params.push(category);
    }

    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.due_date ASC NULLS LAST,
      t.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lead tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      lead_id,
      task_type,
      category,
      title,
      description,
      priority = 'medium',
      sales_pitch,
      technical_details,
      estimated_hours,
      estimated_cost,
      assigned_to,
      due_date
    } = req.body;

    const userId = (req as any).user?.id;

    const result = await pool.query(
      `INSERT INTO lead_tasks (
        lead_id, task_type, category, title, description, priority,
        sales_pitch, technical_details, estimated_hours, estimated_cost,
        assigned_to, due_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        lead_id, task_type, category, title, description, priority,
        sales_pitch, technical_details, estimated_hours, estimated_cost,
        assigned_to, due_date, userId
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      status,
      title,
      description,
      priority,
      sales_pitch,
      technical_details,
      estimated_hours,
      estimated_cost,
      actual_hours,
      actual_cost,
      assigned_to,
      due_date,
      notes
    } = req.body;

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
      
      // If status is completed, set completed_at
      if (status === 'completed') {
        updateFields.push(`completed_at = NOW()`);
      }
    }

    if (title) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (priority) {
      updateFields.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (sales_pitch !== undefined) {
      updateFields.push(`sales_pitch = $${paramCount}`);
      values.push(sales_pitch);
      paramCount++;
    }

    if (technical_details !== undefined) {
      updateFields.push(`technical_details = $${paramCount}`);
      values.push(technical_details);
      paramCount++;
    }

    if (estimated_hours !== undefined) {
      updateFields.push(`estimated_hours = $${paramCount}`);
      values.push(estimated_hours);
      paramCount++;
    }

    if (estimated_cost !== undefined) {
      updateFields.push(`estimated_cost = $${paramCount}`);
      values.push(estimated_cost);
      paramCount++;
    }

    if (actual_hours !== undefined) {
      updateFields.push(`actual_hours = $${paramCount}`);
      values.push(actual_hours);
      paramCount++;
    }

    if (actual_cost !== undefined) {
      updateFields.push(`actual_cost = $${paramCount}`);
      values.push(actual_cost);
      paramCount++;
    }

    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    if (due_date !== undefined) {
      updateFields.push(`due_date = $${paramCount}`);
      values.push(due_date);
      paramCount++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    updateFields.push(`updated_at = NOW()`);

    values.push(id);
    const query = `UPDATE lead_tasks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM lead_tasks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * POST /api/tasks/generate-from-seo/:leadId
 * Auto-generate tasks from SEO report findings
 */
router.post('/generate-from-seo/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { seoReport } = req.body;

    const userId = (req as any).user?.id;
    const tasks: any[] = [];

    // Critical issues become critical tasks
    if (seoReport.detailedPageAnalysis?.allIssuesByPage) {
      const criticalIssues = seoReport.detailedPageAnalysis.allIssuesByPage
        .filter((issue: any) => issue.severity === 'high');

      for (const issue of criticalIssues.slice(0, 10)) { // Limit to 10 tasks
        tasks.push({
          lead_id: leadId,
          task_type: 'work_item',
          category: issue.category || 'seo',
          title: issue.issue,
          description: `Page: ${issue.page}\nURL: ${issue.url}`,
          priority: 'critical',
          sales_pitch: `We found a critical SEO issue on your "${issue.page}" page: ${issue.issue}. This is hurting your search rankings right now.`,
          technical_details: issue.recommendation,
          estimated_hours: 1.5,
          estimated_cost: 150,
          created_by: userId
        });
      }
    }

    // Broken links become high priority tasks
    if (seoReport.detailedPageAnalysis?.allBrokenLinksByPage) {
      const brokenLinks = seoReport.detailedPageAnalysis.allBrokenLinksByPage.slice(0, 5);

      if (brokenLinks.length > 0) {
        tasks.push({
          lead_id: leadId,
          task_type: 'work_item',
          category: 'technical',
          title: `Fix ${brokenLinks.length} Broken Links`,
          description: brokenLinks.map((link: any) => 
            `• ${link.brokenUrl} (found on ${link.foundOnPage})`
          ).join('\n'),
          priority: 'high',
          sales_pitch: `We found ${brokenLinks.length} broken links on your website. These hurt user experience and SEO. We can fix all of them.`,
          technical_details: 'Review each broken link, either fix the destination URL or remove the link.',
          estimated_hours: brokenLinks.length * 0.5,
          estimated_cost: brokenLinks.length * 50,
          created_by: userId
        });
      }
    }

    // Missing social media
    if (seoReport.enhancedData?.socialMedia) {
      const social = seoReport.enhancedData.socialMedia;
      const missingSocial: string[] = [];
      
      if (!social.facebook) missingSocial.push('Facebook');
      if (!social.linkedin) missingSocial.push('LinkedIn');
      if (!social.instagram) missingSocial.push('Instagram');

      if (missingSocial.length > 0) {
        tasks.push({
          lead_id: leadId,
          task_type: 'sales_pitch',
          category: 'social_media',
          title: `Add Social Media Profiles (${missingSocial.join(', ')})`,
          description: `No ${missingSocial.join(', ')} links detected on website`,
          priority: 'medium',
          sales_pitch: `We noticed your website doesn't link to ${missingSocial.join(', ')}. Adding social media links builds trust and improves SEO. Patients expect to see social proof!`,
          technical_details: 'Add social media icon links in footer or header, ensure profiles are active',
          estimated_hours: 2,
          estimated_cost: 200,
          created_by: userId
        });
      }
    }

    // Insert all generated tasks
    if (tasks.length > 0) {
      for (const task of tasks) {
        await pool.query(
          `INSERT INTO lead_tasks (
            lead_id, task_type, category, title, description, priority,
            sales_pitch, technical_details, estimated_hours, estimated_cost, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            task.lead_id, task.task_type, task.category, task.title, task.description,
            task.priority, task.sales_pitch, task.technical_details,
            task.estimated_hours, task.estimated_cost, task.created_by
          ]
        );
      }
    }

    res.json({ message: `Generated ${tasks.length} tasks from SEO report`, tasksCreated: tasks.length });
  } catch (error) {
    console.error('Error generating tasks from SEO:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

export default router;

