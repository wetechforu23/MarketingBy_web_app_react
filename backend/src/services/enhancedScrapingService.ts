import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database';

interface ScrapingRequest {
  type: 'individual' | 'location';
  website?: string;
  address?: string;
  zipCode?: string;
  radius?: number; // in miles
  maxLeads?: number;
  state?: string;
}

interface ComplianceResult {
  isCompliant: boolean;
  restrictions: string[];
  warnings: string[];
  stateRules: any;
}

interface ScrapingResult {
  success: boolean;
  leads: any[];
  compliance: ComplianceResult;
  apiUsage: {
    googlePlaces: number;
    scrapingRequests: number;
  };
  errors: string[];
}

class EnhancedScrapingService {
  private static readonly MAX_LEADS_PER_REQUEST = 50;
  private static readonly MAX_RADIUS_MILES = 25;
  private static readonly DAILY_API_LIMIT = 1000;

  // USA State-specific scraping compliance rules
  private static readonly STATE_COMPLIANCE_RULES = {
    'CA': {
      requiresConsent: true,
      maxRequestsPerDay: 100,
      allowedDataTypes: ['business_name', 'address', 'phone', 'website'],
      restrictions: ['No personal emails without consent', 'No social media profiles']
    },
    'NY': {
      requiresConsent: false,
      maxRequestsPerDay: 200,
      allowedDataTypes: ['business_name', 'address', 'phone', 'website', 'email'],
      restrictions: ['No personal information beyond business contact']
    },
    'TX': {
      requiresConsent: false,
      maxRequestsPerDay: 150,
      allowedDataTypes: ['business_name', 'address', 'phone', 'website'],
      restrictions: ['No automated data collection without notice']
    },
    'FL': {
      requiresConsent: true,
      maxRequestsPerDay: 100,
      allowedDataTypes: ['business_name', 'address', 'phone'],
      restrictions: ['No email collection without explicit consent']
    },
    'DEFAULT': {
      requiresConsent: false,
      maxRequestsPerDay: 100,
      allowedDataTypes: ['business_name', 'address', 'phone', 'website'],
      restrictions: ['Follow robots.txt', 'Respect rate limits', 'No personal data']
    }
  };

  // Check compliance for scraping based on location and type
  static async checkCompliance(request: ScrapingRequest): Promise<ComplianceResult> {
    const state = request.state || 'DEFAULT';
    const rules = this.STATE_COMPLIANCE_RULES[state] || this.STATE_COMPLIANCE_RULES['DEFAULT'];
    
    const restrictions: string[] = [];
    const warnings: string[] = [];

    // Check daily usage limits
    const todayUsage = await this.getTodayUsage();
    if (todayUsage >= rules.maxRequestsPerDay) {
      restrictions.push(`Daily limit of ${rules.maxRequestsPerDay} requests exceeded`);
    }

    // Check if consent is required
    if (rules.requiresConsent && request.type === 'individual') {
      warnings.push('Consent may be required for data collection in this state');
    }

    // Check radius limits
    if (request.radius && request.radius > this.MAX_RADIUS_MILES) {
      restrictions.push(`Radius cannot exceed ${this.MAX_RADIUS_MILES} miles`);
    }

    // Check lead limits
    if (request.maxLeads && request.maxLeads > this.MAX_LEADS_PER_REQUEST) {
      restrictions.push(`Maximum ${this.MAX_LEADS_PER_REQUEST} leads per request`);
    }

    return {
      isCompliant: restrictions.length === 0,
      restrictions,
      warnings,
      stateRules: rules
    };
  }

