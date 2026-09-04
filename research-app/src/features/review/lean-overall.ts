/**
 * Lean 三状态综合判定（纯函数，单测覆盖 tests/unit/lean-overall.test.ts）。
 *
 * 红线（02 §5.6 / 06 §7 步骤 6）：
 * - 形式化翻译 / 内核状态 / 科研结论支持度三列独立，禁止合并为「论文正确」。
 * - 任一 partial → 综合 partial_supported；科研结论不支持 → rejected。
 */
import type { LeanThreeStates } from '@entities/review/types';
import type { ReviewClaim } from '@entities/review/types';

/** 综合状态判定：任何 partial → partial_supported；结论层 unsupported → rejected。 */
export function computeLeanOverall(
  translation: LeanThreeStates['translation_fidelity'],
  kernel: LeanThreeStates['kernel_status'],
  support: LeanThreeStates['claim_support'],
): LeanThreeStates['overall'] {
  if (support === 'unsupported') return 'rejected';
  if (translation === 'partial' || translation === 'diverged') return 'partial_supported';
  if (support === 'partial') return 'partial_supported';
  if (kernel === 'failed' || kernel === 'timed_out') return 'partial_supported';
  if (translation === 'not_run' || kernel === 'not_run' || kernel === 'awaiting_statement_confirm' || support === 'not_verified') {
    return 'pending';
  }
  // translation faithful + kernel succeeded + support full：仅「该主张被支持」，不等于论文正确。
  return 'supported';
}

/** 主张证据支持度 → Lean 三状态的科研结论支持度（claim/evidence 层输入）。 */
export function claimSupportFromEvidence(evidence: ReviewClaim['evidence_support']): LeanThreeStates['claim_support'] {
  switch (evidence) {
    case 'supported':
      return 'full';
    case 'partial':
      return 'partial';
    case 'conflicting':
      return 'unsupported';
    case 'insufficient_evidence':
    case 'not_verified':
      return 'not_verified';
  }
}

/** 支持度徽标文案（UI 与 mock 派生共用，保证口径一致）。 */
export const CLAIM_SUPPORT_LABELS: Record<ReviewClaim['evidence_support'], string> = {
  supported: '证据支持',
  partial: '部分支持',
  insufficient_evidence: '证据不足',
  conflicting: '证据冲突',
  not_verified: '未验证',
};
