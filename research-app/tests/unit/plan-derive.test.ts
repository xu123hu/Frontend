/**
 * 管家计划/审批派生单测（TC-F06-02/03/04）。
 * 覆盖：决策覆盖语义、拒绝保留证据（partial 非 failed）、参数变更失效、脚本派生状态。
 */
import { describe, expect, it } from 'vitest';
import { deriveApprovalStatus, derivePlanStatus, derivePlanView, deriveStepStatus } from '@features/steward/plan-derive';
import type { PlanStep, StewardDecision, StewardPlan } from '@entities/steward/types';
import type { RunEventView } from '@shared/lib/sse';

function evt(partial: Partial<RunEventView> & { event_type: RunEventView['event_type']; sequence: number }): RunEventView {
  return {
    event_id: `evt-${partial.sequence}`,
    run_id: 'run-1',
    occurred_at: new Date().toISOString(),
    actor_id: 'svc',
    actor_type: 'service',
    trace_id: 'trace-1',
    step_id: null,
    error: null,
    progress: null,
    artifact_ids: [],
    payload: {},
    ...partial,
  } as RunEventView;
}

function step(partial: Partial<PlanStep> & { id: string }): PlanStep {
  return { order: 1, title: partial.id, capability: 'compute', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null, ...partial };
}

function plan(partial: Partial<StewardPlan>): StewardPlan {
  return {
    run_id: 'run-1',
    research_question: 'Q?',
    reasoning_policy: 'rigorous',
    status: 'running',
    progress: 50,
    stage_message: null,
    budget: null,
    spent: null,
    steps: [],
    hypotheses: [],
    ...partial,
  };
}

describe('deriveStepStatus（步骤状态派生）', () => {
  it('用户拒绝决策 → rejected（优先于脚本）', () => {
    const s = step({ id: 'st-1', approval_id: 'appr-1' });
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'rejected', params_changed: false, note: '', decided_at: '' }]]);
    expect(deriveStepStatus(s, [evt({ event_type: 'step.started', sequence: 1, step_id: 'st-1' })], decisions, false)).toBe('rejected');
  });

  it('step.failed 脚本 → rejected（拒绝而非 failed，证据保留语义）', () => {
    const s = step({ id: 'st-1' });
    const script = [
      evt({ event_type: 'step.started', sequence: 1, step_id: 'st-1' }),
      evt({ event_type: 'step.failed', sequence: 2, step_id: 'st-1', error: { code: 'step_rejected', message: '用户拒绝', retryable: false } }),
    ];
    expect(deriveStepStatus(s, script, new Map(), false)).toBe('rejected');
  });

  it('审批请求中且未决策 → awaiting_approval', () => {
    const s = step({ id: 'st-1', approval_id: 'appr-1' });
    const script = [evt({ event_type: 'approval.requested', sequence: 1, step_id: 'st-1' })];
    expect(deriveStepStatus(s, script, new Map(), false)).toBe('awaiting_approval');
  });

  it('审批决策 approved 且 run 未完成 → running', () => {
    const s = step({ id: 'st-1', approval_id: 'appr-1' });
    const script = [evt({ event_type: 'approval.requested', sequence: 1, step_id: 'st-1' })];
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'approved', params_changed: false, note: '', decided_at: '' }]]);
    expect(deriveStepStatus(s, script, decisions, false)).toBe('running');
  });

  it('已 started + 产物产生 → succeeded', () => {
    const s = step({ id: 'st-1' });
    const script = [
      evt({ event_type: 'step.started', sequence: 1, step_id: 'st-1' }),
      evt({ event_type: 'artifact.created', sequence: 2, step_id: 'st-1', artifact_ids: ['art-1'] }),
    ];
    expect(deriveStepStatus(s, script, new Map(), false)).toBe('succeeded');
  });

  it('已 started + 后续步骤开始 → succeeded', () => {
    const s = step({ id: 'st-1' });
    const script = [
      evt({ event_type: 'step.started', sequence: 1, step_id: 'st-1' }),
      evt({ event_type: 'step.started', sequence: 2, step_id: 'st-2' }),
    ];
    expect(deriveStepStatus(s, script, new Map(), false)).toBe('succeeded');
  });

  it('无事件 + run 完成 → succeeded；无事件且未完成 → 沿用种子 succeeded', () => {
    const s = step({ id: 'st-1', status: 'succeeded' });
    expect(deriveStepStatus(s, [], new Map(), true)).toBe('succeeded');
    expect(deriveStepStatus(s, [], new Map(), false)).toBe('succeeded');
  });
});

