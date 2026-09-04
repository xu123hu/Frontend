/**
 * 评审域 MSW 内存库（CR-F4-01..04 契约草案数据）。
 *
 * 仅 dev/test。种子：
 * - 一个评审批次（review-paper-1：分层线性模型论文）。
 * - 4 条待审主张（含前提/证据/支持度），1 条 L4 反例样例 + 1 条 Lean partial_supported 样例。
 * - 2 个修订（作者提交 → 评委复核）。
 */
import type { ReviewClaim, ReviewPaper, Revision, VerificationLayer, LeanThreeStates } from '@entities/review/types';

export interface ReviewStore {
  papers: ReviewPaper[];
  claimsByPaper: Map<string, ReviewClaim[]>;
  revisionsByPaper: Map<string, Revision[]>;
  verificationByClaim: Map<string, VerificationLayer[]>;
  leanByClaim: Map<string, LeanThreeStates>;
}

const iso = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString();
const DAY = 86_400_000;

export function emptyReviewStore(): ReviewStore {
  return { papers: [], claimsByPaper: new Map(), revisionsByPaper: new Map(), verificationByClaim: new Map(), leanByClaim: new Map() };
}

export function seedReviewStore(tenantId: string, projectId: string): ReviewStore {
  const store = emptyReviewStore();
  const paper: ReviewPaper = {
    id: 'review-paper-1',
    project_id: projectId,
    title: '分层线性模型下数学建模成绩差异的多层分析',
    author_suggestions: ['建议补充稳健标准误结果', '建议在讨论段说明反例约束条件'],
    verdict: 'needs_revision',
    created_at: iso(5 * DAY),
    updated_at: iso(1 * DAY),
  };
  const claims: ReviewClaim[] = [
    {
      id: 'cl-1',
      paper_id: paper.id,
      kind: 'formula',
      statement: '\\gamma_{01} > 0 且显著（t=3.4, p<0.01）',
      corrected_statement: null,
      assumptions: ['W_j 为学校资源投入，已中心化'],
      evidence_support: 'supported',
      page_index: 3,
      quote: 'γ01 = 3.2 (SE 0.8)',
    },
    {
      id: 'cl-2',
      paper_id: paper.id,
      kind: 'theorem',
      statement: '当 \\(\\sigma^2 > 0\\) 时，层一残差方差可被层二协变量部分解释',
      corrected_statement: null,
      assumptions: ['r_{ij} \\sim N(0, \\sigma^2)'],
      evidence_support: 'partial',
      page_index: 4,
      quote: '层二协变量解释层一残差方差的 12%',
    },
    {
      id: 'cl-3',
      paper_id: paper.id,
      kind: 'assumption',
      statement: '各学校学生数均大于 50，CLT 适用',
      corrected_statement: null,
      assumptions: [],
      evidence_support: 'conflicting',
      page_index: 5,
      quote: '表 2 显示两所学校 n<50',
    },
    {
      id: 'cl-4',
      paper_id: paper.id,
      kind: 'formula',
      statement: '\\beta_{0j} 的跨校变异可由单一学校水平变量 W_j 完全解释',
      corrected_statement: null,
      assumptions: ['u_{0j} \\sim N(0, \\tau_{00})', '\\tau_{00} > 0'],
      evidence_support: 'not_verified',
      page_index: 6,
      quote: '\\tau_{00} 在加入 W_j 后降为不显著',
    },
  ];
  store.papers.push(paper);
  store.claimsByPaper.set(paper.id, claims);

  // cl-4 的分层验证：L0-L3 通过，L4 反例发现（06 §7 步骤 3 反例带代入值/前提检查/复算）
  store.verificationByClaim.set('cl-4', [
    { layer: 'L0', label: '语法', method: 'syntax', status: 'passed', summary: 'LaTeX 解析无错误', tool_name: 'LaTeX parser', tool_version: '0.1', counterexample: null },
    { layer: 'L1', label: '定义域', method: 'assumption', status: 'passed', summary: '前提 \\tau_{00}>0 满足', tool_name: 'sympy', tool_version: '1.12', counterexample: null },
    { layer: 'L2', label: '符号', method: 'symbolic', status: 'passed', summary: '符号推导闭合', tool_name: 'sympy', tool_version: '1.12', counterexample: null },
    { layer: 'L3', label: '数值', method: 'numeric', status: 'passed', summary: '随机抽样 100 组参数无异常', tool_name: 'numpy', tool_version: '1.26', counterexample: null },
    {
      layer: 'L4',
      label: '反例',
      method: 'counterexample',
      status: 'failed',
      summary: '发现反例：单一 W_j 不能完全解释跨校变异（存在不可观测校间因子）',
      tool_name: 'sympy',
      tool_version: '1.12',
      counterexample: {
        assignment: '设两学校 W=0 但 u_0 分别为 -1 与 +1，模型给出相同 β0 预测',
        assumption_check: '前提满足（\\tau_{00}>0）——反例不因前提失效而作废',
        recompute: '复算确认 β0 相同而实际 u_0 不同 → 完全解释不成立',
      },
    },
  ]);

  // cl-2 的 Lean 三状态：翻译 partial + 内核 succeeded + 结论 partial → 综合 partial_supported
  store.leanByClaim.set('cl-2', {
    translation_fidelity: 'partial',
    kernel_status: 'succeeded',
    claim_support: 'partial',
    overall: 'partial_supported',
    sorry_admit_free: true,
    diagnostics: ['statement 中「部分解释」量化不精确，形式化翻译降低了断言强度', '内核接受：无 sorry/admit'],
  });

  const revisions: Revision[] = [
    { id: 'rev-1', paper_id: paper.id, version: 1, summary: '补充 L4 反例约束说明与稳健标准误', diff: '讨论段新增反例适用条件；表 4 增加稳健 SE 列', status: 'pending_review', reviewer_note: null, created_at: iso(2 * DAY) },
    { id: 'rev-2', paper_id: paper.id, version: 2, summary: '弱化 cl-4 主张为「部分解释」', diff: '结论段将「完全解释」改为「部分解释」，附 cl-2 反例引用', status: 'approved', reviewer_note: '反例处理正确，主张强度与证据匹配。', created_at: iso(1 * DAY) },
  ];
  store.revisionsByPaper.set(paper.id, revisions);
  void tenantId;
  return store;
}
