import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';
import type { CreateProjectPayload, UpdateProjectPayload } from '../types';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  list: () => [...PROJECT_KEYS.all, 'list'] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.list(),
    queryFn: api.listProjects,
  });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => api.addProject(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => api.updateProject(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useLaunchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.launchProject(id),
    // Refresh list to update last_opened_at
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}
