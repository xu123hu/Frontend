import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// F0 阶段：仅做应用壳、设计令牌、路由、状态矩阵、测试骨架的脚手架。
// 任何业务 API 等待 M0 契约冻结后再接入（agents/01 提示词 M0 边界）。
//
// __USE_MOCK__ 是编译期常量：生产构建（VITE_USE_MOCK≠true）下为 false，
// main.ts 的 `if (__USE_MOCK__)` 死分支被压缩器折叠，msw 不进入产物
// （design.md §7：构建产物不含 MSW）。
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // dev 默认开 mock（.env.development 显式 true）；构建仅当显式 true 才打进去。
  const useMock = command === 'serve' ? env.VITE_USE_MOCK !== 'false' : env.VITE_USE_MOCK === 'true';

  return {
    plugins: [vue()],
    define: {
      __USE_MOCK__: JSON.stringify(useMock),
    },
    resolve: {
      alias: {
        '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
        '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
        '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@mocks': fileURLToPath(new URL('./src/mocks', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      sourcemap: true,
      rollupOptions: {
        output: {
          // 08 §2 硬门禁：六个一级入口各自独立 chunk；PDF/CodeMirror/评审模块不进首包。
          manualChunks: (id) => {
            if (id.includes('node_modules/pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('node_modules/@codemirror')) return 'vendor-codemirror';
            if (id.includes('node_modules/katex')) return 'vendor-katex';
            if (id.includes('node_modules/vue')) return 'vendor-vue';
            if (id.includes('node_modules/@tanstack')) return 'vendor-tanstack';
            if (id.includes('node_modules/lucide-vue-next')) return 'vendor-icons';
            if (id.includes('src/pages/research/Literature')) return 'page-literature';
            if (id.includes('src/pages/research/Writing')) return 'page-writing';
            if (id.includes('src/pages/research/Review')) return 'page-review';
            if (id.includes('src/pages/research/Education')) return 'page-education';
            if (id.includes('src/pages/research/Project')) return 'page-project';
            if (id.includes('src/pages/research/Home')) return 'page-home';
            if (id.includes('src/widgets/AgentDrawer')) return 'widget-agent-drawer';
            if (id.includes('src/widgets/AssistantOrb')) return 'widget-assistant-orb';
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts', 'src/**/*.test.ts'],
    },
  };
});
