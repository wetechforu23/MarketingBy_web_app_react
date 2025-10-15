import pool from '../config/database';
import { GoogleAnalyticsService } from './googleAnalyticsService';
import { GoogleSearchConsoleService } from './googleSearchConsoleService';

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  serviceType?: string;
  dataType?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface ModernAnalyticsReport {
  id: number;
  clientId: number;
  reportName: string;
  reportType: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  summary: {
    totalPageViews: number;
    totalSessions: number;
    totalUsers: number;
    totalNewUsers: number;
    avgBounceRate: number;
    avgSessionDuration: number;
    totalLeads: number;
    conversionRate: number;
  };
  dailyData: Record<string, any>;
  deviceBreakdown: Record<string, number>;
  trafficSourceBreakdown: Record<string, number>;
  topPages: Array<{ page: string; views: number; sessions: number }>;
  geographicData: Record<string, number>;
  searchQueries: Array<{ query: string; impressions: number; clicks: number; ctr: number }>;
}

export class EnhancedAnalyticsService {
  private googleAnalyticsService: GoogleAnalyticsService;
  private googleSearchConsoleService: GoogleSearchConsoleService;

  constructor() {
    this.googleAnalyticsService = new GoogleAnalyticsService();
    this.googleSearchConsoleService = new GoogleSearchConsoleService();
  }

  // One-time comprehensive sync for all useful data
  async performComprehensiveSync(clientId: number, dateFrom: string, dateTo: string, userId?: number): Promise<any> {
    console.log(`🔄 Starting comprehensive sync for client ${clientId} from ${dateFrom} to ${dateTo}`);
    
    const syncLogId = await this.createSyncLog(clientId, 'comprehensive', 'manual', dateFrom, dateTo, userId);
    const results: any = {
      googleAnalytics: null,
      searchConsole: null,
      leads: null,
      errors: []
    };

    try {
      // 1. Sync Google Analytics data
      try {
        console.log(`📊 Syncing Google Analytics data...`);
        const gaData = await this.syncGoogleAnalyticsData(clientId, dateFrom, dateTo);
        results.googleAnalytics = gaData;
        console.log(`✅ Google Analytics sync completed: ${gaData.recordsProcessed} records`);
      } catch (error) {
        console.error(`❌ Google Analytics sync failed:`, error);
        results.errors.push({ service: 'google_analytics', error: error.message });
      }

      // 2. Sync Search Console data
      try {
        console.log(`🔍 Syncing Search Console data...`);
        const scData = await this.syncSearchConsoleData(clientId, dateFrom, dateTo);
        results.searchConsole = scData;
        console.log(`✅ Search Console sync completed: ${scData.recordsProcessed} records`);
      } catch (error) {
        console.error(`❌ Search Console sync failed:`, error);
        results.errors.push({ service: 'search_console', error: error.message });
      }

      // 3. Sync leads data (from existing leads table)
      try {
        console.log(`👥 Syncing leads data...`);
        const leadsData = await this.syncLeadsData(clientId, dateFrom, dateTo);
        results.leads = leadsData;
        console.log(`✅ Leads sync completed: ${leadsData.recordsProcessed} records`);
      } catch (error) {
        console.error(`❌ Leads sync failed:`, error);
        results.errors.push({ service: 'leads', error: error.message });
      }

      // Update sync log as successful
      await this.updateSyncLog(syncLogId, 'success', 
        (results.googleAnalytics?.recordsProcessed || 0) + 
        (results.searchConsole?.recordsProcessed || 0) + 
        (results.leads?.recordsProcessed || 0),
        0, 0
      );

      console.log(`🎉 Comprehensive sync completed for client ${clientId}`);
      return results;

    } catch (error) {
      console.error(`💥 Comprehensive sync failed for client ${clientId}:`, error);
      await this.updateSyncLog(syncLogId, 'failed', 0, 0, 0, error.message);
      throw error;
    }
  }

