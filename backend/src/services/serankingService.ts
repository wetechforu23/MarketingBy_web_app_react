import axios from 'axios';

export interface SerankingKeyword {
  id: number;
  name: string;
  position: number;
  url: string;
  volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
}

export interface SerankingCompetitor {
  id: number;
  domain: string;
  title: string;
  common_keywords: number;
  traffic_volume: number;
  organic_keywords: number;
  paid_keywords: number;
}

export interface SerankingProject {
  id: number;
  name: string;
  domain: string;
  search_engine: string;
  location: string;
  language: string;
}

export interface SerankingRankingData {
  keyword: string;
  position: number;
  url: string;
  search_volume: number;
  difficulty: number;
  cpc: number;
  competition: number;
  trend: 'up' | 'down' | 'stable';
}

export class SerankingService {
  private static instance: SerankingService;
  private apiKey: string;
  private baseUrl = 'https://api.seranking.com';

  private constructor() {
    this.apiKey = process.env.SERANKING_API_KEY || '';
    if (!this.apiKey) {
      console.warn('SERANKING_API_KEY is not set. Seranking API will not function.');
    }
  }

  public static getInstance(): SerankingService {
    if (!SerankingService.instance) {
      SerankingService.instance = new SerankingService();
    }
    return SerankingService.instance;
  }

  /**
   * Get all projects for the account
   */
  async getProjects(): Promise<SerankingProject[]> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/v1/projects`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching Seranking projects:', error);
      throw error;
    }
  }

  /**
   * Get keywords for a specific project
   */
  async getProjectKeywords(projectId: number): Promise<SerankingKeyword[]> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/projects/${projectId}/keywords`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching project keywords:', error);
      throw error;
    }
  }

  /**
   * Get competitors for a specific project
   */
  async getProjectCompetitors(projectId: number): Promise<SerankingCompetitor[]> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/v1/projects/${projectId}/competitors`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching project competitors:', error);
      throw error;
    }
  }

  /**
   * Get backlink summary for a domain
   */
  async getBacklinkSummary(domain: string, mode: string = 'host'): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/v1/backlinks/summary`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          target: domain,
          mode: mode,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching backlink summary:', error);
      throw error;
    }
  }

  /**
   * Get backlink metrics for a domain
   */
  async getBacklinkMetrics(domain: string, mode: string = 'host'): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/v1/backlinks/metrics`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: {
          target: domain,
          mode: mode,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching backlink metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze a competitor's SEO performance (using backlink data as alternative)
   */
  async analyzeCompetitor(domain: string, keywords?: string[]): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      // Get backlink data as competitor analysis alternative
      const backlinkData = await this.getBacklinkSummary(domain);
      
      return {
        domain: domain,
        backlink_analysis: backlinkData,
        keywords: keywords || [],
        analysis_type: 'backlink_based',
        note: 'Using backlink analysis as competitor analysis alternative'
      };
    } catch (error) {
      console.error('Error analyzing competitor:', error);
      throw error;
    }
  }

  /**
   * Get ranking data for specific keywords
   */
  async getKeywordRankings(projectId: number, keywords: string[]): Promise<SerankingRankingData[]> {
    if (!this.apiKey) {
      throw new Error('Seranking API key is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/projects/${projectId}/rankings`,
        {
          keywords: keywords,
        },
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('Error fetching keyword rankings:', error);
      throw error;
    }
  }

  /**
   * Generate competitor analysis report
   */
  async generateCompetitorReport(domain: string, targetKeywords: string[]): Promise<any> {
    try {
      const analysis = await this.analyzeCompetitor(domain, targetKeywords);
      
      const report = {
        domain: domain,
        analysis_date: new Date().toISOString(),
        summary: {
          total_keywords: analysis.total_keywords || 0,
          average_position: analysis.average_position || 0,
          traffic_estimate: analysis.traffic_estimate || 0,
          domain_authority: analysis.domain_authority || 0,
        },
        top_keywords: analysis.top_keywords || [],
        competitors: analysis.competitors || [],
        recommendations: this.generateRecommendations(analysis),
      };

      return report;
    } catch (error) {
      console.error('Error generating competitor report:', error);
      throw error;
    }
  }

  /**
   * Search for healthcare-related keywords
   */
  async searchHealthcareKeywords(projectId: number, location: string = 'US'): Promise<SerankingKeyword[]> {
    const healthcareKeywords = [
      'healthcare marketing',
      'medical practice seo',
      'healthcare seo services',
      'medical website optimization',
      'healthcare digital marketing',
      'medical practice marketing',
      'healthcare lead generation',
      'medical seo company',
      'healthcare online marketing',
      'medical practice advertising',
    ];

    try {
      const rankings = await this.getKeywordRankings(projectId, healthcareKeywords);
      
      return rankings.map(ranking => ({
        id: Math.random(), // Generate temporary ID
        name: ranking.keyword,
        position: ranking.position,
        url: ranking.url,
        volume: ranking.search_volume,
        difficulty: ranking.difficulty,
        cpc: ranking.cpc,
        competition: ranking.competition,
      }));
    } catch (error) {
      console.error('Error searching healthcare keywords:', error);
      throw error;
    }
  }

  /**
   * Get SEO insights for a website
   */
  async getSEOInsights(domain: string): Promise<any> {
    try {
      const analysis = await this.analyzeCompetitor(domain);
      
      return {
        domain: domain,
        insights: {
          organic_traffic: analysis.organic_traffic || 0,
          backlinks: analysis.backlinks || 0,
          referring_domains: analysis.referring_domains || 0,
          domain_rating: analysis.domain_rating || 0,
          organic_keywords: analysis.organic_keywords || 0,
          top_pages: analysis.top_pages || [],
          top_keywords: analysis.top_keywords || [],
        },
        recommendations: this.generateSEORecommendations(analysis),
      };
    } catch (error) {
      console.error('Error getting SEO insights:', error);
      throw error;
    }
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.average_position > 10) {
      recommendations.push('Focus on improving keyword rankings - current average position is above 10');
    }

    if (analysis.domain_authority < 50) {
      recommendations.push('Build more high-quality backlinks to improve domain authority');
    }

    if (analysis.traffic_estimate < 1000) {
      recommendations.push('Increase content marketing efforts to drive more organic traffic');
    }

    if (analysis.top_keywords && analysis.top_keywords.length < 50) {
      recommendations.push('Expand keyword targeting to capture more search opportunities');
    }

    return recommendations;
  }

  private generateSEORecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.domain_rating < 40) {
      recommendations.push('Improve domain authority through link building and content marketing');
    }

    if (analysis.organic_keywords < 100) {
      recommendations.push('Target more long-tail keywords to increase organic visibility');
    }

    if (analysis.backlinks < 100) {
      recommendations.push('Develop a comprehensive link building strategy');
    }

    if (analysis.organic_traffic < 5000) {
      recommendations.push('Create more valuable, shareable content to increase organic traffic');
    }

    return recommendations;
  }
}
