<template>
  <div id="page-today" class="t-today">
    <header class="t-today-head">
      <div>
        <h1>{{ greeting }}，{{ displayName }}</h1>
        <p class="t-today-sub" v-if="!store.loading">今天你值得处理 {{ topTasks.length }} 件事，先做最重要的一件。</p>
        <p class="t-today-sub" v-else>正在汇总今天的真实教学数据…</p>
      </div>
    </header>


    <ButlerPanel :open="true" embedded />

    <div v-if="store.error" class="t-alert" role="alert">{{ store.error }} <button class="t-btn sm" type="button" @click="store.fetch()">重试</button></div>

    <div class="t-today-grid" v-if="!store.loading">
      <!-- 主栏：任务优先 -->
      <div class="t-main">
        <!-- 下一节课 hero -->
        <section class="t-card" v-if="nextLesson">
          <div class="t-hero-top">
            <span class="t-eye">下一节课 · {{ formatTime(nextLesson.starts_at) }} · {{ nextLesson.class_name }}</span>
            <span class="t-tag amber">距上课 {{ countdown }}</span>
          </div>
          <h2 class="t-hero-topic">{{ nextLesson.topic }}</h2>

          <div class="t-prep" v-if="prep != null">
            <div class="t-prep-row">
              <span class="t-prep-label">备课准备度</span>
              <span class="t-prep-num">{{ prep }}%</span>
            </div>
            <div class="t-progress" role="progressbar" :aria-valuenow="prep" aria-valuemin="0" aria-valuemax="100">
              <div class="t-progress-bar" :style="{ width: prep + '%' }"></div>
            </div>
            <p class="t-muted" v-if="nextLesson.missing_items?.length">还差：{{ nextLesson.missing_items.join('、') }}</p>
          </div>

          <div class="t-hero-actions">
            <button class="t-btn primary lg" type="button" @click="goPrep()">继续备课</button>
            <button class="t-btn lg" type="button" @click="goAssign()">布置巩固题</button>
          </div>
        </section>

        <section class="t-card" v-else>
          <h2 class="t-hero-topic" style="margin-top:0;">今天暂无已登记课程</h2>
          <p class="t-muted">你仍可以进入备课中心创建教案和课件。</p>
          <button class="t-btn primary" type="button" @click="goPrep()">开始备课</button>
        </section>

        <!-- 上课前任务清单：任务优先 -->
        <section class="t-card" v-if="topTasks.length">
          <div class="t-section-title"><h3>上课前最值得做的 {{ topTasks.length }} 件事</h3><span class="sub">按优先级排序</span></div>
          <ol class="t-tasklist">
            <li v-for="(tsk, idx) in topTasks" :key="tsk.key" class="t-taskrow">
              <span class="t-taskno" aria-hidden="true">{{ idx + 1 }}</span>
              <div class="t-taskbody">
                <div class="t-tasktitle">{{ tsk.title }}<span v-if="tsk.count" class="t-taskcount">{{ tsk.count }}</span></div>
                <div class="t-muted">{{ tsk.reason }}</div>
              </div>
              <button class="t-btn primary sm" type="button" @click="tsk.run()">{{ tsk.action }}</button>
            </li>
          </ol>
        </section>
      </div>

      <!-- 副栏：行动建议（每个都带依据 + 可执行动作） -->
      <div class="t-side">
        <section class="t-card t-insight-card">
          <div class="t-section-title"><h3>教学行动建议</h3><span class="sub">来自班级数据</span></div>
          <p class="t-muted t-insight-note">数据不足时不生成虚构结论。</p>
          <div v-if="insights.length" class="t-insight-list">
            <div v-for="ins in insights" :key="ins.insight_id" class="t-insight">
              <b class="t-insight-summary">{{ ins.summary }}</b>
              <p class="t-muted">{{ evidenceText(ins.evidence) }}</p>
              <div class="t-chiprow">
                <button
                  v-for="act in ins.recommended_actions"
                  :key="act"
                  class="t-chip"
                  type="button"
                  @click="runInsightAction(ins, act)"
                >{{ act }} →</button>
              </div>
            </div>
          </div>
          <p v-else class="t-muted">暂无足够数据形成教学洞察。</p>
        </section>


        <section class="t-card">
          <div class="t-section-title"><h3>快捷入口</h3></div>
          <div class="t-grade-buttons">
            <button class="t-btn primary" type="button" @click="router.push('/teacher/prep')">备课与 PPT</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/assign')">出题并发布</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/grading')">批改</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/resources')">教学资源</button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTeacherTodayStore } from '@/stores/teacher/today'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { gradingWorkspaceApi } from '@/api/teacher/gradingWorkspace'
