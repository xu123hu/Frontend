import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { mockApi } from './src/mock/server'

// 默认：连真实后端（/api 代理到 127.0.0.1:8000）
// 需要演示假数据时显式开启 mock：VITE_USE_MOCK=1 npm run dev（mock 中间件完整模拟 /api，代理不启用）
const useMock = !!process.env.VITE_USE_MOCK
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
// 兼容旧开关：VITE_REAL_API=1 无副作用（真实后端已是默认）
const useRealApi = !useMock

export default defineConfig({
  plugins: [
    vue(),
    useMock && {
      name: 'mock-api-server',
      configureServer(server) {
        server.middlewares.use('/api', (req, res, next) => {
          mockApi(req, res, next)
        })
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 双师课堂验收契约：主入口必须是 http://127.0.0.1:5176/dual
    // （显式绑定 IPv4，避免 localhost 解析成 ::1 导致 127.0.0.1 无法访问）
    host: '127.0.0.1',
    port: 5176,
    proxy: useRealApi
      ? { '/api': { target: apiProxyTarget, changeOrigin: true } }
      : undefined,
    // research-repos 是克隆的参考仓库（工作材料，非本应用源码），不参与 Vite 监听，避免 full-reload 抖动
    watch: { ignored: ['**/research-repos/**', '**/dist/**'] },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
