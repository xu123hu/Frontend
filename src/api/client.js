/**
 * 统一 API 客户端
 * - 信封约定：{ code, message, data }，code === 0 成功，其余抛 ApiError
 * - 401 自动清登并跳转登录页
 */
const BASE = '/api'
const TOKEN_KEY = 'ma_token'
const USER_KEY = 'ma_user'

export class ApiError extends Error {
  constructor(code, message) {
    super(message || `请求失败 (${code})`)
    this.code = code
  }
}

export function getToken() { return localStorage.getItem(TOKEN_KEY) || '' }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) }
export function getCachedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
}
export function setCachedUser(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY) }

export function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

/**
 * 401 处理：SPA 内 router.push 跳登录（不整页刷新，保留路由状态）。
 * client 被 router 反向引用，故动态 import 避免循环依赖。
 */
export function redirectLogin() {
  if (location.pathname.startsWith('/login')) return
  import('@/router').then(({ router }) => {
    router.push({ path: '/login', query: { redirect: location.pathname } }).catch(() => {})
  }).catch(() => { location.href = '/login' })
}

async function request(method, path, { body, query } = {}) {
  let url = BASE + path
  if (query) {
    const qs = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, String(v))
    })
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  const headers = { ...authHeaders() }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  } catch (e) {
    throw new ApiError(-1, '网络连接失败，请确认后端已启动')
  }

  if (res.status === 401) {
    setToken(''); setCachedUser(null)
    redirectLogin()
    throw new ApiError(401, '登录已过期')
  }

  let json
  try { json = await res.json() } catch { throw new ApiError(res.status, `响应解析失败 (HTTP ${res.status})`) }

  // 统一信封
  if (json && typeof json.code !== 'undefined') {
    if (json.code === 0) return json.data
    throw new ApiError(json.code, json.message || '请求失败')
  }
  // 非信封响应（FastAPI 默认错误格式 {"detail": "..."} 等）：HTTP 非 2xx 一律抛错，
  // 供调用方识别 404/405 做新端点优雅降级
  if (!res.ok) throw new ApiError(res.status, json?.detail || `HTTP ${res.status}`)
  return json
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body, query) => request('POST', path, { body, query }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
}
