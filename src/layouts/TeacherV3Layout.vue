<template>
  <div class="tv3-app" :class="{ 'tv3-app--butler': butlerOpen }">
    <aside class="tv3-nav">
      <div class="tv3-nav__brand">
        <div class="tv3-nav__brand-badge">∫</div>
        <div>
          <div class="tv3-nav__brand-title">教师工作台</div>
          <div class="tv3-nav__brand-sub">智学数研 · AI 备课教学</div>
        </div>
      </div>

      <div class="tv3-nav__group-label">每日教学</div>
      <router-link v-for="m in dailyMenus" :key="m.path" :to="m.path" class="tv3-nav__item" :class="{ 'is-active': isActive(m.path) }">
        <n-icon :size="17"><component :is="m.icon" /></n-icon>{{ m.label }}
      </router-link>

      <div class="tv3-nav__group-label">资源与测评</div>
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
        <span class="tv3-tag tv3-tag--ai" data-testid="tv3-version-tag">AI 助教已就绪</span>
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
          <div class="tv3-teacher-chip__avatar">{{ teacherInitial }}</div>
          <div class="tv3-teacher-chip__meta">
            <div class="tv3-teacher-chip__name">{{ teacherName }}</div>
            <div class="tv3-teacher-chip__sub">高中数学 · 教师</div>
          </div>
        </div>
      </header>

      <main class="tv3-page">
        <router-view />
      </main>
    </div>

    <!-- C2 伴随工具层：右下角统一 Dock（AI 助教 / 伴随资源 / 数学绘图）+ 两个覆盖式工具层。
         互斥：同一时刻只开一个覆盖层；关闭后原位返回（不跳页、不丢滚动）。 -->
    <TeacherCompanionDock
      :butler-open="butlerOpen"
      :unread="butlerUnread"
      @ai="openButlerFromDock"
      @tool="onDockTool"
    />
    <ButlerPanel ref="butlerRef" :open="butlerOpen" @close="butlerOpen = false" @activity="onButlerActivity" />
    <ResourceCompanionPanel :open="companion.open === 'resource'" @close="closeTool()" />

    <!-- 全局数学绘图工作台（复用 Slides 同一组件，不复制实现；插入经事件总线落回当前工作页） -->
    <DrawBoard
      v-model:open="drawOpen"
      :reopen="globalDrawReopen"
      :context-label="drawContextLabel"
      @insert="onGlobalDrawInsert"
      @stash="onDrawStash"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import {
  BookOutline, ClipboardOutline, EaselOutline,
  FolderOpenOutline, LibraryOutline, NotificationsOutline, SchoolOutline, TodayOutline,
} from '@vicons/ionicons5'
import { v3Api } from '@/api/teacherV3'
import ButlerPanel from '@/components/teacherV3/ButlerPanel.vue'
import TeacherCompanionDock from '@/components/teacherV3/TeacherCompanionDock.vue'
import ResourceCompanionPanel from '@/components/teacherV3/ResourceCompanionPanel.vue'
import DrawBoard, { type DrawReopen } from '@/components/mathx/draw/DrawBoard.vue'
import { useTv3Context } from '@/stores/teacherContext'
import { useCompanion, openTool, closeTool, stashFigure, setReceipt, type DrawTargetContext } from '@/stores/companion'
import type { V3DrawInsert } from '@/components/mathx/draw/drawCore'
import type { V3Task } from '@/types/teacherV3'

const route = useRoute()
const taskOpen = ref(false)
const tasks = ref<V3Task[]>([])
let timer: number | undefined

const butlerOpen = ref(false)
const butlerRef = ref<InstanceType<typeof ButlerPanel> | null>(null)
/** 工作页（如今日工作台大输入框）→ 直接把话递给管家（真 AI 调用，非装饰） */
function onButlerAsk(ev: Event) {
  const d = (ev as CustomEvent).detail as { message: string } | undefined
  if (!d?.message?.trim()) return
  if (companion.open) closeTool()
  butlerOpen.value = true
  void nextTick(() => butlerRef.value?.ask(d.message.trim()))
}
const butlerUnread = ref(0)
watch(butlerOpen, (v) => { if (v) butlerUnread.value = 0 })
function onButlerActivity() { if (!butlerOpen.value) butlerUnread.value += 1 }

