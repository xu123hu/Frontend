/**
 * AI 管家域 MSW 请求处理器（CR-F4-05 契约草案）。
 *
 * - 计划/步骤：草案端点 GET /steward/plans(/:runId)；状态由 run 事件脚本派生（非静态假状态）。
 * - 审批：GET /steward/approvals + POST /steward/approvals/:id/decision（参数变更 → 失效 cancelled）。
 * - 研究循环产物：GET /runs/:runId/cycle-result（06 §8 步骤 8）。
 */
import { http, HttpResponse, delay } from 'msw';
import { envelope, errorEnvelope, requestId, readSession } from './http-helpers';
import { stewardOf } from './steward-db';
import { deriveApprovalStatus, derivePlanView } from '@features/steward/plan-derive';
import type { ApprovalView, PlanStep } from '@entities/steward/types';
import type { RunEventView } from '@shared/lib/sse';
import type { TenantRecord } from './db';

type EventScript = { frame: RunEventView; delayMs: number }[];
type SessionRef = { tenant: TenantRecord };

/** 事件脚本（回放帧）→ 纯事件数组（派生层输入）。 */
function toEvents(script: EventScript | undefined): RunEventView[] | undefined {
  return script?.map((f) => f.frame);
}

/** 从 run 事件脚本派生未播种的审批卡（approval.requested payload → ApprovalView）。 */
function deriveApprovalFromScript(script: EventScript, approvalId: string, runId: string): ApprovalView | null {
  const requested = script.find(
    (e) => e.frame.event_type === 'approval.requested' && (e.frame.payload as { approval?: { id?: string } } | undefined)?.approval?.id === approvalId,
  );
  if (!requested) return null;
  const a = (requested.frame.payload as { approval: Record<string, unknown> }).approval;
  return {
    id: String(a.id),
    run_id: runId,
    risk_tier: (a.risk_tier as ApprovalView['risk_tier']) ?? 'high',
    action: String(a.action),
    reason: '研究循环步骤触发高风险工具，需要用户审批。',
    arguments_redacted: (a.arguments_redacted as Record<string, string>) ?? {},
    arguments_hash: String(a.arguments_hash ?? ''),
    estimated_cost_minor_units: null,
    data_scope: [],
    status: 'pending',
    requested_at: requested.frame.occurred_at,
    expires_at: null,
    resolution_note: null,
  };
}

/** 汇总租户全部审批：播种卡 + 从事件脚本派生的卡（决策覆盖状态）。 */
function collectApprovals(session: SessionRef): ApprovalView[] {
  const store = stewardOf(session.tenant);
  const out: ApprovalView[] = [];
  for (const appr of store.approvals.values()) {
    const script = session.tenant.literature?.runEventScripts.get(appr.run_id);
    out.push({
      ...appr,
      status: deriveApprovalStatus(toEvents(script), appr.id, store.decisions, appr.status),
    });
  }
  for (const [runId, script] of session.tenant.literature?.runEventScripts ?? []) {
    for (const frameWrap of script) {
      const approvalId = (frameWrap.frame.payload as { approval?: { id?: string } } | undefined)?.approval?.id;
      if (frameWrap.frame.event_type !== 'approval.requested' || !approvalId || store.approvals.has(approvalId)) continue;
      const derived = deriveApprovalFromScript(script, approvalId, runId);
      if (derived) {
        out.push({
          ...derived,
          status: deriveApprovalStatus(toEvents(script), approvalId, store.decisions, 'pending'),
        });
      }
    }
  }
  return out;
}

