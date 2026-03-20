// Mutation payloads — used by IApiClient implementations on all platforms

import type { NoteType, ProjectStatus } from './models';

export interface CreateProjectPayload {
  name: string;
  path: string; // desktop: required; web/mobile: empty string
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

export interface UpsertLinkPayload {
  id?: string;
  project_id: string;
  title: string;
  url: string;
  icon?: string;
}

// Desktop-only payloads

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
