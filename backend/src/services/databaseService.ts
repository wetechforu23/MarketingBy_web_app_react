import pool from '../config/database';

export { pool };

export interface Lead {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry_category_id?: number;
  industry_subcategory_id?: number;
  source?: string;
  status?: string;
  notes?: string;
  website_url?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  compliance_status?: string;
  seo_analysis?: any;
  seo_report?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id?: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  industry_category_id?: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SEOAudit {
  id?: number;
  client_id?: number;
  lead_id?: number;
  website_url: string;
  audit_type?: string;
  score?: number;
  technical_seo?: any;
  content_analysis?: any;
  performance_metrics?: any;
  accessibility_metrics?: any;
  recommendations?: any;
  status?: string;
  created_at?: string;
}

export interface APIUsage {
  id?: number;
  client_id?: number;
  api_name: string;
  endpoint?: string;
  request_count?: number;
  cost?: number;
  usage_date?: string;
  created_at?: string;
}

export class DatabaseService {
  private static instance: DatabaseService;

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Lead operations
  async createLead(lead: Lead): Promise<Lead> {
    const query = `
      INSERT INTO leads (
        clinic_name, contact_email, contact_phone, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status, lead_source, status, notes,
        industry_category, industry_subcategory
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    
    const values = [
      lead.name || lead.company, lead.email, lead.phone, lead.website_url, 
      lead.address, lead.city, lead.state, lead.zip_code,
      lead.contact_first_name, lead.contact_last_name, lead.compliance_status || 'pending',
      lead.source || 'Website Scraping', lead.status || 'new', lead.notes,
      lead.industry_category || 'Healthcare', lead.industry_subcategory
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getLeads(): Promise<Lead[]> {
    const query = 'SELECT * FROM leads ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  async getLeadById(id: number): Promise<Lead | null> {
    const query = 'SELECT * FROM leads WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateLead(id: number, lead: Partial<Lead>): Promise<Lead | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(lead)) {
      if (key === 'seo_analysis' && value) {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
      paramCount++;
    }

    if (fields.length === 0) {
      return this.getLeadById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE leads SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteLead(id: number): Promise<boolean> {
    const query = 'DELETE FROM leads WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async deleteAllLeads(): Promise<number> {
    const query = 'DELETE FROM leads';
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  // Client operations
  async createClient(client: Client): Promise<Client> {
    const query = `
      INSERT INTO clients (name, email, phone, company, industry_category_id, address, city, state, zip_code, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      client.name, client.email, client.phone, client.company, client.industry_category_id,
      client.address, client.city, client.state, client.zip_code, client.status || 'active'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getClients(): Promise<Client[]> {
    const query = 'SELECT * FROM clients ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  async getClientById(id: number): Promise<Client | null> {
    const query = 'SELECT * FROM clients WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // SEO Audit operations
  async createSEOAudit(audit: SEOAudit): Promise<SEOAudit> {
    const query = `
      INSERT INTO seo_audits (
        client_id, lead_id, website_url, audit_type, score,
        technical_seo, content_analysis, performance_metrics,
        accessibility_metrics, recommendations, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      audit.client_id, audit.lead_id, audit.website_url, audit.audit_type || 'comprehensive',
      audit.score, audit.technical_seo ? JSON.stringify(audit.technical_seo) : null,
      audit.content_analysis ? JSON.stringify(audit.content_analysis) : null,
      audit.performance_metrics ? JSON.stringify(audit.performance_metrics) : null,
      audit.accessibility_metrics ? JSON.stringify(audit.accessibility_metrics) : null,
      audit.recommendations ? JSON.stringify(audit.recommendations) : null,
      audit.status || 'completed'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getSEOAuditByLeadId(leadId: number): Promise<SEOAudit | null> {
    const query = 'SELECT * FROM seo_audits WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query, [leadId]);
    return result.rows[0] || null;
  }

  // API Usage tracking
  async trackAPIUsage(usage: APIUsage): Promise<APIUsage> {
    const query = `
      INSERT INTO api_usage (project_id, api_name, api_endpoint, request_count, cost_per_request, total_cost, usage_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      usage.client_id || 1, usage.api_name, usage.endpoint,
      usage.request_count || 1, usage.cost || 0, (usage.cost || 0) * (usage.request_count || 1), 
      usage.usage_date || new Date().toISOString().split('T')[0]
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getAPIUsageByClient(clientId: number, date?: string): Promise<APIUsage[]> {
    let query = 'SELECT * FROM api_usage WHERE project_id = $1';
    const values = [clientId];
    
    if (date) {
      query += ' AND usage_date = $2';
      values.push(date);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Platform settings
  async getPlatformSettings(): Promise<Record<string, any>> {
    const query = 'SELECT setting_key, setting_value FROM platform_settings';
    const result = await pool.query(query);
    
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      try {
        settings[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    });
    
    // Return the expected structure for the frontend
    return {
      flags: {
        enableComplianceChecks: settings.enable_compliance_checks || true,
        enableFreeSEOAnalysis: settings.enable_free_seo_analysis || true,
        enableEmailSender: settings.enable_email_sender || false
      },
      userAccess: {
        admins: settings.admin_emails ? settings.admin_emails.split(',') : ['admin@wetechforu.com'],
        roles: {
          admin: ['all'],
          user: ['leads', 'seo', 'calendar']
        }
      },
      compliance: {
        defaultState: settings.default_state || 'CA',
        restrictedActions: settings.restricted_actions ? settings.restricted_actions.split(',') : ['scrape', 'email'],
        healthcareCompliance: {
          hipaaCompliant: settings.hipaa_compliant || false,
          stateRegulations: settings.state_regulations ? (typeof settings.state_regulations === 'string' ? JSON.parse(settings.state_regulations) : settings.state_regulations) : {},
          dataRetentionDays: settings.data_retention_days || 2555, // 7 years default
          auditLogging: settings.audit_logging || true
        },
        marketingCompliance: {
          canSpamAct: settings.can_spam_act || true,
          tcpCompliant: settings.tcp_compliant || true,
          gdprCompliant: settings.gdpr_compliant || false,
          ccpaCompliant: settings.ccpa_compliant || false
        }
      }
    };
  }

  async updatePlatformSettings(settings: Record<string, any>): Promise<void> {
    // Handle the nested structure from frontend
    const flatSettings: Record<string, any> = {};
    
    if (settings.flags) {
      flatSettings.enable_compliance_checks = settings.flags.enableComplianceChecks;
      flatSettings.enable_free_seo_analysis = settings.flags.enableFreeSEOAnalysis;
      flatSettings.enable_email_sender = settings.flags.enableEmailSender;
    }
    
    if (settings.userAccess) {
      flatSettings.admin_emails = settings.userAccess.admins.join(',');
    }
    
    if (settings.compliance) {
      flatSettings.default_state = settings.compliance.defaultState;
      flatSettings.restricted_actions = settings.compliance.restrictedActions.join(',');
      
      // Healthcare compliance settings
      if (settings.compliance.healthcareCompliance) {
        flatSettings.hipaa_compliant = settings.compliance.healthcareCompliance.hipaaCompliant;
        flatSettings.state_regulations = JSON.stringify(settings.compliance.healthcareCompliance.stateRegulations);
        flatSettings.data_retention_days = settings.compliance.healthcareCompliance.dataRetentionDays;
        flatSettings.audit_logging = settings.compliance.healthcareCompliance.auditLogging;
      }
      
      // Marketing compliance settings
      if (settings.compliance.marketingCompliance) {
        flatSettings.can_spam_act = settings.compliance.marketingCompliance.canSpamAct;
        flatSettings.tcp_compliant = settings.compliance.marketingCompliance.tcpCompliant;
        flatSettings.gdpr_compliant = settings.compliance.marketingCompliance.gdprCompliant;
        flatSettings.ccpa_compliant = settings.compliance.marketingCompliance.ccpaCompliant;
      }
    }
    
    for (const [key, value] of Object.entries(flatSettings)) {
      const query = `
        INSERT INTO platform_settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `;
      await pool.query(query, [key, JSON.stringify(value)]);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
