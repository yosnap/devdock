-- Migration 0006: sync support
-- Adds user_id + synced_at to syncable tables, creates sync_queue and sync_metadata

ALTER TABLE projects ADD COLUMN user_id TEXT;
ALTER TABLE projects ADD COLUMN synced_at TEXT;

ALTER TABLE workspaces ADD COLUMN user_id TEXT;
ALTER TABLE workspaces ADD COLUMN synced_at TEXT;

ALTER TABLE project_note_items ADD COLUMN synced_at TEXT;
ALTER TABLE project_links ADD COLUMN synced_at TEXT;
ALTER TABLE project_tags ADD COLUMN synced_at TEXT;

-- Offline change queue: every CRUD operation enqueues here
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,   -- 'INSERT' | 'UPDATE' | 'DELETE'
    payload TEXT,              -- JSON of changed fields
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- Track last successful sync timestamp per table
CREATE TABLE IF NOT EXISTS sync_metadata (
    table_name TEXT PRIMARY KEY,
    last_synced_at TEXT
);
