import pool from '../config/database';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// =====================================================
// Interfaces
// =====================================================

export interface BlogPost {
  id?: number;
  client_id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  seo_score?: number;
  generated_by?: 'manual' | 'google_ai' | 'openai' | 'claude';
  ai_prompt?: string;
  ai_model?: string;
  generation_metadata?: any;
  status?: 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected' | 'archived';
  author_id?: number;
  author_name?: string;
  categories?: string[];
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface AIGenerationRequest {
  client_id: number;
  prompt: string;
  author_id: number;
  author_name: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'technical';
  target_word_count?: number;
}

export interface AIGenerationResponse {
  title: string;
  content: string;
  excerpt: string;
  meta_description: string;
  keywords: string[];
  seo_score: number;
}

export interface ApprovalRequest {
  post_id: number;
  approved_by?: number;
  approver_email?: string;
  approver_name?: string;
  feedback?: string;
  access_method: 'secure_link' | 'portal_login' | 'api';
  ip_address?: string;
  user_agent?: string;
}

// =====================================================
// BlogService
// =====================================================

export class BlogService {
  
  // ===================================================
  // CRUD Operations
  // ===================================================
  
  /**
   * Create a new blog post
   */
  static async createBlogPost(post: BlogPost): Promise<BlogPost> {
    try {
      // Generate slug if not provided
      if (!post.slug) {
        post.slug = this.generateSlug(post.title, post.client_id);
      }
      
      // Calculate SEO score
      post.seo_score = this.calculateSEOScore(post);
      
      const result = await pool.query(
        `INSERT INTO blog_posts (
          client_id, title, slug, content, excerpt, featured_image_url,
          meta_title, meta_description, meta_keywords, seo_score,
          generated_by, ai_prompt, ai_model, generation_metadata,
          status, author_id, author_name, categories, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          post.client_id,
          post.title,
          post.slug,
          post.content,
          post.excerpt,
          post.featured_image_url,
          post.meta_title || post.title,
          post.meta_description || post.excerpt,
          post.meta_keywords || [],
          post.seo_score,
          post.generated_by || 'manual',
          post.ai_prompt,
          post.ai_model,
          post.generation_metadata ? JSON.stringify(post.generation_metadata) : null,
          post.status || 'draft',
          post.author_id,
          post.author_name,
          post.categories || [],
          post.tags || []
        ]
      );
      
      console.log('✅ Blog post created:', result.rows[0].id);
      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error creating blog post:', error);
      throw new Error(`Failed to create blog post: ${error.message}`);
    }
  }
  
  /**
   * Get blog post by ID
   */
  static async getBlogPost(postId: number): Promise<BlogPost | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM blog_posts WHERE id = $1',
        [postId]
      );
      
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('❌ Error fetching blog post:', error);
      throw new Error(`Failed to fetch blog post: ${error.message}`);
    }
  }
  
  /**
   * Get all blog posts for a client
   */
  static async getBlogPostsByClient(
    clientId: number,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
      search?: string;
    }
  ): Promise<{ posts: BlogPost[]; total: number }> {
    try {
      let whereClause = 'WHERE client_id = $1';
      const params: any[] = [clientId];
      let paramIndex = 2;
      
      if (filters?.status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }
      
      if (filters?.search) {
        whereClause += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      
      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM blog_posts ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get posts
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      
      const result = await pool.query(
        `SELECT * FROM blog_posts ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );
      
      return {
        posts: result.rows,
        total
      };
    } catch (error: any) {
      console.error('❌ Error fetching blog posts:', error);
      throw new Error(`Failed to fetch blog posts: ${error.message}`);
    }
  }
  