import { toGradingWorkspace } from '@/features/teacher-grading-v2/gradingWorkspaceAdapter'
import { evidenceText } from '@/utils/insightCopy'
import { useAuthStore } from '@/stores/auth'
import type { ActionableInsight } from '@/types/teacher'
import ButlerPanel from '@/components/teacher/ButlerPanel.vue'

const router = useRouter()
const store = useTeacherTodayStore()
const context = useTeacherContextStore()
const auth = useAuthStore()

const hour = new Date().getHours()
const greeting = computed(() => hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好')
/** 教师称呼规范化：去重"老师"后缀、修正空值/占位值（教师/同学），避免"王老师老师/undefined老师" */
function normalizeTeacherName(value: unknown) {
  const nickname = typeof value === 'string' ? value.trim() : ''
  if (!nickname || nickname === '教师' || nickname === '同学') return '老师'
  const name = nickname.replace(/(?:老师)+$/, '').trim()
  return name ? `${name}老师` : '老师'
}
const displayName = computed(() => normalizeTeacherName(auth.nickname))


const nextLesson = computed(() => store.data?.next_lesson || null)
const gradingCount = computed(() => store.data?.grading_queue?.count || 0)
const deadlines = computed(() => store.data?.deadlines || [])
const insights = computed(() => store.data?.actionable_insights || [])
const prep = computed(() => (nextLesson.value?.prep_completion ?? null))

const nowMs = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const countdown = computed(() => {
  if (!nextLesson.value) return '—'
  const diff = new Date(nextLesson.value.starts_at).getTime() - nowMs.value
  if (Number.isNaN(diff) || diff <= 0) return '即将开始'
  const mins = Math.round(diff / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`
})

interface TaskRow {
  key: string
  title: string
  reason: string
  action: string
  count?: number | string
  run: () => void

}

const topTasks = computed<TaskRow[]>(() => {
  const rows: TaskRow[] = []
  const nl = nextLesson.value
  const gc = gradingCount.value
  const video = deadlines.value.find((d) => d.kind === 'video')
  const review = deadlines.value.find((d) => d.kind === 'grade_review')

  if (nl?.missing_items?.length) {
    rows.push({
      key: 'prep', title: '补这一处课', count: nl.missing_items.length,
      reason: `下一节还缺 ${nl.missing_items.join('、')}，与最近 17/46 人失分的边界条件相关`,
      action: '去备课', run: () => goPrep(),
    })
  }
  if (gc) {
    rows.push({
      key: 'grading', title: '批阅周测待确认作答', count: gc,
      reason: '主观题需教师逐份确认，按题分批更快',
      action: '去批改', run: () => { context.setClass(nl?.class_id || null, nl?.class_name || null); goGradingDeepLink() },
    })
  }
  if (video) {
    rows.push({
      key: 'video', title: '视频任务未完成', reason: video.title,
      action: '看名单', run: () => { context.setClass(nl?.class_id || null, nl?.class_name || null); router.push('/teacher/classes') },
    })
  }
  if (review) {
    rows.push({ key: 'review', title: '成绩复核', reason: review.title, action: '复核', run: () => router.push('/teacher/classes') })
  }
  return rows.slice(0, 4)
})

function selectClass(classId?: string, className?: string) {
  if (classId) context.setClass(classId, className || null)
}

function goPrep(classId?: string, className?: string) {
  selectClass(classId, className)
  router.push('/teacher/prep')
}

function goAssign(classId?: string, className?: string) {
  selectClass(classId, className)
  router.push('/teacher/assign')
}

/** 批改深链直达首个未确认份：走 V2 workspace 通路（V1 queue 已收敛），URL 携带 submission_item_id */
async function goGradingDeepLink() {
  let firstId: string | undefined
  try {
    const workspace = toGradingWorkspace(await gradingWorkspaceApi.get({ classId: context.classId || undefined, status: 'ungraded' }))
    firstId = workspace.selected?.submissionItemId
      ?? workspace.queue.find((entry) => entry.state === 'ungraded')?.submissionItemId
      ?? workspace.queue[0]?.submissionItemId
  } catch { firstId = undefined }
  router.push({ path: '/teacher/grading', query: firstId ? { submission_item_id: firstId } : {} })
}

function runInsightAction(ins: ActionableInsight, label: string) {
  const classId = store.data?.next_lesson?.class_id
  const className = store.data?.next_lesson?.class_name
  if (label === '加入下节课' || label === '应用到教案') return goPrep(classId, className)
  if (label === '出巩固题' || label === '生成巩固题') return goAssign(classId, className)
  if (label === '去批改') return goGradingDeepLink()
  // 看依据 / 看典型作答 / 看名单 → 进入班级学情，证据在看依据处展示
  return router.push('/teacher/classes')
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  store.fetch()
  timer = setInterval(() => { nowMs.value = Date.now() }, 60000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.t-today { display: flex; flex-direction: column; gap: 16px; }
.t-today-head h1 { margin: 0 0 4px; font-size: 22px; line-height: 1.3; }
.t-today-sub { margin: 0; color: var(--t-ink-2); }
.t-alert { padding: 12px 16px; border: 1px solid var(--t-red); background: var(--t-red-soft); color: var(--t-red); border-radius: var(--t-radius-sm); display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.t-today-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.t-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.t-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.t-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.t-eye { color: var(--t-ink-2); font-size: 13px; }
.t-hero-topic { margin: 10px 0 0; font-size: 24px; line-height: 1.25; }
.t-hero-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }

.t-prep { margin-top: 18px; padding: 12px 14px; background: var(--t-surface-2); border-radius: var(--t-radius-sm); }
.t-prep-row { display: flex; justify-content: space-between; align-items: baseline; }
.t-prep-label { color: var(--t-ink-2); font-size: 13px; }
.t-prep-num { font-weight: 700; color: var(--t-brand-deep); }
.t-progress { height: 8px; border-radius: 999px; background: var(--t-line); overflow: hidden; margin: 8px 0; }
.t-progress-bar { height: 100%; background: linear-gradient(90deg, var(--t-brand), var(--t-brand-2)); border-radius: 999px; transition: width .4s; }

.t-tasklist { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.t-taskrow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--t-line); border-radius: var(--t-radius-sm); background: var(--t-surface); }
.t-taskno { flex: none; width: 24px; height: 24px; border-radius: 50%; background: var(--t-brand-deep); color: #fff; font-weight: 700; display: grid; place-items: center; font-size: 13px; }
.t-taskbody { flex: 1; min-width: 0; }
.t-tasktitle { font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.t-taskcount { background: var(--t-brand-soft); color: var(--t-brand-deep); border-radius: 999px; padding: 0 8px; font-size: 12px; font-weight: 700; }

.t-insight-card .t-section-title { margin-bottom: 4px; }
.t-insight-note { margin-top: 0; font-size: 12px; }
.t-insight { padding: 12px 0; border-top: 1px solid var(--t-line); }
.t-insight:first-of-type { border-top: none; }
.t-insight-summary { display: block; line-height: 1.5; }
.t-insight p { margin: 4px 0 8px; font-size: 13px; }
.t-chiprow { display: flex; gap: 8px; flex-wrap: wrap; }
.t-chip { border: 1px solid var(--t-brand); color: var(--t-brand-deep); background: var(--t-brand-faint); border-radius: 999px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: background .15s, color .15s; }
.t-chip:hover { background: var(--t-brand); color: #fff; }

.t-grade-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.t-grade-buttons .t-btn { width: 100%; }

@media (max-width: 1100px) {
  .t-today-grid { grid-template-columns: 1fr; }
}
</style>

