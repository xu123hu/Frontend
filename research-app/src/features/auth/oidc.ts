/**
 * 统一身份（OIDC）登录流：Authorization Code + PKCE（S256）。
 *
 * - 与后端身份体系的唯一会话契约：短期 access token（Bearer），后端
 *   TokenVerifier 校验 iss/aud/exp/tenant_id（research_domain.platform.auth）。
 * - IdP 为 Keycloak realm research，公开客户端 research-web（realm 配置
 *   infra/keycloak/realm-research.json，webOrigins 覆盖 vite dev 源）。
 * - state/nonce/code_verifier 存 sessionStorage：跨跳转存续，state 校验防 CSRF。
 * - 仅 integration/live 模式启用（config.oidcEnabled）；纯演示模式不触达。
 */
import { apiRequest } from '@app/api/client';
import type { Account } from '@entities/session/types';
import { config } from '@app/config';
import { clearTokens, currentIdToken, idClaims, storeTokenResponse } from './oidc-tokens';

const PKCE_KEY = 'research.oidc.pkce';

interface PkceContext {
  verifier: string;
  state: string;
  nonce: string;
  /** 登录前的目标路由（/research 开头），回调后恢复。 */
  redirectUri: string;
  createdAt: number;
}

export class OidcLoginError extends Error {
  readonly kind: 'state_mismatch' | 'provider_error' | 'exchange_failed';

  constructor(kind: 'state_mismatch' | 'provider_error' | 'exchange_failed', message: string) {
    super(message);
    this.name = 'OidcLoginError';
    this.kind = kind;
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 → base64url（PKCE S256 challenge）。 */
export async function sha256Base64Url(plain: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new OidcLoginError('exchange_failed', '当前环境不支持 WebCrypto。');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(plain));
  return base64UrlEncode(new Uint8Array(digest));
}

function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function readContext(): PkceContext | null {
  try {
    const raw = sessionStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as PkceContext).verifier !== 'string' ||
      typeof (parsed as PkceContext).state !== 'string'
    ) {
      return null;
    }
    return parsed as PkceContext;
  } catch {
    return null;
  }
}

/** 发起统一身份登录：跳转 Keycloak 授权端点（携带 PKCE + state）。 */
export async function beginOidcLogin(redirectTo = '/research/home'): Promise<void> {
  if (!config.oidcEnabled) throw new OidcLoginError('provider_error', '统一身份未配置。');
  const verifier = randomToken(48);
  const state = randomToken(16);
  const nonce = randomToken(16);
  const challenge = await sha256Base64Url(verifier);
  const context: PkceContext = {
    verifier,
    state,
    nonce,
    redirectUri: redirectTo.startsWith('/research') ? redirectTo : '/research/home',
    createdAt: Date.now(),
  };
  sessionStorage.setItem(PKCE_KEY, JSON.stringify(context));
  const authorizeUrl = new URL(`${config.oidcIssuer}/protocol/openid-connect/auth`);
  authorizeUrl.searchParams.set('client_id', config.oidcClientId!);
  authorizeUrl.searchParams.set('response_type', 'code');
  // realm research 只定义了自定义 client scopes（tenant-id/research-api-audience/
  // projects:*），内建 profile/email 未建——scope 收窄为 openid，账户信息走 /users/me。
  authorizeUrl.searchParams.set('scope', 'openid');
  authorizeUrl.searchParams.set('redirect_uri', `${window.location.origin}/research/login`);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('nonce', nonce);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  window.location.assign(authorizeUrl.toString());
}

/** 当前 URL 是否携带授权回调（code + state）。 */
export function isOidcCallback(query: Record<string, unknown>): boolean {
  return typeof query.code === 'string' && typeof query.state === 'string';
}

/**
 * 完成回调：校验 state → 授权码换令牌（direct grant 关闭，仅授权码）→
 * 清理一次性上下文。成功后令牌已入 sessionStorage。
 */
