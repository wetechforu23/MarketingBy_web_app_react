import pool from '../config/database';

export interface BacklinkData {
  id: number;
  client_id: number;
  source_url: string;
  target_url: string;
  anchor_text: string;
  domain_authority: number;
  page_authority: number;
  link_type: 'dofollow' | 'nofollow';
  status: 'active' | 'broken' | 'lost';
  discovered_date: string;
  last_checked: string;
  notes?: string;
}

export interface BlogData {
  id: number;
  client_id: number;
  blog_url: string;
  title: string;
  publish_date: string;
  word_count: number;
  reading_time: number;
  views: number;
  shares: number;
  comments: number;
  seo_score: number;
  status: 'published' | 'draft' | 'archived';
}

export class BacklinksService {
  private static instance: BacklinksService;

  public static getInstance(): BacklinksService {
    if (!BacklinksService.instance) {
      BacklinksService.instance = new BacklinksService();
    }
    return BacklinksService.instance;
  }

  // Get backlinks for a client
  async getBacklinks(clientId: number): Promise<BacklinkData[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM backlinks 
        WHERE client_id = $1 
        ORDER BY discovered_date DESC
      `, [clientId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting backlinks:', error);
      return [];
    }
  }

  // Get blogs for a client
  async getBlogs(clientId: number): Promise<BlogData[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM blogs 
        WHERE client_id = $1 
        ORDER BY publish_date DESC
      `, [clientId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting blogs:', error);
      return [];
    }
  }

  // Get backlinks summary
  async getBacklinksSummary(clientId: number): Promise<{
    total: number;
    active: number;
    broken: number;
    lost: number;
    dofollow: number;
    nofollow: number;
    average_domain_authority: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'broken' THEN 1 END) as broken,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
          COUNT(CASE WHEN link_type = 'dofollow' THEN 1 END) as dofollow,
          COUNT(CASE WHEN link_type = 'nofollow' THEN 1 END) as nofollow,
          AVG(domain_authority) as average_domain_authority
        FROM backlinks 
        WHERE client_id = $1
      `, [clientId]);

      const row = result.rows[0];
      return {
        total: parseInt(row.total) || 0,
        active: parseInt(row.active) || 0,
        broken: parseInt(row.broken) || 0,
        lost: parseInt(row.lost) || 0,
        dofollow: parseInt(row.dofollow) || 0,
        nofollow: parseInt(row.nofollow) || 0,
        average_domain_authority: parseFloat(row.average_domain_authority) || 0
      };
    } catch (error) {
      console.error('Error getting backlinks summary:', error);
      return {
        total: 0,
        active: 0,
        broken: 0,
        lost: 0,
        dofollow: 0,
        nofollow: 0,
        average_domain_authority: 0
      };
    }
  }

  // Get blogs summary
  async getBlogsSummary(clientId: number): Promise<{
    total: number;
    published: number;
    draft: number;
    total_views: number;
    total_shares: number;
    total_comments: number;
    average_seo_score: number;
    average_word_count: number;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          SUM(views) as total_views,
          SUM(shares) as total_shares,
          SUM(comments) as total_comments,
          AVG(seo_score) as average_seo_score,
          AVG(word_count) as average_word_count
        FROM blogs 
        WHERE client_id = $1
      `, [clientId]);

      const row = result.rows[0];
      return {
        total: parseInt(row.total) || 0,
        published: parseInt(row.published) || 0,
        draft: parseInt(row.draft) || 0,
        total_views: parseInt(row.total_views) || 0,
        total_shares: parseInt(row.total_shares) || 0,
        total_comments: parseInt(row.total_comments) || 0,
        average_seo_score: parseFloat(row.average_seo_score) || 0,
        average_word_count: parseFloat(row.average_word_count) || 0
      };
    } catch (error) {
      console.error('Error getting blogs summary:', error);
      return {
        total: 0,
        published: 0,
        draft: 0,
        total_views: 0,
        total_shares: 0,
        total_comments: 0,
        average_seo_score: 0,
        average_word_count: 0
      };
    }
  }
}
