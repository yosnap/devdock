import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIssue,
  deleteGithubToken,
  detectGithubRepo,
  getCiStatus,
  getGithubTokenStatus,
  getIssues,
  saveGithubToken,
} from '../services/tauri-commands';

export const useGithubTokenStatus = () =>
  useQuery({ queryKey: ['github', 'token-status'], queryFn: getGithubTokenStatus });

export const useSaveGithubToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => saveGithubToken(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['github', 'token-status'] }),
  });
};

export const useDeleteGithubToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGithubToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['github', 'token-status'] }),
  });
};

export const useDetectGithubRepo = () =>
  useMutation({
    mutationFn: ({ projectId, remoteUrl }: { projectId: string; remoteUrl: string }) =>
      detectGithubRepo(projectId, remoteUrl),
  });

export const useCiStatus = (projectId: string, owner?: string, repo?: string) =>
  useQuery({
    queryKey: ['github', 'ci', projectId],
    queryFn: () => getCiStatus(projectId, owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 5 * 60 * 1000, // 5 min (matches backend cache TTL)
  });

export const useIssues = (projectId: string, owner?: string, repo?: string) =>
  useQuery({
    queryKey: ['github', 'issues', projectId],
    queryFn: () => getIssues(projectId, owner!, repo!),
    enabled: Boolean(owner && repo),
    staleTime: 5 * 60 * 1000,
  });

export const useCreateIssue = (projectId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      owner,
      repo,
      title,
      body,
      labels,
    }: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      labels: string[];
    }) => createIssue(owner, repo, title, body, labels),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['github', 'issues', projectId] }),
  });
};
