/**
 * AI 管家域 API（CR-F4-05 契约草案 + M0 冻结 runs）。
 *
 * - 计划/步骤：GET /steward/plans(/:runId)（草案）
 * - 审批：GET /steward/approvals + POST …/decision（参数变更 → 失效）
 * - 研究循环：POST /runs（research_cycle）+ GET /runs/:id/cycle-result
 */
import { apiRequest } from '@app/api/client';
import type { ApprovalView, ResearchCycleResult, StewardPlan } from '@entities/steward/types';

export function fetchStewardPlans(signal?: AbortSignal): Promise<StewardPlan[]> {
  return apiRequest<{ items: StewardPlan[]; next_cursor: string | null }>('/steward/plans', { signal }).then((e) => e.data.items);
}

export function fetchStewardPlan(runId: string, signal?: AbortSignal): Promise<StewardPlan> {
  return apiRequest<StewardPlan>(`/steward/plans/${encodeURIComponent(runId)}`, { signal }).then((e) => e.data);
}

export function fetchApprovals(signal?: AbortSignal): Promise<ApprovalView[]> {
  return apiRequest<{ items: ApprovalView[]; next_cursor: string | null }>('/steward/approvals', { signal }).then((e) => e.data.items);
}

/** 审批决策：approved / rejected；params_changed=true → 原审批失效（cancelled），需重审。 */
export function decideApproval(approvalId: string, decision: 'approved' | 'rejected', paramsChanged = false): Promise<ApprovalView> {
  return apiRequest<ApprovalView>(`/steward/approvals/${encodeURIComponent(approvalId)}/decision`, {
    method: 'POST',
    body: { decision, params_changed: paramsChanged },
  }).then((e) => e.data);
}

export function fetchCycleResult(runId: string, signal?: AbortSignal): Promise<ResearchCycleResult> {
  return apiRequest<ResearchCycleResult>(`/runs/${encodeURIComponent(runId)}/cycle-result`, { signal }).then((e) => e.data);
}

export interface RunAccepted {
  run_id: string;
  events_url: string;
  status: string;
}

/** 发起研究循环（TC-F06-01：研究问题 + 严谨模式）。 */
export function startResearchCycle(researchQuestion: string): Promise<RunAccepted> {
  return apiRequest<RunAccepted>('/runs', {
    method: 'POST',
    body: { run_type: 'research_cycle', reasoning_policy_id: 'rigorous', research_question: researchQuestion },
  }).then((e) => e.data);
}
