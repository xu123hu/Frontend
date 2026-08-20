import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github-dark.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/v4.css'

// 本地预览便捷引导：mock 模式下预置一个学生会话令牌（仅预览用，不影响业务逻辑）
// 真实后端模式（VITE_REAL_API=1）不预置，且清掉 mock 模式残留的预览令牌
if (import.meta.env.VITE_REAL_API) {
  if (localStorage.getItem('ma_token') === 'mock-token-preview') {
    localStorage.removeItem('ma_token')
    localStorage.removeItem('ma_user')
  }
} else if (!localStorage.getItem('ma_token')) {
  localStorage.setItem('ma_token', 'mock-token-preview')
  try {
    localStorage.setItem(
      'ma_user',
      JSON.stringify({ nickname: '小婷', roles: [{ role: 'student' }], grade: '高二（3）班' })
    )
  } catch { /* ignore */ }
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
