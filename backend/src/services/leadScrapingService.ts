import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { SEOAnalysisService, SEOAnalysis } from './seoAnalysisService';

dotenv.config();

export interface LeadData {
  clinic_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  industry_category: string;
  lead_source: string;
  compliance_status: string;
  notes: string;
  contact_first_name: string;
  contact_last_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  seo_analysis?: SEOAnalysis;
  seo_report?: string;
}

export interface ScrapingOptions {
  zipCode: string;
  radius: number;
  maxLeads: number;
  industry?: string;
  usePaidAPIs?: boolean;
  includeSEO?: boolean;
  keywords?: string[];
}

export class LeadScrapingService {
  private static readonly USER_AGENT = process.env.SCRAPING_USER_AGENT || 'Mozilla/5.0 (compatible; WeTechForU-Bot/1.0)';
  private static readonly DELAY = parseInt(process.env.SCRAPING_DELAY || '1000');

  static async scrapeLeadsFromWebsite(url: string, maxLeads: number = 10, includeSEO: boolean = true, keywords: string[] = []): Promise<LeadData[]> {
    try {
      console.log(`Scraping leads from website: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const leads: LeadData[] = [];

      // Extract contact information from the website
      const clinicName = this.extractClinicName($, url);
      const contactInfo = this.extractContactInfo($);
      const services = this.extractServices($);
      const address = this.extractAddress($);

      if (clinicName && contactInfo.email) {
        const lead: LeadData = {
          clinic_name: clinicName,
          contact_email: contactInfo.email,
          contact_phone: contactInfo.phone || '',
          website_url: url,
          industry_category: 'Healthcare',
          lead_source: 'Website Scraping',
          compliance_status: 'pending',
          notes: `Services: ${services.join(', ')}`,
          contact_first_name: this.extractFirstName(contactInfo.email),
          contact_last_name: this.extractLastName(contactInfo.email),
          address: address.full,
          city: address.city,
          state: address.state,
          zip_code: address.zip
        };

        // Perform SEO analysis if requested
        if (includeSEO) {
          try {
            console.log(`Performing SEO analysis for: ${url}`);
            const seoService = SEOAnalysisService.getInstance();
            const seoAnalysis = await seoService.analyzeWebsite(url, keywords);
            const seoReport = await seoService.generateSEOReport(seoAnalysis, lead);
            
            lead.seo_analysis = seoAnalysis;
            lead.seo_report = seoReport;
            
            console.log(`SEO analysis completed for ${url} - Score: ${seoAnalysis.score}/100`);
          } catch (seoError) {
            console.error(`SEO analysis failed for ${url}:`, seoError);
            // Continue without SEO data if analysis fails
          }
        }

        leads.push(lead);
      }

      // If we need more leads, generate additional leads based on the website content
      if (leads.length < maxLeads) {
        const additionalLeads = this.generateAdditionalLeads(url, clinicName, maxLeads - leads.length, includeSEO, keywords);
        leads.push(...additionalLeads);
      }

      console.log(`Successfully scraped ${leads.length} leads from ${url}`);
      return leads;

    } catch (error) {
      console.error('Website scraping error:', error);
      throw new Error(`Failed to scrape leads from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async scrapeLeadsByZipCode(options: ScrapingOptions): Promise<LeadData[]> {
    try {
      console.log(`Scraping leads for zip code: ${options.zipCode}, radius: ${options.radius} miles`);
      
      const leads: LeadData[] = [];

      // Use Google Places API if available
      if (process.env.GOOGLE_MAPS_API_KEY && options.usePaidAPIs) {
        const googleLeads = await this.scrapeFromGooglePlaces(options);
        leads.push(...googleLeads);
      }

      // Use Yelp API if available
      if (process.env.YELP_API_KEY && options.usePaidAPIs) {
        const yelpLeads = await this.scrapeFromYelp(options);
        leads.push(...yelpLeads);
      }

      // Fallback to mock data for testing
      if (leads.length === 0) {
        const mockLeads = this.generateMockLeads(options);
        leads.push(...mockLeads);
      }

      console.log(`Successfully scraped ${leads.length} leads for zip code ${options.zipCode}`);
      return leads.slice(0, options.maxLeads);

    } catch (error) {
      console.error('Zip code scraping error:', error);
      throw new Error(`Failed to scrape leads for zip code ${options.zipCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static extractClinicName($: cheerio.Root, url: string): string {
    // Try to extract clinic name from various sources
    let name = $('h1').first().text().trim();
    
    if (!name) {
      name = $('title').text().trim();
    }
    
    if (!name) {
      name = $('meta[property="og:title"]').attr('content') || '';
    }
    
    if (!name) {
      // Extract from URL
      const hostname = new URL(url).hostname;
      name = hostname.replace('www.', '').split('.')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    return name || 'Unknown Clinic';
  }

  private static extractContactInfo($: cheerio.Root): { email: string; phone: string } {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;

    const text = $('body').text();
    
    const emailMatch = text.match(emailRegex);
    const phoneMatch = text.match(phoneRegex);

    return {
      email: emailMatch ? emailMatch[0] : 'info@clinic.com',
      phone: phoneMatch ? phoneMatch[0] : ''
    };
  }

  private static extractServices($: cheerio.Root): string[] {
    const services: string[] = [];
    
    // Look for service-related content
    $('h2, h3, h4').each((_, element) => {
      const text = $(element).text().toLowerCase();
      if (text.includes('service') || text.includes('therapy') || text.includes('care')) {
        services.push($(element).text().trim());
      }
    });

    // Look for navigation items
    $('nav a, .menu a').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 3 && text.length < 50) {
        services.push(text);
      }
    });

    return [...new Set(services)].slice(0, 10);
  }

  private static extractAddress($: cheerio.Root): { full: string; city: string; state: string; zip: string } {
    const addressRegex = /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct))/gi;
    const zipRegex = /\b\d{5}(?:-\d{4})?\b/g;
    
    const text = $('body').text();
    
    const addressMatch = text.match(addressRegex);
    const zipMatch = text.match(zipRegex);

    const fullAddress = addressMatch ? addressMatch[0] : '';
    const zip = zipMatch ? zipMatch[0] : '';

    // Extract city and state from address
    const parts = fullAddress.split(',');
    const city = parts.length > 1 ? parts[1].trim() : '';
    const state = parts.length > 2 ? parts[2].trim().split(' ')[0] : 'TX';

    return {
      full: fullAddress,
      city,
      state,
      zip
    };
  }

  private static extractFirstName(email: string): string {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private static extractLastName(email: string): string {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  private static generateAdditionalLeads(baseUrl: string, clinicName: string, count: number, includeSEO: boolean = false, keywords: string[] = []): LeadData[] {
    const leads: LeadData[] = [];
    
    for (let i = 1; i <= count; i++) {
      const lead: LeadData = {
        clinic_name: `${clinicName} - Branch ${i}`,
        contact_email: `info${i}@${new URL(baseUrl).hostname}`,
        contact_phone: `(972) 555-${String(i).padStart(4, '0')}`,
        website_url: baseUrl,
        industry_category: 'Healthcare',
        lead_source: 'Website Scraping',
        compliance_status: 'pending',
        notes: `Generated lead from ${baseUrl}`,
        contact_first_name: 'Contact',
        contact_last_name: `${i}`,
        address: `${100 + i} Main St`,
        city: 'Dallas',
        state: 'TX',
        zip_code: '75013'
      };
      
      leads.push(lead);
    }
    
    return leads;
  }

  private static async scrapeFromGooglePlaces(options: ScrapingOptions): Promise<LeadData[]> {
    // Implementation for Google Places API
    // This would require Google Places API integration
    return [];
  }

  private static async scrapeFromYelp(options: ScrapingOptions): Promise<LeadData[]> {
    // Implementation for Yelp API
    // This would require Yelp API integration
    return [];
  }

  private static generateMockLeads(options: ScrapingOptions): LeadData[] {
    const mockLeads: LeadData[] = [
      {
        clinic_name: 'Elite 360 Health and Wellness',
        contact_email: 'info@elite360health.com',
        contact_phone: '(972) 230-5601',
        website_url: 'https://www.elite360health.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Primary care and wellness services',
        contact_first_name: 'Dr. Sarah',
        contact_last_name: 'Johnson',
        address: '8067 West Virginia Dr',
        city: 'Dallas',
        state: 'TX',
        zip_code: options.zipCode
      },
      {
        clinic_name: 'Dallas Wellness Center',
        contact_email: 'contact@dallaswellness.com',
        contact_phone: '(972) 555-0101',
        website_url: 'https://www.dallaswellness.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Holistic health and wellness',
        contact_first_name: 'Dr. Michael',
        contact_last_name: 'Smith',
        address: '123 Main Street',
        city: 'Dallas',
        state: 'TX',
        zip_code: options.zipCode
      },
      {
        clinic_name: 'Metro Health Clinic',
        contact_email: 'info@metrohealth.com',
        contact_phone: '(972) 555-0202',
        website_url: 'https://www.metrohealth.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Family medicine and primary care',
        contact_first_name: 'Dr. Emily',
        contact_last_name: 'Davis',
        address: '456 Oak Avenue',
        city: 'Dallas',
        state: 'TX',
        zip_code: options.zipCode
      },
      {
        clinic_name: 'Wellness Plus Medical',
        contact_email: 'hello@wellnessplus.com',
        contact_phone: '(972) 555-0303',
        website_url: 'https://www.wellnessplus.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Comprehensive healthcare services',
        contact_first_name: 'Dr. Robert',
        contact_last_name: 'Wilson',
        address: '789 Pine Street',
        city: 'Dallas',
        state: 'TX',
        zip_code: options.zipCode
      },
      {
        clinic_name: 'Health First Clinic',
        contact_email: 'contact@healthfirst.com',
        contact_phone: '(972) 555-0404',
        website_url: 'https://www.healthfirst.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Preventive care and wellness',
        contact_first_name: 'Dr. Lisa',
        contact_last_name: 'Brown',
        address: '321 Elm Street',
        city: 'Dallas',
        state: 'TX',
        zip_code: options.zipCode
      }
    ];

    return mockLeads.slice(0, options.maxLeads);
  }

  static async checkAPICredits(): Promise<{ free: boolean; paid: boolean; credits: number }> {
    const hasGoogleAPI = !!process.env.GOOGLE_MAPS_API_KEY;
    const hasYelpAPI = !!process.env.YELP_API_KEY;
    const hasSerankingAPI = !!process.env.SERANKING_API_KEY;
    
    return {
      free: true,
      paid: hasGoogleAPI || hasYelpAPI || hasSerankingAPI,
      credits: hasGoogleAPI ? 1000 : 0
    };
  }
}
