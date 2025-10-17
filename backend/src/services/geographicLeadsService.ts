import pool from '../config/database';

export interface GeographicLead {
  id: number;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  geo_latitude: number;
  geo_longitude: number;
  google_place_id: string;
  google_rating: number;
  distance_miles: number;
  created_at: string;
}

export interface PracticeLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface GeographicLeadsData {
  practice_location: PracticeLocation;
  total_leads: number;
  leads_within_25_miles: number;
  leads_within_50_miles: number;
  leads_within_100_miles: number;
  leads_by_distance: GeographicLead[];
  leads_by_city: Array<{
    city: string;
    state: string;
    count: number;
    leads: GeographicLead[];
  }>;
  average_distance: number;
  furthest_lead_distance: number;
}

export class GeographicLeadsService {
  private static instance: GeographicLeadsService;

  public static getInstance(): GeographicLeadsService {
    if (!GeographicLeadsService.instance) {
      GeographicLeadsService.instance = new GeographicLeadsService();
    }
    return GeographicLeadsService.instance;
  }

  // Calculate distance between two coordinates using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get practice location coordinates (you'll need to add these to your clients table)
  private async getPracticeLocation(clientId: number): Promise<PracticeLocation | null> {
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(practice_latitude, 33.2148) as latitude,
          COALESCE(practice_longitude, -96.6331) as longitude,
          COALESCE(practice_address, 'Aubrey, TX') as address,
          COALESCE(practice_city, 'Aubrey') as city,
          COALESCE(practice_state, 'TX') as state,
          COALESCE(practice_zip_code, '76227') as zip_code
        FROM clients 
        WHERE id = $1
      `, [clientId]);

      if (result.rows.length === 0) {
        return null;
      }

      const client = result.rows[0];
      return {
        latitude: parseFloat(client.latitude),
        longitude: parseFloat(client.longitude),
        address: client.address,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code
      };
    } catch (error) {
      console.error('Error getting practice location:', error);
      return null;
    }
  }

  // Get leads with geographic data for a client
  async getGeographicLeadsData(clientId: number, maxDistanceMiles: number = 100): Promise<GeographicLeadsData | null> {
    try {
      console.log(`🗺️ Getting geographic leads data for client ${clientId} within ${maxDistanceMiles} miles`);

      // Get practice location
      const practiceLocation = await this.getPracticeLocation(clientId);
      if (!practiceLocation) {
        console.error('❌ No practice location found for client', clientId);
        return null;
      }

      console.log(`📍 Practice location: ${practiceLocation.city}, ${practiceLocation.state} (${practiceLocation.latitude}, ${practiceLocation.longitude})`);

      // Get all leads for this client with geographic data
      const leadsResult = await pool.query(`
        SELECT 
          id, email, phone, company, address, city, state, zip_code,
          geo_latitude, geo_longitude, google_place_id, google_rating, created_at
        FROM leads 
        WHERE client_id = $1 
        AND geo_latitude IS NOT NULL 
        AND geo_longitude IS NOT NULL
        ORDER BY created_at DESC
      `, [clientId]);

      const allLeads = leadsResult.rows;
      console.log(`📊 Found ${allLeads.length} leads with geographic data`);

      // Calculate distances and filter by max distance
      const leadsWithDistance: GeographicLead[] = allLeads
        .map(lead => {
          const distance = this.calculateDistance(
            practiceLocation.latitude,
            practiceLocation.longitude,
            parseFloat(lead.geo_latitude),
            parseFloat(lead.geo_longitude)
          );
          return {
            ...lead,
            distance_miles: Math.round(distance * 10) / 10 // Round to 1 decimal place
          };
        })
        .filter(lead => lead.distance_miles <= maxDistanceMiles)
        .sort((a, b) => a.distance_miles - b.distance_miles);

      console.log(`📍 Found ${leadsWithDistance.length} leads within ${maxDistanceMiles} miles`);

      // Group leads by city
      const leadsByCity = leadsWithDistance.reduce((acc, lead) => {
        const cityKey = `${lead.city}, ${lead.state}`;
        if (!acc[cityKey]) {
          acc[cityKey] = {
            city: lead.city,
            state: lead.state,
            count: 0,
            leads: []
          };
        }
        acc[cityKey].count++;
        acc[cityKey].leads.push(lead);
        return acc;
      }, {} as Record<string, { city: string; state: string; count: number; leads: GeographicLead[] }>);

      // Calculate statistics
      const totalLeads = allLeads.length;
      const leadsWithin25Miles = leadsWithDistance.filter(lead => lead.distance_miles <= 25).length;
      const leadsWithin50Miles = leadsWithDistance.filter(lead => lead.distance_miles <= 50).length;
      const leadsWithin100Miles = leadsWithDistance.filter(lead => lead.distance_miles <= 100).length;
      
      const averageDistance = leadsWithDistance.length > 0 
        ? leadsWithDistance.reduce((sum, lead) => sum + lead.distance_miles, 0) / leadsWithDistance.length
        : 0;
      
      const furthestLeadDistance = leadsWithDistance.length > 0 
        ? Math.max(...leadsWithDistance.map(lead => lead.distance_miles))
        : 0;

      const result: GeographicLeadsData = {
        practice_location: practiceLocation,
        total_leads: totalLeads,
        leads_within_25_miles: leadsWithin25Miles,
        leads_within_50_miles: leadsWithin50Miles,
        leads_within_100_miles: leadsWithin100Miles,
        leads_by_distance: leadsWithDistance,
        leads_by_city: Object.values(leadsByCity).sort((a, b) => b.count - a.count),
        average_distance: Math.round(averageDistance * 10) / 10,
        furthest_lead_distance: Math.round(furthestLeadDistance * 10) / 10
      };

      console.log(`✅ Geographic leads data generated:`, {
        totalLeads: result.total_leads,
        within25Miles: result.leads_within_25_miles,
        within50Miles: result.leads_within_50_miles,
        within100Miles: result.leads_within_100_miles,
        averageDistance: result.average_distance,
        furthestDistance: result.furthest_lead_distance
      });

      return result;
    } catch (error) {
      console.error('Error getting geographic leads data:', error);
      return null;
    }
  }

  // Get leads within a specific radius
  async getLeadsWithinRadius(clientId: number, radiusMiles: number): Promise<GeographicLead[]> {
    try {
      const practiceLocation = await this.getPracticeLocation(clientId);
      if (!practiceLocation) {
        return [];
      }

      const leadsResult = await pool.query(`
        SELECT 
          id, email, phone, company, address, city, state, zip_code,
          geo_latitude, geo_longitude, google_place_id, google_rating, created_at
        FROM leads 
        WHERE client_id = $1 
        AND geo_latitude IS NOT NULL 
        AND geo_longitude IS NOT NULL
        ORDER BY created_at DESC
      `, [clientId]);

      const leadsWithDistance = leadsResult.rows
        .map(lead => {
          const distance = this.calculateDistance(
            practiceLocation.latitude,
            practiceLocation.longitude,
            parseFloat(lead.geo_latitude),
            parseFloat(lead.geo_longitude)
          );
          return {
            ...lead,
            distance_miles: Math.round(distance * 10) / 10
          };
        })
        .filter(lead => lead.distance_miles <= radiusMiles)
        .sort((a, b) => a.distance_miles - b.distance_miles);

      return leadsWithDistance;
    } catch (error) {
      console.error('Error getting leads within radius:', error);
      return [];
    }
  }
}
