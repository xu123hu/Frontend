let accessToken = ''
let refreshPromise = null

export function getAccessToken() { return accessToken }
export function setAccessToken(token) { accessToken = token || '' }
export function clearAccessToken() { accessToken = '' }

export function getCsrfToken() {
  const match = document.cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('ma_csrf='))
  return match ? decodeURIComponent(match.slice('ma_csrf='.length)) : ''
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const csrf = getCsrfToken()
    const response = await fetch('/api/auth/token/refresh', {
      method: 'POST', credentials: 'include', headers: csrf ? { 'X-CSRF-Token': csrf } : {},
    })
    let payload = null
    try { payload = await response.json() } catch { /* handled below */ }
    if (!response.ok || payload?.code !== 0 || !payload?.data?.access_token) {
      clearAccessToken()
      const error = new Error(payload?.message || '登录状态已失效')
      error.code = payload?.code || response.status
      error.errorKey = payload?.error_key || 'AUTH_REFRESH_INVALID'
      throw error
    }
    setAccessToken(payload.data.access_token)
    return payload.data
  })().finally(() => { refreshPromise = null })
  return refreshPromise
}

export function __resetAuthSessionForTests() {
  accessToken = ''
  refreshPromise = null
}
