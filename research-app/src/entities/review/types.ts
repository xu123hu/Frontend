/**
 * 评审域实体（作者/评委双视图 + 分层验证 + Lean 三状态 + 修订）。
 *
 * 契约依据（CR-F4-01..04 推导 + M0 冻结引用）：
 * - M4 §8.6 初审：五层、问题项（层/严重度/置信/页码/原文/检查器/证据）、作者可见建议。
 * - M4 §8.3 数学验证：五能力独立执行、四态、反例带代入值。
 * - M4 §8.4 / 02 §5.6 Lean：lean_translation 与 lean_kernel 独立记录；
 *   科研结论支持度由 claim/evidence 层表达，禁止合并为「论文正确」。
 * - 06 §7 步骤 6：通过 Lean 但不支持完整论文结论 → 综合状态 partial_supported。
 */

/** 评审视图：作者 / 评委（权限由后端裁剪，前端仅渲染可见字段）。 */
export type ReviewMode = 'author' | 'reviewer';

/** 评审批次（单篇论文评审，对应 review/:paperId 路由）。 */
export interface ReviewPaper {
  id: string;
  project_id: string;
  title: string;
  /** 作者可见建议（评委视图不渲染）。 */
  author_suggestions: string[] | null;
  /** 综合状态。 */
  verdict: 'in_review' | 'needs_revision' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

/** 待审主张（公式/定理/前提，用户可修正）。 */
export interface ReviewClaim {
  id: string;
  paper_id: string;
  kind: 'formula' | 'theorem' | 'assumption';
  /** 原表述（提取结果）。 */
  statement: string;
  /** 用户修正后表述。 */
  corrected_statement: string | null;
  /** 前提（用于反例前提约束）。 */
  assumptions: string[];
  /** 证据引用（claim 支持度）。 */
  evidence_support: 'supported' | 'partial' | 'insufficient_evidence' | 'conflicting' | 'not_verified';
  page_index: number | null;
  quote: string | null;
}

/** 分层验证结果（VerificationRecord 视图，五能力独立）。 */
export interface VerificationLayer {
  layer: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  label: string;
  method: string;
  status: 'not_run' | 'passed' | 'failed' | 'partial' | 'inconclusive';
  summary: string;
  tool_name: string;
  tool_version: string;
  /** 反例：代入值 + 前提约束检查 + 复算。 */
  counterexample: { assignment: string; assumption_check: string; recompute: string } | null;
}

/** Lean 三状态分项（禁止合并为「论文正确」）。 */
export interface LeanThreeStates {
  /** 形式化翻译忠实度（lean_translation）。 */
  translation_fidelity: 'faithful' | 'partial' | 'diverged' | 'not_run';
  /** Lean 内核状态（lean_kernel）。 */
  kernel_status: 'succeeded' | 'failed' | 'timed_out' | 'not_run' | 'awaiting_statement_confirm';
  /** 科研结论支持度（claim/evidence 层）。 */
  claim_support: 'full' | 'partial' | 'unsupported' | 'not_verified';
  /** 综合状态：任一 partial → partial_supported；永不显示「论文正确」。 */
  overall: 'supported' | 'partial_supported' | 'rejected' | 'pending';
  /** no sorry/admit 检查。 */
  sorry_admit_free: boolean | null;
  diagnostics: string[];
}

/** 修订（作者提交 → 评委复核）。 */
export interface Revision {
  id: string;
  paper_id: string;
  version: number;
  summary: string;
  /** 修订 diff（与上一版）。 */
  diff: string;
  status: 'pending_review' | 'approved' | 'needs_more_work';
  reviewer_note: string | null;
  created_at: string;
}
