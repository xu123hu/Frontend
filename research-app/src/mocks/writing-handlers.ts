/**
 * 写作域 MSW 请求处理器（CR-F3-01..04 契约草案 + 编译/翻译 run 详情）。
 *
 * - 文稿/文件/建议/引用：草案端点。
 * - 引用插入：候选仅来自已核验 CitationRecord（文献域 verified 条目）；
 *   .bib 条目用 Citation.js（MIT）从 CSL 生成——与 reuse-ledger card-18 一致。
 * - 编译/翻译 run 详情：供前端轮询编译时间线与保真报告。
 */
import { http, HttpResponse, delay } from 'msw';
import { envelope, errorEnvelope, requestId, readSession } from './http-helpers';
import { writingOf } from './writing-db';
import { minimalPdf, literatureOf } from './literature-handlers';
import type { Manuscript, ManuscriptFile, AiSuggestion, CitationCandidate } from '@entities/writing/types';
import type { FidelityReport, TranslationUnit } from '@entities/translation/types';
import { citationKeyFromItem, dedupeCitationKey } from '@shared/lib/citation-key';

/** 从文献域条目构造 CSL-JSON（Citation.js 输入）。 */
function toCsl(item: { title: string; authors: string[]; year: number | null; venue: string | null; doi: string | null }): Record<string, unknown> {
  return {
    type: 'article-journal',
    title: item.title,
    author: item.authors.map((a) => ({ literal: a })),
    issued: item.year ? { 'date-parts': [[item.year]] } : undefined,
    'container-title': item.venue ?? undefined,
    DOI: item.doi ?? undefined,
  };
}

/** 用 Citation.js 从 CSL 生成 BibTeX 条目（MIT，reuse-ledger card-18）。 */
async function cslToBibtex(csl: Record<string, unknown>, key: string): Promise<string> {
  try {
    const { default: Cite } = await import('@citation-js/core');
    await import('@citation-js/plugin-bibtex');
    const cite = new Cite({ ...csl, id: key });
    return cite.format('bibtex');
  } catch {
    // 生成失败降级为手写模板（可观察：无依赖时也不静默失败）
    const issued = csl.issued as { 'date-parts'?: number[][] } | undefined;
    const year = issued?.['date-parts']?.[0]?.[0] ?? null;
    const authors = (csl.author as { literal: string }[] | undefined) ?? [];
    return `@article{${key},\n  title = {${String(csl.title ?? '')}},\n  author = {${authors.map((a) => a.literal).join(' and ')}},\n  year = {${year ?? ''}},\n}`;
  }
}

