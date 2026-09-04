/**
 * 契约测试：教育研究域（CR-F5-01，对齐 M4 §8.1-8.6 + §8.7）。
 * - 数据产品/预检/快照/分析/图表/成果回流
 * - 红线：k<20 → 422 PRIVACY_THRESHOLD_NOT_MET 且不返回数据；快照不可变。
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, seedDb } from '@mocks/handlers';
import { DEMO_OTP, DEMO_PHONE } from '@mocks/db';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => seedDb());

const BASE = 'http://localhost/api/research/v1';

async function loginAs(phone: string): Promise<string> {
  await fetch(`${BASE}/auth/session/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const res = await fetch(`${BASE}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp_code: DEMO_OTP }),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/rsid=([^;]+)/);
  return `rsid=${match![1]}`;
}

describe('教育研究契约（CR-F5-01 / M4 §8）', () => {
  it('GET /education/study 返回课题卡（样本/阈值/授权状态）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/study`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; sample: number; minimum: number; authorized: boolean } };
    expect(body.data.id).toBe('EDU-31');
    expect(body.data.sample).toBeGreaterThanOrEqual(20);
    expect(body.data.minimum).toBe(20);
    expect(body.data.authorized).toBe(false);
  });

  it('GET /education/data-products 返回 L1 聚合产品（含 min_k / 字段白名单）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/data-products`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { items: Array<{ id: string; min_k: number; fields: string[] }> } };
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(body.data.items[0].min_k).toBe(20);
    expect(body.data.items[0].fields).toContain('错误类型');
  });

  it('POST /education/datasets/preflight：返回预估/最小 cell_k/分级，不返回数据', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/datasets/preflight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ product_id: 'ldp_mastery_v2', scope: { granularity: '班级×周' } }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { min_cell_k: number; classification: string; needs_approval: boolean } };
    expect(body.data.min_cell_k).toBeGreaterThanOrEqual(20);
    expect(body.data.classification).toBe('L1');
    expect(body.data.needs_approval).toBe(false);
    expect(JSON.stringify(body)).not.toContain('class_id');
  });

  it('POST /education/datasets/query（k≥20）→ 201 不可变快照（immutable=true, hash）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/datasets/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ product_id: 'ldp_mastery_v2', scope: { granularity: '班级×周' } }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; immutable: boolean; hash: string; records: number } };
    expect(body.data.id).toMatch(/^EDU-SNAP-\d+$/);
    expect(body.data.immutable).toBe(true);
    expect(body.data.hash).toMatch(/^sha256:/);
    expect(body.data.records).toBeGreaterThanOrEqual(20);
  });

  it('红线：k<20 切片 → 422 PRIVACY_THRESHOLD_NOT_MET，且响应不含任何切片数据', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/datasets/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ product_id: 'ldp_mastery_v2', scope: { class_id: 'cls_13', week: '2026-W30' } }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { success: boolean; error: { code: string; message: string; retryable: boolean } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PRIVACY_THRESHOLD_NOT_MET');
    expect(body.error.message).toContain('k < 20');
    expect(body.error.retryable).toBe(false);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('class_id');
    expect(raw).not.toContain('records');
  });

  it('POST /education/analyses → 201（estimate/assumptions/warnings/tool_versions）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const snapRes = await fetch(`${BASE}/education/datasets/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ product_id: 'ldp_mastery_v2', scope: { granularity: '班级×周' } }),
    });
    const snap = (await snapRes.json()) as { data: { id: string } };
    const res = await fetch(`${BASE}/education/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ snapshot_id: snap.data.id, template: 'pre_post_stratified', params: {} }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { estimate: Record<string, number>; warnings: string[]; tool_versions: Record<string, string> };
    };
    expect(body.data.estimate.symbol_error_change).toBeLessThan(0);
    expect(body.data.warnings).toContain('本研究不是随机对照，不能仅据此作因果结论。');
    expect(body.data.tool_versions.numpy).toBeTruthy();
  });

  it('POST /education/charts → artifact 绑定快照哈希 + 参数哈希', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const snapRes = await fetch(`${BASE}/education/datasets/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ product_id: 'ldp_mastery_v2', scope: { granularity: '班级×周' } }),
    });
    const snap = (await snapRes.json()) as { data: { id: string } };
    const res = await fetch(`${BASE}/education/charts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ snapshot_id: snap.data.id, format: 'svg' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { format: string; snapshot_hash: string; params_hash: string } };
    expect(body.data.format).toBe('svg');
    expect(body.data.snapshot_hash).toMatch(/^sha256:/);
    expect(body.data.params_hash).toMatch(/^sha256:/);
  });

  it('POST /education/publication/request → 201 pending_approval（HumanDecision 语义）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/education/publication/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ study_id: 'EDU-31' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { status: string; note: string } };
    expect(body.data.status).toBe('pending_approval');
    expect(body.data.note).toContain('审批');
  });

  it('未登录访问教育端点 → 401', async () => {
    const res = await fetch(`${BASE}/education/study`);
    expect(res.status).toBe(401);
  });
});
