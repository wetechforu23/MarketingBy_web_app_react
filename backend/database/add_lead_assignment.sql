-- Add lead assignment tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_by ON leads(assigned_by);

-- Create lead_assignment_history table to track all assignments
CREATE TABLE IF NOT EXISTS lead_assignment_history (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id),
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  unassigned_at TIMESTAMP,
  notes TEXT,
  reason VARCHAR(255) -- 'new_lead', 'reassignment', 'workload_balance', 'specialty_match', etc.
);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_lead_id ON lead_assignment_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignment_history_assigned_to ON lead_assignment_history(assigned_to);

-- Comments
COMMENT ON COLUMN leads.assigned_to IS 'User ID of team member assigned to this lead';
COMMENT ON COLUMN leads.assigned_at IS 'When the lead was assigned';
COMMENT ON COLUMN leads.assigned_by IS 'User ID who made the assignment (usually super_admin or admin)';
COMMENT ON COLUMN leads.assignment_notes IS 'Notes about why this lead was assigned to this person';

COMMENT ON TABLE lead_assignment_history IS 'Complete history of all lead assignments and reassignments';
COMMENT ON COLUMN lead_assignment_history.reason IS 'Why this assignment was made: new_lead, reassignment, workload_balance, specialty_match, etc.';

