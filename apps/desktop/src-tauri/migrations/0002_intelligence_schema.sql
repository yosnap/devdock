-- Phase 2: Intelligence tables

-- Markdown notes per project
CREATE TABLE IF NOT EXISTS project_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Quick links per project
CREATE TABLE IF NOT EXISTS project_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Dependency tracking per project
CREATE TABLE IF NOT EXISTS project_deps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_version TEXT,
  latest_version TEXT,
  dep_type TEXT,          -- dependencies, devDependencies, [dependencies], etc.
  ecosystem TEXT NOT NULL, -- npm, cargo, pip, go
  is_outdated INTEGER DEFAULT 0,
  has_vulnerability INTEGER DEFAULT 0,
  last_checked_at TEXT,
  UNIQUE(project_id, name, ecosystem)
);

-- Git status cache per project
CREATE TABLE IF NOT EXISTS project_git_status (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  branch TEXT,
  uncommitted_count INTEGER DEFAULT 0,
  ahead INTEGER DEFAULT 0,
  behind INTEGER DEFAULT 0,
  last_commit_msg TEXT,
  last_commit_author TEXT,
  last_commit_date TEXT,
  remote_url TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
