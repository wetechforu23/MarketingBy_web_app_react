# 🎯 Facebook Post UTM Tracking & Conversion Attribution - Developer Spec

**Project**: MarketingBy Healthcare Platform  
**Feature**: Facebook Post Click-to-Website Conversion Tracking  
**Priority**: HIGH  
**Estimated Time**: 2-3 hours  
**Date**: October 27, 2025

---

## 📋 OBJECTIVE

Enable automatic UTM parameter tracking for all Facebook posts published through our portal, so we can:
- ✅ Track which Facebook posts drive website traffic
- ✅ Measure conversion rates per post
- ✅ Calculate ROI for social media marketing
- ✅ Show clients which content performs best

---

## 🎯 USER STORY

**As a marketing platform admin**, I want all Facebook posts to automatically include UTM tracking parameters, so that when users click links in those posts, Google Analytics can track the source and show me which Facebook posts converted visitors into leads/clients.

---

## 🔧 CURRENT STATE

### What's Already Working:
- ✅ Facebook posting (text, images, videos, carousels)
- ✅ Facebook post engagement tracking (likes, comments, shares, clicks)
- ✅ Google Analytics integration (tracking website visitors)
- ✅ Database tables for storing Facebook posts

### What's Missing:
- ❌ No UTM parameters added to links in Facebook posts
- ❌ No way to correlate Facebook post clicks → website visits
- ❌ No conversion attribution report

---

## 🎨 SOLUTION OVERVIEW

### Part 1: UTM Parameter Injection (Backend)
When posting to Facebook through our portal, automatically:
1. Detect all URLs in post content
2. Add UTM parameters to each URL
3. Post with tracked URLs to Facebook
4. Store UTM campaign info in database

### Part 2: Conversion Attribution Dashboard (Frontend)
Create a report showing:
- Total clicks per Facebook post (from Facebook API)
- Website visits from each post (from Google Analytics)
- Conversion rate per post
- Top converting posts

---

## 📊 DATABASE CHANGES

### Step 1: Add UTM Tracking Columns to `facebook_posts` Table

```sql
-- Run this migration on Heroku PostgreSQL
ALTER TABLE facebook_posts 
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(255),
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100) DEFAULT 'facebook',
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100) DEFAULT 'social',
ADD COLUMN IF NOT EXISTS original_urls TEXT[], -- Array of original URLs
ADD COLUMN IF NOT EXISTS tracked_urls TEXT[];  -- Array of URLs with UTM

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_facebook_posts_utm_campaign 
ON facebook_posts(utm_campaign);
```

### Step 2: Create Conversion Tracking Table (Optional but Recommended)

```sql
-- Track conversions attributed to Facebook posts
CREATE TABLE IF NOT EXISTS facebook_post_conversions (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR(100) REFERENCES facebook_posts(post_id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  utm_campaign VARCHAR(255) NOT NULL,
  
  -- Website visit data (from Google Analytics)
  ga_session_id VARCHAR(255),
  visitor_count INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Conversion data
  leads_generated INTEGER DEFAULT 0,
  clients_converted INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Timestamps
  tracked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(post_id, utm_campaign)
);

CREATE INDEX IF NOT EXISTS idx_fb_conversions_post 
ON facebook_post_conversions(post_id);

CREATE INDEX IF NOT EXISTS idx_fb_conversions_client 
ON facebook_post_conversions(client_id);

CREATE INDEX IF NOT EXISTS idx_fb_conversions_campaign 
ON facebook_post_conversions(utm_campaign);
```

---

## 💻 BACKEND IMPLEMENTATION

### File: `backend/src/services/utmTrackingService.ts` (NEW FILE)

Create this new service for UTM parameter generation:

