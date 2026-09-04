/**
 * 评审域 MSW 请求处理器（CR-F4-01..04 契约草案）。
 *
 * - 批次/主张/修正：草案端点。
 * - 分层验证 + Lean：经 POST /runs（math_verification）+ run 详情（从事件脚本推导）。
 * - 修订：草案端点。
 */
import { http, HttpResponse, delay } from 'msw';
import { envelope, errorEnvelope, requestId, readSession } from './http-helpers';
import { seedReviewStore, type ReviewStore } from './review-db';
import { writingOf } from './writing-db';
import { computeLeanOverall, claimSupportFromEvidence } from '@features/review/lean-overall';
import type { ReviewClaim, LeanThreeStates, VerificationLayer } from '@entities/review/types';
import type { RunEventView } from '@shared/lib/sse';

export function reviewOf(session: { tenant: { projects: { id: string }[] } }): ReviewStore {
  // 评审种子挂在写作域 tenant 上（避免扩展 TenantRecord 类型；懒初始化）
  const store = (session.tenant as { _review?: ReviewStore })._review;
  if (!store) {
    const projectId = session.tenant.projects[0]?.id ?? 'proj-alpha-1';
    const seeded = seedReviewStore('', projectId);
    (session.tenant as { _review?: ReviewStore })._review = seeded;
    return seeded;
  }
  return store;
}

type ScriptFrame = { frame: RunEventView; delayMs: number };

/** 查找某主张最近的分层验证脚本（mock_method=layers 的 math_verification run）。 */
function findVerificationScript(session: { tenant: { literature?: { runEventScripts: Map<string, ScriptFrame[]> } } }, claimId: string): ScriptFrame[] | null {
  let hit: ScriptFrame[] | null = null;
  for (const script of session.tenant.literature?.runEventScripts.values() ?? []) {
    const hasClaim = script.some((f) => {
      const p = f.frame.payload as { claim_id?: string; method?: string } | undefined;
      return p?.claim_id === claimId && p?.method === undefined && f.frame.step_id === 'verify';
    });
    if (hasClaim) hit = script;
  }
  return hit;
}

/** 查找某主张最近的 Lean 脚本（mock_method=lean：payload.method=lean_translation/lean_kernel）。 */
function findLeanScript(session: { tenant: { literature?: { runEventScripts: Map<string, ScriptFrame[]> } } }, claimId: string): ScriptFrame[] | null {
  let hit: ScriptFrame[] | null = null;
  for (const script of session.tenant.literature?.runEventScripts.values() ?? []) {
    const hasClaim = script.some((f) => {
      const p = f.frame.payload as { claim_id?: string; method?: string } | undefined;
      return p?.claim_id === claimId && (p?.method === 'lean_translation' || p?.method === 'lean_kernel');
    });
    if (hasClaim) hit = script;
  }
  return hit;
}

const LAYER_LABELS = ['L0 语法', 'L1 定义域', 'L2 符号', 'L3 数值', 'L4 反例'];
const LAYER_METHODS = ['syntax', 'assumption', 'symbolic', 'numeric', 'counterexample'];
const LAYER_TOOLS = ['LaTeX parser 0.1', 'sympy 1.12', 'sympy 1.12', 'numpy 1.26', 'sympy 1.12'];

/** 从事件脚本派生分层验证结果（progress payload {layer,result} → VerificationLayer）。 */
function deriveVerificationLayers(script: ScriptFrame[]): VerificationLayer[] {
  return script
    .filter((f) => f.frame.event_type === 'step.progress' && f.frame.step_id === 'verify')
    .map((f, i) => {
      const p = f.frame.payload as { layer?: string; result?: string } | undefined;
      const result = p?.result ?? 'passed';
      const layerId = (p?.layer ?? `L${i}`) as VerificationLayer['layer'];
      const failed = result === 'counterexample';
      return {
        layer: layerId,
        label: LAYER_LABELS[i]?.replace(/^L\d+ /, '') ?? `L${i}`,
        method: LAYER_METHODS[i] ?? 'unknown',
        status: failed ? 'failed' : result === 'passed' ? 'passed' : 'inconclusive',
        summary: f.frame.progress?.message ?? '',
        tool_name: (LAYER_TOOLS[i] ?? 'unknown').split(' ')[0],
        tool_version: (LAYER_TOOLS[i] ?? 'unknown').split(' ')[1] ?? '—',
        counterexample: failed
          ? {
              assignment: '（演示）随机抽样发现代入值使命题不成立',
              assumption_check: '前提满足——反例不因前提失效而作废',
              recompute: '复算确认结果与命题矛盾',
            }
          : null,
      };
    });
}

