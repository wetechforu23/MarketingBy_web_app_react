import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface SearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsolePage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleData {
  queries: SearchConsoleQuery[];
  pages: SearchConsolePage[];
  countries: SearchConsoleCountry[];
  devices: SearchConsoleDevice[];
  totalClicks: number;
  totalImpressions: number;
  averageCTR: number;
  averagePosition: number;
}

export class GoogleSearchConsoleService {
  private static instance: GoogleSearchConsoleService;
  private accessToken: string;
  private baseUrl = 'https://www.googleapis.com/webmasters/v3';

  private constructor() {
    this.accessToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      console.warn('GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN is not set. Google Search Console API will not function.');
    }
  }

  public static getInstance(): GoogleSearchConsoleService {
    if (!GoogleSearchConsoleService.instance) {
      GoogleSearchConsoleService.instance = new GoogleSearchConsoleService();
    }
    return GoogleSearchConsoleService.instance;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get search performance data for a website
   */
  async getSearchPerformance(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ['query', 'page', 'country', 'device']
  ): Promise<SearchConsoleData> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const results: SearchConsoleData = {
        queries: [],
        pages: [],
        countries: [],
        devices: [],
        totalClicks: 0,
        totalImpressions: 0,
        averageCTR: 0,
        averagePosition: 0
      };

      // Get data for each dimension
      for (const dimension of dimensions) {
        const response = await axios.post(
          `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            startDate: startDate,
            endDate: endDate,
            dimensions: [dimension],
            rowLimit: 1000,
            startRow: 0
          },
          {
            headers: this.getHeaders()
          }
        );

        const data = response.data.rows || [];
        
        switch (dimension) {
          case 'query':
            results.queries = data.map((row: any) => ({
              query: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position
            }));
            break;
          case 'page':
            results.pages = data.map((row: any) => ({
              page: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position
            }));
            break;
          case 'country':
            results.countries = data.map((row: any) => ({
              country: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position
            }));
            break;
          case 'device':
            results.devices = data.map((row: any) => ({
              device: row.keys[0],
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              position: row.position
            }));
            break;
        }
      }

      // Calculate totals
      const allData = [...results.queries, ...results.pages, ...results.countries, ...results.devices];
      results.totalClicks = allData.reduce((sum, item) => sum + item.clicks, 0);
      results.totalImpressions = allData.reduce((sum, item) => sum + item.impressions, 0);
      results.averageCTR = allData.length > 0 ? allData.reduce((sum, item) => sum + item.ctr, 0) / allData.length : 0;
      results.averagePosition = allData.length > 0 ? allData.reduce((sum, item) => sum + item.position, 0) / allData.length : 0;

      return results;
    } catch (error) {
      console.error('Error fetching Google Search Console data:', error);
      throw error;
    }
  }

  /**
   * Get top performing keywords
   */
  async getTopKeywords(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 50
  ): Promise<SearchConsoleQuery[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          startDate: startDate,
          endDate: endDate,
          dimensions: ['query'],
          rowLimit: limit,
          startRow: 0
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.rows?.map((row: any) => ({
        query: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      })) || [];
    } catch (error) {
      console.error('Error fetching top keywords:', error);
      throw error;
    }
  }

  /**
   * Get top performing pages
   */
  async getTopPages(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit: number = 50
  ): Promise<SearchConsolePage[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          startDate: startDate,
          endDate: endDate,
          dimensions: ['page'],
          rowLimit: limit,
          startRow: 0
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.rows?.map((row: any) => ({
        page: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      })) || [];
    } catch (error) {
      console.error('Error fetching top pages:', error);
      throw error;
    }
  }

  /**
   * Get geographic performance data
   */
  async getGeographicData(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<SearchConsoleCountry[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          startDate: startDate,
          endDate: endDate,
          dimensions: ['country'],
          rowLimit: 100,
          startRow: 0
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.rows?.map((row: any) => ({
        country: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      })) || [];
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      throw error;
    }
  }

  /**
   * Get device performance data
   */
  async getDeviceData(
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<SearchConsoleDevice[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          startDate: startDate,
          endDate: endDate,
          dimensions: ['device'],
          rowLimit: 10,
          startRow: 0
        },
        {
          headers: this.getHeaders()
        }
      );

      return response.data.rows?.map((row: any) => ({
        device: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position
      })) || [];
    } catch (error) {
      console.error('Error fetching device data:', error);
      throw error;
    }
  }

  /**
   * Get crawl errors
   */
  async getCrawlErrors(siteUrl: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/urlCrawlErrorsCounts/query`,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.countPerTypes || [];
    } catch (error) {
      console.error('Error fetching crawl errors:', error);
      throw error;
    }
  }

  /**
   * Get sitemaps
   */
  async getSitemaps(siteUrl: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Google Search Console access token is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/sites/${encodeURIComponent(siteUrl)}/sitemaps`,
        {
          headers: this.getHeaders()
        }
      );

      return response.data.sitemap || [];
    } catch (error) {
      console.error('Error fetching sitemaps:', error);
      throw error;
    }
  }
}
