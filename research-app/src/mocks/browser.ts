/**
 * MSW browser worker：仅 VITE_USE_MOCK=true 时由 main.ts 动态加载。
 * 生产构建不进入 bundle（动态 import + 环境变量门禁）。
 */
import { setupWorker } from 'msw/browser';
import { db, seedDb } from './db';
import { handlers } from './handlers';
import { restoreSessions } from './session-persistence';

export const worker = setupWorker(...handlers);

export async function startMockWorker(): Promise<void> {
  seedDb();
  // 恢复刷新前会话/偏好事实（模拟服务端持久化语义，TC-F01-02/07）。
  restoreSessions(db);
  await worker.start({
    onUnhandledRequest: 'warn',
    quiet: false,
  });
}
