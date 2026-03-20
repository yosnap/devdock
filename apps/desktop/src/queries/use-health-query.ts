// Desktop-only health hooks — config management and live health calculation
// useProjectsNeedingAttention is in @devdock/hooks (shared)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HealthConfig, HealthInput } from '@devdock/types';
import {
  calculateProjectHealth,
  getHealthConfig,
  quickSearchProjects,
  saveHealthConfig,
} from '../services/tauri-commands';

export const useHealthConfig = () =>
  useQuery({ queryKey: ['health', 'config'], queryFn: getHealthConfig });

export const useSaveHealthConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: HealthConfig) => saveHealthConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health', 'config'] }),
  });
};

export const useCalculateHealth = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: HealthInput }) =>
      calculateProjectHealth(projectId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['health', 'attention'] });
    },
  });
};

export const useQuickSearch = (query: string) =>
  useQuery({
    queryKey: ['quick-launch', query],
    queryFn: () => quickSearchProjects(query),
    staleTime: 0,
  });
