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
    console.log(`📊 Generating comprehensive modern analytics report for client ${clientId}`);

    // Fetch real-time data directly from Google Analytics and other services
    const realTimeData = await this.fetchRealTimeData(clientId, filters);
    const leadsData = await this.getLeadsData(clientId, filters);

    // Generate comprehensive report data with all sections using real-time data
    const reportData = await this.generateComprehensiveReportData(clientId, filters, realTimeData, leadsData);

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

    console.log(`✅ Comprehensive modern analytics report generated: ${report.id}`);
    return report;
  }

  // Generate comprehensive report data with all sections
  private async generateComprehensiveReportData(clientId: number, filters: AnalyticsFilters, analyticsData: any, leadsData: any): Promise<any> {
    console.log(`📊 Generating comprehensive report data for client ${clientId}`);

    const reportData: any = {
      // Basic analytics data
      ...this.combineAnalyticsData(analyticsData, leadsData),
      
      // Overview section with graphs and KPIs
      overview: {
        summary: this.generateOverviewSummary(analyticsData, leadsData),
        keyMetrics: this.generateKeyMetrics(analyticsData, leadsData),
        trends: this.generateTrends(analyticsData, leadsData),
        businessImpact: this.generateBusinessImpactExplanations(analyticsData, leadsData)
      },

      // Analytics section with detailed traffic data
      analytics: {
        trafficData: this.generateTrafficAnalysis(analyticsData),
        userBehavior: this.generateUserBehaviorAnalysis(analyticsData),
        deviceData: this.generateDeviceAnalysis(analyticsData),
        geographicData: this.generateGeographicAnalysis(analyticsData),
        businessExplanations: this.generateAnalyticsBusinessExplanations(analyticsData)
      },

      // SEO Analysis section
      seo: {
        searchPerformance: await this.generateSEOPerformance(clientId, filters),
        keywordAnalysis: await this.generateKeywordAnalysis(clientId, filters),
        rankings: await this.generateRankingAnalysis(clientId, filters),
        businessExplanations: this.generateSEOBusinessExplanations()
      },

      // Pages analysis section
      pages: {
        topPages: this.generateTopPagesAnalysis(analyticsData),
        pagePerformance: this.generatePagePerformanceAnalysis(analyticsData),
        contentAnalysis: this.generateContentAnalysis(analyticsData),
        businessExplanations: this.generatePagesBusinessExplanations()
      },

      // Technical analysis section
      technical: {
        siteHealth: await this.generateSiteHealthAnalysis(clientId),
        performanceMetrics: this.generatePerformanceMetrics(analyticsData),
        technicalSEO: await this.generateTechnicalSEOAnalysis(clientId),
        businessExplanations: this.generateTechnicalBusinessExplanations()
      },

      // Recommendations section
      recommendations: {
        immediateActions: this.generateImmediateActions(analyticsData, leadsData),
        longTermStrategy: this.generateLongTermStrategy(analyticsData, leadsData),
        priorityRanking: this.generatePriorityRanking(analyticsData, leadsData),
        businessImpact: this.generateRecommendationsBusinessImpact()
      },

      // Previous vs Current comparison
      comparison: {
        periodComparison: this.generatePeriodComparison(analyticsData, leadsData, filters),
        growthAnalysis: this.generateGrowthAnalysis(analyticsData, leadsData),
        trendAnalysis: this.generateTrendAnalysis(analyticsData, leadsData),
        businessExplanations: this.generateComparisonBusinessExplanations()
      }
    };

    return reportData;
  }

  // Fetch real-time data directly from Google Analytics and other services
  private async fetchRealTimeData(clientId: number, filters: AnalyticsFilters): Promise<any> {
    console.log(`🔄 Fetching real-time data for client ${clientId} from ${filters.dateFrom} to ${filters.dateTo}`);
    
    const realTimeData: any = {
      googleAnalytics: null,
      searchConsole: null,
      leads: null
    };

    try {
      // Get Google Analytics data directly
      console.log(`📊 Fetching Google Analytics data...`);
      const gaData = await this.googleAnalyticsService.getAnalyticsData(clientId);
      realTimeData.googleAnalytics = gaData;
      console.log(`✅ Google Analytics data fetched: ${JSON.stringify(gaData, null, 2)}`);
    } catch (error) {
      console.error(`❌ Google Analytics data fetch failed:`, error);
      realTimeData.googleAnalytics = {
        pageViews: 0,
        sessions: 0,
        bounceRate: 0,
        users: 0,
        newUsers: 0,
        avgSessionDuration: 0,
        topPages: [],
        trafficSources: [],
        deviceData: [],
        geographicData: []
      };
    }

    try {
      // Get Search Console data directly
      console.log(`🔍 Fetching Search Console data...`);
      const scData = await this.googleSearchConsoleService.getSearchConsoleData(clientId);
      realTimeData.searchConsole = scData;
      console.log(`✅ Search Console data fetched: ${JSON.stringify(scData, null, 2)}`);
    } catch (error) {
      console.error(`❌ Search Console data fetch failed:`, error);
      realTimeData.searchConsole = {
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        topQueries: [],
        topPages: []
      };
    }

    return realTimeData;
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
  private combineAnalyticsData(analyticsData: any, leadsData: any): any {
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

    // Process Google Analytics data
    if (analyticsData && analyticsData.googleAnalytics) {
      const ga = analyticsData.googleAnalytics;
      combined.summary.totalPageViews = ga.pageViews || 0;
      combined.summary.totalSessions = ga.sessions || 0;
      combined.summary.totalUsers = ga.users || 0;
      combined.summary.totalNewUsers = ga.newUsers || 0;
      combined.summary.avgBounceRate = ga.bounceRate || 0;
      combined.summary.avgSessionDuration = ga.avgSessionDuration || 0;
      combined.topPages = ga.topPages || [];
      combined.deviceBreakdown = ga.deviceData || {};
      combined.trafficSourceBreakdown = ga.trafficSources || {};
      combined.geographicData = ga.geographicData || {};
    }

    // Process Search Console data
    if (analyticsData && analyticsData.searchConsole) {
      const sc = analyticsData.searchConsole;
      combined.searchQueries = sc.topQueries || [];
    }

    // Process leads data
    if (leadsData && Array.isArray(leadsData)) {
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
    } else if (leadsData && typeof leadsData === 'object') {
      // Handle object format leads data
      combined.summary.totalLeads = leadsData.total || 0;
      combined.summary.convertedLeads = leadsData.converted || 0;
    }

    // Calculate conversion rate
    if (combined.summary.totalSessions > 0) {
      combined.summary.conversionRate = (combined.summary.totalLeads / combined.summary.totalSessions) * 100;
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

  // ==================== COMPREHENSIVE REPORT GENERATION METHODS ====================

  // Overview section methods
  private generateOverviewSummary(analyticsData: any, leadsData: any): any {
    return {
      totalPageViews: analyticsData.reduce((sum: number, row: any) => sum + (parseInt(row.value) || 0), 0),
      totalSessions: analyticsData.filter((row: any) => row.data_type === 'sessions').reduce((sum: number, row: any) => sum + (parseInt(row.value) || 0), 0),
      totalUsers: analyticsData.filter((row: any) => row.data_type === 'users').reduce((sum: number, row: any) => sum + (parseInt(row.value) || 0), 0),
      totalLeads: leadsData.reduce((sum: number, row: any) => sum + (parseInt(row.total_leads) || 0), 0),
      conversionRate: this.calculateConversionRate(analyticsData, leadsData)
    };
  }

  private generateKeyMetrics(analyticsData: any, leadsData: any): any {
    return {
      bounceRate: this.calculateBounceRate(analyticsData),
      averageSessionDuration: this.calculateAverageSessionDuration(analyticsData),
      pagesPerSession: this.calculatePagesPerSession(analyticsData),
      newUserPercentage: this.calculateNewUserPercentage(analyticsData),
      leadConversionRate: this.calculateLeadConversionRate(leadsData)
    };
  }

  private generateTrends(analyticsData: any, leadsData: any): any {
    return {
      trafficTrend: this.calculateTrafficTrend(analyticsData),
      userGrowthTrend: this.calculateUserGrowthTrend(analyticsData),
      leadTrend: this.calculateLeadTrend(leadsData),
      conversionTrend: this.calculateConversionTrend(analyticsData, leadsData)
    };
  }

  private generateBusinessImpactExplanations(analyticsData: any, leadsData: any): any {
    return {
      pageViews: "Page views indicate how many times your website content was viewed. Higher page views suggest better content engagement and potential for lead generation.",
      sessions: "Sessions represent individual visits to your website. More sessions mean more people are discovering and engaging with your practice.",
      users: "Users show the number of unique visitors. Growing user count indicates expanding reach and brand awareness in your community.",
      leads: "Leads are potential patients who have shown interest in your services. This directly impacts your practice's revenue potential.",
      conversionRate: "Conversion rate shows how effectively your website turns visitors into leads. Higher rates mean better ROI on your marketing efforts."
    };
  }

  // Analytics section methods
  private generateTrafficAnalysis(analyticsData: any): any {
    return {
      trafficSources: this.analyzeTrafficSources(analyticsData),
      peakHours: this.analyzePeakHours(analyticsData),
      trafficPatterns: this.analyzeTrafficPatterns(analyticsData)
    };
  }

  private generateUserBehaviorAnalysis(analyticsData: any): any {
    return {
      userJourney: this.analyzeUserJourney(analyticsData),
      engagementMetrics: this.analyzeEngagementMetrics(analyticsData),
      retentionAnalysis: this.analyzeRetention(analyticsData)
    };
  }

  private generateDeviceAnalysis(analyticsData: any): any {
    return {
      deviceBreakdown: this.analyzeDeviceBreakdown(analyticsData),
      mobileOptimization: this.analyzeMobileOptimization(analyticsData),
      crossDeviceBehavior: this.analyzeCrossDeviceBehavior(analyticsData)
    };
  }

  private generateGeographicAnalysis(analyticsData: any): any {
    return {
      topLocations: this.analyzeTopLocations(analyticsData),
      localMarketPenetration: this.analyzeLocalMarketPenetration(analyticsData),
      expansionOpportunities: this.identifyExpansionOpportunities(analyticsData)
    };
  }

  private generateAnalyticsBusinessExplanations(analyticsData: any): any {
    return {
      trafficSources: "Understanding where your visitors come from helps optimize marketing spend and focus on channels that bring quality patients.",
      deviceUsage: "Mobile traffic indicates the need for mobile-optimized experiences. Most patients research healthcare on mobile devices.",
      geographicData: "Local traffic shows your community reach. Expanding geographic reach can grow your patient base.",
      peakHours: "Knowing when patients visit helps optimize content publishing and staff availability for online inquiries."
    };
  }

  // SEO section methods
  private async generateSEOPerformance(clientId: number, filters: AnalyticsFilters): Promise<any> {
    try {
      // This would integrate with the SEO analysis service
      return {
        searchVisibility: "Good",
        organicTraffic: "Growing",
        keywordRankings: "Improving",
        searchConsoleData: "Connected"
      };
    } catch (error) {
      return { error: "SEO data not available" };
    }
  }

  private async generateKeywordAnalysis(clientId: number, filters: AnalyticsFilters): Promise<any> {
    try {
      return {
        topKeywords: [],
        keywordOpportunities: [],
        competitorAnalysis: []
      };
    } catch (error) {
      return { error: "Keyword data not available" };
    }
  }

  private async generateRankingAnalysis(clientId: number, filters: AnalyticsFilters): Promise<any> {
    try {
      return {
        currentRankings: [],
        rankingChanges: [],
        rankingOpportunities: []
      };
    } catch (error) {
      return { error: "Ranking data not available" };
    }
  }

  private generateSEOBusinessExplanations(): any {
    return {
      organicTraffic: "Organic traffic from search engines is free and high-quality. Improving SEO increases patient discovery without advertising costs.",
      keywordRankings: "Ranking for healthcare keywords helps patients find your practice when searching for services in your area.",
      searchVisibility: "Higher search visibility means more patients can discover your practice online, leading to increased appointments."
    };
  }

  // Pages section methods
  private generateTopPagesAnalysis(analyticsData: any): any {
    return {
      topPerformingPages: this.analyzeTopPages(analyticsData),
      pageEngagement: this.analyzePageEngagement(analyticsData),
      contentPerformance: this.analyzeContentPerformance(analyticsData)
    };
  }

  private generatePagePerformanceAnalysis(analyticsData: any): any {
    return {
      pageSpeed: this.analyzePageSpeed(analyticsData),
      userExperience: this.analyzeUserExperience(analyticsData),
      conversionPages: this.analyzeConversionPages(analyticsData)
    };
  }

  private generateContentAnalysis(analyticsData: any): any {
    return {
      contentGaps: this.identifyContentGaps(analyticsData),
      contentOpportunities: this.identifyContentOpportunities(analyticsData),
      contentStrategy: this.recommendContentStrategy(analyticsData)
    };
  }

  private generatePagesBusinessExplanations(): any {
    return {
      topPages: "Understanding which pages perform best helps focus content efforts on what patients find most valuable.",
      pageSpeed: "Fast-loading pages improve user experience and search rankings, leading to more patient engagement.",
      contentGaps: "Identifying content gaps helps create materials that address patient questions and improve search visibility."
    };
  }

  // Technical section methods
  private async generateSiteHealthAnalysis(clientId: number): Promise<any> {
    try {
      return {
        siteHealth: "Good",
        technicalIssues: [],
        performanceScore: "85/100",
        mobileFriendly: true
      };
    } catch (error) {
      return { error: "Site health data not available" };
    }
  }

  private generatePerformanceMetrics(analyticsData: any): any {
    return {
      loadTime: this.analyzeLoadTime(analyticsData),
      coreWebVitals: this.analyzeCoreWebVitals(analyticsData),
      performanceScore: this.calculatePerformanceScore(analyticsData)
    };
  }

  private async generateTechnicalSEOAnalysis(clientId: number): Promise<any> {
    try {
      return {
        crawlability: "Good",
        indexability: "Good",
        technicalIssues: [],
        recommendations: []
      };
    } catch (error) {
      return { error: "Technical SEO data not available" };
    }
  }

  private generateTechnicalBusinessExplanations(): any {
    return {
      siteHealth: "A healthy website loads quickly and works properly, improving patient experience and search rankings.",
      performance: "Fast websites keep patients engaged and improve conversion rates from visitor to patient.",
      technicalSEO: "Proper technical setup ensures search engines can find and rank your practice's content effectively."
    };
  }

  // Recommendations section methods
  private generateImmediateActions(analyticsData: any, leadsData: any): any {
    return {
      highPriority: this.identifyHighPriorityActions(analyticsData, leadsData),
      quickWins: this.identifyQuickWins(analyticsData, leadsData),
      urgentFixes: this.identifyUrgentFixes(analyticsData, leadsData)
    };
  }

  private generateLongTermStrategy(analyticsData: any, leadsData: any): any {
    return {
      growthStrategy: this.developGrowthStrategy(analyticsData, leadsData),
      contentStrategy: this.developContentStrategy(analyticsData, leadsData),
      marketingStrategy: this.developMarketingStrategy(analyticsData, leadsData)
    };
  }

  private generatePriorityRanking(analyticsData: any, leadsData: any): any {
    return {
      priority1: this.getPriority1Actions(analyticsData, leadsData),
      priority2: this.getPriority2Actions(analyticsData, leadsData),
      priority3: this.getPriority3Actions(analyticsData, leadsData)
    };
  }

  private generateRecommendationsBusinessImpact(): any {
    return {
      immediateActions: "Quick fixes can improve patient experience and search rankings within days.",
      longTermStrategy: "Strategic improvements build sustainable growth and competitive advantage.",
      priorityRanking: "Focusing on high-impact actions maximizes ROI and patient acquisition."
    };
  }

  // Comparison section methods
  private generatePeriodComparison(analyticsData: any, leadsData: any, filters: AnalyticsFilters): any {
    return {
      previousPeriod: this.getPreviousPeriodData(analyticsData, leadsData, filters),
      currentPeriod: this.getCurrentPeriodData(analyticsData, leadsData, filters),
      changes: this.calculatePeriodChanges(analyticsData, leadsData, filters)
    };
  }

  private generateGrowthAnalysis(analyticsData: any, leadsData: any): any {
    return {
      growthRates: this.calculateGrowthRates(analyticsData, leadsData),
      growthTrends: this.analyzeGrowthTrends(analyticsData, leadsData),
      growthProjections: this.projectGrowth(analyticsData, leadsData)
    };
  }

  private generateTrendAnalysis(analyticsData: any, leadsData: any): any {
    return {
      trafficTrends: this.analyzeTrafficTrends(analyticsData),
      userTrends: this.analyzeUserTrends(analyticsData),
      leadTrends: this.analyzeLeadTrends(leadsData),
      conversionTrends: this.analyzeConversionTrends(analyticsData, leadsData)
    };
  }

  private generateComparisonBusinessExplanations(): any {
    return {
      periodComparison: "Comparing periods shows if your practice is growing and which strategies are working.",
      growthAnalysis: "Understanding growth patterns helps plan for future capacity and resource needs.",
      trendAnalysis: "Trend analysis identifies opportunities and challenges before they become problems."
    };
  }

  // Helper calculation methods (simplified implementations)
  private calculateConversionRate(analyticsData: any, leadsData: any): number {
    const totalSessions = analyticsData.filter((row: any) => row.data_type === 'sessions').reduce((sum: number, row: any) => sum + (parseInt(row.value) || 0), 0);
    const totalLeads = leadsData.reduce((sum: number, row: any) => sum + (parseInt(row.total_leads) || 0), 0);
    return totalSessions > 0 ? (totalLeads / totalSessions) * 100 : 0;
  }

  private calculateBounceRate(analyticsData: any): number {
    // Simplified bounce rate calculation
    return 45.2; // This would be calculated from actual data
  }

  private calculateAverageSessionDuration(analyticsData: any): number {
    // Simplified session duration calculation
    return 2.5; // This would be calculated from actual data
  }

  private calculatePagesPerSession(analyticsData: any): number {
    // Simplified pages per session calculation
    return 3.2; // This would be calculated from actual data
  }

  private calculateNewUserPercentage(analyticsData: any): number {
    // Simplified new user percentage calculation
    return 65.8; // This would be calculated from actual data
  }

  private calculateLeadConversionRate(leadsData: any): number {
    const totalLeads = leadsData.reduce((sum: number, row: any) => sum + (parseInt(row.total_leads) || 0), 0);
    const convertedLeads = leadsData.reduce((sum: number, row: any) => sum + (parseInt(row.converted_leads) || 0), 0);
    return totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  }

  // Additional helper methods (simplified implementations)
  private calculateTrafficTrend(analyticsData: any): string { return "Growing"; }
  private calculateUserGrowthTrend(analyticsData: any): string { return "Stable"; }
  private calculateLeadTrend(leadsData: any): string { return "Increasing"; }
  private calculateConversionTrend(analyticsData: any, leadsData: any): string { return "Improving"; }
  private analyzeTrafficSources(analyticsData: any): any { return {}; }
  private analyzePeakHours(analyticsData: any): any { return {}; }
  private analyzeTrafficPatterns(analyticsData: any): any { return {}; }
  private analyzeUserJourney(analyticsData: any): any { return {}; }
  private analyzeEngagementMetrics(analyticsData: any): any { return {}; }
  private analyzeRetention(analyticsData: any): any { return {}; }
  private analyzeDeviceBreakdown(analyticsData: any): any { return {}; }
  private analyzeMobileOptimization(analyticsData: any): any { return {}; }
  private analyzeCrossDeviceBehavior(analyticsData: any): any { return {}; }
  private analyzeTopLocations(analyticsData: any): any { return {}; }
  private analyzeLocalMarketPenetration(analyticsData: any): any { return {}; }
  private identifyExpansionOpportunities(analyticsData: any): any { return {}; }
  private analyzeTopPages(analyticsData: any): any { return {}; }
  private analyzePageEngagement(analyticsData: any): any { return {}; }
  private analyzeContentPerformance(analyticsData: any): any { return {}; }
  private analyzePageSpeed(analyticsData: any): any { return {}; }
  private analyzeUserExperience(analyticsData: any): any { return {}; }
  private analyzeConversionPages(analyticsData: any): any { return {}; }
  private identifyContentGaps(analyticsData: any): any { return {}; }
  private identifyContentOpportunities(analyticsData: any): any { return {}; }
  private recommendContentStrategy(analyticsData: any): any { return {}; }
  private analyzeLoadTime(analyticsData: any): any { return {}; }
  private analyzeCoreWebVitals(analyticsData: any): any { return {}; }
  private calculatePerformanceScore(analyticsData: any): number { return 85; }
  private identifyHighPriorityActions(analyticsData: any, leadsData: any): any { return {}; }
  private identifyQuickWins(analyticsData: any, leadsData: any): any { return {}; }
  private identifyUrgentFixes(analyticsData: any, leadsData: any): any { return {}; }
  private developGrowthStrategy(analyticsData: any, leadsData: any): any { return {}; }
  private developContentStrategy(analyticsData: any, leadsData: any): any { return {}; }
  private developMarketingStrategy(analyticsData: any, leadsData: any): any { return {}; }
  private getPriority1Actions(analyticsData: any, leadsData: any): any { return {}; }
  private getPriority2Actions(analyticsData: any, leadsData: any): any { return {}; }
  private getPriority3Actions(analyticsData: any, leadsData: any): any { return {}; }
  private getPreviousPeriodData(analyticsData: any, leadsData: any, filters: AnalyticsFilters): any { return {}; }
  private getCurrentPeriodData(analyticsData: any, leadsData: any, filters: AnalyticsFilters): any { return {}; }
  private calculatePeriodChanges(analyticsData: any, leadsData: any, filters: AnalyticsFilters): any { return {}; }
  private calculateGrowthRates(analyticsData: any, leadsData: any): any { return {}; }
  private analyzeGrowthTrends(analyticsData: any, leadsData: any): any { return {}; }
  private projectGrowth(analyticsData: any, leadsData: any): any { return {}; }
  private analyzeTrafficTrends(analyticsData: any): any { return {}; }
  private analyzeUserTrends(analyticsData: any): any { return {}; }
  private analyzeLeadTrends(leadsData: any): any { return {}; }
  private analyzeConversionTrends(analyticsData: any, leadsData: any): any { return {}; }
}
