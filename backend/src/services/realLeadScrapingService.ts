import axios from 'axios';
import * as cheerio from 'cheerio';
import { DatabaseService, Lead } from './databaseService';
import { SEOAnalysisService } from './seoAnalysisService';

export interface ScrapingOptions {
  url: string;
  maxLeads?: number;
  includeSEO?: boolean;
  keywords?: string[];
  seoMode?: 'basic' | 'comprehensive' | 'both';
  useGooglePlaces?: boolean;
  useYelp?: boolean;
  useSeranking?: boolean;
  state?: string;
}

export interface ScrapingResult {
  success: boolean;
  leads: Lead[];
  message: string;
  apiUsage?: {
    googlePlaces?: number;
    yelp?: number;
    seranking?: number;
    totalCost?: number;
  };
  seoIncluded?: boolean;
  seoMode?: string;
}

export class RealLeadScrapingService {
  private static instance: RealLeadScrapingService;
  private databaseService: DatabaseService;
  private seoService: SEOAnalysisService;

  private constructor() {
    this.databaseService = DatabaseService.getInstance();
    this.seoService = SEOAnalysisService.getInstance();
  }

  public static getInstance(): RealLeadScrapingService {
    if (!RealLeadScrapingService.instance) {
      RealLeadScrapingService.instance = new RealLeadScrapingService();
    }
    return RealLeadScrapingService.instance;
  }

  async scrapeLeadsFromWebsite(options: ScrapingOptions): Promise<ScrapingResult> {
    const { url, maxLeads = 10, includeSEO = true, keywords = [], seoMode = 'comprehensive', state = 'TX' } = options;
    
    try {
      console.log(`Starting real lead scraping for: ${url}`);
      
      // Scrape website content
      const websiteData = await this.scrapeWebsiteContent(url);
      
      // Extract lead information
      const leads = await this.extractLeadInformation(websiteData, url, maxLeads, state);
      
      // Perform SEO analysis if requested
      if (includeSEO && leads.length > 0) {
        for (const lead of leads) {
          if (lead.website_url) {
            try {
              console.log(`Performing SEO analysis for: ${lead.website_url}`);
              const seoAnalysis = await this.seoService.analyzeWebsite(lead.website_url, keywords);
              const seoReport = await this.seoService.generateSEOReport(seoAnalysis, lead);
              
              lead.seo_analysis = seoAnalysis;
              lead.seo_report = seoReport;
              
              console.log(`SEO analysis completed for ${lead.website_url} - Score: ${seoAnalysis.score}/100`);
            } catch (seoError) {
              console.error(`SEO analysis failed for ${lead.website_url}:`, seoError);
              // Continue without SEO data if analysis fails
            }
          }
        }
      }

      // Save leads to database
      const savedLeads: Lead[] = [];
      for (const lead of leads) {
        try {
          const savedLead = await this.databaseService.createLead(lead);
          savedLeads.push(savedLead);
        } catch (error) {
          console.error(`Failed to save lead:`, error);
        }
      }

      // Track API usage
      await this.trackScrapingUsage(options, savedLeads.length);

      return {
        success: true,
        leads: savedLeads,
        message: `Successfully scraped ${savedLeads.length} leads from ${url}`,
        seoIncluded: includeSEO,
        seoMode: seoMode
      };

    } catch (error) {
      console.error('Lead scraping failed:', error);
      return {
        success: false,
        leads: [],
        message: `Failed to scrape leads: ${error instanceof Error ? error.message : 'Unknown error'}`,
        seoIncluded: includeSEO,
        seoMode: seoMode
      };
    }
  }

