# 🎨 Lead Assignment UI - Implementation Guide

## 📍 **WHERE TO ADD THE CODE**

The `Leads.tsx` file is 2900+ lines. Here's exactly where to add each component:

---

## 1️⃣ **Add "Assigned To" Filter (In Filters Section)**

**Location**: Find the filters section (around line 1200-1400) where you have:
- Status filter dropdown
- Source filter dropdown  
- Industry filter dropdown

**Add this AFTER the industry filter:**

```tsx
{/* Assigned To Filter */}
<div className="col-md-3">
  <label htmlFor="assignedToFilter" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
    <i className="fas fa-user-tag me-2" style={{ color: '#4682B4' }}></i>
    Assigned To
  </label>
  <select
    id="assignedToFilter"
    className="form-select"
    value={assignedToFilter}
    onChange={(e) => setAssignedToFilter(e.target.value)}
    style={{
      padding: '10px 14px',
      borderRadius: '8px',
      border: '2px solid #000000',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
  >
    <option value="all">All Leads</option>
    <option value="unassigned">🔴 Unassigned</option>
    <option value="assigned">🟢 Assigned</option>
    <optgroup label="─── Team Members ───">
      {teamMembers
        .filter(user => !user.client_id) // Only WeTechForU team members
        .map(user => (
          <option key={user.id} value={user.id.toString()}>
            👤 {user.username} ({user.role})
          </option>
        ))}
    </optgroup>
  </select>
</div>
```

---

## 2️⃣ **Add "Assigned To" Column Header (In Table)**

**Location**: Find the table header row (`<thead>`) where you have columns like:
- Checkbox
- ID
- Company
- Contact
- Email
- Phone
- Website
- Source
- Status
- Industry
- Created

**Add this column AFTER "Status" and BEFORE "Industry":**

```tsx
<th 
  style={{
    padding: '14px 12px',
    fontWeight: '700',
    fontSize: '13px',
    color: '#495057',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    minWidth: '180px'
  }}
>
  <i className="fas fa-user-tag me-2" style={{ color: '#4682B4' }}></i>
  Assigned To
</th>
```

---

## 3️⃣ **Add Assignment Dropdown (In Table Body)**

**Location**: Find where you map through `paginatedLeads` or similar to render each lead row.

Inside the `<tr>` for each lead, **add this cell AFTER the Status cell:**

```tsx
{/* Assignment Dropdown Cell */}
<td style={{ 
  padding: '12px', 
  borderBottom: '1px solid #dee2e6',
  verticalAlign: 'middle'
}}>
  <select
    value={lead.assigned_to || ''}
    onChange={(e) => {
      const newValue = e.target.value;
      handleAssignLead(
        lead.id, 
        newValue ? parseInt(newValue) : null
      );
    }}
    className="form-select form-select-sm"
    style={{
      padding: '6px 10px',
      fontSize: '13px',
      borderRadius: '6px',
      border: lead.assigned_to ? '2px solid #28a745' : '2px solid #dc3545',
      backgroundColor: lead.assigned_to ? '#d4edda' : '#f8d7da',
      color: lead.assigned_to ? '#155724' : '#721c24',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '160px',
      transition: 'all 0.2s ease'
    }}
    onClick={(e) => e.stopPropagation()} // Prevent row click if clickable
  >
    <option value="">❌ Unassigned</option>
    <optgroup label="─── Assign To ───">
      {teamMembers
        .filter(user => !user.client_id) // Only WeTechForU team members
        .map(user => (
          <option key={user.id} value={user.id}>
            {lead.assigned_to === user.id ? '✅ ' : '👤 '}
            {user.username}
          </option>
        ))}
    </optgroup>
  </select>
  
  {/* Show who assigned and when (tooltip or small text) */}
  {lead.assigned_to && lead.assigned_by_name && (
    <small 
      style={{ 
        display: 'block', 
        marginTop: '4px', 
        color: '#6c757d',
        fontSize: '11px',
        fontStyle: 'italic'
      }}
    >
      By {lead.assigned_by_name}
      {lead.assigned_at && ` • ${new Date(lead.assigned_at).toLocaleDateString()}`}
    </small>
  )}
</td>
```

