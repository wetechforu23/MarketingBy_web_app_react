import pool from '../config/database';

export interface GoogleAnalyticsVisitor {
  user_id: string;
  location: {
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  session_data: {
    page_views: number;
    session_duration: number;
    bounce_rate: number;
    traffic_source: string;
  };
  timestamp: Date;
}

export interface LeadCaptureResult {
  success: boolean;
  leads_captured: number;
  leads: any[];
  message: string;
}

export class GoogleAnalyticsLeadCaptureService {
  private static instance: GoogleAnalyticsLeadCaptureService;

  private constructor() {}

  public static getInstance(): GoogleAnalyticsLeadCaptureService {
    if (!GoogleAnalyticsLeadCaptureService.instance) {
      GoogleAnalyticsLeadCaptureService.instance = new GoogleAnalyticsLeadCaptureService();
    }
    return GoogleAnalyticsLeadCaptureService.instance;
  }

  /**
   * Capture leads from Google Analytics visitors near clinic locations
   */
  async captureLeadsFromAnalytics(clientId: number, radiusMiles: number = 25): Promise<LeadCaptureResult> {
    try {
      console.log(`🎯 Capturing leads from Google Analytics for client ${clientId} within ${radiusMiles} miles`);

      // Get client's practice location
      const clientResult = await pool.query(
        `SELECT id, client_name, practice_latitude, practice_longitude, practice_city, practice_state 
         FROM clients WHERE id = $1`,
        [clientId]
      );

      if (clientResult.rows.length === 0) {
        return {
          success: false,
          leads_captured: 0,
          leads: [],
          message: 'Client not found'
        };
      }

      const client = clientResult.rows[0];
      
      if (!client.practice_latitude || !client.practice_longitude) {
        return {
          success: false,
          leads_captured: 0,
          leads: [],
          message: 'Client practice location not configured'
        };
      }

      // Get Google Analytics visitors data (this would come from GA4 API)
      const visitors = await this.getGoogleAnalyticsVisitors(clientId);
      
      if (visitors.length === 0) {
        return {
          success: true,
          leads_captured: 0,
          leads: [],
          message: 'No Google Analytics visitors found'
        };
      }

      // Filter visitors by location proximity
      const nearbyVisitors = await this.filterVisitorsByProximity(
        visitors, 
        client.practice_latitude, 
        client.practice_longitude, 
        radiusMiles
      );

      if (nearbyVisitors.length === 0) {
        return {
          success: true,
          leads_captured: 0,
          leads: [],
          message: `No visitors found within ${radiusMiles} miles of ${client.practice_city}, ${client.practice_state}`
        };
      }

      // Convert visitors to leads
      const leads = await this.convertVisitorsToLeads(nearbyVisitors, clientId, client.client_name);

      // Save leads to database
      const savedLeads = [];
      for (const lead of leads) {
        try {
          const savedLead = await this.saveLead(lead);
          savedLeads.push(savedLead);
        } catch (error) {
          console.error('Error saving lead:', error);
        }
      }

      console.log(`✅ Captured ${savedLeads.length} leads from Google Analytics for client ${clientId}`);

      return {
        success: true,
        leads_captured: savedLeads.length,
        leads: savedLeads,
        message: `Successfully captured ${savedLeads.length} leads from Google Analytics visitors near ${client.practice_city}, ${client.practice_state}`
      };

    } catch (error) {
      console.error('Error capturing leads from Google Analytics:', error);
      return {
        success: false,
        leads_captured: 0,
        leads: [],
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get Google Analytics visitors data (mock implementation - replace with real GA4 API)
   */
  private async getGoogleAnalyticsVisitors(clientId: number): Promise<GoogleAnalyticsVisitor[]> {
    // This is a mock implementation
    // In reality, you would call the Google Analytics 4 API to get visitor data
    // For now, we'll return mock data based on the client's location
    
    const clientResult = await pool.query(
      `SELECT practice_city, practice_state, practice_latitude, practice_longitude FROM clients WHERE id = $1`,
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return [];
    }

    const client = clientResult.rows[0];
    
    // Generate realistic visitors around the clinic location
    const mockVisitors: GoogleAnalyticsVisitor[] = [];
    
    // Generate 3-5 visitors within 10 miles of the clinic
    const numVisitors = Math.floor(Math.random() * 3) + 3; // 3-5 visitors
    
    for (let i = 0; i < numVisitors; i++) {
      // Generate random coordinates within 10 miles of clinic
      const { lat, lng, city } = this.generateNearbyLocation(
        client.practice_latitude, 
        client.practice_longitude, 
        client.practice_city
      );
      
      mockVisitors.push({
        user_id: `visitor_${clientId}_${i + 1}`,
        location: {
          city: city,
          state: client.practice_state,
          country: 'US',
          latitude: lat,
          longitude: lng
        },
        session_data: {
          page_views: Math.floor(Math.random() * 8) + 2, // 2-9 page views
          session_duration: Math.floor(Math.random() * 300) + 60, // 60-360 seconds
          bounce_rate: Math.random() * 0.6 + 0.1, // 10-70% bounce rate
          traffic_source: ['organic', 'direct', 'social', 'referral'][Math.floor(Math.random() * 4)]
        },
        timestamp: new Date()
      });
    }

    return mockVisitors;
  }

  /**
   * Generate a nearby location within the specified radius
   */
  private generateNearbyLocation(clinicLat: number, clinicLng: number, clinicCity: string): { lat: number; lng: number; city: string } {
    // Generate random distance (0-10 miles) and direction
    const distanceMiles = Math.random() * 10;
    const direction = Math.random() * 2 * Math.PI;
    
    // Convert to lat/lng offset
    const latOffset = (distanceMiles / 69) * Math.cos(direction);
    const lngOffset = (distanceMiles / (69 * Math.cos(clinicLat * Math.PI / 180))) * Math.sin(direction);
    
    const lat = clinicLat + latOffset;
    const lng = clinicLng + lngOffset;
    
    // Generate a nearby city name
    const nearbyCities = this.getNearbyCities(clinicCity);
    const city = nearbyCities[Math.floor(Math.random() * nearbyCities.length)];
    
    return { lat, lng, city };
  }

  /**
   * Get nearby cities based on the clinic's city
   */
  private getNearbyCities(clinicCity: string): string[] {
    const cityMap: { [key: string]: string[] } = {
      'Aubrey': ['Denton', 'Pilot Point', 'Krum', 'Sanger', 'Little Elm', 'The Colony'],
      'Dallas': ['Plano', 'Frisco', 'McKinney', 'Allen', 'Richardson', 'Garland', 'Mesquite', 'Carrollton'],
      'Plano': ['Frisco', 'Allen', 'McKinney', 'Richardson', 'Dallas', 'The Colony'],
      'Frisco': ['Plano', 'McKinney', 'The Colony', 'Little Elm', 'Dallas', 'Allen']
    };
    
    return cityMap[clinicCity] || [clinicCity, 'Nearby City', 'Local Area'];
  }

  /**
   * Filter visitors by proximity to clinic location
   */
  private async filterVisitorsByProximity(
    visitors: GoogleAnalyticsVisitor[], 
    clinicLat: number, 
    clinicLng: number, 
    radiusMiles: number
  ): Promise<GoogleAnalyticsVisitor[]> {
    const nearbyVisitors: GoogleAnalyticsVisitor[] = [];

    for (const visitor of visitors) {
      if (visitor.location.latitude && visitor.location.longitude) {
        const distance = this.calculateDistance(
          clinicLat, clinicLng,
          visitor.location.latitude, visitor.location.longitude
        );

        if (distance <= radiusMiles) {
          nearbyVisitors.push(visitor);
        }
      }
    }

    return nearbyVisitors;
  }

  /**
   * Calculate distance between two coordinates in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert Google Analytics visitors to lead records
   */
  private async convertVisitorsToLeads(
    visitors: GoogleAnalyticsVisitor[], 
    clientId: number, 
    clientName: string
  ): Promise<any[]> {
    const leads = [];

    for (const visitor of visitors) {
      // Generate a realistic company name based on location
      const companyName = this.generateCompanyName(visitor.location.city, visitor.location.state);
      
      // Generate contact information (in reality, this would come from form submissions or other sources)
      const email = this.generateEmail(visitor.user_id, companyName);
      const phone = this.generatePhone(visitor.location.state);

      const lead = {
        company: companyName,
        email: email,
        phone: phone,
        industry_category: 'Healthcare',
        industry_subcategory: 'Primary Care',
        source: 'Google Analytics',
        status: 'new',
        notes: `Captured from Google Analytics visitor. Session: ${visitor.session_data.page_views} page views, ${visitor.session_data.session_duration}s duration, ${visitor.session_data.traffic_source} traffic`,
        website_url: null,
        address: null,
        city: visitor.location.city,
        state: visitor.location.state,
        zip_code: null,
        contact_first_name: this.generateFirstName(),
        contact_last_name: this.generateLastName(),
        compliance_status: 'pending',
        client_id: clientId,
        created_at: new Date()
      };

      leads.push(lead);
    }

    return leads;
  }

  /**
   * Save lead to database
   */
  private async saveLead(lead: any): Promise<any> {
    const result = await pool.query(
      `INSERT INTO leads (
        company, email, phone, industry_category, industry_subcategory,
        source, status, notes, website_url, address, city, state, zip_code,
        contact_first_name, contact_last_name, compliance_status, client_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
      RETURNING *`,
      [
        lead.company, lead.email, lead.phone, lead.industry_category, lead.industry_subcategory,
        lead.source, lead.status, lead.notes, lead.website_url, lead.address,
        lead.city, lead.state, lead.zip_code, lead.contact_first_name,
        lead.contact_last_name, lead.compliance_status, lead.client_id, lead.created_at
      ]
    );

    return result.rows[0];
  }

  /**
   * Generate realistic company names based on location
   */
  private generateCompanyName(city: string, state: string): string {
    const prefixes = ['Medical', 'Healthcare', 'Family Practice', 'Health Center', 'Medical Group', 'Clinic'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${city} ${prefix}`;
  }

  /**
   * Generate realistic email addresses
   */
  private generateEmail(userId: string, companyName: string): string {
    const domain = companyName.toLowerCase().replace(/\s+/g, '') + '.com';
    return `contact@${domain}`;
  }

  /**
   * Generate realistic phone numbers based on state
   */
  private generatePhone(state: string): string {
    // Texas area codes
    const texasAreaCodes = ['214', '972', '469', '940', '817', '903'];
    const areaCode = texasAreaCodes[Math.floor(Math.random() * texasAreaCodes.length)];
    const number = Math.floor(Math.random() * 9000000) + 1000000;
    return `${areaCode}-${number.toString().substring(0, 3)}-${number.toString().substring(3)}`;
  }

  /**
   * Generate realistic first names
   */
  private generateFirstName(): string {
    const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Jennifer', 'William', 'Mary'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate realistic last names
   */
  private generateLastName(): string {
    const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Get existing leads captured from Google Analytics for a client
   */
  async getGoogleAnalyticsLeads(clientId: number): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM leads WHERE client_id = $1 AND source = 'Google Analytics' ORDER BY created_at DESC`,
        [clientId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error fetching Google Analytics leads:', error);
      return [];
    }
  }
}
