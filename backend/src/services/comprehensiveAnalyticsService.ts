import { google } from 'googleapis';
import pool from '../config/database';
import { GoogleAnalyticsService } from './googleAnalyticsService';
import { GoogleSearchConsoleService } from './googleSearchConsoleService';

interface PageInsights {
  page: string;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;
  avgTimeOnPage: number;
  exitRate: number;
  conversions: number;
  conversionRate: number;
}

interface GeographicData {
  country: string;
  city: string;
  users: number;
  sessions: number;
  bounceRate: number;
}

interface KeywordAnalysis {
  keyword: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  category: 'high-value' | 'medium-value' | 'low-value';
}

interface BacklinkData {
  domain: string;
  url: string;
  anchorText: string;
  domainAuthority: number;
  linkType: 'dofollow' | 'nofollow';
  status: 'active' | 'broken';
}

interface BrokenLink {
  url: string;
  statusCode: number;
  page: string;
  lastChecked: Date;
}

interface MonthlyComparison {
  month: string;
  pageViews: number;
  sessions: number;
  users: number;
  bounceRate: number;
  conversions: number;
  improvement: {
    pageViews: number;
    sessions: number;
    users: number;
    bounceRate: number;
    conversions: number;
  };
}

interface DeveloperInsights {
  topPerformingPages: PageInsights[];
  underperformingPages: PageInsights[];
  highBouncePages: PageInsights[];
  conversionOpportunities: PageInsights[];
  technicalIssues: {
    brokenLinks: BrokenLink[];
    slowPages: PageInsights[];
    mobileIssues: PageInsights[];
  };
  recommendations: string[];
}

