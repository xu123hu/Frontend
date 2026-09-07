import { describe, expect, it } from 'vitest';
import { resolveAppConfig } from '@app/config';

describe('科研端运行模式', () => {
  it('新环境开发启动默认进入混合联调', () => {
    const config = resolveAppConfig({}, true);

    expect(config.runtimeMode).toBe('hybrid');
    expect(config.useMock).toBe(true);
  });

  it('混合联调保留演示业务数据并连接真实 AI 服务', () => {
    const config = resolveAppConfig(
      {
        VITE_RUNTIME_MODE: 'hybrid',
        VITE_USE_MOCK: 'true',
        VITE_API_BASE_URL: '/api/research/v1',
      },
      true,
    );

    expect(config.runtimeMode).toBe('hybrid');
    expect(config.useMock).toBe(true);
  });

  it('生产模式不能启用 mock', () => {
    expect(() =>
      resolveAppConfig(
        { VITE_RUNTIME_MODE: 'live', VITE_USE_MOCK: 'true' },
        false,
      ),
    ).toThrow(/生产模式/);
  });
});
