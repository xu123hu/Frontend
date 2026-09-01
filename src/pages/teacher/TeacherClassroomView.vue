<!--
  课堂工作台（§14 调研升级版）
  从"课堂模式开关"重构为"课堂 Session 语义"（对标 SchoolAI Mission Control / 希沃授课助手 / 科大讯飞智慧课堂）：
  - 会话头：班级·课题·教室·开始时间·已连接 N/同学 + 当前教学环节（来自已确认教案 timeline）；
  - 发起课堂检测：点击考点卡片一键发题 → 实时呈现"已提交/各选项分布/正确率/主要错误选项/AI 提醒"；
  - AI 提醒：与连续两次作业失分题匹配时给出"再用 3 分钟"干预建议，可【加入讲解】【推一道变式】；
  - 结束课堂：会话归档，教师动作全部审计。
-->
<template>
  <div class="classroom-v3">
    <header class="classroom-v3__head">
      <div>
        <p class="classroom-v3__eyebrow">课堂 · 高中数学</p>
        <h1>课堂</h1>
        <p>在真实班级里开启一节课：发题、收答、看分布、听 AI 提醒。已连接人数来自班级成员，正确率基线来自最近作业真实数据。</p>
      </div>
      <label>授课班级
        <select v-model="selectedClass" @change="loadClassroom">
          <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
    </header>

    <p v-if="error" class="classroom-v3__notice is-error" role="alert">{{ error }}</p>
    <main v-if="loading" class="classroom-v3__state">正在读取该班课堂状态…</main>
    <main v-else-if="!classes.length" class="classroom-v3__state">
      <h2>还没有可控制的班级</h2>
      <p>建立班级并配置任课关系后，才可以开启课堂会话。</p>
    </main>

    <!-- 未开课/已归档：启动面板 -->
    <main v-else-if="!session || session.status !== 'active'" class="classroom-v3__start">
      <section class="classroom-v3__start-card">
        <p class="classroom-v3__eyebrow">开始一节课</p>
        <h2>填写本节课信息后开启</h2>
        <p v-if="session?.status === 'ended'" class="classroom-v3__hint">上一节课已归档，可开启新的一节。</p>
        <label>课题<input v-model.trim="startForm.topic" maxlength="120" placeholder="例如：导数与函数单调性" /></label>
        <label>教室<input v-model.trim="startForm.room" maxlength="80" placeholder="例如：303" /></label>
        <button class="classroom-v3__primary" type="button" :disabled="starting" @click="startSession">{{ starting ? '正在开启…' : '开启课堂会话' }}</button>
        <p class="classroom-v3__hint">开启后学生端同步进入本课状态；系统会按真实班级成员数统计"已连接"。</p>
      </section>
    </main>

    <!-- 进行中：会话工作台 -->
    <main v-else-if="session && sessionStatus === 'active'" class="classroom-v3__workspace">
      <!-- 会话头 -->
      <section class="classroom-v3__hero">
        <div class="classroom-v3__hero-info">
          <p class="classroom-v3__eyebrow">{{ session.topic || '课堂会话' }}<span v-if="session.room"> · {{ session.room }}</span></p>
          <h2>{{ currentClass.name }} · {{ formatClock(session.started_at) }} 开始</h2>
          <p v-if="session.current_segment" class="classroom-v3__segment">{{ segmentBadge(session.current_segment) }}</p>
          <p v-else class="classroom-v3__segment">当前环节：新课讲授（可先在备课工作台确认教案后回此绑定）</p>
        </div>
        <div class="classroom-v3__hero-stats">
          <div class="classroom-v3__stat"><b>{{ session.connected_total }}</b><span>已连接（人）</span></div>
          <div class="classroom-v3__stat"><b>{{ elapsedMinutes }}</b><span>已进行（分）</span></div>
          <div class="classroom-v3__stat" v-if="question"><b>{{ question.submitted }}</b><span>当前已提交</span></div>
        </div>
      </section>

      <!-- 一键发题：检测点（题池暴露契约就位前用中性标签，不自编题面） -->
      <section class="classroom-v3__bank">
        <div class="classroom-v3__section-title">
          <div><p class="classroom-v3__eyebrow">课堂检测</p><h2>发起一道题</h2></div>
          <span class="classroom-v3__muted">点击即发题，学生作答后自动生成分布</span>
        </div>
        <div class="classroom-v3__bank-grid">
          <button
            v-for="(label, idx) in checkPoints"
            :key="label"
            class="classroom-v3__bank-card"
            type="button"
            :disabled="launching"
            @click="launch(idx)"
          >
            <span class="classroom-v3__bank-focus">{{ label }}</span>
            <span class="classroom-v3__bank-prompt">按题池顺序发题，发题后题面以学生端收到的为准</span>
          </button>
        </div>
      </section>

      <!-- 答题结果 -->
      <section v-if="question" class="classroom-v3__result">
        <div class="classroom-v3__section-title">
          <div><p class="classroom-v3__eyebrow">实时结果</p><h2>{{ question.prompt }}</h2></div>
          <span :class="['classroom-v3__rate', question.correct_rate >= 60 ? 'is-good' : 'is-focus']">正确率 {{ question.correct_rate }}%</span>
        </div>
        <div class="classroom-v3__dist">
          <div v-for="(count, k) in question.distribution" :key="k" class="classroom-v3__dist-row">
            <span class="classroom-v3__option">{{ optionLabel(k) }}</span>
            <div class="classroom-v3__bar">
              <div class="classroom-v3__bar-fill" :style="{ width: barWidth(count) + '%' }"></div>
            </div>
            <span class="classroom-v3__count">{{ count }} 人</span>
          </div>
        </div>
        <div class="classroom-v3__insight">
          <div class="classroom-v3__insight-icon">AI</div>
          <div class="classroom-v3__insight-body">
            <b>{{ question.pattern_similar ? '错误模式与最近作业一致' : '课堂洞察' }}</b>
            <p>{{ question.ai_reminder }}</p>
            <p class="classroom-v3__wrong">主要错误集中在「{{ question.main_wrong_option }}」</p>
            <p class="classroom-v3__muted">分布为演示数据；真实作答采集开通后自动替换（后端诚实化排期中）。</p>
          </div>
        </div>
        <div class="classroom-v3__result-actions">
          <button class="classroom-v3__primary" type="button" @click="showVariant = !showVariant">{{ showVariant ? '收起变式' : '推一道变式' }}</button>
          <button class="classroom-v3__ghost" type="button" @click="goPrep">加入讲解（备课）</button>
        </div>
        <p v-if="showVariant" class="classroom-v3__variant">变式：{{ question.variant }}</p>
      </section>

      <!-- 结束课堂 -->
      <section class="classroom-v3__close">
        <button class="classroom-v3__ghost" type="button" :disabled="closing" @click="closeSession">结束课堂并归档</button>
        <span class="classroom-v3__muted">结束前最后一份结果会保留在页面；教师动作均已审计。</span>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classApi } from '@/api'
