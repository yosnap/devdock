// Desktop implementation of IApiClient — wraps Tauri invoke() calls
// Only import from @tauri-apps/api/core here; nowhere else in shared packages

import { invoke } from '@tauri-apps/api/core';
import type {
  NoteItem,
  Project,
  ProjectLink,
  ProjectSummary,
  Workspace,
} from '@devdock/types';
import type {
  CreateNotePayload,
  CreateProjectPayload,
  CreateWorkspacePayload,
  UpdateNotePayload,
  UpdateProjectPayload,
  UpdateWorkspacePayload,
  UpsertLinkPayload,
} from '@devdock/types';
import type { IApiClient } from './api-client-interface';

export class TauriApiClient implements IApiClient {
  // --- Projects ---

  listProjects(): Promise<Project[]> {
    return invoke<Project[]>('list_projects');
  }

  addProject(payload: CreateProjectPayload): Promise<Project> {
    return invoke<Project>('add_project', { payload });
  }

  updateProject(payload: UpdateProjectPayload): Promise<Project> {
    return invoke<Project>('update_project', { payload });
  }

  deleteProject(id: string): Promise<void> {
    return invoke<void>('delete_project', { id });
  }

  // --- Workspaces ---

  listWorkspaces(): Promise<Workspace[]> {
    return invoke<Workspace[]>('list_workspaces');
  }

  createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    return invoke<Workspace>('create_workspace', { payload });
  }

  updateWorkspace(payload: UpdateWorkspacePayload): Promise<Workspace> {
    return invoke<Workspace>('update_workspace', { payload });
  }

  deleteWorkspace(id: string): Promise<void> {
    return invoke<void>('delete_workspace', { id });
  }

  // --- Note items ---

  listNoteItems(projectId: string): Promise<NoteItem[]> {
    return invoke<NoteItem[]>('list_note_items', { projectId });
  }

  createNoteItem(payload: CreateNotePayload): Promise<NoteItem> {
    return invoke<NoteItem>('create_note_item', { payload });
  }

  updateNoteItem(payload: UpdateNotePayload): Promise<NoteItem> {
    return invoke<NoteItem>('update_note_item', { payload });
  }

  toggleNoteResolved(id: string): Promise<NoteItem> {
    return invoke<NoteItem>('toggle_note_resolved', { id });
  }

  deleteNoteItem(id: string): Promise<void> {
    return invoke<void>('delete_note_item', { id });
  }

  // --- Links ---

  getLinks(projectId: string): Promise<ProjectLink[]> {
    return invoke<ProjectLink[]>('get_links', { projectId });
  }

  upsertLink(payload: UpsertLinkPayload): Promise<ProjectLink> {
    return invoke<ProjectLink>('upsert_link', { payload });
  }

  deleteLink(id: string): Promise<void> {
    return invoke<void>('delete_link', { id });
  }

  // --- Health ---

  getProjectsNeedingAttention(): Promise<ProjectSummary[]> {
    return invoke<ProjectSummary[]>('get_projects_needing_attention');
  }
}
