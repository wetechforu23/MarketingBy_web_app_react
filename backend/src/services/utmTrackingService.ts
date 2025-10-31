/**
 * UTM Tracking Service
 * Generates and manages UTM parameters for social media posts
 * 
 * Purpose: Track which social media posts drive website traffic and conversions
 * 
 * @example
 * const result = UTMTrackingService.processPostContent(
 *   'Check out our services! https://example.com',
 *   123,
 *   'ProMed Healthcare',
 *   'text'
 * );
 * // Returns: tracked content with UTM params added to all URLs
 */

interface UTMParams {
  utm_source: string;      // e.g., "facebook", "linkedin", "twitter"
  utm_medium: string;      // e.g., "social", "organic", "paid"
  utm_campaign: string;    // e.g., "promed_fb_post_1730123456789"
  utm_content?: string;    // e.g., "text", "image", "video", "carousel"
  utm_term?: string;       // e.g., keywords (optional, for paid campaigns)
}

interface ProcessedContent {
  trackedContent: string;   // Post content with UTM-tracked URLs
  utmCampaign: string;      // Generated campaign identifier
  originalUrls: string[];   // URLs found in original content
  trackedUrls: string[];    // URLs with UTM parameters added
}

export class UTMTrackingService {
  
  /**
   * Generate unique UTM campaign name for tracking
   * Format: {clientname}_fb_{posttype}_{timestamp}
   * 
   * @param clientId - Client database ID
   * @param clientName - Client business name
   * @param postType - Type of post (text/image/video/carousel)
   * @returns Unique campaign identifier
   */
  static generateCampaignName(
    clientId: number,
    clientName: string,
    postType: string = 'post'
  ): string {
    const timestamp = Date.now();
    // Sanitize client name: lowercase, replace spaces/special chars with underscore
    const sanitizedName = clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    return `${sanitizedName}_fb_${postType}_${timestamp}`;
  }

  /**
   * Add UTM parameters to a single URL
   * 
   * @param url - Original URL
   * @param params - UTM parameters to add
   * @returns URL with UTM parameters appended
   */
  static addUTMToURL(url: string, params: UTMParams): string {
    try {
      const urlObj = new URL(url);
      
      // Add UTM parameters (only if not already present)
      if (!urlObj.searchParams.has('utm_source')) {
        urlObj.searchParams.set('utm_source', params.utm_source);
      }
      if (!urlObj.searchParams.has('utm_medium')) {
        urlObj.searchParams.set('utm_medium', params.utm_medium);
      }
      if (!urlObj.searchParams.has('utm_campaign')) {
        urlObj.searchParams.set('utm_campaign', params.utm_campaign);
      }
      
      if (params.utm_content && !urlObj.searchParams.has('utm_content')) {
        urlObj.searchParams.set('utm_content', params.utm_content);
      }
      
      if (params.utm_term && !urlObj.searchParams.has('utm_term')) {
        urlObj.searchParams.set('utm_term', params.utm_term);
      }
      
      return urlObj.toString();
    } catch (error) {
      // If URL is invalid, return original (don't break posting)
      console.error('⚠️  Invalid URL for UTM tracking:', url, error);
      return url;
    }
  }

