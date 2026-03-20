import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';
import type { CreateWorkspacePayload, UpdateWorkspacePayload } from '../types';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
  list: () => [...WORKSPACE_KEYS.all, 'list'] as const,
};

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACE_KEYS.list(),
    queryFn: api.listWorkspaces,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => api.createWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => api.updateWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}
