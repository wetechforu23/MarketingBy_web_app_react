import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface MozDomainMetrics {
  domain: string;
  domainAuthority: number;
  pageAuthority: number;
  linkingRootDomains: number;
  totalLinks: number;
  spamScore: number;
  mozRank: number;
}

export interface MozBacklink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  domainAuthority: number;
  pageAuthority: number;
  linkType: 'follow' | 'nofollow';
  linkStatus: 'live' | 'lost';
  firstSeen: string;
  lastSeen: string;
}

export interface MozKeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  opportunity: number;
  potential: number;
  cpc: number;
}

export interface MozCompetitorAnalysis {
  domain: string;
  domainAuthority: number;
  totalLinks: number;
  linkingRootDomains: number;
  commonKeywords: number;
  keywordOverlap: number;
  linkOverlap: number;
}

export class MozApiService {
  private static instance: MozApiService;
  private accessId: string;
  private secretKey: string;
  private baseUrl = 'https://lsapi.seomoz.com/v2';

  private constructor() {
    this.accessId = process.env.MOZ_ACCESS_ID || '';
    this.secretKey = process.env.MOZ_SECRET_KEY || '';
    if (!this.accessId || !this.secretKey) {
      console.warn('MOZ_ACCESS_ID or MOZ_SECRET_KEY is not set. Moz API will not function.');
    }
  }

  public static getInstance(): MozApiService {
    if (!MozApiService.instance) {
      MozApiService.instance = new MozApiService();
    }
    return MozApiService.instance;
  }

  private getHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.accessId}:${this.secretKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get domain metrics for a website
   */
  async getDomainMetrics(domain: string): Promise<MozDomainMetrics> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/links`,
        {
          target: domain,
          scope: 'page',
          limit: 1
        },
        {
          headers: this.getHeaders()
        }
      );

      const data = response.data;
      return {
        domain: domain,
        domainAuthority: data.domain_authority || 0,
        pageAuthority: data.page_authority || 0,
        linkingRootDomains: data.linking_root_domains || 0,
        totalLinks: data.total_links || 0,
        spamScore: data.spam_score || 0,
        mozRank: data.moz_rank || 0
      };
    } catch (error) {
      console.error('Error fetching Moz domain metrics:', error);
      throw error;
    }
  }

  /**
   * Get backlinks for a domain
   */
  async getBacklinks(
    domain: string,
    limit: number = 100,
    filter: 'all' | 'follow' | 'nofollow' = 'all'
  ): Promise<MozBacklink[]> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/links`,
        {
          target: domain,
          scope: 'page',
          limit: limit,
          filter: filter
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.results?.map((link: any) => ({
        sourceUrl: link.source_url,
        targetUrl: link.target_url,
        anchorText: link.anchor_text,
        domainAuthority: link.domain_authority,
        pageAuthority: link.page_authority,
        linkType: link.link_type,
        linkStatus: link.link_status,
        firstSeen: link.first_seen,
        lastSeen: link.last_seen
      })) || [];
    } catch (error) {
      console.error('Error fetching Moz backlinks:', error);
      throw error;
    }
  }

  /**
   * Get keyword data from Moz
   */
  async getKeywordData(keywords: string[]): Promise<MozKeywordData[]> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/keywords`,
        {
          keywords: keywords
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.results?.map((keyword: any) => ({
        keyword: keyword.keyword,
        volume: keyword.volume,
        difficulty: keyword.difficulty,
        opportunity: keyword.opportunity,
        potential: keyword.potential,
        cpc: keyword.cpc
      })) || [];
    } catch (error) {
      console.error('Error fetching Moz keyword data:', error);
      throw error;
    }
  }

  /**
   * Analyze competitors
   */
  async analyzeCompetitors(
    targetDomain: string,
    competitorDomains: string[]
  ): Promise<MozCompetitorAnalysis[]> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const results: MozCompetitorAnalysis[] = [];

      for (const competitor of competitorDomains) {
        const [targetMetrics, competitorMetrics] = await Promise.all([
          this.getDomainMetrics(targetDomain),
          this.getDomainMetrics(competitor)
        ]);

        // Calculate overlap metrics (simplified)
        const commonKeywords = Math.floor(Math.random() * 100); // Placeholder
        const keywordOverlap = (commonKeywords / 100) * 100;
        const linkOverlap = Math.floor(Math.random() * 50); // Placeholder

        results.push({
          domain: competitor,
          domainAuthority: competitorMetrics.domainAuthority,
          totalLinks: competitorMetrics.totalLinks,
          linkingRootDomains: competitorMetrics.linkingRootDomains,
          commonKeywords: commonKeywords,
          keywordOverlap: keywordOverlap,
          linkOverlap: linkOverlap
        });
      }

      return results;
    } catch (error) {
      console.error('Error analyzing competitors:', error);
      throw error;
    }
  }

  /**
   * Get link building opportunities
   */
  async getLinkBuildingOpportunities(domain: string): Promise<any[]> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/link_opportunities`,
        {
          target: domain,
          limit: 50
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching link building opportunities:', error);
      throw error;
    }
  }

  /**
   * Get domain comparison
   */
  async compareDomains(domains: string[]): Promise<MozDomainMetrics[]> {
    if (!this.accessId || !this.secretKey) {
      throw new Error('Moz API credentials are not configured');
    }

    try {
      const results = await Promise.all(
        domains.map(domain => this.getDomainMetrics(domain))
      );

      return results;
    } catch (error) {
      console.error('Error comparing domains:', error);
      throw error;
    }
  }
}
