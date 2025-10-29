import axios from 'axios';

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  business_status?: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface PlacesSearchResult {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

export interface PlaceDetailsResult {
  result: GooglePlace;
  status: string;
}

export class GooglePlacesService {
  private static instance: GooglePlacesService;
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/place';

  private constructor() {
    // Try to get API key from environment first, then from database
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('GOOGLE_MAPS_API_KEY not in environment. Will try to load from encrypted credentials database.');
      this.loadApiKeyFromDatabase();
    } else {
      console.log('✅ Google Places API initialized with API key from environment');
    }
  }

  private async loadApiKeyFromDatabase() {
    try {
      const pool = require('../config/database').default;
      const { CredentialManagementService } = require('./credentialManagementService');
      
      const credService = new CredentialManagementService();
      const apiKey = await credService.getCredential('google_maps', 'api_key');
      
      if (apiKey) {
        this.apiKey = apiKey;
        console.log('✅ Google Places API key loaded from encrypted database');
      } else {
        console.error('❌ Google Places API key not found in database');
      }
    } catch (error: any) {
      console.error('❌ Failed to load Google Places API key from database:', error.message);
    }
  }

  public static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
    }
    return GooglePlacesService.instance;
  }

  /**
   * Search for healthcare businesses near a location
   */
  async searchHealthcareBusinesses(
    location: string,
    radius: number = 5000,
    keyword?: string
  ): Promise<GooglePlace[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key is not configured');
    }

    try {
      const params = {
        key: this.apiKey,
        location: location,
        radius: radius,
        keyword: keyword || 'healthcare clinic medical doctor',
        // Removed type: 'hospital' to allow clinics, doctors offices, urgent care, etc.
      };

      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, { params });
      const data: PlacesSearchResult = response.data;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Error searching healthcare businesses:', error);
      throw error;
    }
  }

  /**
   * Text search for businesses (doesn't require location coordinates)
   */
  async textSearch(
    query: string,
    radius?: number
  ): Promise<GooglePlace[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key is not configured');
    }

    try {
      const params: any = {
        key: this.apiKey,
        query: query,
      };

      if (radius) {
        params.radius = radius;
      }

      const response = await axios.get(`${this.baseUrl}/textsearch/json`, { params });
      const data: PlacesSearchResult = response.data;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.results || [];
    } catch (error) {
      console.error('Error in text search:', error);
      throw error;
    }
  }

  /**
   * Search for businesses by zip code
   */
  async searchByZipCode(
    zipCode: string,
    businessType: string = 'healthcare',
    radius: number = 10000
  ): Promise<GooglePlace[]> {
    if (!this.apiKey) {
      throw new Error('Google Places API key is not configured');
    }

    try {
      // First, get the coordinates for the zip code using Geocoding API
      const geocodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode}&key=${this.apiKey}`
      );

      if (geocodeResponse.data.status !== 'OK' || !geocodeResponse.data.results.length) {
        throw new Error(`Could not find coordinates for zip code: ${zipCode}`);
      }

      const location = geocodeResponse.data.results[0].geometry.location;
      const locationString = `${location.lat},${location.lng}`;

      // Now search for businesses near this location
      return await this.searchHealthcareBusinesses(locationString, radius, businessType);
    } catch (error) {
      console.error('Error searching by zip code:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    if (!this.apiKey) {
      throw new Error('Google Places API key is not configured');
    }

    try {
      const params = {
        key: this.apiKey,
        place_id: placeId,
        fields: 'place_id,name,formatted_address,address_components,geometry,types,rating,user_ratings_total,price_level,business_status,formatted_phone_number,website,opening_hours,photos',
      };

      const response = await axios.get(`${this.baseUrl}/details/json`, { params });
      const data: PlaceDetailsResult = response.data;

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  }

  /**
   * Convert Google Place to Lead format
   */
  convertPlaceToLead(place: GooglePlace, source: string = 'Google Places'): any {
    // Extract detailed address components
    const addressDetails = this.extractDetailedAddress(place);
    
    return {
      name: place.name,
      company: place.name,
      website_url: place.website || '',
      phone: place.formatted_phone_number || '',
      address: addressDetails.full_address,  // Full formatted address
      city: addressDetails.city,
      state: addressDetails.state,
      zip_code: addressDetails.zip_code,
      lead_source: source,
      status: 'new',
      notes: `Found via Google Places API. Address: ${addressDetails.street}. Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}`,
      industry_category: 'Healthcare',
      industry_subcategory: this.determineHealthcareSubcategory(place.types),
      compliance_status: 'pending',
      // Store additional Google Places data
      google_place_id: place.place_id,
      google_rating: place.rating,
      google_review_count: place.user_ratings_total,
      google_business_status: place.business_status,
      // Store geo-location
      geo_latitude: place.geometry.location.lat,
      geo_longitude: place.geometry.location.lng,
    };
  }

  /**
   * Search for multiple locations and return leads
   */
  async searchMultipleLocations(
    locations: Array<{ zipCode: string; radius?: number }>,
    businessType: string = 'healthcare'
  ): Promise<any[]> {
    const allLeads: any[] = [];

    for (const location of locations) {
      try {
        const places = await this.searchByZipCode(
          location.zipCode,
          businessType,
          location.radius || 10000
        );

        const leads = places.map(place => 
          this.convertPlaceToLead(place, `Google Places - ${location.zipCode}`)
        );

        allLeads.push(...leads);
      } catch (error) {
        console.error(`Error searching location ${location.zipCode}:`, error);
        // Continue with other locations
      }
    }

    return allLeads;
  }

  /**
   * Extract detailed address components from Google Place
   * Returns street address, city, state, zip code separately
   */
  private extractDetailedAddress(place: GooglePlace): {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
  } {
    const result = {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      full_address: place.formatted_address || ''
    };

    // If address_components are available, use them for more accurate parsing
    if (place.address_components && place.address_components.length > 0) {
      for (const component of place.address_components) {
        if (component.types.includes('street_number')) {
          result.street = component.long_name + ' ';
        }
        if (component.types.includes('route')) {
          result.street += component.long_name;
        }
        if (component.types.includes('locality')) {
          result.city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          result.state = component.short_name;
        }
        if (component.types.includes('postal_code')) {
          result.zip_code = component.long_name;
        }
      }
      result.street = result.street.trim();
    } else {
      // Fallback to parsing formatted_address
      const parts = place.formatted_address?.split(',') || [];
      if (parts.length > 0) result.street = parts[0].trim();
      if (parts.length > 1) result.city = parts[1].trim();
      if (parts.length > 2) {
        const stateZip = parts[2].trim().split(' ');
        result.state = stateZip[0] || '';
        result.zip_code = stateZip[1] || '';
      }
    }

    return result;
  }

  private extractCityFromAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(',');
    return parts.length > 1 ? parts[1].trim() : '';
  }

  private extractStateFromAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length > 2) {
      const stateZip = parts[2].trim().split(' ');
      return stateZip[0] || '';
    }
    return '';
  }

  private extractZipFromAddress(address: string): string {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length > 2) {
      const stateZip = parts[2].trim().split(' ');
      return stateZip[1] || '';
    }
    return '';
  }

  private determineHealthcareSubcategory(types: string[]): string {
    const typeMap: { [key: string]: string } = {
      'hospital': 'Hospital',
      'doctor': 'Medical Practice',
      'dentist': 'Dental Practice',
      'pharmacy': 'Pharmacy',
      'physiotherapist': 'Physical Therapy',
      'veterinary_care': 'Veterinary',
      'health': 'General Healthcare',
    };

    for (const type of types) {
      if (typeMap[type]) {
        return typeMap[type];
      }
    }

    return 'Healthcare Services';
  }
}
