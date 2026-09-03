<template>
  <div class="tv3-app">
    <aside class="tv3-nav">
      <div class="tv3-nav__brand">
        <div class="tv3-nav__brand-badge">∫</div>
        <div>
          <div class="tv3-nav__brand-title">教师工作台</div>
          <div class="tv3-nav__brand-sub">V3 · 数学原型</div>
        </div>
      </div>

      <div class="tv3-nav__group-label">每日教学</div>
      <router-link v-for="m in dailyMenus" :key="m.path" :to="m.path" class="tv3-nav__item" :class="{ 'is-active': isActive(m.path) }">
        <n-icon :size="17"><component :is="m.icon" /></n-icon>{{ m.label }}
      </router-link>

      <div class="tv3-nav__group-label">测评与洞察</div>
      <router-link v-for="m in assessMenus" :key="m.path" :to="m.path" class="tv3-nav__item" :class="{ 'is-active': isActive(m.path) }">
        <n-icon :size="17"><component :is="m.icon" /></n-icon>{{ m.label }}
      </router-link>

      <div class="tv3-nav__footer"></div>
    </aside>

    <div class="tv3-main">
      <header class="tv3-topbar">
        <div>
          <div class="tv3-topbar__title">{{ pageTitle }}</div>
          <div class="tv3-topbar__sub">{{ pageSub }}</div>
        </div>
        <span class="tv3-tag tv3-tag--gold" data-testid="tv3-version-tag">V3 原型 · 视觉与交互定稿</span>
        <div class="tv3-topbar__spacer" />
        <div class="tv3-topbar__tasks">
          <button class="tv3-btn tv3-btn--sm" type="button" data-testid="tv3-task-bell" @click="taskOpen = !taskOpen">
            <n-icon :size="15"><NotificationsOutline /></n-icon>
            任务
            <span v-if="runningTasks > 0" class="tv3-bell-badge tv3-pulse-dot">{{ runningTasks }}</span>
          </button>
          <div v-if="taskOpen" class="tv3-topbar__taskpanel" data-testid="tv3-task-panel">
            <div class="tv3-topbar__taskpanel-head">后台任务</div>
            <div v-for="t in tasks" :key="t.task_id" class="tv3-topbar__taskitem">
              <span class="tv3-tag" :class="t.status === 'succeeded' ? 'tv3-tag--ok' : t.status === 'failed' ? 'tv3-tag--danger' : 'tv3-tag--primary'">
                {{ t.status === 'succeeded' ? '完成' : t.status === 'failed' ? '失败' : t.status === 'running' ? '进行中' : '排队' }}
              </span>
              <span class="tv3-topbar__taskitem-title">{{ t.title }}</span>
              <div v-if="t.status === 'running'" class="tv3-progress" style="flex: 1"><div class="tv3-progress__bar" :style="{ width: t.progress + '%' }" /></div>
            </div>
          </div>
        </div>
        <div class="tv3-teacher-chip">
          <div class="tv3-teacher-chip__avatar">李</div>
          <div class="tv3-teacher-chip__meta">
            <div class="tv3-teacher-chip__name">李文澜</div>
            <div class="tv3-teacher-chip__sub">高二数学 · 教师</div>
          </div>
        </div>
      </header>

      <main class="tv3-page">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import {
  AnalyticsOutline, BookOutline, ClipboardOutline, DocumentTextOutline, EaselOutline,
  FolderOpenOutline, LibraryOutline, NotificationsOutline, SchoolOutline, TodayOutline,
} from '@vicons/ionicons5'
import { v3Api } from '@/api/teacherV3'
import type { V3Task } from '@/types/teacherV3'

const route = useRoute()
const taskOpen = ref(false)
const tasks = ref<V3Task[]>([])
let timer: number | undefined

const dailyMenus = [
  { path: '/teacher-v3/today', label: '今日工作台', icon: TodayOutline },
  { path: '/teacher-v3/prep', label: '备课中心', icon: BookOutline },
  { path: '/teacher-v3/slides', label: '课件工坊', icon: EaselOutline },
  { path: '/teacher-v3/classroom', label: '课堂互动', icon: SchoolOutline },
]
const assessMenus = [
  { path: '/teacher-v3/bank', label: '题库', icon: LibraryOutline },
  { path: '/teacher-v3/quiz', label: '组卷中心', icon: DocumentTextOutline },
  { path: '/teacher-v3/assign', label: '作业与批改', icon: ClipboardOutline },
  { path: '/teacher-v3/insights', label: '学情洞察', icon: AnalyticsOutline },
  { path: '/teacher-v3/resources', label: '资源中心', icon: FolderOpenOutline },
]

const isActive = (p: string) => route.path === p
const pageTitle = computed(() => (route.meta.title as string) || '教师工作台')
const runningTasks = computed(() => tasks.value.filter((t) => t.status === 'running' || t.status === 'queued').length)
const pageSub = computed(() => subTitles[route.path] || '高二年级 · 2026 秋季学期')
const subTitles: Record<string, string> = {
  '/teacher-v3/today': '课表 · 待办 · 班级速览',
  '/teacher-v3/prep': '教案模板 · 两段式生成 · 公式内联',
  '/teacher-v3/slides': '五区编辑器 · 公式图形可编辑 · 拍照出课件',
  '/teacher-v3/bank': '分类树 · 专题夹 · 拍照/自编入库',
  '/teacher-v3/quiz': '题库选题 · A4 组卷',
  '/teacher-v3/assign': '按题聚类 · 原图对照 · 讲评生成',
  '/teacher-v3/classroom': '发题 · 实时分布 · 动态演示',
  '/teacher-v3/insights': '热力图 · 错因 · 诊断',
  '/teacher-v3/resources': '资源 · 数学识别 · 构造配方库',
}

async function refreshTasks() {
  try {
    const r = await v3Api.catalog.tasks()
    tasks.value = r.data.items
  } catch { /* mock 不可用时静默 */ }
}

onMounted(() => {
  refreshTasks()
  timer = window.setInterval(refreshTasks, 3000)
})
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })
</script>

<style scoped>
.tv3-bell-badge {
  min-width: 16px; height: 16px; border-radius: 999px;
  background: var(--tv3-rose); color: #fff; font-size: 10.5px; font-weight: 700;
  display: inline-grid; place-items: center; padding: 0 4px;
  font-family: var(--tv3-font-num);
}
.tv3-teacher-chip { display: flex; align-items: center; gap: 9px; padding: 4px 10px 4px 4px; border-radius: 999px; background: var(--tv3-bg2); }
.tv3-teacher-chip__avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, var(--tv3-navy), var(--tv3-gold)); color: #fff;
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
}
.tv3-teacher-chip__name { font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.tv3-teacher-chip__sub { font-size: 10.5px; color: var(--tv3-ink3); line-height: 1.25; }
.tv3-topbar__tasks { position: relative; }
.tv3-topbar__taskpanel {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; width: 380px;
  background: var(--tv3-card); border: 1px solid var(--tv3-line); border-radius: var(--tv3-radius-lg);
  box-shadow: var(--tv3-shadow-lg); padding: 12px;
}
.tv3-topbar__taskpanel-head { font-size: 12.5px; font-weight: 700; margin-bottom: 8px; color: var(--tv3-ink2); }
.tv3-topbar__taskitem { display: flex; align-items: center; gap: 8px; padding: 8px 6px; border-radius: 8px; }
.tv3-topbar__taskitem:hover { background: var(--tv3-bg2); }
.tv3-topbar__taskitem-title { font-size: 12.5px; color: var(--tv3-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
</style>