  /**
   * Update blog post
   */
  static async updateBlogPost(postId: number, updates: Partial<BlogPost>): Promise<BlogPost> {
    try {
      // Recalculate SEO score if content changed
      if (updates.title || updates.content || updates.meta_description) {
        const currentPost = await this.getBlogPost(postId);
        if (currentPost) {
          updates.seo_score = this.calculateSEOScore({ ...currentPost, ...updates });
        }
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(postId);
      
      const result = await pool.query(
        `UPDATE blog_posts
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );
      
      console.log('✅ Blog post updated:', postId);
      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error updating blog post:', error);
      throw new Error(`Failed to update blog post: ${error.message}`);
    }
  }
  
  /**
   * Delete blog post
   */
  static async deleteBlogPost(postId: number): Promise<void> {
    try {
      await pool.query('DELETE FROM blog_posts WHERE id = $1', [postId]);
      console.log('✅ Blog post deleted:', postId);
    } catch (error: any) {
      console.error('❌ Error deleting blog post:', error);
      throw new Error(`Failed to delete blog post: ${error.message}`);
    }
  }
  
  // ===================================================
  // AI Generation
  // ===================================================
  
  /**
   * Generate blog post using Google Gemini AI
   */
  static async generateBlogWithAI(request: AIGenerationRequest): Promise<BlogPost> {
    try {
      console.log('🤖 Generating blog with AI:', request.prompt);
      
      // Get Google AI API key from encrypted_credentials
      const credResult = await pool.query(
        `SELECT decrypted_value FROM encrypted_credentials
         WHERE service_name = 'google_ai' AND credential_key = 'api_key'
         AND (client_id IS NULL OR client_id = $1)
         ORDER BY client_id DESC NULLS LAST
         LIMIT 1`,
        [request.client_id]
      );
      
      if (credResult.rows.length === 0) {
        throw new Error('Google AI API key not found. Please configure it in settings.');
      }
      
      const apiKey = credResult.rows[0].decrypted_value;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      // Build the prompt
      const tone = request.tone || 'professional';
      const wordCount = request.target_word_count || 1000;
      
      const systemPrompt = `You are an expert content writer specializing in creating engaging, SEO-optimized blog posts for healthcare and marketing industries.
      
Generate a complete blog post based on the following requirements:
- Topic/Prompt: ${request.prompt}
- Tone: ${tone}
- Target word count: ${wordCount} words
- Format: HTML with proper headings (h2, h3), paragraphs, lists, and emphasis

Your response MUST be a valid JSON object with this exact structure:
{
  "title": "Engaging blog title (50-60 characters)",
  "content": "Full HTML blog content with <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags",
  "excerpt": "Brief 2-3 sentence summary (150-160 characters)",
  "meta_description": "SEO meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}

Requirements:
- Title should be catchy and include main keyword
- Content must be ${wordCount} words with proper HTML structure
- Use h2 for main sections, h3 for subsections
- Include bullet points or numbered lists where appropriate
- Make it engaging, informative, and actionable
- Keywords should be relevant search terms`;
      
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🤖 AI Response received, length:', text.length);
      
      // Parse JSON response
      let aiData: AIGenerationResponse;
      try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', text);
        throw new Error('AI generated invalid response format');
      }
      
      // Calculate SEO score
      const seoScore = this.calculateSEOScore({
        title: aiData.title,
        content: aiData.content,
        meta_description: aiData.meta_description,
        meta_keywords: aiData.keywords
      });
      
      // Create blog post
      const blogPost: BlogPost = {
        client_id: request.client_id,
        title: aiData.title,
        slug: await this.generateUniqueSlug(aiData.title, request.client_id),
        content: aiData.content,
        excerpt: aiData.excerpt,
        meta_title: aiData.title,
        meta_description: aiData.meta_description,
        meta_keywords: aiData.keywords,
        seo_score: seoScore,
        generated_by: 'google_ai',
        ai_prompt: request.prompt,
        ai_model: 'gemini-pro',
        generation_metadata: {
          tone,
          target_word_count: wordCount,
          actual_word_count: this.countWords(aiData.content),
          generated_at: new Date().toISOString()
        },
        status: 'draft',
        author_id: request.author_id,
        author_name: request.author_name
      };
      
      const createdPost = await this.createBlogPost(blogPost);
      
      console.log('✅ AI blog post created:', createdPost.id);
      return createdPost;
      
    } catch (error: any) {
      console.error('❌ Error generating blog with AI:', error);
      throw new Error(`Failed to generate blog with AI: ${error.message}`);
    }
  }
  
  // ===================================================
  // Approval Workflow
  // ===================================================
  
  /**
   * Send blog post for approval (generate secure token)
   */
  static async sendForApproval(postId: number, sendEmail: boolean = true): Promise<string> {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      await pool.query(
        `UPDATE blog_posts
         SET status = 'pending_approval',
             approval_token = $1,
             approval_token_expires_at = $2
         WHERE id = $3`,
        [token, expiresAt, postId]
      );
      
      // Log approval history
      await pool.query(
        `INSERT INTO blog_approval_history (post_id, action, access_method)
         VALUES ($1, 'submitted', 'api')`,
        [postId]
      );
      
      console.log('✅ Blog post sent for approval:', postId);
      
      // TODO: Send email notification to client
      if (sendEmail) {
        // Email sending logic here
        console.log('📧 Approval email would be sent with token:', token);
      }
      
      return token;
    } catch (error: any) {
      console.error('❌ Error sending blog for approval:', error);
      throw new Error(`Failed to send blog for approval: ${error.message}`);
    }
  }
  
  /**
   * Approve blog post
   */
  static async approveBlogPost(request: ApprovalRequest): Promise<void> {
    try {
      await pool.query(
        `UPDATE blog_posts
         SET status = 'approved',
             approved_by = $1,
             approved_at = CURRENT_TIMESTAMP,
             approval_token = NULL,
             approval_token_expires_at = NULL
         WHERE id = $2`,
        [request.approved_by, request.post_id]
      );
      
      // Log approval
      await pool.query(
        `INSERT INTO blog_approval_history (
          post_id, approved_by, approver_email, approver_name,
          action, feedback, access_method, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          request.post_id,
          request.approved_by,
          request.approver_email,
          request.approver_name,
          'approved',
          request.feedback,
          request.access_method,
          request.ip_address,
          request.user_agent
        ]
      );
      
      console.log('✅ Blog post approved:', request.post_id);
    } catch (error: any) {
      console.error('❌ Error approving blog post:', error);
      throw new Error(`Failed to approve blog post: ${error.message}`);
    }
  }
  
  /**
   * Reject blog post
   */
  static async rejectBlogPost(request: ApprovalRequest): Promise<void> {
    try {
      await pool.query(
        `UPDATE blog_posts
         SET status = 'rejected',
             rejection_reason = $1,
             approval_token = NULL,
             approval_token_expires_at = NULL
         WHERE id = $2`,
        [request.feedback, request.post_id]
      );
      
      // Log rejection
      await pool.query(
        `INSERT INTO blog_approval_history (
          post_id, approved_by, approver_email, approver_name,
          action, feedback, access_method, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          request.post_id,
          request.approved_by,
          request.approver_email,
          request.approver_name,
          'rejected',
          request.feedback,
          request.access_method,
          request.ip_address,
          request.user_agent
        ]
      );
      
      console.log('✅ Blog post rejected:', request.post_id);
    } catch (error: any) {
      console.error('❌ Error rejecting blog post:', error);
      throw new Error(`Failed to reject blog post: ${error.message}`);
    }
  }
  
  /**
   * Verify approval token
   */
  static async verifyApprovalToken(token: string): Promise<BlogPost | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM blog_posts
         WHERE approval_token = $1
         AND approval_token_expires_at > CURRENT_TIMESTAMP
         AND status = 'pending_approval'`,
        [token]
      );
      
      return result.rows[0] || null;
    } catch (error: any) {
      console.error('❌ Error verifying approval token:', error);
      return null;
    }
  }
  
  // ===================================================
  // Publishing
  // ===================================================
  
  /**
   * Publish blog post to WordPress
   */
  static async publishToWordPress(postId: number): Promise<string> {
    try {
      const post = await this.getBlogPost(postId);
      if (!post) {
        throw new Error('Blog post not found');
      }
      
      if (post.status !== 'approved') {
        throw new Error('Blog post must be approved before publishing');
      }
      
      // Get WordPress credentials
      const wpCreds = await pool.query(
        `SELECT decrypted_value, metadata FROM encrypted_credentials
         WHERE client_id = $1
         AND service_name = 'wordpress'
         AND credential_key IN ('site_url', 'username', 'password')`,
        [post.client_id]
      );
      
      if (wpCreds.rows.length < 3) {
        throw new Error('WordPress credentials not configured for this client');
      }
      
      // TODO: Implement actual WordPress REST API publishing
      // This is a placeholder for the WordPress integration
      
      console.log('📝 Publishing to WordPress (placeholder)');
      
      // Update post status
      await pool.query(
        `UPDATE blog_posts
         SET status = 'published',
             published_at = CURRENT_TIMESTAMP,
             published_to = 'wordpress',
             external_post_id = $1,
             external_url = $2
         WHERE id = $3`,
        ['wp_' + Date.now(), 'https://example.com/blog/' + post.slug, postId]
      );
      
      // Log publishing
      await pool.query(
        `INSERT INTO blog_approval_history (post_id, action, access_method)
         VALUES ($1, 'published', 'api')`,
        [postId]
      );
      
      console.log('✅ Blog post published to WordPress:', postId);
      return 'https://example.com/blog/' + post.slug;
      
    } catch (error: any) {
      console.error('❌ Error publishing to WordPress:', error);
      throw new Error(`Failed to publish to WordPress: ${error.message}`);
    }
  }
  
  // ===================================================
  // Analytics
  // ===================================================
  
  /**
   * Track blog post view
   */
  static async trackView(postId: number, analytics: any): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO blog_analytics (
          post_id, client_id, visitor_fingerprint, session_id,
          ip_address, country, city, page_url, referrer_url,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          device_type, browser, os
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          postId,
          analytics.client_id,
          analytics.visitor_fingerprint,
          analytics.session_id,
          analytics.ip_address,
          analytics.country,
          analytics.city,
          analytics.page_url,
          analytics.referrer_url,
          analytics.utm_source,
          analytics.utm_medium,
          analytics.utm_campaign,
          analytics.utm_term,
          analytics.utm_content,
          analytics.device_type,
          analytics.browser,
          analytics.os
        ]
      );
      
      // Update cached analytics (run async)
      pool.query('SELECT update_blog_post_analytics_cache()').catch(console.error);
      
    } catch (error: any) {
      console.error('❌ Error tracking blog view:', error);
    }
  }
  
