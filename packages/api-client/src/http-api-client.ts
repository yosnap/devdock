// Web/Mobile implementation of IApiClient — uses Supabase JS client
// The SupabaseClient is injected by the app at runtime (web uses createClient, mobile adds SecureStore)

import type { SupabaseClient } from '@supabase/supabase-js';
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
import {
  mapNoteItem,
  mapProject,
  mapProjectLink,
  mapWorkspace,
} from './supabase-mappers';

export class HttpApiClient implements IApiClient {
  constructor(protected readonly supabase: SupabaseClient) {}

  // --- Projects ---

  async listProjects(): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*, project_tags(tag)')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data.map(mapProject);
  }

  async addProject(payload: CreateProjectPayload): Promise<Project> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: payload.name,
        description: payload.description ?? null,
        stack: payload.stack ?? null,
        workspace_id: payload.workspace_id ?? null,
      })
      .select('*, project_tags(tag)')
      .single();
    if (error) throw error;

    // Insert tags and re-fetch to ensure consistency
    if (payload.tags?.length) {
      const { error: tagError } = await this.supabase.from('project_tags').insert(
        payload.tags.map((tag) => ({ project_id: data.id, tag }))
      );
      if (tagError) throw tagError;
    }

    // Re-fetch with tags to return accurate state
    const { data: full, error: refetchError } = await this.supabase
      .from('projects')
      .select('*, project_tags(tag)')
      .eq('id', data.id)
      .single();
    if (refetchError) throw refetchError;
    return mapProject(full);
  }

  async updateProject(payload: UpdateProjectPayload): Promise<Project> {
    const updateFields: Record<string, unknown> = {};
    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.description !== undefined) updateFields.description = payload.description;
    if (payload.stack !== undefined) updateFields.stack = payload.stack;
    if (payload.workspace_id !== undefined) updateFields.workspace_id = payload.workspace_id;
    if (payload.is_favorite !== undefined) updateFields.is_favorite = payload.is_favorite;
    if (payload.status !== undefined) updateFields.status = payload.status;

    const { error } = await this.supabase
      .from('projects')
      .update(updateFields)
      .eq('id', payload.id);
    if (error) throw error;

    // Replace tags if provided — always re-fetch to get accurate tag state
    if (payload.tags !== undefined) {
      const { error: delErr } = await this.supabase
        .from('project_tags').delete().eq('project_id', payload.id);
      if (delErr) throw delErr;

      if (payload.tags.length) {
        const { error: insErr } = await this.supabase.from('project_tags').insert(
          payload.tags.map((tag) => ({ project_id: payload.id, tag }))
        );
        if (insErr) throw insErr;
      }
    }

    // Re-fetch with tags to return accurate state (avoids stale tag data)
    const { data: full, error: refetchError } = await this.supabase
      .from('projects')
      .select('*, project_tags(tag)')
      .eq('id', payload.id)
      .single();
    if (refetchError) throw refetchError;
    return mapProject(full);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // --- Workspaces ---

  async listWorkspaces(): Promise<Workspace[]> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data.map(mapWorkspace);
  }

  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('workspaces')
      .insert({
        user_id: user.id,
        name: payload.name,
        color: payload.color ?? '#1677ff',
        icon: payload.icon ?? 'FolderOutlined',
      })
      .select()
      .single();
    if (error) throw error;
    return mapWorkspace(data);
  }

  async updateWorkspace(payload: UpdateWorkspacePayload): Promise<Workspace> {
    const updateFields: Record<string, unknown> = {};
    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.color !== undefined) updateFields.color = payload.color;
    if (payload.icon !== undefined) updateFields.icon = payload.icon;
    if (payload.sort_order !== undefined) updateFields.sort_order = payload.sort_order;

    const { data, error } = await this.supabase
      .from('workspaces')
      .update(updateFields)
      .eq('id', payload.id)
      .select()
      .single();
    if (error) throw error;
    return mapWorkspace(data);
  }

  async deleteWorkspace(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // --- Note items ---

  async listNoteItems(projectId: string): Promise<NoteItem[]> {
    const { data, error } = await this.supabase
      .from('project_note_items')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(mapNoteItem);
  }

  async createNoteItem(payload: CreateNotePayload): Promise<NoteItem> {
    const { data, error } = await this.supabase
      .from('project_note_items')
      .insert({
        project_id: payload.project_id,
        title: payload.title,
        content: payload.content,
        note_type: payload.note_type,
      })
      .select()
      .single();
    if (error) throw error;
    return mapNoteItem(data);
  }

  async updateNoteItem(payload: UpdateNotePayload): Promise<NoteItem> {
    const { data, error } = await this.supabase
      .from('project_note_items')
      .update({
        title: payload.title,
        content: payload.content,
        note_type: payload.note_type,
      })
      .eq('id', payload.id)
      .select()
      .single();
    if (error) throw error;
    return mapNoteItem(data);
  }

  async toggleNoteResolved(id: string): Promise<NoteItem> {
    // Fetch current state, then flip
    const { data: current, error: fetchErr } = await this.supabase
      .from('project_note_items')
      .select('is_resolved')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { data, error } = await this.supabase
      .from('project_note_items')
      .update({ is_resolved: !current.is_resolved })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapNoteItem(data);
  }

  async deleteNoteItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_note_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // --- Links ---

  async getLinks(projectId: string): Promise<ProjectLink[]> {
    const { data, error } = await this.supabase
      .from('project_links')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data.map(mapProjectLink);
  }

  async upsertLink(payload: UpsertLinkPayload): Promise<ProjectLink> {
    const row = {
      project_id: payload.project_id,
      title: payload.title,
      url: payload.url,
      icon: payload.icon ?? null,
      ...(payload.id ? { id: payload.id } : {}),
    };

    const { data, error } = await this.supabase
      .from('project_links')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return mapProjectLink(data);
  }

  async deleteLink(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_links')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  // --- Health summary ---

  async getProjectsNeedingAttention(): Promise<ProjectSummary[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('projects')
      .select('id, name, stack, health_score, status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('health_score', 0)           // exclude -1 (unscored)
      .lt('health_score', 80)           // below attention threshold
      .order('health_score', { ascending: true });
    if (error) throw error;
    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      path: '',
      stack: (row.stack as string | null) ?? undefined,
      health_score: row.health_score as number,
      status: row.status as string,
    }));
  }
}
