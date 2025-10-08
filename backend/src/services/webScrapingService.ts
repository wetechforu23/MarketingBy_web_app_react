import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedLeadData {
  clinicName: string;
  websiteUrl: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  services?: string[];
  industryCategory: string;
  industrySubcategory: string;
  leadSource: string;
  status: string;
}

export class WebScrapingService {
  private static instance: WebScrapingService;

  public static getInstance(): WebScrapingService {
    if (!WebScrapingService.instance) {
      WebScrapingService.instance = new WebScrapingService();
    }
    return WebScrapingService.instance;
  }

  async scrapeWebsite(url: string): Promise<ScrapedLeadData> {
    try {
      console.log(`Starting to scrape: ${url}`);
      
      // Fetch the webpage
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract basic information
      const domain = new URL(url).hostname;
      const clinicName = this.extractClinicName($, domain);
      const contactEmail = this.extractEmail($);
      const contactPhone = this.extractPhone($);
      const address = this.extractAddress($);
      const services = this.extractServices($);
      
      // Determine industry category based on content
      const industryCategory = this.determineIndustryCategory($, services);
      const industrySubcategory = this.determineIndustrySubcategory($, services);

      return {
        clinicName,
        websiteUrl: url,
        contactEmail,
        contactPhone,
        address,
        services,
        industryCategory,
        industrySubcategory,
        leadSource: 'Website Scraping',
        status: 'new'
      };

    } catch (error) {
      console.error('Web scraping error:', error);
      throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractClinicName($: cheerio.Root, domain: string): string {
    // Try to find clinic name in various places
    let clinicName = '';
    
    // Check title tag
    const title = $('title').text().trim();
    if (title) {
      clinicName = title.replace(/[|–-].*$/, '').trim();
    }
    
    // Check h1 tags
    if (!clinicName) {
      const h1 = $('h1').first().text().trim();
      if (h1) {
        clinicName = h1;
      }
    }
    
    // Check meta description
    if (!clinicName) {
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc) {
        clinicName = metaDesc.split('.')[0].trim();
      }
    }
    
    // Fallback to domain name
    if (!clinicName) {
      clinicName = domain.replace('www.', '').split('.')[0];
      clinicName = clinicName.charAt(0).toUpperCase() + clinicName.slice(1) + ' Clinic';
    }
    
    return clinicName;
  }

  private extractEmail($: cheerio.Root): string | undefined {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = $('body').text();
    const emails = text.match(emailRegex);
    
    if (emails && emails.length > 0) {
      // Filter out common non-contact emails
      const filteredEmails = emails.filter(email => 
        !email.includes('noreply') && 
        !email.includes('no-reply') &&
        !email.includes('donotreply')
      );
      return filteredEmails[0];
    }
    
    return undefined;
  }

  private extractPhone($: cheerio.Root): string | undefined {
    const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    const text = $('body').text();
    const phones = text.match(phoneRegex);
    
    if (phones && phones.length > 0) {
      return phones[0];
    }
    
    return undefined;
  }

  private extractAddress($: cheerio.Root): string | undefined {
    // Look for address in various formats
    const addressSelectors = [
      '[itemprop="address"]',
      '.address',
      '.location',
      '.contact-info',
      '[class*="address"]',
      '[class*="location"]'
    ];
    
    for (const selector of addressSelectors) {
      const address = $(selector).text().trim();
      if (address && address.length > 10) {
        return address;
      }
    }
    
    return undefined;
  }

  private extractServices($: cheerio.Root): string[] {
    const services: string[] = [];
    
    // Look for service-related content
    const serviceKeywords = [
      'Primary Care', 'Dental', 'Cardiology', 'Dermatology', 'Orthopedics',
      'Weight Loss', 'Hormone Therapy', 'Testosterone', 'Diabetes',
      'Hypertension', 'Cancer Prevention', 'Chronic Disease',
      'Aesthetic Therapy', 'Women\'s Health', 'Gynecology',
      'Allergy Testing', 'Immunotherapy', 'Preventive Care'
    ];
    
    const text = $('body').text().toLowerCase();
    
    for (const keyword of serviceKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        services.push(keyword);
      }
    }
    
    return services;
  }

  private determineIndustryCategory($: cheerio.Root, services: string[]): string {
    const text = $('body').text().toLowerCase();
    
    if (text.includes('dental') || services.some(s => s.toLowerCase().includes('dental'))) {
      return 'Healthcare';
    }
    
    if (text.includes('primary care') || text.includes('family medicine') || 
        services.some(s => s.toLowerCase().includes('primary care'))) {
      return 'Healthcare';
    }
    
    if (text.includes('cardiology') || text.includes('heart') || 
        services.some(s => s.toLowerCase().includes('cardiology'))) {
      return 'Healthcare';
    }
    
    if (text.includes('dermatology') || text.includes('skin') || 
        services.some(s => s.toLowerCase().includes('dermatology'))) {
      return 'Healthcare';
    }
    
    if (text.includes('orthopedic') || text.includes('bone') || 
        services.some(s => s.toLowerCase().includes('orthopedic'))) {
      return 'Healthcare';
    }
    
    // Default to Healthcare
    return 'Healthcare';
  }

  private determineIndustrySubcategory($: cheerio.Root, services: string[]): string {
    if (services.includes('Primary Care')) {
      return 'Primary Care';
    }
    
    if (services.includes('Dental')) {
      return 'Dental';
    }
    
    if (services.includes('Cardiology')) {
      return 'Cardiology';
    }
    
    if (services.includes('Dermatology')) {
      return 'Dermatology';
    }
    
    if (services.includes('Orthopedics')) {
      return 'Orthopedics';
    }
    
    if (services.includes('Weight Loss') || services.includes('Hormone Therapy')) {
      return 'Weight Management';
    }
    
    if (services.includes('Women\'s Health') || services.includes('Gynecology')) {
      return 'Women\'s Health';
    }
    
    // Default to Primary Care
    return 'Primary Care';
  }
}
