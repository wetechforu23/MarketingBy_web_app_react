# 🔍 Duplicate Management System - Complete Guide

## Overview
Comprehensive system to detect and handle duplicate leads/clients with same email address. Supports multi-location businesses and prevents accidental duplicates.

## ✅ What's Implemented

### 1. Database Schema (`add_duplicate_management.sql`)
- ✅ **Multi-location support** for clients via `parent_client_id`
- ✅ **Duplicate tracking** for leads
- ✅ **Duplicate detection log** table
- ✅ **Helper functions** to find duplicates
- ✅ **Smart creation functions** for locations

**New Columns:**
```sql
-- Clients Table:
- parent_client_id (links locations to main client)
- location_name (e.g., "Downtown Office", "North Branch")
- is_primary_location (true for main location)

-- Leads Table:
- duplicate_of_lead_id (marks as duplicate of existing)
- duplicate_checked_at (when duplicate check ran)
- duplicate_resolution ('merged', 'separate', 'ignored', 'pending')
```

### 2. Backend API (`/backend/src/routes/duplicateManagement.ts`)

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/duplicates/check-lead` | POST | Check if lead email already exists |
| `/api/duplicates/check-client` | POST | Check if client email already exists |
| `/api/duplicates/resolve-lead` | POST | Resolve duplicate (merge or separate) |
| `/api/duplicates/create-location` | POST | Create additional location for client |
| `/api/duplicates/client/:id/locations` | GET | Get all locations for a client |

### 3. Frontend Component (`DuplicateDetectionModal.tsx`)

**Features:**
- ✅ Shows all existing duplicates
- ✅ Visual comparison (new vs existing)
- ✅ Three resolution options:
  1. **Add as Additional Location** (for clients with multiple offices)
  2. **Create as Separate Entity** (allow duplicate)
  3. **Skip / Use Existing** (merge with existing)
- ✅ Requires user confirmation
- ✅ Visual indicators for match fields

---

## 📋 Integration Steps

### Step 1: Run Database Migration

```bash
# Connect to Heroku Postgres
heroku pg:psql -a marketingby-wetechforu

# Run the migration
\i backend/database/add_duplicate_management.sql
```

Or copy/paste the SQL from the file directly.

### Step 2: Test API Endpoints

```javascript
// Check for lead duplicates
fetch('/api/duplicates/check-lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    phone: '555-1234',
    excludeLeadId: null
  })
})
.then(r => r.json())
.then(d => console.log('Duplicates:', d))

// Expected response:
{
  has_duplicates: true,
  duplicates: [
    {
      id: 129,
      company: "Wetechforu",
      email: "info@wetechforu.com",
      status: "converted",
      match_field: "email",
      ...
    }
  ],
  count: 1
}
```

### Step 3: Integrate into Lead Creation Flow

**In `Leads.tsx` (or wherever you create leads):**

```typescript
import { useState } from 'react';
import DuplicateDetectionModal from '../components/DuplicateDetectionModal';
import { api } from '../api/http';

const [showDuplicateModal, setShowDuplicateModal] = useState(false);
const [duplicates, setDuplicates] = useState([]);
const [pendingLeadData, setPendingLeadData] = useState(null);

// BEFORE creating lead, check for duplicates
const handleCreateLead = async (leadData) => {
  try {
    // 1. Check for duplicates first
    const duplicateCheck = await api.post('/duplicates/check-lead', {
      email: leadData.email,
      phone: leadData.phone
    });
    
    if (duplicateCheck.data.has_duplicates) {
      // 2. Show modal if duplicates found
      setDuplicates(duplicateCheck.data.duplicates);
      setPendingLeadData(leadData);
      setShowDuplicateModal(true);
      return; // Wait for user decision
    }
    
    // 3. No duplicates - create normally
    await createLeadNormally(leadData);
    
  } catch (error) {
    console.error('Error:', error);
  }
};

// Handle user's duplicate resolution choice
const handleDuplicateResolution = async (action, duplicateId, locationName) => {
  try {
    if (action === 'separate') {
      // User chose to create as separate entity
      await api.post('/duplicates/resolve-lead', {
        leadId: null, // Will be set after creation
        duplicateLeadId: duplicateId,
        action: 'separate',
        email: pendingLeadData.email
      });
      
      // Now create the lead
      await createLeadNormally(pendingLeadData);
      
    } else if (action === 'merge') {
      // User chose to skip - use existing lead
      alert(`Using existing lead #${duplicateId}`);
      // Optionally navigate to that lead
      navigate(`/app/leads/${duplicateId}`);
      
    }
    
    setShowDuplicateModal(false);
    setPendingLeadData(null);
    setDuplicates([]);
    
  } catch (error) {
    console.error('Resolution error:', error);
  }
};

// In JSX:
<DuplicateDetectionModal
  isOpen={showDuplicateModal}
  onClose={() => setShowDuplicateModal(false)}
  entityType="lead"
  duplicates={duplicates}
  newEntityData={pendingLeadData || {}}
  onResolve={handleDuplicateResolution}