import { useClassroomStore } from '@/stores/teacher/classroom'
import { useTeacherContextStore } from '@/stores/teacher/context'
import type { ClassroomSessionQuestion, ClassroomSessionState } from '@/types/teacher'

const router = useRouter()
const store = useClassroomStore()
const context = useTeacherContextStore()
const showToast = inject<(message: string) => void>('showToast', () => {})

const classes = ref<Array<{ id: string; name: string }>>([])
const selectedClass = ref('')
const loading = ref(false)
const starting = ref(false)
const launching = ref(false)
const closing = ref(false)
const error = ref('')
const showVariant = ref(false)
const startForm = reactive({ topic: '', room: '' })

const session = computed<ClassroomSessionState | null>(() => store.session)
const sessionStatus = computed(() => session.value?.status ?? 'idle')
const question = computed<ClassroomSessionQuestion | null>(() => session.value?.last_question ?? null)
const currentClass = computed(() => classes.value.find((item) => item.id === selectedClass.value) || { name: '当前班级' })

/** 检测点中性标签（题池暴露契约 proposed；落地后改渲染后端 question_pool，删除本表） */
const checkPoints = ['检测点 1', '检测点 2', '检测点 3']

const elapsedMinutes = computed(() => {
  if (!session.value?.started_at) return 0
  const diff = Math.floor((nowMs.value - new Date(session.value.started_at).getTime()) / 60000)
  return Math.max(0, diff)
})

const nowMs = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

