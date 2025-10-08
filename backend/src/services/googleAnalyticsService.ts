import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface AnalyticsTrafficData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsers: number;
  returningUsers: number;
}

export interface AnalyticsDeviceData {
  device: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface AnalyticsSourceData {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface AnalyticsPageData {
  page: string;
  pageviews: number;
  uniquePageviews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
}

export interface AnalyticsLocationData {
  country: string;
  city: string;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number;
}

export interface AnalyticsOverview {
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgBounceRate: number;
  avgSessionDuration: number;
  newUserPercentage: number;
  topPages: AnalyticsPageData[];
  topSources: AnalyticsSourceData[];
  topCountries: AnalyticsLocationData[];
  deviceBreakdown: AnalyticsDeviceData[];
}

export class GoogleAnalyticsService {
  private static instance: GoogleAnalyticsService;
  private accessToken: string;
  private baseUrl = 'https://analyticsreporting.googleapis.com/v4';

  private constructor() {
    this.accessToken = process.env.GOOGLE_ANALYTICS_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      console.warn('GOOGLE_ANALYTICS_ACCESS_TOKEN is not set. Google Analytics API will not function.');
    }
  }

  public static getInstance(): GoogleAnalyticsService {
    if (!GoogleAnalyticsService.instance) {
      GoogleAnalyticsService.instance = new GoogleAnalyticsService();
    }
    return GoogleAnalyticsService.instance;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get traffic overview data
   */
  async getTrafficOverview(
    viewId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsOverview> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' },
                { expression: 'ga:bounceRate' },
                { expression: 'ga:avgSessionDuration' },
                { expression: 'ga:newUsers' }
              ]
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const data = response.data.reports[0].data;
      const totals = data.totals[0].values;

      return {
        totalSessions: parseInt(totals[0]),
        totalUsers: parseInt(totals[1]),
        totalPageviews: parseInt(totals[2]),
        avgBounceRate: parseFloat(totals[3]),
        avgSessionDuration: parseFloat(totals[4]),
        newUserPercentage: (parseInt(totals[5]) / parseInt(totals[1])) * 100,
        topPages: [],
        topSources: [],
        topCountries: [],
        deviceBreakdown: []
      };
    } catch (error) {
      console.error('Error fetching Google Analytics overview:', error);
      throw error;
    }
  }