```typescript
/**
 * UTM Tracking Service
 * Generates and manages UTM parameters for social media posts
 */

interface UTMParams {
  utm_source: string;      // e.g., "facebook", "linkedin", "twitter"
  utm_medium: string;      // e.g., "social", "organic", "paid"
  utm_campaign: string;    // e.g., "promed_post_12345"
  utm_content?: string;    // e.g., "image", "video", "carousel"
  utm_term?: string;       // e.g., keywords (optional)
}

export class UTMTrackingService {
  
  /**
   * Generate UTM campaign name for a Facebook post
   */
  static generateCampaignName(
    clientId: number,
    clientName: string,
    postType: string = 'post'
  ): string {
    const timestamp = Date.now();
    const sanitizedName = clientName.toLowerCase().replace(/\s+/g, '_');
    return `${sanitizedName}_fb_${postType}_${timestamp}`;
  }

  /**
   * Add UTM parameters to a URL
   */
  static addUTMToURL(url: string, params: UTMParams): string {
    try {
      const urlObj = new URL(url);
      
      // Add UTM parameters
      urlObj.searchParams.set('utm_source', params.utm_source);
      urlObj.searchParams.set('utm_medium', params.utm_medium);
      urlObj.searchParams.set('utm_campaign', params.utm_campaign);
      
      if (params.utm_content) {
        urlObj.searchParams.set('utm_content', params.utm_content);
      }
      
      if (params.utm_term) {
        urlObj.searchParams.set('utm_term', params.utm_term);
      }
      
      return urlObj.toString();
    } catch (error) {
      console.error('Invalid URL for UTM tracking:', url);
      return url; // Return original URL if invalid
    }
  }

  /**
   * Find all URLs in text content
   */
  static extractURLs(text: string): string[] {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  /**
   * Replace URLs in text with tracked versions
   */
  static replaceURLsWithTracked(
    text: string,
    urlMapping: Map<string, string>
  ): string {
    let trackedText = text;
    
    urlMapping.forEach((trackedUrl, originalUrl) => {
      trackedText = trackedText.replace(originalUrl, trackedUrl);
    });
    
    return trackedText;
  }

  /**
   * Process post content and add UTM tracking to all URLs
   */
  static processPostContent(
    content: string,
    clientId: number,
    clientName: string,
    postType: string = 'post'
  ): {
    trackedContent: string;
    utmCampaign: string;
    originalUrls: string[];
    trackedUrls: string[];
  } {
    // Generate campaign name
    const utmCampaign = this.generateCampaignName(clientId, clientName, postType);
    
    // Extract all URLs from content
    const originalUrls = this.extractURLs(content);
    
    if (originalUrls.length === 0) {
      return {
        trackedContent: content,
        utmCampaign,
        originalUrls: [],
        trackedUrls: []
      };
    }
    
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
    
    console.log('📊 UTM Tracking Applied:');
    console.log(`   Campaign: ${utmCampaign}`);
    console.log(`   Original URLs: ${originalUrls.length}`);
    console.log(`   Tracked URLs: ${trackedUrls.length}`);
    
    return {
      trackedContent,
      utmCampaign,
      originalUrls,
      trackedUrls
    };
  }
}
```

---

### File: `backend/src/services/facebookService.ts` (MODIFY EXISTING)

Update the `createTextPost`, `createImagePost`, and `createMultiImagePost` methods to use UTM tracking:

**Before:**
```typescript
async createTextPost(clientId: number, message: string): Promise<...> {
  // ... existing code ...
  
  // Post to Facebook
  const response = await axios.post(
    `${this.baseUrl}/${page_id}/feed`,
    { message },
    { params: { access_token } }
  );
  
  // ... store in database ...
}
```

