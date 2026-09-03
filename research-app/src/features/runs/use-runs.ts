/**
 * 运行列表用例：M4 v2.0 `GET /runs`（CR-F1-06：M0 v0.1.0 无列表端点）。
 * 501（M0 honest not wired）时查询进入 not_wired 错误态，UI 显示降级说明。
 */
import { useQuery } from '@tanstack/vue-query';
import { apiRequest } from '@app/api/client';
import type { Run } from '@entities/run/types';

export interface RunPage {
  items: Run[];
  next_cursor: string | null;
}

export function fetchRuns(limit = 10, signal?: AbortSignal): Promise<RunPage> {
  return apiRequest<RunPage>('/runs', { query: { limit }, signal }).then((envelope) => envelope.data);
}

export const runKeys = {
  list: (limit: number) => ['runs', 'list', { limit }] as const,
};

export function useRuns(limit = 10) {
  return useQuery({
    queryKey: runKeys.list(limit),
    queryFn: ({ signal }) => fetchRuns(limit, signal),
  });
}
