import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateNotePayload,
  UpdateNotePayload,
  UpsertLinkPayload,
} from '@devdock/types';
import { useApiClient } from './api-client-context';

// --- Note items ---

export const NOTE_KEYS = {
  all: ['notes'] as const,
  list: (projectId: string) => [...NOTE_KEYS.all, projectId] as const,
};

export function useNoteItems(projectId: string, enabled = true) {
  const api = useApiClient();
  return useQuery({
    queryKey: NOTE_KEYS.list(projectId),
    queryFn: () => api.listNoteItems(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useCreateNoteItem() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateNotePayload) => api.createNoteItem(payload),
    onSuccess: (_, payload) =>
      qc.invalidateQueries({ queryKey: NOTE_KEYS.list(payload.project_id) }),
  });
}

export function useUpdateNoteItem() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateNotePayload) => api.updateNoteItem(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTE_KEYS.all }),
  });
}

export function useToggleNoteResolved() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleNoteResolved(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTE_KEYS.all }),
  });
}

export function useDeleteNoteItem() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => api.deleteNoteItem(id),
    onSuccess: (_, { projectId }) =>
      qc.invalidateQueries({ queryKey: NOTE_KEYS.list(projectId) }),
  });
}

// --- Links ---

export const LINK_KEYS = {
  all: ['links'] as const,
  list: (projectId: string) => [...LINK_KEYS.all, projectId] as const,
};

export function useLinks(projectId: string, enabled = true) {
  const api = useApiClient();
  return useQuery({
    queryKey: LINK_KEYS.list(projectId),
    queryFn: () => api.getLinks(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useUpsertLink() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertLinkPayload) => api.upsertLink(payload),
    onSuccess: (_, payload) =>
      qc.invalidateQueries({ queryKey: LINK_KEYS.list(payload.project_id) }),
  });
}

export function useDeleteLink() {
  const api = useApiClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      api.deleteLink(id).then(() => projectId),
    onSuccess: (projectId) =>
      qc.invalidateQueries({ queryKey: LINK_KEYS.list(projectId) }),
  });
}
