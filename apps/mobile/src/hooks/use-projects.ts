// Mobile-local project hooks — avoids monorepo duplicate package issues with Metro
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project } from '@devdock/types';
import type { CreateProjectPayload } from '@devdock/types';

const PROJECT_KEYS = { all: ['projects'] as const };

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.all,
    queryFn: async (): Promise<Project[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('is_favorite', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []).map(row => ({
        ...row,
        is_favorite: !!row.is_favorite,
        health_score: row.health_score ?? -1,
        tags: [],
      }));
    },
  });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload): Promise<Project> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        is_favorite: !!data.is_favorite,
        health_score: data.health_score ?? -1,
        tags: data.tags ?? [],
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Project> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from('projects').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECT_KEYS.all }),
  });
}