export const stewardHandlers = [
  // ---------- 计划（CR-F4-05） ----------
  http.get('*/api/research/v1/steward/plans', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = stewardOf(session.tenant);
    const items = Array.from(store.plans.keys()).map((runId) =>
      derivePlanView(store.plans.get(runId)!, toEvents(session.tenant.literature?.runEventScripts.get(runId)), store.decisions),
    );
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.get('*/api/research/v1/steward/plans/:runId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = stewardOf(session.tenant);
    const runId = String(params.runId);
    const plan = store.plans.get(runId);
    if (!plan) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    return HttpResponse.json(envelope(derivePlanView(plan, toEvents(session.tenant.literature?.runEventScripts.get(runId)), store.decisions), requestId()));
  }),

  // ---------- 审批（CR-F4-05：ApprovalRequest 视图 + 决策） ----------
  http.get('*/api/research/v1/steward/approvals', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    return HttpResponse.json(envelope({ items: collectApprovals(session), next_cursor: null }, requestId()));
  }),

  http.post('*/api/research/v1/steward/approvals/:approvalId/decision', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { decision?: string; params_changed?: boolean };
    if (body.decision !== 'approved' && body.decision !== 'rejected') {
      return errorEnvelope('validation_failed', 'decision 仅接受 approved / rejected。', false, requestId(), 422);
    }
    const store = stewardOf(session.tenant);
    const approvalId = String(params.approvalId);
    const seeded = store.approvals.get(approvalId);
    // 审批现状：播种卡或从事件脚本派生（实时研究循环）。
    const script = seeded ? session.tenant.literature?.runEventScripts.get(seeded.run_id) : undefined;
    const currentStatus = deriveApprovalStatus(toEvents(script), approvalId, store.decisions, seeded?.status ?? 'pending');
    if (currentStatus !== 'pending') {
      return errorEnvelope(
        'conflict',
        currentStatus === 'cancelled' ? '审批已失效（参数变更或步骤被拒绝），需重新发起审批。' : '该审批已决策或已过期。',
        false,
        requestId(),
        409,
      );
    }
    const paramsChanged = body.params_changed === true;
    store.decisions.set(approvalId, {
      decision: body.decision,
      params_changed: paramsChanged,
      note: paramsChanged ? '参数已变更（哈希不匹配），原审批失效，需重新发起审批。' : body.decision === 'approved' ? '用户批准该高风险步骤。' : '用户拒绝该步骤；已完成证据保留。',
      decided_at: new Date().toISOString(),
    });
    if (seeded) {
      seeded.status = paramsChanged ? 'cancelled' : body.decision;
      seeded.resolution_note = store.decisions.get(approvalId)!.note;
    }
    await delay(150);
    const view = collectApprovals(session).find((a) => a.id === approvalId);
    return HttpResponse.json(envelope(view ?? seeded, requestId()));
  }),

  // ---------- 研究循环产物（06 §8 步骤 8） ----------
  http.get('*/api/research/v1/runs/:runId/cycle-result', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = stewardOf(session.tenant);
    const runId = String(params.runId);
    const result = store.results.get(runId);
    if (result) return HttpResponse.json(envelope(result, requestId()));
    // 实时运行：完成后从事件脚本生成产物（假设来自 hypothesis 步骤 payload）。
    const script = session.tenant.literature?.runEventScripts.get(runId);
    if (!script) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    if (!script.some((e) => e.frame.event_type === 'run.completed')) {
      return errorEnvelope('not_ready', '研究循环尚未完成，产物生成中。', true, requestId(), 409);
    }
    const plan = store.plans.get(runId);
    const hypothesisEvent = script.find((e) => e.frame.event_type === 'step.started' && e.frame.step_id === 'hypothesis');
    const hypotheses = ((hypothesisEvent?.frame.payload as { hypotheses?: string[] } | undefined)?.hypotheses ?? plan?.hypotheses.map((h) => h.text) ?? []).map(
      (text) => ({ text: text.replace(/^假设 H\d+：/, ''), marked: 'hypothesis' as const }),
    );
    const rejectedStep = script.find((e) => e.frame.event_type === 'step.failed');
    const alternative = ((rejectedStep?.frame.payload as { alternative_paths?: string[] } | undefined)?.alternative_paths ?? []).join('；');
    const question = (script.find((e) => e.frame.event_type === 'run.completed')?.frame.payload as { research_question?: string } | undefined)?.research_question
      ?? plan?.research_question
      ?? '';
    return HttpResponse.json(
      envelope(
        {
          research_question: question,
          hypotheses,
          claims: hypotheses.slice(0, 1).map((h) => ({ text: `${h.text}（符号验证通过）`, support: 'partial', evidence_ids: [] })),
          verification: [
            { item: '文献证据链', status: 'passed', tool: 'literature_search' },
            { item: alternative ? `数值复算（用户拒绝；替代：${alternative}）` : '数值复算', status: 'rejected_by_user', tool: '—（用户拒绝）' },
          ],
          limitations: [alternative ? `数值复算被用户拒绝，改用替代路径：${alternative}` : '数值复算被用户拒绝', '结果为单次研究循环产物，外推需谨慎'],
          human_decisions: ['拒绝数值复算步骤', alternative ? `采用替代路径：${alternative}` : '保留已完成证据'],
        },
        requestId(),
      ),
    );
  }),
];

/** 供 literature-handlers 在创建 research_cycle run 时播种计划（步骤 id 与事件脚本对齐）。 */
export function seedLivePlan(
  session: SessionRef,
  runId: string,
  question: string,
  hypotheses: Array<{ id: string; text: string; marked: 'hypothesis' }>,
): void {
  const store = stewardOf(session.tenant);
  const steps: PlanStep[] = [
    { id: 'retrieve', order: 1, title: '文献检索与分片', capability: 'literature_search', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null },
    { id: 'hypothesis', order: 2, title: '候选假设生成', capability: 'generation', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null },
    { id: 'compute', order: 3, title: '数值复算（高风险工具）', capability: 'compute', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null },
    { id: 'symbolic', order: 4, title: '符号验证（替代路径）', capability: 'symbolic', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null },
  ];
  store.plans.set(runId, {
    run_id: runId,
    research_question: question,
    reasoning_policy: 'rigorous',
    status: 'running',
    progress: 5,
    stage_message: '研究循环已启动',
    budget: { max_cost_minor_units: 5000, max_runtime_seconds: 3600 },
    spent: { cost_minor_units: 0, runtime_seconds: 0 },
    steps,
    hypotheses,
  });
}
