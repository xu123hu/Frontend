/**
 * AI 管家域用例（vue-query）。
 * - 键层级：steward → 资源（plans/plan/approvals/cycle-result）。
 * - 审批决策成功后失效审批列表 + 计划（派生状态随决策变化）。
 * - 计划运行中轮询刷新（脚本事件逐步"播放"，派生状态随时间演进）。
 */
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient, type UseQueryReturnType } from '@tanstack/vue-query';
import { ApiError } from '@app/api/client';
import { decideApproval, fetchApprovals, fetchCycleResult, fetchStewardPlan, fetchStewardPlans, startResearchCycle } from './api';
import type { ApprovalView, ResearchCycleResult, StewardPlan } from '@entities/steward/types';

export const stewardKeys = {
  all: ['steward'] as const,
  plans: () => [...stewardKeys.all, 'plans'] as const,
  plan: (runId: string) => [...stewardKeys.all, 'plan', runId] as const,
  approvals: () => [...stewardKeys.all, 'approvals'] as const,
  cycleResult: (runId: string) => [...stewardKeys.all, 'cycle-result', runId] as const,
};

export function useStewardPlans(): UseQueryReturnType<StewardPlan[], Error> {
  return useQuery({
    queryKey: stewardKeys.plans(),
    queryFn: ({ signal }) => fetchStewardPlans(signal),
    // 运行中的计划由事件脚本驱动演进，轮询兜底（SSE 为主通道）。
    refetchInterval: (query) => {
      const plans = query.state.data as StewardPlan[] | undefined;
      return plans?.some((p) => p.status === 'running' || p.status === 'queued') ? 1_500 : false;
    },
  });
}

export function useStewardPlan(runId: MaybeRefOrGetter<string | null>): UseQueryReturnType<StewardPlan | null, Error> {
  return useQuery({
    queryKey: computed(() => [...stewardKeys.all, 'plan', toValue(runId) ?? '__none__'] as const),
    queryFn: ({ signal }) => (toValue(runId) ? fetchStewardPlan(toValue(runId)!, signal) : Promise.resolve(null)),
    enabled: computed(() => !!toValue(runId)),
    refetchInterval: (query) => {
      const plan = query.state.data as StewardPlan | undefined;
      return plan && (plan.status === 'running' || plan.status === 'queued') ? 1_500 : false;
    },
  });
}

export function useApprovals(): UseQueryReturnType<ApprovalView[], Error> {
  return useQuery({
    queryKey: stewardKeys.approvals(),
    queryFn: ({ signal }) => fetchApprovals(signal),
    refetchInterval: (query) => {
      const items = query.state.data as ApprovalView[] | undefined;
      return items?.some((a) => a.status === 'pending') ? 2_000 : false;
    },
  });
}

export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, decision, paramsChanged }: { approvalId: string; decision: 'approved' | 'rejected'; paramsChanged?: boolean }) =>
      decideApproval(approvalId, decision, paramsChanged ?? false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stewardKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: stewardKeys.plans() });
      queryClient.invalidateQueries({ queryKey: [...stewardKeys.all, 'plan'] });
    },
  });
}

export function useCycleResult(runId: MaybeRefOrGetter<string | null>): UseQueryReturnType<ResearchCycleResult | null, Error> {
  return useQuery({
    queryKey: computed(() => [...stewardKeys.all, 'cycle-result', toValue(runId) ?? '__none__'] as const),
    queryFn: ({ signal }) => {
      const id = toValue(runId);
      if (!id) return Promise.resolve(null);
      // 409（未完成）/404（无产物）→ null，由 UI 决定展示。
      return fetchCycleResult(id, signal).catch((err) => {
        if (err instanceof ApiError && (err.kind === 'not_found' || err.status === 409)) return null;
        throw err;
      });
    },
    enabled: computed(() => !!toValue(runId)),
  });
}

export function useStartResearchCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (researchQuestion: string) => startResearchCycle(researchQuestion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stewardKeys.plans() });
      queryClient.invalidateQueries({ queryKey: stewardKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    },
  });
}
