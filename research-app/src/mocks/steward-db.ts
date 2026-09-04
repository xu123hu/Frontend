/**
 * AI 管家域 MSW 内存库（CR-F4-05 契约草案数据）。
 *
 * 仅 dev/test。种子：
 * - run-cycle-seed-1：已完成研究循环（含被拒绝步骤 → 综合 partial，证据保留）+ 产物。
 * - run-cycle-seed-2：运行中计划（步骤 3 等待审批 → 球体 waiting 态；审批卡 pending 可决策）。
 * - 审批卡：appr-seed-1（已随拒绝失效 cancelled）、appr-seed-2（pending，参数哈希绑定）。
 */
import type { ApprovalView, PlanStep, ResearchCycleResult, StewardPlan, StewardDecision } from '@entities/steward/types';
import type { TenantRecord } from './db';

export interface StewardStore {
  plans: Map<string, StewardPlan>;
  approvals: Map<string, ApprovalView>;
  results: Map<string, ResearchCycleResult>;
  /** 审批决策（HumanDecision 审计语义；run 事件脚本为静态回放，决策在派生层覆盖）。 */
  decisions: Map<string, StewardDecision>;
}

export function emptyStewardStore(): StewardStore {
  return { plans: new Map(), approvals: new Map(), results: new Map(), decisions: new Map() };
}

/** 管家域懒初始化（首次命中管家端点/发起研究循环时播种）。 */
export function stewardOf(tenant: TenantRecord): StewardStore {
  if (!tenant.steward) tenant.steward = seedStewardStore();
  return tenant.steward;
}

export function seedStewardStore(): StewardStore {
  const store = emptyStewardStore();
  const runId = 'run-cycle-seed-1';
  const steps: PlanStep[] = [
    { id: 'st-1', order: 1, title: '文献检索与分片', capability: 'literature_search', status: 'succeeded', result_summary: '检索 3 片文献，分片完成', alternative_paths: [], approval_id: null },
    { id: 'st-2', order: 2, title: '候选假设生成', capability: 'generation', status: 'succeeded', result_summary: '生成 2 个候选假设（均标记为假设）', alternative_paths: [], approval_id: null },
    { id: 'st-3', order: 3, title: '数值复算（高风险工具）', capability: 'compute', status: 'rejected', result_summary: null, alternative_paths: ['改用已核验文献中的数值结果', '仅保留符号验证'], approval_id: 'appr-seed-1' },
    { id: 'st-4', order: 4, title: '符号验证（替代路径）', capability: 'symbolic', status: 'succeeded', result_summary: '符号验证通过', alternative_paths: [], approval_id: null },
  ];
  store.plans.set(runId, {
    run_id: runId,
    research_question: '学校资源投入如何影响分层模型下的数学成绩差异？',
    reasoning_policy: 'rigorous',
    // 拒绝后保留证据 → 不进入 failed/succeeded，综合 partial（TC-F06-04）。
    status: 'partial',
    progress: 100,
    stage_message: '研究循环完成（含被拒绝步骤，已完成证据保留）',
    budget: { max_cost_minor_units: 5000, max_runtime_seconds: 3600 },
    spent: { cost_minor_units: 860, runtime_seconds: 420 },
    steps,
    hypotheses: [
      { id: 'h-1', text: '学校资源投入显著解释校间截距差异', marked: 'hypothesis' },
      { id: 'h-2', text: '个体 SES 效应跨校稳定', marked: 'hypothesis' },
    ],
  });
  store.approvals.set('appr-seed-1', {
    id: 'appr-seed-1',
    run_id: runId,
    risk_tier: 'high',
    action: 'run_python_compute',
    reason: '在项目数据集上执行数值复算，属代码执行高风险工具。',
    arguments_redacted: { dataset: 'schools_2024.csv', model: 'hlm_2level' },
    arguments_hash: 'sha256:abc123',
    estimated_cost_minor_units: 120,
    data_scope: ['本项目数据集'],
    status: 'cancelled',
    requested_at: iso(3600_000),
    expires_at: iso(0),
    resolution_note: '用户拒绝该步骤，参数未变更；审批随拒绝失效。',
  });
  store.results.set(runId, {
    research_question: '学校资源投入如何影响分层模型下的数学成绩差异？',
    hypotheses: [
      { text: '学校资源投入显著解释校间截距差异', marked: 'hypothesis' },
      { text: '个体 SES 效应跨校稳定', marked: 'hypothesis' },
    ],
    claims: [
      { text: '学校资源投入与校间截距正相关', support: 'partial', evidence_ids: ['ev-1', 'ev-2'] },
      { text: '个体 SES 效应跨校稳定', support: 'insufficient_evidence', evidence_ids: [] },
    ],
    verification: [
      { item: '校间截距模型', status: 'passed', tool: 'sympy 1.12' },
      { item: '数值复算', status: 'rejected_by_user', tool: '—（用户拒绝）' },
    ],
    limitations: ['数值复算被用户拒绝，仅符号验证通过', '样本为单项目数据，外推受限'],
    human_decisions: ['拒绝数值复算步骤', '改用符号验证替代路径'],
  });

  // 运行中计划 + pending 审批（球体 waiting 联动 + 审批决策用例载体，TC-F06-03）。
  const runId2 = 'run-cycle-seed-2';
  store.plans.set(runId2, {
    run_id: runId2,
    research_question: '椭圆上任意点反射线聚焦性质是否可由符号推导确认？',
    reasoning_policy: 'rigorous',
    status: 'running',
    progress: 45,
    stage_message: '步骤 3 等待高风险工具审批',
    budget: { max_cost_minor_units: 5000, max_runtime_seconds: 3600 },
    spent: { cost_minor_units: 320, runtime_seconds: 180 },
    steps: [
      { id: 'st-1', order: 1, title: '文献检索与分片', capability: 'literature_search', status: 'succeeded', result_summary: '检索 2 片文献', alternative_paths: [], approval_id: null },
      { id: 'st-2', order: 2, title: '候选假设生成', capability: 'generation', status: 'succeeded', result_summary: '生成 1 个候选假设', alternative_paths: [], approval_id: null },
      { id: 'st-3', order: 3, title: '符号引擎执行（高风险工具）', capability: 'symbolic', status: 'awaiting_approval', result_summary: null, alternative_paths: [], approval_id: 'appr-seed-2' },
      { id: 'st-4', order: 4, title: '证据汇总与产物生成', capability: 'report', status: 'pending', result_summary: null, alternative_paths: [], approval_id: null },
    ],
    hypotheses: [{ id: 'h-1', text: '反射线恒过另一焦点', marked: 'hypothesis' }],
  });
  store.approvals.set('appr-seed-2', {
    id: 'appr-seed-2',
    run_id: runId2,
    risk_tier: 'high',
    action: 'run_lean_kernel',
    reason: '执行 Lean 内核对反射性质做形式化检查，属计算资源高风险工具。',
    arguments_redacted: { target: 'ellipse_reflection.lean', timeout_seconds: '600' },
    arguments_hash: 'sha256:def456',
    estimated_cost_minor_units: 200,
    data_scope: ['本项目形式化脚本'],
    status: 'pending',
    requested_at: iso(120_000),
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    resolution_note: null,
  });
  return store;
}

function iso(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}
