/**
 * 应用启动入口。
 * 顺序：tokens.css → 创建应用实例 → 装载 Pinia → 装载 Query → 装载 Router → 挂载。
 * 任何业务 API 客户端（OpenAPI 生成）必须在 M0 冻结后追加。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import App from '../App.vue';
import { router } from './router';
import './styles/tokens.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 与 M0 契约的 02 §6 一致：retry 仅在网络层，schema 错误不重试。
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
app.use(VueQueryPlugin, { queryClient });

app.use(router);
app.mount('#app');
