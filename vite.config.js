import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, normalize, extname } from 'node:path'
import { request as httpRequest } from 'node:http'
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

// 科研端同源挂载：把科研前端（research-app）构建产物作为 /research-app/* 由主前端服务。
// 使学生/教师/科研都在 http://127.0.0.1:5176 一个地址上（含深链/刷新），
// 科研 API 走上面 proxy（剥 base 前缀 → :18010），科研身份为 Keycloak（同源内完成登录）。
const RESEARCH_DIST = 'D:/科研端worktrees/agent-01-frontend/research-app/dist'
const RESEARCH_API_TARGET = 'http://127.0.0.1:18010'
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json',
  '.map': 'application/json', '.ico': 'image/x-icon',
}
/** 转发科研 API 到 18010（剥 /research-app 基前缀），保证任意中间件次序都命中真实后端 */
function forwardResearchApi(req, res) {
  const url = new URL(req.url || '/', RESEARCH_API_TARGET)
  const targetPath = url.pathname.replace(/^\/research-app/, '') + (url.search || '')
  const out = httpRequest({ hostname: '127.0.0.1', port: 18010, method: req.method, path: targetPath, headers: { ...req.headers, host: '127.0.0.1:18010' } }, (up) => {
    res.writeHead(up.statusCode || 502, up.headers)
    up.pipe(res)
  })
  out.on('error', () => { if (!res.headersSent) { res.statusCode = 502; res.end('research API unreachable') } else res.end() })
  req.pipe(out)
}
function researchMount() {
  return {
    name: 'research-app-mount',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // connect 全路径中间件（不挂路径，避免 req.url 被剥基前缀）
        const full = req.originalUrl || req.url || '/'
        if (!full.startsWith('/research-app')) return next()
        try {
          const url = new URL(full, 'http://localhost')
          if (url.pathname.startsWith('/research-app/api/')) return forwardResearchApi(req, res)
          let rel = decodeURIComponent(url.pathname)
          if (rel.startsWith('/research-app')) rel = rel.slice('/research-app'.length)
          if (!rel || rel === '/') rel = '/index.html'
          let file = normalize(join(RESEARCH_DIST, rel))
          if (!file.startsWith(normalize(RESEARCH_DIST))) { res.statusCode = 403; return res.end('forbidden') }
          if (!existsSync(file) || statSync(file).isDirectory()) file = join(RESEARCH_DIST, 'index.html')
          const ext = extname(file)
          res.setHeader('Content-Type', MIME[ext] || MIME['.html'])
          res.setHeader('Cache-Control', 'no-store')
          res.end(readFileSync(file))
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    canonicalLocalHost(),
    researchMount(),
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
          '/api/teacher-v3': { target: teacherApiProxyTarget, changeOrigin: true },
          '/api/agent': { target: agentProxyTarget, changeOrigin: true },
          '/api/v1': { target: agentProxyTarget, changeOrigin: true },
          '/api': { target: apiProxyTarget, changeOrigin: true },
        }
      : undefined,
    // research-repos 是克隆的参考仓库（工作材料，非本应用源码），不参与 Vite 监听，避免 full-reload 抖动
    watch: { ignored: ['**/research-repos/**', '**/dist/**'] },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
