import express from 'express';
import pool from '../config/database';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /system/schema:
 *   get:
 *     summary: Get database schema information
 *     description: Returns complete database schema including tables, columns, constraints, and relationships. Requires Super Admin access.
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Schema information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tables:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       columns:
 *                         type: array
 *                         items:
 *                           type: object
 *                 fetchedAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Super admin access required
 *       500:
 *         description: Failed to fetch schema
 */
router.get('/schema', async (req, res) => {
  try {
    // Verify user is super admin
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userResponse = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (!userResponse.rows[0] || userResponse.rows[0].role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables: any[] = [];
    
    // For each table, get columns and constraints
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      // Get columns
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Get primary keys
      const pkResult = await pool.query(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
      `, [tableName]);

      const primaryKeys = new Set(pkResult.rows.map((r: any) => r.column_name));

      // Get foreign keys
      const fkResult = await pool.query(`
        SELECT
          kcu.column_name,
          ccu.table_schema AS foreign_table_schema,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
      `, [tableName]);

      const foreignKeys: any = {};
      fkResult.rows.forEach((fk: any) => {
        foreignKeys[fk.column_name] = {
          table: fk.foreign_table_name,
          column: fk.foreign_column_name
        };
      });

      // Get unique constraints
      const ukResult = await pool.query(`
        SELECT column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'UNIQUE'
      `, [tableName]);

      const uniqueKeys = new Set(ukResult.rows.map((r: any) => r.column_name));

      const columns = columnsResult.rows.map((col: any) => ({
        name: col.column_name,
        type: col.character_maximum_length 
          ? `${col.data_type}(${col.character_maximum_length})`
          : col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        pk: primaryKeys.has(col.column_name),
        uk: uniqueKeys.has(col.column_name),
        fk: foreignKeys[col.column_name] || null
      }));

      tables.push({
        name: tableName,
        columns,
        primaryKeys: Array.from(primaryKeys),
        foreignKeys
      });
    }

    res.json({
      tables,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch database schema' });
  }
});

export default router;