export async function completeOidcLogin(query: Record<string, unknown>): Promise<void> {
  if (!config.oidcEnabled) throw new OidcLoginError('provider_error', '统一身份未配置。');
  if (typeof query.error === 'string') {
    sessionStorage.removeItem(PKCE_KEY);
    throw new OidcLoginError('provider_error', `统一认证拒绝了本次登录（${query.error}）。`);
  }
  const context = readContext();
  const code = typeof query.code === 'string' ? query.code : '';
  const state = typeof query.state === 'string' ? query.state : '';
  if (!context || !code || state !== context.state) {
    sessionStorage.removeItem(PKCE_KEY);
    throw new OidcLoginError('state_mismatch', '登录回调校验失败，请重新登录。');
  }
  // 上下文 10 分钟过期：覆盖整个跳转生命周期，避免陈旧 verifier 被重放。
  if (Date.now() - context.createdAt > 10 * 60 * 1000) {
    sessionStorage.removeItem(PKCE_KEY);
    throw new OidcLoginError('state_mismatch', '登录会话已超时，请重新登录。');
  }
  let response: Response;
  try {
    response = await fetch(`${config.oidcIssuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.oidcClientId!,
        code,
        redirect_uri: `${window.location.origin}/research/login`,
        code_verifier: context.verifier,
      }),
    });
  } catch {
    throw new OidcLoginError('exchange_failed', '统一认证服务不可达，请稍后重试。');
  }
  if (!response.ok) {
    throw new OidcLoginError('exchange_failed', '授权码换取令牌失败，请重新登录。');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object' || typeof (payload as Record<string, unknown>).access_token !== 'string') {
    throw new OidcLoginError('exchange_failed', '统一认证响应格式非法。');
  }
  storeTokenResponse(payload as Record<string, unknown>);
  sessionStorage.removeItem(PKCE_KEY);
}

function pickClaim(claims: Record<string, unknown> | null, key: string): string | null {
  const value = claims?.[key];
  return typeof value === 'string' && value ? value : null;
}

/**
 * 拉取统一身份账户：真实后端 GET /users/me（TokenVerifier → RLS →
 * platform.users 供应）+ id_token claims 补齐租户绑定。任一步失败向上抛。
 */

/** H12: 显示名不得是UUID。若为UUID或空，回退"科研用户"占位。 */
function safeDisplayName(name: string | undefined | null): string {
  if (!name || name.trim().length === 0) return '科研用户';
  const trimmed = name.trim();
  // UUID v4/v7 模式：8-4-4-4-12 十六进制
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) return '科研用户';
  return trimmed;
}
export async function fetchOidcAccount(): Promise<Account> {
  const me = await apiRequest<{
    id: string;
    subject: string;
    email: string;
    display_name: string;
  }>('/users/me').then((envelope) => envelope.data);
  const claims = idClaims();
  const email = me.email || pickClaim(claims, 'email') || '';
  return {
    user_id: me.id,
    tenant_id: pickClaim(claims, 'tenant_id') ?? '',
display_name: safeDisplayName(me.display_name || pickClaim(claims, 'preferred_username') || me.subject),
    email: email || undefined,
    created_at: new Date().toISOString(),
  };
}

/**
 * 统一身份登出：清空本地令牌后跳转 Keycloak end_session（带 id_token_hint
 * 与 post_logout_redirect_uri；realm 客户端需允许该登出回跳）。
 */
export function oidcLogout(): void {
  const idToken = currentIdToken();
  clearTokens();
  const logoutUrl = new URL(`${config.oidcIssuer}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('client_id', config.oidcClientId!);
  logoutUrl.searchParams.set('post_logout_redirect_uri', `${window.location.origin}/research/login`);
  if (idToken) logoutUrl.searchParams.set('id_token_hint', idToken);
  window.location.assign(logoutUrl.toString());
}
