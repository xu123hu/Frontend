/**
 * 文献域 MSW 请求处理器（CR-F2-01..08 契约草案 + M0 冻结 runs/SSE）。
 *
 * 草案端点：items/collections/annotations/notes/chunks/search/ingest 上传。
 * 冻结端点：POST /runs（202）+ GET /runs/{id}/events（SSE，Last-Event-ID 续传）。
 * 分页：游标式（02 §6 禁止 offset）；写操作支持 Idempotency-Key 语义。
 */
import { http, HttpResponse, delay } from 'msw';
import type { TenantRecord } from './db';
import { envelope, errorEnvelope, requestId, readSession } from './http-helpers';
import { emptyCollection, generateStressItems, seedLiterature } from './literature-db';
import type { LiteratureStore } from './literature-db';
import { loadLitDelta, saveLitDelta } from './lit-persistence';
import { buildDocumentParseEvents } from './run-simulator';
import type { LitAnnotation, LitChunk, LitCollection, LitItem, LitNote, SearchHit } from '@entities/literature/types';

/** 租户文献库懒初始化（首次访问文献端点时播种；批注/笔记回放持久化增量）。 */
function literatureOf(tenant: TenantRecord): LiteratureStore {
  if (!tenant.literature) {
    const projectId = tenant.projects[0]?.id ?? 'proj-alpha-1';
    tenant.literature = seedLiterature(tenant.tenantId, projectId);
    const delta = loadLitDelta(tenant.tenantId);
    if (delta) {
      // 只回放仍存在的条目相关批注/笔记（种子条目 id 稳定）。
      const itemIds = new Set(tenant.literature.items.map((i) => i.id));
      tenant.literature.annotations = delta.annotations.filter((a) => itemIds.has(a.item_id));
      tenant.literature.notes = delta.notes.filter((n) => itemIds.has(n.item_id));
    }
  }
  return tenant.literature;
}

/** 游标编解码（opaque：base64(index)）。 */
function encodeCursor(index: number): string {
  return btoa(String(index));
}
function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const n = Number(atob(cursor));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function paginate<T>(list: T[], cursor: string | null, limit: number): { items: T[]; next_cursor: string | null } {
  const start = decodeCursor(cursor);
  const end = start + limit;
  const page = list.slice(start, end);
  return { items: page, next_cursor: end < list.length ? encodeCursor(end) : null };
}

function problemDedupe(doi: string): string {
  return `已存在相同 DOI 的条目：${doi}`;
}

/**
 * 最小合法 PDF（pdf-lib 生成，2 页含真实文本层）。
 * 手写 PDF 字节缺 xref 等结构，pdf.js 只能恢复解析出 0 个文本项（画布全白），
 * 故改用 pdf-lib（成熟库，仅 dev/test bundle）保证文本可提取、可划选。
 */
let cachedPdf: Promise<Uint8Array> | null = null;
function minimalPdf(): Promise<Uint8Array> {
  cachedPdf ??= (async () => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pageTexts = [
      ['Page 1 - Hierarchical Linear Models', 'Chapter 1: Introduction', 'Multilevel models partition variance into levels.'],
      ['Page 2 - Multilevel models partition variance', 'The level-1 model represents within-school relationships.'],
    ];
    for (const lines of pageTexts) {
      const page = doc.addPage([612, 792]);
      lines.forEach((t, i) => {
        page.drawText(t, { x: 72, y: 700 - i * 28, size: 14, font, color: rgb(0, 0, 0) });
      });
    }
    return doc.save({ useObjectStreams: false });
  })();
  return cachedPdf;
}

