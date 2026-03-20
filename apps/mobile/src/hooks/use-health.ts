// Mobile-local health hooks
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useProjectsNeedingAttention() {
  return useQuery({
    queryKey: ['health', 'attention'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, stack, health_score, status')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('health_score', 0)
        .lt('health_score', 50)
        .order('health_score');
      if (error) throw error;
      return data ?? [];
    },
  });
}
