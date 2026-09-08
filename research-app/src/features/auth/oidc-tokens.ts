/**
 * OIDC 令牌存取（统一身份登录，integration/live 模式）。
 *
 * 安全基线（M4 §11）：access/refresh token 仅存 sessionStorage（关闭标签页即
 * 丢弃），不落 localStorage；本模块不得依赖 api client —— client.ts 反向引用
 * 本模块注入 Bearer 头，依赖方向必须保持单向。
 */
import { config } from '@app/config';
import { getPlatformAccessToken } from './platform-session';

export interface OidcTokens {
  access_token: string;
  refresh_token: string | null;
  id_token: string | null;
  /** access token 过期时刻（毫秒时间戳，已含 30s 提前量）。 */
  expires_at: number;
}

const STORAGE_KEY = 'research.oidc.tokens';
/** 提前 30s 视为过期，避免在途请求撞上边界。 */
const EXPIRY_MARGIN_MS = 30_000;

export class OidcTokenError extends Error {
  readonly kind: 'network' | 'session_expired';

  constructor(kind: 'network' | 'session_expired', message: string) {
    super(message);
    this.name = 'OidcTokenError';
    this.kind = kind;
  }
}

/** 解析 JWT payload（base64url → JSON）。签名校验由后端资源服务器负责，前端只读 claims。 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('非法 JWT 结构');
  const payload = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'));
  const json = decodeURIComponent(
    payload
      .split('')
      .map((ch) => `%${`00${ch.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(''),
  );
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('JWT payload 不是对象');
  return parsed as Record<string, unknown>;
}

function read(): OidcTokens | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as OidcTokens).access_token !== 'string' ||
      typeof (parsed as OidcTokens).expires_at !== 'number'
    ) {
      return null;
    }
    return parsed as OidcTokens;
  } catch {
    return null;
  }
}

function write(tokens: OidcTokens | null): void {
  try {
    if (tokens) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 隐私模式等 sessionStorage 不可用：登录无法维持，按未登录处理。
  }
}

export function clearTokens(): void {
  write(null);
}

/** 当前已存令牌（不刷新）。oidc 关闭时恒为 null。 */
export function currentTokens(): OidcTokens | null {
  return config.oidcEnabled ? read() : null;
}

/** 解析已存 id_token 的 claims（sub/tenant_id/preferred_username/email）。 */
export function idClaims(): Record<string, unknown> | null {
  const tokens = read();
  if (!tokens?.id_token) return null;
  try {
    return decodeJwtPayload(tokens.id_token);
  } catch {
    return null;
  }
}

/** 已存 id_token 原文（登出 end_session 的 id_token_hint 用）。 */
export function currentIdToken(): string | null {
  return config.oidcEnabled ? (read()?.id_token ?? null) : null;
}

function applyTokenResponse(payload: Record<string, unknown>): OidcTokens {
  const accessToken = payload.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new OidcTokenError('session_expired', '令牌响应缺少 access_token。');
  }
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 300;
  const tokens: OidcTokens = {
    access_token: accessToken,
    refresh_token:
      typeof payload.refresh_token === 'string' && payload.refresh_token
        ? payload.refresh_token
        : (read()?.refresh_token ?? null),
    id_token:
      typeof payload.id_token === 'string' && payload.id_token
        ? payload.id_token
        : (read()?.id_token ?? null),
    expires_at: Date.now() + expiresIn * 1000 - EXPIRY_MARGIN_MS,
  };
  write(tokens);
  return tokens;
}

async function requestToken(body: URLSearchParams): Promise<OidcTokens> {
  let response: Response;
  try {
    response = await fetch(`${config.oidcIssuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new OidcTokenError('network', '统一认证服务不可达。');
  }
  if (!response.ok) {
    throw new OidcTokenError('session_expired', '统一认证会话已失效，请重新登录。');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    throw new OidcTokenError('session_expired', '统一认证响应格式非法。');
  }
  return applyTokenResponse(payload as Record<string, unknown>);
}

/** 取可用 access token：未过期直接返回；过期先刷新；无法恢复时清空并返回 null（不抛）。 */
export async function getValidAccessToken(): Promise<string | null> {
  // 三端统一平台身份：直接走平台 cookie → access token 桥接。
  if (config.identityMode === 'platform') return getPlatformAccessToken();
  if (!config.oidcEnabled) return null;
  const tokens = read();
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  if (!tokens.refresh_token) {
    clearTokens();
    return null;
  }
  try {
    const refreshed = await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.oidcClientId!,
        refresh_token: tokens.refresh_token,
      }),
    );
    return refreshed.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * 强制刷新一次（401 恢复路径）。成功返回新 access token；失败清空会话并抛错。
 */
export async function refreshAccessToken(): Promise<string> {
  if (!config.oidcEnabled) throw new OidcTokenError('session_expired', '统一身份未启用。');
  const tokens = read();
  if (!tokens?.refresh_token) {
    clearTokens();
    throw new OidcTokenError('session_expired', '没有可用的刷新令牌。');
  }
  try {
    return (await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.oidcClientId!,
        refresh_token: tokens.refresh_token,
      }),
    )).access_token;
  } catch (err) {
    clearTokens();
    throw err;
  }
}

/** 写入授权码交换得到的令牌（供 oidc.ts 流程层使用）。 */
export function storeTokenResponse(payload: Record<string, unknown>): OidcTokens {
  return applyTokenResponse(payload);
}
