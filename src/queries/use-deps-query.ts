import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';

export const DEPS_KEYS = {
  all: ['deps'] as const,
  list: (projectId: string) => [...DEPS_KEYS.all, projectId] as const,
};

export function useDeps(projectId: string, enabled = true) {
  return useQuery({
    queryKey: DEPS_KEYS.list(projectId),
    queryFn: () => api.getDeps(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 300_000, // 5 minutes
  });
}

export function useScanDeps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.scanDeps(projectId),
    onSuccess: (_, projectId) =>
      qc.invalidateQueries({ queryKey: DEPS_KEYS.list(projectId) }),
  });
}

export function useCheckOutdated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.checkOutdated(projectId),
    onSuccess: (_, projectId) =>
      qc.invalidateQueries({ queryKey: DEPS_KEYS.list(projectId) }),
  });
}
