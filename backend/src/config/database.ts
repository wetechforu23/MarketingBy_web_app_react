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
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

export default pool;
