import { CredentialManagementService } from './credentialManagementService';

export interface FacebookPost {
  id?: string;
  message: string;
  link?: string;
  picture?: string;
  name?: string;
  caption?: string;
  description?: string;
  created_time?: string;
  updated_time?: string;
}

export interface FacebookPageInsights {
  page_impressions_unique: number;
  page_engaged_users: number;
  page_post_engagements: number;
  page_impressions: number;
  page_reach: number;
}

export interface AIContentRequest {
  topic: string;
  tone: string;
  target_audience: string;
  call_to_action?: string;
  hashtags?: string[];
  include_image_prompt?: boolean;
}

export interface AIContentResponse {
  content: string;
  hashtags: string[];
  image_prompt?: string;
  suggested_timing?: string;
  engagement_tips?: string[];
}

export class FacebookSocialMediaService {
  private static instance: FacebookSocialMediaService;
  private credentialService: CredentialManagementService;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  public static getInstance(): FacebookSocialMediaService {
    if (!FacebookSocialMediaService.instance) {
      FacebookSocialMediaService.instance = new FacebookSocialMediaService();
    }
    return FacebookSocialMediaService.instance;
  }

  constructor() {
    this.credentialService = CredentialManagementService.getInstance();
  }

  /**
   * Get Facebook page access token from credentials
   */
  private async getPageAccessToken(): Promise<string | null> {
    try {
      return await this.credentialService.getCredential('facebook', 'production', 'page_access_token');
    } catch (error) {
      console.error('Error getting Facebook page access token:', error);
      return null;
    }
  }

  /**
   * Get Facebook page ID from credentials
   */
  private async getPageId(): Promise<string | null> {
    try {
      return await this.credentialService.getCredential('facebook', 'production', 'page_id');
    } catch (error) {
      console.error('Error getting Facebook page ID:', error);
      return null;
    }
  }

