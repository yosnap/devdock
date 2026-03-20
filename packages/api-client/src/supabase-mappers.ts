// Mappers between Supabase row shapes and app domain types
// Supabase uses: UUID ids, TIMESTAMPTZ strings, BOOLEAN, snake_case
// App types use: same — but health_score default -1 and tags joined separately

import type {
  NoteItem,
  NoteType,
  Project,
  ProjectLink,
  ProjectSummary,
  Workspace,
} from '@devdock/types';

// ---- Supabase row types (what PostgREST returns) ----

export interface SupabaseProject {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  stack: string | null;
  workspace_id: string | null;
  is_favorite: boolean;
  status: string;
  health_score: number;
  github_owner: string | null;
  github_repo: string | null;
  avatar: string | null;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
  project_tags?: Array<{ tag: string }>;
}

export interface SupabaseWorkspace {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  avatar: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseNoteItem {
  id: string;
  project_id: string;
  title: string;
  content: string;
  note_type: string;
  github_issue_url: string | null;
  github_issue_number: number | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProjectLink {
  id: string;
  project_id: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

// ---- Mapper functions ----

export function mapProject(row: SupabaseProject): Project {
  return {
    id: row.id,
    name: row.name,
    path: '',  // not synced — web/mobile don't use filesystem paths
    description: row.description ?? undefined,
    stack: row.stack ?? undefined,
    workspace_id: row.workspace_id ?? undefined,
    default_ide_id: undefined,  // desktop-only
    is_favorite: row.is_favorite,
    status: row.status as Project['status'],
    last_opened_at: row.last_opened_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: row.project_tags?.map((t) => t.tag) ?? [],
    avatar: row.avatar ?? undefined,
    health_score: row.health_score,
    github_owner: row.github_owner ?? undefined,
    github_repo: row.github_repo ?? undefined,
  };
}

export function mapWorkspace(row: SupabaseWorkspace): Workspace {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    avatar: row.avatar ?? undefined,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export function mapNoteItem(row: SupabaseNoteItem): NoteItem {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    content: row.content,
    note_type: row.note_type as NoteType,
    github_issue_url: row.github_issue_url ?? undefined,
    github_issue_number: row.github_issue_number ?? undefined,
    is_resolved: row.is_resolved,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapProjectLink(row: SupabaseProjectLink): ProjectLink {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    url: row.url,
    icon: row.icon ?? undefined,
    sort_order: row.sort_order,
  };
}

export function mapProjectSummary(row: SupabaseProject): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    path: '',
    stack: row.stack ?? undefined,
    health_score: row.health_score,
    status: row.status,
  };
}
