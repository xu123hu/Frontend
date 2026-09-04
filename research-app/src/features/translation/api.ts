/**
 * 翻译域 API（CR-F3-05 契约草案 + M0 冻结 runs）。
 *
 * - 发起翻译：POST /runs（run_type=translation，冻结）+ SSE 进度/预算
 * - 译文单元：CR-F3-05 草案（按 DocumentIR block_id 组织）
 * - 保真报告：VerificationRecord.method=formula_fidelity 视图（草案端点）
 */
import { apiRequest } from '@app/api/client';
import type { FidelityReport, TranslationRun, TranslationUnit } from '@entities/translation/types';

export interface TranslationAccepted {
  run_id: string;
  events_url: string;
  status: string;
}

/** 发起翻译 run（冻结契约：只发 run_type/input_artifact_ids）。 */
export function startTranslation(itemId: string, idempotencyKey?: string): Promise<TranslationAccepted> {
  return apiRequest<TranslationAccepted>('/runs', {
    method: 'POST',
    body: { run_type: 'translation', input_artifact_ids: [itemId] },
    idempotencyKey,
  }).then((e) => e.data);
}

export function fetchTranslationRun(runId: string, signal?: AbortSignal): Promise<TranslationRun> {
  return apiRequest<TranslationRun>(`/runs/${encodeURIComponent(runId)}`, { signal }).then((e) => e.data);
}

export function fetchTranslationUnits(itemId: string, signal?: AbortSignal): Promise<TranslationUnit[]> {
  return apiRequest<{ items: TranslationUnit[]; next_cursor: string | null }>(
    `/items/${encodeURIComponent(itemId)}/translation-units`,
    { signal },
  ).then((e) => e.data.items);
}

export function fetchFidelityReport(runId: string, signal?: AbortSignal): Promise<FidelityReport> {
  return apiRequest<FidelityReport>(`/runs/${encodeURIComponent(runId)}/fidelity-report`, { signal }).then((e) => e.data);
}
