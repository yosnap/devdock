import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';

export const GIT_KEYS = {
  all: ['git'] as const,
  status: (projectId: string) => [...GIT_KEYS.all, projectId] as const,
};

export function useGitStatus(projectId: string, enabled = true) {
  return useQuery({
    queryKey: GIT_KEYS.status(projectId),
    queryFn: () => api.getGitStatus(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000, // 1 minute
  });
}

export function useCachedGitStatus(projectId: string) {
  return useQuery({
    queryKey: [...GIT_KEYS.status(projectId), 'cached'],
    queryFn: () => api.getCachedGitStatus(projectId),
    enabled: Boolean(projectId),
    staleTime: 120_000,
  });
}

export function useRefreshGit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.refreshProjectGit(projectId),
    onSuccess: (_, projectId) =>
      qc.invalidateQueries({ queryKey: GIT_KEYS.status(projectId) }),
  });
}
