/**
 * 教育研究域 MSW handlers（CR-F5-01 契约草案，对齐 M4 §8.1-8.6 + §8.7）。
 * 红线：k<20 → 422 PRIVACY_THRESHOLD_NOT_MET（不返回任何切片数据）；快照不可变（immutable）。
 */
import { http, HttpResponse, delay } from 'msw';
import { envelope, errorEnvelope, requestId, readSession, simulatedNetworkError } from './http-helpers';
import { seedEducationStore } from './education-db';
import type { EducationStore } from './education-db';
import type { TenantRecord } from './db';
import type { AnalysisResult, DatasetSnapshot, PublicationRequest } from '@entities/education/types';

/** 租户级教育存储（沿用 db.ts 的 tenant 挂载约定）。 */
function educationOf(tenant: TenantRecord): EducationStore {
  if (!tenant.education) tenant.education = seedEducationStore();
  return tenant.education;
}

/** 演示切片：k<20 切片（用于 k<20 拒绝演练，原型 simulate-small-sample 语义）。 */
const SMALL_SLICE = { class_id: 'cls_13', week: '2026-W30' };

export const educationHandlers = [
  // 课题卡（CR-F5-01：演示课题）
  http.get('*/api/research/v1/education/study', ({ request }) => {
    const netErr = simulatedNetworkError(request);
    if (netErr) return netErr;
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    return HttpResponse.json(envelope(educationOf(session.tenant).study, requestId()));
  }),

  // ---------- M4 §8.1 数据产品 ----------
  http.get('*/api/research/v1/education/data-products', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const items = educationOf(session.tenant).products;
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  // ---------- M4 §8.2 隐私预检（返回预估/最小 cell_k/分级/是否需审批；不返回数据） ----------
  http.post('*/api/research/v1/education/datasets/preflight', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { product_id?: string; scope?: Record<string, string> };
    if (!body.product_id) return errorEnvelope('validation_failed', '缺少 product_id。', false, requestId(), 422);
    const store = educationOf(session.tenant);
    const product = store.products.find((p) => p.id === body.product_id);
    if (!product) return errorEnvelope('not_found', '数据产品不存在。', false, requestId(), 404);
    await delay(200);
    return HttpResponse.json(
      envelope(
        {
          product_id: product.id,
          estimated_rows: 46,
          min_cell_k: 22, // 预检：全 cell ≥ 20，可走 L1 聚合
          classification: 'L1',
          needs_approval: false,
        },
        requestId(),
      ),
    );
  }),

  // ---------- M4 §8.3 数据快照（k<20 → 422 PRIVACY_THRESHOLD_NOT_MET） ----------
  http.post('*/api/research/v1/education/datasets/query', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { product_id?: string; scope?: Record<string, string> };
    if (!body.product_id) return errorEnvelope('validation_failed', '缺少 product_id。', false, requestId(), 422);
    const store = educationOf(session.tenant);
    const product = store.products.find((p) => p.id === body.product_id);
    if (!product) return errorEnvelope('not_found', '数据产品不存在。', false, requestId(), 404);
    // 演示 k<20 拒绝：小切片命中（原型「测试 k<20 拒绝状态」）
    const scope = body.scope ?? {};
    if (scope.class_id === SMALL_SLICE.class_id && scope.week === SMALL_SLICE.week) {
      // M4 错误码 PRIVACY_THRESHOLD_NOT_MET：不返回任何数据。
      return errorEnvelope('PRIVACY_THRESHOLD_NOT_MET', '当前切片只有 13 个样本，低于 k < 20 的拒绝阈值。请合并分组或使用更高层级的聚合数据。', false, requestId(), 422);
    }
    await delay(250);
    const snapshot: DatasetSnapshot = {
      id: `EDU-SNAP-${store.snapshots.size + 1}`,
      product_id: product.id,
      records: 184,
      frozen_at: new Date().toISOString(),
      hash: 'sha256:snap-031',
      immutable: true,
      parameters: { granularity: '班级×周', scope: '训练前后对比', frozen: 'true' },
    };
    store.snapshots.set(snapshot.id, snapshot);
    return HttpResponse.json(envelope(snapshot, requestId()), { status: 201 });
  }),

  // ---------- M4 §8.5 统计分析 ----------
  http.post('*/api/research/v1/education/analyses', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { snapshot_id?: string };
    if (!body.snapshot_id) return errorEnvelope('validation_failed', '缺少 snapshot_id。', false, requestId(), 422);
    await delay(300);
    const result: AnalysisResult = {
      id: `ana-${crypto.randomUUID().slice(0, 8)}`,
      snapshot_id: body.snapshot_id,
      template: 'pre_post_stratified',
      estimate: { symbol_error_change: -31, unit_error_change: -24 },
      interval: [-42, -17],
      assumptions: ['训练前后样本可比（同届同课程）', '错误标注规则一致'],
      warnings: ['本研究不是随机对照，不能仅据此作因果结论。', '3 个小样本切片因 k < 20 被排除。'],
      tool_versions: { numpy: '1.26', scipy: '1.12', statsmodels: '0.14' },
    };
    educationOf(session.tenant).analyses.set(result.id, result);
    return HttpResponse.json(envelope(result, requestId()), { status: 201 });
  }),

  // ---------- M4 §8.6 图表导出（artifact 绑定快照哈希 + 参数哈希） ----------
  http.post('*/api/research/v1/education/charts', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { snapshot_id?: string; format?: string };
    if (!body.snapshot_id) return errorEnvelope('validation_failed', '缺少 snapshot_id。', false, requestId(), 422);
    const format = body.format ?? 'svg';
    await delay(150);
    return HttpResponse.json(
      envelope(
        {
          artifact_id: `art-${crypto.randomUUID().slice(0, 8)}`,
          format,
          snapshot_hash: 'sha256:snap-031',
          params_hash: 'sha256:params-031',
          download_name: `建模错误趋势图.${format}`,
        },
        requestId(),
      ),
    );
  }),

  // ---------- M4 §9 成果回流（副本 + 来源链接 + 版本 + 撤回） ----------
  http.post('*/api/research/v1/education/publication/request', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const body = (await request.json()) as { study_id?: string };
    if (!body.study_id) return errorEnvelope('validation_failed', '缺少 study_id。', false, requestId(), 422);
    const store = educationOf(session.tenant);
    const req: PublicationRequest = {
      id: `pub-${crypto.randomUUID().slice(0, 8)}`,
      study_id: body.study_id,
      status: 'pending_approval',
      note: '发布前等待教师与数据管理员审批；保留来源项目、数据快照、版本与撤回状态。',
    };
    store.publications.set(req.id, req);
    return HttpResponse.json(envelope(req, requestId()), { status: 201 });
  }),
];
