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
        <div class="t-notif-wrap">
          <button class="t-icon-btn" type="button" :title="notifTasks.length ? `${notifTasks.length} 条今日待办` : '通知'" aria-label="通知" @click="toggleNotif">
            <span aria-hidden="true">♢</span>
            <span v-if="notifTasks.length" class="t-dot"></span>
          </button>
          <div v-if="notifOpen" class="t-notif-pop" role="menu" aria-label="今日待办通知">
            <p class="t-notif-title">今日待办</p>
            <p v-if="todayStore.loading" class="t-notif-empty">正在读取通知…</p>
            <p v-else-if="!notifTasks.length" class="t-notif-empty">暂无新通知，今天没有待办。</p>
            <template v-else>
              <button v-for="task in notifTasks" :key="task.label" class="t-notif-item" type="button" role="menuitem" @click="goNotif(task.to)">
                <span>{{ task.label }}</span>
                <span v-if="task.count" class="t-notif-count">{{ task.count }}</span>
              </button>
            </template>
          </div>
        </div>
        <button
          class="t-v2-entry"
          type="button"
          title="进入 V2 高保真原型：备课中心 / 课件工坊 / 组卷中心 / 学情洞察全新工作台"
          @click="router.push('/teacher-v2/today')"
        >
          <span aria-hidden="true">✧</span>
          新版工作台
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

    <!-- AI 管家悬浮球（教师态）：点击复用 ButlerPanel 展开逻辑；⌘K 行为保持不变 -->
    <FloatingButler v-if="auth.isLoggedIn" delegate-open @ball-click="butlerOpen = true" />

    <!-- Toast 容器 -->
    <div ref="toastEl" class="t-toast" role="status" aria-live="polite"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useTeacherTodayStore } from '@/stores/teacher/today'
import TeacherNav from '@/components/teacher/TeacherNav.vue'
import ButlerPanel from '@/components/teacher/ButlerPanel.vue'
import FloatingButler from '@/components/butler/FloatingButler.vue'

const auth = useAuthStore()
const router = useRouter()
const butlerOpen = ref(false)
const toastEl = ref<HTMLElement | null>(null)
const todayStore = useTeacherTodayStore()
const notifOpen = ref(false)

/** 通知红点与面板接真实任务源（today 聚合），不再使用装饰性假红点 */
const notifTasks = computed(() => {
  const data = todayStore.data
  if (!data) return []
  const tasks: Array<{ key: string; label: string; count?: number; to: string }> = []
  const gradingCount = data.grading_queue?.count || 0
  if (gradingCount) tasks.push({ key: 'grading', label: '份作答待确认，去批改', count: gradingCount, to: '/teacher/grading' })
  const missing = data.next_lesson?.missing_items?.length || 0
  if (missing) tasks.push({ key: 'prep', label: '备课材料还缺若干项，去备课', count: missing, to: '/teacher/prep' })
  for (const deadline of data.deadlines || []) {
    tasks.push({ key: `deadline:${deadline.kind}:${deadline.title}`, label: deadline.title, to: '/teacher/classes' })
  }
  return tasks
})

async function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value && !todayStore.data && !todayStore.loading) {
    try { await todayStore.fetch() } catch { /* 面板内已有错误态文案 */ }
  }
}

function goNotif(to: string) {
  notifOpen.value = false
  router.push(to)
}

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

<style scoped>
/* 通知面板（P0-4：铃铛接真实任务源） */
.t-notif-wrap { position: relative; }
.t-notif-pop { position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: 300px; padding: 12px 14px; border: 1px solid #e1e7ef; border-radius: 12px; background: #fff; box-shadow: 0 14px 34px rgba(23, 36, 59, .14); }
.t-notif-title { margin: 0 0 8px; color: #69758b; font-size: 12px; font-weight: 700; letter-spacing: .06em; }
.t-notif-empty { margin: 4px 0; color: #7c8aa0; font-size: 13px; }
.t-notif-item { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 10px; border: 0; border-radius: 9px; background: transparent; color: #24344d; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.t-notif-item:hover { background: #f4f8fc; }
.t-notif-count { flex: none; min-width: 22px; padding: 1px 8px; border-radius: 999px; background: #fdeed6; color: #a16207; font-size: 12px; font-weight: 700; text-align: center; }

/* V2 原型入口：学术蓝，与琥珀色「教学助手」区分 */
.t-v2-entry { height: 40px; border: 1px solid #bfd9f5; border-radius: 12px; background: #edf5ff; color: #1d5fa8; padding: 0 14px; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 12px rgba(29, 95, 168, .12); transition: .15s; cursor: pointer; }
.t-v2-entry:hover { background: #dfeeff; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(29, 95, 168, .2); }
</style>
