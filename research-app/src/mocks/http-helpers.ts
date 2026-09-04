/**
 * MSW handlers 公共助手：Envelope、错误响应、会话读取。
 * 认证（CR-F1）与文献（CR-F2）两组 handlers 共用，避免重复实现。
 */
import { HttpResponse } from 'msw';
import { findTenantBySession } from './db';
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
  return match ? findTenantBySession(decodeURIComponent(match[1])) : null;
}