---

## 4️⃣ **Update `fetchTeamMembers` to Filter Only WeTechForU Users**

**Location**: Find the `fetchTeamMembers` function (around line 138-146)

**Replace it with:**

```typescript
// Fetch team members for assignment dropdown (WeTechForU users only)
const fetchTeamMembers = async () => {
  try {
    const response = await http.get('/users');
    // Filter to only WeTechForU team members (no client_id)
    const wetechforuTeam = (response.data || []).filter(
      (user: User) => !user.client_id || user.role === 'super_admin'
    );
    setTeamMembers(wetechforuTeam);
  } catch (err) {
    console.error('Failed to fetch team members:', err);
  }
};
```

---

## 5️⃣ **Update the Bulk Assignment Prompt (Optional Enhancement)**

**Location**: Find `handleBulkAssign` function (around line 184-208)

**Replace the `prompt()` with a better modal:**

```typescript
// Bulk assign selected leads
const handleBulkAssign = async () => {
  if (selectedLeads.length === 0) {
    alert('Please select at least one lead');
    return;
  }

  // Create a modal or use a better UI (for now, enhanced prompt)
  const teamMembersList = teamMembers
    .filter(u => !u.client_id)
    .map(u => `${u.id}: ${u.username} (${u.role})`)
    .join('\n');
  
  const assignedToId = prompt(
    `Assign ${selectedLeads.length} leads to:\n\n${teamMembersList}\n\nEnter User ID:`
  );
  
  if (!assignedToId) return;

  try {
    await http.post('/lead-assignment/bulk-assign', {
      lead_ids: selectedLeads,
      assigned_to: parseInt(assignedToId),
      reason: 'bulk_assignment'
    });
    
    alert(`✅ Successfully assigned ${selectedLeads.length} leads`);
    setSelectedLeads([]);
    setSelectAll(false);
    await fetchData();
  } catch (err) {
    console.error('Failed to bulk assign leads:', err);
    alert('❌ Failed to assign leads. Please try again.');
  }
};
```

---

## 🎯 **VISUAL RESULT**

After adding these components, you'll see:

1. **Filter Section**:
   ```
   [Status ▼] [Source ▼] [Industry ▼] [Assigned To ▼]
   ```
   - Can filter by "All", "Unassigned", "Assigned", or specific team member

2. **Table Header**:
   ```
   | ☑ | ID | Company | Contact | Email | Phone | Website | Source | Status | 👤 Assigned To | Industry | Created |
   ```

3. **Each Lead Row**:
   ```
   | ☐ | 4 | Align Primary | John | john@... | ... | ... | Manual | New | [Dropdown: Select User ▼] | Healthcare | Oct 11 |
   ```
   - Dropdown shows:
     - "❌ Unassigned" (red)
     - "✅ John Doe" (green if assigned)
     - All WeTechForU team members

4. **Assignment Feedback**:
   - Dropdown changes color: 🟢 Green when assigned, 🔴 Red when unassigned
   - Shows "By {admin} • Oct 11, 2024" below dropdown

---

## 🔥 **TESTING STEPS**

1. **Refresh the page** after adding the code
2. **Try the "Assigned To" filter** - Filter by unassigned leads
3. **Assign a lead** - Use the dropdown on a lead row
4. **Verify filtering** - The lead should disappear/appear based on filter
5. **Test "My Leads"** - Click the green button, see only your leads
6. **Bulk assign** - Select multiple, use "Assign Selected"

---

## 📦 **FILES TO MODIFY**

Only **ONE file** needs changes:
- `frontend/src/pages/Leads.tsx`

Add the 3 snippets above in the correct locations!

---

**Once done, commit and deploy! The feature will be 100% complete! 🎉**

