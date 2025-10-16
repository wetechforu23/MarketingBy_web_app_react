const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupSiteUrls() {
  try {
    console.log('🧹 Starting cleanup of Search Console site URLs...');
    
    // Get all Search Console credentials
    const result = await pool.query(`
      SELECT id, client_id, credentials 
      FROM client_credentials 
      WHERE service_type = 'google_search_console'
    `);
    
    console.log(`📊 Found ${result.rows.length} Search Console credential records`);
    
    for (const row of result.rows) {
      let credentials;
      
      // Parse credentials
      if (typeof row.credentials === 'string') {
        credentials = JSON.parse(row.credentials);
      } else {
        credentials = row.credentials;
      }
      
      // Check if site_url has leading/trailing spaces
      if (credentials.site_url && credentials.site_url !== credentials.site_url.trim()) {
        const oldUrl = credentials.site_url;
        const newUrl = credentials.site_url.trim();
        
        console.log(`🔧 Client ${row.client_id}: "${oldUrl}" → "${newUrl}"`);
        
        // Update the credentials
        credentials.site_url = newUrl;
        
        await pool.query(
          'UPDATE client_credentials SET credentials = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(credentials), row.id]
        );
        
        console.log(`✅ Updated client ${row.client_id} site URL`);
      } else {
        console.log(`✅ Client ${row.client_id} site URL is clean: "${credentials.site_url}"`);
      }
    }
    
    console.log('🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupSiteUrls();
