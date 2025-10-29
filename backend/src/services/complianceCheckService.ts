import pool from '../config/database';

export interface ComplianceSettings {
  id: number;
  state: string;
  enable_website_scraping: boolean;
  enable_zipcode_scraping: boolean;
  enable_email_marketing: boolean;
  enable_calendar_booking: boolean;
  require_opt_in: boolean;
  require_privacy_policy: boolean;
  require_terms_of_service: boolean;
  max_emails_per_day: number;
  max_emails_per_lead: number;
  email_frequency_limit: number;
  require_unsubscribe_link: boolean;
  require_physical_address: boolean;
  require_business_license: boolean;
  require_hipaa_compliance: boolean;
  require_texas_healthcare_license: boolean;
  require_fda_compliance: boolean;
  require_ada_compliance: boolean;
  require_ccpa_compliance: boolean;
  require_gdpr_compliance: boolean;
  allow_automated_calls: boolean;
  allow_text_messages: boolean;
  allow_voicemail: boolean;
  call_time_restrictions: string;
  text_time_restrictions: string;
  require_do_not_call_registry_check: boolean;
  require_lead_source_disclosure: boolean;
  require_contact_method_preference: boolean;
  require_consent_documentation: boolean;
  require_data_retention_policy: boolean;
  require_breach_notification: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  state: string;
  allowedActions: string[];
  restrictions: string[];
  warnings: string[];
  errors: string[];
}

export class ComplianceCheckService {
  private static instance: ComplianceCheckService;
  private complianceSettings: Map<string, ComplianceSettings> = new Map();

  private constructor() {}

  public static getInstance(): ComplianceCheckService {
    if (!ComplianceCheckService.instance) {
      ComplianceCheckService.instance = new ComplianceCheckService();
    }
    return ComplianceCheckService.instance;
  }

  async loadComplianceSettings(): Promise<void> {
    try {
      const result = await pool.query('SELECT * FROM compliance_settings ORDER BY state');
      this.complianceSettings.clear();
      
      result.rows.forEach((setting: ComplianceSettings) => {
        this.complianceSettings.set(setting.state, setting);
      });
      
      console.log(`Loaded compliance settings for ${result.rows.length} states`);
    } catch (error) {
      console.error('Error loading compliance settings:', error);
      // Set default Texas compliance settings
      this.setDefaultTexasSettings();
    }
  }

