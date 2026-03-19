import { invoke } from '@tauri-apps/api/core';
import type {
  CreateIdePayload,
  CreateProjectPayload,
  CreateWorkspacePayload,
  IdeConfig,
  Project,
  UpdateIdePayload,
  UpdateProjectPayload,
  UpdateWorkspacePayload,
  Workspace,
} from '../types';

// --- Project commands ---

export const listProjects = () =>
  invoke<Project[]>('list_projects');

export const addProject = (payload: CreateProjectPayload) =>
  invoke<Project>('add_project', { payload });

export const updateProject = (payload: UpdateProjectPayload) =>
  invoke<Project>('update_project', { payload });

export const deleteProject = (id: string) =>
  invoke<void>('delete_project', { id });

export const launchProject = (id: string) =>
  invoke<void>('launch_project', { id });

export const detectProjectStack = (path: string) =>
  invoke<string | null>('detect_project_stack', { path });

// --- IDE commands ---

export const listIdes = () =>
  invoke<IdeConfig[]>('list_ides');

export const createIde = (payload: CreateIdePayload) =>
  invoke<IdeConfig>('create_ide', { payload });

export const updateIde = (payload: UpdateIdePayload) =>
  invoke<IdeConfig>('update_ide', { payload });

export const deleteIde = (id: string) =>
  invoke<void>('delete_ide', { id });

export const setDefaultIde = (id: string) =>
  invoke<void>('set_default_ide', { id });

// --- Workspace commands ---

export const listWorkspaces = () =>
  invoke<Workspace[]>('list_workspaces');

export const createWorkspace = (payload: CreateWorkspacePayload) =>
  invoke<Workspace>('create_workspace', { payload });

export const updateWorkspace = (payload: UpdateWorkspacePayload) =>
  invoke<Workspace>('update_workspace', { payload });

export const deleteWorkspace = (id: string) =>
  invoke<void>('delete_workspace', { id });
