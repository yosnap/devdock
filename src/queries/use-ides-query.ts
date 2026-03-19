import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';
import type { CreateIdePayload, UpdateIdePayload } from '../types';

export const IDE_KEYS = {
  all: ['ides'] as const,
  list: () => [...IDE_KEYS.all, 'list'] as const,
};

export function useIdes() {
  return useQuery({
    queryKey: IDE_KEYS.list(),
    queryFn: api.listIdes,
  });
}

export function useCreateIde() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIdePayload) => api.createIde(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDE_KEYS.all }),
  });
}

export function useUpdateIde() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateIdePayload) => api.updateIde(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDE_KEYS.all }),
  });
}

export function useDeleteIde() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteIde(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDE_KEYS.all }),
  });
}

export function useSetDefaultIde() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.setDefaultIde(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: IDE_KEYS.all }),
  });
}