  private setDefaultTexasSettings(): void {
    const defaultTexasSettings: ComplianceSettings = {
      id: 1,
      state: 'Texas',
      enable_website_scraping: true,
      enable_zipcode_scraping: true,
      enable_email_marketing: true,
      enable_calendar_booking: true,
      require_opt_in: true,
      require_privacy_policy: true,
      require_terms_of_service: true,
      max_emails_per_day: 100,
      max_emails_per_lead: 5,
      email_frequency_limit: 7, // days
      require_unsubscribe_link: true,
      require_physical_address: true,
      require_business_license: true,
      require_hipaa_compliance: true,
      require_texas_healthcare_license: true,
      require_fda_compliance: true,
      require_ada_compliance: true,
      require_ccpa_compliance: false,
      require_gdpr_compliance: false,
      allow_automated_calls: false,
      allow_text_messages: true,
      allow_voicemail: true,
      call_time_restrictions: '8:00 AM - 8:00 PM CST',
      text_time_restrictions: '8:00 AM - 9:00 PM CST',
      require_do_not_call_registry_check: true,
      require_lead_source_disclosure: true,
      require_contact_method_preference: true,
      require_consent_documentation: true,
      require_data_retention_policy: true,
      require_breach_notification: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.complianceSettings.set('Texas', defaultTexasSettings);
    console.log('Set default Texas compliance settings');
  }

  async checkComplianceForAction(
    action: 'website_scraping' | 'zipcode_scraping' | 'email_marketing' | 'calendar_booking',
    state: string = 'Texas',
    additionalData?: any
  ): Promise<ComplianceCheckResult> {
    try {
      // Load settings if not already loaded
      if (this.complianceSettings.size === 0) {
        await this.loadComplianceSettings();
      }

      const settings = this.complianceSettings.get(state);
      if (!settings) {
        return {
          isCompliant: false,
          state,
          allowedActions: [],
          restrictions: [`No compliance settings found for state: ${state}`],
          warnings: [],
          errors: [`Compliance settings not configured for ${state}`]
        };
      }

      const result: ComplianceCheckResult = {
        isCompliant: true,
        state,
        allowedActions: [],
        restrictions: [],
        warnings: [],
        errors: []
      };

      // Check specific action compliance
      switch (action) {
        case 'website_scraping':
          if (!settings.enable_website_scraping) {
            result.isCompliant = false;
            result.errors.push('Website scraping is disabled for this state');
          } else {
            result.allowedActions.push('website_scraping');
            if (settings.require_lead_source_disclosure) {
              result.warnings.push('Lead source disclosure required');
            }
            if (settings.require_consent_documentation) {
              result.warnings.push('Consent documentation required');
            }
          }
          break;

        case 'zipcode_scraping':
          if (!settings.enable_zipcode_scraping) {
            result.isCompliant = false;
            result.errors.push('Zip code scraping is disabled for this state');
          } else {
            result.allowedActions.push('zipcode_scraping');
            if (settings.require_lead_source_disclosure) {
              result.warnings.push('Lead source disclosure required');
            }
            if (settings.require_consent_documentation) {
              result.warnings.push('Consent documentation required');
            }
          }
          break;

        case 'email_marketing':
          if (!settings.enable_email_marketing) {
            result.isCompliant = false;
            result.errors.push('Email marketing is disabled for this state');
          } else {
            result.allowedActions.push('email_marketing');
            if (settings.require_opt_in) {
              result.warnings.push('Opt-in consent required');
            }
            if (settings.require_unsubscribe_link) {
              result.warnings.push('Unsubscribe link required');
            }
            if (settings.require_privacy_policy) {
              result.warnings.push('Privacy policy required');
            }
            if (settings.max_emails_per_day > 0) {
              result.restrictions.push(`Maximum ${settings.max_emails_per_day} emails per day`);
            }
            if (settings.max_emails_per_lead > 0) {
              result.restrictions.push(`Maximum ${settings.max_emails_per_lead} emails per lead`);
            }
          }
          break;

        case 'calendar_booking':
          if (!settings.enable_calendar_booking) {
            result.isCompliant = false;
            result.errors.push('Calendar booking is disabled for this state');
          } else {
            result.allowedActions.push('calendar_booking');
            if (settings.require_consent_documentation) {
              result.warnings.push('Consent documentation required');
            }
            if (settings.require_contact_method_preference) {
              result.warnings.push('Contact method preference required');
            }
          }
          break;
      }

      // Add general compliance requirements
      if (settings.require_hipaa_compliance) {
        result.warnings.push('HIPAA compliance required for healthcare marketing');
      }
      if (settings.require_texas_healthcare_license) {
        result.warnings.push('Texas healthcare license required');
      }
      if (settings.require_fda_compliance) {
        result.warnings.push('FDA compliance required for healthcare claims');
      }
      if (settings.require_ada_compliance) {
        result.warnings.push('ADA compliance required for accessibility');
      }

      return result;
    } catch (error) {
      console.error('Error checking compliance:', error);
      return {
        isCompliant: false,
        state,
        allowedActions: [],
        restrictions: [],
        warnings: [],
        errors: [`Error checking compliance: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async checkWebsiteScrapingCompliance(url: string, state: string = 'Texas'): Promise<ComplianceCheckResult> {
    const result = await this.checkComplianceForAction('website_scraping', state);
    
    // Additional URL-specific checks
    if (url) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Check if it's a healthcare website
        if (domain.includes('health') || domain.includes('medical') || domain.includes('clinic') || domain.includes('doctor')) {
          result.warnings.push('Healthcare website detected - additional compliance requirements may apply');
        }
        
        // Check for robots.txt compliance
        result.warnings.push('Ensure robots.txt compliance when scraping');
        
      } catch (error) {
        result.errors.push('Invalid URL format');
        result.isCompliant = false;
      }
    }
    
    return result;
  }

  async checkEmailMarketingCompliance(
    recipientEmail: string,
    emailType: 'seo_report' | 'calendar_invite' | 'marketing',
    state: string = 'Texas'
  ): Promise<ComplianceCheckResult> {
    const result = await this.checkComplianceForAction('email_marketing', state);
    
    // Email-specific compliance checks
    if (recipientEmail) {
      // Check if it's a business email
      const businessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const domain = recipientEmail.split('@')[1];
      
      if (businessDomains.includes(domain)) {
        result.warnings.push('Personal email detected - ensure proper consent');
      }
      
      // Check email type specific requirements
      if (emailType === 'marketing') {
        result.warnings.push('Marketing email requires explicit opt-in consent');
      } else if (emailType === 'seo_report') {
        result.warnings.push('SEO report email - ensure recipient requested this information');
      }
    }
    
    return result;
  }

  getComplianceSettings(state: string = 'Texas'): ComplianceSettings | null {
    return this.complianceSettings.get(state) || null;
  }

  async updateComplianceSettings(state: string, updates: Partial<ComplianceSettings>): Promise<boolean> {
    try {
      const result = await pool.query(
        `UPDATE compliance_settings SET 
         enable_website_scraping = $1,
         enable_zipcode_scraping = $2,
         enable_email_marketing = $3,
         enable_calendar_booking = $4,
         require_opt_in = $5,
         require_privacy_policy = $6,
         require_terms_of_service = $7,
         max_emails_per_day = $8,
         max_emails_per_lead = $9,
         email_frequency_limit = $10,
         require_unsubscribe_link = $11,
         require_physical_address = $12,
         require_business_license = $13,
         require_hipaa_compliance = $14,
         require_texas_healthcare_license = $15,
         require_fda_compliance = $16,
         require_ada_compliance = $17,
         require_ccpa_compliance = $18,
         require_gdpr_compliance = $19,
         allow_automated_calls = $20,
         allow_text_messages = $21,
         allow_voicemail = $22,
         call_time_restrictions = $23,
         text_time_restrictions = $24,
         require_do_not_call_registry_check = $25,
         require_lead_source_disclosure = $26,
         require_contact_method_preference = $27,
         require_consent_documentation = $28,
         require_data_retention_policy = $29,
         require_breach_notification = $30,
         updated_at = NOW()
         WHERE state = $31`,
        [
          updates.enable_website_scraping,
          updates.enable_zipcode_scraping,
          updates.enable_email_marketing,
          updates.enable_calendar_booking,
          updates.require_opt_in,
          updates.require_privacy_policy,
          updates.require_terms_of_service,
          updates.max_emails_per_day,
          updates.max_emails_per_lead,
          updates.email_frequency_limit,
          updates.require_unsubscribe_link,
          updates.require_physical_address,
          updates.require_business_license,
          updates.require_hipaa_compliance,
          updates.require_texas_healthcare_license,
          updates.require_fda_compliance,
          updates.require_ada_compliance,
          updates.require_ccpa_compliance,
          updates.require_gdpr_compliance,
          updates.allow_automated_calls,
          updates.allow_text_messages,
          updates.allow_voicemail,
          updates.call_time_restrictions,
          updates.text_time_restrictions,
          updates.require_do_not_call_registry_check,
          updates.require_lead_source_disclosure,
          updates.require_contact_method_preference,
          updates.require_consent_documentation,
          updates.require_data_retention_policy,
          updates.require_breach_notification,
          state
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        // Reload settings
        await this.loadComplianceSettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating compliance settings:', error);
      return false;
    }
  }
}