  private async scrapeWebsiteContent(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      return {
        url: url,
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        content: $('body').text(),
        html: response.data,
        $: $,
        headers: response.headers
      };
    } catch (error) {
      console.error(`Failed to scrape website content for ${url}:`, error);
      throw new Error(`Failed to access website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractLeadInformation(websiteData: any, url: string, maxLeads: number, state: string): Promise<Lead[]> {
    const leads: Lead[] = [];
    const $ = websiteData.$;

    // Extract contact information from the website
    const contactInfo = this.extractContactInfo(websiteData);
    
    // Create lead from website data
    const lead: Lead = {
      name: contactInfo.companyName || websiteData.title || 'Unknown Business',
      email: contactInfo.email,
      phone: contactInfo.phone,
      company: contactInfo.companyName || websiteData.title || 'Unknown Business',
      website_url: url,
      source: 'Website Scraping',
      status: 'new',
      compliance_status: 'pending',
      industry_category_id: 1, // Default to Healthcare
      address: contactInfo.address,
      city: contactInfo.city,
      state: state,
      zip_code: contactInfo.zipCode,
      contact_first_name: contactInfo.firstName,
      contact_last_name: contactInfo.lastName,
      notes: `Scraped from website: ${url}`
    };

    // Only add if we have meaningful contact information
    if (lead.email || lead.phone || lead.name) {
      leads.push(lead);
    }

    // Try to find additional contact information on the page
    const additionalContacts = this.findAdditionalContacts(websiteData);
    leads.push(...additionalContacts.slice(0, maxLeads - 1));

    return leads;
  }

  private extractContactInfo(websiteData: any): any {
    const $ = websiteData.$;
    const contactInfo: any = {};

    // Extract company name
    contactInfo.companyName = $('h1').first().text().trim() || 
                             $('.company-name').text().trim() ||
                             $('[class*="company"]').first().text().trim();

    // Enhanced email extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = websiteData.content.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      // Filter out common non-contact emails
      const filteredEmails = emailMatches.filter(email => 
        !email.includes('noreply') && 
        !email.includes('no-reply') && 
        !email.includes('donotreply') &&
        !email.includes('example.com') &&
        !email.includes('test.com') &&
        !email.includes('placeholder')
      );
      contactInfo.email = filteredEmails[0] || emailMatches[0];
    }

    // Enhanced phone number extraction
    const phoneRegexes = [
      /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,  // Standard US format
      /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,  // Simple format
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g,  // Without parentheses
    ];
    
    let phoneMatches: string[] = [];
    for (const regex of phoneRegexes) {
      const matches = websiteData.content.match(regex);
      if (matches) {
        phoneMatches = phoneMatches.concat(matches);
      }
    }
    
    if (phoneMatches.length > 0) {
      // Clean and format phone numbers
      const cleanedPhones = phoneMatches.map(phone => {
        const digits = phone.replace(/[^\d]/g, '');
        if (digits.length === 10) {
          return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        } else if (digits.length === 11 && digits.startsWith('1')) {
          return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
        }
        return phone;
      });
      contactInfo.phone = cleanedPhones[0];
    }

    // Extract address information
    const addressElements = $('[class*="address"], [class*="location"], .address, .location');
    if (addressElements.length > 0) {
      const addressText = addressElements.first().text().trim();
      const addressParts = this.parseAddress(addressText);
      contactInfo.address = addressParts.address;
      contactInfo.city = addressParts.city;
      contactInfo.zipCode = addressParts.zipCode;
    }

    // Extract contact person name
    const nameElements = $('[class*="contact"], [class*="name"], .contact, .name');
    if (nameElements.length > 0) {
      const nameText = nameElements.first().text().trim();
      const nameParts = nameText.split(' ');
      if (nameParts.length >= 2) {
        contactInfo.firstName = nameParts[0];
        contactInfo.lastName = nameParts.slice(1).join(' ');
      }
    }

    return contactInfo;
  }

  private findAdditionalContacts(websiteData: any): Lead[] {
    const $ = websiteData.$;
    const additionalLeads: Lead[] = [];

    // Look for staff/team sections
    $('[class*="staff"], [class*="team"], [class*="doctor"], [class*="provider"]').each((index, element) => {
      const $element = $(element);
      const name = $element.find('h3, h4, .name, [class*="name"]').first().text().trim();
      const title = $element.find('.title, [class*="title"], [class*="position"]').first().text().trim();
      
      if (name && name.length > 2) {
        const lead: Lead = {
          name: name,
          company: websiteData.title || 'Unknown Business',
          website_url: websiteData.url,
          source: 'Website Scraping - Staff',
          status: 'new',
          compliance_status: 'pending',
          industry_category_id: 1,
          notes: `Staff member: ${title || 'Unknown title'}`
        };
        additionalLeads.push(lead);
      }
    });

    return additionalLeads;
  }

  private parseAddress(addressText: string): any {
    const parts = addressText.split(',').map(part => part.trim());
    const result: any = {};

    if (parts.length >= 3) {
      result.address = parts[0];
      result.city = parts[1];
      
      // Extract zip code from last part
      const zipMatch = parts[2].match(/(\d{5}(-\d{4})?)/);
      if (zipMatch) {
        result.zipCode = zipMatch[1];
        result.state = parts[2].replace(zipMatch[0], '').trim();
      } else {
        result.state = parts[2];
      }
    } else if (parts.length === 2) {
      result.address = parts[0];
      result.city = parts[1];
    } else {
      result.address = addressText;
    }

    return result;
  }

  private async trackScrapingUsage(options: ScrapingOptions, leadCount: number): Promise<void> {
    try {
      const apiUsage = {
        project_id: 2, // Use the Healthcare Marketing Platform project
        api_name: 'website_scraping',
        endpoint: options.url,
        request_count: 1,
        cost: 0, // Free scraping
        usage_date: new Date().toISOString().split('T')[0]
      };

      await this.databaseService.trackAPIUsage(apiUsage);

      // Track SEO analysis usage if performed
      if (options.includeSEO && leadCount > 0) {
        const seoUsage = {
          project_id: 2,
          api_name: 'seo_analysis',
          endpoint: options.url,
          request_count: leadCount,
          cost: 0, // Free SEO analysis
          usage_date: new Date().toISOString().split('T')[0]
        };

        await this.databaseService.trackAPIUsage(seoUsage);
      }
    } catch (error) {
      console.error('Failed to track API usage:', error);
    }
  }

  // Google Places API integration (when enabled)
  async scrapeLeadsFromGooglePlaces(query: string, location: string, maxLeads: number = 10): Promise<Lead[]> {
    // This would integrate with Google Places API
    // For now, return empty array as we're focusing on website scraping
    console.log(`Google Places scraping not yet implemented for query: ${query} in ${location}`);
    return [];
  }

  // Yelp API integration (when enabled)
  async scrapeLeadsFromYelp(query: string, location: string, maxLeads: number = 10): Promise<Lead[]> {
    // This would integrate with Yelp API
    // For now, return empty array as we're focusing on website scraping
    console.log(`Yelp scraping not yet implemented for query: ${query} in ${location}`);
    return [];
  }
}
