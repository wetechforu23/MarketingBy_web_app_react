const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkFacebookTables() {
  const clientId = 199; // Demo-2 client ID
  const dbUrl = process.env.DATABASE_URL || '';
  const isRemoteDb = dbUrl && (
    dbUrl.includes('rds.amazonaws.com') ||
    dbUrl.includes('heroku') ||
    dbUrl.includes('.com') ||
    !dbUrl.includes('localhost')
  );

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CHECKING FACEBOOK DATABASE TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ═══════════════════════════════════════════════════════════════
    // 1. Check facebook_analytics table structure
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 1. FACEBOOK_ANALYTICS TABLE STRUCTURE:');
    console.log('─────────────────────────────────────────────────────');
    const analyticsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'facebook_analytics'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    analyticsColumns.rows.forEach(col => {
      console.log(`   → ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- REQUIRED' : ''}`);
    });
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 2. Check facebook_analytics data for Demo-2
    // ═══════════════════════════════════════════════════════════════
    console.log('📊 2. DATA IN FACEBOOK_ANALYTICS FOR DEMO-2 (Client ID: 199):');
    console.log('─────────────────────────────────────────────────────');
    const analyticsData = await pool.query(`
      SELECT * FROM facebook_analytics 
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [clientId]);
    
    if (analyticsData.rows.length === 0) {
      console.log('❌ NO DATA FOUND!');
      console.log('   → Table exists but is empty for Demo-2');
      console.log('   → Need to run: Sync Facebook Data button');
    } else {
      console.log(`✅ Found ${analyticsData.rows.length} record(s):\n`);
      analyticsData.rows.forEach((row, index) => {
        console.log(`   Record ${index + 1}:`);
        console.log(`   → Page Views: ${row.page_views || 0}`);
        console.log(`   → Followers: ${row.followers || 0}`);
        console.log(`   → Reach: ${row.reach || 0}`);
        console.log(`   → Impressions: ${row.impressions || 0}`);
        console.log(`   → Engagement: ${row.engagement || 0}`);
        console.log(`   → Synced At: ${row.synced_at || row.created_at || 'N/A'}`);
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. Check facebook_posts table structure
    // ═══════════════════════════════════════════════════════════════
    console.log('📋 3. FACEBOOK_POSTS TABLE STRUCTURE:');
    console.log('─────────────────────────────────────────────────────');
    const postsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'facebook_posts'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    postsColumns.rows.forEach(col => {
      console.log(`   → ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '- REQUIRED' : ''}`);
    });
    console.log('');

    // ═══════════════════════════════════════════════════════════════
    // 4. Check facebook_posts data for Demo-2
    // ═══════════════════════════════════════════════════════════════
    console.log('📊 4. DATA IN FACEBOOK_POSTS FOR DEMO-2 (Client ID: 199):');
    console.log('─────────────────────────────────────────────────────');
    const postsData = await pool.query(`
      SELECT * FROM facebook_posts 
      WHERE client_id = $1
      ORDER BY created_time DESC
      LIMIT 5
    `, [clientId]);
    
    if (postsData.rows.length === 0) {
      console.log('❌ NO POSTS FOUND!');
      console.log('   → Table exists but is empty for Demo-2');
    } else {
      console.log(`✅ Found ${postsData.rows.length} post(s):\n`);
      postsData.rows.forEach((row, index) => {
        console.log(`   Post ${index + 1}:`);
        console.log(`   → Post ID: ${row.post_id}`);
        console.log(`   → Message: ${(row.message || 'No message').substring(0, 50)}...`);
        console.log(`   → Impressions: ${row.post_impressions || 0}`);
        console.log(`   → Reach: ${row.post_reach || 0}`);
        console.log(`   → Engagement: ${row.post_engaged_users || 0}`);
        console.log(`   → Likes: ${row.likes || 0}`);
        console.log(`   → Comments: ${row.comments || 0}`);
        console.log(`   → Shares: ${row.shares || 0}`);
        console.log(`   → Created: ${row.created_time}`);
        console.log('');
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 SUMMARY FOR DEMO-2 (Client ID: 199)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`facebook_analytics records: ${analyticsData.rows.length}`);
    console.log(`facebook_posts records: ${postsData.rows.length}`);
    console.log('');
    
    if (analyticsData.rows.length === 0) {
      console.log('⚠️  STATUS: NO DATA IN DATABASE');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Go to Client Management Dashboard (Super Admin)');
      console.log('   2. Select Demo-2 client');
      console.log('   3. Go to "Social Media" tab');
      console.log('   4. Click "🔄 Sync Facebook Data" button');
      console.log('   5. Wait for success message');
      console.log('   6. Client will now see real data!');
      console.log('');
    } else {
      console.log('✅ STATUS: DATA EXISTS IN DATABASE');
      console.log('   → Client should see this data in their dashboard');
      console.log('');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await pool.end();
  }
}

checkFacebookTables();