export const literatureHandlers = [
  // ---------- 集合（CR-F2-04） ----------
  http.get('*/projects/:projectId/collections', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    return HttpResponse.json(envelope({ items: lit.collections, next_cursor: null }, requestId()));
  }),

  http.post('*/collections', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { name?: string; parent_id?: string | null; project_id?: string };
    if (!body.name || body.name.trim().length === 0) {
      return errorEnvelope('validation_failed', '集合名称不能为空。', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    const projectId = body.project_id ?? lit.collections[0]?.project_id ?? tenantFirstProject(session.tenant);
    const col: LitCollection = {
      id: `col-${crypto.randomUUID().slice(0, 8)}`,
      tenant_id: session.tenant.tenantId,
      project_id: projectId,
      name: body.name.trim(),
      parent_id: body.parent_id ?? null,
      item_count: 0,
      version: 1,
      created_at: new Date().toISOString(),
    };
    lit.collections.push(col);
    await delay(150);
    return HttpResponse.json(envelope(col, requestId()), { status: 201 });
  }),

  http.put('*/collections/:colId/items/:itemId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const item = lit.items.find((i) => i.id === params.itemId);
    if (!item) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    if (!item.collection_ids.includes(String(params.colId))) item.collection_ids.push(String(params.colId));
    syncCollectionCounts(lit);
    return HttpResponse.json(envelope(item, requestId()));
  }),

  http.delete('*/collections/:colId/items/:itemId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const item = lit.items.find((i) => i.id === params.itemId);
    if (!item) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    item.collection_ids = item.collection_ids.filter((c) => c !== params.colId);
    syncCollectionCounts(lit);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- 条目（CR-F2-02/03） ----------
  http.get('*/projects/:projectId/items', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200);
    let list = lit.items;
    const collectionId = url.searchParams.get('collection_id');
    const tag = url.searchParams.get('tag');
    const q = url.searchParams.get('q')?.toLowerCase();
    if (collectionId && collectionId !== 'all') list = list.filter((i) => i.collection_ids.includes(collectionId));
    if (tag) list = list.filter((i) => i.tags.includes(tag));
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || i.authors.some((a) => a.toLowerCase().includes(q)));
    const result = paginate(list, url.searchParams.get('cursor'), limit);
    return HttpResponse.json(envelope(result, requestId()));
  }),

  http.get('*/items/:itemId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const item = lit.items.find((i) => i.id === params.itemId);
    if (!item) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    return HttpResponse.json(envelope(item, requestId()));
  }),

  http.post('*/items', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as Partial<SearchHit> & { project_id?: string };
    if (!body.title || !body.source_identifier?.value) {
      return errorEnvelope('validation_failed', '缺少必填字段：title, source_identifier.value', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    // DOI 优先去重（M4 §8.2）：409 + Problem Details 语义由错误信封承载。
    const duplicate = lit.items.find((i) => i.source_identifier.value === body.source_identifier!.value);
    if (duplicate) {
      return errorEnvelope('duplicate_item', problemDedupe(body.source_identifier.value), false, requestId(), 409);
    }
    const item: LitItem = {
      id: `item-${crypto.randomUUID().slice(0, 8)}`,
      tenant_id: session.tenant.tenantId,
      project_id: body.project_id ?? lit.items[0]?.project_id ?? tenantFirstProject(session.tenant),
      title: body.title,
      authors: body.authors ?? [],
      year: body.year ?? null,
      venue: body.venue ?? null,
      doi: body.source_identifier.scheme === 'doi' ? body.source_identifier.value : null,
      abstract: null,
      source_identifier: body.source_identifier,
      rights_status: body.rights_status ?? 'unknown',
      full_text_availability: body.has_full_text ? 'available' : 'metadata_only',
      pdf_artifact_id: body.has_full_text ? `art-imp-${crypto.randomUUID().slice(0, 6)}` : null,
      verification: 'verified_exact',
      version_status: body.version_status ?? 'current',
      collection_ids: [],
      tags: [],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    lit.items.unshift(item);
    syncCollectionCounts(lit);
    await delay(200);
    return HttpResponse.json(envelope(item, requestId()), { status: 201 });
  }),

  http.delete('*/items/:itemId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const idx = lit.items.findIndex((i) => i.id === params.itemId);
    if (idx === -1) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    lit.items.splice(idx, 1);
    lit.annotations = lit.annotations.filter((a) => a.item_id !== params.itemId);
    lit.notes = lit.notes.filter((n) => n.item_id !== params.itemId);
    lit.chunksByItem.delete(String(params.itemId));
    syncCollectionCounts(lit);
    saveLitDelta(session.tenant.tenantId, lit);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---------- 批量操作（CR-F2-08：幂等 + 可撤销由前端栈承担） ----------
  http.post('*/items/batch', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { action: 'add_tag' | 'remove_tag' | 'move_collection' | 'delete'; item_ids: string[]; tag?: string; collection_id?: string };
    if (!body.action || !Array.isArray(body.item_ids)) {
      return errorEnvelope('validation_failed', '缺少 action 或 item_ids。', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    const affected: LitItem[] = [];
    for (const id of body.item_ids) {
      const item = lit.items.find((i) => i.id === id);
      if (!item) continue;
      affected.push(item);
      if (body.action === 'add_tag' && body.tag && !item.tags.includes(body.tag)) item.tags.push(body.tag);
      if (body.action === 'remove_tag' && body.tag) item.tags = item.tags.filter((t) => t !== body.tag);
      if (body.action === 'move_collection' && body.collection_id && !item.collection_ids.includes(body.collection_id)) {
        item.collection_ids.push(body.collection_id);
      }
    }
    if (body.action === 'delete') {
      lit.items = lit.items.filter((i) => !body.item_ids.includes(i.id));
      lit.annotations = lit.annotations.filter((a) => !body.item_ids.includes(a.item_id));
      lit.notes = lit.notes.filter((n) => !body.item_ids.includes(n.item_id));
      saveLitDelta(session.tenant.tenantId, lit);
    }
    syncCollectionCounts(lit);
    await delay(200);
    return HttpResponse.json(envelope({ affected: affected.length, item_ids: body.item_ids }, requestId()));
  }),

  // ---------- 切分与入库确认（CR-F2-06） ----------
  http.get('*/items/:itemId/chunks', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const chunks = lit.chunksByItem.get(String(params.itemId)) ?? [];
    return HttpResponse.json(envelope({ items: chunks, next_cursor: null }, requestId()));
  }),

  http.post('*/items/:itemId/chunks/confirm', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { block_ids?: string[]; all?: boolean };
    const lit = literatureOf(session.tenant);
    const chunks = lit.chunksByItem.get(String(params.itemId)) ?? [];
    const targets = body.all ? chunks : chunks.filter((c) => body.block_ids?.includes(c.block_id));
    for (const c of targets) c.confirmed = true;
    await delay(150);
    return HttpResponse.json(envelope({ confirmed: targets.length }, requestId()));
  }),

  // ---------- 批注与笔记（CR-F2-05） ----------
  http.get('*/items/:itemId/annotations', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const items = lit.annotations.filter((a) => a.item_id === params.itemId);
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.post('*/items/:itemId/annotations', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as Partial<LitAnnotation>;
    if (!body.quoted_text || body.quoted_text.trim().length === 0) {
      return errorEnvelope('validation_failed', '批注必须携带引文原文（quoted_text）。', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    const anno: LitAnnotation = {
      id: `anno-${crypto.randomUUID().slice(0, 8)}`,
      tenant_id: session.tenant.tenantId,
      item_id: String(params.itemId),
      page_index: body.page_index ?? null,
      bbox: body.bbox ?? null,
      char_start: body.char_start ?? null,
      char_end: body.char_end ?? null,
      quoted_text: body.quoted_text,
      quoted_text_sha256: body.quoted_text_sha256 ?? `mock-${crypto.randomUUID().slice(0, 8)}`,
      anchor_status: body.anchor_status ?? 'anchored',
      comment: body.comment ?? '',
      color: body.color ?? '#5272dc',
      author_id: session.userId,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    lit.annotations.push(anno);
    saveLitDelta(session.tenant.tenantId, lit);
    await delay(180);
    return HttpResponse.json(envelope(anno, requestId()), { status: 201 });
  }),

  http.patch('*/annotations/:annoId', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const anno = lit.annotations.find((a) => a.id === params.annoId);
    if (!anno) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    const patch = (await request.json()) as Partial<LitAnnotation>;
    Object.assign(anno, patch, { version: anno.version + 1, updated_at: new Date().toISOString() });
    saveLitDelta(session.tenant.tenantId, lit);
    await delay(150);
    return HttpResponse.json(envelope(anno, requestId()));
  }),

  http.delete('*/annotations/:annoId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const before = lit.annotations.length;
    lit.annotations = lit.annotations.filter((a) => a.id !== params.annoId);
    if (lit.annotations.length === before) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    saveLitDelta(session.tenant.tenantId, lit);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/items/:itemId/notes', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const items = lit.notes.filter((n) => n.item_id === params.itemId);
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.post('*/items/:itemId/notes', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { content?: string };
    if (!body.content || body.content.trim().length === 0) {
      return errorEnvelope('validation_failed', '笔记内容不能为空。', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    const note: LitNote = {
      id: `note-${crypto.randomUUID().slice(0, 8)}`,
      tenant_id: session.tenant.tenantId,
      item_id: String(params.itemId),
      content: body.content.trim(),
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    lit.notes.push(note);
    saveLitDelta(session.tenant.tenantId, lit);
    await delay(150);
    return HttpResponse.json(envelope(note, requestId()), { status: 201 });
  }),

  // ---------- 三源检索（CR-F2-07） ----------
  http.get('*/search/literature', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
    const sources = (url.searchParams.get('sources') ?? 'crossref,openalex,arxiv').split(',');
    const lit = literatureOf(session.tenant);
    const hits = lit.searchCatalog.filter(
      (h) => sources.includes(h.source) && (q.length === 0 || h.title.toLowerCase().includes(q) || h.authors.some((a) => a.toLowerCase().includes(q)) || h.source_identifier.value.toLowerCase().includes(q)),
    );
    // 单源熔断演练：查询中带 [unavailable:openalex] 标记时返回该源失败（partial 场景）。
    // partial 信息必须进 meta 信封：客户端严禁静默丢弃降级事实（08 §6 红线）。
    const unavailable = url.searchParams.get('simulate_unavailable');
    if (unavailable) {
      const base = envelope({ items: hits.filter((h) => h.source !== unavailable), next_cursor: null }, requestId());
      return HttpResponse.json({
        ...base,
        meta: { ...base.meta, partial: { unavailable_sources: [unavailable], reason: 'source_rate_limited' } },
      });
    }
    await delay(250);
    return HttpResponse.json(envelope({ items: hits, next_cursor: null }, requestId()));
  }),

  // ---------- 上传（CR-F2-01） ----------
  http.post('*/ingest/uploads', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return errorEnvelope('validation_failed', '缺少文件字段 file。', false, requestId(), 422);
    }
    const lit = literatureOf(session.tenant);
    const uploadId = `upl-${crypto.randomUUID().slice(0, 10)}`;
    // 服务端判定演练（真实判定在解析服务）：文件名约定触发 zip_bomb/corrupted。
    const failureCode = file.name.includes('bomb') ? 'zip_bomb' : file.name.includes('corrupted') ? 'corrupted_pdf' : null;
    lit.uploads.set(uploadId, { name: file.name, sizeBytes: file.size, failureCode, itemId: null });
    await delay(200);
    return HttpResponse.json(
      envelope(
        {
          upload_id: uploadId,
          artifact_id: `art-src-${uploadId.slice(4)}`,
          sha256: `sha-${crypto.randomUUID().slice(0, 12)}`,
          size_bytes: file.size,
          media_type: file.type || 'application/pdf',
          failure: null,
        },
        requestId(),
      ),
      { status: 201 },
    );
  }),

  // ---------- PDF 二进制（02 §6：签名 URL 下载，API 不代理大文件；草案为直接端点） ----------
  http.get('*/artifacts/:artifactId/pdf', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const bytes = await minimalPdf();
    return new HttpResponse(bytes.slice(), { headers: { 'Content-Type': 'application/pdf' } });
  }),

  // ---------- 运行（M0 冻结契约：POST /runs 202 + SSE） ----------
  http.post('*/runs', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { run_type?: string; input_artifact_ids?: string[]; reasoning_policy_id?: string };
    if (body.run_type !== 'document_parse') {
      return errorEnvelope('validation_failed', 'M0 冻结 run_type 枚举外的值被拒绝。', false, requestId(), 422);
    }
    const uploadId = body.input_artifact_ids?.[0];
    if (!uploadId) return errorEnvelope('validation_failed', '缺少 input_artifact_ids。', false, requestId(), 422);
    const lit = literatureOf(session.tenant);
    const artifactId = uploadId.replace('upl-', 'art-src-');
    const upload = lit.uploads.get(uploadId) ?? lit.uploads.get(artifactId) ?? { name: 'unknown.pdf', sizeBytes: 1_000_000, failureCode: null, itemId: null };

    // mock 演练（TC-F02-05 失败重试）：timeout 命名的文件首次解析失败（可重试），
    // 同名单条重试（新上传）后成功——覆盖 失败→原因可见→重试→完成 全流程。
    // 与搜索的 simulate_unavailable 同性质：仅 dev/test 钩子，非契约端点语义。
    let effectiveFailure = upload.failureCode;
    if (upload.name.includes('timeout')) {
      const attempt = (lit.uploadAttempts.get(upload.name) ?? 0) + 1;
      lit.uploadAttempts.set(upload.name, attempt);
      effectiveFailure = attempt === 1 ? 'parse_failed' : null;
    }

    // 无失败的上传：预先登记条目与切分结果（run.completed 事件回指 item_id）。
    let itemId: string | null = null;
    if (!effectiveFailure) {
      const item: LitItem = {
        id: `item-${crypto.randomUUID().slice(0, 8)}`,
        tenant_id: session.tenant.tenantId,
        project_id: tenantFirstProject(session.tenant),
        title: upload.name.replace(/\.pdf$/i, ''),
        authors: [],
        year: null,
        venue: null,
        doi: null,
        abstract: null,
        source_identifier: { scheme: 'internal', value: uploadId },
        rights_status: 'user_provided',
        full_text_availability: 'available',
        pdf_artifact_id: artifactId,
        verification: 'local_only',
        version_status: 'current',
        collection_ids: ['col-todo'],
        tags: ['导入'],
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      lit.items.unshift(item);
      lit.chunksByItem.set(item.id, seedParseChunks(item.id));
      upload.itemId = item.id;
      itemId = item.id;
    }

    const runId = `run-${crypto.randomUUID().slice(0, 8)}`;
    const run = {
      id: runId,
      tenant_id: session.tenant.tenantId,
      project_id: tenantFirstProject(session.tenant),
      run_type: 'document_parse' as const,
      status: 'queued' as const,
      reasoning_policy_id: (body.reasoning_policy_id ?? 'standard') as 'quick' | 'standard' | 'rigorous',
      budget: { max_cost_minor_units: 5000, currency: 'CNY', max_runtime_seconds: 1800, max_parallel_tasks: 4, max_sources: 20 },
      spent: { cost_minor_units: 0, model_tokens: 0, runtime_seconds: 0, tool_calls: 0 },
      created_by: session.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 0,
    } satisfies import('@entities/run/types').Run;
    session.tenant.runs.unshift(run);

    const script = buildDocumentParseEvents(runId, { name: upload.name, failureCode: effectiveFailure, itemId, sizeBytes: upload.sizeBytes });
    lit.runEventScripts.set(runId, script);
    await delay(120);
    return HttpResponse.json(
      envelope({ run_id: runId, events_url: `/api/research/v1/runs/${runId}/events`, status: 'queued' as const }, requestId()),
      { status: 202 },
    );
  }),

  // ---------- SSE 事件流（M0 冻结契约；支持 Last-Event-ID 续传） ----------
  http.get('*/runs/:runId/events', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const lit = literatureOf(session.tenant);
    const script = lit.runEventScripts.get(String(params.runId));
    if (!script) return errorEnvelope('not_found', '运行不存在或事件已过期。', false, requestId(), 404);

    const lastEventId = request.headers.get('last-event-id');
    let start = 0;
    if (lastEventId) {
      const idx = script.findIndex((s) => s.frame.event_id === lastEventId);
      if (idx >= 0) start = idx + 1;
    }
    const encoder = new TextEncoder();
    let cursor = start;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const pushNext = (): void => {
          if (cursor >= script.length) {
            controller.close();
            return;
          }
          const { frame, delayMs } = script[cursor++];
          const data = JSON.stringify(frame);
          controller.enqueue(encoder.encode(`id: ${frame.event_id}\nevent: message\ndata: ${data}\n\n`));
          setTimeout(pushNext, delayMs);
        };
        pushNext();
      },
    });
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  }),

  // ---------- mock 测试钩子（非契约；仅压测播种） ----------
  http.post('*/dev/seed-stress', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { count?: number };
    const count = Math.min(body.count ?? 10_000, 10_000);
    const lit = literatureOf(session.tenant);
    if (!lit.collections.some((c) => c.id === 'col-stress')) {
      lit.collections.push(emptyCollection('col-stress', session.tenant.tenantId, tenantFirstProject(session.tenant), '压测集合'));
    }
    lit.items.push(...generateStressItems(session.tenant.tenantId, tenantFirstProject(session.tenant), count, lit.items.length + 1));
    syncCollectionCounts(lit);
    return HttpResponse.json(envelope({ seeded: count }, requestId()));
  }),
];

