import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './api-client-context';

export const HEALTH_KEYS = {
  attention: ['health', 'attention'] as const,
};

export function useProjectsNeedingAttention() {
  const api = useApiClient();
  return useQuery({
    queryKey: HEALTH_KEYS.attention,
    queryFn: () => api.getProjectsNeedingAttention(),
    staleTime: 30 * 60 * 1000, // 30 min
  });
}
