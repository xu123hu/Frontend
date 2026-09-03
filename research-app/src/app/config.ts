/**
 * 运行配置：仅从 Vite 环境变量读取，禁止组件内散落读取 import.meta.env。
 * VITE_API_BASE_URL：科研端 API 前缀（M0 冻结契约的路径前缀）。
 * VITE_USE_MOCK：dev/test 下启用 MSW 契约草案模拟（CR-F1-01..04），UI 显示数据源徽标；
 *               生产构建必须为 false，产物不含 msw。
 */
export interface AppConfig {
  apiBaseUrl: string;
  useMock: boolean;
  appName: string;
}

function readEnv(): AppConfig {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  return {
    apiBaseUrl: typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL : '/api/research/v1',
    // 与 vite.config 的 __USE_MOCK__ 判定保持同构：dev 未显式声明时默认开 mock，
    // 保证 .env.* 被 gitignore 的新 clone 环境里徽标与实际数据源一致（08 §6 可观察降级）。
    useMock:
      typeof env.VITE_USE_MOCK === 'string' ? env.VITE_USE_MOCK === 'true' : env.VITE_USE_MOCK === true || import.meta.env.DEV === true,
    appName: '智学数研 · 科研端',
  };
}

export const config: AppConfig = readEnv();
