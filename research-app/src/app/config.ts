/**
 * 运行配置：仅从 Vite 环境变量读取，禁止组件内散落读取 import.meta.env。
 * VITE_API_BASE_URL：科研端 API 前缀（M0 冻结契约的路径前缀）。
 * VITE_USE_MOCK：dev/test 下启用 MSW 契约草案模拟（CR-F1-01..04），UI 显示数据源徽标；
 *               生产构建必须为 false，产物不含 msw。
 */
export interface AppConfig {
  apiBaseUrl: string;
  useMock: boolean;
  runtimeMode: 'demo' | 'hybrid' | 'live';
  appName: string;
  /**
   * 统一身份（OIDC）。integration/live 部署设置 VITE_OIDC_ISSUER +
   * VITE_OIDC_CLIENT_ID 后启用授权码 + PKCE 登录；纯演示（MSW）模式保持
   * 手机号演示会话，两者互斥，由 oidcEnabled 单一开关决定。
   */
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcEnabled: boolean;
  /** 身份模式：platform=三端统一平台登录（默认产品路径）；oidc=独立 Keycloak；legacy=演示手机号。 */
  identityMode: 'platform' | 'oidc' | 'legacy';
}

export function resolveAppConfig(
  env: Record<string, string | boolean | undefined>,
  isDev: boolean,
): AppConfig {
  const modeValue = env.VITE_RUNTIME_MODE;
  const runtimeMode = modeValue === 'demo' || modeValue === 'hybrid' || modeValue === 'live'
    ? modeValue
    : isDev
      ? 'hybrid'
      : 'live';
  const useMock =
    typeof env.VITE_USE_MOCK === 'string'
      ? env.VITE_USE_MOCK === 'true'
      : env.VITE_USE_MOCK === true || (isDev && runtimeMode !== 'live');
  if (!isDev && useMock) {
    throw new Error('生产模式禁止启用 mock 数据');
  }
  const rawIssuer = typeof env.VITE_OIDC_ISSUER === 'string' ? env.VITE_OIDC_ISSUER.trim() : '';
  const rawClientId = typeof env.VITE_OIDC_CLIENT_ID === 'string' ? env.VITE_OIDC_CLIENT_ID.trim() : '';
  const oidcIssuer = rawIssuer ? rawIssuer.replace(/\/+$/, '') : null;
  const oidcClientId = rawClientId || null;
  const oidcEnabled = oidcIssuer !== null && oidcClientId !== null;
  // 三端统一平台登录为产品默认身份；oidc/legacy 仅显式指定时启用。
  const form = env.VITE_IDENTITY_MODE;
  const identityMode: 'platform' | 'oidc' | 'legacy' =
    form === 'oidc' ? 'oidc' : form === 'legacy' ? 'legacy' : 'platform';
  return {
    apiBaseUrl: (import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
      ? import.meta.env.BASE_URL.replace(/\/$/, '') + '/' : '/') + 'api/research/v1',
    useMock,
    runtimeMode,
    appName: '智学数研 · 科研端',
    oidcIssuer,
    oidcClientId,
    oidcEnabled,
    identityMode,
  };
}

export const config: AppConfig = resolveAppConfig(
  import.meta.env as Record<string, string | boolean | undefined>,
  import.meta.env.DEV === true,
);
