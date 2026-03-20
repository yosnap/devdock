import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateWorkspacePayload, UpdateWorkspacePayload } from '@devdock/types';
import { useApiClient } from './api-client-context';

export const WORKSPACE_KEYS = {
  all: ['workspaces'] as const,
  list: () => [...WORKSPACE_KEYS.all, 'list'] as const,
};

export function useWorkspaces() {
  const api = useApiClient();
  return useQuery({
    queryKey: WORKSPACE_KEYS.list(),
    queryFn: () => api.listWorkspaces(),
  });
}

export function useCreateWorkspace() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => api.createWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}

export function useUpdateWorkspace() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => api.updateWorkspace(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}

export function useDeleteWorkspace() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKSPACE_KEYS.all }),
  });
}
