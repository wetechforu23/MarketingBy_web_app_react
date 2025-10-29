import express from 'express';
import axios from 'axios';

const router = express.Router();

// TEMPORARY TEST ROUTE - Uses new Page Access Token directly
// NO DATABASE CHANGES - Just for preview

// Page Access Token from auto-conversion (User Token -> Page Token)
const PAGE_TOKEN = 'EAAVlGna8NrIBO5JlAmCBVg6xzOqGUkE5SAV5DmfEEFcLN5mMQ3IfAHZCaJxRZCLHPv3kDSMFzRkXSzZAPMxGJQZBp8fhE1n5y66OYQYnqQj4ov0Q0Cy6bNW7onswE1ZCwQBmWl2CzwOxAjU7TqmB16QpAZBBuGiN88y9dmJ98IQIUg-Ja0Dqc-TrYSDsAv7QQEk-JQEP08MDcIdE4ysQOJrxoI12kU2O7MeIyj0YDsSVnLpX';
const PAGE_ID = '744651835408507';
const API_VERSION = 'v23.0';

// Test endpoint to preview new token data
router.get('/overview/:clientId', async (req, res) => {
  try {
    console.log('🧪 TEST: Fetching data with new Page Access Token...');
    
    // Get page info
    const pageUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}`;
    const pageResponse = await axios.get(pageUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,name,category,followers_count,fan_count'
      }
    });
    
    const followers = pageResponse.data.followers_count || pageResponse.data.fan_count || 0;
    
    // Get posts with insights
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,message,created_time,insights.metric(post_impressions,post_impressions_unique)',
        limit: 100
      }
    });
    
    const posts = postsResponse.data.data || [];
    let totalImpressions = 0;
    
    posts.forEach(post => {
      const impressions = post.insights?.data?.find(i => i.name === 'post_impressions')?.values?.[0]?.value || 0;
      totalImpressions += impressions;
    });
    
    res.json({
      pageViews: totalImpressions,
      followers: followers,
      engagement: 30,
      reach: 1200,
      impressions: totalImpressions,
      postEngagements: posts.length * 10,
      engagementRate: followers > 0 ? ((30 / followers) * 100).toFixed(1) : 0,
      connected: true,
      status: 'Connected (TEST)',
      _isTestData: true
    });
    
  } catch (error: any) {
    console.error('❌ Test endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for posts
router.get('/posts/:clientId', async (req, res) => {
  try {
    console.log('🧪 TEST: Fetching posts with new Page Access Token...');
    
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)',
        limit: req.query.limit || 50
      }
    });
    
    const posts = postsResponse.data.data.map((post: any) => {
      const impressions = post.insights?.data?.find(i => i.name === 'post_impressions')?.values?.[0]?.value || 0;
      const reach = post.insights?.data?.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
      
      return {
        post_id: post.id,
        message: post.message || 'No text',
        created_time: post.created_time,
        permalink_url: post.permalink_url,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
        total_reactions: post.reactions?.summary?.total_count || 0,
        post_impressions: impressions,
        post_reach: reach,
        post_engaged_users: 0,
        _isTestData: true
      };
    });
    
    res.json(posts);
    
  } catch (error: any) {
    console.error('❌ Test posts endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint for top posts
router.get('/analytics/top-posts/:clientId', async (req, res) => {
  try {
    console.log('🧪 TEST: Fetching top posts with new Page Access Token...');
    
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_impressions_unique)',
        limit: 100
      }
    });
    
    const posts = postsResponse.data.data
      .map((post: any) => {
        const impressions = post.insights?.data?.find(i => i.name === 'post_impressions')?.values?.[0]?.value || 0;
        const reach = post.insights?.data?.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
        const reactions = post.reactions?.summary?.total_count || 0;
        
        return {
          post_id: post.id,
          message: post.message || 'No text',
          created_time: post.created_time,
          post_impressions: impressions,
          post_reach: reach,
          reactions_total: reactions,
          _isTestData: true
        };
      })
      .sort((a, b) => b.post_impressions - a.post_impressions)
      .slice(0, parseInt(req.query.limit as string) || 5);
    
    res.json(posts);
    
  } catch (error: any) {
    console.error('❌ Test top posts endpoint error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

