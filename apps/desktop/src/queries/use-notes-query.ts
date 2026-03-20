import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/tauri-commands';
import type { UpsertLinkPayload } from '../types';

export const NOTES_KEYS = {
  all: ['notes'] as const,
  note: (projectId: string) => [...NOTES_KEYS.all, projectId] as const,
};

export const LINKS_KEYS = {
  all: ['links'] as const,
  list: (projectId: string) => [...LINKS_KEYS.all, projectId] as const,
};

// --- Notes ---

export function useNotes(projectId: string, enabled = true) {
  return useQuery({
    queryKey: NOTES_KEYS.note(projectId),
    queryFn: () => api.getNotes(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useSaveNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, content }: { projectId: string; content: string }) =>
      api.saveNotes(projectId, content),
    onSuccess: (_, { projectId }) =>
      qc.invalidateQueries({ queryKey: NOTES_KEYS.note(projectId) }),
  });
}

// --- Links ---

export function useLinks(projectId: string, enabled = true) {
  return useQuery({
    queryKey: LINKS_KEYS.list(projectId),
    queryFn: () => api.getLinks(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useUpsertLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertLinkPayload) => api.upsertLink(payload),
    onSuccess: (_, payload) =>
      qc.invalidateQueries({ queryKey: LINKS_KEYS.list(payload.project_id) }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      api.deleteLink(id).then(() => projectId),
    onSuccess: (projectId) =>
      qc.invalidateQueries({ queryKey: LINKS_KEYS.list(projectId) }),
  });
}
