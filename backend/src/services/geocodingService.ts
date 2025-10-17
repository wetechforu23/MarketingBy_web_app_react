import pool from '../config/database';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  status: 'success' | 'failed';
  error?: string;
}

export class GeocodingService {
  private static instance: GeocodingService;
  private apiKey: string;

  private constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API key not found. Geocoding will not work.');
    }
  }

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Geocode a single address using Google Geocoding API (free quota)
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    if (!this.apiKey) {
      return {
        latitude: 0,
        longitude: 0,
        formatted_address: address,
        status: 'failed',
        error: 'Google Maps API key not configured'
      };
    }

    try {
      console.log(`🌍 Geocoding address: ${address}`);
      
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        console.log(`✅ Geocoded successfully: ${location.lat}, ${location.lng}`);
        
        return {
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: result.formatted_address,
          status: 'success'
        };
      } else {
        console.warn(`⚠️ Geocoding failed for: ${address} - Status: ${data.status}`);
        return {
          latitude: 0,
          longitude: 0,
          formatted_address: address,
          status: 'failed',
          error: data.status || 'Unknown error'
        };
      }
    } catch (error) {
      console.error(`❌ Geocoding error for ${address}:`, error);
      return {
        latitude: 0,
        longitude: 0,
        formatted_address: address,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Geocode a lead by ID
   */
  async geocodeLead(leadId: number): Promise<GeocodingResult> {
    try {
      const result = await pool.query(
        'SELECT id, company, address, city, state, zip_code FROM leads WHERE id = $1',
        [leadId]
      );

      if (result.rows.length === 0) {
        return {
          latitude: 0,
          longitude: 0,
          formatted_address: '',
          status: 'failed',
          error: 'Lead not found'
        };
      }

      const lead = result.rows[0];
      const fullAddress = `${lead.address || ''}, ${lead.city || ''}, ${lead.state || ''} ${lead.zip_code || ''}`.trim();
      
      const geocodingResult = await this.geocodeAddress(fullAddress);
      
      // Update the lead with geocoding results
      if (geocodingResult.status === 'success') {
        await pool.query(
          `UPDATE leads 
           SET latitude = $1, longitude = $2, geocoded_at = NOW(), geocoding_status = 'completed'
           WHERE id = $3`,
          [geocodingResult.latitude, geocodingResult.longitude, leadId]
        );
      } else {
        await pool.query(
          `UPDATE leads 
           SET geocoding_status = 'failed'
           WHERE id = $1`,
          [leadId]
        );
      }

      return geocodingResult;
    } catch (error) {
      console.error(`❌ Error geocoding lead ${leadId}:`, error);
      return {
        latitude: 0,
        longitude: 0,
        formatted_address: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Geocode all pending leads (batch processing)
   */
  async geocodeAllPendingLeads(): Promise<{success: number, failed: number, total: number}> {
    try {
      const result = await pool.query(
        'SELECT id FROM leads WHERE geocoding_status = \'pending\' AND latitude IS NULL ORDER BY created_at DESC'
      );

      const leads = result.rows;
      let success = 0;
      let failed = 0;

      console.log(`🔄 Starting batch geocoding for ${leads.length} leads...`);

      for (const lead of leads) {
        const geocodingResult = await this.geocodeLead(lead.id);
        
        if (geocodingResult.status === 'success') {
          success++;
        } else {
          failed++;
        }

        // Add small delay to respect API rate limits (free quota)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Batch geocoding completed: ${success} success, ${failed} failed`);

      return {
        success,
        failed,
        total: leads.length
      };
    } catch (error) {
      console.error('❌ Error in batch geocoding:', error);
      return {
        success: 0,
        failed: 0,
        total: 0
      };
    }
  }

  /**
   * Get leads with coordinates for heatmap
   */
  async getLeadsWithCoordinates(clientId: number): Promise<Array<{
    id: number;
    company: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    distance_miles?: number;
  }>> {
    try {
      const result = await pool.query(`
        SELECT 
          l.id, 
          l.company, 
          l.latitude, 
          l.longitude, 
          l.city, 
          l.state,
          l.geocoded_at
        FROM leads l
        WHERE l.client_id = $1 
        AND l.latitude IS NOT NULL 
        AND l.longitude IS NOT NULL
        AND l.geocoding_status = 'completed'
        ORDER BY l.geocoded_at DESC
      `, [clientId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting leads with coordinates:', error);
      return [];
    }
  }
}
