<template>
  <div class="teacher-app t-app">
    <!-- 左侧窄侧栏 -->
    <aside class="t-sidebar" aria-label="教师工作台导航">
      <div class="t-logo" aria-hidden="true">智</div>
      <TeacherNav />
      <div class="t-sidebar-foot">
        <div class="t-mini-avatar" :title="auth.nickname">{{ firstChar }}</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="t-main">
      <!-- 顶栏 -->
      <header class="t-topbar">
        <div class="t-brandline">
          <strong>智学数研</strong>
          <span>教师工作台</span>
        </div>
        <div class="t-top-spacer"></div>
        <div class="t-top-search" role="button" tabindex="0" @click="butlerOpen = true" @keydown.enter="butlerOpen = true">
          <span aria-hidden="true">⌕</span>
          <span>搜索课程、作业，或直接告诉管家你想做什么</span>
          <span class="t-hint">⌘ K</span>
        </div>
        <button class="t-icon-btn" type="button" title="通知" aria-label="通知">
          <span aria-hidden="true">♢</span>
          <span class="t-dot"></span>
        </button>
        <button class="t-butler-top" type="button" @click="butlerOpen = true">
          <span aria-hidden="true">✦</span>
          教学助手
        </button>
        <button
          v-if="auth.roles.includes('student')"
          class="t-icon-btn"
          type="button"
          title="切换到学生端"
          aria-label="切换到学生端"
          @click="switchTo('student')"
        >
          <span aria-hidden="true">🎓</span>
        </button>
      </header>

      <!-- 视口/内容区 -->
      <section class="t-viewport">
        <RouterView class="t-page" />
      </section>
    </div>

    <!-- AI 管家浮动面板 -->
    <ButlerPanel :open="butlerOpen" @close="butlerOpen = false" />

    <!-- Toast 容器 -->
    <div ref="toastEl" class="t-toast" role="status" aria-live="polite"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherContextStore } from '@/stores/teacher/context'
import TeacherNav from '@/components/teacher/TeacherNav.vue'
import ButlerPanel from '@/components/teacher/ButlerPanel.vue'

const auth = useAuthStore()
const router = useRouter()
const butlerOpen = ref(false)
const toastEl = ref<HTMLElement | null>(null)

const firstChar = computed(() => {
  const name = auth.nickname || '用'
  return name.charAt(0)
})

/** 角色切换（教师 → 学生）：换发 JWT 后回到学生首页 */
async function switchTo(role: string) {
  try {
    await auth.switchRole(role)
    useTeacherContextStore().reset()
    router.push('/overview')
  } catch { /* 未绑定该角色时静默 */ }
}

/** ⌘K / Ctrl+K 打开管家 */
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    butlerOpen.value = true
  }
}

/** 全局 toast */
function showToast(msg: string) {
  if (!toastEl.value) return
  toastEl.value.textContent = msg
  toastEl.value.classList.add('show')
  setTimeout(() => toastEl.value?.classList.remove('show'), 2200)
}

// 暴露给子组件（通过 provide 或全局事件）
import { provide } from 'vue'
provide('showToast', showToast)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
