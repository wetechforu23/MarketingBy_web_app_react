import { Pool } from 'pg';
import { google } from 'googleapis';
import { GoogleAnalyticsService } from './googleAnalyticsService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export interface AnalyticsDataPoint {
  date: string;
  pageViews: number;
  sessions: number;
  bounceRate: number;
  users: number;
  newUsers: number;
  avgSessionDuration: number;
  deviceCategory?: string;
  trafficSource?: string;
  country?: string;
}

export interface AnalyticsReport {
  id?: number;
  clientId: number;
  reportName: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  dateFrom: string;
  dateTo: string;
  reportData: any;
  generatedAt?: Date;
  generatedBy?: number;
}

export class AnalyticsDataService {
  private googleAnalyticsService: GoogleAnalyticsService;

  constructor() {
    this.googleAnalyticsService = new GoogleAnalyticsService();
  }

  // Get client credentials from database
  private async getClientCredentials(clientId: number): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, 'google_analytics']
      );

      if (result.rows.length === 0) {
        return null;
      }

      console.log(`🔍 Getting client credentials for client ${clientId}:`, result.rows[0].credentials);
      
      let credentials;
      if (typeof result.rows[0].credentials === 'string') {
        credentials = JSON.parse(result.rows[0].credentials);
      } else if (typeof result.rows[0].credentials === 'object') {
        credentials = result.rows[0].credentials;
      } else {
        console.error(`❌ Invalid credentials type for client ${clientId}:`, typeof result.rows[0].credentials);
        return null;
      }
      
      console.log(`✅ Parsed credentials for client ${clientId}:`, credentials);
      return credentials;
    } catch (error) {
      console.error('Error getting client credentials:', error);
      return null;
    }
  }

  // Store analytics data in database
  async storeAnalyticsData(
    clientId: number,
    serviceType: string,
    date: string,
    dataType: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO analytics_data (client_id, service_type, date, data_type, value, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (client_id, service_type, date, data_type)
        DO UPDATE SET 
          value = EXCLUDED.value,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [clientId, serviceType, date, dataType, value, JSON.stringify(metadata)]);
    } catch (error) {
      console.error('Error storing analytics data:', error);
      throw error;
    }
  }

  // Fetch and store Google Analytics data for a date range
  async syncGoogleAnalyticsData(
    clientId: number,
    dateFrom: string,
    dateTo: string,
    userId?: number
  ): Promise<{ recordsProcessed: number; recordsUpdated: number; recordsInserted: number }> {
    const syncLogId = await this.createSyncLog(clientId, 'google_analytics', 'manual', dateFrom, dateTo, userId);
    
    try {
      console.log(`🔄 Starting Google Analytics sync for client ${clientId} from ${dateFrom} to ${dateTo}`);
      
      // Get client credentials directly from database
      const credentials = await this.getClientCredentials(clientId);
      if (!credentials || !credentials.access_token) {
        throw new Error('Google Analytics not connected for this client');
      }

      // Get property ID
      const propertyId = credentials.property_id;
      if (!propertyId) {
        throw new Error('Property ID not configured for this client');
      }

      // Initialize Google Analytics API
      const auth = new google.auth.OAuth2();
      auth.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token
      });

      const analytics = google.analyticsdata({ version: 'v1beta', auth });

      // Fetch data for each date in the range
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      let recordsProcessed = 0;
      let recordsUpdated = 0;
      let recordsInserted = 0;

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          // Fetch basic metrics
          const basicMetrics = await this.fetchBasicMetrics(analytics, propertyId, dateStr);
          
          // Store basic metrics
          for (const [dataType, value] of Object.entries(basicMetrics)) {
            await this.storeAnalyticsData(clientId, 'google_analytics', dateStr, dataType, value as number);
            recordsProcessed++;
            recordsInserted++;
          }

          // Fetch device category data
          const deviceData = await this.fetchDeviceData(analytics, propertyId, dateStr);
          for (const device of deviceData) {
            await this.storeAnalyticsData(
              clientId, 
              'google_analytics', 
              dateStr, 
              'device_page_views', 
              device.pageViews,
              { deviceCategory: device.deviceCategory }
            );
            recordsProcessed++;
            recordsInserted++;
          }

          // Fetch traffic source data
          const trafficData = await this.fetchTrafficSourceData(analytics, propertyId, dateStr);
          for (const source of trafficData) {
            await this.storeAnalyticsData(
              clientId, 
              'google_analytics', 
              dateStr, 
              'traffic_page_views', 
              source.pageViews,
              { trafficSource: source.trafficSource }
            );
            recordsProcessed++;
            recordsInserted++;
          }

          // Fetch country data
          const countryData = await this.fetchCountryData(analytics, propertyId, dateStr);
          for (const country of countryData) {
            await this.storeAnalyticsData(
              clientId, 
              'google_analytics', 
              dateStr, 
              'country_page_views', 
              country.pageViews,
              { country: country.country }
            );
            recordsProcessed++;
            recordsInserted++;
          }

        } catch (dateError) {
          console.error(`Error fetching data for date ${dateStr}:`, dateError);
        }
      }

      await this.updateSyncLog(syncLogId, 'success', recordsProcessed, recordsUpdated, recordsInserted);
      
      console.log(`✅ Google Analytics sync completed for client ${clientId}: ${recordsProcessed} records processed`);
      return { recordsProcessed, recordsUpdated, recordsInserted };

    } catch (error) {
      console.error('Error syncing Google Analytics data:', error);
      await this.updateSyncLog(syncLogId, 'failed', 0, 0, 0, error.message);
      throw error;
    }
  }

  // Fetch basic metrics (page views, sessions, etc.)
  private async fetchBasicMetrics(analytics: any, propertyId: string, date: string) {
    const response = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: date, endDate: date }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'bounceRate' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'averageSessionDuration' }
        ]
      }
    });

    const rows = response.data.rows || [];
    if (rows.length === 0) {
      return {
        page_views: 0,
        sessions: 0,
        bounce_rate: 0,
        users: 0,
        new_users: 0,
        avg_session_duration: 0
      };
    }

    const metrics = rows[0].metricValues;
    return {
      page_views: parseInt(metrics[0].value) || 0,
      sessions: parseInt(metrics[1].value) || 0,
      bounce_rate: parseFloat(metrics[2].value) || 0,
      users: parseInt(metrics[3].value) || 0,
      new_users: parseInt(metrics[4].value) || 0,
      avg_session_duration: parseFloat(metrics[5].value) || 0
    };
  }

  // Fetch device category data
  private async fetchDeviceData(analytics: any, propertyId: string, date: string) {
    const response = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: date, endDate: date }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'screenPageViews' }]
      }
    });

    return (response.data.rows || []).map((row: any) => ({
      deviceCategory: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value) || 0
    }));
  }

  // Fetch traffic source data
  private async fetchTrafficSourceData(analytics: any, propertyId: string, date: string) {
    const response = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: date, endDate: date }],
        dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
        metrics: [{ name: 'screenPageViews' }]
      }
    });

    return (response.data.rows || []).map((row: any) => ({
      trafficSource: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value) || 0
    }));
  }

  // Fetch country data
  private async fetchCountryData(analytics: any, propertyId: string, date: string) {
    const response = await analytics.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: date, endDate: date }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'screenPageViews' }]
      }
    });

    return (response.data.rows || []).map((row: any) => ({
      country: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value) || 0
    }));
  }

  // Get analytics data for a client and date range
  async getAnalyticsData(
    clientId: number,
    dateFrom: string,
    dateTo: string,
    serviceType?: string
  ): Promise<any[]> {
    try {
      let query = `
        SELECT date, data_type, value, metadata
        FROM analytics_data
        WHERE client_id = $1 AND date BETWEEN $2 AND $3
      `;
      const params: any[] = [clientId, dateFrom, dateTo];

      if (serviceType) {
        query += ` AND service_type = $4`;
        params.push(serviceType);
      }

      query += ` ORDER BY date DESC, data_type`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  // Generate analytics report
  async generateAnalyticsReport(
    clientId: number,
    reportName: string,
    reportType: string,
    dateFrom: string,
    dateTo: string,
    userId?: number
  ): Promise<AnalyticsReport> {
    try {
      const analyticsData = await this.getAnalyticsData(clientId, dateFrom, dateTo);
      
      // Process and aggregate data
      const reportData = this.processAnalyticsData(analyticsData, dateFrom, dateTo);
      
      // Store report
      const result = await pool.query(`
        INSERT INTO analytics_reports (client_id, report_name, report_type, date_from, date_to, report_data, generated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [clientId, reportName, reportType, dateFrom, dateTo, JSON.stringify(reportData), userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }

  // Process analytics data into report format
  private processAnalyticsData(data: any[], dateFrom: string, dateTo: string) {
    const processed = {
      summary: {
        totalPageViews: 0,
        totalSessions: 0,
        avgBounceRate: 0,
        totalUsers: 0,
        totalNewUsers: 0,
        avgSessionDuration: 0
      },
      dailyData: {},
      deviceBreakdown: {},
      trafficSourceBreakdown: {},
      countryBreakdown: {},
      dateRange: { from: dateFrom, to: dateTo }
    };

    // Group data by date and type
    const groupedData: any = {};
    data.forEach(row => {
      if (!groupedData[row.date]) {
        groupedData[row.date] = {};
      }
      groupedData[row.date][row.data_type] = {
        value: row.value,
        metadata: row.metadata
      };
    });

    // Process daily data and calculate summary
    Object.keys(groupedData).forEach(date => {
      const dayData = groupedData[date];
      processed.dailyData[date] = {
        pageViews: dayData.page_views?.value || 0,
        sessions: dayData.sessions?.value || 0,
        bounceRate: dayData.bounce_rate?.value || 0,
        users: dayData.users?.value || 0,
        newUsers: dayData.new_users?.value || 0,
        avgSessionDuration: dayData.avg_session_duration?.value || 0
      };

      // Add to summary totals
      processed.summary.totalPageViews += dayData.page_views?.value || 0;
      processed.summary.totalSessions += dayData.sessions?.value || 0;
      processed.summary.totalUsers += dayData.users?.value || 0;
      processed.summary.totalNewUsers += dayData.new_users?.value || 0;
    });

    // Calculate averages
    const dayCount = Object.keys(groupedData).length;
    if (dayCount > 0) {
      const bounceRateSum = Object.values(processed.dailyData)
        .reduce((sum: number, day: any) => sum + (day.bounceRate || 0), 0);
      const sessionDurationSum = Object.values(processed.dailyData)
        .reduce((sum: number, day: any) => sum + (day.avgSessionDuration || 0), 0);
      
      processed.summary.avgBounceRate = Number(bounceRateSum) / Number(dayCount);
      processed.summary.avgSessionDuration = Number(sessionDurationSum) / Number(dayCount);
    }

    // Process device breakdown
    data.filter(row => row.data_type === 'device_page_views').forEach(row => {
      const device = row.metadata?.deviceCategory || 'Unknown';
      processed.deviceBreakdown[device] = (processed.deviceBreakdown[device] || 0) + row.value;
    });

    // Process traffic source breakdown
    data.filter(row => row.data_type === 'traffic_page_views').forEach(row => {
      const source = row.metadata?.trafficSource || 'Unknown';
      processed.trafficSourceBreakdown[source] = (processed.trafficSourceBreakdown[source] || 0) + row.value;
    });

    // Process country breakdown
    data.filter(row => row.data_type === 'country_page_views').forEach(row => {
      const country = row.metadata?.country || 'Unknown';
      processed.countryBreakdown[country] = (processed.countryBreakdown[country] || 0) + row.value;
    });

    return processed;
  }

  // Create sync log entry
  private async createSyncLog(
    clientId: number,
    serviceType: string,
    syncType: string,
    dateFrom: string,
    dateTo: string,
    userId?: number
  ): Promise<number> {
    const result = await pool.query(`
      INSERT INTO analytics_sync_logs (client_id, service_type, sync_type, date_from, date_to, status, synced_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [clientId, serviceType, syncType, dateFrom, dateTo, 'in_progress', userId]);
    
    return result.rows[0].id;
  }

  // Update sync log
  private async updateSyncLog(
    logId: number,
    status: string,
    recordsProcessed: number,
    recordsUpdated: number,
    recordsInserted: number,
    errorMessage?: string
  ): Promise<void> {
    await pool.query(`
      UPDATE analytics_sync_logs 
      SET status = $1, records_processed = $2, records_updated = $3, records_inserted = $4, 
          error_message = $5, completed_at = NOW()
      WHERE id = $6
    `, [status, recordsProcessed, recordsUpdated, recordsInserted, errorMessage, logId]);
  }

  // Get sync logs for a client
  async getSyncLogs(clientId: number, limit: number = 10): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM analytics_sync_logs 
      WHERE client_id = $1 
      ORDER BY started_at DESC 
      LIMIT $2
    `, [clientId, limit]);
    
    return result.rows;
  }
}
