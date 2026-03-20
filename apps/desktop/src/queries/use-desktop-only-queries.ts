// Desktop-only hooks not available in web/mobile
// useLaunchProject, useNotes/useSaveNotes (legacy markdown editor)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { launchProject, getNotes, saveNotes } from '../services/tauri-commands';
import { PROJECT_KEYS } from '@devdock/hooks';

// --- Launch project (filesystem + IDE — desktop only) ---

export function useLaunchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => launchProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

// --- Legacy markdown notes (desktop only) ---

export function useNotes(projectId: string, enabled = true) {
  return useQuery({
    queryKey: ['notes-legacy', projectId],
    queryFn: () => getNotes(projectId),
    enabled: enabled && Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useSaveNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, content }: { projectId: string; content: string }) =>
      saveNotes(projectId, content),
    onSuccess: (_, { projectId }) =>
      qc.invalidateQueries({ queryKey: ['notes-legacy', projectId] }),
  });
}
