/**
 * 文献域 API：CR-F2-01..08 契约草案 + M0 冻结 runs/SSE。
 *
 * - 集合/条目/批注/笔记/切分：CR-F2-02..06
 * - 三源检索：CR-F2-07（partial 降级信息在 meta.partial，不静默丢弃）
 * - 上传/解析：CR-F2-01（apiUpload 真实字节进度）+ M0 冻结 POST /runs 202 + SSE
 * - 409 duplicate_item（DOI 去重）不吞：原样抛 ApiError 由 UI 展示
 */
import { apiRequest, apiUpload } from '@app/api/client';
import type { ApiMeta, ApiSuccess } from '@app/api/client';
import { config } from '@app/config';
import type {
  LitAnnotation,
  LitChunk,
  LitCollection,
  LitItem,
  LitNote,
  SearchHit,
} from '@entities/literature/types';

export interface LitItemPage {
  items: LitItem[];
  next_cursor: string | null;
}

export interface ItemFilters {
  collection_id?: string;
  tag?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export function fetchCollections(projectId: string, signal?: AbortSignal): Promise<LitCollection[]> {
  return apiRequest<{ items: LitCollection[]; next_cursor: string | null }>(
    `/projects/${encodeURIComponent(projectId)}/collections`,
    { signal },
  ).then((e) => e.data.items);
}

export function createCollection(projectId: string, name: string, idempotencyKey: string): Promise<LitCollection> {
  return apiRequest<LitCollection>('/collections', {
    method: 'POST',
    body: { project_id: projectId, name },
    idempotencyKey,
  }).then((e) => e.data);
}

export function fetchItems(projectId: string, filters: ItemFilters = {}, signal?: AbortSignal): Promise<LitItemPage> {
  return apiRequest<LitItemPage>(`/projects/${encodeURIComponent(projectId)}/items`, {
    query: {
      collection_id: filters.collection_id,
      tag: filters.tag,
      q: filters.q,
      cursor: filters.cursor,
      limit: filters.limit,
    },
    signal,
  }).then((e) => e.data);
}

export function fetchItem(itemId: string, signal?: AbortSignal): Promise<LitItem> {
  return apiRequest<LitItem>(`/items/${encodeURIComponent(itemId)}`, { signal }).then((e) => e.data);
}

export function deleteItem(itemId: string, signal?: AbortSignal): Promise<void> {
  return apiRequest<void>(`/items/${encodeURIComponent(itemId)}`, { method: 'DELETE', signal }).then(() => undefined);
}

export interface BatchItemsInput {
  action: 'add_tag' | 'remove_tag' | 'move_collection' | 'delete';
  item_ids: string[];
  tag?: string;
  collection_id?: string;
}

export function batchItems(input: BatchItemsInput, signal?: AbortSignal): Promise<{ affected: number }> {
  return apiRequest<{ affected: number; item_ids: string[] }>('/items/batch', {
    method: 'POST',
    body: input,
    signal,
  }).then((e) => e.data);
}

/** 加入集合（幂等 PUT，CR-F2-04）。 */
export function addToCollection(collectionId: string, itemId: string): Promise<void> {
  return apiRequest<void>(`/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'PUT',
  }).then(() => undefined);
}

/** 移出集合（撤销 move_collection 的逆操作）。 */
export function removeFromCollection(collectionId: string, itemId: string): Promise<void> {
  return apiRequest<void>(`/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  }).then(() => undefined);
}

