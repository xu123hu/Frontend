/**
 * 主题（暗黑模式）store：[data-theme="dark"] 挂在 <html> 上，localStorage 持久化。
 * 初始化优先级：本地记忆 > 系统 prefers-color-scheme > 亮色。
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'

const THEME_KEY = 'ma_theme'

function initialTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(initialTheme())
  apply(theme.value)

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, theme.value)
    apply(theme.value)
  }

  return { theme, toggle }
})
