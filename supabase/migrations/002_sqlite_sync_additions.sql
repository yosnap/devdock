-- DevDock SQLite Migration 0006 — Sync support
-- Run via sqlx migrate in Rust on app startup

-- Add sync columns to existing tables
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS synced_at TEXT;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS synced_at TEXT;

ALTER TABLE project_note_items ADD COLUMN IF NOT EXISTS synced_at TEXT;
ALTER TABLE project_links ADD COLUMN IF NOT EXISTS synced_at TEXT;
ALTER TABLE project_tags ADD COLUMN IF NOT EXISTS synced_at TEXT;

-- Sync queue: offline changes waiting to push to Supabase
CREATE TABLE IF NOT EXISTS sync_queue (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  operation    TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  payload      TEXT,  -- JSON of changed fields
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retry_count  INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT
);

-- Track last successful sync timestamp per table
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name     TEXT PRIMARY KEY,
  last_synced_at TEXT
);
