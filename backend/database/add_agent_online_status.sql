-- Add agent online status tracking
-- Date: 2025-10-27
-- Purpose: Track which agents are currently online and available for chat handoff

-- Add online status to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create agent sessions table for better tracking
CREATE TABLE IF NOT EXISTS agent_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE is_online = TRUE;

-- Function to auto-logout agents after 5 minutes of inactivity
CREATE OR REPLACE FUNCTION auto_logout_inactive_agents()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark users as offline if no heartbeat in 5 minutes
  UPDATE users
  SET is_online = FALSE
  WHERE is_online = TRUE
    AND last_heartbeat_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- End inactive sessions
  UPDATE agent_sessions
  SET is_active = FALSE, ended_at = CURRENT_TIMESTAMP
  WHERE is_active = TRUE
    AND last_heartbeat_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION auto_logout_inactive_agents() IS 'Automatically log out agents with no activity in 5 minutes';

