/**
 * 运行（ResearchRun）实体 —— 类型与 M0 冻结契约（m0-openapi-v0.1.0.json）对齐，
 * 生成类型见 `@app/api/m0-schema.gen.d.ts`（components.schemas.ResearchRun/RunStatus/RunType）。
 *
 * 差距：M0 v0.1.0 无 `GET /runs` 列表端点 → 列表读取按 M4 v2.0 `GET /runs`（CR-F1-06），
 * 其响应 data 同样为空 schema，本文件字段以 M0 ResearchRun 必填集为准。
 */
import type { components } from '@app/api/m0-schema.gen';

export type RunStatus = components['schemas']['RunStatus'];
export type RunType = components['schemas']['RunType'];
export type ReasoningPolicyId = components['schemas']['ReasoningPolicyId'];

/** M0 components.schemas.ResearchRun（必填集对齐）。 */
export interface Run {
  id: string;
  tenant_id: string;
  project_id: string;
  run_type: RunType;
  status: RunStatus;
  reasoning_policy_id: ReasoningPolicyId;
  budget: {
    max_cost_minor_units: number;
    currency: string;
    max_runtime_seconds: number;
    max_parallel_tasks: number;
    max_sources: number;
  };
  spent?: {
    cost_minor_units: number;
    model_tokens: number;
    runtime_seconds: number;
    tool_calls: number;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  literature_search: '文献检索',
  document_parse: '文档解析',
  translation: '翻译',
  writing: '写作',
  review: '评审',
  math_verification: '数学验证',
  research_cycle: '研究循环',
};

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  queued: '排队中',
  running: '运行中',
  waiting_for_approval: '等待审批',
  paused: '已暂停',
  succeeded: '已完成',
  failed: '已失败',
  cancelled: '已取消',
};
