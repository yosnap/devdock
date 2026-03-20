import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateProjectPayload, UpdateProjectPayload } from '@devdock/types';
import { useApiClient } from './api-client-context';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  list: () => [...PROJECT_KEYS.all, 'list'] as const,
};

export function useProjects() {
  const api = useApiClient();
  return useQuery({
    queryKey: PROJECT_KEYS.list(),
    queryFn: () => api.listProjects(),
  });
}

export function useAddProject() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => api.addProject(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useUpdateProject() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => api.updateProject(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useDeleteProject() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}
