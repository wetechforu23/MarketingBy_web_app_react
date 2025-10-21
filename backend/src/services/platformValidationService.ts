import pool from '../config/database';

/**
 * Platform Validation Service
 * Validates content against platform-specific requirements
 */

export interface ValidationRule {
  platform: string;
  max_text_length: number;
  max_hashtags: number;
  max_mentions: number;
  max_images: number;
  max_videos: number;
  max_video_duration_seconds: number;
  supported_content_types: string[];
  min_image_width: number;
  min_image_height: number;
  max_image_width: number;
  max_image_height: number;
  supported_image_formats: string[];
  max_image_size_mb: number;
  supported_video_formats: string[];
  max_video_size_mb: number;
  min_video_duration_seconds: number;
  supports_hashtags: boolean;
  supports_mentions: boolean;
  supports_links: boolean;
  supports_emojis: boolean;
  additional_rules: any;
}

export interface ContentToValidate {
  contentText?: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  contentType: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  platform: string;
}

// Cache for validation rules
let rulesCache: { [platform: string]: ValidationRule } = {};
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get validation rules for a platform (with caching)
 */
export async function getValidationRules(platform: string): Promise<ValidationRule | null> {
  const now = Date.now();
  
  // Check cache
  if (rulesCache[platform] && (now - cacheTimestamp) < CACHE_DURATION) {
    return rulesCache[platform];
  }

  // Fetch from database
  try {
    const result = await pool.query(
      'SELECT * FROM platform_validation_rules WHERE platform = $1',
      [platform]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update cache
    rulesCache[platform] = result.rows[0];
    cacheTimestamp = now;

    return result.rows[0];
  } catch (error) {
    console.error(`Error fetching validation rules for ${platform}:`, error);
    return null;
  }
}

/**
 * Refresh validation rules cache
 */
export async function refreshValidationCache() {
  try {
    const result = await pool.query('SELECT * FROM platform_validation_rules');
    
    rulesCache = {};
    result.rows.forEach(rule => {
      rulesCache[rule.platform] = rule;
    });
    cacheTimestamp = Date.now();

    return { success: true, platforms: result.rows.length };
  } catch (error: any) {
    console.error('Error refreshing validation cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate content for a specific platform
 */
export async function validateContentForPlatform(
  platform: string,
  content: ContentToValidate
): Promise<ValidationResult> {
  const rules = await getValidationRules(platform);

  if (!rules) {
    return {
      isValid: false,
      errors: [{ field: 'platform', message: `Validation rules not found for platform: ${platform}`, severity: 'error' }],
      warnings: [],
      platform
    };
  }

  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate content type
  if (!rules.supported_content_types.includes(content.contentType)) {
    errors.push({
      field: 'contentType',
      message: `${platform} does not support content type: ${content.contentType}. Supported types: ${rules.supported_content_types.join(', ')}`,
      severity: 'error'
    });
  }

  // Validate text length
  if (content.contentText) {
    const textLength = content.contentText.length;
    
    if (textLength > rules.max_text_length) {
      errors.push({
        field: 'contentText',
        message: `Text exceeds maximum length for ${platform}: ${textLength}/${rules.max_text_length} characters`,
        severity: 'error'
      });
    }

    // Warning for recommended length
    if (rules.additional_rules?.recommended_text_length) {
      const recommended = rules.additional_rules.recommended_text_length;
      if (textLength > recommended) {
        warnings.push({
          field: 'contentText',
          message: `Text is longer than recommended for ${platform}: ${textLength}/${recommended} characters. Consider shortening for better engagement.`,
          severity: 'warning'
        });
      }
    }
  }

  // Validate hashtags
  if (content.hashtags && content.hashtags.length > 0) {
    if (!rules.supports_hashtags) {
      errors.push({
        field: 'hashtags',
        message: `${platform} does not support hashtags`,
        severity: 'error'
      });
    } else if (content.hashtags.length > rules.max_hashtags) {
      warnings.push({
        field: 'hashtags',
        message: `Number of hashtags (${content.hashtags.length}) exceeds recommended maximum for ${platform}: ${rules.max_hashtags}`,
        severity: 'warning'
      });
    }
  }

  // Validate mentions
  if (content.mentions && content.mentions.length > 0) {
    if (!rules.supports_mentions) {
      errors.push({
        field: 'mentions',
        message: `${platform} does not support mentions`,
        severity: 'error'
      });
    } else if (content.mentions.length > rules.max_mentions) {
      errors.push({
        field: 'mentions',
        message: `Number of mentions (${content.mentions.length}) exceeds maximum for ${platform}: ${rules.max_mentions}`,
        severity: 'error'
      });
    }
  }

  // Validate media
  if (content.mediaUrls && content.mediaUrls.length > 0) {
    const imageCount = content.mediaUrls.filter(url => isImageUrl(url)).length;
    const videoCount = content.mediaUrls.filter(url => isVideoUrl(url)).length;

    // Validate image count
    if (imageCount > rules.max_images) {
      errors.push({
        field: 'mediaUrls',
        message: `Number of images (${imageCount}) exceeds maximum for ${platform}: ${rules.max_images}`,
        severity: 'error'
      });
    }

    // Validate video count
    if (videoCount > rules.max_videos) {
      errors.push({
        field: 'mediaUrls',
        message: `Number of videos (${videoCount}) exceeds maximum for ${platform}: ${rules.max_videos}`,
        severity: 'error'
      });
    }

    // Validate image formats
    content.mediaUrls.filter(url => isImageUrl(url)).forEach(url => {
      const format = getFileExtension(url);
      if (format && !rules.supported_image_formats.includes(format)) {
        errors.push({
          field: 'mediaUrls',
          message: `Image format '.${format}' is not supported by ${platform}. Supported formats: ${rules.supported_image_formats.join(', ')}`,
          severity: 'error'
        });
      }
    });

    // Validate video formats
    content.mediaUrls.filter(url => isVideoUrl(url)).forEach(url => {
      const format = getFileExtension(url);
      if (format && !rules.supported_video_formats.includes(format)) {
        errors.push({
          field: 'mediaUrls',
          message: `Video format '.${format}' is not supported by ${platform}. Supported formats: ${rules.supported_video_formats.join(', ')}`,
          severity: 'error'
        });
      }
    });

    // Note: We can't validate file sizes and dimensions without actually downloading the files
    // This should be done during upload
    if (imageCount > 0) {
      warnings.push({
        field: 'mediaUrls',
        message: `Ensure images meet ${platform} requirements: ${rules.min_image_width}x${rules.min_image_height}px minimum, max ${rules.max_image_size_mb}MB`,
        severity: 'warning'
      });
    }

    if (videoCount > 0) {
      warnings.push({
        field: 'mediaUrls',
        message: `Ensure videos meet ${platform} requirements: ${rules.min_video_duration_seconds}-${rules.max_video_duration_seconds}s duration, max ${rules.max_video_size_mb}MB`,
        severity: 'warning'
      });
    }
  }

  // Platform-specific validations
  if (platform === 'instagram') {
    // Instagram requires at least 1 image/video
    if (!content.mediaUrls || content.mediaUrls.length === 0) {
      errors.push({
        field: 'mediaUrls',
        message: 'Instagram posts require at least one image or video',
        severity: 'error'
      });
    }

    // Instagram doesn't support clickable links in captions
    if (content.contentText && content.contentText.match(/https?:\/\/[^\s]+/)) {
      warnings.push({
        field: 'contentText',
        message: 'Instagram does not support clickable links in captions. Link will not be clickable.',
        severity: 'warning'
      });
    }
  }

  if (platform === 'twitter') {
    // Twitter counts URLs as specific length
    if (content.contentText && content.contentText.match(/https?:\/\/[^\s]+/)) {
      warnings.push({
        field: 'contentText',
        message: 'Twitter counts all URLs as 23 characters, regardless of actual length',
        severity: 'warning'
      });
    }
  }

  if (platform === 'linkedin') {
    // LinkedIn professional tone check
    if (content.contentText && rules.additional_rules?.professional_tone) {
      warnings.push({
        field: 'contentText',
        message: 'Remember to maintain a professional tone for LinkedIn',
        severity: 'warning'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    platform
  };
}

/**
 * Validate content for multiple platforms
 */
export async function validateContentForPlatforms(
  platforms: string[],
  content: ContentToValidate
): Promise<{ [platform: string]: ValidationResult }> {
  const results: { [platform: string]: ValidationResult } = {};

  for (const platform of platforms) {
    results[platform] = await validateContentForPlatform(platform, content);
  }

  return results;
}

/**
 * Get comprehensive validation summary
 */
export async function getValidationSummary(
  platforms: string[],
  content: ContentToValidate
) {
  const results = await validateContentForPlatforms(platforms, content);
  
  const allValid = Object.values(results).every(r => r.isValid);
  const hasWarnings = Object.values(results).some(r => r.warnings.length > 0);
  const invalidPlatforms = Object.keys(results).filter(p => !results[p].isValid);
  const validPlatforms = Object.keys(results).filter(p => results[p].isValid);

  return {
    canPost: allValid,
    hasWarnings,
    validPlatforms,
    invalidPlatforms,
    results,
    summary: {
      totalPlatforms: platforms.length,
      validCount: validPlatforms.length,
      invalidCount: invalidPlatforms.length,
      totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0)
    }
  };
}

/**
 * Helper: Check if URL is an image
 */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const ext = getFileExtension(url);
  return ext ? imageExtensions.includes(ext) : false;
}

/**
 * Helper: Check if URL is a video
 */
function isVideoUrl(url: string): boolean {
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'];
  const ext = getFileExtension(url);
  return ext ? videoExtensions.includes(ext) : false;
}

/**
 * Helper: Get file extension from URL
 */
function getFileExtension(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) return null;
    return pathname.substring(lastDot + 1).toLowerCase();
  } catch {
    // If URL parsing fails, try simple extraction
    const lastDot = url.lastIndexOf('.');
    const lastSlash = url.lastIndexOf('/');
    if (lastDot === -1 || lastDot < lastSlash) return null;
    return url.substring(lastDot + 1).toLowerCase().split('?')[0];
  }
}

/**
 * Get all supported platforms
 */
export async function getSupportedPlatforms() {
  try {
    const result = await pool.query(
      'SELECT platform, supported_content_types, additional_rules FROM platform_validation_rules ORDER BY platform'
    );
    return { success: true, platforms: result.rows };
  } catch (error: any) {
    console.error('Error fetching supported platforms:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get platform requirements summary (for UI display)
 */
export async function getPlatformRequirementsSummary(platform: string) {
  const rules = await getValidationRules(platform);
  
  if (!rules) {
    return { success: false, error: 'Platform not found' };
  }

  return {
    success: true,
    platform,
    requirements: {
      text: {
        maxLength: rules.max_text_length,
        recommendedLength: rules.additional_rules?.recommended_text_length
      },
      hashtags: {
        supported: rules.supports_hashtags,
        max: rules.max_hashtags
      },
      mentions: {
        supported: rules.supports_mentions,
        max: rules.max_mentions
      },
      images: {
        max: rules.max_images,
        formats: rules.supported_image_formats,
        minSize: `${rules.min_image_width}x${rules.min_image_height}px`,
        maxFileSize: `${rules.max_image_size_mb}MB`
      },
      videos: {
        max: rules.max_videos,
        formats: rules.supported_video_formats,
        duration: `${rules.min_video_duration_seconds}-${rules.max_video_duration_seconds}s`,
        maxFileSize: `${rules.max_video_size_mb}MB`
      },
      features: {
        links: rules.supports_links,
        emojis: rules.supports_emojis
      },
      contentTypes: rules.supported_content_types,
      additionalNotes: rules.additional_rules
    }
  };
}