**After (with UTM tracking):**
```typescript
import { UTMTrackingService } from './utmTrackingService';

async createTextPost(clientId: number, message: string): Promise<...> {
  // ... existing code to get credentials ...
  
  // NEW: Get client name for UTM campaign
  const clientResult = await this.pool.query(
    'SELECT name FROM clients WHERE id = $1',
    [clientId]
  );
  const clientName = clientResult.rows[0]?.name || 'client';
  
  // NEW: Process content with UTM tracking
  const {
    trackedContent,
    utmCampaign,
    originalUrls,
    trackedUrls
  } = UTMTrackingService.processPostContent(
    message,
    clientId,
    clientName,
    'text'
  );
  
  console.log('🔗 Posting with UTM tracking:');
  console.log(`   Original: ${message.substring(0, 50)}...`);
  console.log(`   Tracked: ${trackedContent.substring(0, 50)}...`);
  
  // Post to Facebook with tracked content
  const response = await axios.post(
    `${this.baseUrl}/${page_id}/feed`,
    { message: trackedContent }, // Use tracked content
    { params: { access_token } }
  );
  
  const postId = response.data.id;
  const postUrl = `https://facebook.com/${postId}`;
  
  // Store in database WITH UTM data
  await this.pool.query(
    `INSERT INTO facebook_posts (
      client_id, post_id, message, created_time, permalink_url,
      utm_campaign, utm_source, utm_medium, original_urls, tracked_urls,
      synced_at
    ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (post_id) DO UPDATE SET
      message = EXCLUDED.message,
      utm_campaign = EXCLUDED.utm_campaign,
      original_urls = EXCLUDED.original_urls,
      tracked_urls = EXCLUDED.tracked_urls,
      synced_at = NOW()`,
    [
      clientId,
      postId,
      trackedContent, // Store tracked version
      postUrl,
      utmCampaign,
      'facebook',
      'social',
      originalUrls,
      trackedUrls
    ]
  );
  
  console.log('✅ Facebook post created with UTM tracking');
  console.log(`   Post ID: ${postId}`);
  console.log(`   UTM Campaign: ${utmCampaign}`);
  
  return { success: true, postId, postUrl };
}
```

**Apply the same changes to:**
- `createImagePost()` - Add UTM to message
- `createMultiImagePost()` - Add UTM to message
- `createVideoPost()` - Add UTM to title and description

---

## 🔌 NEW API ENDPOINTS

### File: `backend/src/routes/facebook.ts` (NEW OR ADD TO EXISTING)

```typescript
import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * GET /api/facebook/conversion-report/:clientId
 * Get Facebook post conversion attribution report
 */
