import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HealthConfig, HealthInput } from '../types';
import {
  calculateProjectHealth,
  getHealthConfig,
  getProjectsNeedingAttention,
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

export const useProjectsNeedingAttention = () =>
  useQuery({
    queryKey: ['health', 'attention'],
    queryFn: getProjectsNeedingAttention,
    staleTime: 30 * 60 * 1000, // 30 min
  });

export const useQuickSearch = (query: string) =>
  useQuery({
    queryKey: ['quick-launch', query],
    queryFn: () => quickSearchProjects(query),
    staleTime: 0, // always fresh
  });