  /**
   * Post a message to Facebook page
   */
  async postToPage(post: FacebookPost): Promise<FacebookPost> {
    try {
      const pageId = await this.getPageId();
      const accessToken = await this.getPageAccessToken();

      if (!pageId || !accessToken) {
        throw new Error('Facebook page ID or access token not configured');
      }

      const url = `${this.baseUrl}/${pageId}/feed`;
      const params = new URLSearchParams({
        access_token: accessToken,
        message: post.message
      });

      if (post.link) params.append('link', post.link);
      if (post.picture) params.append('picture', post.picture);
      if (post.name) params.append('name', post.name);
      if (post.caption) params.append('caption', post.caption);
      if (post.description) params.append('description', post.description);

      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      return {
        id: result.id,
        message: post.message,
        link: post.link,
        picture: post.picture,
        name: post.name,
        caption: post.caption,
        description: post.description,
        created_time: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error posting to Facebook:', error);
      throw error;
    }
  }

  /**
   * Get page insights
   */
  async getPageInsights(): Promise<FacebookPageInsights> {
    try {
      const pageId = await this.getPageId();
      const accessToken = await this.getPageAccessToken();

      if (!pageId || !accessToken) {
        throw new Error('Facebook page ID or access token not configured');
      }

      const metrics = [
        'page_impressions_unique',
        'page_engaged_users',
        'page_post_engagements',
        'page_impressions',
        'page_reach'
      ].join(',');

      const url = `${this.baseUrl}/${pageId}/insights?metric=${metrics}&access_token=${accessToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const insights: any = {};

      if (data.data) {
        data.data.forEach((metric: any) => {
          if (metric.values && metric.values.length > 0) {
            insights[metric.name] = metric.values[0].value;
          }
        });
      }

      return insights as FacebookPageInsights;
    } catch (error) {
      console.error('Error getting Facebook page insights:', error);
      throw error;
    }
  }

  /**
   * Generate AI content for social media posts
   */
  async generateAIContent(request: AIContentRequest): Promise<AIContentResponse> {
    try {
      // AI content generation logic
      const content = this.generateContent(request);
      const hashtags = this.generateHashtags(request);
      const imagePrompt = request.include_image_prompt ? this.generateImagePrompt(request) : undefined;
      const suggestedTiming = this.getSuggestedTiming();
      const engagementTips = this.getEngagementTips(request);

      return {
        content,
        hashtags,
        image_prompt: imagePrompt,
        suggested_timing: suggestedTiming,
        engagement_tips: engagementTips
      };
    } catch (error) {
      console.error('Error generating AI content:', error);
      throw error;
    }
  }

  /**
   * Generate content based on request
   */
  private generateContent(request: AIContentRequest): string {
    const { topic, tone, target_audience, call_to_action } = request;
    
    let content = '';
    
    // Healthcare-focused content generation
    if (topic.toLowerCase().includes('health') || topic.toLowerCase().includes('medical')) {
      content = this.generateHealthcareContent(topic, tone, target_audience);
    } else {
      content = this.generateGenericContent(topic, tone, target_audience);
    }

    if (call_to_action) {
      content += `\n\n${call_to_action}`;
    }

    return content;
  }

  /**
   * Generate healthcare-specific content
   */
  private generateHealthcareContent(topic: string, tone: string, target_audience: string): string {
    const healthcareTemplates = [
      `🏥 ${topic}\n\nDid you know that ${target_audience} can benefit significantly from proper healthcare management? Our team is here to help you stay healthy and informed.\n\n#Healthcare #Wellness #${target_audience.replace(/\s+/g, '')}`,
      
      `💊 Health Tip: ${topic}\n\nFor our ${target_audience} community, here's an important reminder about maintaining your health. Prevention is always better than cure!\n\n#HealthTip #Prevention #${target_audience.replace(/\s+/g, '')}`,
      
      `🌟 ${topic}\n\nYour health matters! As healthcare professionals, we're committed to providing the best care for ${target_audience}. Stay informed, stay healthy!\n\n#Healthcare #PatientCare #${target_audience.replace(/\s+/g, '')}`
    ];

    return healthcareTemplates[Math.floor(Math.random() * healthcareTemplates.length)];
  }

  /**
   * Generate generic content
   */
  private generateGenericContent(topic: string, tone: string, target_audience: string): string {
    const genericTemplates = [
      `📢 ${topic}\n\nExciting news for our ${target_audience} community! We're here to provide valuable insights and updates.\n\n#${topic.replace(/\s+/g, '')} #${target_audience.replace(/\s+/g, '')}`,
      
      `💡 ${topic}\n\nAttention ${target_audience}! Here's something important you should know. Stay connected for more updates!\n\n#Update #${target_audience.replace(/\s+/g, '')}`,
      
      `🎯 ${topic}\n\nWe're excited to share this with our ${target_audience} community. Your engagement means everything to us!\n\n#Community #${target_audience.replace(/\s+/g, '')}`
    ];

    return genericTemplates[Math.floor(Math.random() * genericTemplates.length)];
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(request: AIContentRequest): string[] {
    const baseHashtags = ['#WeTechForU', '#Healthcare', '#Marketing'];
    const topicHashtags = request.topic.split(' ').map(word => `#${word.replace(/[^a-zA-Z0-9]/g, '')}`);
    const audienceHashtags = request.target_audience.split(' ').map(word => `#${word.replace(/[^a-zA-Z0-9]/g, '')}`);
    
    return [...baseHashtags, ...topicHashtags, ...audienceHashtags].slice(0, 10);
  }

  /**
   * Generate image prompt for AI image generation
   */
  private generateImagePrompt(request: AIContentRequest): string {
    const { topic, target_audience } = request;
    
    return `Professional healthcare marketing image featuring ${topic} for ${target_audience}. Clean, modern design with medical/healthcare elements, professional color scheme, high quality, suitable for social media.`;
  }

  /**
   * Get suggested posting timing
   */
  private getSuggestedTiming(): string {
    const timings = [
      'Best time: Tuesday-Thursday, 9-11 AM',
      'Optimal posting: Monday-Wednesday, 1-3 PM',
      'Peak engagement: Tuesday-Thursday, 7-9 PM',
      'Recommended: Wednesday-Friday, 10 AM-12 PM'
    ];

    return timings[Math.floor(Math.random() * timings.length)];
  }

  /**
   * Get engagement tips
   */
  private getEngagementTips(request: AIContentRequest): string[] {
    return [
      'Ask a question to encourage comments',
      'Use relevant hashtags (3-5 recommended)',
      'Post during peak hours for your audience',
      'Include a clear call-to-action',
      'Engage with comments within the first hour',
      'Share valuable, educational content',
      'Use high-quality images or videos',
      'Tag relevant partners or collaborators when appropriate'
    ];
  }

  /**
   * Schedule a post (placeholder for future implementation)
   */
  async schedulePost(post: FacebookPost, scheduledTime: Date): Promise<{ success: boolean; message: string }> {
    // This would integrate with Facebook's scheduling API
    // For now, return a placeholder response
    return {
      success: true,
      message: `Post scheduled for ${scheduledTime.toISOString()}`
    };
  }

  /**
   * Get recent posts from the page
   */
  async getRecentPosts(limit: number = 10): Promise<FacebookPost[]> {
    try {
      const pageId = await this.getPageId();
      const accessToken = await this.getPageAccessToken();

      if (!pageId || !accessToken) {
        throw new Error('Facebook page ID or access token not configured');
      }

      const url = `${this.baseUrl}/${pageId}/posts?limit=${limit}&access_token=${accessToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting recent Facebook posts:', error);
      throw error;
    }
  }

  /**
   * Test Facebook API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const pageId = await this.getPageId();
      const accessToken = await this.getPageAccessToken();

      if (!pageId || !accessToken) {
        return {
          success: false,
          message: 'Facebook page ID or access token not configured'
        };
      }

      const url = `${this.baseUrl}/${pageId}?access_token=${accessToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: `Facebook API error: ${errorData.error?.message || 'Unknown error'}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Facebook API connection successful',
        data: {
          page_name: data.name,
          page_id: data.id,
          category: data.category
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}
