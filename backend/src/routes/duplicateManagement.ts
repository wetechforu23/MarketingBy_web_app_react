import { Router } from 'express';
import pool from '../config/database';

const router = Router();

// ============================================================================
// CHECK FOR DUPLICATES
// ============================================================================

/**
 * POST /api/duplicates/check-lead
 * Check if a lead with same email/phone already exists
 */
router.post('/check-lead', async (req, res) => {
  try {
    const { email, phone, excludeLeadId } = req.body;
    
    console.log(`🔍 Checking for duplicate leads: email=${email}, phone=${phone}`);
    
    const duplicates: any[] = [];
    
    // Check by email
    if (email) {
      const emailDuplicates = await pool.query(
        `SELECT 
          l.id, l.company, l.email, l.phone, l.status, l.created_at,
          l.converted_to_client_id, c.client_name as converted_client_name
        FROM leads l
        LEFT JOIN clients c ON l.converted_to_client_id = c.id
        WHERE LOWER(l.email) = LOWER($1)
          AND ($2::integer IS NULL OR l.id != $2)
        ORDER BY l.created_at DESC`,
        [email, excludeLeadId || null]
      );
      
      emailDuplicates.rows.forEach(row => {
        duplicates.push({ ...row, match_field: 'email' });
      });
    }
    
    // Check by phone (if provided and not already found by email)
    if (phone && duplicates.length === 0) {
      const phoneDuplicates = await pool.query(
        `SELECT 
          l.id, l.company, l.email, l.phone, l.status, l.created_at,
          l.converted_to_client_id, c.client_name as converted_client_name
        FROM leads l
        LEFT JOIN clients c ON l.converted_to_client_id = c.id
        WHERE l.phone = $1
          AND ($2::integer IS NULL OR l.id != $2)
        ORDER BY l.created_at DESC`,
        [phone, excludeLeadId || null]
      );
      
      phoneDuplicates.rows.forEach(row => {
        duplicates.push({ ...row, match_field: 'phone' });
      });
    }
    
    console.log(`   Found ${duplicates.length} duplicate leads`);
    
    res.json({
      has_duplicates: duplicates.length > 0,
      duplicates,
      count: duplicates.length
    });
  } catch (error) {
    console.error('❌ Check lead duplicates error:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
});

/**
 * POST /api/duplicates/check-client
 * Check if a client with same email already exists
 */
router.post('/check-client', async (req, res) => {
  try {
    const { email, phone, excludeClientId } = req.body;
    
    console.log(`🔍 Checking for duplicate clients: email=${email}, phone=${phone}`);
    
    const duplicates: any[] = [];
    
    // Check by email
    if (email) {
      const emailDuplicates = await pool.query(
        `SELECT 
          c.id, c.client_name, c.email, c.phone, c.location_name,
          c.parent_client_id, c.is_primary_location, c.created_at,
          COUNT(sub.id) as location_count
        FROM clients c
        LEFT JOIN clients sub ON sub.parent_client_id = c.id
        WHERE LOWER(c.email) = LOWER($1)
          AND c.is_active = true
          AND ($2::integer IS NULL OR c.id != $2)
        GROUP BY c.id, c.client_name, c.email, c.phone, c.location_name,
                 c.parent_client_id, c.is_primary_location, c.created_at
        ORDER BY c.is_primary_location DESC, c.created_at ASC`,
        [email, excludeClientId || null]
      );
      
      emailDuplicates.rows.forEach(row => {
        duplicates.push({ ...row, match_field: 'email' });
      });
    }
    
    console.log(`   Found ${duplicates.length} duplicate clients`);
    
    res.json({
      has_duplicates: duplicates.length > 0,
      duplicates,
      count: duplicates.length
    });
  } catch (error) {
    console.error('❌ Check client duplicates error:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
});

// ============================================================================
// RESOLVE DUPLICATES
// ============================================================================

/**
 * POST /api/duplicates/resolve-lead
 * Resolve duplicate lead by merging or creating separate
 */
router.post('/resolve-lead', async (req, res) => {
  try {
    const { leadId, duplicateLeadId, action, notes } = req.body;
    const userId = (req.session as any).userId;
    
    console.log(`🔧 Resolving lead duplicate: lead=${leadId}, duplicate=${duplicateLeadId}, action=${action}`);
    
    // Log the duplicate detection
    await pool.query(
      `INSERT INTO duplicate_detections 
        (entity_type, entity_id, duplicate_entity_id, match_field, match_value, 
         resolution_action, resolved_by, resolution_notes, resolved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      ['lead', leadId, duplicateLeadId, 'email', req.body.email, action, userId, notes]
    );
    
    if (action === 'merge') {
      // Mark new lead as duplicate of existing
      await pool.query(
        `UPDATE leads 
        SET duplicate_of_lead_id = $1, 
            duplicate_resolution = 'merged',
            duplicate_checked_at = NOW()
        WHERE id = $2`,
        [duplicateLeadId, leadId]
      );
      
      res.json({
        success: true,
        message: 'Lead marked as duplicate and merged',
        action: 'merged',
        primary_lead_id: duplicateLeadId
      });
    } else if (action === 'separate') {
      // Mark as separate entity (allow duplicate)
      await pool.query(
        `UPDATE leads 
        SET duplicate_resolution = 'separate',
            duplicate_checked_at = NOW()
        WHERE id = $1`,
        [leadId]
      );
      
      res.json({
        success: true,
        message: 'Lead created as separate entity',
        action: 'separate'
      });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "merge" or "separate"' });
    }
  } catch (error) {
    console.error('❌ Resolve lead duplicate error:', error);
    res.status(500).json({ error: 'Failed to resolve duplicate' });
  }
});

/**
 * POST /api/duplicates/create-location
 * Create additional location for existing client
 */
router.post('/create-location', async (req, res) => {
  try {
    const { 
      parentClientId, 
      locationName, 
      address, 
      city, 
      state, 
      zipCode, 
      phone,
      email 
    } = req.body;
    
    console.log(`📍 Creating additional location for client ${parentClientId}: ${locationName}`);
    
    // Get parent client info
    const parentResult = await pool.query(
      'SELECT client_name, email FROM clients WHERE id = $1',
      [parentClientId]
    );
    
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent client not found' });
    }
    
    const parentClient = parentResult.rows[0];
    
    // Create new location
    const locationResult = await pool.query(
      `INSERT INTO clients (
        client_name, email, phone, location_name, parent_client_id,
        is_primary_location, practice_address, practice_city,
        practice_state, practice_zip_code, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, $9, true, NOW())
      RETURNING id, client_name, location_name`,
      [
        parentClient.client_name,
        email || parentClient.email,
        phone,
        locationName,
        parentClientId,
        address,
        city,
        state,
        zipCode
      ]
    );
    
    const newLocation = locationResult.rows[0];
    
    console.log(`✅ Created location ID ${newLocation.id}: ${newLocation.location_name}`);
    
    res.json({
      success: true,
      message: `Additional location "${locationName}" created successfully`,
      location_id: newLocation.id,
      parent_client_id: parentClientId,
      location_name: locationName
    });
  } catch (error) {
    console.error('❌ Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

/**
 * GET /api/duplicates/client/:clientId/locations
 * Get all locations for a client
 */
router.get('/client/:clientId/locations', async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get the parent client ID (could be itself or its parent)
    const clientResult = await pool.query(
      'SELECT id, parent_client_id, is_primary_location FROM clients WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    const parentId = client.parent_client_id || client.id;
    
    // Get all locations (parent + children)
    const locationsResult = await pool.query(
      `SELECT 
        id, client_name, email, phone, location_name, 
        is_primary_location, practice_address, practice_city,
        practice_state, practice_zip_code, created_at
      FROM clients
      WHERE id = $1 OR parent_client_id = $1
      ORDER BY is_primary_location DESC, created_at ASC`,
      [parentId]
    );
    
    res.json({
      parent_client_id: parentId,
      locations: locationsResult.rows,
      total_locations: locationsResult.rows.length
    });
  } catch (error) {
    console.error('❌ Get client locations error:', error);
    res.status(500).json({ error: 'Failed to get locations' });
  }
});

export default router;