export const writingHandlers = [
  // ---------- 文稿（CR-F3-01） ----------
  http.get('*/projects/:projectId/manuscripts', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const items = store.manuscripts.filter((m) => m.project_id === String(params.projectId));
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.post('*/manuscripts', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { project_id?: string; name?: string };
    if (!body.name || body.name.trim().length === 0) {
      return errorEnvelope('validation_failed', '文稿名称不能为空。', false, requestId(), 422);
    }
    const store = writingOf(session.tenant);
    const id = `ms-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const manuscript: Manuscript = {
      id,
      tenant_id: session.tenant.tenantId,
      project_id: body.project_id ?? store.manuscripts[0]?.project_id ?? 'proj-alpha-1',
      name: body.name.trim(),
      file_ids: [],
      version: 1,
      created_at: now,
      updated_at: now,
    };
    store.manuscripts.unshift(manuscript);
    store.filesByManuscript.set(id, []);
    await delay(200);
    return HttpResponse.json(envelope(manuscript, requestId()), { status: 201 });
  }),

  http.get('*/manuscripts/:manuscriptId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const ms = store.manuscripts.find((m) => m.id === params.manuscriptId);
    if (!ms) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    return HttpResponse.json(envelope(ms, requestId()));
  }),

  // ---------- 文件（CR-F3-01） ----------
  http.get('*/manuscripts/:manuscriptId/files', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const files = store.filesByManuscript.get(String(params.manuscriptId)) ?? [];
    return HttpResponse.json(envelope({ items: files, next_cursor: null }, requestId()));
  }),

  http.patch('*/files/:fileId', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { content?: string; version?: number };
    const store = writingOf(session.tenant);
    let hit: ManuscriptFile | null = null;
    let hostId = '';
    for (const [msId, files] of store.filesByManuscript) {
      const f = files.find((x) => x.id === params.fileId);
      if (f) {
        hit = f;
        hostId = msId;
        break;
      }
    }
    if (!hit) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    if (typeof body.version === 'number' && body.version !== hit.version) {
      return errorEnvelope('conflict', '文件已被他人修改，请重新加载。', false, requestId(), 409);
    }
    const next: ManuscriptFile = {
      ...hit,
      content: body.content ?? hit.content,
      version: hit.version + 1,
      updated_at: new Date().toISOString(),
    };
    const files = store.filesByManuscript.get(hostId)!;
    store.filesByManuscript.set(hostId, files.map((f) => (f.id === hit!.id ? next : f)));
    await delay(120);
    return HttpResponse.json(envelope(next, requestId()));
  }),

  // ---------- AI diff（CR-F3-03） ----------
  http.get('*/manuscripts/:manuscriptId/suggestions', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const items = store.suggestionsByManuscript.get(String(params.manuscriptId)) ?? [];
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.post('*/suggestions/:suggestionId/decision', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { accept?: boolean };
    const store = writingOf(session.tenant);
    let hit: AiSuggestion | null = null;
    for (const [msId, list] of store.suggestionsByManuscript) {
      const s = list.find((x) => x.id === params.suggestionId);
      if (s) {
        hit = s;
        void msId;
        break;
      }
    }
    if (!hit) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    // 接受/拒绝写入 HumanDecision 审计语义（草案：状态 + decided_at）；拒绝项不写入源文件。
    hit.status = body.accept ? 'accepted' : 'rejected';
    hit.decided_at = new Date().toISOString();
    await delay(150);
    return HttpResponse.json(envelope(hit, requestId()));
  }),

  // ---------- 引用插入（CR-F3-04：仅已核验 CitationRecord） ----------
  http.get('*/manuscripts/:manuscriptId/citations', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const ms = store.manuscripts.find((m) => m.id === params.manuscriptId);
    if (!ms) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    const bib = (store.filesByManuscript.get(ms.id) ?? []).find((f) => f.path === 'references.bib')?.content ?? '';
    const existing = new Set(Array.from(bib.matchAll(/@\w+\{([^,]+),/g)).map((m) => m[1]));
    // 候选仅来自已核验文献（懒初始化文献域：用户未先访问文献页也可插入）。
    const items = literatureOf(session.tenant).items;
    const candidates: CitationCandidate[] = items
      .filter((i) => i.verification !== 'not_found' && i.verification !== 'source_unavailable')
      .map((i) => {
        const key = dedupeCitationKey(citationKeyFromItem(i), existing);
        return {
          item_id: i.id,
          citation_key: key,
          title: i.title,
          authors: i.authors,
          year: i.year,
          venue: i.venue,
          already_in_bib: existing.has(key),
        };
      });
    return HttpResponse.json(envelope({ items: candidates, next_cursor: null }, requestId()));
  }),

  http.post('*/manuscripts/:manuscriptId/citations', async ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { item_id?: string };
    if (!body.item_id) return errorEnvelope('validation_failed', '缺少 item_id。', false, requestId(), 422);
    const store = writingOf(session.tenant);
    const ms = store.manuscripts.find((m) => m.id === params.manuscriptId);
    if (!ms) return errorEnvelope('not_found', '资源不存在或已被删除。', false, requestId(), 404);
    const files = store.filesByManuscript.get(ms.id) ?? [];
    const bibFile = files.find((f) => f.path === 'references.bib');
    if (!bibFile) return errorEnvelope('not_found', '文稿缺少 references.bib。', false, requestId(), 422);
    const existing = new Set(Array.from(bibFile.content.matchAll(/@\w+\{([^,]+),/g)).map((m) => m[1]));
    const item = literatureOf(session.tenant).items.find((i) => i.id === body.item_id);
    if (!item) return errorEnvelope('not_found', '文献不存在。', false, requestId(), 404);
    if (item.verification === 'not_found' || item.verification === 'source_unavailable') {
      return errorEnvelope('citation_not_verified', '该引用未通过核验，不能插入。', false, requestId(), 422);
    }
    const key = dedupeCitationKey(citationKeyFromItem(item), existing);
    const entry = await cslToBibtex(toCsl(item), key);
    const updated = bibFile.content.trim().length === 0 ? entry : `${bibFile.content.trimEnd()}\n\n${entry}`;
    store.filesByManuscript.set(ms.id, files.map((f) => (f.id === bibFile.id ? { ...f, content: updated, version: f.version + 1, updated_at: new Date().toISOString() } : f)));
    await delay(200);
    return HttpResponse.json(envelope({ citation_key: key, bib_entry: entry }, requestId()), { status: 201 });
  }),

  // ---------- 编译/翻译 run 详情（CR-F3-02/05：草案端点 GET /runs/:id） ----------
  // 注意：必须限定 /api/research/v1 前缀——裸 */runs/:runId 会误拦截
  // Vite 模块 URL /src/features/runs/use-runs.ts（:runId=use-runs.ts），导致模块 404。
  http.get('*/api/research/v1/runs/:runId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const runId = String(params.runId);
    const store = writingOf(session.tenant);
    let state = (store.compileRuns.get(runId) ?? store.compileRuns.get(`trans:${runId}`)) as Record<string, unknown> | undefined;
    if (!state) return errorEnvelope('not_found', '运行不存在或已过期。', false, requestId(), 404);
    // 从 SSE 事件脚本推导真实状态（进度来自事件流，非静态假进度）。
    const script = session.tenant.literature?.runEventScripts.get(runId);
    const failed = script?.find((f) => f.frame.event_type === 'run.failed');
    const completed = script?.find((f) => f.frame.event_type === 'run.completed');
    const artifact = script?.find((f) => f.frame.event_type === 'artifact.created');
    const progressFrames = script?.filter((f) => f.frame.event_type === 'step.progress');
    const lastProgress = progressFrames?.at(-1)?.frame.progress;
    if (failed) {
      const err = (failed.frame.payload as { error?: { file?: string; line?: number; kind?: string; message?: string } } | undefined)?.error;
      state = {
        ...state,
        status: 'failed',
        progress: 100,
        stageMessage: failed.frame.error?.message ?? '编译失败',
        errors: err ? [{ file: err.file ?? 'main.tex', line: err.line ?? null, kind: err.kind ?? 'compile_error', message: err.message ?? '编译失败', unsafe_command: err.kind === 'unsafe_command' }] : [],
      };
    } else if (completed) {
      state = {
        ...state,
        status: 'succeeded',
        progress: 100,
        stageMessage: '编译完成',
        pdf_artifact_id: artifact?.frame.artifact_ids[0] ?? null,
      };
    } else if (lastProgress && lastProgress.current !== null && lastProgress.total) {
      state = {
        ...state,
        status: 'running',
        progress: Math.round((lastProgress.current / lastProgress.total) * 100),
        stageMessage: lastProgress.message ?? '运行中',
      };
    }
    // 剥离内部演练字段（_ 前缀），只返回契约视图字段。
    const view = Object.fromEntries(Object.entries(state).filter(([k]) => !k.startsWith('_')));
    return HttpResponse.json(envelope(view, requestId()));
  }),

  // ---------- 编译产物 PDF（02 §6 签名 URL 语义；草案为直接端点） ----------
  http.get('*/artifacts/:artifactId/compiled-pdf', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const bytes = await minimalPdf();
    return new HttpResponse(bytes.slice(), { headers: { 'Content-Type': 'application/pdf' } });
  }),

  // ---------- 保真报告（CR-F3-05：VerificationRecord.method=formula_fidelity 视图） ----------
  http.get('*/api/research/v1/runs/:runId/fidelity-report', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const runId = String(params.runId);
    const store = writingOf(session.tenant);
    const state = store.compileRuns.get(`trans:${runId}`);
    if (!state) return errorEnvelope('not_found', '运行不存在或已过期。', false, requestId(), 404);
    // 报告与已翻译单元一致：本次模拟展示一条部分翻译（公式恢复冲突样例，06 §5 步骤 6）。
    const report: FidelityReport = {
      run_id: runId,
      checked_at: new Date().toISOString(),
      formula_count: { original: 4, translated: 4, consistent: true },
      formula_order: { consistent: true },
      formula_hash: { consistent: false },
      citation_keys: { consistent: true },
      label_ref: { consistent: true },
      failed_blocks: [
        { block_id: 'blk-trans-03', reason: '公式 \beta_{0j} 被改写为 β_0j，无法解析恢复' },
      ],
      overall: 'partial',
    };
    return HttpResponse.json(envelope(report, requestId()));
  }),

  // ---------- 译文单元（CR-F3-05：DocumentIR block 视图 + 保真状态） ----------
  http.get('*/items/:itemId/translation-units', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const store = writingOf(session.tenant);
    const itemId = String(params.itemId);
    const units: TranslationUnit[] = [
      { block_id: 'blk-trans-01', page_index: 1, source_text: 'Multilevel models partition variance into levels.', translated_text: '多层模型将方差分解到不同层级。', latex: null, fidelity: 'preserved', fidelity_reason: null, bbox: [72, 200, 540, 230], refs: [] },
      { block_id: 'blk-trans-02', page_index: 1, source_text: 'The level-1 model represents within-school relationships.', translated_text: '层一模型刻画校内关系。', latex: null, fidelity: 'preserved', fidelity_reason: null, bbox: [72, 240, 540, 270], refs: [] },
      { block_id: 'blk-trans-03', page_index: 2, source_text: 'y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}', translated_text: null, latex: 'y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}', fidelity: 'partially_translated', fidelity_reason: '公式 \beta_{0j} 被改写为 β_0j，无法解析恢复', bbox: [140, 210, 470, 248], refs: [] },
      { block_id: 'blk-trans-04', page_index: 2, source_text: 'Table 3.1 summarizes school-level covariates.', translated_text: '表 3.1 汇总了学校层面的协变量。', latex: null, fidelity: 'preserved', fidelity_reason: null, bbox: [72, 300, 540, 330], refs: [] },
    ];
    void itemId;
    void store;
    return HttpResponse.json(envelope({ items: units, next_cursor: null }, requestId()));
  }),
];
