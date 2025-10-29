import { GooglePlacesService, GooglePlace } from './googlePlacesService';
import pool from '../config/database';

export interface LocalSearchResult {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  review_count: number;
  distance: number;
  business_status: string;
  website?: string;
  phone?: string;
  position: number; // Ranking position in search results
  competitor_analysis: {
    is_competitor: boolean;
    competitor_type: 'direct' | 'indirect' | 'none';
    market_share_estimate: number;
    strengths: string[];
    weaknesses: string[];
  };
}

export interface LocalSearchGrid {
  client_id: number;
  search_queries: string[];
  search_results: {
    [query: string]: LocalSearchResult[];
  };
  competitor_analysis: {
    total_competitors: number;
    direct_competitors: number;
    market_share_estimate: number;
    top_competitors: LocalSearchResult[];
    market_gaps: string[];
  };
  local_seo_score: number;
  ranking_trends: {
    [query: string]: {
      current_position: number;
      previous_position?: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
  };
  generated_at: Date;
}

export interface LocalSearchFilters {
  radius: number; // in meters
  search_queries: string[];
  include_competitors: boolean;
  include_rankings: boolean;
  include_analysis: boolean;
}

export class LocalSearchService {
  private static instance: LocalSearchService;
  private googlePlacesService: GooglePlacesService;

  private constructor() {
    this.googlePlacesService = GooglePlacesService.getInstance();
  }

  public static getInstance(): LocalSearchService {
    if (!LocalSearchService.instance) {
      LocalSearchService.instance = new LocalSearchService();
    }
    return LocalSearchService.instance;
  }