function tenantFirstProject(tenant: TenantRecord): string {
  return tenant.projects[0]?.id ?? 'proj-alpha-1';
}

function syncCollectionCounts(lit: LiteratureStore): void {
  for (const col of lit.collections) {
    col.item_count = lit.items.filter((i) => i.collection_ids.includes(col.id)).length;
  }
}

/** 新导入条目的默认切分结果（模拟 GROBID 输出）。 */
function seedParseChunks(itemId: string): LitChunk[] {
  const mk = (i: number, type: LitChunk['type'], text: string | null, latex: string | null, integrity: LitChunk['integrity']): LitChunk => ({
    block_id: `${itemId}-blk-${String(i).padStart(2, '0')}`,
    type,
    page_index: Math.min(1 + Math.floor(i / 3), 2),
    bbox: [72, 100 + i * 40, 540, 130 + i * 40],
    text,
    latex,
    content_hash: `hash-${crypto.randomUUID().slice(0, 8)}`,
    integrity,
    confirmed: false,
  });
  return [
    mk(1, 'heading', '1. Introduction', null, 'intact'),
    mk(2, 'paragraph', 'This paper studies multilevel models for educational data.', null, 'intact'),
    mk(3, 'display_math', null, 'y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}', 'intact'),
    mk(4, 'table', '[Table 1 Descriptive statistics]', null, 'intact'),
    mk(5, 'citation', 'Raudenbush, S. W., & Bryk, A. S. (2002).', null, 'suspect'),
  ];
}