  /**
   * Find all URLs in text content using regex
   * Matches http:// and https:// URLs
   * 
   * @param text - Text content to search
   * @returns Array of URLs found
   */
  static extractURLs(text: string): string[] {
    if (!text) return [];
    
    // Regex to match URLs (http/https)
    // More comprehensive pattern to catch various URL formats
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    const matches = text.match(urlRegex);
    
    if (!matches) return [];
    
    // Clean up URLs (remove trailing punctuation that might be caught)
    return matches.map(url => {
      // Remove trailing punctuation like ), ], ., !
      return url.replace(/[),.\]!]+$/, '');
    });
  }

  /**
   * Replace original URLs in text with tracked versions
   * 
   * @param text - Original text content
   * @param urlMapping - Map of original URL → tracked URL
   * @returns Text with URLs replaced
   */
  static replaceURLsWithTracked(
    text: string,
    urlMapping: Map<string, string>
  ): string {
    let trackedText = text;
    
    urlMapping.forEach((trackedUrl, originalUrl) => {
      // Use global replace to catch all occurrences
      trackedText = trackedText.split(originalUrl).join(trackedUrl);
    });
    
    return trackedText;
  }

  /**
   * Main method: Process post content and add UTM tracking to all URLs
   * This is the method you'll call from facebookService.ts
   * 
   * @param content - Post content (message/text)
   * @param clientId - Client database ID
   * @param clientName - Client business name
   * @param postType - Type of post (text/image/video/carousel)
   * @returns Processed content with UTM tracking
   */
  static processPostContent(
    content: string,
    clientId: number,
    clientName: string,
    postType: string = 'text'
  ): ProcessedContent {
    // Generate unique campaign identifier
    const utmCampaign = this.generateCampaignName(clientId, clientName, postType);
    
    // Extract all URLs from content
    const originalUrls = this.extractURLs(content);
    
    // If no URLs found, return original content
    if (originalUrls.length === 0) {
      console.log('ℹ️  No URLs found in post content - skipping UTM tracking');
      return {
        trackedContent: content,
        utmCampaign,
        originalUrls: [],
        trackedUrls: []
      };
    }
    
    console.log(`🔗 Found ${originalUrls.length} URL(s) in post content`);
    
    // Create UTM parameters
    const utmParams: UTMParams = {
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: utmCampaign,
      utm_content: postType
    };
    
    // Add UTM to each URL
    const urlMapping = new Map<string, string>();
    const trackedUrls: string[] = [];
    
    originalUrls.forEach(url => {
      const trackedUrl = this.addUTMToURL(url, utmParams);
      urlMapping.set(url, trackedUrl);
      trackedUrls.push(trackedUrl);
    });
    
    // Replace original URLs with tracked URLs in content
    const trackedContent = this.replaceURLsWithTracked(content, urlMapping);
    
    // Logging for debugging
    console.log('📊 UTM Tracking Applied:');
    console.log(`   Campaign: ${utmCampaign}`);
    console.log(`   Original URLs: ${originalUrls.length}`);
    console.log(`   Tracked URLs: ${trackedUrls.length}`);
    originalUrls.forEach((url, index) => {
      console.log(`   [${index + 1}] ${url.substring(0, 50)}...`);
      console.log(`       → ${trackedUrls[index].substring(0, 80)}...`);
    });
    
    return {
      trackedContent,
      utmCampaign,
      originalUrls,
      trackedUrls
    };
  }

  /**
   * Validate if UTM parameters are correctly added to URL
   * Useful for testing
   * 
   * @param url - URL to validate
   * @returns true if URL has required UTM params
   */
  static validateUTMUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.searchParams.has('utm_source') &&
        urlObj.searchParams.has('utm_medium') &&
        urlObj.searchParams.has('utm_campaign')
      );
    } catch {
      return false;
    }
  }

  /**
   * Extract UTM parameters from a URL
   * Useful for analytics and debugging
   * 
   * @param url - URL with UTM parameters
   * @returns Object with UTM values or null
   */
  static extractUTMParams(url: string): UTMParams | null {
    try {
      const urlObj = new URL(url);
      if (!this.validateUTMUrl(url)) return null;
      
      return {
        utm_source: urlObj.searchParams.get('utm_source') || '',
        utm_medium: urlObj.searchParams.get('utm_medium') || '',
        utm_campaign: urlObj.searchParams.get('utm_campaign') || '',
        utm_content: urlObj.searchParams.get('utm_content') || undefined,
        utm_term: urlObj.searchParams.get('utm_term') || undefined
      };
    } catch {
      return null;
    }
  }
}

export default UTMTrackingService;

