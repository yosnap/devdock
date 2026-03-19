import { invoke } from '@tauri-apps/api/core';
import type {
  CiStatus,
  CreateIdePayload,
  CreateProjectPayload,
  CreateWorkspacePayload,
  Dependency,
  GitHubIssue,
  GitInfo,
  GitStatus,
  HealthConfig,
  HealthInput,
  HealthResult,
  IdeConfig,
  Project,
  ProjectLink,
  ProjectNote,
  QuickLaunchItem,
  UpdateIdePayload,
  UpdateProjectPayload,
  UpdateWorkspacePayload,
  UpsertLinkPayload,
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

// --- Git commands ---

export const getGitStatus = (projectId: string) =>
  invoke<GitInfo>('get_git_status', { projectId });

export const getCachedGitStatus = (projectId: string) =>
  invoke<GitStatus | null>('get_cached_git_status', { projectId });

export const refreshProjectGit = (projectId: string) =>
  invoke<GitInfo>('refresh_project_git', { projectId });

// --- Deps commands ---

export const getDeps = (projectId: string) =>
  invoke<Dependency[]>('get_deps', { projectId });

export const scanDeps = (projectId: string) =>
  invoke<number>('scan_deps', { projectId });

export const checkOutdated = (projectId: string) =>
  invoke<number>('check_outdated', { projectId });

// --- Notes commands ---

export const getNotes = (projectId: string) =>
  invoke<ProjectNote>('get_notes', { projectId });

export const saveNotes = (projectId: string, content: string) =>
  invoke<ProjectNote>('save_notes', { projectId, content });

// --- Links commands ---

export const getLinks = (projectId: string) =>
  invoke<ProjectLink[]>('get_links', { projectId });

export const upsertLink = (payload: UpsertLinkPayload) =>
  invoke<ProjectLink>('upsert_link', { payload });

export const deleteLink = (id: string) =>
  invoke<void>('delete_link', { id });

// --- Workspace commands ---

export const listWorkspaces = () =>
  invoke<Workspace[]>('list_workspaces');

export const createWorkspace = (payload: CreateWorkspacePayload) =>
  invoke<Workspace>('create_workspace', { payload });

export const updateWorkspace = (payload: UpdateWorkspacePayload) =>
  invoke<Workspace>('update_workspace', { payload });

export const deleteWorkspace = (id: string) =>
  invoke<void>('delete_workspace', { id });

// --- GitHub commands ---

export const saveGithubToken = (token: string) =>
  invoke<void>('save_github_token', { token });

export const getGithubTokenStatus = () =>
  invoke<boolean>('get_github_token_status');

export const deleteGithubToken = () =>
  invoke<void>('delete_github_token');

export const detectGithubRepo = (projectId: string, remoteUrl: string) =>
  invoke<[string, string]>('detect_github_repo', { projectId, remoteUrl });

export const getCiStatus = (projectId: string, owner: string, repo: string) =>
  invoke<CiStatus>('get_ci_status', { projectId, owner, repo });

export const getIssues = (projectId: string, owner: string, repo: string) =>
  invoke<GitHubIssue[]>('get_issues', { projectId, owner, repo });

export const createIssue = (owner: string, repo: string, title: string, body: string, labels: string[]) =>
  invoke<GitHubIssue>('create_issue', { owner, repo, title, body, labels });

// --- Health commands ---

export const getHealthConfig = () =>
  invoke<HealthConfig>('get_health_config');

export const saveHealthConfig = (config: HealthConfig) =>
  invoke<void>('save_health_config', { config });

export const calculateProjectHealth = (projectId: string, input: HealthInput) =>
  invoke<HealthResult>('calculate_project_health', { projectId, input });

export const getProjectsNeedingAttention = () =>
  invoke<Array<{ id: string; name: string; path: string; stack?: string; health_score: number; status: string }>>('get_projects_needing_attention');

// --- Quick Launch commands ---

export const quickSearchProjects = (query: string) =>
  invoke<QuickLaunchItem[]>('quick_search_projects', { query });
