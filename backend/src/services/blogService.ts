import pool from '../config/database';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailService } from './emailService';

// Initialize services
const emailService = new EmailService();

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
  // Helper Methods - Encryption & Client API Keys
  // ===================================================
  
  /**
   * Decrypt an encrypted value using AES-256-CBC
   */
  private static decrypt(encryptedValue: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      throw new Error('Failed to decrypt API key');
    }
  }
  
  /**
   * Get client-specific Google AI API key from widget_configs
   * Uses same credential system as chat widget
   */
  private static async getClientGoogleAIKey(clientId: number): Promise<string> {
    try {
      // First, try to get client-specific key from their widget config
      const widgetResult = await pool.query(
        `SELECT widget_specific_llm_key 
         FROM widget_configs 
         WHERE client_id = $1 
           AND widget_specific_llm_key IS NOT NULL 
         LIMIT 1`,
        [clientId]
      );
      
      if (widgetResult.rows.length > 0 && widgetResult.rows[0].widget_specific_llm_key) {
        console.log(`✅ Using client-specific Google AI key for client ${clientId}`);
        return this.decrypt(widgetResult.rows[0].widget_specific_llm_key);
      }
      
      // Fallback: Try encrypted_credentials (global key)
      const credResult = await pool.query(
        `SELECT encrypted_value 
         FROM encrypted_credentials
         WHERE service IN ('gemini', 'google_ai') 
           AND key_name = 'api_key'
         LIMIT 1`
      );
      
      if (credResult.rows.length > 0) {
        console.log(`⚠️  Using global Google AI key (no client-specific key found for client ${clientId})`);
        // Decrypt the encrypted value
        return this.decrypt(credResult.rows[0].encrypted_value);
      }
      
      // Last resort: check environment variable
      if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
        console.log(`⚠️  Using Google AI key from environment variable`);
        return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
      }
      
      throw new Error('Google AI API key not found. Please configure it in widget settings or global credentials.');
    } catch (error: any) {
      console.error('❌ Error getting Google AI API key:', error);
      throw new Error(`Failed to get Google AI API key: ${error.message}`);
    }
  }
  
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
      
      // Get client-specific Google AI API key (uses same system as chat widget)
      const apiKey = await this.getClientGoogleAIKey(request.client_id);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
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
        ai_model: 'gemini-1.5-flash',
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
      
      // Get blog post and client details
      const postResult = await pool.query(
        `SELECT bp.*, c.client_name, c.email as client_email
         FROM blog_posts bp
         JOIN clients c ON c.id = bp.client_id
         WHERE bp.id = $1`,
        [postId]
      );
      
      if (postResult.rows.length === 0) {
        throw new Error('Blog post not found');
      }
      
      const post = postResult.rows[0];
      
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
      
      // Send email notification to client
      if (sendEmail && post.client_email) {
        try {
          const approvalUrl = `${process.env.FRONTEND_URL}/blog/approve/${token}`;
          const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          await emailService.sendEmail({
            to: post.client_email,
            subject: `📝 Blog Post Ready for Your Review: ${post.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">📝 Blog Post Ready for Review</h1>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${post.client_name}</strong>,</p>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    We've completed a new blog post for your review and approval. The content is ready for your feedback!
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4682B4;">
                    <h2 style="margin-top: 0; color: #333; font-size: 20px;">${post.title}</h2>
                    ${post.excerpt ? `<p style="color: #666; font-style: italic;">${post.excerpt}</p>` : ''}
                    <div style="display: flex; gap: 20px; margin-top: 15px; font-size: 14px;">
                      <div>
                        <strong>Author:</strong> ${post.author_name || 'Admin'}
                      </div>
                      <div>
                        <strong>SEO Score:</strong> <span style="color: ${post.seo_score >= 80 ? '#28a745' : post.seo_score >= 60 ? '#ffc107' : '#dc3545'}; font-weight: bold;">${post.seo_score}/100</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${approvalUrl}" style="display: inline-block; background: linear-gradient(135deg, #4682B4, #5a9fd4); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      📖 Review Blog Post
                    </a>
                  </div>
                  
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>⏰ Important:</strong> This approval link will expire on <strong>${expiryDate}</strong> (48 hours from now).
                    </p>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 20px;">
                    If you have any questions or need changes, you can provide feedback directly through the approval page.
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                  
                  <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    If you're unable to click the button above, copy and paste this link into your browser:<br>
                    <a href="${approvalUrl}" style="color: #4682B4; word-break: break-all;">${approvalUrl}</a>
                  </p>
                </div>
              </body>
              </html>
            `,
            text: `
Hello ${post.client_name},

We've completed a new blog post for your review and approval.

Blog Title: ${post.title}
${post.excerpt ? `Excerpt: ${post.excerpt}` : ''}
Author: ${post.author_name || 'Admin'}
SEO Score: ${post.seo_score}/100

To review and approve this blog post, please visit:
${approvalUrl}

⏰ Important: This approval link will expire on ${expiryDate} (48 hours from now).

If you have any questions or need changes, you can provide feedback directly through the approval page.

---
If the link above doesn't work, copy and paste this URL into your browser:
${approvalUrl}
            `.trim()
          });
          
          console.log('📧 Approval email sent to:', post.client_email);
        } catch (emailError: any) {
          console.error('❌ Failed to send approval email:', emailError);
          // Don't throw error - approval token is still valid
        }
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
      
      // Get WordPress credentials from encrypted_credentials
      const wpCredsResult = await pool.query(
        `SELECT credential_key, decrypted_value, metadata 
         FROM encrypted_credentials
         WHERE client_id = $1
         AND service_name = 'wordpress'
         AND credential_key IN ('site_url', 'username', 'app_password')
         ORDER BY credential_key`,
        [post.client_id]
      );
      
      if (wpCredsResult.rows.length < 3) {
        throw new Error('WordPress credentials not configured for this client. Please configure WordPress site URL, username, and application password in Credentials settings.');
      }
      
      // Parse WordPress credentials
      const creds: any = {};
      wpCredsResult.rows.forEach(row => {
        creds[row.credential_key] = row.decrypted_value;
      });
      
      if (!creds.site_url || !creds.username || !creds.app_password) {
        throw new Error('Incomplete WordPress credentials');
      }
      
      // Ensure site_url ends without trailing slash
      const siteUrl = creds.site_url.replace(/\/$/, '');
      const wpApiUrl = `${siteUrl}/wp-json/wp/v2/posts`;
      
      // Prepare WordPress post data
      const wpPostData: any = {
        title: post.meta_title || post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        status: 'publish', // or 'draft' if you want review in WP
        slug: post.slug
      };
      
      // Add categories if exists
      if (post.categories && post.categories.length > 0) {
        // Note: WordPress needs category IDs, not names
        // In production, you'd need to map category names to WP category IDs
        // For now, we'll skip categories
        console.log('⚠️ Categories not mapped to WordPress:', post.categories);
      }
      
      // Add tags if exists
      if (post.tags && post.tags.length > 0) {
        // Note: WordPress needs tag IDs, not names
        // In production, you'd need to create tags first or map to existing IDs
        console.log('⚠️ Tags not mapped to WordPress:', post.tags);
      }
      
      // Create authorization header (Basic Auth with username:app_password)
      const authString = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
      
      console.log('📝 Publishing to WordPress:', {
        site: siteUrl,
        username: creds.username,
        title: post.title
      });
      
      // Make WordPress REST API request
      const axios = require('axios');
      const wpResponse = await axios.post(wpApiUrl, wpPostData, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (!wpResponse.data || !wpResponse.data.id) {
        throw new Error('WordPress API returned invalid response');
      }
      
      const wpPostId = wpResponse.data.id;
      const wpPostUrl = wpResponse.data.link || `${siteUrl}/?p=${wpPostId}`;
      
      console.log('✅ WordPress post created:', {
        wp_post_id: wpPostId,
        url: wpPostUrl
      });
      
      // Update Yoast SEO meta if post has meta fields
      if (post.meta_description || post.meta_keywords) {
        try {
          await axios.post(
            `${siteUrl}/wp-json/wp/v2/posts/${wpPostId}`,
            {
              meta: {
                _yoast_wpseo_title: post.meta_title || post.title,
                _yoast_wpseo_metadesc: post.meta_description || post.excerpt,
                _yoast_wpseo_focuskw: post.meta_keywords ? post.meta_keywords[0] : ''
              }
            },
            {
              headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Yoast SEO meta updated');
        } catch (yoastError: any) {
          console.warn('⚠️ Failed to update Yoast SEO meta (plugin may not be installed):', yoastError.message);
          // Don't fail the whole publishing if Yoast update fails
        }
      }
      
      // Update blog post in database
      await pool.query(
        `UPDATE blog_posts
         SET status = 'published',
             published_at = CURRENT_TIMESTAMP,
             published_to = 'wordpress',
             external_post_id = $1,
             external_url = $2
         WHERE id = $3`,
        [`wp_${wpPostId}`, wpPostUrl, postId]
      );
      
      // Log publishing action
      await pool.query(
        `INSERT INTO blog_approval_history (post_id, action, access_method)
         VALUES ($1, 'published', 'api')`,
        [postId]
      );
      
      console.log('✅ Blog post published to WordPress:', postId);
      return wpPostUrl;
      
    } catch (error: any) {
      console.error('❌ Error publishing to WordPress:', error.response?.data || error.message);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to publish to WordPress';
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Could not connect to WordPress site. Please check the site URL.';
      } else if (error.response?.status === 401) {
        errorMessage = 'WordPress authentication failed. Please check username and application password.';
      } else if (error.response?.status === 403) {
        errorMessage = 'WordPress permission denied. User may not have publish_posts capability.';
      } else if (error.response?.status === 404) {
        errorMessage = 'WordPress REST API not found. Ensure WordPress is up to date and REST API is enabled.';
      } else if (error.response?.data?.message) {
        errorMessage = `WordPress error: ${error.response.data.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
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

