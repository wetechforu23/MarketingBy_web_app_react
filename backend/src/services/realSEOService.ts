import axios from 'axios';
import * as cheerio from 'cheerio';

export interface RealSEOAnalysis {
  url: string;
  score: number;
  technicalSeo: {
    hasSSL: boolean;
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
    schemaMarkup: boolean;
    mobileFriendly: boolean;
    pageSpeedScore?: number;
    coreWebVitals?: {
      lcp?: number;
      fid?: number;
      cls?: number;
    };
  };
  contentAnalysis: {
    wordCount: number;
    h1Count: number;
    keywordDensity: { keyword: string; density: number }[];
    titleLength: number;
    metaDescriptionLength: number;
    headingStructure: { level: number; count: number }[];
  };
  performance: {
    pageSize: string;
    loadTime: string;
    pageSpeedInsights?: any;
  };
  accessibility: {
    altTextsMissing: number;
    ariaLabelsMissing: number;
    colorContrastIssues: number;
    keyboardNavigationIssues: number;
  };
  recommendations: string[];
}

export class RealSEOService {
  private static instance: RealSEOService;
  private googleApiKey: string;

  private constructor() {
    this.googleApiKey = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  }

  public static getInstance(): RealSEOService {
    if (!RealSEOService.instance) {
      RealSEOService.instance = new RealSEOService();
    }
    return RealSEOService.instance;
  }

