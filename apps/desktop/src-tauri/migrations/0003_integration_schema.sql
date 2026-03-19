-- Phase 3: GitHub integration, health scoring, quick launch

-- Health score configuration (single row, id='default')
CREATE TABLE IF NOT EXISTS health_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  weight_deps_outdated INTEGER NOT NULL DEFAULT 5,
  weight_vulnerability INTEGER NOT NULL DEFAULT 15,
  weight_ci_failing INTEGER NOT NULL DEFAULT 20,
  weight_stale_30d INTEGER NOT NULL DEFAULT 10,
  weight_stale_90d INTEGER NOT NULL DEFAULT 20,
  weight_uncommitted INTEGER NOT NULL DEFAULT 10,
  weight_no_remote INTEGER NOT NULL DEFAULT 5,
  attention_threshold INTEGER NOT NULL DEFAULT 50
);

INSERT OR IGNORE INTO health_config (id) VALUES ('default');

-- GitHub API response cache (5-minute TTL enforced in app)
CREATE TABLE IF NOT EXISTS github_cache (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,  -- 'actions' | 'issues'
  data TEXT NOT NULL,        -- JSON response body
  cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, cache_key)
);

-- Extend projects table with GitHub metadata + health score
ALTER TABLE projects ADD COLUMN health_score INTEGER NOT NULL DEFAULT -1;
ALTER TABLE projects ADD COLUMN github_owner TEXT;
ALTER TABLE projects ADD COLUMN github_repo TEXT;