export const reviewHandlers = [
  // ---------- 评审批次（CR-F4-01） ----------
  http.get('*/api/research/v1/reviews', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = reviewOf(session);
    return HttpResponse.json(envelope({ items: store.papers, next_cursor: null }, requestId()));
  }),

  http.get('*/api/research/v1/reviews/:paperId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = reviewOf(session);
    const paper = store.papers.find((p) => p.id === params.paperId);
    if (!paper) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    return HttpResponse.json(envelope(paper, requestId()));
  }),

  // ---------- 主张（CR-F4-01：提取 + 用户修正） ----------
  http.get('*/api/research/v1/reviews/:paperId/claims', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = reviewOf(session);
    const items = store.claimsByPaper.get(String(params.paperId)) ?? [];
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.patch('*/api/research/v1/claims/:claimId', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { corrected_statement?: string };
    const store = reviewOf(session);
    let hit: ReviewClaim | null = null;
    for (const list of store.claimsByPaper.values()) {
      const c = list.find((x) => x.id === params.claimId);
      if (c) {
        hit = c;
        break;
      }
    }
    if (!hit) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    if (!body.corrected_statement || body.corrected_statement.trim().length === 0) {
      return errorEnvelope('validation_failed', '修正表述不能为空。', false, requestId(), 422);
    }
    // 修正写入 HumanDecision 审计语义（草案：更新 corrected_statement）。
    hit.corrected_statement = body.corrected_statement.trim();
    await delay(150);
    return HttpResponse.json(envelope(hit, requestId()));
  }),

  // ---------- 分层验证结果（草案：VerificationRecord 视图；无种子时从运行脚本派生） ----------
  http.get('*/api/research/v1/claims/:claimId/verification', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const claimId = String(params.claimId);
    const store = reviewOf(session);
    const layers = store.verificationByClaim.get(claimId);
    if (layers) return HttpResponse.json(envelope({ items: layers }, requestId()));
    const script = findVerificationScript(session, claimId);
    if (script) return HttpResponse.json(envelope({ items: deriveVerificationLayers(script) }, requestId()));
    return errorEnvelope('not_found', '该主张暂无验证记录。', false, requestId(), 404);
  }),

  // ---------- Lean 三状态（草案：VerificationRecord lean_translation/lean_kernel 视图） ----------
  http.get('*/api/research/v1/claims/:claimId/lean', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const claimId = String(params.claimId);
    const store = reviewOf(session);
    const lean = store.leanByClaim.get(claimId);
    if (lean) return HttpResponse.json(envelope(lean, requestId()));
    // 从 Lean 运行脚本派生三状态（翻译/内核来自事件 payload；结论支持度来自主张证据层）。
    const script = findLeanScript(session, claimId);
    if (script) {
      const claims = Array.from(store.claimsByPaper.values()).flat();
      const claim = claims.find((c) => c.id === claimId);
      const translationResult = (script.find((f) => (f.frame.payload as { method?: string } | undefined)?.method === 'lean_translation')?.frame.payload as { result?: string } | undefined)?.result ?? 'partial';
      const kernelResult = (script.find((f) => (f.frame.payload as { method?: string } | undefined)?.method === 'lean_kernel')?.frame.payload as { result?: string } | undefined)?.result ?? 'not_run';
      const translation = translationResult as LeanThreeStates['translation_fidelity'];
      const kernel = kernelResult as LeanThreeStates['kernel_status'];
      const support = claimSupportFromEvidence(claim?.evidence_support ?? 'not_verified');
      const derived: LeanThreeStates = {
        translation_fidelity: translation,
        kernel_status: kernel,
        claim_support: support,
        overall: computeLeanOverall(translation, kernel, support),
        sorry_admit_free: kernel === 'succeeded' ? true : null,
        diagnostics: script
          .filter((f) => f.frame.event_type === 'step.progress')
          .map((f) => f.frame.progress?.message ?? '')
          .filter(Boolean),
      };
      return HttpResponse.json(envelope(derived, requestId()));
    }
    return errorEnvelope('not_found', '该主张未运行 Lean。', false, requestId(), 404);
  }),

  // ---------- 修订（CR-F4-04） ----------
  http.get('*/api/research/v1/reviews/:paperId/revisions', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = reviewOf(session);
    const items = store.revisionsByPaper.get(String(params.paperId)) ?? [];
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  // ---------- 修订复核（评委决定：approved / needs_more_work；草案端点） ----------
  http.post('*/api/research/v1/revisions/:revisionId/review', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { status?: string; reviewer_note?: string };
    if (body.status !== 'approved' && body.status !== 'needs_more_work') {
      return errorEnvelope('validation_failed', 'status 仅接受 approved / needs_more_work。', false, requestId(), 422);
    }
    const store = reviewOf(session);
    let hit: import('@entities/review/types').Revision | null = null;
    for (const list of store.revisionsByPaper.values()) {
      const r = list.find((x) => x.id === params.revisionId);
      if (r) {
        hit = r;
        break;
      }
    }
    if (!hit) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    if (hit.status !== 'pending_review') {
      return errorEnvelope('conflict', '该修订已复核。', false, requestId(), 409);
    }
    hit.status = body.status;
    hit.reviewer_note = body.reviewer_note?.trim() || null;
    await delay(150);
    return HttpResponse.json(envelope(hit, requestId()));
  }),

  // ---------- 数学验证 run 状态详情（从事件脚本推导，经 writing store 承载） ----------
  http.get('*/api/research/v1/runs/:runId/math-verification', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const runId = String(params.runId);
    const store = writingOf(session.tenant);
    void store;
    const script = session.tenant.literature?.runEventScripts.get(runId);
    if (!script) return errorEnvelope('not_found', '运行不存在或已过期。', false, requestId(), 404);
    const progressFrames = script.filter((f) => f.frame.event_type === 'step.progress');
    const completed = script.some((f) => f.frame.event_type === 'run.completed');
    const layers = progressFrames.map((f, i) => ({
      layer: `L${i}`,
      label: (['L0 语法', 'L1 定义域', 'L2 符号', 'L3 数值', 'L4 反例'][i] ?? `L${i}`),
      result: (f.frame.payload as { result?: string } | undefined)?.result ?? 'passed',
      message: f.frame.progress?.message ?? '',
    }));
    return HttpResponse.json(envelope({ run_id: runId, status: completed ? 'succeeded' : 'running', layers }, requestId()));
  }),
];
