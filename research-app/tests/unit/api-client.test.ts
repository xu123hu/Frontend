/**
 * API 客户端单测：Envelope 解码、错误映射、幂等键、字段级错误。
 * 依据：M4 SuccessEnvelope/ErrorEnvelope、06 §11 Problem Details、M0 honest 501。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError, apiRequest } from '@app/api/client';

function mockFetchOnce(payload: unknown, init: { status: number; headers?: Record<string, string> }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status: init.status,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest 成功路径', () => {
  it('解包 M4 SuccessEnvelope 的 data 与 meta', async () => {
    mockFetchOnce({ success: true, data: { items: [1] }, meta: { request_id: 'req-1' } }, { status: 200 });
    const result = await apiRequest<{ items: number[] }>('/projects');
    expect(result.success).toBe(true);
    expect(result.data.items).toEqual([1]);
    expect(result.meta.request_id).toBe('req-1');
  });

  it('204 无内容返回 undefined data（DELETE /auth/session）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    const result = await apiRequest<void>('/auth/session', { method: 'DELETE' });
    expect(result.success).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('携带 Idempotency-Key 头（M4 /projects POST 约定）', async () => {
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ success: true, data: {}, meta: {} }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await apiRequest('/projects', { method: 'POST', body: {}, idempotencyKey: 'key-123' });
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Idempotency-Key')).toBe('key-123');
  });
});

describe('apiRequest 错误映射', () => {
  it('401 → kind=unauthorized, retryable=false', async () => {
    mockFetchOnce({ success: false, error: { code: 'unauthenticated', message: '未登录。', retryable: false }, meta: {} }, { status: 401 });
    const err = await apiRequest('/auth/me').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('unauthorized');
    expect(err.retryable).toBe(false);
  });

  it('403 → kind=forbidden（跨租户访问不泄露存在性）', async () => {
    mockFetchOnce({ success: false, error: { code: 'forbidden', message: '无权访问该资源。', retryable: false }, meta: {} }, { status: 403 });
    const err = await apiRequest('/projects/x').catch((e) => e);
    expect(err.kind).toBe('forbidden');
    expect(err.message).toBe('无权访问该资源。');
  });

  it('501 → kind=not_wired（M0 honest 501 可观察降级）', async () => {
    mockFetchOnce({ detail: 'Not Implemented' }, { status: 501 });
    const err = await apiRequest('/runs').catch((e) => e);
    expect(err.kind).toBe('not_wired');
  });

  it('429 → kind=rate_limited 且 retryable', async () => {
    mockFetchOnce({ success: false, error: { code: 'rate_limited', message: '请求过于频繁。', retryable: true }, meta: {} }, { status: 429 });
    const err = await apiRequest('/auth/session/otp', { method: 'POST', body: {} }).catch((e) => e);
    expect(err.kind).toBe('rate_limited');
    expect(err.retryable).toBe(true);
  });

  it('422 FastAPI 字段错误提取 loc → fieldErrors', async () => {
    mockFetchOnce(
      { detail: [{ loc: ['body', 'title'], msg: 'field required', type: 'missing' }] },
      { status: 422 },
    );
    const err = await apiRequest('/projects', { method: 'POST', body: {} }).catch((e) => e);
    expect(err.kind).toBe('validation');
    expect(err.fieldErrors.title).toBe('field required');
  });

  it('400 错误信封（验证码错误）→ kind=validation + retryable 透传', async () => {
    mockFetchOnce({ success: false, error: { code: 'invalid_credentials', message: '验证码错误或已过期，请重新获取。', retryable: true }, meta: {} }, { status: 400 });
    const err = await apiRequest('/auth/session', { method: 'POST', body: {} }).catch((e) => e);
    expect(err.kind).toBe('validation');
    expect(err.retryable).toBe(true);
    expect(err.message).toContain('验证码错误');
  });

  it('网络异常 → kind=network + retryable（不吞成假成功）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const err = await apiRequest('/projects').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('network');
    expect(err.retryable).toBe(true);
  });

  it('AbortError → kind=aborted（调用方取消不算失败）', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new DOMException('aborted', 'AbortError');
      }),
    );
    const err = await apiRequest('/projects', { signal: new AbortController().signal }).catch((e) => e);
    expect(err.kind).toBe('aborted');
    expect(err.isAborted).toBe(true);
  });

  it('成功信封携带 success=false → 契约违规错误（不静默）', async () => {
    mockFetchOnce({ success: false, error: { code: 'x', message: 'boom', retryable: false }, meta: {} }, { status: 200 });
    const err = await apiRequest('/projects').catch((e) => e);
    expect(err.kind).toBe('server');
    expect(err.message).toContain('契约不匹配');
  });
});