/* ---------- C2 伴随工具层 ---------- */
const companion = useCompanion()
const tv3ctx = useTv3Context()

function openButlerFromDock() {
  if (companion.open) closeTool() // 覆盖层互斥
  butlerOpen.value = true
}
function onDockTool(tool: 'resource' | 'draw') {
  if (butlerOpen.value) butlerOpen.value = false // 覆盖层互斥
  if (tool === 'resource') {
    openTool('resource')
    return
  }
  openTool('draw', drawTargetCtx.value)
}

/** 绘图目标上下文：知道"我要把东西放到哪里"；定位不到就诚实标注 */
const drawTargetCtx = computed<DrawTargetContext>(() => {
  const r = route.path
  if (r === '/teacher-v3/slides') {
    const sel = tv3ctx.selection?.summary
    const page = tv3ctx.slide_index != null ? `第 ${tv3ctx.slide_index + 1} 页` : '当前课件'
    return { targetLabel: sel ? `${page} · ${sel}` : page, insertLabel: tv3ctx.slide_index != null ? `插入${page}` : '插入当前页' }
  }
  if (r === '/teacher-v3/prep') {
    const m = (tv3ctx.selection?.summary || '').match(/环节「(.+?)」/)
    return { targetLabel: m ? `环节「${m[1]}」` : (tv3ctx.topic || '当前教案'), insertLabel: '插入当前片段' }
  }
  if (r === '/teacher-v3/bank') return { targetLabel: tv3ctx.extra || '题库当前题目', insertLabel: '插入为题图' }
  if (r === '/teacher-v3/quiz') return { targetLabel: tv3ctx.extra || '当前试卷', insertLabel: '插入为题图' }
  return { targetLabel: '（未定位插入位置：完成后将暂存）', insertLabel: '暂存图形' }
})
const drawOpen = computed({
  get: () => companion.open === 'draw',
  set: (v: boolean) => { if (!v) closeTool() },
})
const globalDrawReopen = computed(() => (companion.drawReopen as DrawReopen | null) ?? null)
const drawContextLabel = computed(() => {
  const c = drawTargetCtx.value
  return `当前用于：${c.targetLabel} · 完成后：${c.insertLabel}`
})

/** 全局绘图插入 → 事件总线交回当前工作页真实落稿；600ms 无人接手则暂存并如实回执（reqId 命名空间 draw-*，与资源台 res-* 互不串号） */
let drawSeq = 0
let drawHandledSeq = 0
function onGlobalDrawInsert(payload: V3DrawInsert, elementId?: string) {
  const reqId = ++drawSeq
  window.dispatchEvent(new CustomEvent('tv3-companion-insert', {
    detail: { reqId: `draw-${reqId}`, kind: 'figure', draw: payload, reopenElementId: elementId || '', target: { page: route.path, targetLabel: drawTargetCtx.value.targetLabel } },
  }))
  window.setTimeout(() => {
    if (reqId !== drawHandledSeq) {
      drawHandledSeq = reqId
      if (payload.type === 'image') {
        stashFigure({ name: `暂存图形 ${new Date().getMonth() + 1}/${new Date().getDate()}`, kind: 'free', thumb: payload.src, records: payload.records })
        setReceipt({ ok: false, message: '当前页面不支持直接插入图形：已存入「暂存图形」（可在伴随资源台「我的」继续编辑）', locationLabel: '暂存区' })
      } else {
        setReceipt({ ok: false, message: '当前页面不支持直接插入该图形类型：未做改动（可在课件页使用）' })
      }
    }
  }, 600)
}
function onDrawStash(desc: { kind: 'free' | 'fx'; thumb: string; records?: unknown[]; expr?: string }) {
  stashFigure({ name: desc.kind === 'fx' ? `函数 ${String(desc.expr || '').slice(0, 14)}` : `画布图形 ${new Date().getMonth() + 1}/${new Date().getDate()}`, kind: desc.kind, thumb: desc.thumb, records: desc.records, expr: desc.expr })
  setReceipt({ ok: false, message: '已暂存本次图形（画一半关掉也不丢）：可在伴随资源台「我的」继续编辑', locationLabel: '暂存区' })
}
/** 工作页接手落稿后回执：标记该请求已处理（阻止布局层暂存兜底） */
function onDrawHandled(ev: Event) {
  const d = (ev as CustomEvent).detail as { reqId: string } | undefined
  if (d?.reqId && typeof d.reqId === 'string' && d.reqId.startsWith('draw-')) {
    const n = Number(d.reqId.slice(5))
    if (Number.isFinite(n)) drawHandledSeq = Math.max(drawHandledSeq, n)
  }
}
/** Butler 工具卡 → 打开对应伴随工具（AI 调用工具，不做万能聊天） */
function onOpenCompanion(ev: Event) {
  const d = (ev as CustomEvent).detail as { tool: 'resource' | 'draw' } | undefined
  if (d?.tool === 'resource' || d?.tool === 'draw') onDockTool(d.tool)
}

