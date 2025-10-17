import pool from '../config/database';
import { GoogleAnalyticsService } from './googleAnalyticsService';
import { GoogleSearchConsoleService } from './googleSearchConsoleService';

export interface SEOChecklistItem {
  id: string;
  name: string;
  category: 'title' | 'meta' | 'content' | 'technical' | 'performance' | 'schema' | 'links' | 'images';
  status: 'passed' | 'failed' | 'warning' | 'not_checked';
  current_value?: string | number;
  target_value?: string | number;
  score: number; // 0-100
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  page_specific: boolean; // true if this check varies per page
}

export interface PageSEOResult {
  page_url: string;
  page_title: string;
  overall_score: number;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  checklist: SEOChecklistItem[];
  last_audited: string;
}

export interface ClientSEOChecklist {
  client_id: number;
  client_name: string;
  overall_score: number;
  total_pages: number;
  pages_audited: number;
  pages: PageSEOResult[];
  summary: {
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
    warning_checks: number;
    critical_issues: number;
    improvement_opportunities: number;
  };
  last_updated: string;
}

export class SEOChecklistService {
  private googleAnalyticsService: GoogleAnalyticsService;
  private googleSearchConsoleService: GoogleSearchConsoleService;

  constructor() {
    this.googleAnalyticsService = new GoogleAnalyticsService();
    this.googleSearchConsoleService = new GoogleSearchConsoleService();
  }

  /**
   * Get SEO checklist for a client with per-page results
   */
  async getClientSEOChecklist(clientId: number): Promise<ClientSEOChecklist> {
    try {
      // Get client info
      const clientResult = await pool.query(
        'SELECT id, client_name FROM clients WHERE id = $1',
        [clientId]
      );
      
      if (clientResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      const client = clientResult.rows[0];

      // Get SEO configuration for this client
      const config = await this.getSEOConfiguration(clientId);

      // Get pages from Google Analytics and Search Console
      const pages = await this.getClientPages(clientId);

      // If no real pages found, return empty checklist with clear message
      if (pages.length === 0) {
        return {
          client_id: clientId,
          client_name: client.client_name,
          overall_score: 0,
          total_pages: 0,
          pages_audited: 0,
          pages: [],
          summary: {
            total_checks: 0,
            passed_checks: 0,
            failed_checks: 0,
            warning_checks: 0,
            critical_issues: 0,
            improvement_opportunities: 0
          },
          last_updated: new Date().toISOString()
        };
      }

      // Audit each page
      const pageResults: PageSEOResult[] = [];
      let totalChecks = 0;
      let passedChecks = 0;
      let failedChecks = 0;
      let warningChecks = 0;

      for (const page of pages) {
        const pageResult = await this.auditPage(clientId, page, config);
        pageResults.push(pageResult);
        
        totalChecks += pageResult.total_checks;
        passedChecks += pageResult.passed_checks;
        failedChecks += pageResult.failed_checks;
        warningChecks += pageResult.warning_checks;
      }

      // Calculate overall score
      const overallScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

      // Count critical issues (high priority failures)
      const criticalIssues = pageResults.reduce((count, page) => {
        return count + page.checklist.filter(item => 
          item.priority === 'high' && item.status === 'failed'
        ).length;
      }, 0);

      // Count improvement opportunities (medium priority warnings/failures)
      const improvementOpportunities = pageResults.reduce((count, page) => {
        return count + page.checklist.filter(item => 
          item.priority === 'medium' && (item.status === 'failed' || item.status === 'warning')
        ).length;
      }, 0);

      return {
        client_id: clientId,
        client_name: client.client_name,
        overall_score: overallScore,
        total_pages: pages.length,
        pages_audited: pageResults.length,
        pages: pageResults,
        summary: {
          total_checks: totalChecks,
          passed_checks: passedChecks,
          failed_checks: failedChecks,
          warning_checks: warningChecks,
          critical_issues: criticalIssues,
          improvement_opportunities: improvementOpportunities
        },
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting SEO checklist:', error);
      throw error;
    }
  }

  /**
   * Get SEO configuration for a client
   */
  async getSEOConfiguration(clientId: number): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM seo_configurations WHERE client_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        [clientId]
      );

      if (result.rows.length === 0) {
        return this.getDefaultSEOConfiguration();
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting SEO configuration:', error);
      return this.getDefaultSEOConfiguration();
    }
  }

