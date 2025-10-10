/**
 * Detailed Page Analyzer
 * Provides specific page-level recommendations with URLs
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

type CheerioAPI = ReturnType<typeof cheerio.load>;

interface PageIssue {
  page: string;
  url: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  category: string;
}

interface BrokenLinkDetail {
  brokenUrl: string;
  foundOnPage: string;
  foundOnPageUrl: string;
  statusCode?: number;
  error?: string;
  linkText?: string;
}

interface PageAnalysis {
  url: string;
  title: string;
  issues: PageIssue[];
  brokenLinks: BrokenLinkDetail[];
  missingElements: string[];
  recommendations: string[];
}

export class DetailedPageAnalyzer {
  private maxPagesToAnalyze = 10; // Limit to avoid overload
  private timeout = 10000; // 10 seconds

  /**
   * Analyze multiple pages and return detailed issues
   */
  async analyzeWebsite(baseUrl: string): Promise<{
    pages: PageAnalysis[];
    allIssues: PageIssue[];
    allBrokenLinks: BrokenLinkDetail[];
    summary: {
      totalPages: number;
      totalIssues: number;
      totalBrokenLinks: number;
      criticalIssues: number;
    };
  }> {
    console.log(`🔍 Starting detailed page analysis for ${baseUrl}`);
    
    try {
      // 1. Discover pages to analyze
      const pagesToAnalyze = await this.discoverPages(baseUrl);
      console.log(`📄 Found ${pagesToAnalyze.length} pages to analyze`);
      
      // 2. Analyze each page
      const pageAnalyses: PageAnalysis[] = [];
      const allIssues: PageIssue[] = [];
      const allBrokenLinks: BrokenLinkDetail[] = [];
      
      for (const pageUrl of pagesToAnalyze) {
        try {
          const analysis = await this.analyzeSinglePage(pageUrl, baseUrl);
          pageAnalyses.push(analysis);
          allIssues.push(...analysis.issues);
          allBrokenLinks.push(...analysis.brokenLinks);
        } catch (error) {
          console.error(`Failed to analyze ${pageUrl}:`, error);
        }
      }
      
      // 3. Generate summary
      const summary = {
        totalPages: pageAnalyses.length,
        totalIssues: allIssues.length,
        totalBrokenLinks: allBrokenLinks.length,
        criticalIssues: allIssues.filter(i => i.severity === 'high').length
      };
      
      console.log(`✅ Analysis complete: ${summary.totalPages} pages, ${summary.totalIssues} issues, ${summary.totalBrokenLinks} broken links`);
      
      return {
        pages: pageAnalyses,
        allIssues,
        allBrokenLinks,
        summary
      };
    } catch (error) {
      console.error('Website analysis error:', error);
      throw error;
    }
  }

  /**
   * Discover pages on the website
   */
  private async discoverPages(baseUrl: string): Promise<string[]> {
    const pages = new Set<string>();
    pages.add(baseUrl);
    
    try {
      const response = await axios.get(baseUrl, { timeout: this.timeout });
      const $ = cheerio.load(response.data);
      
      // Get all internal links
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const fullUrl = new URL(href, baseUrl).href;
            const baseUrlObj = new URL(baseUrl);
            const fullUrlObj = new URL(fullUrl);
            
            // Only add internal links from same domain
            if (fullUrlObj.hostname === baseUrlObj.hostname && 
                pages.size < this.maxPagesToAnalyze &&
                !fullUrl.includes('#') && 
                !fullUrl.match(/\.(jpg|jpeg|png|gif|pdf|zip|css|js)$/i)) {
              pages.add(fullUrl);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });
    } catch (error) {
      console.error('Error discovering pages:', error);
    }
    
    return Array.from(pages).slice(0, this.maxPagesToAnalyze);
  }

  /**
   * Analyze a single page for issues
   */
  private async analyzeSinglePage(pageUrl: string, baseUrl: string): Promise<PageAnalysis> {
    const issues: PageIssue[] = [];
    const brokenLinks: BrokenLinkDetail[] = [];
    const missingElements: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const response = await axios.get(pageUrl, { timeout: this.timeout });
      const $ = cheerio.load(response.data);
      const pageTitle = $('title').text() || 'Untitled Page';
      
      // 1. Check meta tags
      this.checkMetaTags($, pageUrl, issues);
      
      // 2. Check headings
      this.checkHeadings($, pageUrl, issues);
      
      // 3. Check images
      this.checkImages($, pageUrl, issues);
      
      // 4. Check broken links
      await this.checkPageBrokenLinks($, pageUrl, brokenLinks);
      
      // 5. Check content quality
      this.checkContentQuality($, pageUrl, issues);
      
      // 6. Check mobile-friendliness indicators
      this.checkMobileFriendly($, pageUrl, issues);
      
      // 7. Generate page-specific recommendations
      this.generatePageRecommendations(issues, recommendations);
      
      return {
        url: pageUrl,
        title: pageTitle,
        issues,
        brokenLinks,
        missingElements,
        recommendations
      };
    } catch (error) {
      console.error(`Error analyzing page ${pageUrl}:`, error);
      return {
        url: pageUrl,
        title: 'Error Loading Page',
        issues: [{
          page: pageUrl,
          url: pageUrl,
          issue: 'Page could not be loaded',
          severity: 'high',
          recommendation: 'Check if page exists and is accessible',
          category: 'accessibility'
        }],
        brokenLinks: [],
        missingElements: [],
        recommendations: []
      };
    }
  }

  /**
   * Check meta tags on a page
   */
  private checkMetaTags($: CheerioAPI, pageUrl: string, issues: PageIssue[]) {
    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content');
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    
    if (!title || title.length < 10) {
      issues.push({
        page: $('title').text() || 'Untitled',
        url: pageUrl,
        issue: 'Missing or too short title tag',
        severity: 'high',
        recommendation: 'Add a descriptive title tag (50-60 characters)',
        category: 'meta-tags'
      });
    } else if (title.length > 60) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: 'Title tag is too long',
        severity: 'medium',
        recommendation: 'Shorten title tag to 50-60 characters',
        category: 'meta-tags'
      });
    }
    
    if (!metaDescription) {
      issues.push({
        page: title || 'Unknown',
        url: pageUrl,
        issue: 'Missing meta description',
        severity: 'high',
        recommendation: 'Add a meta description (150-160 characters)',
        category: 'meta-tags'
      });
    } else if (metaDescription.length < 50 || metaDescription.length > 160) {
      issues.push({
        page: title || 'Unknown',
        url: pageUrl,
        issue: 'Meta description length not optimal',
        severity: 'medium',
        recommendation: 'Optimize meta description to 150-160 characters',
        category: 'meta-tags'
      });
    }
    
    if (!ogTitle || !ogDescription || !ogImage) {
      issues.push({
        page: title || 'Unknown',
        url: pageUrl,
        issue: 'Missing Open Graph tags for social sharing',
        severity: 'low',
        recommendation: 'Add og:title, og:description, and og:image tags',
        category: 'social-media'
      });
    }
  }

  /**
   * Check heading structure
   */
  private checkHeadings($: CheerioAPI, pageUrl: string, issues: PageIssue[]) {
    const h1Count = $('h1').length;
    const title = $('title').text() || 'Unknown';
    
    if (h1Count === 0) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: 'No H1 heading found',
        severity: 'high',
        recommendation: 'Add one H1 heading that describes the page content',
        category: 'content-structure'
      });
    } else if (h1Count > 1) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: `Multiple H1 headings found (${h1Count})`,
        severity: 'medium',
        recommendation: 'Use only one H1 heading per page',
        category: 'content-structure'
      });
    }
    
    // Check for heading hierarchy
    let lastLevel = 0;
    let hierarchyBroken = false;
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const level = parseInt(el.tagName.substring(1));
      if (level - lastLevel > 1) {
        hierarchyBroken = true;
      }
      lastLevel = level;
    });
    
    if (hierarchyBroken) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: 'Heading hierarchy is broken',
        severity: 'low',
        recommendation: 'Maintain proper heading hierarchy (H1 → H2 → H3)',
        category: 'content-structure'
      });
    }
  }

  /**
   * Check images
   */
  private checkImages($: CheerioAPI, pageUrl: string, issues: PageIssue[]) {
    const title = $('title').text() || 'Unknown';
    let missingAltCount = 0;
    
    $('img').each((i, el) => {
      const alt = $(el).attr('alt');
      if (!alt || alt.trim() === '') {
        missingAltCount++;
      }
    });
    
    if (missingAltCount > 0) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: `${missingAltCount} image(s) missing alt text`,
        severity: 'medium',
        recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
        category: 'images'
      });
    }
  }

  /**
   * Check broken links on a specific page
   */
  private async checkPageBrokenLinks($: CheerioAPI, pageUrl: string, brokenLinks: BrokenLinkDetail[]) {
    const links = $('a[href]');
    const linksToCheck: { url: string; text: string }[] = [];
    
    links.each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        linksToCheck.push({ url: href, text });
      }
    });
    
    // Check up to 20 links per page
    for (const link of linksToCheck.slice(0, 20)) {
      try {
        const fullUrl = new URL(link.url, pageUrl).href;
        const response = await axios.head(fullUrl, { timeout: 5000, maxRedirects: 5 });
        
        if (response.status >= 400) {
          brokenLinks.push({
            brokenUrl: fullUrl,
            foundOnPage: $('title').text() || 'Unknown',
            foundOnPageUrl: pageUrl,
            statusCode: response.status,
            linkText: link.text
          });
        }
      } catch (error: any) {
        // Only add if it's a real error (not just timeout)
        if (error.code === 'ENOTFOUND' || error.response?.status >= 400) {
          brokenLinks.push({
            brokenUrl: link.url,
            foundOnPage: $('title').text() || 'Unknown',
            foundOnPageUrl: pageUrl,
            error: error.message,
            statusCode: error.response?.status,
            linkText: link.text
          });
        }
      }
    }
  }

  /**
   * Check content quality
   */
  private checkContentQuality($: CheerioAPI, pageUrl: string, issues: PageIssue[]) {
    const title = $('title').text() || 'Unknown';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').length;
    
    if (wordCount < 300) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: `Thin content detected (${wordCount} words)`,
        severity: 'medium',
        recommendation: 'Add more valuable content (aim for 300+ words minimum)',
        category: 'content'
      });
    }
  }

  /**
   * Check mobile-friendly indicators
   */
  private checkMobileFriendly($: CheerioAPI, pageUrl: string, issues: PageIssue[]) {
    const title = $('title').text() || 'Unknown';
    const viewport = $('meta[name="viewport"]').attr('content');
    
    if (!viewport) {
      issues.push({
        page: title,
        url: pageUrl,
        issue: 'Missing viewport meta tag',
        severity: 'high',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
        category: 'mobile'
      });
    }
  }

  /**
   * Generate page-specific recommendations
   */
  private generatePageRecommendations(issues: PageIssue[], recommendations: string[]) {
    const highPriorityIssues = issues.filter(i => i.severity === 'high');
    highPriorityIssues.forEach(issue => {
      recommendations.push(`🔴 ${issue.issue}: ${issue.recommendation}`);
    });
  }
}