/** 从检索命中入库（409 duplicate_item 原样抛出）。 */
export function createItemFromHit(
  hit: Pick<SearchHit, 'title' | 'authors' | 'year' | 'venue' | 'source_identifier' | 'rights_status' | 'version_status' | 'has_full_text'> & { project_id?: string },
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<LitItem> {
  return apiRequest<LitItem>('/items', { method: 'POST', body: hit, idempotencyKey, signal }).then((e) => e.data);
}

// ---------- 切分与入库确认（CR-F2-06） ----------

export function fetchChunks(itemId: string, signal?: AbortSignal): Promise<LitChunk[]> {
  return apiRequest<{ items: LitChunk[]; next_cursor: string | null }>(
    `/items/${encodeURIComponent(itemId)}/chunks`,
    { signal },
  ).then((e) => e.data.items);
}

export function confirmChunks(
  itemId: string,
  body: { block_ids?: string[]; all?: boolean },
  signal?: AbortSignal,
): Promise<{ confirmed: number }> {
  return apiRequest<{ confirmed: number }>(`/items/${encodeURIComponent(itemId)}/chunks/confirm`, {
    method: 'POST',
    body,
    signal,
  }).then((e) => e.data);
}

// ---------- 批注与笔记（CR-F2-05） ----------

export interface AnnotationInput {
  page_index?: number | null;
  bbox?: [number, number, number, number] | null;
  char_start?: number | null;
  char_end?: number | null;
  quoted_text: string;
  quoted_text_sha256?: string;
  anchor_status?: 'anchored' | 'needs_reanchor';
  comment?: string;
  color?: string;
}

export function fetchAnnotations(itemId: string, signal?: AbortSignal): Promise<LitAnnotation[]> {
  return apiRequest<{ items: LitAnnotation[]; next_cursor: string | null }>(
    `/items/${encodeURIComponent(itemId)}/annotations`,
    { signal },
  ).then((e) => e.data.items);
}

export function createAnnotation(itemId: string, input: AnnotationInput, idempotencyKey: string): Promise<LitAnnotation> {
  return apiRequest<LitAnnotation>(`/items/${encodeURIComponent(itemId)}/annotations`, {
    method: 'POST',
    body: input,
    idempotencyKey,
  }).then((e) => e.data);
}

export function updateAnnotation(annoId: string, patch: Partial<Pick<LitAnnotation, 'comment' | 'color'>>): Promise<LitAnnotation> {
  return apiRequest<LitAnnotation>(`/annotations/${encodeURIComponent(annoId)}`, {
    method: 'PATCH',
    body: patch,
  }).then((e) => e.data);
}

export function deleteAnnotation(annoId: string): Promise<void> {
  return apiRequest<void>(`/annotations/${encodeURIComponent(annoId)}`, { method: 'DELETE' }).then(() => undefined);
}

export function fetchNotes(itemId: string, signal?: AbortSignal): Promise<LitNote[]> {
  return apiRequest<{ items: LitNote[]; next_cursor: string | null }>(`/items/${encodeURIComponent(itemId)}/notes`, {
    signal,
  }).then((e) => e.data.items);
}

export function createNote(itemId: string, content: string, idempotencyKey: string): Promise<LitNote> {
  return apiRequest<LitNote>(`/items/${encodeURIComponent(itemId)}/notes`, {
    method: 'POST',
    body: { content },
    idempotencyKey,
  }).then((e) => e.data);
}

// ---------- 三源检索（CR-F2-07） ----------

export interface SearchPartial {
  unavailable_sources: string[];
  reason: string;
}

export interface SearchResult {
  items: SearchHit[];
  next_cursor: string | null;
  /** 源级降级事实（非空 = 部分成功），必须在 UI 显式呈现。 */
  partial: SearchPartial | null;
}

/** 真实三源发现引擎（/knowledge/search，K1 契约）的返回形状。 */
interface KnowledgeSourceStatus {
  source: string;
  status: 'ok' | 'not_found' | 'unavailable' | 'rate_limited' | 'invalid_request';
  items: Array<{
    title: string;
    creators: string[];
    year: number | null;
    doi: string | null;
    identifiers: Array<{ scheme: string; value: string }>;
    abstract: string | null;
  }>;
  error: string | null;
}

export async function searchLiterature(
  params: { q: string; sources?: string[]; simulateUnavailable?: string },
  signal?: AbortSignal,
): Promise<SearchResult> {
  // 统一身份（真实后端）模式：调用真实三源发现引擎（OpenAlex/arXiv/CrossRef），
  // 源级降级事实如实透出，不静默丢弃；演示模式继续走 MSW 契约草案。
  if (config.oidcEnabled) {
    const q = params.q.trim();
    const kind = /^10\.\d{4,9}\//.test(q)
      ? 'doi'
      : /^\d{4}\.\d{4,5}(v\d+)?$/i.test(q)
        ? 'arxiv'
        : 'query';
    const response = await apiRequest<{ sources: KnowledgeSourceStatus[] }>('/knowledge/search', {
      method: 'POST',
      body: { kind, value: q, limit: 10 },
      signal,
    }).then((e) => e.data);
    const items: SearchHit[] = [];
    const unavailableSources: string[] = [];
    for (const sourceStatus of response.sources) {
      const source = sourceStatus.source as SearchHit['source'];
      if (sourceStatus.status !== 'ok' || sourceStatus.items.length === 0) {
        if (sourceStatus.status !== 'not_found') unavailableSources.push(source);
        continue;
      }
      for (const item of sourceStatus.items) {
        const identifier = item.identifiers.find((i) => i.scheme === 'doi')
          ?? item.identifiers.find((i) => i.scheme === 'arxiv')
          ?? item.identifiers.find((i) => i.scheme === 'openalex');
        items.push({
          title: item.title,
          authors: item.creators ?? [],
          year: item.year ?? null,
          venue: null,
          source,
          source_identifier: identifier
            ? { scheme: identifier.scheme as SearchHit['source_identifier']['scheme'], value: identifier.value }
            : { scheme: 'internal', value: item.title },
          has_full_text: false,
          rights_status: 'unknown',
          version_status: 'unknown',
          already_in_library: false,
        });
      }
    }
    return {
      items,
      next_cursor: null,
      partial: unavailableSources.length
        ? { unavailable_sources: unavailableSources, reason: '部分来源不可用或被限流，结果可能不完整。' }
        : null,
    };
  }
  const envelope: ApiSuccess<{ items: SearchHit[]; next_cursor: string | null }> & { meta: ApiMeta } =
    await apiRequest(`/search/literature`, {
      query: {
        q: params.q,
        sources: params.sources?.join(','),
        simulate_unavailable: params.simulateUnavailable,
      },
      signal,
    });
  const partial = (envelope.meta['partial'] as SearchPartial | undefined) ?? null;
  return { items: envelope.data.items, next_cursor: envelope.data.next_cursor, partial };
}

// ---------- 上传与解析 Run（CR-F2-01 + M0 冻结） ----------

export interface UploadAccepted {
  upload_id: string;
  artifact_id: string;
  sha256: string;
  size_bytes: number;
  media_type: string;
  failure: null;
}

export interface RunAccepted {
  run_id: string;
  events_url: string;
  status: string;
}

export function uploadPdf(options: {
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}): Promise<UploadAccepted> {
  return apiUpload<UploadAccepted>('/ingest/uploads', options).then((e) => e.data);
}

/**
 * 创建解析 Run（M0 冻结契约：只发 run_type/input_artifact_ids，202 返回）。
 * 预处理参数（切分粒度等）默认值由服务端给定，前端不臆造字段。
 */
export function createDocumentParseRun(uploadId: string, idempotencyKey?: string): Promise<RunAccepted> {
  return apiRequest<RunAccepted>('/runs', {
    method: 'POST',
    body: { run_type: 'document_parse', input_artifact_ids: [uploadId] },
    idempotencyKey,
  }).then((e) => e.data);
}

/** PDF 二进制地址（02 §6 真实实现应为签名 URL；草案为直接端点）。 */
export function pdfUrl(artifactId: string): string {
  return `/artifacts/${encodeURIComponent(artifactId)}/pdf`;
}
