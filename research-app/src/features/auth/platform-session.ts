/**
 * 平台统一身份适配（三端单令牌桥接）。
 *
 * 科研前端不再维护独立的 Keycloak 会话：与平台登录页同源（:5176），
 * 平台登录成功后浏览器持有 ma_refresh/ma_csrf cookie；科研端通过
 * 平台自身的 /api/auth/token/refresh 换取短期 access token（HS256），
 * 以 Bearer 形式调用科研后端；科研后端再服务端 introspection 换身份。
 *
 * 红线：令牌只存内存（刷新页面后经 cookie 重新换取），不落 localStorage；
 * 任何一步失败都如实返回 null / 抛错，禁止伪造已登录态。
 */
import { config } from '@app/config';

interface PlatformTokenPayload {
  access_token: string;
  expires_in: number;
}

interface PlatformMe {
  id: string;
  nickname: string;
  active_role: string;
}

let cached: { token: string; expires_at: number } | null = null;
let refreshPromise: Promise<string | null> | null = null;
const EXPIRY_MARGIN_MS = 30_000;

function csrfToken(): string {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('ma_csrf='));
  return match ? decodeURIComponent(match.slice('ma_csrf='.length)) : '';
}

async function refreshOnce(): Promise<string | null> {
  const csrf = csrfToken();
  let resp: Response;
  try {
    resp = await fetch('/api/auth/token/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  let body: unknown = null;
  try {
    body = await resp.json();
  } catch {
    return null;
  }
  // 平台 /api/auth/token/refresh 返回信封 {code, data:{access_token, expires_in}}
  const payload = (body as { data?: PlatformTokenPayload } | null)?.data;
  const token = payload?.access_token;
  if (!token) return null;
  cached = {
    token,
    expires_at: Date.now() + (payload.expires_in ?? 300) * 1000 - EXPIRY_MARGIN_MS,
  };
  return token;
}

/** 取平台 access token：内存未过期直接用；过期/缺失经 cookie 换新；无会话返回 null。 */
export async function getPlatformAccessToken(): Promise<string | null> {
  if (config.identityMode !== 'platform') return null;
  if (cached && Date.now() < cached.expires_at) return cached.token;
  cached = null;
  if (!refreshPromise) {
    refreshPromise = refreshOnce().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** 拉取平台账户（display 用）：无令牌/失败返回 null。 */
export async function fetchPlatformMe(): Promise<PlatformMe | null> {
  const token = await getPlatformAccessToken();
  if (!token) return null;
  let resp: Response;
  try {
    resp = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      credentials: 'same-origin',
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  const payload: unknown = await resp.json().catch(() => null);
  const data = (payload as { data?: PlatformMe } | null)?.data;
  if (!data?.id) return null;
  return data;
}

/** 平台登出：撤 cookie + 清内存令牌。失败不阻塞本地清空（结果可观察）。 */
export async function platformLogout(): Promise<void> {
  cached = null;
  const csrf = csrfToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    });
  } catch {
    // ignore: 本地会话已清空，服务端 cookie 由浏览器保持；用户再次登录不受影响。
  }
}
