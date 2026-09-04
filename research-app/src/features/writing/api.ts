/**
 * 写作域 API（CR-F3-01..04 契约草案 + M0 冻结 runs）。
 *
 * - 文稿/文件 CRUD：CR-F3-01（草案）
 * - 编译 run：CR-F3-02 → M0 冻结 POST /runs（run_type=writing）+ SSE
 * - AI diff：CR-F3-03（草案：建议列表 + 决策审计）
 * - 引用插入：CR-F3-04（草案：候选仅已核验 CitationRecord；.bib 更新）
 */
import { apiRequest } from '@app/api/client';
import type {
  AiSuggestion,
  CitationCandidate,
  CompileRun,
  Manuscript,
  ManuscriptFile,
} from '@entities/writing/types';

export interface ManuscriptList {
  items: Manuscript[];
  next_cursor: string | null;
}

export function fetchManuscripts(projectId: string, signal?: AbortSignal): Promise<ManuscriptList> {
  return apiRequest<ManuscriptList>(`/projects/${encodeURIComponent(projectId)}/manuscripts`, { signal }).then((e) => e.data);
}

export function fetchManuscript(manuscriptId: string, signal?: AbortSignal): Promise<Manuscript> {
  return apiRequest<Manuscript>(`/manuscripts/${encodeURIComponent(manuscriptId)}`, { signal }).then((e) => e.data);
}

export function createManuscript(projectId: string, name: string, idempotencyKey: string): Promise<Manuscript> {
  return apiRequest<Manuscript>('/manuscripts', {
    method: 'POST',
    body: { project_id: projectId, name },
    idempotencyKey,
  }).then((e) => e.data);
}

export function fetchManuscriptFiles(manuscriptId: string, signal?: AbortSignal): Promise<ManuscriptFile[]> {
  return apiRequest<{ items: ManuscriptFile[]; next_cursor: string | null }>(
    `/manuscripts/${encodeURIComponent(manuscriptId)}/files`,
    { signal },
  ).then((e) => e.data.items);
}

/** 保存文件内容（乐观锁 version；409 冲突原样抛 ApiError）。 */
export function saveFileContent(fileId: string, content: string, version: number): Promise<ManuscriptFile> {
  return apiRequest<ManuscriptFile>(`/files/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    body: { content, version },
  }).then((e) => e.data);
}

export function fetchSuggestions(manuscriptId: string, signal?: AbortSignal): Promise<AiSuggestion[]> {
  return apiRequest<{ items: AiSuggestion[]; next_cursor: string | null }>(
    `/manuscripts/${encodeURIComponent(manuscriptId)}/suggestions`,
    { signal },
  ).then((e) => e.data.items);
}

/** AI diff 决策（接受/拒绝，写入 HumanDecision 审计；拒绝项不写入源文件）。 */
export function decideSuggestion(suggestionId: string, accept: boolean): Promise<AiSuggestion> {
  return apiRequest<AiSuggestion>(`/suggestions/${encodeURIComponent(suggestionId)}/decision`, {
    method: 'POST',
    body: { accept },
  }).then((e) => e.data);
}

export function fetchCitationCandidates(manuscriptId: string, signal?: AbortSignal): Promise<CitationCandidate[]> {
  return apiRequest<{ items: CitationCandidate[]; next_cursor: string | null }>(
    `/manuscripts/${encodeURIComponent(manuscriptId)}/citations`,
    { signal },
  ).then((e) => e.data.items);
}

/** 插入引用：更新 references.bib + 返回引用 key（冲突 key 前缀处理由服务端承担）。 */
export function insertCitation(manuscriptId: string, itemId: string, idempotencyKey: string): Promise<{ citation_key: string; bib_entry: string }> {
  return apiRequest<{ citation_key: string; bib_entry: string }>(`/manuscripts/${encodeURIComponent(manuscriptId)}/citations`, {
    method: 'POST',
    body: { item_id: itemId },
    idempotencyKey,
  }).then((e) => e.data);
}

// ---------- 编译 run（CR-F3-02：M0 冻结） ----------

export interface CompileAccepted {
  run_id: string;
  events_url: string;
  status: string;
}

export interface StartCompileOptions {
  idempotencyKey?: string;
  /** 仅 dev/test 演练钩子（与 F2 simulate_unavailable 同性质）：编译失败场景。 */
  mockScenario?: 'success' | 'missing_resource' | 'unsafe_command';
}

export function startCompile(manuscriptId: string, options: StartCompileOptions = {}): Promise<CompileAccepted> {
  return apiRequest<CompileAccepted>('/runs', {
    method: 'POST',
    body: {
      run_type: 'writing',
      input_artifact_ids: [manuscriptId],
      ...(options.mockScenario ? { mock_scenario: options.mockScenario } : {}),
    },
    idempotencyKey: options.idempotencyKey,
  }).then((e) => e.data);
}

export function fetchCompileRun(runId: string, signal?: AbortSignal): Promise<CompileRun> {
  return apiRequest<CompileRun>(`/runs/${encodeURIComponent(runId)}`, { signal }).then((e) => e.data);
}

/** 编译产物 PDF（02 §6 签名 URL 语义；草案为直接端点）。 */
export function compiledPdfUrl(artifactId: string): string {
  return `/artifacts/${encodeURIComponent(artifactId)}/compiled-pdf`;
}
