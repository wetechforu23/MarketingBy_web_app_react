-- Create lead_tasks table for tracking sales pitches and work items
CREATE TABLE IF NOT EXISTS lead_tasks (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL, -- 'sales_pitch', 'work_item', 'follow_up', 'technical'
  category VARCHAR(100) NOT NULL, -- 'seo', 'social_media', 'content', 'technical', 'backlinks', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  sales_pitch TEXT, -- What to tell the customer (for sales)
  technical_details TEXT, -- How to implement (for work)
  estimated_hours DECIMAL(5,2),
  estimated_cost DECIMAL(10,2),
  actual_hours DECIMAL(5,2),
  actual_cost DECIMAL(10,2),
  assigned_to VARCHAR(255),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_type ON lead_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_priority ON lead_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due_date ON lead_tasks(due_date);

-- Comments
COMMENT ON TABLE lead_tasks IS 'Tasks and action items for each lead - both sales pitches and actual work items';
COMMENT ON COLUMN lead_tasks.task_type IS 'Type: sales_pitch (what to tell customer), work_item (what to do), follow_up, technical';
COMMENT ON COLUMN lead_tasks.sales_pitch IS 'The pitch to tell the customer about this issue/opportunity';
COMMENT ON COLUMN lead_tasks.technical_details IS 'How to actually implement/fix this (for our team)';
COMMENT ON COLUMN lead_tasks.estimated_cost IS 'Estimated cost to quote customer';
COMMENT ON COLUMN lead_tasks.actual_cost IS 'Actual cost if it becomes a project';

