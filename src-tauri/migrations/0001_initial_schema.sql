-- DevDock initial schema
-- Workspaces: logical grouping of projects
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#1677ff',
  icon TEXT DEFAULT 'FolderOutlined',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- IDE configurations
CREATE TABLE IF NOT EXISTS ide_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args TEXT DEFAULT '{path}',
  icon TEXT,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Projects: the core entity
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  description TEXT,
  stack TEXT,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  default_ide_id TEXT REFERENCES ide_configs(id) ON DELETE SET NULL,
  is_favorite INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  last_opened_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Project tags
CREATE TABLE IF NOT EXISTS project_tags (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (project_id, tag)
);

-- Seed default IDE configs
INSERT OR IGNORE INTO ide_configs (id, name, command, args, icon, is_default, sort_order) VALUES
  ('vscode', 'VS Code', 'code', '{path}', 'vscode', 1, 0),
  ('cursor', 'Cursor', 'cursor', '{path}', 'cursor', 0, 1),
  ('zed', 'Zed', 'zed', '{path}', 'zed', 0, 2),
  ('sublime', 'Sublime Text', 'subl', '{path}', 'sublime', 0, 3),
  ('idea', 'IntelliJ IDEA', 'idea', '{path}', 'idea', 0, 4),
  ('webstorm', 'WebStorm', 'webstorm', '{path}', 'webstorm', 0, 5);
