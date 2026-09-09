import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { mockApi } from './src/mock/server'
import { canonicalLocalOrigin } from './src/utils/localOrigin.js'

// 默认：连真实后端（/api 代理到 127.0.0.1:8000）
// 需要演示假数据时显式开启 mock：VITE_USE_MOCK=1 npm run dev（mock 中间件完整模拟 /api，代理不启用）
const useMock = !!process.env.VITE_USE_MOCK
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'
// 学生 AI Runtime（B1 集成服务）：/api/agent 走方言层、/api/v1 走知识域（B2 检索/入库）
const agentProxyTarget = process.env.VITE_AGENT_API_PROXY_TARGET || 'http://127.0.0.1:8012'
// 教师平台独立栈（02-ARCHITECTURE §1.3）：/api/teacher-v3 优先于 /api 命中 :8100
const teacherApiProxyTarget = process.env.VITE_TEACHER_API_PROXY_TARGET || 'http://127.0.0.1:8100'
// 兼容旧开关：VITE_REAL_API=1 无副作用（真实后端已是默认）
const useRealApi = !useMock
const devPort = Number(process.env.PORT) || 5176

/** Keep the dev server on one origin so ma_refresh/ma_csrf are always sent. */
function canonicalLocalHost() {
  return {
    name: 'canonical-local-auth-origin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const location = canonicalLocalOrigin(req.url, req.headers.host, devPort)
        if (!location) return next()
        res.statusCode = 307
        res.setHeader('Location', location)
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    canonicalLocalHost(),
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
    // PORT 环境变量优先（预览面板 autoPort 派发）；缺省 5176 保持验收契约
    host: '127.0.0.1',
    port: devPort,
    proxy: useRealApi
      ? {
          // 教师平台优先命中（键序即匹配序，前缀更长者在前）
          // 生成接口为真 LLM（大纲/教案/逐页），单次可长达 2-3 分钟：proxyTimeout 必须放开，
          // 否则 Vite 默认 30s 断开 → 前端误报「mock 未启动」
          '/api/teacher-v3': { target: teacherApiProxyTarget, changeOrigin: true, proxyTimeout: 300000, timeout: 300000 },
          // P2-29：学生对话/引导解题/思考/直接看答案回接旧后端 :8000（agent_router+socratic_solver 全会话能力）；
          // 知识库 /api/v1 继续走 :8012 集成服务
          '/api/agent': { target: agentProxyTarget, changeOrigin: true, proxyTimeout: 300000, timeout: 300000 },
          '/api/v1': { target: agentProxyTarget, changeOrigin: true, proxyTimeout: 300000, timeout: 300000 },
          '/api': { target: apiProxyTarget, changeOrigin: true, proxyTimeout: 300000, timeout: 300000 },
        }
      : undefined,
    // research-repos 是克隆的参考仓库（工作材料，非本应用源码），不参与 Vite 监听，避免 full-reload 抖动
    watch: { ignored: ['**/research-repos/**', '**/dist/**'] },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
