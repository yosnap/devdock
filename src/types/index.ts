// Core domain types mirroring the Rust models

export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  stack?: string;
  workspace_id?: string;
  default_ide_id?: string;
  is_favorite: boolean;
  status: ProjectStatus;
  last_opened_at?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface IdeConfig {
  id: string;
  name: string;
  command: string;
  args: string;
  icon?: string;
  is_default: boolean;
  sort_order: number;
}

export interface Workspace {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  sort_order: number;
  created_at: string;
}

// Payloads for mutations
export interface CreateProjectPayload {
  name: string;
  path: string;
  description?: string;
  stack?: string;
  workspace_id?: string;
  default_ide_id?: string;
  tags?: string[];
}

export interface UpdateProjectPayload {
  id: string;
  name?: string;
  description?: string;
  stack?: string;
  workspace_id?: string;
  default_ide_id?: string;
  is_favorite?: boolean;
  status?: ProjectStatus;
  tags?: string[];
}

export interface CreateIdePayload {
  name: string;
  command: string;
  args?: string;
  icon?: string;
  is_default?: boolean;
}

export interface UpdateIdePayload {
  id: string;
  name?: string;
  command?: string;
  args?: string;
  icon?: string;
  is_default?: boolean;
  sort_order?: number;
}

export interface CreateWorkspacePayload {
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateWorkspacePayload {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

// UI state types
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'last_opened_at' | 'created_at';

export interface ProjectFilters {
  search: string;
  workspace_id?: string;
  status?: ProjectStatus;
  stack?: string;
  tag?: string;
}