router.get('/conversion-report/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Fetch Facebook posts with UTM campaigns
    const postsResult = await pool.query(
      `SELECT 
        fp.post_id,
        fp.message,
        fp.created_time,
        fp.permalink_url,
        fp.utm_campaign,
        fp.post_clicks as facebook_clicks,
        fp.post_reach as facebook_reach,
        fp.post_impressions as facebook_impressions,
        fp.reactions_like + fp.reactions_love + fp.reactions_haha + 
          fp.reactions_wow + fp.reactions_sad + fp.reactions_angry as total_reactions,
        fp.comments_count,
        fp.shares_count
       FROM facebook_posts fp
       WHERE fp.client_id = $1
         AND fp.utm_campaign IS NOT NULL
         AND fp.created_time >= COALESCE($2::timestamp, fp.created_time)
         AND fp.created_time <= COALESCE($3::timestamp, NOW())
       ORDER BY fp.created_time DESC`,
      [clientId, startDate || null, endDate || null]
    );
    
    // For each post, fetch Google Analytics data
    const enrichedPosts = await Promise.all(
      postsResult.rows.map(async (post) => {
        // Query Google Analytics data for this UTM campaign
        const gaResult = await pool.query(
          `SELECT 
            COUNT(DISTINCT session_id) as website_visits,
            SUM(page_views) as total_page_views,
            AVG(session_duration) as avg_duration,
            SUM(CASE WHEN bounced = false THEN 1 ELSE 0 END)::float / 
              NULLIF(COUNT(*), 0) * 100 as engagement_rate
           FROM google_analytics_data
           WHERE client_id = $1
             AND campaign = $2
             AND recorded_at >= $3`,
          [clientId, post.utm_campaign, post.created_time]
        );
        
        const gaData = gaResult.rows[0] || {
          website_visits: 0,
          total_page_views: 0,
          avg_duration: 0,
          engagement_rate: 0
        };
        
        // Calculate conversion rate
        const conversionRate = post.facebook_clicks > 0
          ? ((gaData.website_visits / post.facebook_clicks) * 100).toFixed(2)
          : 0;
        
        return {
          ...post,
          website_visits: parseInt(gaData.website_visits) || 0,
          website_page_views: parseInt(gaData.total_page_views) || 0,
          website_avg_duration: Math.round(gaData.avg_duration) || 0,
          website_engagement_rate: parseFloat(gaData.engagement_rate).toFixed(2) || 0,
          conversion_rate: conversionRate,
          roi_score: (
            (post.facebook_clicks * 0.1) +
            (gaData.website_visits * 1) +
            (post.total_reactions * 0.5) +
            (post.comments_count * 2) +
            (post.shares_count * 3)
          ).toFixed(2)
        };
      })
    );
    
    res.json({
      success: true,
      posts: enrichedPosts,
      summary: {
        total_posts: enrichedPosts.length,
        total_facebook_clicks: enrichedPosts.reduce((sum, p) => sum + (p.facebook_clicks || 0), 0),
        total_website_visits: enrichedPosts.reduce((sum, p) => sum + p.website_visits, 0),
        avg_conversion_rate: (
          enrichedPosts.reduce((sum, p) => sum + parseFloat(p.conversion_rate), 0) / 
          enrichedPosts.length
        ).toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching conversion report:', error);
    res.status(500).json({ error: 'Failed to fetch conversion report' });
  }
});

export default router;
```

**Register this route in `backend/src/server.ts`:**
```typescript
import facebookRoutes from './routes/facebook';
app.use('/api/facebook', facebookRoutes);
```

---

## 🎨 FRONTEND IMPLEMENTATION

### File: `frontend/src/pages/FacebookConversionReport.tsx` (NEW FILE)

```tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ConversionPost {
  post_id: string;
  message: string;
  created_time: string;
  permalink_url: string;
  utm_campaign: string;
  facebook_clicks: number;
  facebook_reach: number;
  facebook_impressions: number;
  total_reactions: number;
  comments_count: number;
  shares_count: number;
  website_visits: number;
  website_page_views: number;
  website_avg_duration: number;
  website_engagement_rate: number;
  conversion_rate: number;
  roi_score: number;
}

export default function FacebookConversionReport() {
  const [posts, setPosts] = useState<ConversionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  
  useEffect(() => {
    if (selectedClient) {
      fetchConversionData();
    }
  }, [selectedClient]);
  
  const fetchConversionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/facebook/conversion-report/${selectedClient}`
      );
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error fetching conversion data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '2rem' }}>
      <h1>📊 Facebook Conversion Attribution Report</h1>
      <p>Track which Facebook posts drive website traffic and conversions</p>
      
      {loading ? (
        <div>Loading conversion data...</div>
      ) : (
        <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Post</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>FB Clicks</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Website Visits</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Conversion %</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Engagement</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>ROI Score</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.post_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ maxWidth: '300px' }}>
                    <a 
                      href={post.permalink_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#4682B4', textDecoration: 'none', fontWeight: '600' }}
                    >
                      {post.message.substring(0, 100)}...
                    </a>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {new Date(post.created_time).toLocaleDateString()}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <strong>{post.facebook_clicks}</strong>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <strong style={{ color: '#28a745' }}>{post.website_visits}</strong>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: parseFloat(post.conversion_rate) > 50 ? '#d4edda' : '#fff3cd',
                    color: parseFloat(post.conversion_rate) > 50 ? '#155724' : '#856404',
                    fontWeight: '600'
                  }}>
                    {post.conversion_rate}%
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div>
                    ❤️ {post.total_reactions} · 
                    💬 {post.comments_count} · 
                    🔄 {post.shares_count}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <strong style={{ fontSize: '16px', color: '#4682B4' }}>
                    {post.roi_score}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## ✅ TESTING CHECKLIST

### Step 1: Backend Testing
- [ ] Run database migrations on Heroku
- [ ] Test UTM parameter generation
- [ ] Post a test message with URL to Facebook
- [ ] Verify URL in Facebook post has UTM parameters
- [ ] Verify database stores `utm_campaign`, `original_urls`, `tracked_urls`

### Step 2: End-to-End Testing
- [ ] Create Facebook post with link through portal
- [ ] Click link in Facebook post
- [ ] Verify Google Analytics tracks the visit with UTM parameters
- [ ] Check if GA shows `utm_source=facebook`, `utm_medium=social`, `utm_campaign=...`

### Step 3: Report Testing
- [ ] Open conversion report page
- [ ] Verify Facebook clicks are shown
- [ ] Verify website visits from GA are shown
- [ ] Verify conversion rate is calculated correctly

---

## 📈 EXPECTED OUTCOMES

### Example Facebook Post:

**Before (No Tracking):**
```
Check out our healthcare services!
https://wetechforu.com/services
```

**After (With UTM Tracking):**
```
Check out our healthcare services!
https://wetechforu.com/services?utm_source=facebook&utm_medium=social&utm_campaign=promed_fb_post_1730000000000&utm_content=text
```

### Example Conversion Report:

| Post | FB Clicks | Website Visits | Conversion % | ROI Score |
|------|-----------|----------------|--------------|-----------|
| "New Telehealth Services..." | 150 | 98 | 65.3% | 325.5 |
| "Meet Dr. Smith..." | 85 | 42 | 49.4% | 184.2 |
| "Fall Health Tips..." | 220 | 156 | 70.9% | 512.8 |

---

## 🚨 IMPORTANT NOTES

### For Heroku Deployment:
1. **Run migrations FIRST** before deploying code:
   ```bash
   heroku pg:psql --app marketingby-wetechforu < migration.sql
   ```

2. **Don't break existing posts** - Use `ADD COLUMN IF NOT EXISTS`

3. **Test on dev database first** - Always test migrations locally

### For Code Safety:
1. **Graceful fallback** - If UTM generation fails, post without tracking (don't block posting)
2. **URL validation** - Don't break malformed URLs
3. **Logging** - Add detailed console logs for debugging

### For Google Analytics:
- UTM parameters are automatically tracked by GA
- No additional GA configuration needed
- Data appears in: Acquisition → Campaigns → All Campaigns

---

## 📞 NEED HELP?

### Testing Resources:
- **Facebook Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Google Analytics Debug View**: Enable in GA4 settings
- **Heroku Logs**: `heroku logs --tail --app marketingby-wetechforu`

### Common Issues:
1. **URLs not tracked**: Check if URL regex is matching correctly
2. **GA not showing data**: Wait 24-48 hours for GA to process
3. **Conversion rate 0%**: Ensure GA property ID is correct

---

## ✅ DEFINITION OF DONE

This feature is complete when:
- [x] All database migrations run successfully
- [x] UTM parameters automatically added to all Facebook post URLs
- [x] UTM data stored in database
- [x] Conversion report shows Facebook clicks and website visits
- [x] Conversion rate calculated correctly
- [x] All existing Facebook posting still works (no breaking changes)
- [x] Code is tested on staging before production deployment
- [x] Documentation updated in master API_DATABASE_FLOW_DIAGRAM.md

---

**Questions?** Contact project owner before starting implementation.

**Estimated Completion**: 2-3 hours for experienced developer familiar with the codebase.

---

**Good luck! 🚀**

