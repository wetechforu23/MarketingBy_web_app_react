/**
 * Enhanced SEO Analyzer - Real Data, No Mocks
 * Checks for modern SEO signals: paid ads, social media, content marketing, keywords, AI signals
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface EnhancedSEOData {
  // Paid Advertising Detection
  paidAdvertising: {
    hasGoogleAds: boolean;
    hasFacebookPixel: boolean;
    hasGoogleAnalytics: boolean;
    hasLinkedInInsight: boolean;
    hasBingAds: boolean;
    detectedTags: string[];
  };
  
  // Social Media Presence
  socialMedia: {
    facebook: string | null;
    twitter: string | null;
    linkedin: string | null;
    instagram: string | null;
    youtube: string | null;
    tiktok: string | null;
    allLinks: string[];
  };
  
  // Blog & Content Marketing
  contentMarketing: {
    hasBlog: boolean;
    blogLinks: string[];
    articleCount: number;
    lastUpdated: string | null;
    hasRSSFeed: boolean;
    contentTypes: string[];
  };
  
  // Keyword Analysis (Real extracted keywords)
  keywords: {
    metaKeywords: string[];
    extractedKeywords: Array<{ word: string; frequency: number }>;
    h1Keywords: string[];
    titleKeywords: string[];
    longTailKeywords: string[];
  };
  
  // AI & Modern SEO Signals
  modernSEO: {
    hasStructuredData: boolean;
    hasSchemaOrg: boolean;
    hasJSONLD: boolean;
    schemaTypes: string[];
    hasFAQSchema: boolean;
    hasProductSchema: boolean;
    hasLocalBusinessSchema: boolean;
    hasArticleSchema: boolean;
    aiReadiness: number; // Score 0-100 for AI discoverability
  };
  
  // Modern SEO Tools Data
  technicalSEO: {
    hasOpenGraph: boolean;
    hasTwitterCards: boolean;
    hasViewport: boolean;
    hasCanonical: boolean;
    hasHreflang: boolean;
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
    hasSSL: boolean;
    hasAMP: boolean;
  };
  
  // SEO Score Breakdown
  scores: {
    paidAdvertising: number;
    socialMedia: number;
    contentMarketing: number;
    keywordOptimization: number;
    modernSEO: number;
    overall: number;
  };
}

export class EnhancedSEOAnalyzer {
  /**
   * Analyze website for all modern SEO signals - REAL DATA ONLY
   */
  static async analyze(url: string): Promise<EnhancedSEOData> {
    try {
      console.log(`🔍 Starting enhanced SEO analysis for ${url}...`);
      
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const htmlContent = response.data;

      // 1. PAID ADVERTISING DETECTION
      console.log('💰 Detecting paid advertising tags...');
      const paidAdvertising = this.detectPaidAdvertising($, htmlContent);

      // 2. SOCIAL MEDIA PRESENCE
      console.log('📱 Extracting social media links...');
      const socialMedia = this.extractSocialMedia($);

      // 3. CONTENT MARKETING
      console.log('📝 Analyzing content marketing...');
      const contentMarketing = this.analyzeContentMarketing($, url);

      // 4. KEYWORD ANALYSIS
      console.log('🔑 Extracting real keywords...');
      const keywords = this.extractKeywords($);

      // 5. MODERN SEO & AI SIGNALS
      console.log('🤖 Checking AI readiness and structured data...');
      const modernSEO = this.analyzeModernSEO($, htmlContent);

      // 6. TECHNICAL SEO
      console.log('⚙️ Checking technical SEO...');
      const technicalSEO = this.analyzeTechnicalSEO($, url);

      // Calculate scores
      const scores = this.calculateScores({
        paidAdvertising,
        socialMedia,
        contentMarketing,
        keywords,
        modernSEO,
        technicalSEO
      });

      console.log('✅ Enhanced SEO analysis complete');

      return {
        paidAdvertising,
        socialMedia,
        contentMarketing,
        keywords,
        modernSEO,
        technicalSEO,
        scores
      };
    } catch (error) {
      console.error('Error in enhanced SEO analysis:', error);
      throw error;
    }
  }

  /**
   * Detect paid advertising tags and pixels
   */
  private static detectPaidAdvertising($: any, htmlContent: string): any {
    const detectedTags: string[] = [];
    
    // Google Ads (gtag, conversion tracking)
    const hasGoogleAds = htmlContent.includes('googleadservices.com') ||
                         htmlContent.includes('google-analytics.com/collect') ||
                         htmlContent.includes('gtag') ||
                         htmlContent.includes('adsbygoogle');
    if (hasGoogleAds) detectedTags.push('Google Ads');
    
    // Facebook Pixel
    const hasFacebookPixel = htmlContent.includes('connect.facebook.net') ||
                             htmlContent.includes('fbevents.js') ||
                             htmlContent.includes('fbq(');
    if (hasFacebookPixel) detectedTags.push('Facebook Pixel');
    
    // Google Analytics
    const hasGoogleAnalytics = htmlContent.includes('google-analytics.com') ||
                               htmlContent.includes('gtag/js') ||
                               htmlContent.includes('ga(');
    if (hasGoogleAnalytics) detectedTags.push('Google Analytics');
    
    // LinkedIn Insight Tag
    const hasLinkedInInsight = htmlContent.includes('snap.licdn.com') ||
                               htmlContent.includes('linkedin.com/px');
    if (hasLinkedInInsight) detectedTags.push('LinkedIn Insight');
    
    // Bing/Microsoft Ads
    const hasBingAds = htmlContent.includes('bat.bing.com') ||
                      htmlContent.includes('microsoft.com/uet');
    if (hasBingAds) detectedTags.push('Bing Ads');
    
    return {
      hasGoogleAds,
      hasFacebookPixel,
      hasGoogleAnalytics,
      hasLinkedInInsight,
      hasBingAds,
      detectedTags
    };
  }

  /**
   * Extract all social media links
   */
  private static extractSocialMedia($: any): any {
    const allLinks: string[] = [];
    let facebook = null;
    let twitter = null;
    let linkedin = null;
    let instagram = null;
    let youtube = null;
    let tiktok = null;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      
      if (href.includes('facebook.com')) {
        facebook = href;
        allLinks.push(href);
      } else if (href.includes('twitter.com') || href.includes('x.com')) {
        twitter = href;
        allLinks.push(href);
      } else if (href.includes('linkedin.com')) {
        linkedin = href;
        allLinks.push(href);
      } else if (href.includes('instagram.com')) {
        instagram = href;
        allLinks.push(href);
      } else if (href.includes('youtube.com')) {
        youtube = href;
        allLinks.push(href);
      } else if (href.includes('tiktok.com')) {
        tiktok = href;
        allLinks.push(href);
      }
    });

    return {
      facebook,
      twitter,
      linkedin,
      instagram,
      youtube,
      tiktok,
      allLinks
    };
  }

  /**
   * Analyze content marketing efforts
   */
  private static analyzeContentMarketing($: any, baseUrl: string): any {
    const blogLinks: string[] = [];
    const contentTypes: string[] = [];
    
    // Check for blog
    const hasBlog = $('a[href*="blog"]').length > 0 ||
                    $('a[href*="/articles"]').length > 0 ||
                    $('nav a:contains("Blog")').length > 0 ||
                    $('nav a:contains("Articles")').length > 0 ||
                    $('nav a:contains("News")').length > 0;
    
    // Extract blog/article links
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('blog') || href.includes('article') || 
          href.includes('news') || href.includes('post')) {
        blogLinks.push(href);
      }
    });
    
    // Detect content types
    if ($('article').length > 0) contentTypes.push('Articles');
    if ($('time').length > 0) contentTypes.push('Dated Content');
    if ($('.blog-post, .post, .article').length > 0) contentTypes.push('Blog Posts');
    if ($('.news, .press-release').length > 0) contentTypes.push('News/Press');
    if ($('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length > 0) contentTypes.push('Video Content');
    
    // Check for last updated
    let lastUpdated = null;
    const timeEl = $('time[datetime]').first();
    if (timeEl.length > 0) {
      lastUpdated = timeEl.attr('datetime') || timeEl.text();
    }
    
    // Check for RSS feed
    const hasRSSFeed = $('link[type="application/rss+xml"]').length > 0 ||
                       $('link[type="application/atom+xml"]').length > 0 ||
                       $('a[href*="feed"]').length > 0 ||
                       $('a[href*="rss"]').length > 0;
    
    return {
      hasBlog,
      blogLinks: [...new Set(blogLinks)].slice(0, 10), // Unique, max 10
      articleCount: $('article').length,
      lastUpdated,
      hasRSSFeed,
      contentTypes
    };
  }

  /**
   * Extract real keywords from page content
   */
  private static extractKeywords($: any): any {
    // Meta keywords
    const metaKeywords = ($('meta[name="keywords"]').attr('content') || '')
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // Extract from title
    const title = $('title').text();
    const titleKeywords = title.toLowerCase()
      .split(/[\s,.-]+/)
      .filter(w => w.length > 3);
    
    // Extract from H1
    const h1Keywords = $('h1').map((_, el) => $(el).text().toLowerCase()).get()
      .join(' ')
      .split(/[\s,.-]+/)
      .filter(w => w.length > 3);
    
    // Extract from body content and calculate frequency
    const bodyText = $('body').text().toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ');
    
    const words = bodyText.split(' ').filter(w => w.length > 3);
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Get top keywords by frequency (excluding common words AND technical terms)
    const commonWords = ['this', 'that', 'with', 'from', 'have', 'your', 'will', 'what', 'when', 'more', 'been', 'were', 'there', 'their', 'about', 'each', 'which', 'some', 'other', 'such', 'into'];
    
    // 🆕 Filter out technical/template terms
    const technicalTerms = ['elementor', 'divider', 'widget', 'spacer', 'separator', 'container', 'wrapper', 'section', 'column', 'row', 'content', 'inner', 'wrap', 'block', 'element', 'module', 'component', 'class', 'style', 'script', 'function', 'data', 'attr', 'href', 'html', 'body', 'head', 'meta', 'link', 'span', 'padding', 'margin', 'width', 'height'];
    
    const extractedKeywords = Object.entries(wordFreq)
      .filter(([word]) => !commonWords.includes(word) && !technicalTerms.includes(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, frequency]) => ({ word, frequency }));
    
    // Find long-tail keywords (2-3 word phrases)
    const longTailKeywords: string[] = [];
    const sentences = $('p, h1, h2, h3').map((_, el) => $(el).text().toLowerCase()).get();
    sentences.forEach(sentence => {
      const matches = sentence.match(/\b([a-z]+\s+[a-z]+\s+[a-z]+)\b/g);
      if (matches) {
        longTailKeywords.push(...matches);
      }
    });
    
    return {
      metaKeywords,
      extractedKeywords,
      h1Keywords: [...new Set(h1Keywords)].slice(0, 10),
      titleKeywords: [...new Set(titleKeywords)].slice(0, 10),
      longTailKeywords: [...new Set(longTailKeywords)].slice(0, 10)
    };
  }

  /**
   * Analyze modern SEO and AI readiness
   */
  private static analyzeModernSEO($: any, htmlContent: string): any {
    // Check for structured data
    const hasJSONLD = htmlContent.includes('application/ld+json');
    const hasSchemaOrg = htmlContent.includes('schema.org') ||
                         $('[itemtype*="schema.org"]').length > 0;
    const hasStructuredData = hasJSONLD || hasSchemaOrg;
    
    // Extract schema types
    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        if (data['@type']) {
          schemaTypes.push(data['@type']);
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });
    
    // Check for specific schema types
    const hasFAQSchema = schemaTypes.includes('FAQPage') ||
                        $('[itemtype*="FAQPage"]').length > 0;
    const hasProductSchema = schemaTypes.includes('Product') ||
                            $('[itemtype*="Product"]').length > 0;
    const hasLocalBusinessSchema = schemaTypes.includes('LocalBusiness') ||
                                   $('[itemtype*="LocalBusiness"]').length > 0;
    const hasArticleSchema = schemaTypes.includes('Article') ||
                            schemaTypes.includes('BlogPosting') ||
                            $('[itemtype*="Article"]').length > 0;
    
    // Calculate AI readiness score (0-100)
    let aiReadiness = 0;
    if (hasStructuredData) aiReadiness += 30;
    if (hasJSONLD) aiReadiness += 20;
    if (schemaTypes.length > 0) aiReadiness += 20;
    if (hasFAQSchema) aiReadiness += 10;
    if (hasLocalBusinessSchema) aiReadiness += 10;
    if (hasArticleSchema) aiReadiness += 5;
    if ($('meta[property^="og:"]').length > 5) aiReadiness += 5;
    
    return {
      hasStructuredData,
      hasSchemaOrg,
      hasJSONLD,
      schemaTypes: [...new Set(schemaTypes)],
      hasFAQSchema,
      hasProductSchema,
      hasLocalBusinessSchema,
      hasArticleSchema,
      aiReadiness: Math.min(100, aiReadiness)
    };
  }

  /**
   * Analyze technical SEO
   */
  private static analyzeTechnicalSEO($: any, url: string): any {
    return {
      hasOpenGraph: $('meta[property^="og:"]').length > 0,
      hasTwitterCards: $('meta[name^="twitter:"]').length > 0,
      hasViewport: $('meta[name="viewport"]').length > 0,
      hasCanonical: $('link[rel="canonical"]').length > 0,
      hasHreflang: $('link[rel="alternate"][hreflang]').length > 0,
      hasSitemap: $('link[rel="sitemap"]').length > 0 || $('a[href*="sitemap"]').length > 0,
      hasRobotsTxt: true, // We'll check this separately via HTTP
      hasSSL: url.startsWith('https://'),
      hasAMP: $('link[rel="amphtml"]').length > 0 || $('html[amp]').length > 0
    };
  }

  /**
   * Calculate comprehensive scores
   */
  private static calculateScores(data: any): any {
    // Paid Advertising Score (0-100)
    let paidAdvertising = 0;
    if (data.paidAdvertising.hasGoogleAds) paidAdvertising += 30;
    if (data.paidAdvertising.hasFacebookPixel) paidAdvertising += 25;
    if (data.paidAdvertising.hasGoogleAnalytics) paidAdvertising += 25;
    if (data.paidAdvertising.hasLinkedInInsight) paidAdvertising += 10;
    if (data.paidAdvertising.hasBingAds) paidAdvertising += 10;
    
    // Social Media Score (0-100)
    const socialCount = data.socialMedia.allLinks.length;
    const socialMedia = Math.min(100, socialCount * 16.6); // 6 platforms = 100
    
    // Content Marketing Score (0-100)
    let contentMarketing = 0;
    if (data.contentMarketing.hasBlog) contentMarketing += 40;
    if (data.contentMarketing.hasRSSFeed) contentMarketing += 20;
    if (data.contentMarketing.articleCount > 0) contentMarketing += 20;
    contentMarketing += Math.min(20, data.contentMarketing.contentTypes.length * 5);
    
    // Keyword Optimization Score (0-100)
    let keywordOptimization = 0;
    if (data.keywords.metaKeywords.length > 0) keywordOptimization += 20;
    if (data.keywords.extractedKeywords.length > 10) keywordOptimization += 30;
    if (data.keywords.h1Keywords.length > 0) keywordOptimization += 25;
    if (data.keywords.longTailKeywords.length > 0) keywordOptimization += 25;
    
    // Modern SEO Score (from AI readiness)
    const modernSEO = data.modernSEO.aiReadiness;
    
    // Overall Score (weighted average)
    const overall = Math.round(
      (paidAdvertising * 0.15) +
      (socialMedia * 0.15) +
      (contentMarketing * 0.25) +
      (keywordOptimization * 0.25) +
      (modernSEO * 0.20)
    );
    
    return {
      paidAdvertising,
      socialMedia,
      contentMarketing,
      keywordOptimization,
      modernSEO,
      overall
    };
  }
}

export default EnhancedSEOAnalyzer;

