/**
 * 评审域 API（CR-F4-01..04 契约草案 + M0 冻结 runs）。
 *
 * - 评审批次/主张/修正：CR-F4-01（草案）
 * - 分层验证 + Lean：CR-F4-02/03 → M0 冻结 POST /runs（math_verification）+ 草案结果端点
 * - 修订 + 评委复核：CR-F4-04（草案）
 */
import { apiRequest } from '@app/api/client';
import type { LeanThreeStates, ReviewClaim, ReviewPaper, Revision, VerificationLayer } from '@entities/review/types';

export function fetchReviewPapers(signal?: AbortSignal): Promise<ReviewPaper[]> {
  return apiRequest<{ items: ReviewPaper[]; next_cursor: string | null }>('/reviews', { signal }).then((e) => e.data.items);
}

export function fetchReviewPaper(paperId: string, signal?: AbortSignal): Promise<ReviewPaper> {
  return apiRequest<ReviewPaper>(`/reviews/${encodeURIComponent(paperId)}`, { signal }).then((e) => e.data);
}

export function fetchClaims(paperId: string, signal?: AbortSignal): Promise<ReviewClaim[]> {
  return apiRequest<{ items: ReviewClaim[]; next_cursor: string | null }>(`/reviews/${encodeURIComponent(paperId)}/claims`, { signal }).then((e) => e.data.items);
}

/** 用户修正主张表述（HumanDecision 审计语义）。 */
export function correctClaim(claimId: string, correctedStatement: string): Promise<ReviewClaim> {
  return apiRequest<ReviewClaim>(`/claims/${encodeURIComponent(claimId)}`, {
    method: 'PATCH',
    body: { corrected_statement: correctedStatement },
  }).then((e) => e.data);
}

/** 分层验证结果（五能力独立，L0-L4）。 */
export function fetchVerification(claimId: string, signal?: AbortSignal): Promise<VerificationLayer[]> {
  return apiRequest<{ items: VerificationLayer[] }>(`/claims/${encodeURIComponent(claimId)}/verification`, { signal }).then((e) => e.data.items);
}

/** Lean 三状态。 */
export function fetchLean(claimId: string, signal?: AbortSignal): Promise<LeanThreeStates> {
  return apiRequest<LeanThreeStates>(`/claims/${encodeURIComponent(claimId)}/lean`, { signal }).then((e) => e.data);
}

export function fetchRevisions(paperId: string, signal?: AbortSignal): Promise<Revision[]> {
  return apiRequest<{ items: Revision[]; next_cursor: string | null }>(`/reviews/${encodeURIComponent(paperId)}/revisions`, { signal }).then((e) => e.data.items);
}

/** 评委复核修订（approved / needs_more_work）。 */
export function reviewRevision(revisionId: string, status: 'approved' | 'needs_more_work', reviewerNote: string): Promise<Revision> {
  return apiRequest<Revision>(`/revisions/${encodeURIComponent(revisionId)}/review`, {
    method: 'POST',
    body: { status, reviewer_note: reviewerNote },
  }).then((e) => e.data);
}

// ---------- 数学验证 / Lean run（M0 冻结 POST /runs + SSE） ----------

export interface RunAccepted {
  run_id: string;
  events_url: string;
  status: string;
}

export interface StartVerificationOptions {
  /** 仅 dev/test 演练钩子：lean 走 Lean 两段脚本（翻译/内核），默认五层验证。 */
  mockMethod?: 'layers' | 'lean';
}

export function startVerificationRun(claimId: string, options: StartVerificationOptions = {}): Promise<RunAccepted> {
  return apiRequest<RunAccepted>('/runs', {
    method: 'POST',
    body: {
      run_type: 'math_verification',
      input_artifact_ids: [claimId],
      ...(options.mockMethod ? { mock_method: options.mockMethod } : {}),
    },
  }).then((e) => e.data);
}