  /**
   * Get default SEO configuration based on industry standards
   */
  private getDefaultSEOConfiguration(): any {
    return {
      // Title Tag Configuration (SEMrush/Ahrefs standards)
      title_min_length: 30,
      title_max_length: 60,
      title_require_keyword: true,
      title_require_brand: true,
      
      // H1 Configuration
      h1_require_keyword: true,
      h1_max_count: 1,
      h1_min_length: 10,
      h1_max_length: 70,
      
      // Meta Description Configuration
      meta_desc_min_length: 120,
      meta_desc_max_length: 160,
      meta_desc_require_keyword: true,
      
      // URL Configuration
      url_max_length: 75,
      url_require_keyword: true,
      url_avoid_stop_words: true,
      url_require_lowercase: true,
      
      // Content Configuration
      content_min_words: 600,
      keyword_density_min: 0.50,
      keyword_density_max: 2.00,
      content_require_subheadings: true,
      content_min_subheadings: 2,
      
      // Internal Linking Configuration
      internal_links_min: 2,
      internal_links_max: 10,
      
      // Visual Content Configuration
      images_min_count: 1,
      images_require_alt: true,
      images_require_optimization: true,
      
      // Schema Markup Configuration
      schema_require_organization: true,
      schema_require_website: true,
      schema_require_breadcrumb: true,
      schema_require_article: false,
      schema_require_local_business: false,
      
      // Technical SEO Configuration (Core Web Vitals)
      page_speed_lcp_max: 2.50,
      page_speed_cls_max: 0.10,
      page_speed_fid_max: 100.00,
      mobile_friendly_required: true,
      ssl_required: true,
      
      // Indexing Configuration
      indexing_required: true,
      sitemap_required: true,
      robots_txt_required: true,
      
      // Advanced Configuration
      gtm_required: true,
      ga4_required: true,
      gsc_required: true,
      social_meta_required: true,
      canonical_required: true
    };
  }

  /**
   * Get pages for a client from Google Analytics and Search Console
   */
  private async getClientPages(clientId: number): Promise<any[]> {
    try {
      const pages = new Set<string>();

      // Get pages from Google Analytics
      try {
        const gaCredentials = await this.googleAnalyticsService.getClientCredentials(clientId);
        if (gaCredentials && gaCredentials.property_id) {
          const gaData = await this.googleAnalyticsService.getAnalyticsData(clientId, gaCredentials.property_id);
          if (gaData.topPages && Array.isArray(gaData.topPages)) {
            gaData.topPages.forEach((page: any) => {
              if (page.page) {
                pages.add(page.page);
              }
            });
          }
        }
      } catch (error) {
        console.warn('Could not get GA pages:', error);
      }

      // Get pages from Search Console
      try {
        const scCredentials = await this.googleSearchConsoleService.getClientCredentials(clientId);
        if (scCredentials && scCredentials.site_url) {
          const scData = await this.googleSearchConsoleService.getSearchConsoleData(clientId, scCredentials.site_url);
          if (scData.topPages && Array.isArray(scData.topPages)) {
            scData.topPages.forEach((page: any) => {
              if (page.page) {
                pages.add(page.page);
              }
            });
          }
        }
      } catch (error) {
        console.warn('Could not get SC pages:', error);
      }

      // Convert to array - only return real pages from analytics data
      const pageArray = Array.from(pages);
      
      // If no real pages found, return empty array - NO FALLBACK PAGES
      if (pageArray.length === 0) {
        console.log(`No real pages found for client ${clientId} from Google Analytics or Search Console. Real data required.`);
        return [];
      }

      return pageArray.map(url => ({
        url,
        title: this.generatePageTitle(url)
      }));
    } catch (error) {
      console.error('Error getting client pages:', error);
      return []; // Return empty array - NO FALLBACK PAGES, REAL DATA ONLY
    }
  }