  /**
   * Generate comprehensive local search grid for a client
   */
  async generateLocalSearchGrid(
    clientId: number,
    filters: LocalSearchFilters
  ): Promise<LocalSearchGrid> {
    console.log(`🔍 Generating local search grid for client ${clientId}`);

    try {
      // Get client information
      const client = await this.getClientInfo(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found`);
      }

      console.log(`📋 Client found: ${client.name} (${client.email})`);

      // Get client's location
      const clientLocation = await this.getClientLocation(client);
      console.log(`📍 Client location: ${clientLocation}`);
      
      // Perform local searches for each query
      const searchResults: { [query: string]: LocalSearchResult[] } = {};
      const rankingTrends: { [query: string]: any } = {};

      for (const query of filters.search_queries) {
        console.log(`🔍 Searching for: "${query}" near ${client.name}`);
        
        const results = await this.performLocalSearch(
          clientLocation,
          query,
          filters.radius,
          client
        );

        searchResults[query] = results;
        
        // Get ranking trends for this query
        if (filters.include_rankings) {
          rankingTrends[query] = await this.getRankingTrends(clientId, query, results);
        }
      }

      // Perform competitor analysis
      const competitorAnalysis = await this.performCompetitorAnalysis(
        searchResults,
        client,
        filters.include_competitors
      );

      // Calculate local SEO score
      const localSeoScore = await this.calculateLocalSeoScore(
        searchResults,
        competitorAnalysis,
        client
      );

      const localSearchGrid: LocalSearchGrid = {
        client_id: clientId,
        search_queries: filters.search_queries,
        search_results: searchResults,
        competitor_analysis: competitorAnalysis,
        local_seo_score: localSeoScore,
        ranking_trends: rankingTrends,
        generated_at: new Date()
      };

      // Store the results in database
      await this.storeLocalSearchGrid(localSearchGrid);

      console.log(`✅ Local search grid generated for client ${clientId}`);
      return localSearchGrid;

    } catch (error) {
      console.error('❌ Error generating local search grid:', error);
      console.error('❌ Error details:', {
        clientId,
        filters,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Perform local search for a specific query
   */
  private async performLocalSearch(
    location: string,
    query: string,
    radius: number,
    client: any
  ): Promise<LocalSearchResult[]> {
    try {
      console.log(`🔍 Performing local search for: "${query}" near ${location}`);
      
      // Use Google Places API to search for businesses
      const places = await this.googlePlacesService.textSearch(query);
      console.log(`📍 Found ${places.length} places for query: "${query}"`);
      
      // Filter results by radius and convert to LocalSearchResult format
      const results: LocalSearchResult[] = [];
      
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        
        // Calculate distance from client location
        const distance = await this.calculateDistance(
          location,
          `${place.geometry.location.lat},${place.geometry.location.lng}`
        );

        // Only include results within the specified radius
        if (distance <= radius) {
          const result: LocalSearchResult = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating || 0,
            review_count: place.user_ratings_total || 0,
            distance: distance,
            business_status: place.business_status || 'OPERATIONAL',
            website: place.website,
            phone: place.formatted_phone_number,
            position: i + 1,
            competitor_analysis: await this.analyzeCompetitor(place, client)
          };

          results.push(result);
        }
      }

      console.log(`✅ Local search completed for "${query}": ${results.length} results`);
      return results;
    } catch (error) {
      console.error('❌ Error performing local search:', error);
      console.error('❌ Search details:', {
        query,
        location,
        radius,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Analyze if a place is a competitor
   */
  private async analyzeCompetitor(place: GooglePlace, client: any): Promise<any> {
    const analysis = {
      is_competitor: false,
      competitor_type: 'none' as 'direct' | 'indirect' | 'none',
      market_share_estimate: 0,
      strengths: [] as string[],
      weaknesses: [] as string[]
    };

    // Check if it's the client's own business
    if (place.name.toLowerCase().includes(client.name.toLowerCase()) ||
        place.formatted_address.toLowerCase().includes(client.address?.toLowerCase() || '')) {
      return analysis; // Not a competitor, it's the client
    }

    // Determine competitor type based on business types and keywords
    const healthcareKeywords = ['clinic', 'medical', 'doctor', 'healthcare', 'hospital', 'dental', 'pharmacy'];
    const hasHealthcareKeywords = healthcareKeywords.some(keyword => 
      place.name.toLowerCase().includes(keyword) ||
      place.types.some(type => type.includes(keyword))
    );

    if (hasHealthcareKeywords) {
      analysis.is_competitor = true;
      
      // Determine if direct or indirect competitor
      const directKeywords = ['clinic', 'medical', 'doctor', 'healthcare'];
      const hasDirectKeywords = directKeywords.some(keyword => 
        place.name.toLowerCase().includes(keyword)
      );

      analysis.competitor_type = hasDirectKeywords ? 'direct' : 'indirect';

      // Estimate market share based on rating and review count
      analysis.market_share_estimate = this.estimateMarketShare(place);

      // Analyze strengths and weaknesses
      analysis.strengths = this.analyzeStrengths(place);
      analysis.weaknesses = this.analyzeWeaknesses(place);
    }

    return analysis;
  }

  /**
   * Perform comprehensive competitor analysis
   */
  private async performCompetitorAnalysis(
    searchResults: { [query: string]: LocalSearchResult[] },
    client: any,
    includeCompetitors: boolean
  ): Promise<any> {
    if (!includeCompetitors) {
      return {
        total_competitors: 0,
        direct_competitors: 0,
        market_share_estimate: 0,
        top_competitors: [],
        market_gaps: []
      };
    }

    const allCompetitors: LocalSearchResult[] = [];
    let directCompetitors = 0;
    let totalMarketShare = 0;

    // Collect all competitors from all search results
    for (const query in searchResults) {
      const results = searchResults[query];
      for (const result of results) {
        if (result.competitor_analysis.is_competitor) {
          allCompetitors.push(result);
          totalMarketShare += result.competitor_analysis.market_share_estimate;
          
          if (result.competitor_analysis.competitor_type === 'direct') {
            directCompetitors++;
          }
        }
      }
    }

    // Remove duplicates based on place_id
    const uniqueCompetitors = allCompetitors.filter((competitor, index, self) =>
      index === self.findIndex(c => c.place_id === competitor.place_id)
    );

    // Sort by market share and rating
    const topCompetitors = uniqueCompetitors
      .sort((a, b) => {
        const scoreA = (a.competitor_analysis.market_share_estimate * 0.7) + (a.rating * 0.3);
        const scoreB = (b.competitor_analysis.market_share_estimate * 0.7) + (b.rating * 0.3);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Identify market gaps
    const marketGaps = this.identifyMarketGaps(uniqueCompetitors, client);

    return {
      total_competitors: uniqueCompetitors.length,
      direct_competitors: directCompetitors,
      market_share_estimate: totalMarketShare,
      top_competitors: topCompetitors,
      market_gaps: marketGaps
    };
  }

  /**
   * Calculate local SEO score
   */
  private async calculateLocalSeoScore(
    searchResults: { [query: string]: LocalSearchResult[] },
    competitorAnalysis: any,
    client: any
  ): Promise<number> {
    let score = 0;
    let totalQueries = 0;

    // Calculate ranking score for each query
    for (const query in searchResults) {
      const results = searchResults[query];
      const clientResult = results.find(result => 
        result.name.toLowerCase().includes(client.name.toLowerCase())
      );

      if (clientResult) {
        // Better ranking = higher score
        const rankingScore = Math.max(0, 100 - (clientResult.position * 5));
        score += rankingScore;
      } else {
        // Not found in results = 0 score for this query
        score += 0;
      }
      totalQueries++;
    }

    // Calculate average score
    const averageScore = totalQueries > 0 ? score / totalQueries : 0;

    // Adjust based on competitor analysis
    const competitorPenalty = Math.min(20, competitorAnalysis.total_competitors * 2);
    const finalScore = Math.max(0, averageScore - competitorPenalty);

    return Math.round(finalScore);
  }

  /**
   * Get ranking trends for a query
   */
  private async getRankingTrends(
    clientId: number,
    query: string,
    currentResults: LocalSearchResult[]
  ): Promise<any> {
    try {
      // Get previous ranking data from database
      const previousData = await this.getPreviousRankingData(clientId, query);
      
      const clientResult = currentResults.find(result => 
        result.name.toLowerCase().includes('client') // This would need to be more specific
      );

      if (!clientResult) {
        return {
          current_position: 0,
          previous_position: previousData?.position,
          trend: 'down' as const,
          change: previousData?.position ? previousData.position : 0
        };
      }

      const currentPosition = clientResult.position;
      const previousPosition = previousData?.position;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let change = 0;

      if (previousPosition) {
        change = previousPosition - currentPosition; // Positive = improved ranking
        if (change > 0) trend = 'up';
        else if (change < 0) trend = 'down';
        else trend = 'stable';
      }

      return {
        current_position: currentPosition,
        previous_position: previousPosition,
        trend: trend,
        change: change
      };
    } catch (error) {
      console.error('Error getting ranking trends:', error);
      return {
        current_position: 0,
        previous_position: undefined,
        trend: 'stable' as const,
        change: 0
      };
    }
  }

  /**
   * Store local search grid in database
   */
  private async storeLocalSearchGrid(grid: LocalSearchGrid): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO local_search_grids (
          client_id, search_queries, search_results, competitor_analysis,
          local_seo_score, ranking_trends, generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (client_id) DO UPDATE SET
          search_queries = $2,
          search_results = $3,
          competitor_analysis = $4,
          local_seo_score = $5,
          ranking_trends = $6,
          generated_at = $7
      `, [
        grid.client_id,
        JSON.stringify(grid.search_queries),
        JSON.stringify(grid.search_results),
        JSON.stringify(grid.competitor_analysis),
        grid.local_seo_score,
        JSON.stringify(grid.ranking_trends),
        grid.generated_at
      ]);
    } catch (error) {
      console.error('Error storing local search grid:', error);
      throw error;
    }
  }

