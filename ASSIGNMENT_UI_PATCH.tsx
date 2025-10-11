/* 
 * LEAD ASSIGNMENT UI - CODE TO ADD TO Leads.tsx
 * 
 * Add these 3 components to complete the lead assignment system
 */

// ============================================================================
// 1. ADD "ASSIGNED TO" FILTER (Add in the filters section, after industry filter)
// ============================================================================

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
        .filter(user => !user.client_id || user.role === 'super_admin')
        .map(user => (
          <option key={user.id} value={user.id.toString()}>
            👤 {user.username} ({user.role})
          </option>
        ))}
    </optgroup>
  </select>
</div>

// ============================================================================
// 2. ADD "ASSIGNED TO" COLUMN HEADER (Add in <thead>, after Status column)
// ============================================================================

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
    minWidth: '200px',
    position: 'sticky',
    top: 0,
    zIndex: 10
  }}
>
  <i className="fas fa-user-tag me-2" style={{ color: '#4682B4' }}></i>
  Assigned To
</th>

// ============================================================================
// 3. ADD ASSIGNMENT DROPDOWN CELL (Add in <tbody>, after Status cell in each row)
// ============================================================================

<td 
  style={{ 
    padding: '12px', 
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'middle',
    minWidth: '200px'
  }}
>
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
      padding: '8px 12px',
      fontSize: '13px',
      borderRadius: '6px',
      border: lead.assigned_to ? '2px solid #28a745' : '2px solid #dc3545',
      backgroundColor: lead.assigned_to ? '#d4edda' : '#fff5f5',
      color: lead.assigned_to ? '#155724' : '#721c24',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '180px',
      transition: 'all 0.2s ease',
      backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\'%3e%3cpath fill=\'none\' stroke=\'%23343a40\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M2 5l6 6 6-6\'/%3e%3c/svg%3e")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.75rem center',
      backgroundSize: '16px 12px',
      paddingRight: '2.5rem'
    }}
    onClick={(e) => e.stopPropagation()}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(70, 130, 180, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <option value="" style={{ backgroundColor: '#fff', color: '#721c24' }}>
      ❌ Unassigned
    </option>
    <optgroup label="─────  Assign To  ─────">
      {teamMembers
        .filter(user => !user.client_id || user.role === 'super_admin')
        .map(user => (
          <option 
            key={user.id} 
            value={user.id}
            style={{ backgroundColor: '#fff', color: '#155724' }}
          >
            {lead.assigned_to === user.id ? '✅ ' : '👤 '}
            {user.username} ({user.role})
          </option>
        ))}
    </optgroup>
  </select>
  
  {/* Show assignment metadata */}
  {lead.assigned_to && (lead.assigned_by_name || lead.assigned_at) && (
    <div 
      style={{ 
        display: 'flex',
        alignItems: 'center',
        marginTop: '6px', 
        padding: '4px 8px',
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#0d6efd',
        fontStyle: 'italic'
      }}
    >
      <i className="fas fa-info-circle me-1" style={{ fontSize: '10px' }}></i>
      {lead.assigned_by_name && (
        <span>By <strong>{lead.assigned_by_name}</strong></span>
      )}
      {lead.assigned_at && (
        <span className="ms-1">
          • {new Date(lead.assigned_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      )}
    </div>
  )}
</td>

// ============================================================================
// DONE! Deploy and test:
// 1. Add filter dropdown → Filter by assigned/unassigned/team member
// 2. Add table header column → "Assigned To" visible
// 3. Add table cell dropdown → Assign leads directly from the table
// ============================================================================

