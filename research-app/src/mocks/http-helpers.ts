/**
 * MSW handlers 公共助手：Envelope、错误响应、会话读取。
 * 认证（CR-F1）与文献（CR-F2）两组 handlers 共用，避免重复实现。
 */
import { HttpResponse } from 'msw';
import { findDemoSessionForOidc, findTenantBySession } from './db';
import type { TenantRecord } from './db';

export const SESSION_COOKIE = 'rsid';

export function envelope<T>(data: T, requestId: string) {
  return { success: true as const, data, meta: { request_id: requestId } };
}

export function errorEnvelope(code: string, message: string, retryable: boolean, requestId: string, status: number) {
  return HttpResponse.json(
    { success: false as const, error: { code, message, retryable }, meta: { request_id: requestId } },
    { status },
  );
}

export function requestId(): string {
  return `req-${crypto.randomUUID().slice(0, 12)}`;
}

export function readCookieHeader(request: Request): string {
  // 浏览器端：MSW handlers 在页面上下文执行，SW 转发的请求会丢失 Cookie 头
  // （实测 MSW 2.15），而 Set-Cookie 已真实写入 document.cookie —— 直接读同源
  // Cookie jar，语义等价于服务端读取会话 Cookie。node 契约测试读请求头。
  if (typeof document !== 'undefined') return document.cookie;
  return request.headers.get('cookie') ?? '';
}

export function readSession(request: Request): { tenant: TenantRecord; userId: string } | null {
  const match = readCookieHeader(request).match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) return findTenantBySession(decodeURIComponent(match[1]));
  // 统一身份（OIDC）混合模式：真实会话（Bearer）按已认证演示会话处理，
  // 避免"已登录却被演示数据面判为未登录"的假错误（徽标仍标演示数据）。
  if (request.headers.get('authorization')?.startsWith('Bearer ')) {
    return findDemoSessionForOidc();
  }
  return null;
}

/**
 * 断网模拟测试钩子（F5，06 §2「一次短暂断网」验收条件）。
 *
 * MSW(browser worker) 在页面上下文拦截请求，真实网络层断网（Playwright setOffline /
 * route.abort / CDP emulateNetworkConditions 三种均实测被 SW 屏蔽，请求仍返回 200，
 * 见 F5 实证记录）。因此断网体验 E2E 通过在请求头携带 `X-Simulate-Network-Error: 1`
 * 触发 handler 返回 `HttpResponse.error()` —— 该响应让客户端 fetch 以 TypeError 真实
 * reject（已单测验证），走 api client 的 kind='network' 降级路径（Boundary + 重试），
 * 不伪造成功。生产构建不包含 MSW，此钩子随 mock 层被整体剔除。
 */
export const SIMULATE_NETWORK_ERROR_HEADER = 'x-simulate-network-error';

export function simulatedNetworkError(request: Request): Response | undefined {
  if (request.headers.get(SIMULATE_NETWORK_ERROR_HEADER) === '1') {
    return HttpResponse.error();
  }
  return undefined;
}
