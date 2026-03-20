-- Add tech_breakdown JSONB column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_breakdown JSONB;
