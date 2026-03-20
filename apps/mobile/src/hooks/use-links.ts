// Mobile-local link hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ProjectLink } from '@devdock/types';

const LINK_KEYS = {
  all: ['links'] as const,
  list: (projectId: string) => ['links', projectId] as const,
};

export function useLinks(projectId: string) {
  return useQuery({
    queryKey: LINK_KEYS.list(projectId),
    queryFn: async (): Promise<ProjectLink[]> => {
      const { data, error } = await supabase
        .from('project_links')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useUpsertLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id?: string; project_id: string; title: string; url: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('project_links')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINK_KEYS.all }),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINK_KEYS.all }),
  });
}
