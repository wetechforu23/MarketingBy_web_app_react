import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Enable SSL for all remote databases (Heroku, AWS RDS, etc.)
const dbUrl = process.env.DATABASE_URL || '';
const isRemoteDb = dbUrl && (
  dbUrl.includes('rds.amazonaws.com') || 
  dbUrl.includes('heroku') || 
  dbUrl.includes('.com') ||
  !dbUrl.includes('localhost')
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  max: 15, // Maximum number of clients in the pool (leave headroom for Heroku's 20 limit)
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds (faster cleanup)
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  allowExitOnIdle: true, // Allow process to exit when pool is idle
});

// Log pool events for monitoring
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

pool.on('connect', (client) => {
  console.log(`📊 Database connection established. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('remove', (client) => {
  console.log(`📊 Database connection removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

export default pool;
