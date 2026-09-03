/**
 * 应用启动入口。
 * 顺序：tokens.css →（可选）MSW 契约草案 worker → Pinia → Query → Router → 挂载。
 * 会话探测在路由守卫内单飞执行（router.beforeEach），不在启动时阻塞首帧。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import App from '../App.vue';
import { router } from './router';
import './styles/tokens.css';

async function bootstrap(): Promise<void> {
  // __USE_MOCK__ 为编译期常量（vite.config define）：生产构建折叠为 false，
  // 动态 import 的 msw 分支被整块剔除，产物不含 MSW（design.md §7 红线）。
  if (__USE_MOCK__) {
    const { startMockWorker } = await import('@mocks/browser');
    await startMockWorker();
  }

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 02 §6：retry 仅在网络/服务层；4xx（含契约校验错误）不重试。
        retry: (failureCount, error) => {
          if (error instanceof Error && 'kind' in error) {
            const apiError = error as { kind?: string; retryable?: boolean };
            if (apiError.kind === 'aborted') return false;
            if (apiError.retryable === false) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
  app.use(VueQueryPlugin, { queryClient });

  app.use(router);
  await router.isReady();
  app.mount('#app');
}

void bootstrap();
