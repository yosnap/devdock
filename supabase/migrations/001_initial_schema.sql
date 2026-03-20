-- DevDock Supabase Schema — Migration 001
-- Tables: profiles, workspaces, projects, project_tags, project_links, project_note_items
-- RLS: every table scoped to auth.uid()

-- ============================================================
-- Helper: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- profiles (mirrors auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  avatar_url    TEXT,
  github_username TEXT,
  push_token    TEXT,   -- Expo push notification token
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own profile" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url, github_username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- workspaces
-- ============================================================

CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#1677ff',
  icon        TEXT NOT NULL DEFAULT 'FolderOutlined',
  avatar      TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ,  -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workspaces" ON workspaces
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- projects
-- ============================================================
-- NOTE: no `path`, no `default_ide_id` — desktop-only fields not synced

CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  stack           TEXT,
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  is_favorite     BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  health_score    INTEGER NOT NULL DEFAULT -1,
  github_owner    TEXT,
  github_repo     TEXT,
  avatar          TEXT,
  last_opened_at  TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,  -- soft delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own projects" ON projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- project_tags
-- ============================================================

CREATE TABLE IF NOT EXISTS project_tags (
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  PRIMARY KEY (project_id, tag)
);

CREATE INDEX idx_project_tags_project_id ON project_tags(project_id);

ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own project tags" ON project_tags
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- project_links
-- ============================================================

CREATE TABLE IF NOT EXISTS project_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  deleted_at  TIMESTAMPTZ,  -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_links_project_id ON project_links(project_id);

ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own project links" ON project_links
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ============================================================
-- project_note_items
-- ============================================================

CREATE TABLE IF NOT EXISTS project_note_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  content              TEXT NOT NULL DEFAULT '',
  note_type            TEXT NOT NULL DEFAULT 'note',
  github_issue_url     TEXT,
  github_issue_number  INTEGER,
  is_resolved          BOOLEAN NOT NULL DEFAULT false,
  deleted_at           TIMESTAMPTZ,  -- soft delete
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_note_items_project_id ON project_note_items(project_id);

ALTER TABLE project_note_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own note items" ON project_note_items
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE TRIGGER note_items_updated_at
  BEFORE UPDATE ON project_note_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