  // Sync Google Analytics data
  private async syncGoogleAnalyticsData(clientId: number, dateFrom: string, dateTo: string): Promise<any> {
    const credentials = await this.getClientCredentials(clientId, 'google_analytics');
    if (!credentials) {
      throw new Error('Google Analytics credentials not found');
    }

    const propertyId = credentials.propertyId;
    if (!propertyId) {
      throw new Error('Google Analytics Property ID not configured');
    }

    // Fetch comprehensive Google Analytics data
    const metrics = [
      'sessions', 'users', 'newUsers', 'pageviews', 'bounceRate', 
      'sessionDuration', 'goalCompletions', 'goalValue'
    ];
    
    const dimensions = [
      'date', 'deviceCategory', 'source', 'medium', 'country', 
      'city', 'pagePath', 'landingPage'
    ];

    const data = await this.googleAnalyticsService.getAnalyticsData(
      clientId, propertyId
    );

    // Process and store the data
    const processedData = this.processGoogleAnalyticsData(data);
    const recordsProcessed = await this.storeAnalyticsData(clientId, 'google_analytics', processedData);

    return {
      recordsProcessed,
      data: processedData
    };
  }

  // Sync Search Console data
  private async syncSearchConsoleData(clientId: number, dateFrom: string, dateTo: string): Promise<any> {
    const credentials = await this.getClientCredentials(clientId, 'google_search_console');
    if (!credentials) {
      throw new Error('Search Console credentials not found');
    }

    const siteUrl = credentials.siteUrl;
    if (!siteUrl) {
      throw new Error('Search Console Site URL not configured');
    }

    // Fetch Search Console data
    const searchData = await this.googleSearchConsoleService.getSearchConsoleData(
      clientId, siteUrl
    );

    // Process and store the data
    const processedData = this.processSearchConsoleData(searchData);
    const recordsProcessed = await this.storeAnalyticsData(clientId, 'search_console', processedData);

    return {
      recordsProcessed,
      data: processedData
    };
  }

