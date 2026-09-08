/**
 * 会话用例单测：探测单飞、登录写入、登出清除。
 * fetch 以 MSW handlers 相同的响应形状 stub（契约草案 CR-F1-01..03）。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from '@app/stores/session';
import { useSession } from '@features/auth/use-session';
import { ApiError } from '@app/api/client';
import type { Account } from '@entities/session/types';

// 宿主的 .env.local（OIDC 变量）按 Vite env 优先级泄漏进 vitest，会使
// config.oidcEnabled=true 走 OIDC 分支。单元测试钉死演示模式，在任何宿主
// 环境下行为一致。
vi.mock('@app/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@app/config')>();
  return { ...actual, config: { ...actual.config, oidcEnabled: false } };
});

const ACCOUNT: Account = {
  user_id: 'user-alpha-1',
  tenant_id: 'tenant-alpha-0001',
  display_name: '林研究员',
  phone_masked: '138****0001',
  created_at: '2026-06-01T00:00:00Z',
};

function stubFetch(handler: () => Promise<Response>) {
  const fn = vi.fn(handler);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function okEnvelope(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data, meta: {} }), { status: 200 });
}

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('session store', () => {
  it('初始状态为 probing，账户为空', () => {
    const store = useSessionStore();
    expect(store.status).toBe('probing');
    expect(store.account).toBeNull();
  });

  it('setAuthenticated / setAnonymous 迁移正确', () => {
    const store = useSessionStore();
    store.setAuthenticated(ACCOUNT);
    expect(store.status).toBe('authenticated');
    expect(store.isAuthenticated).toBe(true);
    store.setAnonymous();
    expect(store.status).toBe('anonymous');
    expect(store.account).toBeNull();
  });

  it('probe 单飞：并发只触发一次执行器', async () => {
    const store = useSessionStore();
    let calls = 0;
    const executor = async (): Promise<void> => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
    };
    await Promise.all([store.probe(executor), store.probe(executor), store.probe(executor)]);
    expect(calls).toBe(1);
  });
});

describe('useSession', () => {
  it('probeSession：/auth/me 200 → authenticated', async () => {
    stubFetch(async () => okEnvelope(ACCOUNT));
    const session = useSession();
    await session.probeSession();
    expect(session.status.value).toBe('authenticated');
    expect(session.account.value?.display_name).toBe('林研究员');
    expect(session.probeDegraded.value).toBeNull();
  });

  it('probeSession：/auth/me 401 → anonymous，无降级标记', async () => {
    stubFetch(async () => new Response(JSON.stringify({ success: false, error: { code: 'unauthenticated', message: '未登录。', retryable: false }, meta: {} }), { status: 401 }));
    const session = useSession();
    await session.probeSession();
    expect(session.status.value).toBe('anonymous');
    expect(session.probeDegraded.value).toBeNull();
  });

  it('probeSession：网络失败 → anonymous + degraded 标记（不静默）', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const session = useSession();
    await session.probeSession();
    expect(session.status.value).toBe('anonymous');
    expect(session.probeDegraded.value).toBe('network');
  });

  it('login 成功 → authenticated 且写入账户', async () => {
    stubFetch(async () => okEnvelope(ACCOUNT));
    const session = useSession();
    const account = await session.login('13800000001', '888888');
    expect(account.user_id).toBe('user-alpha-1');
    expect(session.isAuthenticated.value).toBe(true);
  });

  it('login 验证码错误 → 抛 ApiError(validation, retryable)', async () => {
    stubFetch(async () =>
      new Response(
        JSON.stringify({ success: false, error: { code: 'invalid_credentials', message: '验证码错误或已过期，请重新获取。', retryable: true }, meta: {} }),
        { status: 400 },
      ),
    );
    const session = useSession();
    const err = await session.login('13800000001', '000000').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('validation');
    expect(err.retryable).toBe(true);
    expect(session.isAuthenticated.value).toBe(false);
  });

  it('logout：网络失败 → 保留会话并抛出错误（不伪装登出成功）', async () => {
    stubFetch(async () => okEnvelope(ACCOUNT));
    const session = useSession();
    await session.login('13800000001', '888888');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(session.logout()).rejects.toBeInstanceOf(ApiError);
    expect(session.status.value).toBe('authenticated'); // 会话事实未被破坏
  });

  it('logout：服务端 401（会话已失效）→ anonymous', async () => {
    stubFetch(async () => okEnvelope(ACCOUNT));
    const session = useSession();
    await session.login('13800000001', '888888');
    stubFetch(async () =>
      new Response(JSON.stringify({ success: false, error: { code: 'unauthenticated', message: '未登录。', retryable: false }, meta: {} }), { status: 401 }),
    );
    await session.logout();
    expect(session.status.value).toBe('anonymous');
  });
});
