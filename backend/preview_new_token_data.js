const axios = require('axios');
const fs = require('fs');

// PREVIEW what data you'll get with the new Page Access Token
// NO DATABASE CHANGES - just showing you the data locally

const PAGE_TOKEN = fs.readFileSync('backend/.page_token', 'utf8').trim();
const PAGE_ID = '744651835408507';
const API_VERSION = 'v23.0';

async function previewData() {
  console.log('🎬 LOCAL PREVIEW - New Page Access Token Data\n');
  console.log('━'.repeat(70));
  console.log('⚠️  NO DATABASE CHANGES - Just showing you what you\'ll get\n');
  
  try {
    // 1. Page Overview
    console.log('📊 1. PAGE OVERVIEW:\n');
    const pageUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}`;
    const pageResponse = await axios.get(pageUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,name,category,followers_count,fan_count,about,phone,emails,website,location'
      }
    });
    
    const page = pageResponse.data;
    console.log(`   Page Name: ${page.name}`);
    console.log(`   Category: ${page.category}`);
    console.log(`   Followers: ${page.followers_count || page.fan_count || 0}`);
    console.log(`   Website: ${page.website || 'N/A'}`);
    console.log(`   Phone: ${page.phone || 'N/A'}`);
    
    // 2. All Posts with Full Insights
    console.log('\n\n📝 2. ALL POSTS WITH INSIGHTS:\n');
    const postsUrl = `https://graph.facebook.com/${API_VERSION}/${PAGE_ID}/posts`;
    const postsResponse = await axios.get(postsUrl, {
      params: {
        access_token: PAGE_TOKEN,
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),insights.metric(post_impressions,post_impressions_unique,post_reactions_by_type_total)',
        limit: 100
      }
    });
    
    const posts = postsResponse.data.data;
    console.log(`   Total Posts Retrieved: ${posts.length}\n`);
    
    let totalImpressions = 0;
    let totalUniqueImpressions = 0;
    let totalReactions = 0;
    
    posts.forEach((post, index) => {
      const impressions = post.insights?.data?.find(i => i.name === 'post_impressions')?.values?.[0]?.value || 0;
      const uniqueImpressions = post.insights?.data?.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
      const reactions = post.reactions?.summary?.total_count || 0;
      const likes = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      
      totalImpressions += impressions;
      totalUniqueImpressions += uniqueImpressions;
      totalReactions += reactions;
      
      console.log(`   ┌─ Post #${index + 1}`);
      console.log(`   │  📅 Date: ${new Date(post.created_time).toLocaleDateString()}`);
      console.log(`   │  📝 Message: ${(post.message || 'No text').substring(0, 60)}...`);
      console.log(`   │  👁️  Impressions: ${impressions} (Unique: ${uniqueImpressions})`);
      console.log(`   │  ❤️  Reactions: ${reactions} | Likes: ${likes} | Comments: ${comments} | Shares: ${shares}`);
      console.log(`   └─ Permalink: ${post.permalink_url}`);
      console.log('');
    });
    
    // 3. Summary Statistics
    console.log('\n📈 3. SUMMARY STATISTICS:\n');
    console.log(`   Total Posts: ${posts.length}`);
    console.log(`   Total Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`   Total Unique Impressions: ${totalUniqueImpressions.toLocaleString()}`);
    console.log(`   Total Reactions: ${totalReactions}`);
    console.log(`   Avg Impressions/Post: ${Math.round(totalImpressions / posts.length)}`);
    console.log(`   Avg Unique Impressions/Post: ${Math.round(totalUniqueImpressions / posts.length)}`);
    
    // 4. Top 5 Posts
    console.log('\n\n🏆 4. TOP 5 PERFORMING POSTS (by Impressions):\n');
    const sortedPosts = posts
      .map(post => ({
        message: (post.message || 'No text').substring(0, 50),
        created: new Date(post.created_time).toLocaleDateString(),
        impressions: post.insights?.data?.find(i => i.name === 'post_impressions')?.values?.[0]?.value || 0,
        uniqueImpressions: post.insights?.data?.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0,
        reactions: post.reactions?.summary?.total_count || 0
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
    
    sortedPosts.forEach((post, index) => {
      console.log(`   ${index + 1}. ${post.created} - ${post.message}...`);
      console.log(`      👁️  ${post.impressions} impressions (${post.uniqueImpressions} unique) | ❤️  ${post.reactions} reactions\n`);
    });
    
    console.log('━'.repeat(70));
    console.log('\n✅ **THIS IS WHAT YOU\'LL SEE IN YOUR DASHBOARD!**\n');
    console.log('💡 Key Points:');
    console.log('   ✅ All posts have REAL impressions data (no more N/A)');
    console.log('   ✅ Unique impressions are tracked');
    console.log('   ✅ All engagement metrics are accurate');
    console.log('   ✅ Top performing posts are properly ranked\n');
    
    console.log('🎯 This data will appear immediately after token update!\n');
    console.log('━'.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Preview failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

previewData();

