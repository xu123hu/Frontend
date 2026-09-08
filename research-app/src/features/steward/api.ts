/**
 * AI 管家域 API（CR-F4-05 契约草案 + M0 冻结 runs）。
 *
 * - 计划/步骤：GET /steward/plans(/:runId)（草案）
 * - 审批：GET /steward/approvals + POST …/decision（参数变更 → 失效）
 * - 研究循环：POST /runs（research_cycle）+ GET /runs/:id/cycle-result
 */
import { apiRequest } from '@app/api/client';
import type { ApprovalView, ResearchCycleResult, StewardPlan } from '@entities/steward/types';

export interface StewardChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StewardChatResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  reasoning_policy_id: 'quick' | 'standard' | 'rigorous';
  degraded: boolean;
}

export function sendStewardChat(
  messages: StewardChatMessage[],
  reasoningPolicyId: StewardChatResponse['reasoning_policy_id'] = 'standard',
): Promise<StewardChatResponse> {
  return apiRequest<StewardChatResponse>('/steward/chat', {
    method: 'POST',
    body: { messages, reasoning_policy_id: reasoningPolicyId },
  }).then((envelope) => envelope.data);
}

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

/** 真存储的候选假设（platform.hypotheses；live 由 /steward/projects/:id/hypotheses 提供）。 */
export interface StewardHypothesis {
  id: string;
  statement: string;
  status: string;
  source: string;
  rationale?: string;
  confirmed: boolean | null;
  created_at?: string;
}

export function fetchProjectHypotheses(projectId: string, signal?: AbortSignal): Promise<StewardHypothesis[]> {
  return apiRequest<{ items: StewardHypothesis[] }>(
    `/steward/projects/${encodeURIComponent(projectId)}/hypotheses`,
    { signal },
  ).then((e) => e.data.items);
}

/** AI 生成候选假设：真模型调用 + 落库，产出为提案（待人工确认，不直接生效）。 */
export function generateProjectHypotheses(projectId: string): Promise<{ items: StewardHypothesis[] }> {
  return apiRequest<{ items: StewardHypothesis[] }>(
    `/steward/projects/${encodeURIComponent(projectId)}/hypotheses/generate`,
    { method: 'POST', body: {} },
  ).then((e) => e.data);
}

export function decideHypothesis(hypothesisId: string, approved: boolean): Promise<StewardHypothesis> {
  return apiRequest<StewardHypothesis>(
    `/steward/hypotheses/${encodeURIComponent(hypothesisId)}/decide`,
    { method: 'POST', body: { approved } },
  ).then((e) => e.data);
}
