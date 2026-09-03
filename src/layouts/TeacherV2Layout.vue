<template>
  <div class="tv2-app">
    <!-- 左侧导航 -->
    <aside class="tv2-nav">
      <div class="tv2-nav__brand">
        <div class="tv2-nav__brand-badge"><n-icon :size="19"><Sparkles /></n-icon></div>
        <div>
          <div class="tv2-nav__brand-title">教师工作台</div>
          <div class="tv2-nav__brand-sub">数学 · 高二年级组</div>
        </div>
      </div>

      <div class="tv2-nav__group-label">每日教学</div>
      <router-link v-for="m in dailyMenus" :key="m.path" :to="m.path" class="tv2-nav__item" :class="{ 'is-active': isActive(m.path) }">
        <n-icon :size="17"><component :is="m.icon" /></n-icon>{{ m.label }}
      </router-link>

      <div class="tv2-nav__group-label">测评与洞察</div>
      <router-link v-for="m in assessMenus" :key="m.path" :to="m.path" class="tv2-nav__item" :class="{ 'is-active': isActive(m.path) }">
        <n-icon :size="17"><component :is="m.icon" /></n-icon>{{ m.label }}
      </router-link>

      <div class="tv2-nav__footer">
        <router-link to="/teacher/today" class="tv2-nav__item">
          <n-icon :size="16"><ArrowBackOutline /></n-icon>返回旧版工作台
        </router-link>
      </div>
    </aside>

    <!-- 主区 -->
    <div class="tv2-main">
      <header class="tv2-topbar">
        <div>
          <div class="tv2-topbar__title">{{ pageTitle }}</div>
          <div class="tv2-topbar__sub">{{ pageSub }}</div>
        </div>
        <div class="tv2-topbar__spacer" />
        <button class="tv2-btn tv2-btn--sm" type="button" @click="taskOpen = !taskOpen" data-testid="tv2-task-bell">
          <n-icon :size="15"><NotificationsOutline /></n-icon>
          任务中心
          <span v-if="taskStore.running > 0" class="tv2-bell-badge tv2-pulse-dot">{{ taskStore.running }}</span>
        </button>
        <button class="tv2-btn tv2-btn--ghost-ai tv2-btn--sm" type="button" data-testid="tv2-butler-toggle" @click="butlerOpen = true">
          <n-icon :size="15"><Sparkles /></n-icon>
          AI 管家
        </button>
        <router-link to="/teacher-v3/today" class="tv2-btn tv2-btn--sm tv2-v3-entry" data-testid="tv2-v3-entry" title="V3 新版原型：备课两段式生成 / 题库分类树与专题夹 / 课件工坊">
          V3 新版原型 →
        </router-link>
        <div class="tv2-teacher-chip">
          <div class="tv2-teacher-chip__avatar">李</div>
          <div class="tv2-teacher-chip__meta">
            <div class="tv2-teacher-chip__name">李文澜</div>
            <div class="tv2-teacher-chip__sub">高二数学 · 教师</div>
          </div>
        </div>
        <TaskCenter :open="taskOpen" @close="taskOpen = false" />
      </header>

      <main class="tv2-page">
        <router-view />
      </main>
    </div>

    <ButlerDrawer :open="butlerOpen" :scene="scene" @close="butlerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import {
  AnalyticsOutline, ArrowBackOutline, BookOutline, ClipboardOutline, DocumentTextOutline, EaselOutline,
  FolderOpenOutline, NotificationsOutline, SchoolOutline, Sparkles, TodayOutline,
} from '@vicons/ionicons5'
import TaskCenter from '@/components/teacherV2/TaskCenter.vue'
import ButlerDrawer from '@/components/teacherV2/ButlerDrawer.vue'
import { useTaskCenterStore } from '@/stores/teacherV2Tasks'

const route = useRoute()
const taskStore = useTaskCenterStore()
const taskOpen = ref(false)
const butlerOpen = ref(false)

const dailyMenus = [
  { path: '/teacher-v2/today', label: '今日工作台', icon: TodayOutline },
  { path: '/teacher-v2/prep', label: '备课中心', icon: BookOutline },
  { path: '/teacher-v2/slides', label: '课件工坊', icon: EaselOutline },
  { path: '/teacher-v2/classroom', label: '课堂互动', icon: SchoolOutline },
]
const assessMenus = [
  { path: '/teacher-v2/quiz', label: '组卷中心', icon: DocumentTextOutline },
  { path: '/teacher-v2/assign', label: '作业与批改', icon: ClipboardOutline },
  { path: '/teacher-v2/insights', label: '学情洞察', icon: AnalyticsOutline },
  { path: '/teacher-v2/resources', label: '资源中心', icon: FolderOpenOutline },
]

const isActive = (p: string) => route.path === p
const pageTitle = computed(() => (route.meta.title as string) || '教师工作台')
const pageSub = computed(() => subTitles[route.path] || '高二年级 · 2026 秋季学期')
const subTitles: Record<string, string> = {
  '/teacher-v2/today': '课表全景 · 待办时间轴 · 班级速览',
  '/teacher-v2/prep': '教案四步生成 · 学情驱动设计',
  '/teacher-v2/slides': '大纲 · 16:9 画布 · 模板分离',
  '/teacher-v2/quiz': '知识点树 · 智能参数 · A4 仿真',
  '/teacher-v2/assign': '分层发布 · AI 预批 · 终审',
  '/teacher-v2/classroom': '发题 · 实时分布 · 当堂讲评',
  '/teacher-v2/insights': '热力图 · 错因聚类 · 诊断报告',
  '/teacher-v2/resources': '教材树 · 摄取审核 · 校本题库',
}
const scene = computed(() => (route.meta.scene as string) || 'teacher.v2.today')

provide('tv2Butler', { open: () => { butlerOpen.value = true } })

onMounted(() => { taskStore.startPolling() })
</script>

<style scoped>
.tv2-bell-badge {
  min-width: 16px; height: 16px; border-radius: 999px;
  background: var(--tv2-rose); color: #fff; font-size: 10.5px; font-weight: 700;
  display: inline-grid; place-items: center; padding: 0 4px;
  font-family: var(--tv2-font-num);
}
.tv2-teacher-chip { display: flex; align-items: center; gap: 9px; padding: 4px 10px 4px 4px; border-radius: 999px; background: var(--tv2-bg2); }
.tv2-teacher-chip__avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: linear-gradient(135deg, #1d5bbf, #0e9488); color: #fff;
  display: grid; place-items: center; font-size: 13px; font-weight: 700;
}
.tv2-teacher-chip__name { font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.tv2-teacher-chip__sub { font-size: 10.5px; color: var(--tv2-ink3); line-height: 1.25; }
/* V3 原型入口：金色高亮，与 V3 主视觉一致 */
.tv2-v3-entry {
  text-decoration: none; white-space: nowrap;
  color: #8a6d1d; background: linear-gradient(135deg, #fdf3d8, #fbe8b8);
  border: 1px solid #e5c96a; font-weight: 700;
}
.tv2-v3-entry:hover { background: linear-gradient(135deg, #fbe8b8, #f8dd9d); }
</style>