  /**
   * Get traffic data by date
   */
  async getTrafficByDate(
    viewId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsTrafficData[]> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              dimensions: [
                { name: 'ga:date' }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' },
                { expression: 'ga:bounceRate' },
                { expression: 'ga:avgSessionDuration' },
                { expression: 'ga:newUsers' }
              ]
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const rows = response.data.reports[0].data.rows || [];
      return rows.map((row: any) => ({
        date: row.dimensions[0],
        sessions: parseInt(row.metrics[0].values[0]),
        users: parseInt(row.metrics[0].values[1]),
        pageviews: parseInt(row.metrics[0].values[2]),
        bounceRate: parseFloat(row.metrics[0].values[3]),
        avgSessionDuration: parseFloat(row.metrics[0].values[4]),
        newUsers: parseInt(row.metrics[0].values[5]),
        returningUsers: parseInt(row.metrics[0].values[1]) - parseInt(row.metrics[0].values[5])
      }));
    } catch (error) {
      console.error('Error fetching traffic by date:', error);
      throw error;
    }
  }

  /**
   * Get device breakdown
   */
  async getDeviceBreakdown(
    viewId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsDeviceData[]> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              dimensions: [
                { name: 'ga:deviceCategory' }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' },
                { expression: 'ga:bounceRate' },
                { expression: 'ga:avgSessionDuration' }
              ]
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const rows = response.data.reports[0].data.rows || [];
      return rows.map((row: any) => ({
        device: row.dimensions[0],
        sessions: parseInt(row.metrics[0].values[0]),
        users: parseInt(row.metrics[0].values[1]),
        pageviews: parseInt(row.metrics[0].values[2]),
        bounceRate: parseFloat(row.metrics[0].values[3]),
        avgSessionDuration: parseFloat(row.metrics[0].values[4])
      }));
    } catch (error) {
      console.error('Error fetching device breakdown:', error);
      throw error;
    }
  }

  /**
   * Get traffic sources
   */
  async getTrafficSources(
    viewId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsSourceData[]> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              dimensions: [
                { name: 'ga:source' },
                { name: 'ga:medium' }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' },
                { expression: 'ga:bounceRate' },
                { expression: 'ga:avgSessionDuration' }
              ]
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const rows = response.data.reports[0].data.rows || [];
      return rows.map((row: any) => ({
        source: row.dimensions[0],
        medium: row.dimensions[1],
        sessions: parseInt(row.metrics[0].values[0]),
        users: parseInt(row.metrics[0].values[1]),
        pageviews: parseInt(row.metrics[0].values[2]),
        bounceRate: parseFloat(row.metrics[0].values[3]),
        avgSessionDuration: parseFloat(row.metrics[0].values[4])
      }));
    } catch (error) {
      console.error('Error fetching traffic sources:', error);
      throw error;
    }
  }

  /**
   * Get top pages
   */
  async getTopPages(
    viewId: string,
    startDate: string,
    endDate: string,
    limit: number = 20
  ): Promise<AnalyticsPageData[]> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              dimensions: [
                { name: 'ga:pagePath' }
              ],
              metrics: [
                { expression: 'ga:pageviews' },
                { expression: 'ga:uniquePageviews' },
                { expression: 'ga:avgTimeOnPage' },
                { expression: 'ga:bounceRate' },
                { expression: 'ga:exitRate' }
              ],
              orderBys: [
                {
                  fieldName: 'ga:pageviews',
                  sortOrder: 'DESCENDING'
                }
              ],
              pageSize: limit
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const rows = response.data.reports[0].data.rows || [];
      return rows.map((row: any) => ({
        page: row.dimensions[0],
        pageviews: parseInt(row.metrics[0].values[0]),
        uniquePageviews: parseInt(row.metrics[0].values[1]),
        avgTimeOnPage: parseFloat(row.metrics[0].values[2]),
        bounceRate: parseFloat(row.metrics[0].values[3]),
        exitRate: parseFloat(row.metrics[0].values[4])
      }));
    } catch (error) {
      console.error('Error fetching top pages:', error);
      throw error;
    }
  }

  /**
   * Get geographic data
   */
  async getGeographicData(
    viewId: string,
    startDate: string,
    endDate: string
  ): Promise<AnalyticsLocationData[]> {
    if (!this.accessToken) {
      throw new Error('Google Analytics access token is not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/reports:batchGet`,
        {
          reportRequests: [
            {
              viewId: viewId,
              dateRanges: [
                {
                  startDate: startDate,
                  endDate: endDate
                }
              ],
              dimensions: [
                { name: 'ga:country' },
                { name: 'ga:city' }
              ],
              metrics: [
                { expression: 'ga:sessions' },
                { expression: 'ga:users' },
                { expression: 'ga:pageviews' },
                { expression: 'ga:bounceRate' }
              ],
              orderBys: [
                {
                  fieldName: 'ga:sessions',
                  sortOrder: 'DESCENDING'
                }
              ],
              pageSize: 50
            }
          ]
        },
        {
          headers: this.getHeaders()
        }
      );

      const rows = response.data.reports[0].data.rows || [];
      return rows.map((row: any) => ({
        country: row.dimensions[0],
        city: row.dimensions[1],
        sessions: parseInt(row.metrics[0].values[0]),
        users: parseInt(row.metrics[0].values[1]),
        pageviews: parseInt(row.metrics[0].values[2]),
        bounceRate: parseFloat(row.metrics[0].values[3])
      }));
    } catch (error) {
      console.error('Error fetching geographic data:', error);
      throw error;
    }
  }
}