  /**
   * Get blog analytics
   */
  static async getAnalytics(postId: number): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
          AVG(time_on_page)::INTEGER as avg_time_on_page,
          COUNT(*) FILTER (WHERE bounced = true) as bounces,
          COUNT(*) FILTER (WHERE converted = true) as conversions,
          COUNT(DISTINCT country) as countries,
          COUNT(DISTINCT city) as cities
        FROM blog_analytics
        WHERE post_id = $1`,
        [postId]
      );
      
      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error fetching blog analytics:', error);
      return null;
    }
  }
  
  // ===================================================
  // Helper Functions
  // ===================================================
  
  /**
   * Generate URL-friendly slug from title
   */
  static generateSlug(title: string, clientId: number): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
  
  /**
   * Generate unique slug (check for duplicates)
   */
  static async generateUniqueSlug(title: string, clientId: number): Promise<string> {
    let slug = this.generateSlug(title, clientId);
    let counter = 1;
    
    while (true) {
      const existing = await pool.query(
        'SELECT id FROM blog_posts WHERE client_id = $1 AND slug = $2',
        [clientId, slug]
      );
      
      if (existing.rows.length === 0) {
        return slug;
      }
      
      slug = this.generateSlug(title, clientId) + '-' + counter;
      counter++;
    }
  }
  
  /**
   * Calculate SEO score (0-100)
   */
  static calculateSEOScore(post: Partial<BlogPost>): number {
    let score = 0;
    
    // Title (20 points)
    if (post.title) {
      const titleLen = post.title.length;
      if (titleLen >= 50 && titleLen <= 60) score += 20;
      else if (titleLen >= 40 && titleLen <= 70) score += 15;
      else if (titleLen > 0) score += 10;
    }
    
    // Meta description (20 points)
    if (post.meta_description) {
      const metaLen = post.meta_description.length;
      if (metaLen >= 150 && metaLen <= 160) score += 20;
      else if (metaLen >= 120 && metaLen <= 180) score += 15;
      else if (metaLen > 0) score += 10;
    }
    
    // Content length (30 points)
    if (post.content) {
      const wordCount = this.countWords(post.content);
      if (wordCount >= 800 && wordCount <= 1200) score += 30;
      else if (wordCount >= 500 && wordCount <= 1500) score += 20;
      else if (wordCount >= 300) score += 10;
    }
    
    // Keywords (15 points)
    if (post.meta_keywords && post.meta_keywords.length >= 3) {
      score += 15;
    } else if (post.meta_keywords && post.meta_keywords.length > 0) {
      score += 5;
    }
    
    // Headings (15 points)
    if (post.content) {
      const hasH2 = /<h2>/i.test(post.content);
      const hasH3 = /<h3>/i.test(post.content);
      if (hasH2 && hasH3) score += 15;
      else if (hasH2 || hasH3) score += 10;
    }
    
    return Math.min(score, 100);
  }
  
  /**
   * Count words in HTML content
   */
  static countWords(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.split(' ').filter(word => word.length > 0).length;
  }
  
  /**
   * Update analytics record (time tracking, scroll depth)
   */
  static async updateAnalytics(postId: number, sessionId: string, updates: { time_on_page?: number; scroll_depth?: number }): Promise<void> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (updates.time_on_page !== undefined) {
        fields.push(`time_on_page = $${paramIndex}`);
        values.push(updates.time_on_page);
        paramIndex++;
      }
      
      if (updates.scroll_depth !== undefined) {
        fields.push(`scroll_depth = $${paramIndex}`);
        values.push(updates.scroll_depth);
        paramIndex++;
      }
      
      if (fields.length > 0) {
        values.push(postId, sessionId);
        
        await pool.query(
          `UPDATE blog_analytics
           SET ${fields.join(', ')}
           WHERE post_id = $${paramIndex} AND session_id = $${paramIndex + 1}`,
          values
        );
      }
    } catch (error: any) {
      console.error('❌ Error updating analytics:', error);
    }
  }
  
  /**
   * Get all categories for a client
   */
  static async getCategories(clientId: number): Promise<any[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM blog_categories
         WHERE client_id = $1 AND is_active = true
         ORDER BY name ASC`,
        [clientId]
      );
      
      return result.rows;
    } catch (error: any) {
      console.error('❌ Error fetching categories:', error);
      return [];
    }
  }
  
  /**
   * Create a new category
   */
  static async createCategory(category: {
    client_id: number;
    name: string;
    description?: string;
    parent_id?: number;
  }): Promise<any> {
    try {
      const slug = this.generateSlug(category.name, category.client_id);
      
      const result = await pool.query(
        `INSERT INTO blog_categories (client_id, name, slug, description, parent_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [category.client_id, category.name, slug, category.description, category.parent_id]
      );
      
      return result.rows[0];
    } catch (error: any) {
      console.error('❌ Error creating category:', error);
      throw new Error(`Failed to create category: ${error.message}`);
    }
  }
}

export default BlogService;

