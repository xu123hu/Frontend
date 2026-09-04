/**
 * AI 管家（steward）域实体：研究循环计划/步骤/审批/产物。
 *
 * 契约依据（CR-F4-05/06 推导 + M0 冻结引用）：
 * - 02 §5.9 ApprovalRequest：risk_tier/action/reason/arguments_redacted/status 五态/expires_at。
 * - 06 §8 研究循环：研究问题→计划→假设→证据→审批→拒绝保留证据→产物。
 * - 04 提示工程红线：候选假设明确标记 hypothesis（非 fact）；不显示模型供应商。
 */

/** 管家计划步骤状态。 */
export type PlanStepStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'rejected' | 'awaiting_approval';

/** 计划步骤。 */
export interface PlanStep {
  id: string;
  order: number;
  title: string;
  /** 预期能力（检索/数值/符号/Lean...）。 */
  capability: string;
  status: PlanStepStatus;
  /** 步骤产物描述（完成后）。 */
  result_summary: string | null;
  /** 拒绝后可选替代路径。 */
  alternative_paths: string[];
  /** 关联审批（awaiting_approval 时）。 */
  approval_id: string | null;
}

/** 研究循环计划（用户输入研究问题 + 严谨模式 + 预算后生成）。 */
export interface StewardPlan {
  run_id: string;
  research_question: string;
  reasoning_policy: 'quick' | 'standard' | 'rigorous';
  status: 'queued' | 'running' | 'paused' | 'partial' | 'succeeded' | 'failed' | 'cancelled' | 'budget_exhausted';
  progress: number | null;
  stage_message: string | null;
  budget: { max_cost_minor_units: number; max_runtime_seconds: number } | null;
  spent: { cost_minor_units: number; runtime_seconds: number } | null;
  steps: PlanStep[];
  /** 候选假设（全部明确标记 hypothesis）。 */
  hypotheses: Array<{ id: string; text: string; marked: 'hypothesis' }>;
}

/** 审批卡（ApprovalRequest 视图 + 参数绑定展示）。 */
export interface ApprovalView {
  id: string;
  run_id: string;
  risk_tier: 'low' | 'moderate' | 'high' | 'prohibited';
  action: string;
  reason: string;
  /** 参数摘要（redacted 展示，不含敏感值）。 */
  arguments_redacted: Record<string, string>;
  /** 参数摘要哈希（修改后失效判据）。 */
  arguments_hash: string;
  estimated_cost_minor_units: number | null;
  data_scope: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  requested_at: string;
  expires_at: string | null;
  resolution_note: string | null;
}

/** 审批决策（HumanDecision 审计语义；修改参数 → 审批失效）。 */
export interface StewardDecision {
  decision: 'approved' | 'rejected';
  params_changed: boolean;
  note: string;
  decided_at: string;
}

/** 研究循环最终产物（06 §8 步骤 8）。 */
export interface ResearchCycleResult {
  research_question: string;
  hypotheses: Array<{ text: string; marked: 'hypothesis' }>;
  claims: Array<{ text: string; support: string; evidence_ids: string[] }>;
  verification: Array<{ item: string; status: string; tool: string }>;
  limitations: string[];
  human_decisions: string[];
}