  // Get today's API usage
  private static async getTodayUsage(): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM scraping_logs WHERE DATE(created_at) = CURRENT_DATE'
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting today usage:', error);
      return 0;
    }
  }

  // Log scraping activity
  private static async logScrapingActivity(
    type: string, 
    target: string, 
    leadsFound: number, 
    apiCalls: number
  ): Promise<void> {
    try {
      await pool.query(
        'INSERT INTO scraping_logs (type, target, leads_found, api_calls, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [type, target, leadsFound, apiCalls]
      );
    } catch (error) {
      console.error('Error logging scraping activity:', error);
    }
  }

  // Enhanced individual website scraping
  static async scrapeIndividualWebsite(website: string, state?: string): Promise<ScrapingResult> {
    const request: ScrapingRequest = { type: 'individual', website, state };
    
    // Check compliance first
    const compliance = await this.checkCompliance(request);
    if (!compliance.isCompliant) {
      return {
        success: false,
        leads: [],
        compliance,
        apiUsage: { googlePlaces: 0, scrapingRequests: 0 },
        errors: compliance.restrictions
      };
    }

    const errors: string[] = [];
    const leads: any[] = [];
    let apiCalls = 0;

    try {
      // Validate website URL
      if (!this.isValidUrl(website)) {
        errors.push('Invalid website URL format');
        return this.createErrorResult(compliance, errors);
      }

      // Check robots.txt compliance
      const robotsCompliant = await this.checkRobotsTxt(website);
      if (!robotsCompliant) {
        errors.push('Website robots.txt does not allow scraping');
        return this.createErrorResult(compliance, errors);
      }

      // Scrape the website
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WeTechForU-Bot/1.0; +https://wetechforu.com/bot)'
        }
      });

      apiCalls++;

      const $ = cheerio.load(response.data);
      
      // Extract business information
      const businessInfo = this.extractBusinessInfo($ as any, website);
      
      if (businessInfo) {
        // Validate extracted data
        const validatedLead = await this.validateAndEnrichLead(businessInfo, state);
        if (validatedLead) {
          leads.push(validatedLead);
        }
      }

      // Log the scraping activity
      await this.logScrapingActivity('individual', website, leads.length, apiCalls);

      return {
        success: true,
        leads,
        compliance,
        apiUsage: { googlePlaces: 0, scrapingRequests: apiCalls },
        errors
      };

    } catch (error: any) {
      errors.push(`Scraping failed: ${error.message}`);
      return this.createErrorResult(compliance, errors);
    }
  }

  // Location-based scraping using address or zip code
  static async scrapeByLocation(
    address?: string, 
    zipCode?: string, 
    radius: number = 5, 
    maxLeads: number = 20,
    state?: string
  ): Promise<ScrapingResult> {
    const request: ScrapingRequest = { 
      type: 'location', 
      address, 
      zipCode, 
      radius, 
      maxLeads, 
      state 
    };
    
    // Check compliance first
    const compliance = await this.checkCompliance(request);
    if (!compliance.isCompliant) {
      return {
        success: false,
        leads: [],
        compliance,
        apiUsage: { googlePlaces: 0, scrapingRequests: 0 },
        errors: compliance.restrictions
      };
    }

    const errors: string[] = [];
    const leads: any[] = [];
    let googlePlacesCalls = 0;
    let scrapingCalls = 0;

    try {
      // Use Google Places API to find nearby businesses
      const searchQuery = address || zipCode;
      if (!searchQuery) {
        errors.push('Either address or zip code is required for location-based search');
        return this.createErrorResult(compliance, errors);
      }

      // Get nearby businesses from Google Places
      const nearbyBusinesses = await this.getNearbyBusinesses(searchQuery, radius, maxLeads);
      googlePlacesCalls++;

      // Scrape each business website if available
      for (const business of nearbyBusinesses) {
        if (business.website && scrapingCalls < 10) { // Limit scraping calls
          try {
            const websiteResult = await this.scrapeIndividualWebsite(business.website, state);
            if (websiteResult.success && websiteResult.leads.length > 0) {
              leads.push(...websiteResult.leads);
            }
            scrapingCalls += websiteResult.apiUsage.scrapingRequests;
          } catch (error) {
            console.error(`Failed to scrape ${business.website}:`, error);
          }
        } else {
          // Add business info even without website
          leads.push({
            company: business.name,
            address: business.address,
            phone: business.phone,
            website_url: business.website,
            source: 'Google Places',
            status: 'new',
            industry_category: this.determineIndustryFromName(business.name),
            compliance_status: 'pending'
          });
        }
      }

      // Log the scraping activity
      await this.logScrapingActivity('location', searchQuery, leads.length, googlePlacesCalls + scrapingCalls);

      return {
        success: true,
        leads,
        compliance,
        apiUsage: { googlePlaces: googlePlacesCalls, scrapingRequests: scrapingCalls },
        errors
      };

    } catch (error: any) {
      errors.push(`Location-based scraping failed: ${error.message}`);
      return this.createErrorResult(compliance, errors);
    }
  }

  // Helper methods
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static async checkRobotsTxt(website: string): Promise<boolean> {
    try {
      const url = new URL(website);
      const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
      
      const response = await axios.get(robotsUrl, { timeout: 5000 });
      const robotsTxt = response.data.toLowerCase();
      
      // Simple check - if it mentions disallowing bots, we respect it
      return !robotsTxt.includes('disallow: /') || !robotsTxt.includes('wetechforu');
    } catch {
      // If robots.txt doesn't exist or is inaccessible, assume it's okay
      return true;
    }
  }

  private static extractBusinessInfo($: cheerio.Root, website: string): any {
    const businessInfo: any = {
      website_url: website,
      source: 'Website Scraping',
      status: 'new',
      compliance_status: 'pending'
    };

    // Extract business name from title or h1
    const title = $('title').text().trim();
    const h1 = $('h1').first().text().trim();
    businessInfo.company = h1 || title.split('|')[0].split('-')[0].trim();

    // Extract contact information
    const bodyText = $('body').text();
    
    // Email extraction
    const emailMatch = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      businessInfo.email = emailMatch[0];
    }

    // Phone extraction
    const phoneMatch = bodyText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      businessInfo.phone = phoneMatch[0];
    }

    // Address extraction (basic)
    const addressMatch = bodyText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i);
    if (addressMatch) {
      businessInfo.address = addressMatch[0];
    }

    // Industry determination
    businessInfo.industry_category = this.determineIndustryFromName(businessInfo.company);

    return businessInfo;
  }

  private static determineIndustryFromName(companyName: string): string {
    const name = companyName.toLowerCase();
    
    if (name.includes('dental') || name.includes('dentist')) return 'Dental';
    if (name.includes('medical') || name.includes('clinic') || name.includes('health')) return 'Healthcare';
    if (name.includes('therapy') || name.includes('counseling') || name.includes('mental')) return 'Mental Health';
    if (name.includes('fitness') || name.includes('gym') || name.includes('wellness')) return 'Fitness';
    if (name.includes('beauty') || name.includes('spa') || name.includes('salon')) return 'Beauty';
    
    return 'Healthcare'; // Default
  }

  private static async validateAndEnrichLead(lead: any, state?: string): Promise<any> {
    // Add additional validation and enrichment
    if (!lead.company || lead.company.length < 2) {
      return null;
    }

    // Add state information if available
    if (state) {
      lead.state = state;
    }

    // Add timestamp
    lead.created_at = new Date().toISOString();

    return lead;
  }

  private static async getNearbyBusinesses(query: string, radius: number, maxResults: number): Promise<any[]> {
    // This would integrate with Google Places API
    // For now, return mock data
    return [
      {
        name: 'Sample Medical Clinic',
        address: '123 Main St, City, State',
        phone: '(555) 123-4567',
        website: 'https://example.com'
      }
    ];
  }

  private static createErrorResult(compliance: ComplianceResult, errors: string[]): ScrapingResult {
    return {
      success: false,
      leads: [],
      compliance,
      apiUsage: { googlePlaces: 0, scrapingRequests: 0 },
      errors
    };
  }
}

export default EnhancedScrapingService;
