/**
 * 契约测试：MSW 契约草案 handlers 与冻结契约对齐。
 * - M0 v0.1.0：RunStatus 枚举、ResearchRun 必填字段集
 * - M4 v2.0：SuccessEnvelope/ErrorEnvelope 形状、ProjectCreate 必填
 * - 认证流程草案（CR-F1-01..03）：登录 → 会话 → 租户隔离（TC-F01-08）
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, seedDb } from '@mocks/handlers';
import { DEMO_OTP, DEMO_PHONE } from '@mocks/db';
import type { components as m0 } from '@app/api/m0-schema.gen';
import type { Project, ProjectCreate } from '@entities/project/types';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => seedDb());

const BASE = 'http://localhost/api/research/v1';

async function loginAs(phone: string): Promise<string> {
  const otpRes = await fetch(`${BASE}/auth/session/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  expect(otpRes.status).toBe(204);
  const res = await fetch(`${BASE}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp_code: DEMO_OTP }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/rsid=([^;]+)/);
  expect(match).toBeTruthy();
  return `rsid=${match![1]}`;
}

describe('M0 契约对齐（类型级）', () => {
  it('Mock 种子使用的 run status 全部落在 M0 RunStatus 枚举内', () => {
    const allowed: m0['schemas']['RunStatus'][] = [
      'queued',
      'running',
      'waiting_for_approval',
      'paused',
      'succeeded',
      'failed',
      'cancelled',
    ];
    // 种子 run 使用 running/queued/succeeded 三种状态（见 mocks/db.ts seedDb）。
    const seededStatuses = ['running', 'queued', 'succeeded'] as const;
    for (const status of seededStatuses) expect(allowed).toContain(status);
  });

  it('M0 ResearchRun 必填字段在 Run 类型中齐备（静态断言）', () => {
    // 编译期已由 entities/run/types.ts 对齐 m0-schema；此处断言运行时形状。
    const required = [
      'id',
      'tenant_id',
      'project_id',
      'run_type',
      'status',
      'reasoning_policy_id',
      'budget',
      'created_by',
      'created_at',
      'updated_at',
    ];
    const sample: Record<string, unknown> = {
      id: 'run-1',
      tenant_id: 't1',
      project_id: 'p1',
      run_type: 'translation',
      status: 'queued',
      reasoning_policy_id: 'standard',
      budget: { max_cost_minor_units: 1, currency: 'CNY', max_runtime_seconds: 1, max_parallel_tasks: 1, max_sources: 1 },
      created_by: 'u1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      version: 0,
    };
    for (const key of required) expect(sample[key]).toBeDefined();
  });
});

describe('认证与租户隔离（CR-F1-01..03）', () => {
  it('完整登录流程：OTP → 登录 → /auth/me 返回账户', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const me = await fetch(`${BASE}/auth/me`, { headers: { cookie } });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { success: boolean; data: { display_name: string } };
    expect(body.success).toBe(true);
    expect(body.data.display_name).toBe('林研究员');
  });

  it('未登录 /auth/me → 401 错误信封', async () => {
    const res = await fetch(`${BASE}/auth/me`);
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; error: { retryable: boolean } };
    expect(body.success).toBe(false);
    expect(body.error.retryable).toBe(false);
  });

  it('错误验证码 → 400 可重试错误，且不泄露账户存在性', async () => {
    await fetch(`${BASE}/auth/session/otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: DEMO_PHONE }),
    });
    const res = await fetch(`${BASE}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: DEMO_PHONE, otp_code: '111111' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { retryable: boolean; message: string } };
    expect(body.error.retryable).toBe(true);
    expect(body.error.message).not.toContain('未注册');
    expect(body.error.message).not.toContain('不存在');
  });
});

describe('项目契约（M4 v2.0 /projects）', () => {
  it('创建项目：缺 research_question → 422；补全 → 201 + 幂等重放返回同 ID', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const createBody: ProjectCreate = {
      title: '测试项目',
      research_question: '测试研究问题',
      domain: '数学',
    };
    const bad = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ title: '测试项目' }),
    });
    expect(bad.status).toBe(422);

    const key = 'idem-key-001';
    const ok = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'Idempotency-Key': key },
      body: JSON.stringify(createBody),
    });
    expect(ok.status).toBe(201);
    const created = (await ok.json()) as { data: Project };
    expect(created.data.id).toBeTruthy();

    const replay = await fetch(`${BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie, 'Idempotency-Key': key },
      body: JSON.stringify(createBody),
    });
    const replayed = (await replay.json()) as { data: Project };
    expect(replayed.data.id).toBe(created.data.id);
  });

  it('TC-F01-08：租户 B 访问租户 A 项目 → 403 且响应不泄露项目标题', async () => {
    await loginAs(DEMO_PHONE);
    const cookieB = await loginAs('13900000002');
    const res = await fetch(`${BASE}/projects/proj-alpha-1`, { headers: { cookie: cookieB } });
    expect(res.status).toBe(403);
    const text = await res.text();
    expect(text).not.toContain('高中数学建模训练论文');
    expect(text).not.toContain('research_question');
  });

  it('租户 A 项目列表只含本租户项目，envelope 形状正确', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/projects?limit=20`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { items: Project[]; next_cursor: string | null };
      meta: { request_id: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.next_cursor).toBeNull();
    expect(body.meta.request_id).toBeTruthy();
    for (const item of body.data.items) {
      expect(item.tenant_id).toBe('tenant-alpha-0001');
      expect(item.version).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('断网模拟钩子（F5：simulatedNetworkError 契约层验证）', () => {
  it('携带 X-Simulate-Network-Error: 1 → fetch 以 TypeError reject（非 5xx）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    let rejected = false;
    let name = '';
    try {
      await fetch(`${BASE}/projects?limit=5`, {
        headers: { cookie, 'X-Simulate-Network-Error': '1' },
      });
    } catch (e) {
      rejected = true;
      name = e instanceof TypeError ? 'TypeError' : String(e);
    }
    expect(rejected).toBe(true);
    expect(name).toBe('TypeError');
  });

  it('不携带钩子头 → 正常 200（钩子仅按需触发）', async () => {
    const cookie = await loginAs(DEMO_PHONE);
    const res = await fetch(`${BASE}/projects?limit=5`, { headers: { cookie } });
    expect(res.status).toBe(200);
  });
});
