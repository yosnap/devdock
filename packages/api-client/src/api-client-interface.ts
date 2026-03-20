// Abstract contract for all platform data operations
// Implementations: TauriApiClient (desktop), HttpApiClient (web/mobile)

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

export interface IApiClient {
  // Projects
  listProjects(): Promise<Project[]>;
  addProject(payload: CreateProjectPayload): Promise<Project>;
  updateProject(payload: UpdateProjectPayload): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Workspaces
  listWorkspaces(): Promise<Workspace[]>;
  createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace>;
  updateWorkspace(payload: UpdateWorkspacePayload): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;

  // Note items
  listNoteItems(projectId: string): Promise<NoteItem[]>;
  createNoteItem(payload: CreateNotePayload): Promise<NoteItem>;
  updateNoteItem(payload: UpdateNotePayload): Promise<NoteItem>;
  toggleNoteResolved(id: string): Promise<NoteItem>;
  deleteNoteItem(id: string): Promise<void>;

  // Links
  getLinks(projectId: string): Promise<ProjectLink[]>;
  upsertLink(payload: UpsertLinkPayload): Promise<ProjectLink>;
  deleteLink(id: string): Promise<void>;

  // Health summary (read-only for web/mobile)
  getProjectsNeedingAttention(): Promise<ProjectSummary[]>;
}