  async analyzeWebsite(url: string, keywords: string[] = []): Promise<RealSEOAnalysis> {
    console.log(`Starting real SEO analysis for: ${url}`);
    
    try {
      // Fetch website content
      const websiteData = await this.fetchWebsiteContent(url);
      
      // Perform technical SEO analysis
      const technicalSeo = await this.analyzeTechnicalSEO(url, websiteData);
      
      // Perform content analysis
      const contentAnalysis = this.analyzeContent(websiteData, keywords);
      
      // Perform performance analysis
      const performance = await this.analyzePerformance(url);
      
      // Perform accessibility analysis
      const accessibility = this.analyzeAccessibility(websiteData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(technicalSeo, contentAnalysis, performance, accessibility);
      
      // Calculate overall score
      const score = this.calculateScore(technicalSeo, contentAnalysis, performance, accessibility);
      
      const analysis: RealSEOAnalysis = {
        url,
        score,
        technicalSeo,
        contentAnalysis,
        performance,
        accessibility,
        recommendations
      };

      console.log(`SEO analysis completed for ${url} - Score: ${score}/100`);
      return analysis;

    } catch (error) {
      console.error(`SEO analysis failed for ${url}:`, error);
      throw new Error(`SEO analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchWebsiteContent(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      return {
        url: url,
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        content: $('body').text(),
        html: response.data,
        $: $,
        headers: response.headers,
        size: response.data.length
      };
    } catch (error) {
      console.error(`Failed to fetch website content for ${url}:`, error);
      throw new Error(`Failed to access website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeTechnicalSEO(url: string, websiteData: any): Promise<any> {
    const $ = websiteData.$;
    const technicalSeo: any = {
      hasSSL: url.startsWith('https://'),
      hasSitemap: false,
      hasRobotsTxt: false,
      schemaMarkup: false,
      mobileFriendly: false
    };

    // Check for sitemap
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      await axios.head(sitemapUrl, { timeout: 5000 });
      technicalSeo.hasSitemap = true;
    } catch (error) {
      // Sitemap not found
    }

    // Check for robots.txt
    try {
      const robotsUrl = new URL('/robots.txt', url).href;
      const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
      technicalSeo.hasRobotsTxt = robotsResponse.status === 200;
    } catch (error) {
      // Robots.txt not found
    }

    // Check for schema markup
    const schemaElements = $('script[type="application/ld+json"]');
    technicalSeo.schemaMarkup = schemaElements.length > 0;

    // Check for mobile-friendly viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    technicalSeo.mobileFriendly = !!viewport && viewport.includes('width=device-width');

    // Get PageSpeed Insights score if API key is available
    if (this.googleApiKey) {
      try {
        const pageSpeedData = await this.getPageSpeedInsights(url);
        technicalSeo.pageSpeedScore = pageSpeedData.lighthouseResult?.categories?.performance?.score * 100;
        technicalSeo.coreWebVitals = {
          lcp: pageSpeedData.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue,
          fid: pageSpeedData.lighthouseResult?.audits?.['max-potential-fid']?.numericValue,
          cls: pageSpeedData.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue
        };
      } catch (error) {
        console.error('PageSpeed Insights API failed:', error);
      }
    }

    return technicalSeo;
  }

  private analyzeContent(websiteData: any, keywords: string[]): any {
    const $ = websiteData.$;
    const content = websiteData.content;
    
    // Word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Heading analysis
    const h1Count = $('h1').length;
    const headingStructure = [
      { level: 1, count: $('h1').length },
      { level: 2, count: $('h2').length },
      { level: 3, count: $('h3').length },
      { level: 4, count: $('h4').length },
      { level: 5, count: $('h5').length },
      { level: 6, count: $('h6').length }
    ];

    // Title and meta description analysis
    const titleLength = websiteData.title.length;
    const metaDescriptionLength = websiteData.metaDescription.length;

    // Keyword density analysis
    const keywordDensity = this.calculateKeywordDensity(content, keywords);

    return {
      wordCount,
      h1Count,
      keywordDensity,
      titleLength,
      metaDescriptionLength,
      headingStructure
    };
  }

  private async analyzePerformance(url: string): Promise<any> {
    const performance: any = {
      pageSize: 'Unknown',
      loadTime: 'Unknown'
    };

    try {
      const startTime = Date.now();
      const response = await axios.get(url, { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      performance.pageSize = this.formatBytes(response.data.length);
      performance.loadTime = `${loadTime}ms`;

      // Get PageSpeed Insights data if available
      if (this.googleApiKey) {
        try {
          const pageSpeedData = await this.getPageSpeedInsights(url);
          performance.pageSpeedInsights = pageSpeedData;
        } catch (error) {
          console.error('PageSpeed Insights API failed:', error);
        }
      }
    } catch (error) {
      console.error('Performance analysis failed:', error);
    }

    return performance;
  }

  private analyzeAccessibility(websiteData: any): any {
    const $ = websiteData.$;
    
    // Count images without alt text
    const images = $('img');
    const imagesWithoutAlt = images.filter((_, img) => !$(img).attr('alt')).length;
    
    // Count elements without ARIA labels
    const elementsWithoutAria = $('*').filter((_, el) => {
      const $el = $(el);
      return $el.is('button, input, select, textarea') && !$el.attr('aria-label') && !$el.attr('aria-labelledby');
    }).length;

    // Basic color contrast check (simplified)
    const colorContrastIssues = this.checkColorContrast($);
    
    // Keyboard navigation issues (simplified)
    const keyboardNavigationIssues = this.checkKeyboardNavigation($);

    return {
      altTextsMissing: imagesWithoutAlt,
      ariaLabelsMissing: elementsWithoutAria,
      colorContrastIssues,
      keyboardNavigationIssues
    };
  }

  private calculateKeywordDensity(content: string, keywords: string[]): { keyword: string; density: number }[] {
    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    
    return keywords.map(keyword => {
      const keywordLower = keyword.toLowerCase();
      const keywordCount = words.filter(word => word.includes(keywordLower)).length;
      const density = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
      
      return { keyword, density: Math.round(density * 100) / 100 };
    });
  }

  private generateRecommendations(technicalSeo: any, contentAnalysis: any, performance: any, accessibility: any): string[] {
    const recommendations: string[] = [];

    // Technical SEO recommendations
    if (!technicalSeo.hasSSL) {
      recommendations.push('Enable SSL certificate (HTTPS) for better security and SEO');
    }
    if (!technicalSeo.hasSitemap) {
      recommendations.push('Create and submit an XML sitemap to help search engines crawl your site');
    }
    if (!technicalSeo.hasRobotsTxt) {
      recommendations.push('Add a robots.txt file to control search engine crawling');
    }
    if (!technicalSeo.schemaMarkup) {
      recommendations.push('Implement structured data (Schema.org markup) for rich snippets');
    }
    if (!technicalSeo.mobileFriendly) {
      recommendations.push('Optimize for mobile devices with responsive design');
    }

    // Content recommendations
    if (contentAnalysis.h1Count === 0) {
      recommendations.push('Add an H1 heading to improve content structure');
    }
    if (contentAnalysis.h1Count > 1) {
      recommendations.push('Use only one H1 heading per page for better SEO');
    }
    if (contentAnalysis.titleLength < 30) {
      recommendations.push('Increase title length to 30-60 characters for better SEO');
    }
    if (contentAnalysis.titleLength > 60) {
      recommendations.push('Reduce title length to under 60 characters to avoid truncation');
    }
    if (contentAnalysis.metaDescriptionLength < 120) {
      recommendations.push('Add or improve meta description (120-160 characters)');
    }
    if (contentAnalysis.wordCount < 300) {
      recommendations.push('Increase content length to at least 300 words for better SEO');
    }

    // Performance recommendations
    if (performance.loadTime && parseInt(performance.loadTime) > 3000) {
      recommendations.push('Optimize page loading speed (currently over 3 seconds)');
    }

    // Accessibility recommendations
    if (accessibility.altTextsMissing > 0) {
      recommendations.push(`Add alt text to ${accessibility.altTextsMissing} images for better accessibility`);
    }
    if (accessibility.ariaLabelsMissing > 0) {
      recommendations.push(`Add ARIA labels to ${accessibility.ariaLabelsMissing} interactive elements`);
    }

    return recommendations;
  }

  private calculateScore(technicalSeo: any, contentAnalysis: any, performance: any, accessibility: any): number {
    let score = 0;
    let maxScore = 0;

    // Technical SEO (30 points)
    maxScore += 30;
    if (technicalSeo.hasSSL) score += 6;
    if (technicalSeo.hasSitemap) score += 6;
    if (technicalSeo.hasRobotsTxt) score += 4;
    if (technicalSeo.schemaMarkup) score += 6;
    if (technicalSeo.mobileFriendly) score += 4;
    if (technicalSeo.pageSpeedScore) score += Math.min(4, technicalSeo.pageSpeedScore / 25);

    // Content (25 points)
    maxScore += 25;
    if (contentAnalysis.h1Count === 1) score += 5;
    if (contentAnalysis.titleLength >= 30 && contentAnalysis.titleLength <= 60) score += 5;
    if (contentAnalysis.metaDescriptionLength >= 120 && contentAnalysis.metaDescriptionLength <= 160) score += 5;
    if (contentAnalysis.wordCount >= 300) score += 5;
    if (contentAnalysis.headingStructure.filter(h => h.count > 0).length >= 3) score += 5;

    // Performance (25 points)
    maxScore += 25;
    if (performance.loadTime && parseInt(performance.loadTime) < 2000) score += 15;
    else if (performance.loadTime && parseInt(performance.loadTime) < 3000) score += 10;
    if (performance.pageSize && this.parseBytes(performance.pageSize) < 1000000) score += 10;

    // Accessibility (20 points)
    maxScore += 20;
    if (accessibility.altTextsMissing === 0) score += 8;
    else if (accessibility.altTextsMissing < 3) score += 4;
    if (accessibility.ariaLabelsMissing === 0) score += 6;
    else if (accessibility.ariaLabelsMissing < 2) score += 3;
    if (accessibility.colorContrastIssues === 0) score += 6;

    return Math.round((score / maxScore) * 100);
  }

  private async getPageSpeedInsights(url: string): Promise<any> {
    if (!this.googleApiKey) {
      throw new Error('Google PageSpeed Insights API key not configured');
    }

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
    const params = {
      url: url,
      key: this.googleApiKey,
      strategy: 'mobile',
      category: ['performance', 'accessibility', 'best-practices', 'seo']
    };

    const response = await axios.get(apiUrl, { params });
    return response.data;
  }

  private checkColorContrast($: any): number {
    // Simplified color contrast check
    // In a real implementation, you would analyze CSS and check contrast ratios
    return 0;
  }

  private checkKeyboardNavigation($: any): number {
    // Simplified keyboard navigation check
    // In a real implementation, you would check for proper tab order and focus management
    return 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private parseBytes(sizeStr: string): number {
    const match = sizeStr.match(/(\d+\.?\d*)\s*(KB|MB|GB)/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  async generateSEOReport(analysis: RealSEOAnalysis, lead: any): Promise<string> {
    const report = `
# SEO Analysis Report for ${lead.name || lead.company || 'Website'}

## Overall Score: ${analysis.score}/100

### Technical SEO Analysis
- **SSL Certificate**: ${analysis.technicalSeo.hasSSL ? '✅ Enabled' : '❌ Not Enabled'}
- **XML Sitemap**: ${analysis.technicalSeo.hasSitemap ? '✅ Found' : '❌ Not Found'}
- **Robots.txt**: ${analysis.technicalSeo.hasRobotsTxt ? '✅ Found' : '❌ Not Found'}
- **Schema Markup**: ${analysis.technicalSeo.schemaMarkup ? '✅ Implemented' : '❌ Not Implemented'}
- **Mobile Friendly**: ${analysis.technicalSeo.mobileFriendly ? '✅ Optimized' : '❌ Needs Optimization'}
${analysis.technicalSeo.pageSpeedScore ? `- **Page Speed Score**: ${Math.round(analysis.technicalSeo.pageSpeedScore)}/100` : ''}

### Content Analysis
- **Word Count**: ${analysis.contentAnalysis.wordCount} words
- **H1 Headings**: ${analysis.contentAnalysis.h1Count}
- **Title Length**: ${analysis.contentAnalysis.titleLength} characters
- **Meta Description**: ${analysis.contentAnalysis.metaDescriptionLength} characters

### Performance Metrics
- **Page Size**: ${analysis.performance.pageSize}
- **Load Time**: ${analysis.performance.loadTime}

### Accessibility
- **Images without Alt Text**: ${analysis.accessibility.altTextsMissing}
- **Elements without ARIA Labels**: ${analysis.accessibility.ariaLabelsMissing}

### Recommendations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated by WeTechForU Healthcare Marketing Platform*
    `.trim();

    return report;
  }
}
