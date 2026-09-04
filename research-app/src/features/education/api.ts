/**
 * 教育研究域 API（CR-F5-01 契约草案，对齐 M4 §8.1-8.6）。
 * - 数据产品 / 隐私预检 / 数据快照（k<20 → 422 PRIVACY_THRESHOLD_NOT_MET）/ 分析 / 图表 / 成果回流
 */
import { apiRequest } from '@app/api/client';
import type { AnalysisResult, ChartExport, DatasetSnapshot, EducationDataProduct, EducationStudy, PreflightResult, PublicationRequest } from '@entities/education/types';

export function fetchEducationStudy(signal?: AbortSignal): Promise<EducationStudy> {
  return apiRequest<EducationStudy>('/education/study', { signal }).then((e) => e.data);
}

export function fetchDataProducts(signal?: AbortSignal): Promise<EducationDataProduct[]> {
  return apiRequest<{ items: EducationDataProduct[]; next_cursor: string | null }>('/education/data-products', { signal }).then((e) => e.data.items);
}

export function runPreflight(productId: string, scope: Record<string, string>, signal?: AbortSignal): Promise<PreflightResult> {
  return apiRequest<PreflightResult>('/education/datasets/preflight', {
    method: 'POST',
    body: { product_id: productId, scope },
    signal,
  }).then((e) => e.data);
}

/** 创建数据快照：L1 且所有 cell k≥20；否则 422 PRIVACY_THRESHOLD_NOT_MET（由调用方捕获展示，不伪造成功）。 */
export function createSnapshot(productId: string, scope: Record<string, string>, signal?: AbortSignal): Promise<DatasetSnapshot> {
  return apiRequest<DatasetSnapshot>('/education/datasets/query', {
    method: 'POST',
    body: { product_id: productId, scope },
    signal,
  }).then((e) => e.data);
}

export function runAnalysis(snapshotId: string, signal?: AbortSignal): Promise<AnalysisResult> {
  return apiRequest<AnalysisResult>('/education/analyses', {
    method: 'POST',
    body: { snapshot_id: snapshotId, template: 'pre_post_stratified', params: {} },
    signal,
  }).then((e) => e.data);
}

export function exportChart(snapshotId: string, format: string, signal?: AbortSignal): Promise<ChartExport> {
  return apiRequest<ChartExport>('/education/charts', {
    method: 'POST',
    body: { snapshot_id: snapshotId, format },
    signal,
  }).then((e) => e.data);
}

export function requestPublication(studyId: string, signal?: AbortSignal): Promise<PublicationRequest> {
  return apiRequest<PublicationRequest>('/education/publication/request', {
    method: 'POST',
    body: { study_id: studyId },
    signal,
  }).then((e) => e.data);
}