  /**
   * Get client information
   */
  private async getClientInfo(clientId: number): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM clients WHERE id = $1',
        [clientId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting client info:', error);
      return null;
    }
  }

  /**
   * Get client location for search
   */
  private async getClientLocation(client: any): Promise<string> {
    // Use client's address or coordinates
    if (client.address) {
      return client.address;
    }
    
    // If no address, use a default location (this should be improved)
    return 'Dallas, TX'; // Default location
  }

  /**
   * Calculate distance between two locations
   */
  private async calculateDistance(location1: string, location2: string): Promise<number> {
    // Simplified distance calculation - in a real implementation,
    // you would use the Haversine formula or Google's Distance Matrix API
    return Math.random() * 5000; // Placeholder - returns random distance up to 5km
  }

  /**
   * Estimate market share based on place data
   */
  private estimateMarketShare(place: GooglePlace): number {
    const ratingWeight = (place.rating || 0) * 20; // 0-100 scale
    const reviewWeight = Math.min(50, (place.user_ratings_total || 0) / 10); // Max 50 points
    return Math.min(100, ratingWeight + reviewWeight);
  }

  /**
   * Analyze strengths of a competitor
   */
  private analyzeStrengths(place: GooglePlace): string[] {
    const strengths: string[] = [];
    
    if (place.rating && place.rating >= 4.5) {
      strengths.push('High customer ratings');
    }
    
    if (place.user_ratings_total && place.user_ratings_total >= 100) {
      strengths.push('Strong review volume');
    }
    
    if (place.website) {
      strengths.push('Professional website presence');
    }
    
    if (place.formatted_phone_number) {
      strengths.push('Contact information available');
    }
    
    return strengths;
  }

