/**
 * 教育研究实体（F5 收口；M4 §8.1-8.6 + §8.7 契约推导 + 原型 education 视图）。
 * 红线：科研端只查询授权数据产品，不直连学生业务库；任何切片 k<20 拒绝（422 PRIVACY_THRESHOLD_NOT_MET）。
 */
import type { ApiErrorKind } from '@app/api/client';

/** 授权数据产品（M4 §8.1 GET /education/data-products）。 */
export interface EducationDataProduct {
  id: string;
  name: string;
  description: string;
  granularity: string; // 如 "班级×周"
  fields: string[]; // 授权字段白名单
  min_k: number; // education_min_k（平台限制，默认 20）
  retention_days: number;
  purpose_restrictions: string;
}

/** 隐私预检结果（M4 §8.2 POST /education/datasets/preflight；不返回数据）。 */
export interface PreflightResult {
  product_id: string;
  estimated_rows: number;
  min_cell_k: number; // 预检出的最小 cell_k
  classification: 'L1' | 'L2'; // L1 聚合默认；L2 去标识个体数据需双签
  needs_approval: boolean;
}

/** 不可变数据快照（M4 §8.3 POST /education/datasets/query；L1 且所有 cell k≥20 才创建）。 */
export interface DatasetSnapshot {
  id: string;
  product_id: string;
  records: number;
  frozen_at: string;
  hash: string;
  immutable: true;
  parameters: Record<string, string>;
}

/** 统计分析结果（M4 §8.5 POST /education/analyses）。 */
export interface AnalysisResult {
  id: string;
  snapshot_id: string;
  template: string;
  estimate: Record<string, number>;
  interval: [number, number] | null;
  assumptions: string[];
  warnings: string[];
  tool_versions: Record<string, string>;
}

/** 图表导出 artifact（M4 §8.6 POST /education/charts；绑定快照哈希+参数哈希）。 */
export interface ChartExport {
  artifact_id: string;
  format: string;
  snapshot_hash: string;
  params_hash: string;
  download_name: string;
}

/** 教育研究课题（前端演示课题卡，源自原型 educationBrief）。 */
export interface EducationStudy {
  id: string;
  title: string;
  publisher: string;
  dataset: string;
  sample: number;
  minimum: number;
  authorized: boolean;
  analyzed: boolean;
  published: boolean;
}

/** 成果回流发布请求（M4 §9 三端发布；副本+来源链接+版本+撤回）。 */
export interface PublicationRequest {
  id: string;
  study_id: string;
  status: 'pending_approval' | 'approved';
  note: string;
}

export type EducationErrorKind = Extract<ApiErrorKind, 'validation' | 'network' | 'forbidden' | 'server'>;
