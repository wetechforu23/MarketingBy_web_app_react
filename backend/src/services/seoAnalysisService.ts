import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SEOAnalysis {
  url: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    total: number;
    withoutAlt: number;
    oversized: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
  };
  performance: {
    pageSize: number;
    loadTime: number;
    mobileFriendly: boolean;
  };
  technical: {
    hasSitemap: boolean;
    hasRobotsTxt: boolean;
    sslEnabled: boolean;
    canonicalUrl: string;
    schemaMarkup: boolean;
  };
  content: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: { [key: string]: number };
  };
  social: {
    openGraph: boolean;
    twitterCards: boolean;
    socialImages: number;
  };
  accessibility: {
    altTexts: number;
    ariaLabels: number;
    colorContrast: 'good' | 'needs-improvement' | 'poor';
  };
  score: number;
  recommendations: string[];
  analyzedAt: string;
}

export class SEOAnalysisService {
  private static instance: SEOAnalysisService;

  public static getInstance(): SEOAnalysisService {
    if (!SEOAnalysisService.instance) {
      SEOAnalysisService.instance = new SEOAnalysisService();
    }
    return SEOAnalysisService.instance;
  }

  async analyzeWebsite(url: string, keywords: string[] = []): Promise<SEOAnalysis> {
    try {
      console.log(`Starting SEO analysis for: ${url}`);
      
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const domain = new URL(url).origin;

      // Basic SEO analysis
      const analysis: SEOAnalysis = {
        url,
        title: this.extractTitle($),
        metaDescription: this.extractMetaDescription($),
        headings: this.extractHeadings($),
        images: this.analyzeImages($),
        links: await this.analyzeLinks($, domain),
        performance: await this.analyzePerformance(url, html),
        technical: await this.analyzeTechnical($, domain),
        content: this.analyzeContent($, keywords),
        social: this.analyzeSocial($),
        accessibility: this.analyzeAccessibility($),
        score: 0,
        recommendations: [],
        analyzedAt: new Date().toISOString()
      };

      // Calculate overall score
      analysis.score = this.calculateSEOScore(analysis);
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      console.log(`SEO analysis completed for ${url} - Score: ${analysis.score}/100`);
      return analysis;

    } catch (error) {
      console.error(`SEO analysis failed for ${url}:`, error);
      throw new Error(`Failed to analyze website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    const title = $('title').text().trim();
    return title || 'No title found';
  }

  private extractMetaDescription($: cheerio.CheerioAPI): string {
    const description = $('meta[name="description"]').attr('content');
    return description || 'No meta description found';
  }

  private extractHeadings($: cheerio.CheerioAPI) {
    return {
      h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get(),
      h3: $('h3').map((_, el) => $(el).text().trim()).get()
    };
  }

  private analyzeImages($: cheerio.CheerioAPI) {
    const images = $('img');
    const total = images.length;
    let withoutAlt = 0;
    let oversized = 0;

    images.each((_, img) => {
      const $img = $(img);
      if (!$img.attr('alt')) withoutAlt++;
      
      // Check for oversized images (simplified check)
      const src = $img.attr('src');
      if (src && (src.includes('width=') || src.includes('height='))) {
        const width = parseInt($img.attr('width') || '0');
        const height = parseInt($img.attr('height') || '0');
        if (width > 1920 || height > 1080) oversized++;
      }
    });

    return { total, withoutAlt, oversized };
  }

  private async analyzeLinks($: cheerio.CheerioAPI, domain: string) {
    const links = $('a[href]');
    let internal = 0;
    let external = 0;
    let broken = 0;

    links.each((_, link) => {
      const href = $(link).attr('href');
      if (!href) return;

      try {
        if (href.startsWith('http')) {
          if (href.includes(domain)) {
            internal++;
          } else {
            external++;
          }
        } else if (href.startsWith('/') || href.startsWith('./')) {
          internal++;
        }
      } catch (error) {
        broken++;
      }
    });

    return { internal, external, broken };
  }

  private async analyzePerformance(url: string, html: string) {
    const pageSize = Buffer.byteLength(html, 'utf8');
    const loadTime = this.estimateLoadTime(pageSize);
    
    // Simple mobile-friendly check
    const mobileFriendly = html.includes('viewport') && 
                          html.includes('width=device-width');

    return {
      pageSize,
      loadTime,
      mobileFriendly
    };
  }

  private async analyzeTechnical($: cheerio.CheerioAPI, domain: string) {
    const hasSitemap = $('link[rel="sitemap"]').length > 0;
    const hasRobotsTxt = await this.checkRobotsTxt(domain);
    const sslEnabled = domain.startsWith('https://');
    const canonicalUrl = $('link[rel="canonical"]').attr('href') || '';
    const schemaMarkup = $('script[type="application/ld+json"]').length > 0;

    return {
      hasSitemap,
      hasRobotsTxt,
      sslEnabled,
      canonicalUrl,
      schemaMarkup
    };
  }

  private analyzeContent($: cheerio.CheerioAPI, keywords: string[]) {
    const text = $('body').text();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    // Simple readability score (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.estimateSyllables(text);
    const readabilityScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * (wordCount / sentences)) - (84.6 * (syllables / wordCount))
    ));

    // Keyword density analysis
    const keywordDensity: { [key: string]: number } = {};
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = text.match(regex);
      keywordDensity[keyword] = matches ? (matches.length / wordCount) * 100 : 0;
    });

    return {
      wordCount,
      readabilityScore: Math.round(readabilityScore),
      keywordDensity
    };
  }

  private analyzeSocial($: cheerio.CheerioAPI) {
    const openGraph = $('meta[property^="og:"]').length > 0;
    const twitterCards = $('meta[name^="twitter:"]').length > 0;
    const socialImages = $('meta[property="og:image"], meta[name="twitter:image"]').length;

    return {
      openGraph,
      twitterCards,
      socialImages
    };
  }

  private analyzeAccessibility($: cheerio.CheerioAPI) {
    const altTexts = $('img[alt]').length;
    const ariaLabels = $('[aria-label]').length;
    
    // Simple color contrast check (placeholder)
    const colorContrast: 'good' | 'needs-improvement' | 'poor' = 'good';

    return {
      altTexts,
      ariaLabels,
      colorContrast
    };
  }

  private calculateSEOScore(analysis: SEOAnalysis): number {
    let score = 0;
    let maxScore = 0;

    // Title (10 points)
    maxScore += 10;
    if (analysis.title && analysis.title.length > 10 && analysis.title.length < 60) {
      score += 10;
    } else if (analysis.title && analysis.title.length > 0) {
      score += 5;
    }

    // Meta Description (10 points)
    maxScore += 10;
    if (analysis.metaDescription && analysis.metaDescription.length > 120 && analysis.metaDescription.length < 160) {
      score += 10;
    } else if (analysis.metaDescription && analysis.metaDescription.length > 0) {
      score += 5;
    }

    // Headings (15 points)
    maxScore += 15;
    if (analysis.headings.h1.length === 1) score += 5;
    if (analysis.headings.h1.length > 0) score += 5;
    if (analysis.headings.h2.length > 0) score += 5;

    // Images (10 points)
    maxScore += 10;
    if (analysis.images.total > 0) {
      const altRatio = (analysis.images.total - analysis.images.withoutAlt) / analysis.images.total;
      score += Math.round(altRatio * 10);
    }

    // Technical (20 points)
    maxScore += 20;
    if (analysis.technical.sslEnabled) score += 5;
    if (analysis.technical.hasSitemap) score += 5;
    if (analysis.technical.hasRobotsTxt) score += 5;
    if (analysis.technical.schemaMarkup) score += 5;

    // Performance (15 points)
    maxScore += 15;
    if (analysis.performance.mobileFriendly) score += 5;
    if (analysis.performance.pageSize < 1000000) score += 5; // Less than 1MB
    if (analysis.performance.loadTime < 3) score += 5;

    // Social (10 points)
    maxScore += 10;
    if (analysis.social.openGraph) score += 5;
    if (analysis.social.twitterCards) score += 5;

    // Content (10 points)
    maxScore += 10;
    if (analysis.content.wordCount > 300) score += 5;
    if (analysis.content.readabilityScore > 60) score += 5;

    return Math.round((score / maxScore) * 100);
  }

  private generateRecommendations(analysis: SEOAnalysis): string[] {
    const recommendations: string[] = [];

    if (!analysis.title || analysis.title.length < 10) {
      recommendations.push('Add a descriptive title tag (10-60 characters)');
    }

    if (!analysis.metaDescription || analysis.metaDescription.length < 120) {
      recommendations.push('Add a compelling meta description (120-160 characters)');
    }

    if (analysis.headings.h1.length === 0) {
      recommendations.push('Add an H1 heading to improve content structure');
    }

    if (analysis.headings.h1.length > 1) {
      recommendations.push('Use only one H1 heading per page');
    }

    if (analysis.images.withoutAlt > 0) {
      recommendations.push(`Add alt text to ${analysis.images.withoutAlt} images for better accessibility`);
    }

    if (!analysis.technical.sslEnabled) {
      recommendations.push('Enable SSL certificate for better security and SEO');
    }

    if (!analysis.technical.hasSitemap) {
      recommendations.push('Create and submit an XML sitemap to search engines');
    }

    if (!analysis.technical.schemaMarkup) {
      recommendations.push('Implement structured data (Schema.org) markup');
    }

    if (!analysis.performance.mobileFriendly) {
      recommendations.push('Optimize for mobile devices with responsive design');
    }

    if (analysis.performance.pageSize > 1000000) {
      recommendations.push('Optimize page size (currently over 1MB)');
    }

    if (!analysis.social.openGraph) {
      recommendations.push('Add Open Graph meta tags for better social sharing');
    }

    if (analysis.content.wordCount < 300) {
      recommendations.push('Increase content length (aim for 300+ words)');
    }

    if (analysis.content.readabilityScore < 60) {
      recommendations.push('Improve content readability and structure');
    }

    return recommendations;
  }

  private async checkRobotsTxt(domain: string): Promise<boolean> {
    try {
      const response = await axios.get(`${domain}/robots.txt`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private estimateLoadTime(pageSize: number): number {
    // Simple estimation based on page size
    const bytesPerSecond = 1000000; // 1MB/s average
    return Math.round((pageSize / bytesPerSecond) * 100) / 100;
  }

  private estimateSyllables(text: string): number {
    // Simple syllable estimation
    const words = text.toLowerCase().split(/\s+/);
    let syllables = 0;
    
    words.forEach(word => {
      if (word.length <= 3) {
        syllables += 1;
      } else {
        const vowels = word.match(/[aeiouy]+/g);
        syllables += vowels ? vowels.length : 1;
      }
    });
    
    return syllables;
  }

  async generateSEOReport(analysis: SEOAnalysis, leadInfo: any): Promise<string> {
    const report = `
# SEO Analysis Report for ${leadInfo.clinicName || 'Your Website'}

**Website:** ${analysis.url}  
**Analysis Date:** ${new Date(analysis.analyzedAt).toLocaleDateString()}  
**Overall SEO Score:** ${analysis.score}/100

## Executive Summary

Your website has been analyzed for search engine optimization (SEO) performance. Here's what we found:

${analysis.score >= 80 ? '🎉 **Excellent!** Your website is well-optimized for search engines.' : 
  analysis.score >= 60 ? '👍 **Good!** Your website has solid SEO foundations with room for improvement.' :
  analysis.score >= 40 ? '⚠️ **Needs Improvement.** Several SEO issues were identified that could impact your search rankings.' :
  '🚨 **Critical Issues.** Your website has significant SEO problems that need immediate attention.'}

## Key Findings

### 📊 Performance Metrics
- **Page Size:** ${(analysis.performance.pageSize / 1024).toFixed(1)} KB
- **Estimated Load Time:** ${analysis.performance.loadTime} seconds
- **Mobile Friendly:** ${analysis.performance.mobileFriendly ? '✅ Yes' : '❌ No'}

### 🔍 Content Analysis
- **Word Count:** ${analysis.content.wordCount} words
- **Readability Score:** ${analysis.content.readabilityScore}/100
- **Title Tag:** ${analysis.title}
- **Meta Description:** ${analysis.metaDescription}

### 🖼️ Images & Media
- **Total Images:** ${analysis.images.total}
- **Images without Alt Text:** ${analysis.images.withoutAlt}
- **Oversized Images:** ${analysis.images.oversized}

### 🔗 Technical SEO
- **SSL Certificate:** ${analysis.technical.sslEnabled ? '✅ Enabled' : '❌ Not Enabled'}
- **XML Sitemap:** ${analysis.technical.hasSitemap ? '✅ Found' : '❌ Missing'}
- **Robots.txt:** ${analysis.technical.hasRobotsTxt ? '✅ Found' : '❌ Missing'}
- **Schema Markup:** ${analysis.technical.schemaMarkup ? '✅ Implemented' : '❌ Not Found'}

### 📱 Social Media
- **Open Graph Tags:** ${analysis.social.openGraph ? '✅ Implemented' : '❌ Missing'}
- **Twitter Cards:** ${analysis.social.twitterCards ? '✅ Implemented' : '❌ Missing'}

## 🎯 Priority Recommendations

${analysis.recommendations.slice(0, 5).map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## 💡 How We Can Help

As a healthcare marketing specialist, I can help you implement these recommendations to:

- **Improve your search engine rankings** and attract more patients
- **Enhance user experience** with faster loading times and mobile optimization
- **Increase online visibility** through proper SEO techniques
- **Generate more qualified leads** from your website

## Next Steps

Would you like to discuss how we can help improve your website's SEO performance? I'd be happy to:

1. Provide a detailed implementation plan
2. Offer our SEO optimization services
3. Schedule a consultation to discuss your digital marketing goals

**Contact Information:**
- Email: [Your Email]
- Phone: [Your Phone]
- Website: [Your Website]

---

*This report was generated using advanced SEO analysis tools. For questions about this analysis or to discuss implementation, please don't hesitate to reach out.*

**Best regards,**  
[Your Name]  
Healthcare Marketing Specialist
    `;

    return report.trim();
  }
}
