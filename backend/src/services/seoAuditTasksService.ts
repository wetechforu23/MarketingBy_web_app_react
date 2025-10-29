import { pool } from './databaseService';

export interface SEOAuditTask {
  id: number;
  lead_id: number;
  task_category: string;
  task_priority: string;
  task_title: string;
  task_description: string;
  task_status: string;
  assigned_to?: string;
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  completion_notes?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface CreateTaskData {
  lead_id: number;
  task_category: string;
  task_priority: string;
  task_title: string;
  task_description: string;
  estimated_hours?: number;
  assigned_to?: string;
  due_date?: Date;
}

export interface UpdateTaskData {
  task_status?: string;
  assigned_to?: string;
  due_date?: Date;
  actual_hours?: number;
  completion_notes?: string;
  completed_at?: Date;
}

export class SEOAuditTasksService {
  private static instance: SEOAuditTasksService;

  public static getInstance(): SEOAuditTasksService {
    if (!SEOAuditTasksService.instance) {
      SEOAuditTasksService.instance = new SEOAuditTasksService();
    }
    return SEOAuditTasksService.instance;
  }

  /**
   * Get all SEO audit tasks for a specific lead
   */
  async getTasksByLeadId(leadId: number): Promise<SEOAuditTask[]> {
    try {
      const query = `
        SELECT * FROM seo_audit_tasks 
        WHERE lead_id = $1 
        ORDER BY 
          CASE task_priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          created_at ASC
      `;
      const result = await pool.query(query, [leadId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching SEO audit tasks:', error);
      throw error;
    }
  }

  /**
   * Get all tasks grouped by category for a lead
   */
  async getTasksByCategory(leadId: number): Promise<{[key: string]: SEOAuditTask[]}> {
    try {
      const tasks = await this.getTasksByLeadId(leadId);
      const grouped: {[key: string]: SEOAuditTask[]} = {};
      
      tasks.forEach(task => {
        if (!grouped[task.task_category]) {
          grouped[task.task_category] = [];
        }
        grouped[task.task_category].push(task);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error grouping SEO audit tasks:', error);
      throw error;
    }
  }

  /**
   * Create a new SEO audit task
   */
  async createTask(taskData: CreateTaskData): Promise<SEOAuditTask> {
    try {
      const query = `
        INSERT INTO seo_audit_tasks 
        (lead_id, task_category, task_priority, task_title, task_description, estimated_hours, assigned_to, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        taskData.lead_id,
        taskData.task_category,
        taskData.task_priority,
        taskData.task_title,
        taskData.task_description,
        taskData.estimated_hours || null,
        taskData.assigned_to || null,
        taskData.due_date || null
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating SEO audit task:', error);
      throw error;
    }
  }

  /**
   * Update an existing SEO audit task
   */
  async updateTask(taskId: number, updateData: UpdateTaskData): Promise<SEOAuditTask> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `
        UPDATE seo_audit_tasks 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      values.push(taskId);

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating SEO audit task:', error);
      throw error;
    }
  }

  /**
   * Delete a SEO audit task
   */
  async deleteTask(taskId: number): Promise<boolean> {
    try {
      const query = 'DELETE FROM seo_audit_tasks WHERE id = $1';
      const result = await pool.query(query, [taskId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting SEO audit task:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for a lead
   */
  async getTaskStatistics(leadId: number): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    by_priority: {[key: string]: number};
    by_category: {[key: string]: number};
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN task_status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN task_status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN task_status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN task_status = 'cancelled' THEN 1 END) as cancelled
        FROM seo_audit_tasks 
        WHERE lead_id = $1
      `;
      
      const result = await pool.query(query, [leadId]);
      const stats = result.rows[0];

      // Get priority breakdown
      const priorityQuery = `
        SELECT task_priority, COUNT(*) as count
        FROM seo_audit_tasks 
        WHERE lead_id = $1
        GROUP BY task_priority
      `;
      const priorityResult = await pool.query(priorityQuery, [leadId]);
      const by_priority: {[key: string]: number} = {};
      priorityResult.rows.forEach(row => {
        by_priority[row.task_priority] = parseInt(row.count);
      });

      // Get category breakdown
      const categoryQuery = `
        SELECT task_category, COUNT(*) as count
        FROM seo_audit_tasks 
        WHERE lead_id = $1
        GROUP BY task_category
      `;
      const categoryResult = await pool.query(categoryQuery, [leadId]);
      const by_category: {[key: string]: number} = {};
      categoryResult.rows.forEach(row => {
        by_category[row.task_category] = parseInt(row.count);
      });

      return {
        total: parseInt(stats.total),
        pending: parseInt(stats.pending),
        in_progress: parseInt(stats.in_progress),
        completed: parseInt(stats.completed),
        cancelled: parseInt(stats.cancelled),
        by_priority,
        by_category
      };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }

  /**
   * Create default SEO audit tasks for a lead based on their website analysis
   */
  async createDefaultTasksForLead(leadId: number, websiteUrl: string, clinicName: string): Promise<SEOAuditTask[]> {
    try {
      // Check if tasks already exist for this lead
      const existingTasks = await this.getTasksByLeadId(leadId);
      if (existingTasks.length > 0) {
        console.log(`📋 Tasks already exist for lead ${leadId}, skipping creation`);
        return existingTasks;
      }
      const defaultTasks: CreateTaskData[] = [
        // Immediate Fixes
        {
          lead_id: leadId,
          task_category: 'immediate_fixes',
          task_priority: 'critical',
          task_title: 'Fix Meta Tags',
          task_description: `Fix incomplete or missing meta description and keywords tags for ${clinicName}`,
          estimated_hours: 2.0
        },
        {
          lead_id: leadId,
          task_category: 'immediate_fixes',
          task_priority: 'high',
          task_title: 'Optimize Title Tag',
          task_description: `Optimize title tag for better SEO performance and click-through rates`,
          estimated_hours: 1.0
        },
        {
          lead_id: leadId,
          task_category: 'immediate_fixes',
          task_priority: 'high',
          task_title: 'Add Schema Markup',
          task_description: `Implement MedicalClinic schema markup for better search visibility`,
          estimated_hours: 3.0
        },
        {
          lead_id: leadId,
          task_category: 'immediate_fixes',
          task_priority: 'medium',
          task_title: 'Server Optimization',
          task_description: `Optimize server configuration for better speed and performance`,
          estimated_hours: 4.0
        },

        // High Impact Improvements
        {
          lead_id: leadId,
          task_category: 'high_impact',
          task_priority: 'high',
          task_title: 'Local SEO Optimization',
          task_description: `Optimize for local search terms and improve local visibility`,
          estimated_hours: 4.0
        },
        {
          lead_id: leadId,
          task_category: 'high_impact',
          task_priority: 'medium',
          task_title: 'Google My Business Setup',
          task_description: `Set up and optimize Google My Business profile`,
          estimated_hours: 2.0
        },
        {
          lead_id: leadId,
          task_category: 'high_impact',
          task_priority: 'medium',
          task_title: 'Local Directory Listings',
          task_description: `Get listed in relevant local healthcare directories`,
          estimated_hours: 3.0
        },

        // Growth Opportunities
        {
          lead_id: leadId,
          task_category: 'growth_opportunities',
          task_priority: 'medium',
          task_title: 'Content Marketing Strategy',
          task_description: `Create blog posts and content to establish authority`,
          estimated_hours: 8.0
        },
        {
          lead_id: leadId,
          task_category: 'growth_opportunities',
          task_priority: 'medium',
          task_title: 'Service Pages Creation',
          task_description: `Create dedicated pages for each service offered`,
          estimated_hours: 6.0
        },
        {
          lead_id: leadId,
          task_category: 'growth_opportunities',
          task_priority: 'low',
          task_title: 'Patient Testimonials',
          task_description: `Collect and display patient reviews and testimonials`,
          estimated_hours: 4.0
        },

        // Competitive Advantages
        {
          lead_id: leadId,
          task_category: 'competitive_advantages',
          task_priority: 'medium',
          task_title: 'Unique Positioning',
          task_description: `Emphasize unique aspects of the practice in marketing`,
          estimated_hours: 3.0
        },
        {
          lead_id: leadId,
          task_category: 'competitive_advantages',
          task_priority: 'low',
          task_title: 'Technology Features',
          task_description: `Showcase modern technology and convenience features`,
          estimated_hours: 2.0
        }
      ];

      const createdTasks: SEOAuditTask[] = [];
      for (const taskData of defaultTasks) {
        const task = await this.createTask(taskData);
        createdTasks.push(task);
      }

      return createdTasks;
    } catch (error) {
      console.error('Error creating default tasks for lead:', error);
      throw error;
    }
  }
}
