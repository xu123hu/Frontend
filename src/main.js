import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { setAccessToken } from './api/authSession'
import { resolveMockUser } from './config/mockIdentity'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/v4.css'
import './styles/teacher.css'

// 本地预览便捷引导：只有 VITE_USE_MOCK=1 才预置 mock 身份（默认真实 API 模式绝不预置）。
// VITE_MOCK_ROLE=teacher 预置教师；默认/student 保持学生。旧 VITE_REAL_API 遗留语义已由 VITE_USE_MOCK 取代。
const useMock = import.meta.env.VITE_USE_MOCK === '1'
const mockRole = (import.meta.env.VITE_MOCK_ROLE || 'student').toString()
if (useMock) {
  setAccessToken(mockRole === 'teacher' ? 'mock-token-teacher-preview' : 'mock-token-preview')
  try { localStorage.setItem('ma_user', JSON.stringify(resolveMockUser(mockRole))) } catch { /* ignore */ }
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