const dailyMenus = [
  { path: '/teacher-v3/today', label: '今日工作台', icon: TodayOutline },
  { path: '/teacher-v3/prep', label: '备课中心', icon: BookOutline },
  { path: '/teacher-v3/slides', label: '课件工坊', icon: EaselOutline },
  { path: '/teacher-v3/classroom', label: '课堂互动', icon: SchoolOutline },
]
const assessMenus = [
  { path: '/teacher-v3/bank', label: '题库与组卷', icon: LibraryOutline },
  { path: '/teacher-v3/assign', label: '作业与批改', icon: ClipboardOutline },
  { path: '/teacher-v3/resources', label: '资源中心', icon: FolderOpenOutline },
]
/* 学情洞察(/insights)、组卷中心(/quiz) 保留路由：入口收进「作业与批改」「题库与组卷」页头
   （S17 P0：一级导航 ≤7；降级不删路由，页面互链不丢功能） */

const teacherName = computed(() => {
  try {
    const raw = localStorage.getItem('ma_user')
    const u = raw ? JSON.parse(raw) : null
    return u?.nickname || '老师'
  } catch { return '老师' }
})
const teacherInitial = computed(() => (teacherName.value || '老').slice(0, 1))

const isActive = (p: string) => route.path === p
const pageTitle = computed(() => (route.meta.title as string) || '教师工作台')
const runningTasks = computed(() => tasks.value.filter((t) => t.status === 'running' || t.status === 'queued').length)
const pageSub = computed(() => subTitles[route.path] || '高二年级 · 2026 秋季学期')
const subTitles: Record<string, string> = {
  '/teacher-v3/today': 'AI 助手 · 今日教学 · 最近工作',
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
  window.addEventListener('tv3-companion-inserted', onDrawHandled as EventListener)
  window.addEventListener('tv3-open-companion', onOpenCompanion as EventListener)
  window.addEventListener('tv3-butler-ask', onButlerAsk as EventListener)
})
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  window.removeEventListener('tv3-companion-inserted', onDrawHandled as EventListener)
  window.removeEventListener('tv3-open-companion', onOpenCompanion as EventListener)
  window.removeEventListener('tv3-butler-ask', onButlerAsk as EventListener)
})
</script>

<style scoped>
/* AI 管家侧栏展开：主区右侧避让（与面板同宽 400px，同步过渡），小屏不压缩改为覆盖 */
.tv3-main { transition: margin-right .22s ease; }
/* B6：≥1500px 才侧推避让；更窄屏一律覆盖式抽屉（面板自带阴影），不压缩主编辑区（DEF-33） */
.tv3-app--butler :deep(.tv3-main) { margin-right: 400px; }
@media (max-width: 1499px) {
  .tv3-app--butler :deep(.tv3-main) { margin-right: 0; }
  .tv3-app--butler :deep(.tv3-butler) { box-shadow: -18px 0 48px rgba(10, 30, 58, 0.28); }
}
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

