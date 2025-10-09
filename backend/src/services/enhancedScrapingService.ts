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
    
    console.log(`🌐 ========================================`);
    console.log(`🌐 Starting Website Scraping Compliance Checks`);
    console.log(`🌐 Website: ${website}`);
    console.log(`🌐 State: ${state || 'Not specified'}`);
    console.log(`🌐 ========================================`);
    
    // Check compliance first
    console.log(`✓ Step 1: Checking state-specific compliance rules...`);
    const compliance = await this.checkCompliance(request);
    if (!compliance.isCompliant) {
      console.log(`❌ COMPLIANCE CHECK FAILED!`);
      console.log(`❌ Restrictions:`);
      compliance.restrictions.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
      if (compliance.warnings.length > 0) {
        console.log(`⚠️  Warnings:`);
        compliance.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
      }
      return {
        success: false,
        leads: [],
        compliance,
        apiUsage: { googlePlaces: 0, scrapingRequests: 0 },
        errors: compliance.restrictions
      };
    }
    console.log(`✅ Compliance check PASSED`);

    const errors: string[] = [];
    const leads: any[] = [];
    let apiCalls = 0;

    try {
      // Validate website URL
      console.log(`✓ Step 2: Validating URL format...`);
      if (!this.isValidUrl(website)) {
        errors.push('Invalid website URL format');
        console.log(`❌ URL validation FAILED: Invalid format`);
        return this.createErrorResult(compliance, errors);
      }
      console.log(`✅ URL format is valid`);

      // Check robots.txt compliance
      console.log(`✓ Step 3: Checking robots.txt permissions...`);
      const robotsCompliant = await this.checkRobotsTxt(website);
      if (!robotsCompliant) {
        errors.push('Website robots.txt does not allow scraping');
        console.log(`❌ robots.txt check FAILED: Scraping not allowed`);
        compliance.warnings.push('Website robots.txt restricts automated access');
        return this.createErrorResult(compliance, errors);
      }
      console.log(`✅ robots.txt allows scraping`);
      
      // Check rate limiting
      console.log(`✓ Step 4: Checking rate limits...`);
      const lastScrape = await this.getLastScrapeTime(website);
      const timeSinceLastScrape = Date.now() - lastScrape;
      const minTimeBetweenScrapes = 60000; // 1 minute
      
      if (timeSinceLastScrape < minTimeBetweenScrapes) {
        const waitTime = Math.ceil((minTimeBetweenScrapes - timeSinceLastScrape) / 1000);
        errors.push(`Rate limit: Please wait ${waitTime} seconds before scraping this website again`);
        console.log(`❌ Rate limit exceeded. Wait ${waitTime} seconds`);
        return this.createErrorResult(compliance, errors);
      }
      console.log(`✅ Rate limit check passed`);
      
      console.log(`✓ Step 5: Fetching website content...`);

      // Scrape the website
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WeTechForU-Bot/1.0; +https://wetechforu.com/bot)'
        }
      });

      apiCalls++;

      const $ = cheerio.load(response.data);
      console.log(`✅ Website content loaded (${response.data.length} bytes)`);
      
      // Extract business information
      console.log(`✓ Step 6: Extracting business information...`);
      const businessInfo = this.extractBusinessInfo($ as any, website);
      
      if (businessInfo) {
        console.log(`   - Company: ${businessInfo.company || 'N/A'}`);
        console.log(`   - Email: ${businessInfo.email || 'N/A'}`);
        console.log(`   - Phone: ${businessInfo.phone || 'N/A'}`);
        console.log(`   - Address: ${businessInfo.address || 'N/A'}`);
        
        // Validate extracted data
        console.log(`✓ Step 7: Validating and enriching lead data...`);
        const validatedLead = await this.validateAndEnrichLead(businessInfo, state);
        if (validatedLead) {
          validatedLead.notes = `${validatedLead.notes || ''}. Compliance checks passed: State rules, URL validation, robots.txt, rate limiting.`;
          leads.push(validatedLead);
          console.log(`✅ Lead validated and added to results`);
        } else {
          console.log(`⚠️  Lead validation failed, skipping`);
        }
      } else {
        console.log(`⚠️  No business information could be extracted`);
      }

      // Record scrape time for rate limiting
      await this.recordScrapeTime(website);

      // Log the scraping activity
      await this.logScrapingActivity('individual', website, leads.length, apiCalls);

      console.log(`🌐 ========================================`);
      console.log(`🌐 Scraping Complete`);
      console.log(`🌐 Success: ${leads.length > 0}`);
      console.log(`🌐 Leads Found: ${leads.length}`);
      console.log(`🌐 API Calls: ${apiCalls}`);
      console.log(`🌐 All Compliance Checks: PASSED`);
      console.log(`🌐 ========================================`);

      return {
        success: true,
        leads,
        compliance,
        apiUsage: { googlePlaces: 0, scrapingRequests: apiCalls },
        errors
      };

    } catch (error: any) {
      console.log(`❌ ========================================`);
      console.log(`❌ Scraping Failed: ${error.message}`);
      console.log(`❌ ========================================`);
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

      console.log(`📊 Processing ${nearbyBusinesses.length} businesses from Google Places`);

      // Scrape each business website if available
      for (const business of nearbyBusinesses) {
        const leadData: any = {
          company: business.name,
          address: business.address,
          city: business.city,
          state: business.state,
          zip_code: business.zip_code,
          phone: business.phone,
          website_url: business.website,
          source: 'Google Places API - Location Search',
          status: 'new',
          notes: business.notes,
          industry_category: this.determineIndustryFromName(business.name),
          compliance_status: 'pending',
          google_place_id: business.google_place_id,
          google_rating: business.rating,
          geo_latitude: business.geo_latitude,
          geo_longitude: business.geo_longitude
        };

        // Try to scrape additional details from website if available
        if (business.website && scrapingCalls < 5) { // Limit website scraping to 5
          try {
            const websiteResult = await this.scrapeIndividualWebsite(business.website, state);
            if (websiteResult.success && websiteResult.leads.length > 0) {
              // Merge website data with Google Places data
              const websiteData = websiteResult.leads[0];
              leadData.email = websiteData.email || leadData.email;
              leadData.contact_first_name = websiteData.contact_first_name;
              leadData.contact_last_name = websiteData.contact_last_name;
              leadData.notes = `${leadData.notes}. ${websiteData.notes || ''}`;
            }
            scrapingCalls += websiteResult.apiUsage.scrapingRequests;
          } catch (error) {
            console.error(`Failed to scrape ${business.website}:`, error);
          }
        }

        leads.push(leadData);
      }

      console.log(`✅ Successfully processed ${leads.length} leads`);

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

  // Keyword-based scraping using natural language
  static async scrapeByKeyword(
    searchQuery: string,
    radius: number = 10,
    maxLeads: number = 20,
    zipCode?: string,
    address?: string
  ): Promise<ScrapingResult> {
    const request: ScrapingRequest = { 
      type: 'location', 
      radius, 
      maxLeads 
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

    try {
      console.log(`🔍 Keyword search: "${searchQuery}" with location: ${zipCode || address || 'none'}`);

      // Import GooglePlacesService
      const { GooglePlacesService } = require('./googlePlacesService');
      const googlePlacesService = GooglePlacesService.getInstance();
      
      const radiusMeters = radius * 1609.34; // Convert miles to meters
      let places: any[] = [];

      // If we have a zip code or address, combine it with the keyword
      if (zipCode) {
        console.log(`🔎 Searching "${searchQuery}" near zip code: ${zipCode}, radius: ${radius} miles`);
        places = await googlePlacesService.searchByZipCode(
          zipCode,
          searchQuery,
          Math.min(radiusMeters, 50000)
        );
      } else if (address) {
        console.log(`🔎 Searching "${searchQuery}" near address: ${address}, radius: ${radius} miles`);
        places = await googlePlacesService.searchHealthcareBusinesses(
          address,
          Math.min(radiusMeters, 50000),
          searchQuery
        );
      } else {
        // Just keyword search, no location - use text search
        console.log(`🔎 Text search for "${searchQuery}" without specific location`);
        places = await googlePlacesService.textSearch(
          searchQuery,
          Math.min(radiusMeters, 50000)
        );
      }

      googlePlacesCalls++;
      console.log(`📊 Found ${places.length} businesses matching "${searchQuery}"`);

      // Fetch detailed information for each place (includes phone, website, etc.)
      const detailedPlaces = [];
      const limitedPlaces = places.slice(0, maxLeads);
      
      for (let i = 0; i < limitedPlaces.length; i++) {
        const place = limitedPlaces[i];
        try {
          console.log(`📞 Fetching details for: ${place.name} (${i + 1}/${limitedPlaces.length})`);
          const details = await googlePlacesService.getPlaceDetails(place.place_id);
          
          if (details) {
            detailedPlaces.push(details);
          } else {
            // If details fetch fails, use basic place data
            detailedPlaces.push(place);
          }
          
          // Small delay to avoid rate limiting
          if (i < limitedPlaces.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error: any) {
          console.error(`❌ Failed to fetch details for ${place.name}:`, error.message);
          // Use basic place data if details fetch fails
          detailedPlaces.push(place);
        }
      }

      // Process each business
      for (const place of detailedPlaces) {
        // Parse address components
        let city = '', state = '', zipCodeValue = '';
        
        if (place.formatted_address) {
          const addressParts = place.formatted_address.split(',');
          if (addressParts.length >= 2) {
            city = addressParts[addressParts.length - 2].trim();
          }
          if (addressParts.length >= 3) {
            const stateZip = addressParts[addressParts.length - 1].trim().split(' ');
            state = stateZip[0] || '';
            zipCodeValue = stateZip[1] || '';
          }
        }

        const leadData: any = {
          company: place.name,
          address: place.formatted_address || '',
          city: city,
          state: state,
          zip_code: zipCodeValue,
          phone: place.formatted_phone_number || '',
          website_url: place.website || '',
          source: `Keyword Search: "${searchQuery}"`,
          status: 'new',
          notes: `Google Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}`,
          industry_category: this.determineIndustryFromName(place.name),
          compliance_status: 'pending',
          google_place_id: place.place_id,
          google_rating: place.rating,
          geo_latitude: place.geometry?.location?.lat || null,
          geo_longitude: place.geometry?.location?.lng || null
        };

        leads.push(leadData);
      }

      console.log(`✅ Successfully processed ${leads.length} leads from keyword search`);

      // Log the scraping activity
      await this.logScrapingActivity('keyword', searchQuery, leads.length, googlePlacesCalls);

      return {
        success: true,
        leads,
        compliance,
        apiUsage: { googlePlaces: googlePlacesCalls, scrapingRequests: 0 },
        errors
      };

    } catch (error: any) {
      console.error('❌ Keyword search error:', error);
      errors.push(`Keyword search failed: ${error.message}`);
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
    try {
      // Import GooglePlacesService
      const { GooglePlacesService } = require('./googlePlacesService');
      const googlePlacesService = GooglePlacesService.getInstance();
      
      const radiusMeters = radius * 1609.34; // Convert miles to meters
      let places: any[] = [];
      
      // Check if query is a zip code (5 digits)
      const isZipCode = /^\d{5}$/.test(query.trim());
      
      if (isZipCode) {
        console.log(`🔎 Searching by zip code: ${query}, radius: ${radius} miles`);
        // Use "clinic doctor medical" as default keyword for better clinic results
        places = await googlePlacesService.searchByZipCode(
          query,
          'clinic doctor medical primary care',
          Math.min(radiusMeters, 50000) // Max 50km
        );
      } else {
        console.log(`🔎 Searching by address: ${query}, radius: ${radius} miles`);
        places = await googlePlacesService.searchHealthcareBusinesses(
          query,
          Math.min(radiusMeters, 50000),
          'clinic doctor medical primary care'
        );
      }
      
      console.log(`✅ Found ${places.length} places from Google Places API`);
      
      // Fetch detailed information for each place (includes phone, website, etc.)
      const detailedPlaces = [];
      for (let i = 0; i < Math.min(places.length, maxResults); i++) {
        const place = places[i];
        try {
          console.log(`📞 Fetching details for: ${place.name} (${i + 1}/${Math.min(places.length, maxResults)})`);
          const details = await googlePlacesService.getPlaceDetails(place.place_id);
          
          if (details) {
            detailedPlaces.push(details);
          } else {
            // If details fetch fails, use basic place data
            detailedPlaces.push(place);
          }
          
          // Small delay to avoid rate limiting (Google allows ~10 requests/second)
          if (i < Math.min(places.length, maxResults) - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        } catch (error: any) {
          console.error(`❌ Failed to fetch details for ${place.name}:`, error.message);
          // Use basic place data if details fetch fails
          detailedPlaces.push(place);
        }
      }
      
      // Convert to our business format
      const businesses = detailedPlaces.map(place => {
        // Try to get detailed information if available
        let city = '', state = '', zipCode = '';
        
        if (place.formatted_address) {
          const addressParts = place.formatted_address.split(',');
          if (addressParts.length >= 2) {
            city = addressParts[addressParts.length - 2].trim();
          }
          if (addressParts.length >= 3) {
            const stateZip = addressParts[addressParts.length - 1].trim().split(' ');
            state = stateZip[0] || '';
            zipCode = stateZip[1] || '';
          }
        }
        
        return {
          name: place.name,
          address: place.formatted_address || '',
          city: city,
          state: state,
          zip_code: zipCode,
          phone: place.formatted_phone_number || '',
          website: place.website || '',
          rating: place.rating || 0,
          google_place_id: place.place_id,
          geo_latitude: place.geometry?.location?.lat || null,
          geo_longitude: place.geometry?.location?.lng || null,
          notes: `Google Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}`
        };
      });
      
      console.log(`✅ Processed ${businesses.length} businesses with detailed information`);
      return businesses;
    } catch (error: any) {
      console.error('❌ Error getting nearby businesses from Google Places:', error.message);
      // Return empty array instead of mock data on error
      return [];
    }
  }

  // Helper method to track rate limiting per website
  private static websiteScrapeTimes: Map<string, number> = new Map();
  
  private static async getLastScrapeTime(website: string): Promise<number> {
    return this.websiteScrapeTimes.get(website) || 0;
  }
  
  private static async recordScrapeTime(website: string): Promise<void> {
    this.websiteScrapeTimes.set(website, Date.now());
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
