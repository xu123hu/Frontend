import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setAccessToken } from './api/authSession'
import { resolveMockStartupIdentity, resolveMockUser } from './config/mockIdentity'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import './styles/tokens.css'
import './styles/editorial.css'
import './styles/base.css'
import './styles/v4.css'
import './styles/teacher-v3.css'
import './styles/teacher-tokens.css'
import './styles/research.css'
import './styles/research-end.css'

// 本地预览便捷引导：仅本地预览模式才预置 mock 身份（默认真实 API 模式绝不预置）。
// VITE_MOCK_ROLE=teacher 预置教师；默认/student 保持学生。
const useMock = import.meta.env.VITE_USE_MOCK === '1'
let mockRole = (import.meta.env.VITE_MOCK_ROLE || 'student').toString()
if (useMock) {
  const startup = resolveMockStartupIdentity(mockRole, document.cookie, localStorage.getItem('ma_user'))
  mockRole = startup.role
  document.cookie = `ma_mock_role=${startup.role}; path=/; SameSite=Lax`
  document.cookie = `ma_mock_state=${startup.state}; path=/; SameSite=Lax`
  document.cookie = 'ma_csrf=mock-csrf; path=/; SameSite=Lax'
  const mockToken = startup.activeRole === 'student' ? 'mock-token-preview' : `mock-token-${startup.activeRole}-preview`
  setAccessToken(mockToken)
  try {
    if (!startup.storedUser) localStorage.setItem('ma_user', JSON.stringify(resolveMockUser(mockRole)))
  } catch { /* ignore */ }
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
