/**
 * MSW 请求处理器：按契约草案（CR-F1-01..04）与 M4 v2.0（/projects、/runs）实现。
 * 响应一律使用 M4 SuccessEnvelope / ErrorEnvelope；错误码与重试语义与 client.ts 对齐。
 * F2：文献域 handlers（CR-F2-01..08 + M0 冻结 runs/SSE）拆分在 literature-handlers.ts。
 */
import { http, HttpResponse, delay } from 'msw';
import {
  DEMO_OTP,
  db,
  findTenantByPhone,
  seedDb,
  uuidv7Mock,
} from './db';
import type { ProjectCreate } from '@entities/project/types';
import { persistSessions } from './session-persistence';
import { envelope, errorEnvelope, readCookieHeader, requestId, readSession, SESSION_COOKIE } from './http-helpers';
import { literatureHandlers } from './literature-handlers';
import { writingHandlers } from './writing-handlers';
import { reviewHandlers } from './review-handlers';
import { stewardHandlers } from './steward-handlers';

function sessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; Path=/; SameSite=Lax`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0`;
}

const coreHandlers = [
  // ---------- 认证（CR-F1-01..03 契约草案） ----------
  http.post('*/auth/session/otp', async ({ request }) => {
    const body = (await request.json()) as { phone?: string };
    const phone = body.phone ?? '';
    if (!/^1\d{10}$/.test(phone)) {
      return errorEnvelope('validation_failed', '手机号格式不正确。', false, requestId(), 422);
    }
    await delay(300);
    const tenant = findTenantByPhone(phone);
    // 契约草案：未注册手机号在 OTP 阶段不区分存在性（防枚举），登录阶段才失败。
    if (tenant) {
      tenant.passwordless = { phone, otp: DEMO_OTP, issuedAt: Date.now() };
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/session', async ({ request }) => {
    const body = (await request.json()) as { phone?: string; otp_code?: string };
    const phone = body.phone ?? '';
    const otp = body.otp_code ?? '';
    if (!/^1\d{10}$/.test(phone) || !/^\d{6}$/.test(otp)) {
      return errorEnvelope('validation_failed', '手机号或验证码格式不正确。', false, requestId(), 422);
    }
    await delay(400);
    const tenant = findTenantByPhone(phone);
    const issued = tenant?.passwordless;
    if (!tenant || !issued || issued.phone !== phone || issued.otp !== otp) {
      // 未注册或验证码错误：统一文案，不泄露账户存在性；可重试。
      return errorEnvelope('invalid_credentials', '验证码错误或已过期，请重新获取。', true, requestId(), 400);
    }
    const account = tenant.accounts[0];
    if (!account) {
      return errorEnvelope('forbidden', '该账户不可用。', false, requestId(), 403);
    }
    const sessionId = crypto.randomUUID();
    tenant.sessions.set(sessionId, account.user_id);
    tenant.passwordless = null;
    persistSessions(db);
    return HttpResponse.json(envelope(account, requestId()), {
      status: 200,
      headers: { 'Set-Cookie': sessionCookie(sessionId) },
    });
  }),

  http.get('*/auth/me', ({ request }) => {
    const session = readSession(request);
    if (!session) {
      return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    }
    const account = session.tenant.accounts.find((a) => a.user_id === session.userId);
    if (!account) {
      return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    }
    return HttpResponse.json(envelope(account, requestId()));
  }),

  http.delete('*/auth/session', ({ request }) => {
    const match = readCookieHeader(request).match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
    if (match) {
      const sessionId = decodeURIComponent(match[1]);
      for (const tenant of db.tenants.values()) tenant.sessions.delete(sessionId);
    }
    persistSessions(db);
    return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': clearSessionCookie() } });
  }),

  // ---------- 偏好（CR-F1-04 契约草案） ----------
  http.get('*/me/preferences', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const prefs =
      session.tenant.preferences.get(session.userId) ??
      ({ language: 'zh-CN', timezone: 'Asia/Shanghai', notifications: { email: false, in_app: true } } as const);
    return HttpResponse.json(envelope(prefs, requestId()));
  }),

  http.patch('*/me/preferences', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const patch = (await request.json()) as Record<string, unknown>;
    const current = session.tenant.preferences.get(session.userId) ?? {
      language: 'zh-CN' as const,
      timezone: 'Asia/Shanghai',
      notifications: { email: false, in_app: true },
    };
    const next = {
      ...current,
      ...patch,
      notifications: { ...current.notifications, ...((patch.notifications as object | undefined) ?? {}) },
    };
    session.tenant.preferences.set(session.userId, next);
    persistSessions(db);
    await delay(250);
    return HttpResponse.json(envelope(next, requestId()));
  }),

  // ---------- 项目（M4 v2.0 /projects） ----------
  http.get('*/projects', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20) || 20, 100);
    const items = session.tenant.projects.slice(0, limit);
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  http.get('*/projects/:projectId', ({ request, params }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const projectId = String(params.projectId);
    const project = session.tenant.projects.find((p) => p.id === projectId);
    if (!project) {
      // 403：跨租户访问（TC-F01-08）。文案与 404 完全一致，不泄露项目存在性。
      return errorEnvelope('forbidden', '无权访问该资源。', false, requestId(), 403);
    }
    return HttpResponse.json(envelope(project, requestId()));
  }),

  http.post('*/projects', async ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const idempotencyKey = request.headers.get('idempotency-key');
    const body = (await request.json()) as Partial<ProjectCreate>;
    const missing: string[] = [];
    if (!body.title || body.title.trim().length === 0) missing.push('title');
    if (!body.research_question || body.research_question.trim().length === 0) missing.push('research_question');
    if (!body.domain || body.domain.trim().length === 0) missing.push('domain');
    if (missing.length > 0) {
      return errorEnvelope('validation_failed', `缺少必填字段：${missing.join(', ')}`, false, requestId(), 422);
    }
    await delay(500);
    // 幂等重放：同键返回同一项目。
    if (idempotencyKey) {
      const replay = session.tenant.projectCreatedKeys.get(idempotencyKey);
      if (replay) return HttpResponse.json(envelope(replay, requestId()), { status: 201 });
    }
    const project = {
      id: uuidv7Mock(),
      tenant_id: session.tenant.tenantId,
      title: body.title!.trim(),
      research_question: body.research_question!.trim(),
      domain: body.domain!.trim(),
      stage: body.stage ?? 'discovery',
      visibility: body.visibility ?? 'private',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    session.tenant.projects.unshift(project);
    if (idempotencyKey) session.tenant.projectCreatedKeys.set(idempotencyKey, project);
    return HttpResponse.json(envelope(project, requestId()), { status: 201 });
  }),

  // ---------- 运行（M4 v2.0 GET /runs；M0 冻结契约无列表端点 → CR-F1-06） ----------
  http.get('*/runs', ({ request }) => {
    const session = readSession(request);
    if (!session) return errorEnvelope('unauthenticated', '未登录。', false, requestId(), 401);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 10) || 10, 100);
    const items = session.tenant.runs.slice(0, limit);
    return HttpResponse.json(envelope({ items, next_cursor: null }, requestId()));
  }),

  // ---------- 健康（M0 冻结契约） ----------
  http.get('*/health/live', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/health/ready', () => HttpResponse.json({ status: 'ready', checks: { db: 'ok' } })),
];

export const handlers = [...coreHandlers, ...literatureHandlers, ...writingHandlers, ...reviewHandlers, ...stewardHandlers];

export { seedDb };