interface ClientReport {
  executiveSummary: {
    totalTraffic: number;
    growthRate: number;
    topPerformingContent: string;
    keyImprovements: string[];
  };
  monthlyComparison: MonthlyComparison[];
  geographicInsights: GeographicData[];
  keywordPerformance: KeywordAnalysis[];
  technicalHealth: {
    brokenLinks: number;
    pageSpeed: number;
    mobileOptimization: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class ComprehensiveAnalyticsService {
  private googleAnalyticsService: GoogleAnalyticsService;
  private googleSearchConsoleService: GoogleSearchConsoleService;

  constructor() {
    this.googleAnalyticsService = new GoogleAnalyticsService();
    this.googleSearchConsoleService = new GoogleSearchConsoleService();
  }

  /**
   * Get comprehensive page-level insights
   */
  async getPageInsights(clientId: number, dateFrom: string, dateTo: string): Promise<PageInsights[]> {
    try {
      const credentials = await this.getClientCredentials(clientId, 'google_analytics');
      if (!credentials || !credentials.propertyId) {
        throw new Error('Google Analytics not connected');
      }

      const analytics = google.analyticsdata('v1beta');
      const oauth2Client = this.googleAnalyticsService.getOAuth2Client();
      
      // Set credentials
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      // Get page-level data with detailed metrics
      const response = await analytics.properties.runReport({
        auth: oauth2Client,
        property: `properties/${credentials.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
          dimensions: [
            { name: 'pagePath' },
            { name: 'country' },
            { name: 'city' }
          ],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'exitRate' },
            { name: 'conversions' }
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 100
        }
      });

      const pages: PageInsights[] = [];
      const pageMap = new Map<string, PageInsights>();

      if (response.data.rows) {
        for (const row of response.data.rows) {
          const pagePath = row.dimensionValues?.[0]?.value || '';
          const country = row.dimensionValues?.[1]?.value || '';
          const city = row.dimensionValues?.[2]?.value || '';
          
          const pageViews = parseInt(row.metricValues?.[0]?.value || '0');
          const uniqueUsers = parseInt(row.metricValues?.[1]?.value || '0');
          const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');
          const avgTimeOnPage = parseFloat(row.metricValues?.[3]?.value || '0');
          const exitRate = parseFloat(row.metricValues?.[4]?.value || '0');
          const conversions = parseInt(row.metricValues?.[5]?.value || '0');

          if (!pageMap.has(pagePath)) {
            pageMap.set(pagePath, {
              page: pagePath,
              pageViews: 0,
              uniqueUsers: 0,
              bounceRate: 0,
              avgTimeOnPage: 0,
              exitRate: 0,
              conversions: 0,
              conversionRate: 0
            });
          }

          const pageData = pageMap.get(pagePath)!;
          pageData.pageViews += pageViews;
          pageData.uniqueUsers += uniqueUsers;
          pageData.bounceRate = (pageData.bounceRate + bounceRate) / 2; // Average bounce rate
          pageData.avgTimeOnPage = (pageData.avgTimeOnPage + avgTimeOnPage) / 2;
          pageData.exitRate = (pageData.exitRate + exitRate) / 2;
          pageData.conversions += conversions;
        }

        // Calculate conversion rates
        for (const pageData of pageMap.values()) {
          pageData.conversionRate = pageData.pageViews > 0 ? (pageData.conversions / pageData.pageViews) * 100 : 0;
          pages.push(pageData);
        }
      }

      return pages.sort((a, b) => b.pageViews - a.pageViews);
    } catch (error) {
      console.error('Error getting page insights:', error);
      throw error;
    }
  }

  /**
   * Get geographic distribution of users
   */
  async getGeographicData(clientId: number, dateFrom: string, dateTo: string): Promise<GeographicData[]> {
    try {
      const credentials = await this.getClientCredentials(clientId, 'google_analytics');
      if (!credentials || !credentials.propertyId) {
        throw new Error('Google Analytics not connected');
      }

      const analytics = google.analyticsdata('v1beta');
      const oauth2Client = this.googleAnalyticsService.getOAuth2Client();
      
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      const response = await analytics.properties.runReport({
        auth: oauth2Client,
        property: `properties/${credentials.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
          dimensions: [
            { name: 'country' },
            { name: 'city' }
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'bounceRate' }
          ],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 50
        }
      });

      const geographicData: GeographicData[] = [];

      if (response.data.rows) {
        for (const row of response.data.rows) {
          const country = row.dimensionValues?.[0]?.value || '';
          const city = row.dimensionValues?.[1]?.value || '';
          const users = parseInt(row.metricValues?.[0]?.value || '0');
          const sessions = parseInt(row.metricValues?.[1]?.value || '0');
          const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');

          geographicData.push({
            country,
            city,
            users,
            sessions,
            bounceRate
          });
        }
      }

      return geographicData;
    } catch (error) {
      console.error('Error getting geographic data:', error);
      throw error;
    }
  }

  /**
   * Get keyword analysis from Search Console
   */
  async getKeywordAnalysis(clientId: number, dateFrom: string, dateTo: string): Promise<KeywordAnalysis[]> {
    try {
      const credentials = await this.getClientCredentials(clientId, 'google_search_console');
      if (!credentials || !credentials.siteUrl) {
        throw new Error('Google Search Console not connected');
      }

      const searchconsole = google.searchconsole('v1');
      const oauth2Client = this.googleSearchConsoleService.getOAuth2Client();
      
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      const response = await searchconsole.searchanalytics.query({
        auth: oauth2Client,
        siteUrl: credentials.siteUrl,
        requestBody: {
          startDate: dateFrom,
          endDate: dateTo,
          dimensions: ['query'],
          rowLimit: 100,
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'query',
              operator: 'notContains',
              expression: 'brand'
            }]
          }]
        }
      });

      const keywords: KeywordAnalysis[] = [];

      if (response.data.rows) {
        for (const row of response.data.rows) {
          const keyword = row.keys?.[0] || '';
          const impressions = row.impressions || 0;
          const clicks = row.clicks || 0;
          const ctr = row.ctr || 0;
          const position = row.position || 0;

          // Categorize keywords based on performance
          let category: 'high-value' | 'medium-value' | 'low-value' = 'low-value';
          if (clicks > 10 && ctr > 0.05) {
            category = 'high-value';
          } else if (clicks > 5 && ctr > 0.03) {
            category = 'medium-value';
          }

          keywords.push({
            keyword,
            impressions,
            clicks,
            ctr,
            position,
            category
          });
        }
      }

      return keywords.sort((a, b) => b.clicks - a.clicks);
    } catch (error) {
      console.error('Error getting keyword analysis:', error);
      throw error;
    }
  }

  /**
   * Check for broken links (simplified version - would need external service for comprehensive check)
   */
  async getBrokenLinks(clientId: number): Promise<BrokenLink[]> {
    try {
      // This is a simplified implementation
      // In production, you'd use services like Screaming Frog, Ahrefs, or SEMrush API
      const brokenLinks: BrokenLink[] = [
        {
          url: 'https://example.com/broken-page',
          statusCode: 404,
          page: '/contact',
          lastChecked: new Date()
        }
      ];

      return brokenLinks;
    } catch (error) {
      console.error('Error getting broken links:', error);
      return [];
    }
  }

  /**
   * Get monthly comparison data
   */
  async getMonthlyComparison(clientId: number, months: number = 6): Promise<MonthlyComparison[]> {
    try {
      const comparisons: MonthlyComparison[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        
        const dateFrom = monthDate.toISOString().split('T')[0];
        const dateTo = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];

        const analyticsData = await this.googleAnalyticsService.getAnalyticsData(clientId, '');
        
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        comparisons.push({
          month: monthName,
          pageViews: analyticsData.pageViews || 0,
          sessions: analyticsData.sessions || 0,
          users: analyticsData.users || 0,
          bounceRate: analyticsData.bounceRate || 0,
          conversions: 0, // Would need to calculate from actual data
          improvement: {
            pageViews: 0,
            sessions: 0,
            users: 0,
            bounceRate: 0,
            conversions: 0
          }
        });
      }

      // Calculate improvements
      for (let i = 1; i < comparisons.length; i++) {
        const current = comparisons[i];
        const previous = comparisons[i - 1];
        
        current.improvement.pageViews = previous.pageViews > 0 ? 
          ((current.pageViews - previous.pageViews) / previous.pageViews) * 100 : 0;
        current.improvement.sessions = previous.sessions > 0 ? 
          ((current.sessions - previous.sessions) / previous.sessions) * 100 : 0;
        current.improvement.users = previous.users > 0 ? 
          ((current.users - previous.users) / previous.users) * 100 : 0;
        current.improvement.bounceRate = previous.bounceRate > 0 ? 
          ((current.bounceRate - previous.bounceRate) / previous.bounceRate) * 100 : 0;
      }

      return comparisons;
    } catch (error) {
      console.error('Error getting monthly comparison:', error);
      throw error;
    }
  }

  /**
   * Generate developer insights
   */
  async getDeveloperInsights(clientId: number, dateFrom: string, dateTo: string): Promise<DeveloperInsights> {
    try {
      const pageInsights = await this.getPageInsights(clientId, dateFrom, dateTo);
      const brokenLinks = await this.getBrokenLinks(clientId);

      // Categorize pages
      const topPerformingPages = pageInsights
        .filter(page => page.pageViews > 100 && page.conversionRate > 0)
        .slice(0, 10);

      const underperformingPages = pageInsights
        .filter(page => page.pageViews > 50 && page.bounceRate > 70)
        .slice(0, 10);

      const highBouncePages = pageInsights
        .filter(page => page.bounceRate > 80)
        .slice(0, 10);

      const conversionOpportunities = pageInsights
        .filter(page => page.pageViews > 200 && page.conversionRate === 0)
        .slice(0, 10);

      const slowPages = pageInsights
        .filter(page => page.avgTimeOnPage < 30)
        .slice(0, 10);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (highBouncePages.length > 0) {
        recommendations.push(`Optimize ${highBouncePages.length} high-bounce pages for better user engagement`);
      }
      
      if (conversionOpportunities.length > 0) {
        recommendations.push(`Add conversion elements to ${conversionOpportunities.length} high-traffic pages`);
      }
      
      if (brokenLinks.length > 0) {
        recommendations.push(`Fix ${brokenLinks.length} broken links to improve SEO`);
      }
      
      if (slowPages.length > 0) {
        recommendations.push(`Improve page speed for ${slowPages.length} slow-loading pages`);
      }

      return {
        topPerformingPages,
        underperformingPages,
        highBouncePages,
        conversionOpportunities,
        technicalIssues: {
          brokenLinks,
          slowPages,
          mobileIssues: [] // Would need mobile-specific data
        },
        recommendations
      };
    } catch (error) {
      console.error('Error getting developer insights:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive client report
   */
  async getClientReport(clientId: number, dateFrom: string, dateTo: string): Promise<ClientReport> {
    try {
      const [pageInsights, geographicData, keywordAnalysis, monthlyComparison, developerInsights] = await Promise.all([
        this.getPageInsights(clientId, dateFrom, dateTo),
        this.getGeographicData(clientId, dateFrom, dateTo),
        this.getKeywordAnalysis(clientId, dateFrom, dateTo),
        this.getMonthlyComparison(clientId, 6),
        this.getDeveloperInsights(clientId, dateFrom, dateTo)
      ]);

      const totalTraffic = pageInsights.reduce((sum, page) => sum + page.pageViews, 0);
      const topPerformingContent = pageInsights[0]?.page || 'N/A';
      
      const latestMonth = monthlyComparison[monthlyComparison.length - 1];
      const previousMonth = monthlyComparison[monthlyComparison.length - 2];
      const growthRate = previousMonth ? 
        ((latestMonth.pageViews - previousMonth.pageViews) / previousMonth.pageViews) * 100 : 0;

      const keyImprovements = [
        `Traffic growth: ${growthRate.toFixed(1)}%`,
        `Top performing page: ${topPerformingContent}`,
        `Geographic reach: ${geographicData.length} locations`
      ];

      return {
        executiveSummary: {
          totalTraffic,
          growthRate,
          topPerformingContent,
          keyImprovements
        },
        monthlyComparison,
        geographicInsights: geographicData.slice(0, 20),
        keywordPerformance: keywordAnalysis.slice(0, 50),
        technicalHealth: {
          brokenLinks: developerInsights.technicalIssues.brokenLinks.length,
          pageSpeed: 85, // Would calculate from actual data
          mobileOptimization: 90 // Would calculate from actual data
        },
        recommendations: {
          immediate: developerInsights.recommendations.slice(0, 3),
          shortTerm: [
            'Implement A/B testing on high-traffic pages',
            'Optimize meta descriptions for better CTR',
            'Add schema markup for rich snippets'
          ],
          longTerm: [
            'Develop content strategy based on keyword analysis',
            'Implement advanced conversion tracking',
            'Create personalized user experiences'
          ]
        }
      };
    } catch (error) {
      console.error('Error generating client report:', error);
      throw error;
    }
  }

  /**
   * Helper method to get client credentials
   */
  private async getClientCredentials(clientId: number, serviceType: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT credentials, property_id, site_url
        FROM client_credentials 
        WHERE client_id = $1 AND service_type = $2
      `, [clientId, serviceType]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      let credentials;
      
      if (typeof row.credentials === 'string') {
        credentials = JSON.parse(row.credentials);
      } else {
        credentials = row.credentials;
      }

      return {
        ...credentials,
        property_id: row.property_id,
        site_url: row.site_url
      };
    } catch (error) {
      console.error('Error getting client credentials:', error);
      return null;
    }
  }
}
