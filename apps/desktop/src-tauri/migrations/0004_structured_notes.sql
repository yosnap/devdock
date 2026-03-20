-- Phase 5: Structured notes system
-- Replace single free-text note per project with multiple typed notes

-- New structured notes table
CREATE TABLE IF NOT EXISTS project_note_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  note_type TEXT NOT NULL DEFAULT 'note',  -- 'bug' | 'idea' | 'task' | 'reminder' | 'note'
  github_issue_url TEXT,                   -- set after creating GitHub issue
  github_issue_number INTEGER,
  is_resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User appearance preferences (theme, etc.)
CREATE TABLE IF NOT EXISTS app_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_preferences (key, value) VALUES ('theme', 'light');
