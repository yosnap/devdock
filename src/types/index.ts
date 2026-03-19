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
  avatar?: string;
  // Phase 3 fields
  health_score: number;      // -1 = not scored yet
  github_owner?: string;
  github_repo?: string;
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
  avatar?: string;
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

// Phase 2: Git, Deps, Notes, Links types

export interface GitInfo {
  branch?: string;
  uncommitted_count: number;
  ahead: number;
  behind: number;
  last_commit_msg?: string;
  last_commit_author?: string;
  last_commit_date?: string;
  remote_url?: string;
  is_git_repo: boolean;
}

export interface GitStatus {
  project_id: string;
  branch?: string;
  uncommitted_count: number;
  ahead: number;
  behind: number;
  last_commit_msg?: string;
  last_commit_author?: string;
  last_commit_date?: string;
  remote_url?: string;
  updated_at: string;
}

export interface Dependency {
  id: string;
  project_id: string;
  name: string;
  current_version?: string;
  latest_version?: string;
  dep_type?: string;
  ecosystem: string;
  is_outdated: boolean;
  has_vulnerability: boolean;
  last_checked_at?: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  content: string;
  updated_at: string;
}

export interface ProjectLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  icon?: string;
  sort_order: number;
}

export interface UpsertLinkPayload {
  id?: string;
  project_id: string;
  title: string;
  url: string;
  icon?: string;
}

// Phase 3: GitHub, Health, Quick Launch types

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string;
  html_url: string;
  created_at: string;
}

export interface CiStatus {
  overall: 'success' | 'failure' | 'running' | 'unknown';
  runs: WorkflowRun[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user_login: string;
  created_at: string;
  labels: string[];
}

export interface HealthConfig {
  weight_deps_outdated: number;
  weight_vulnerability: number;
  weight_ci_failing: number;
  weight_stale_30d: number;
  weight_stale_90d: number;
  weight_uncommitted: number;
  weight_no_remote: number;
  attention_threshold: number;
}

export interface HealthInput {
  outdated_deps_count: number;
  vulnerable_deps_count: number;
  ci_failing: boolean;
  days_since_commit?: number;
  uncommitted_changes: number;
  has_remote: boolean;
}

export interface HealthPenalty {
  reason: string;
  points: number;
}

export interface HealthResult {
  score: number;
  penalties: HealthPenalty[];
}

export interface QuickLaunchItem {
  id: string;
  name: string;
  path: string;
  stack?: string;
  score: number;
}

// Phase 5: Structured notes + Theme

export type NoteType = 'bug' | 'idea' | 'task' | 'reminder' | 'note';

export interface NoteItem {
  id: string;
  project_id: string;
  title: string;
  content: string;
  note_type: NoteType;
  github_issue_url?: string;
  github_issue_number?: number;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotePayload {
  project_id: string;
  title: string;
  content: string;
  note_type: NoteType;
}

export interface UpdateNotePayload {
  id: string;
  title: string;
  content: string;
  note_type: NoteType;
}

export type AppTheme = 'light' | 'dark' | 'auto';

export interface TechBreakdown {
  language?: string;
  frameworks: string[];
  databases: string[];
  orms: string[];
  testing: string[];
  devops: string[];
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
