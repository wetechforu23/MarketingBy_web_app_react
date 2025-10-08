import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SEOAnalysis {
  url: string;
  title: string;
  description: string;
  keywords: string[];
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
  };
  performance: {
    loadTime: number;
    pageSize: number;
  };
  technical: {
    hasSitemap: boolean;
    hasRobots: boolean;
    hasCanonical: boolean;
    hasOpenGraph: boolean;
    hasTwitterCards: boolean;
  };
  content: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: Record<string, number>;
  };
  recommendations: string[];
  score: number;
}

export class SEOService {
  static async analyzeWebsite(url: string): Promise<SEOAnalysis> {
    try {
      const startTime = Date.now();
      
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const loadTime = Date.now() - startTime;
      const $ = cheerio.load(response.data);
      const pageSize = Buffer.byteLength(response.data, 'utf8');

      // Extract basic SEO elements
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content')?.split(',').map(k => k.trim()) || [];

      // Extract headings
      const headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get()
      };

      // Analyze images
      const images = $('img');
      const imagesWithAlt = images.filter((_, el) => !!$(el).attr('alt')).length;
      const imagesWithoutAlt = images.length - imagesWithAlt;

      // Analyze links
      const links = $('a[href]');
      const internalLinks = links.filter((_, el) => {
        const href = $(el).attr('href');
        return !!(href && (href.startsWith('/') || href.includes(new URL(url).hostname)));
      }).length;
      const externalLinks = links.length - internalLinks;

      // Check technical SEO elements
      const technical = {
        hasSitemap: $('link[rel="sitemap"]').length > 0 || $('a[href*="sitemap"]').length > 0,
        hasRobots: $('meta[name="robots"]').length > 0,
        hasCanonical: $('link[rel="canonical"]').length > 0,
        hasOpenGraph: $('meta[property^="og:"]').length > 0,
        hasTwitterCards: $('meta[name^="twitter:"]').length > 0
      };

      // Analyze content
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = bodyText.split(' ').length;
      
      // Simple readability score (based on average word length and sentence length)
      const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgWordsPerSentence = wordCount / sentences.length;
      const avgWordLength = bodyText.replace(/\s/g, '').length / wordCount;
      const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence * 2) - (avgWordLength * 5)));

      // Calculate keyword density
      const words = bodyText.toLowerCase().split(/\W+/).filter(word => word.length > 3);
      const wordFreq: Record<string, number> = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      const keywordDensity: Record<string, number> = {};
      Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([word, count]) => {
          keywordDensity[word] = (count / words.length) * 100;
        });

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (!title) recommendations.push('Add a title tag');
      if (title.length > 60) recommendations.push('Title tag is too long (should be under 60 characters)');
      if (!description) recommendations.push('Add a meta description');
      if (description.length > 160) recommendations.push('Meta description is too long (should be under 160 characters)');
      if (headings.h1.length === 0) recommendations.push('Add at least one H1 heading');
      if (headings.h1.length > 1) recommendations.push('Use only one H1 heading per page');
      if (imagesWithoutAlt > 0) recommendations.push(`Add alt text to ${imagesWithoutAlt} images`);
      if (!technical.hasCanonical) recommendations.push('Add canonical URL');
      if (!technical.hasOpenGraph) recommendations.push('Add Open Graph meta tags');
      if (loadTime > 3000) recommendations.push('Optimize page load time');
      if (pageSize > 1000000) recommendations.push('Optimize page size');

      // Calculate overall SEO score
      let score = 100;
      if (!title) score -= 20;
      if (!description) score -= 15;
      if (headings.h1.length === 0) score -= 15;
      if (imagesWithoutAlt > 0) score -= 10;
      if (!technical.hasCanonical) score -= 10;
      if (!technical.hasOpenGraph) score -= 10;
      if (loadTime > 3000) score -= 10;
      if (pageSize > 1000000) score -= 10;

      return {
        url,
        title,
        description,
        keywords,
        headings,
        images: {
          total: images.length,
          withAlt: imagesWithAlt,
          withoutAlt: imagesWithoutAlt
        },
        links: {
          internal: internalLinks,
          external: externalLinks,
          broken: 0 // Would need additional checking
        },
        performance: {
          loadTime,
          pageSize
        },
        technical,
        content: {
          wordCount,
          readabilityScore: Math.round(readabilityScore),
          keywordDensity
        },
        recommendations,
        score: Math.max(0, Math.min(100, score))
      };

    } catch (error) {
      console.error('SEO analysis error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to analyze website: ${error.message}`);
      }
      throw new Error('Failed to analyze website');
    }
  }

  static async scrapeWebsite(url: string): Promise<any> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Extract comprehensive website data
      const websiteData = {
        url,
        title: $('title').text().trim(),
        description: $('meta[name="description"]').attr('content') || '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || '',
        viewport: $('meta[name="viewport"]').attr('content') || '',
        charset: $('meta[charset]').attr('charset') || '',
        language: $('html').attr('lang') || '',
        
        // Headings
        headings: {
          h1: $('h1').map((_, el) => $(el).text().trim()).get(),
          h2: $('h2').map((_, el) => $(el).text().trim()).get(),
          h3: $('h3').map((_, el) => $(el).text().trim()).get(),
          h4: $('h4').map((_, el) => $(el).text().trim()).get(),
          h5: $('h5').map((_, el) => $(el).text().trim()).get(),
          h6: $('h6').map((_, el) => $(el).text().trim()).get()
        },

        // Navigation
        navigation: $('nav a').map((_, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href'),
          title: $(el).attr('title')
        })).get(),

        // Images
        images: $('img').map((_, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt'),
          title: $(el).attr('title'),
          width: $(el).attr('width'),
          height: $(el).attr('height')
        })).get(),

        // Links
        links: $('a[href]').map((_, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href'),
          title: $(el).attr('title'),
          target: $(el).attr('target')
        })).get(),

        // Forms
        forms: $('form').map((_, el) => ({
          action: $(el).attr('action'),
          method: $(el).attr('method'),
          inputs: $(el).find('input, select, textarea').map((_, input) => ({
            type: $(input).attr('type'),
            name: $(input).attr('name'),
            placeholder: $(input).attr('placeholder'),
            required: $(input).attr('required') !== undefined
          })).get()
        })).get(),

        // Meta tags
        metaTags: $('meta').map((_, el) => ({
          name: $(el).attr('name'),
          property: $(el).attr('property'),
          content: $(el).attr('content')
        })).get(),

        // Scripts
        scripts: $('script[src]').map((_, el) => $(el).attr('src')).get(),

        // Stylesheets
        stylesheets: $('link[rel="stylesheet"]').map((_, el) => $(el).attr('href')).get(),

        // Content sections
        sections: $('section, article, main, aside').map((_, el) => ({
          tag: (el as any).tagName,
          id: $(el).attr('id'),
          class: $(el).attr('class'),
          text: $(el).text().trim().substring(0, 200)
        })).get(),

        // Social media
        socialMedia: {
          facebook: $('meta[property="og:url"]').attr('content') || '',
          twitter: $('meta[name="twitter:site"]').attr('content') || '',
          linkedin: $('link[rel="canonical"]').attr('href') || ''
        },

        // Performance indicators
        performance: {
          totalElements: $('*').length,
          totalImages: $('img').length,
          totalLinks: $('a').length,
          totalForms: $('form').length,
          totalScripts: $('script').length,
          totalStylesheets: $('link[rel="stylesheet"]').length
        },

        // Content analysis
        content: {
          totalText: $('body').text().length,
          wordCount: $('body').text().split(/\s+/).length,
          paragraphCount: $('p').length,
          listCount: $('ul, ol').length,
          tableCount: $('table').length
        }
      };

      return websiteData;

    } catch (error) {
      console.error('Website scraping error:', error);
      throw new Error('Failed to scrape website');
    }
  }
}