  /**
   * Generate a page title based on URL
   */
  private generatePageTitle(url: string): string {
    if (url === '/') return 'Home';
    if (url === '/about') return 'About Us';
    if (url === '/contact') return 'Contact Us';
    if (url === '/services') return 'Services';
    if (url === '/blog') return 'Blog';
    
    // Convert URL to title
    return url.replace(/^\//, '').replace(/\//g, ' > ').replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Audit a single page for SEO - NO MOCK DATA
   */
  private async auditPage(clientId: number, page: any, config: any): Promise<PageSEOResult> {
    // Return empty checklist - NO MOCK DATA
    // Real SEO analysis requires page crawling and actual data collection
    return {
      page_url: page.url,
      page_title: page.title,
      overall_score: 0,
      total_checks: 0,
      passed_checks: 0,
      failed_checks: 0,
      warning_checks: 0,
      checklist: [],
      last_audited: new Date().toISOString()
    };
  }

  /**
   * Create a "not checked" item with clear messaging
   */
  private createNotCheckedItem(id: string, name: string, category: any, config: any, recommendation: string): SEOChecklistItem {
    return {
      id,
      name,
      category,
      status: 'not_checked',
      current_value: 'Real analysis required',
      target_value: 'See configuration',
      score: 0,
      recommendation,
      priority: 'high',
      page_specific: true
    };
  }

  /**
   * Update SEO configuration for a client
   */
  async updateSEOConfiguration(clientId: number, configuration: any, userId?: number): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT id FROM seo_configurations WHERE client_id = $1 AND is_active = true',
        [clientId]
      );

      if (result.rows.length > 0) {
        // Update existing configuration
        await pool.query(
          `UPDATE seo_configurations SET 
           title_min_length = $1, title_max_length = $2, title_require_keyword = $3, title_require_brand = $4,
           h1_require_keyword = $5, h1_max_count = $6, h1_min_length = $7, h1_max_length = $8,
           meta_desc_min_length = $9, meta_desc_max_length = $10, meta_desc_require_keyword = $11,
           url_max_length = $12, url_require_keyword = $13, url_avoid_stop_words = $14, url_require_lowercase = $15,
           content_min_words = $16, keyword_density_min = $17, keyword_density_max = $18,
           content_require_subheadings = $19, content_min_subheadings = $20,
           internal_links_min = $21, internal_links_max = $22,
           images_min_count = $23, images_require_alt = $24, images_require_optimization = $25,
           schema_require_organization = $26, schema_require_website = $27, schema_require_breadcrumb = $28,
           schema_require_article = $29, schema_require_local_business = $30,
           page_speed_lcp_max = $31, page_speed_cls_max = $32, page_speed_fid_max = $33,
           mobile_friendly_required = $34, ssl_required = $35,
           indexing_required = $36, sitemap_required = $37, robots_txt_required = $38,
           gtm_required = $39, ga4_required = $40, gsc_required = $41,
           social_meta_required = $42, canonical_required = $43,
           custom_rules = $44, updated_at = CURRENT_TIMESTAMP
           WHERE client_id = $45 AND is_active = true`,
          [
            configuration.title_min_length, configuration.title_max_length, configuration.title_require_keyword, configuration.title_require_brand,
            configuration.h1_require_keyword, configuration.h1_max_count, configuration.h1_min_length, configuration.h1_max_length,
            configuration.meta_desc_min_length, configuration.meta_desc_max_length, configuration.meta_desc_require_keyword,
            configuration.url_max_length, configuration.url_require_keyword, configuration.url_avoid_stop_words, configuration.url_require_lowercase,
            configuration.content_min_words, configuration.keyword_density_min, configuration.keyword_density_max,
            configuration.content_require_subheadings, configuration.content_min_subheadings,
            configuration.internal_links_min, configuration.internal_links_max,
            configuration.images_min_count, configuration.images_require_alt, configuration.images_require_optimization,
            configuration.schema_require_organization, configuration.schema_require_website, configuration.schema_require_breadcrumb,
            configuration.schema_require_article, configuration.schema_require_local_business,
            configuration.page_speed_lcp_max, configuration.page_speed_cls_max, configuration.page_speed_fid_max,
            configuration.mobile_friendly_required, configuration.ssl_required,
            configuration.indexing_required, configuration.sitemap_required, configuration.robots_txt_required,
            configuration.gtm_required, configuration.ga4_required, configuration.gsc_required,
            configuration.social_meta_required, configuration.canonical_required,
            JSON.stringify(configuration.custom_rules || {}), clientId
          ]
        );
      } else {
        // Create new configuration
        await pool.query(
          `INSERT INTO seo_configurations (
           client_id, title_min_length, title_max_length, title_require_keyword, title_require_brand,
           h1_require_keyword, h1_max_count, h1_min_length, h1_max_length,
           meta_desc_min_length, meta_desc_max_length, meta_desc_require_keyword,
           url_max_length, url_require_keyword, url_avoid_stop_words, url_require_lowercase,
           content_min_words, keyword_density_min, keyword_density_max,
           content_require_subheadings, content_min_subheadings,
           internal_links_min, internal_links_max,
           images_min_count, images_require_alt, images_require_optimization,
           schema_require_organization, schema_require_website, schema_require_breadcrumb,
           schema_require_article, schema_require_local_business,
           page_speed_lcp_max, page_speed_cls_max, page_speed_fid_max,
           mobile_friendly_required, ssl_required,
           indexing_required, sitemap_required, robots_txt_required,
           gtm_required, ga4_required, gsc_required,
           social_meta_required, canonical_required, custom_rules, created_by
           ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
           $39, $40, $41, $42, $43, $44, $45
           )`,
          [
            clientId, configuration.title_min_length, configuration.title_max_length, configuration.title_require_keyword, configuration.title_require_brand,
            configuration.h1_require_keyword, configuration.h1_max_count, configuration.h1_min_length, configuration.h1_max_length,
            configuration.meta_desc_min_length, configuration.meta_desc_max_length, configuration.meta_desc_require_keyword,
            configuration.url_max_length, configuration.url_require_keyword, configuration.url_avoid_stop_words, configuration.url_require_lowercase,
            configuration.content_min_words, configuration.keyword_density_min, configuration.keyword_density_max,
            configuration.content_require_subheadings, configuration.content_min_subheadings,
            configuration.internal_links_min, configuration.internal_links_max,
            configuration.images_min_count, configuration.images_require_alt, configuration.images_require_optimization,
            configuration.schema_require_organization, configuration.schema_require_website, configuration.schema_require_breadcrumb,
            configuration.schema_require_article, configuration.schema_require_local_business,
            configuration.page_speed_lcp_max, configuration.page_speed_cls_max, configuration.page_speed_fid_max,
            configuration.mobile_friendly_required, configuration.ssl_required,
            configuration.indexing_required, configuration.sitemap_required, configuration.robots_txt_required,
            configuration.gtm_required, configuration.ga4_required, configuration.gsc_required,
            configuration.social_meta_required, configuration.canonical_required,
            JSON.stringify(configuration.custom_rules || {}), userId
          ]
        );
      }
    } catch (error) {
      console.error('Error updating SEO configuration:', error);
      throw error;
    }
  }
}
