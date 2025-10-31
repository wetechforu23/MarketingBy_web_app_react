const { Pool } = require('pg');

// Use the same database URL that the running server is using
const pool = new Pool({
  connectionString: 'postgres://u6jiliov4itlpd:p8cb462eac52ccb92d2602ce07f0e64f54fd267b01e250307a8d4276cbb73d8fab@50.16.120.91:5432/dfkco05sfrm6d1',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for Facebook posts insights...\n');

    const result = await pool.query(`
      SELECT 
        post_id,
        LEFT(message, 50) as message_preview,
        likes,
        comments,
        shares,
        total_reactions,
        post_impressions,
        post_reach,
        post_engaged_users,
        created_time
      FROM facebook_posts
      WHERE client_id = 1
      ORDER BY created_time DESC
      LIMIT 6
    `);

    console.log(`Found ${result.rows.length} posts in database:\n`);
    
    result.rows.forEach((post, i) => {
      console.log(`Post ${i + 1}:`);
      console.log(`  ID: ${post.post_id}`);
      console.log(`  Message: ${post.message_preview || 'No text'}...`);
      console.log(`  Created: ${post.created_time}`);
      console.log(`  Likes: ${post.likes}, Comments: ${post.comments}, Shares: ${post.shares}`);
      console.log(`  Total Reactions: ${post.total_reactions}`);
      console.log(`  📊 Impressions: ${post.post_impressions} ${post.post_impressions === 0 ? '❌' : '✅'}`);
      console.log(`  📊 Reach (Unique Impressions): ${post.post_reach} ${post.post_reach === 0 ? '❌' : '✅'}`);
      console.log(`  📊 Engaged Users: ${post.post_engaged_users} ${post.post_engaged_users === 0 ? '❌' : '✅'}`);
      console.log('');
    });

    const zeroCount = result.rows.filter(p => p.post_impressions === 0).length;
    
    if (zeroCount === result.rows.length) {
      console.log('\n❌ ALL POSTS HAVE ZERO INSIGHTS!\n');
      console.log('🔧 SOLUTION:');
      console.log('   1. Click "Sync Facebook Data" button');
      console.log('   2. This will fetch fresh data from Facebook Graph API');
      console.log('   3. If still 0, the Facebook token lacks "read_insights" permission');
      console.log('\n📋 To fix token permissions:');
      console.log('   1. Go to: https://developers.facebook.com/tools/explorer/');
      console.log('   2. Generate new token with: pages_read_engagement, read_insights');
      console.log('   3. Update in database or settings');
    } else {
      console.log(`\n✅ ${result.rows.length - zeroCount} posts have insights data!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();