  // Sync leads data
  private async syncLeadsData(clientId: number, dateFrom: string, dateTo: string): Promise<any> {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN source = 'website' THEN 1 END) as website_leads,
        COUNT(CASE WHEN source = 'facebook' THEN 1 END) as facebook_leads,
        COUNT(CASE WHEN source = 'google' THEN 1 END) as google_leads
      FROM leads 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [clientId, dateFrom, dateTo]);

    const processedData = this.processLeadsData(result.rows);
    const recordsProcessed = await this.storeAnalyticsData(clientId, 'leads', processedData);

    return {
      recordsProcessed,
      data: processedData
    };
  }

  // Process Google Analytics data
  private processGoogleAnalyticsData(data: any): any {
    const processed: any = {
      summary: {
        totalPageViews: 0,
        totalSessions: 0,
        totalUsers: 0,
        totalNewUsers: 0,
        avgBounceRate: 0,
        avgSessionDuration: 0
      },
      dailyData: {},
      deviceBreakdown: {},
      trafficSourceBreakdown: {},
      topPages: [],
      geographicData: {}
    };

    if (data.rows) {
      data.rows.forEach((row: any) => {
        const date = row.dimensions[0]; // date
        const device = row.dimensions[1]; // deviceCategory
        const source = row.dimensions[2]; // source
        const medium = row.dimensions[3]; // medium
        const country = row.dimensions[4]; // country
        const page = row.dimensions[6]; // pagePath

        const sessions = parseInt(row.metrics[0].values[0]) || 0;
        const users = parseInt(row.metrics[0].values[1]) || 0;
        const newUsers = parseInt(row.metrics[0].values[2]) || 0;
        const pageViews = parseInt(row.metrics[0].values[3]) || 0;
        const bounceRate = parseFloat(row.metrics[0].values[4]) || 0;
        const sessionDuration = parseFloat(row.metrics[0].values[5]) || 0;

        // Update summary
        processed.summary.totalSessions += sessions;
        processed.summary.totalUsers += users;
        processed.summary.totalNewUsers += newUsers;
        processed.summary.totalPageViews += pageViews;

        // Daily data
        if (!processed.dailyData[date]) {
          processed.dailyData[date] = {
            sessions: 0, users: 0, newUsers: 0, pageViews: 0, bounceRate: 0, sessionDuration: 0
          };
        }
        processed.dailyData[date].sessions += sessions;
        processed.dailyData[date].users += users;
        processed.dailyData[date].newUsers += newUsers;
        processed.dailyData[date].pageViews += pageViews;

        // Device breakdown
        processed.deviceBreakdown[device] = (processed.deviceBreakdown[device] || 0) + pageViews;

        // Traffic source breakdown
        const sourceMedium = `${source}/${medium}`;
        processed.trafficSourceBreakdown[sourceMedium] = (processed.trafficSourceBreakdown[sourceMedium] || 0) + pageViews;

        // Geographic data
        processed.geographicData[country] = (processed.geographicData[country] || 0) + pageViews;

        // Top pages
        const existingPage = processed.topPages.find((p: any) => p.page === page);
        if (existingPage) {
          existingPage.views += pageViews;
          existingPage.sessions += sessions;
        } else {
          processed.topPages.push({ page, views: pageViews, sessions });
        }
      });

      // Calculate averages
      const dayCount = Object.keys(processed.dailyData).length;
      if (dayCount > 0) {
        const bounceRateSum = Object.values(processed.dailyData)
          .reduce((sum: number, day: any) => sum + (day.bounceRate || 0), 0);
        const sessionDurationSum = Object.values(processed.dailyData)
          .reduce((sum: number, day: any) => sum + (day.sessionDuration || 0), 0);
        
        processed.summary.avgBounceRate = Number(bounceRateSum) / Number(dayCount);
        processed.summary.avgSessionDuration = Number(sessionDurationSum) / Number(dayCount);
      }

      // Sort top pages
      processed.topPages.sort((a: any, b: any) => b.views - a.views);
      processed.topPages = processed.topPages.slice(0, 10);
    }

    return processed;
  }

  // Process Search Console data
  private processSearchConsoleData(data: any): any {
    const processed: any = {
      summary: {
        totalImpressions: 0,
        totalClicks: 0,
        avgCtr: 0,
        avgPosition: 0
      },
      searchQueries: [],
      topPages: [],
      deviceBreakdown: {},
      countryBreakdown: {}
    };

    if (data.rows) {
      data.rows.forEach((row: any) => {
        const query = row.keys[0];
        const page = row.keys[1];
        const country = row.keys[2];
        const device = row.keys[3];

        const impressions = parseInt(row.impressions) || 0;
        const clicks = parseInt(row.clicks) || 0;
        const ctr = parseFloat(row.ctr) || 0;
        const position = parseFloat(row.position) || 0;

        // Update summary
        processed.summary.totalImpressions += impressions;
        processed.summary.totalClicks += clicks;

        // Search queries
        const existingQuery = processed.searchQueries.find((q: any) => q.query === query);
        if (existingQuery) {
          existingQuery.impressions += impressions;
          existingQuery.clicks += clicks;
        } else {
          processed.searchQueries.push({ query, impressions, clicks, ctr, position });
        }

        // Top pages
        const existingPage = processed.topPages.find((p: any) => p.page === page);
        if (existingPage) {
          existingPage.impressions += impressions;
          existingPage.clicks += clicks;
        } else {
          processed.topPages.push({ page, impressions, clicks });
        }

        // Device breakdown
        processed.deviceBreakdown[device] = (processed.deviceBreakdown[device] || 0) + clicks;

        // Country breakdown
        processed.countryBreakdown[country] = (processed.countryBreakdown[country] || 0) + clicks;
      });

      // Calculate averages
      if (processed.summary.totalImpressions > 0) {
        processed.summary.avgCtr = (processed.summary.totalClicks / processed.summary.totalImpressions) * 100;
      }

      // Sort and limit results
      processed.searchQueries.sort((a: any, b: any) => b.impressions - a.impressions);
      processed.searchQueries = processed.searchQueries.slice(0, 20);
      
      processed.topPages.sort((a: any, b: any) => b.impressions - a.impressions);
      processed.topPages = processed.topPages.slice(0, 10);
    }

    return processed;
  }

  // Process leads data
  private processLeadsData(data: any[]): any {
    const processed: any = {
      summary: {
        totalLeads: 0,
        convertedLeads: 0,
        websiteLeads: 0,
        facebookLeads: 0,
        googleLeads: 0,
        conversionRate: 0
      },
      dailyData: {}
    };

    data.forEach((row: any) => {
      const date = row.date;
      const totalLeads = parseInt(row.total_leads) || 0;
      const convertedLeads = parseInt(row.converted_leads) || 0;
      const websiteLeads = parseInt(row.website_leads) || 0;
      const facebookLeads = parseInt(row.facebook_leads) || 0;
      const googleLeads = parseInt(row.google_leads) || 0;

      // Update summary
      processed.summary.totalLeads += totalLeads;
      processed.summary.convertedLeads += convertedLeads;
      processed.summary.websiteLeads += websiteLeads;
      processed.summary.facebookLeads += facebookLeads;
      processed.summary.googleLeads += googleLeads;

      // Daily data
      processed.dailyData[date] = {
        totalLeads,
        convertedLeads,
        websiteLeads,
        facebookLeads,
        googleLeads
      };
    });

    // Calculate conversion rate
    if (processed.summary.totalLeads > 0) {
      processed.summary.conversionRate = (processed.summary.convertedLeads / processed.summary.totalLeads) * 100;
    }

    return processed;
  }

  // Store analytics data
  private async storeAnalyticsData(clientId: number, serviceType: string, data: any): Promise<number> {
    let recordsProcessed = 0;

    // Store summary data
    for (const [dataType, value] of Object.entries(data.summary)) {
      await pool.query(`
        INSERT INTO analytics_data (client_id, service_type, data_type, date, value, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (client_id, service_type, data_type, date, metadata) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `, [clientId, serviceType, dataType, new Date().toISOString().split('T')[0], value, JSON.stringify({ type: 'summary' })]);
      recordsProcessed++;
    }

    // Store daily data
    for (const [date, dayData] of Object.entries(data.dailyData)) {
      for (const [metric, value] of Object.entries(dayData as any)) {
        await pool.query(`
          INSERT INTO analytics_data (client_id, service_type, data_type, date, value, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (client_id, service_type, data_type, date, metadata) 
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [clientId, serviceType, metric, date, value, JSON.stringify({ type: 'daily' })]);
        recordsProcessed++;
      }
    }

    // Store breakdown data
    const breakdowns = ['deviceBreakdown', 'trafficSourceBreakdown', 'geographicData', 'countryBreakdown'];
    for (const breakdown of breakdowns) {
      if (data[breakdown]) {
        for (const [key, value] of Object.entries(data[breakdown])) {
          await pool.query(`
            INSERT INTO analytics_data (client_id, service_type, data_type, date, value, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (client_id, service_type, data_type, date, metadata) 
            DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
          `, [clientId, serviceType, breakdown, new Date().toISOString().split('T')[0], value, JSON.stringify({ type: 'breakdown', key })]);
          recordsProcessed++;
        }
      }
    }

    return recordsProcessed;
  }

  // Generate modern analytics report
  async generateModernReport(clientId: number, reportName: string, filters: AnalyticsFilters, userId?: number): Promise<ModernAnalyticsReport> {
    console.log(`📊 Generating modern analytics report for client ${clientId}`);

    // Fetch all analytics data for the date range
    const analyticsData = await this.getAnalyticsData(clientId, filters);
    const leadsData = await this.getLeadsData(clientId, filters);

    // Combine and process data
    const reportData = this.combineAnalyticsData(analyticsData, leadsData);

    // Store the report
    const result = await pool.query(`
      INSERT INTO analytics_reports (client_id, user_id, report_name, report_type, date_from, date_to, report_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, generated_at
    `, [
      clientId, 
      userId, 
      reportName, 
      filters.groupBy || 'daily', 
      filters.dateFrom, 
      filters.dateTo, 
      JSON.stringify(reportData)
    ]);

    const report: ModernAnalyticsReport = {
      id: result.rows[0].id,
      clientId,
      reportName,
      reportType: filters.groupBy || 'daily',
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      generatedAt: result.rows[0].generated_at,
      ...reportData
    };

    console.log(`✅ Modern analytics report generated: ${report.id}`);
    return report;
  }

  // Get analytics data with filters
  private async getAnalyticsData(clientId: number, filters: AnalyticsFilters): Promise<any> {
    let query = `
      SELECT service_type, data_type, date, value, metadata
      FROM analytics_data
      WHERE client_id = $1 AND date >= $2 AND date <= $3
    `;
    const params: any[] = [clientId, filters.dateFrom, filters.dateTo];

    if (filters.serviceType) {
      query += ` AND service_type = $4`;
      params.push(filters.serviceType);
    }

    if (filters.dataType) {
      query += ` AND data_type = $${params.length + 1}`;
      params.push(filters.dataType);
    }

    query += ` ORDER BY date DESC, service_type, data_type`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get leads data
  private async getLeadsData(clientId: number, filters: AnalyticsFilters): Promise<any> {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN source = 'website' THEN 1 END) as website_leads,
        COUNT(CASE WHEN source = 'facebook' THEN 1 END) as facebook_leads,
        COUNT(CASE WHEN source = 'google' THEN 1 END) as google_leads
      FROM leads 
      WHERE client_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [clientId, filters.dateFrom, filters.dateTo]);

    return result.rows;
  }

  // Combine analytics data
  private combineAnalyticsData(analyticsData: any[], leadsData: any[]): any {
    const combined: any = {
      summary: {
        totalPageViews: 0,
        totalSessions: 0,
        totalUsers: 0,
        totalNewUsers: 0,
        avgBounceRate: 0,
        avgSessionDuration: 0,
        totalLeads: 0,
        conversionRate: 0
      },
      dailyData: {},
      deviceBreakdown: {},
      trafficSourceBreakdown: {},
      topPages: [],
      geographicData: {},
      searchQueries: []
    };

    // Process analytics data
    analyticsData.forEach(row => {
      const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      
      if (metadata.type === 'summary') {
        combined.summary[row.data_type] = parseFloat(row.value) || 0;
      } else if (metadata.type === 'daily') {
        if (!combined.dailyData[row.date]) {
          combined.dailyData[row.date] = {};
        }
        combined.dailyData[row.date][row.data_type] = parseFloat(row.value) || 0;
      } else if (metadata.type === 'breakdown') {
        if (!combined[metadata.key]) {
          combined[metadata.key] = {};
        }
        combined[metadata.key] = parseFloat(row.value) || 0;
      }
    });

    // Process leads data
    leadsData.forEach(row => {
      const totalLeads = parseInt(row.total_leads) || 0;
      const convertedLeads = parseInt(row.converted_leads) || 0;
      
      combined.summary.totalLeads += totalLeads;
      combined.summary.convertedLeads += convertedLeads;

      if (!combined.dailyData[row.date]) {
        combined.dailyData[row.date] = {};
      }
      combined.dailyData[row.date].totalLeads = totalLeads;
      combined.dailyData[row.date].convertedLeads = convertedLeads;
    });

    // Calculate conversion rate
    if (combined.summary.totalLeads > 0) {
      combined.summary.conversionRate = (combined.summary.convertedLeads / combined.summary.totalLeads) * 100;
    }

    return combined;
  }

  // Get client credentials
  private async getClientCredentials(clientId: number, serviceType: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT credentials FROM client_credentials WHERE client_id = $1 AND service_type = $2',
        [clientId, serviceType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      let credentials;
      if (typeof result.rows[0].credentials === 'string') {
        credentials = JSON.parse(result.rows[0].credentials);
      } else {
        credentials = result.rows[0].credentials;
      }

      return credentials;
    } catch (error) {
      console.error('Error getting client credentials:', error);
      return null;
    }
  }

  // Create sync log
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
}
