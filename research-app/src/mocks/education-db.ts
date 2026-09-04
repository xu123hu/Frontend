/**
 * 教育研究域 mock 数据（CR-F5-01 草案）。
 * 契约对齐 M4 §8.1-8.6 + §8.7：只查询授权数据产品；L1 聚合默认；任一切片 k<20 拒绝。
 * 演示课题卡对齐原型 educationBrief（EDU-31 语义）。
 */
import type { AnalysisResult, DatasetSnapshot, EducationDataProduct, EducationStudy, PublicationRequest } from '@entities/education/types';

export interface EducationStore {
  study: EducationStudy;
  products: EducationDataProduct[];
  snapshots: Map<string, DatasetSnapshot>;
  analyses: Map<string, AnalysisResult>;
  publications: Map<string, PublicationRequest>;
}

export function seedEducationStore(): EducationStore {
  return {
    study: {
      id: 'EDU-31',
      title: '建模训练能否降低符号与量纲错误？',
      publisher: '高一数学建模教研组',
      dataset: '训练论文匿名错误数据 v3',
      sample: 184,
      minimum: 20,
      authorized: false,
      analyzed: false,
      published: false,
    },
    products: [
      {
        id: 'ldp_mastery_v2',
        name: '训练论文匿名错误数据 v3（L1 聚合）',
        description: '训练前后建模论文的符号/量纲错误率，按班级×周聚合；不含任何个体身份字段。',
        granularity: '班级×周',
        fields: ['错误类型', '错误率', '班级_id_hash', '周次'],
        min_k: 20,
        retention_days: 180,
        purpose_restrictions: '仅用于建模表达能力研究，有效期至项目结束。',
      },
    ],
    snapshots: new Map(),
    analyses: new Map(),
    publications: new Map(),
  };
}