/>
```

### Step 4: Integrate into Client Creation/Conversion

**In lead conversion flow:**

```typescript
const handleConvertToClient = async (leadId, leadData) => {
  try {
    // 1. Check for duplicate clients
    const duplicateCheck = await api.post('/duplicates/check-client', {
      email: leadData.email,
      phone: leadData.phone
    });
    
    if (duplicateCheck.data.has_duplicates) {
      // 2. Show modal with location option
      setDuplicates(duplicateCheck.data.duplicates);
      setPendingConversion({ leadId, leadData });
      setShowDuplicateModal(true);
      return;
    }
    
    // 3. No duplicates - convert normally
    await api.post('/leads/convert-to-client', { leadId });
    
  } catch (error) {
    console.error('Conversion error:', error);
  }
};

// Handle duplicate resolution for client
const handleClientDuplicateResolution = async (action, parentClientId, locationName) => {
  try {
    if (action === 'location') {
      // Create as additional location
      const locationResult = await api.post('/duplicates/create-location', {
        parentClientId,
        locationName,
        address: pendingConversion.leadData.address,
        city: pendingConversion.leadData.city,
        state: pendingConversion.leadData.state,
        zipCode: pendingConversion.leadData.zip_code,
        phone: pendingConversion.leadData.phone,
        email: pendingConversion.leadData.email
      });
      
      // Update lead to mark as converted to this location
      await api.put(`/leads/${pendingConversion.leadId}`, {
        ...pendingConversion.leadData,
        status: 'converted',
        converted_to_client_id: locationResult.data.location_id
      });
      
      alert(`✅ Created additional location: ${locationName}`);
      
    } else if (action === 'separate') {
      // Create separate client (allow duplicate)
      await api.post('/leads/convert-to-client', {
        leadId: pendingConversion.leadId
      });
      
    } else if (action === 'merge') {
      // Use existing client
      await api.put(`/leads/${pendingConversion.leadId}`, {
        ...pendingConversion.leadData,
        status: 'converted',
        converted_to_client_id: parentClientId
      });
    }
    
    setShowDuplicateModal(false);
    setPendingConversion(null);
    
  } catch (error) {
    console.error('Resolution error:', error);
  }
};
```

---

## 🎯 Use Cases

### Use Case 1: Same Company, Multiple Locations
**Scenario:** ProMed Healthcare has 3 offices

**Solution:**
1. Create first location normally → Client #1 (is_primary_location = true)
2. Try to create second location with same email
3. Modal appears → Choose "Add as Additional Location"
4. Enter location name: "Downtown Office"
5. New client #2 created with parent_client_id = 1

**Result:**
```
Client #1 (Primary): ProMed Healthcare
  ├─ Location: Main Office (original)
  ├─ Client #2: ProMed Healthcare - Downtown Office
  └─ Client #3: ProMed Healthcare - North Branch
```

### Use Case 2: Same Person, Different Companies
**Scenario:** John Doe (john@email.com) is contact for two separate companies

**Solution:**
1. Create Lead #1: Company A, john@email.com
2. Try to create Lead #2: Company B, john@email.com
3. Modal appears → Choose "Create as Separate Entity"
4. Both leads exist independently

### Use Case 3: Accidental Duplicate
**Scenario:** User tries to re-enter same lead

**Solution:**
1. Try to create lead with existing email
2. Modal shows existing lead details
3. User chooses "Skip / Use Existing"
4. No duplicate created, redirected to existing lead

---

## 📊 Database Queries for Monitoring

### Find all multi-location clients:
```sql
SELECT 
  p.id as parent_id,
  p.client_name,
  p.email,
  COUNT(c.id) + 1 as total_locations,
  STRING_AGG(c.location_name, ', ') as location_names
FROM clients p
LEFT JOIN clients c ON c.parent_client_id = p.id
WHERE p.is_primary_location = true
GROUP BY p.id, p.client_name, p.email
HAVING COUNT(c.id) > 0
ORDER BY total_locations DESC;
```

### Find all duplicate resolution history:
```sql
SELECT 
  dd.*,
  u.username as resolved_by_name
FROM duplicate_detections dd
LEFT JOIN users u ON dd.resolved_by = u.id
ORDER BY dd.detected_at DESC
LIMIT 50;
```

### Find leads pending duplicate resolution:
```sql
SELECT *
FROM leads
WHERE duplicate_resolution = 'pending'
  OR (duplicate_checked_at IS NULL AND status = 'new')
ORDER BY created_at DESC;
```

---

## 🚀 Deployment Checklist

- [ ] Run database migration on production
- [ ] Deploy backend with new routes
- [ ] Deploy frontend with modal component
- [ ] Integrate into Leads page
- [ ] Integrate into lead conversion flow
- [ ] Test all three resolution options
- [ ] Update user documentation
- [ ] Train team on new workflow

---

## 🔧 Future Enhancements

1. **Fuzzy Matching**: Detect similar (not just exact) emails/names
2. **Automatic Suggestions**: AI-powered duplicate detection
3. **Bulk Resolution**: Handle multiple duplicates at once
4. **Merge History**: Track what was merged and allow undo
5. **Phone Number Matching**: Better phone duplicate detection
6. **Website Matching**: Check for same domain

---

## 📝 Notes

- The `parent_client_id` approach keeps each location as a separate client entity
- This allows different users, permissions, and data for each location
- All locations share the same email but have different addresses
- The duplicate_detections table logs all resolution decisions for audit trail

---

**Status:** ✅ Backend complete, frontend component ready, integration needed in Leads.tsx

