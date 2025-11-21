/**
 * UTM Tracking Utility
 * Generates UTM-tracked URLs for Google Analytics tracking
 */

/**
 * Generate a UTM-tracked URL
 * @param baseUrl - The base destination URL (e.g., https://www.promedhca.com)
 * @param contentId - The content ID to use as utm_campaign
 * @param utmSource - UTM source (default: 'facebook')
 * @param utmMedium - UTM medium (default: 'social-post')
 * @returns URL with UTM parameters appended
 */
export function generateUTMUrl(
  baseUrl: string,
  contentId: number,
  utmSource: string = 'facebook',
  utmMedium: string = 'social-post'
): string {
  if (!baseUrl || !baseUrl.trim()) {
    return baseUrl;
  }

  // Remove any trailing slashes
  baseUrl = baseUrl.trim().replace(/\/+$/, '');

  // Check if URL already has query parameters
  const hasQueryParams = baseUrl.includes('?');
  const separator = hasQueryParams ? '&' : '?';

  // Build UTM parameters
  const utmParams = new URLSearchParams({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: contentId.toString()
  });

  return `${baseUrl}${separator}${utmParams.toString()}`;
}

/**
 * Extract original URL from a UTM-tracked URL (removes UTM parameters)
 * @param trackedUrl - URL with UTM parameters
 * @returns Original URL without UTM parameters
 */
export function extractOriginalUrl(trackedUrl: string): string {
  if (!trackedUrl || !trackedUrl.includes('?')) {
    return trackedUrl;
  }

  try {
    const url = new URL(trackedUrl);
    
    // Remove UTM parameters
    url.searchParams.delete('utm_source');
    url.searchParams.delete('utm_medium');
    url.searchParams.delete('utm_campaign');
    url.searchParams.delete('utm_term');
    url.searchParams.delete('utm_content');

    // If no params left, return base URL
    const baseUrl = url.origin + url.pathname;
    const remainingParams = url.searchParams.toString();
    
    return remainingParams ? `${baseUrl}?${remainingParams}` : baseUrl;
  } catch (error) {
    // If URL parsing fails, return as is
    return trackedUrl;
  }
}