  /**
   * Analyze weaknesses of a competitor
   */
  private analyzeWeaknesses(place: GooglePlace): string[] {
    const weaknesses: string[] = [];
    
    if (!place.rating || place.rating < 3.5) {
      weaknesses.push('Low customer ratings');
    }
    
    if (!place.user_ratings_total || place.user_ratings_total < 10) {
      weaknesses.push('Limited review volume');
    }
    
    if (!place.website) {
      weaknesses.push('No website presence');
    }
    
    if (!place.formatted_phone_number) {
      weaknesses.push('Missing contact information');
    }
    
    return weaknesses;
  }

  /**
   * Identify market gaps
   */
  private identifyMarketGaps(competitors: LocalSearchResult[], client: any): string[] {
    const gaps: string[] = [];
    
    // Analyze what services competitors don't offer
    // This would need more sophisticated analysis based on business data
    
    if (competitors.length < 5) {
      gaps.push('Limited local competition');
    }
    
    const avgRating = competitors.reduce((sum, c) => sum + c.rating, 0) / competitors.length;
    if (avgRating < 4.0) {
      gaps.push('Opportunity for superior customer service');
    }
    
    const competitorsWithWebsites = competitors.filter(c => c.website).length;
    if (competitorsWithWebsites < competitors.length * 0.7) {
      gaps.push('Digital presence opportunity');
    }
    
    return gaps;
  }

  /**
   * Get previous ranking data
   */
  private async getPreviousRankingData(clientId: number, query: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT ranking_trends FROM local_search_grids 
        WHERE client_id = $1 AND generated_at < NOW() - INTERVAL '1 day'
        ORDER BY generated_at DESC LIMIT 1
      `, [clientId]);
      
      if (result.rows.length > 0) {
        const trends = result.rows[0].ranking_trends;
        return trends[query] || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting previous ranking data:', error);
      return null;
    }
  }

  /**
   * Get local search grid for a client
   */
  async getLocalSearchGrid(clientId: number): Promise<LocalSearchGrid | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM local_search_grids WHERE client_id = $1 ORDER BY generated_at DESC LIMIT 1',
        [clientId]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          client_id: row.client_id,
          search_queries: row.search_queries,
          search_results: row.search_results,
          competitor_analysis: row.competitor_analysis,
          local_seo_score: row.local_seo_score,
          ranking_trends: row.ranking_trends,
          generated_at: row.generated_at
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting local search grid:', error);
      return null;
    }
  }
}