describe('derivePlanStatus（计划综合状态）', () => {
  it('run.failed → failed', () => {
    expect(derivePlanStatus([evt({ event_type: 'run.failed', sequence: 1 })], [])).toBe('failed');
  });

  it('run.completed + 存在 rejected 步骤 → partial（拒绝保留证据，不进入 failed）', () => {
    const steps = [step({ id: 'a', status: 'rejected' }), step({ id: 'b', status: 'succeeded' })];
    expect(derivePlanStatus([evt({ event_type: 'run.completed', sequence: 1 })], steps)).toBe('partial');
  });

  it('run.completed 无拒绝 → succeeded', () => {
    expect(derivePlanStatus([evt({ event_type: 'run.completed', sequence: 1 })], [step({ id: 'a', status: 'succeeded' })])).toBe('succeeded');
  });
});

describe('derivePlanView（计划视图派生）', () => {
  it('有脚本 + 拒绝步骤 → 状态 partial + 替代路径透出（TC-F06-04）', () => {
    const p = plan({ steps: [step({ id: 'st-1' }), step({ id: 'st-2' })] });
    const script = [
      evt({ event_type: 'run.created', sequence: 1 }),
      evt({ event_type: 'step.started', sequence: 2, step_id: 'st-1' }),
      evt({ event_type: 'step.failed', sequence: 3, step_id: 'st-1', payload: { alternative_paths: ['改用符号验证'] } }),
      evt({ event_type: 'step.started', sequence: 4, step_id: 'st-2' }),
      evt({ event_type: 'run.completed', sequence: 5 }),
    ];
    const view = derivePlanView(p, script, new Map());
    expect(view.status).toBe('partial');
    expect(view.steps[0]!.status).toBe('rejected');
    expect(view.steps[0]!.alternative_paths).toContain('改用符号验证');
    expect(view.progress).toBe(100);
  });

  it('无脚本 + 用户批准决策 → 步骤 running（重启恢复语义）', () => {
    const p = plan({ steps: [step({ id: 'st-1', approval_id: 'appr-1' })] });
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'approved', params_changed: false, note: '', decided_at: '' }]]);
    const view = derivePlanView(p, undefined, decisions);
    expect(view.steps[0]!.status).toBe('running');
    expect(view.status).toBe('running');
  });

  it('无脚本 + 用户拒绝决策 → 步骤 rejected + 计划 partial + 证据保留文案', () => {
    const p = plan({ steps: [step({ id: 'st-1', approval_id: 'appr-1' })] });
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'rejected', params_changed: false, note: '', decided_at: '' }]]);
    const view = derivePlanView(p, undefined, decisions);
    expect(view.steps[0]!.status).toBe('rejected');
    expect(view.status).toBe('partial');
    expect(view.steps[0]!.result_summary).toContain('证据保留');
  });
});

describe('deriveApprovalStatus（审批状态派生）', () => {
  it('决策 approved → approved', () => {
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'approved', params_changed: false, note: '', decided_at: '' }]]);
    expect(deriveApprovalStatus(undefined, 'appr-1', decisions, 'pending')).toBe('approved');
  });

  it('决策 + 参数变更 → cancelled（原审批失效，需重审，TC-F06-03）', () => {
    const decisions = new Map<string, StewardDecision>([['appr-1', { decision: 'approved', params_changed: true, note: '', decided_at: '' }]]);
    expect(deriveApprovalStatus(undefined, 'appr-1', decisions, 'pending')).toBe('cancelled');
  });

  it('脚本步骤被拒绝 → 审批 cancelled（失效）', () => {
    const script = [
      evt({ event_type: 'approval.requested', sequence: 1, step_id: 'st-1', payload: { approval: { id: 'appr-1' } } }),
      evt({ event_type: 'step.failed', sequence: 2, step_id: 'st-1' }),
    ];
    expect(deriveApprovalStatus(script, 'appr-1', new Map(), 'pending')).toBe('cancelled');
  });

  it('脚本请求中无决策 → pending', () => {
    const script = [evt({ event_type: 'approval.requested', sequence: 1, step_id: 'st-1', payload: { approval: { id: 'appr-1' } } })];
    expect(deriveApprovalStatus(script, 'appr-1', new Map(), 'pending')).toBe('pending');
  });

  it('无脚本 → fallback', () => {
    expect(deriveApprovalStatus(undefined, 'appr-1', new Map(), 'expired')).toBe('expired');
  });
});
