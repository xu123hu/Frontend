import { defineConfig, devices } from '@playwright/test';

/**
 * F0 阶段 E2E 配置。
 * 仅在三个视口下截屏作为视觉对照证据；不写任何业务断言。
 * 真正的六条黄金链路 Playwright spec 在 F1+ 阶段逐条写就。
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  /**
   * workers 收拢为 3（每项目 1 个 worker：项目内串行、项目间并行）。
   * 依据（实测）：本机 20 逻辑核 → Playwright 默认 workers=10，F2 重用例
   * （PDF.js 双次渲染、万条种子虚拟滚动、SSE 事件流）在 10 个并发 chromium
   * 实例 + 单 vite dev server 下轮换触顶超时（阅读用例 30000ms 测试级超时、
   * 轻用例默认 5s 断言超时，均在不同运行轮换出现）。收拢后消除该竞争。
   */
  workers: 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'mobile-390', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
