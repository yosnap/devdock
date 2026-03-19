-- Phase 6: Avatar images for projects and workspaces
-- Stores the filename (not full path) of the avatar image saved in the app data dir.
-- Full path is resolved at runtime: {app_data}/avatars/{avatar_filename}

ALTER TABLE projects   ADD COLUMN avatar TEXT;
ALTER TABLE workspaces ADD COLUMN avatar TEXT;
