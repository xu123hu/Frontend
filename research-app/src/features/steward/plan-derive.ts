/**
 * 管家计划/审批派生（纯函数，单测覆盖 tests/unit/plan-derive.test.ts）。
 *
 * mock 的事件脚本是静态回放（run-simulator），用户审批决策在派生层覆盖：
 * - 决策 approved → 对应步骤最终 succeeded（审批通过后执行）。
 * - 决策 rejected / 脚本 step.failed(step_rejected) → 步骤 rejected（证据保留，不进入 failed）。
 * - 计划完成且存在 rejected 步骤 → 综合 partial（06 §8 步骤 7）。
 */
import type { RunEventView } from '@shared/lib/sse';
import type { PlanStep, PlanStepStatus, StewardPlan, StewardDecision } from '@entities/steward/types';

function stepEvents(script: RunEventView[], stepId: string): RunEventView[] {
  return script.filter((e) => e.step_id === stepId);
}

/** 单步骤状态派生：决策 > 脚本终态 > 脚本进行态 > 种子状态。 */
export function deriveStepStatus(
  step: PlanStep,
  script: RunEventView[],
  decisions: ReadonlyMap<string, StewardDecision>,
  runCompleted: boolean,
): PlanStepStatus {
  const events = stepEvents(script, step.id);
  const approvalId = step.approval_id;
  const decision = approvalId ? decisions.get(approvalId) : undefined;

  if (decision?.decision === 'rejected') return 'rejected';
  if (decision?.decision === 'approved' && runCompleted) return 'succeeded';

  if (events.some((e) => e.event_type === 'step.failed')) return 'rejected';
  if (approvalId && events.some((e) => e.event_type === 'approval.requested')) {
    return decision?.decision === 'approved' ? 'running' : 'awaiting_approval';
  }
  if (events.some((e) => e.event_type === 'step.started')) {
    // 完成判据：产物产生 / 后续步骤已开始 / run 完成。
    const startedSeq = events.find((e) => e.event_type === 'step.started')!.sequence;
    const hasArtifact = events.some((e) => e.event_type === 'artifact.created');
    const laterStepStarted = script.some((e) => e.event_type === 'step.started' && e.step_id !== step.id && e.sequence > startedSeq);
    if (hasArtifact || laterStepStarted || runCompleted) return 'succeeded';
    return 'running';
  }
  if (runCompleted) return 'succeeded';
  return step.status === 'succeeded' ? 'succeeded' : 'pending';
}

/** 计划状态派生：run.failed → failed；完成 + 存在 rejected 步骤 → partial（拒绝保留证据）。 */
export function derivePlanStatus(
  script: RunEventView[],
  steps: PlanStep[],
): StewardPlan['status'] {
  if (script.some((e) => e.event_type === 'run.failed')) return 'failed';
  if (script.some((e) => e.event_type === 'run.completed')) {
    return steps.some((s) => s.status === 'rejected') ? 'partial' : 'succeeded';
  }
  if (steps.some((s) => s.status === 'running' || s.status === 'awaiting_approval')) return 'running';
  return 'running';
}

/** 由事件脚本派生实时计划视图（mock 服务端语义；UI 直接渲染返回值）。
 * 无脚本（静态种子/重启恢复场景）时仅应用用户决策：approved → running、rejected → rejected+partial。 */
export function derivePlanView(plan: StewardPlan, script: RunEventView[] | undefined, decisions: ReadonlyMap<string, StewardDecision>): StewardPlan {
  const hasScript = !!script && script.length > 0;
  const runCompleted = hasScript && script!.some((e) => e.event_type === 'run.completed');

  if (!hasScript) {
    const steps: PlanStep[] = plan.steps.map((step) => {
      const decision = step.approval_id ? decisions.get(step.approval_id) : undefined;
      if (decision?.decision === 'approved') return { ...step, status: 'running' as const };
      if (decision?.decision === 'rejected') return { ...step, status: 'rejected' as const, result_summary: '用户拒绝该步骤，已完成证据保留' };
      return step;
    });
    const anyRejected = steps.some((s) => s.status === 'rejected');
    return {
      ...plan,
      steps,
      status: anyRejected ? 'partial' : plan.status,
      stage_message: anyRejected ? '步骤被拒绝，已完成证据保留；剩余步骤需重新规划' : plan.stage_message,
    };
  }

  const steps: PlanStep[] = plan.steps.map((step) => {
    const status = deriveStepStatus(step, script!, decisions, runCompleted);
    const rejected = stepEvents(script!, step.id).find((e) => e.event_type === 'step.failed');
    const alternativePaths = (rejected?.payload as { alternative_paths?: string[] } | undefined)?.alternative_paths ?? step.alternative_paths;
    const artifact = script!.find((e) => e.step_id === step.id && e.event_type === 'artifact.created');
    const resultSummary =
      status === 'succeeded'
        ? artifact
          ? `产物：${(artifact.payload as { artifact_type?: string } | undefined)?.artifact_type ?? 'artifact'}`
          : (step.result_summary ?? '已完成')
        : status === 'rejected'
          ? '用户拒绝该步骤，已完成证据保留'
          : step.result_summary;
    return { ...step, status, alternative_paths: alternativePaths, result_summary: resultSummary };
  });
  const status = derivePlanStatus(script!, steps);
  return { ...plan, steps, status, progress: runCompleted ? 100 : plan.progress };
}

/** 审批状态派生：决策 > 脚本拒绝失效 > 脚本请求中 pending。 */
export function deriveApprovalStatus(
  script: RunEventView[] | undefined,
  approvalId: string,
  decisions: ReadonlyMap<string, StewardDecision>,
  fallbackStatus: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled',
): 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' {
  const decision = decisions.get(approvalId);
  if (decision) {
    if (decision.params_changed) return 'cancelled';
    return decision.decision === 'approved' ? 'approved' : 'rejected';
  }
  if (!script || script.length === 0) return fallbackStatus;
  const requested = script.find((e) => e.event_type === 'approval.requested' && (e.payload as { approval?: { id?: string } } | undefined)?.approval?.id === approvalId);
  if (!requested) return fallbackStatus;
  const stepFailed = script.find((e) => e.event_type === 'step.failed' && e.step_id === requested.step_id);
  if (stepFailed) return 'cancelled';
  return 'pending';
}
