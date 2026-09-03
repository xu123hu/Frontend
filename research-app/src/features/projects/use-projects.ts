/**
 * 项目用例（vue-query）：列表、详情、创建。
 * 创建成功后失效列表缓存；幂等键在每次提交会话内生成（crypto.randomUUID）。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { createProject, fetchProject, fetchProjects } from './api';
import type { ProjectCreate } from '@entities/project/types';

export const projectKeys = {
  all: ['projects'] as const,
  list: (limit: number) => ['projects', 'list', { limit }] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

export function useProjects(limit = 20) {
  return useQuery({
    queryKey: projectKeys.list(limit),
    queryFn: ({ signal }) => fetchProjects(limit, undefined, signal),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: ({ signal }) => fetchProject(projectId, signal),
    retry: false, // 401/403/404 直接进入对应状态，不重试
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: ProjectCreate; idempotencyKey: string }) =>
      createProject(input, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