function optionLabel(index: number) { return String.fromCharCode(65 + index) }
function barWidth(count: number) {
  const max = Math.max(1, ...(question.value?.distribution ?? [1]))
  return Math.round((count / max) * 100)
}
function segmentBadge(segment: { title: string; duration_min?: number }) {
  return segment.duration_min ? `当前环节：${segment.title} · 预计 ${segment.duration_min} 分钟` : `当前环节：${segment.title}`
}
function formatClock(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadClassroom() {
  if (!selectedClass.value) return
  const current = classes.value.find((item) => item.id === selectedClass.value)
  if (current) context.setClass(current.id, current.name)
  store.clear()
  try { await store.fetchSession(selectedClass.value) } catch (cause: any) { error.value = cause?.message || '课堂状态加载失败' }
}

async function startSession() {
  if (!selectedClass.value) return
  starting.value = true; error.value = ''
  try {
    await store.startSession(selectedClass.value, { topic: startForm.topic || '高中数学课', room: startForm.room })
    showToast('课堂会话已开启，学生端已同步本课状态。')
  } catch (cause: any) { error.value = cause?.message || '开启课堂失败' } finally { starting.value = false }
}

async function launch(index: number) {
  if (!selectedClass.value) return
  launching.value = true; error.value = ''
  try {
    await store.launchQuestion(selectedClass.value, index)
    showToast('题目已发出，正在收齐学生作答…')
  } catch (cause: any) { error.value = cause?.message || '发题失败' } finally { launching.value = false }
}

async function closeSession() {
  if (!selectedClass.value) return
  closing.value = true; error.value = ''
  try {
    await store.closeSession(selectedClass.value)
    showToast('课堂已结束并归档，本次课堂数据已记录。')
  } catch (cause: any) { error.value = cause?.message || '结束课堂失败' } finally { closing.value = false }
}

function goPrep() {
  // L6→L2 闭环：携带课堂焦点进入备课
  const focus = question.value?.prompt || ''
  router.push({ path: '/teacher/prep', query: focus ? { focus, from: 'classroom' } : {} })
}

onMounted(async () => {
  clockTimer = setInterval(() => { nowMs.value = Date.now() }, 30000)
  loading.value = true
  try {
    const data = await classApi.mine()
    classes.value = data?.items || []
    const remembered = classes.value.find((item) => item.id === context.classId)
    selectedClass.value = remembered ? context.classId || '' : classes.value[0]?.id || ''
    if (selectedClass.value) await loadClassroom()
  } catch (cause: any) { error.value = cause?.message || '班级信息未能加载' } finally { loading.value = false }
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
.classroom-v3 { box-sizing: border-box; max-width: 1500px; margin: 0 auto; padding: 30px 32px 46px; color: #17243b; }
.classroom-v3__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.classroom-v3__eyebrow { margin: 0; color: #69758b; font-size: 12px; letter-spacing: .08em; font-weight: 700; }
.classroom-v3 h1 { margin: 4px 0 8px; font-size: 32px; letter-spacing: -.04em; }
.classroom-v3 h2 { margin: 5px 0 0; font-size: 20px; }
.classroom-v3__head > div > p:last-child { margin: 0; max-width: 760px; color: #53637b; line-height: 1.6; }
.classroom-v3__head label { display: grid; gap: 6px; color: #526178; font-size: 12px; font-weight: 700; }
.classroom-v3 select { min-width: 220px; padding: 10px; border: 1px solid #d8e1ec; border-radius: 8px; color: #17243b; background: #fff; font: inherit; }
.classroom-v3__notice { margin: 20px 0 0; padding: 11px 14px; border-radius: 9px; }
.classroom-v3__notice.is-error { background: #fff1f1; color: #b42318; }
.classroom-v3__state { margin-top: 26px; padding: 42px 22px; border-radius: 14px; background: #f8fafc; color: #64748b; text-align: center; line-height: 1.6; }
.classroom-v3__state h2 { margin: 0 0 8px; color: #334155; }
.classroom-v3__state p { margin: 0; }

.classroom-v3__start { max-width: 560px; margin: 30px auto 0; }
.classroom-v3__start-card, .classroom-v3__hero, .classroom-v3__bank, .classroom-v3__result, .classroom-v3__close { border: 1px solid #e1e7ef; background: #fff; border-radius: 14px; padding: 22px; }
.classroom-v3__start-card h2 { margin: 6px 0 18px; }
.classroom-v3__start-card label, .classroom-v3__start-card .classroom-v3__primary { display: block; margin-top: 12px; }
.classroom-v3__start-card label { display: grid; gap: 6px; color: #405168; font-size: 13px; font-weight: 650; }
.classroom-v3__start-card input { box-sizing: border-box; width: 100%; padding: 10px; border: 1px solid #d5dee9; border-radius: 8px; color: #17243b; font: inherit; }
.classroom-v3__hint { margin: 14px 0 0; color: #7c8aa0; font-size: 13px; line-height: 1.55; }

.classroom-v3__workspace { display: grid; gap: 18px; margin-top: 24px; }
.classroom-v3__hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.classroom-v3__hero h2 { font-size: 22px; }
.classroom-v3__segment { margin: 8px 0 0; color: #3f6f9d; font-size: 13px; }
.classroom-v3__hero-stats { display: flex; gap: 10px; }
.classroom-v3__stat { min-width: 92px; padding: 13px 15px; border-radius: 10px; background: #f4f8fc; text-align: center; }
.classroom-v3__stat b { display: block; font-size: 22px; color: #1c4f82; }
.classroom-v3__stat span { display: block; margin-top: 2px; color: #7c8aa0; font-size: 12px; }

.classroom-v3__section-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.classroom-v3__muted { color: #91a0b8; font-size: 12px; }
.classroom-v3__bank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.classroom-v3__bank-card { display: flex; flex-direction: column; gap: 7px; align-items: flex-start; padding: 14px 15px; border: 1px solid #e2e9f1; border-radius: 11px; background: #fbfdff; color: #334155; text-align: left; font: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
.classroom-v3__bank-card:hover { border-color: #68a1d6; background: #f4f9ff; }
.classroom-v3__bank-card:disabled { opacity: .55; cursor: wait; }
.classroom-v3__bank-focus { color: #b9772c; font-size: 12px; font-weight: 800; }
.classroom-v3__bank-prompt { font-size: 13px; line-height: 1.5; }

.classroom-v3__rate { padding: 5px 10px; border-radius: 999px; font-size: 13px; font-weight: 800; }
.classroom-v3__rate.is-good { color: #166534; background: #ecfdf3; }
.classroom-v3__rate.is-focus { color: #92400e; background: #fffbeb; }
.classroom-v3__dist { display: grid; gap: 10px; margin-top: 16px; }
.classroom-v3__dist-row { display: grid; grid-template-columns: 26px 1fr 52px; gap: 10px; align-items: center; }
.classroom-v3__option { font-weight: 800; color: #334155; }
.classroom-v3__bar { height: 18px; border-radius: 999px; background: #eef2f7; overflow: hidden; }
.classroom-v3__bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width .4s; }
.classroom-v3__count { color: #7c8aa0; font-size: 12px; text-align: right; }
.classroom-v3__insight { margin-top: 18px; display: flex; gap: 12px; align-items: flex-start; padding: 15px 16px; border: 1px solid #f2c36d; border-radius: 11px; background: #fffbeb; }
.classroom-v3__insight-icon { flex: none; width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #f97316); color: #fff; font-size: 13px; font-weight: 900; display: grid; place-items: center; }
.classroom-v3__insight-body b { color: #92400e; }
.classroom-v3__insight-body p { margin: 5px 0 0; color: #7c5a10; font-size: 13px; line-height: 1.6; }
.classroom-v3__insight-body .classroom-v3__wrong { color: #b45309; font-weight: 700; }
.classroom-v3__result-actions { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }
.classroom-v3__variant { margin: 12px 0 0; padding: 11px 13px; border-radius: 9px; background: #f4f8fc; color: #405168; font-size: 13px; line-height: 1.6; }

.classroom-v3__primary { padding: 10px 18px; border: 0; border-radius: 9px; background: linear-gradient(135deg, #e8913a, #d9770b); color: #fff; font-weight: 700; cursor: pointer; }
.classroom-v3__primary:disabled { opacity: .55; cursor: wait; }
.classroom-v3__ghost { padding: 9px 16px; border: 1px solid #cdd9e6; border-radius: 9px; background: #fff; color: #2f4d74; font-weight: 650; cursor: pointer; }
.classroom-v3__ghost:disabled { opacity: .55; cursor: wait; }
.classroom-v3__close { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
@media (max-width: 980px) {
  .classroom-v3 { padding: 22px 16px; }
  .classroom-v3__head { flex-direction: column; }
  .classroom-v3__hero { flex-direction: column; }
  .classroom-v3__hero-stats { flex-wrap: wrap; }
  .classroom-v3__bank-grid { grid-template-columns: 1fr; }
  .classroom-v3__close { flex-direction: column; align-items: flex-start; }
}
</style>