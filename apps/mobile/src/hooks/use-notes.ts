// Mobile-local note hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { NoteItem } from '@devdock/types';

const NOTE_KEYS = {
  all: ['note_items'] as const,
  list: (projectId: string) => ['note_items', projectId] as const,
};

export function useNoteItems(projectId: string) {
  return useQuery({
    queryKey: NOTE_KEYS.list(projectId),
    queryFn: async (): Promise<NoteItem[]> => {
      const { data, error } = await supabase
        .from('project_note_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreateNoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { project_id: string; title: string; content?: string; note_type?: string }) => {
      const { data, error } = await supabase
        .from('project_note_items')
        .insert({ ...payload, note_type: payload.note_type ?? 'note' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTE_KEYS.all }),
  });
}

export function useToggleNoteResolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error: fetchErr } = await supabase
        .from('project_note_items')
        .select('is_resolved')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      const { error } = await supabase
        .from('project_note_items')
        .update({ is_resolved: !data.is_resolved })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTE_KEYS.all }),
  });
}

export function useDeleteNoteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_note_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTE_KEYS.all }),
  });
}
