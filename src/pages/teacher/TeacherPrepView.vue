<template>
  <div id="page-prep">
    <!-- 页面头部 -->
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>备课工作台</h1>
        <p>{{ ctx.className || '请选择班级' }} · 本地降级可用，生成内容需教师确认</p>
      </div>
      <div class="t-contextbar">
        <select class="t-selectish" v-model="selectedClass" @change="onClassChange">
          <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <button class="t-btn" type="button" @click="saveDraft">保存草稿</button>
        <button class="t-btn primary" type="button" @click="confirmLesson">确认本节课</button>
      </div>
    </header>

    <!-- 从哪里开始卡片 -->
    <div class="t-card" style="margin-bottom: 16px">
      <div class="t-section-title">
        <div>
          <h2>从哪里开始？</h2>
          <span class="sub">不需要写提示词，选一个起点就好</span>
        </div>
      </div>
      <div class="t-source-options">
        <button
          v-for="src in sourceOptions"
          :key="src.id"
          class="t-source-card"
          :class="{ on: selectedSource === src.id }"
          type="button"
          @click="selectSource(src.id)"
        >
          <div class="ico">{{ src.icon }}</div>
          <b>{{ src.title }}</b>
          <span>{{ src.desc }}</span>
        </button>
      </div>
    </div>

    <!-- 双栏布局 -->
    <div class="t-prep-layout">
      <!-- 左栏 - 课堂时间线 -->
      <div class="t-card">
        <div class="t-section-title">
          <div>
            <h2>课堂时间线</h2>
            <span class="sub">共 {{ totalMinutes }} 分钟 · {{ lessonSteps.length }} 个教学环节</span>
          </div>
          <button class="t-btn sm" type="button" @click="autoBalance">自动平衡时间</button>
        </div>

        <div class="t-timeline">
          <div
            v-for="(step, idx) in lessonSteps"
            :key="step.id"
            class="t-lesson-step"
          >
            <div class="min">{{ step.timeRange }}</div>
            <div class="t-step-card" :class="{ added: step.added }">
              <div class="t-step-head">
                <b>{{ idx + 1 }}. {{ step.title }}</b>
                <span class="t-tag" :class="step.tagClass">{{ step.tagText }}</span>
              </div>
              <div class="t-step-body">{{ step.description }}</div>

              <!-- 结构化抽屉（RD-1：替代 window.prompt；旧 payload 仅编辑内容/时长，结构化字段可后补） -->
              <div v-if="editingStepId === step.id" class="t-step-edit">
                <label class="t-edit-label">本环节学习目标
                  <textarea v-model="editDraft.learningObjective" rows="2" class="t-input" style="width:100%" placeholder="学生在本环节应达成的目标"></textarea>
                </label>
                <label class="t-edit-label">核心问题（一句话）
                  <input v-model="editDraft.coreQuestion" class="t-input" style="width:100%" placeholder="驱动本环节先行的问题" />
                </label>
                <label class="t-edit-label">教师活动（讲授/提问/演示）
                  <textarea v-model="editDraft.teacherAction" rows="2" class="t-input" style="width:100%" placeholder="本环节教师做什么"></textarea>
                </label>
                <label class="t-edit-label">学生活动（独立作答/讨论/演板）
                  <textarea v-model="editDraft.studentAction" rows="2" class="t-input" style="width:100%" placeholder="本环节学生做什么"></textarea>
                </label>
                <label class="t-edit-label">检查理解方式
                  <input v-model="editDraft.assessmentCheck" class="t-input" style="width:100%" placeholder="如何确认学生已理解（随堂问/限时练/演板）" />
                </label>
                <label class="t-edit-label">教学内容（主内容，含关键示例）
                  <textarea v-model="editDraft.description" rows="3" class="t-input" style="width:100%"></textarea>
                </label>
                <label class="t-edit-label">附加材料
                  <input v-model="editDraft.material" class="t-input" style="width:100%" placeholder="材料名称或使用说明" @keyup.enter="saveStep(step)" />
                </label>
                <label class="t-edit-label">时长（分钟）
                  <input v-model.number="editDraft.minutes" type="number" min="1" class="t-input" style="width:120px" />
                </label>
                <p v-if="step.legacy" class="t-tiny t-muted" style="margin: 2px 0 4px">该环节来自旧教案（仅自由文本），结构化字段空出可补填。</p>
                <div class="t-row" style="gap: 8px; margin-top: 8px">
                  <button class="t-btn sm primary" type="button" @click="saveStep(step)">保存</button>
                  <button class="t-btn sm" type="button" @click="closeEdit">取消</button>
                </div>
              </div>

              <div v-else class="t-step-tools">
                <button class="t-ghost-link" type="button" @click="openEdit(step)">编辑</button>
                <button class="t-ghost-link" type="button" @click="openEdit(step, 'material')">+ 添加材料</button>
                <button class="t-ghost-link" type="button" @click="openEdit(step, 'time')">调时长</button>
                <button class="t-ghost-link" type="button" @click="deleteStep(step, idx)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏 - 粘性侧边栏 -->
      <div class="t-sticky-side" style="display: grid; gap: 16px">
        <!-- 管家建议卡片 -->
        <div class="t-card">
          <div class="t-section-title">
            <div>
              <h2>教学建议</h2>
              <span class="t-tag blue" style="margin-top: 4px">{{ ctx.className || '当前班级' }}</span>
              <span v-if="suggestionMode === 'kp'" class="t-tag amber" style="margin-top: 4px">按本课知识点</span>
            </div>
          </div>

          <div
            v-for="(sug, idx) in suggestions"
            :key="sug.id"
            class="t-suggest-box"
          >
            <div class="t-row" style="gap: 10px; align-items: flex-start">
              <div class="num">{{ idx + 1 }}</div>
              <div style="flex: 1; min-width: 0">
                <h4>{{ sug.title }}</h4>
                <p>{{ sug.description }}</p>
                <div class="t-source-proof">依据：{{ sug.evidence }}</div>
                <div style="margin-top: 10px">
                  <button
                    class="t-btn primary sm"
                    type="button"
                    :disabled="sug.adopted"
                    @click="adoptSuggestion(sug)"
                  >
                    {{ sug.adopted ? '已采纳' : '采纳建议' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p v-if="!suggestions.length" class="t-muted t-small">已按本课知识点生成通用教学建议，请稍候刷新。</p>
        </div>

        <!-- 产出按钮组卡片 -->
        <div class="t-card">
          <div class="t-section-title">
            <h2>这节课可以直接产出</h2>
          </div>
          <div class="t-grid" style="grid-template-columns: 1fr 1fr; gap: 8px">
            <button class="t-btn" type="button" @click="generateSlides">
              <span aria-hidden="true">📊</span>
              生成PPT
            </button>
            <button class="t-btn" type="button" @click="exportWord">
              <span aria-hidden="true">📄</span>
              导出Word教案
            </button>
            <button class="t-btn" type="button" @click="generatePractice">
              <span aria-hidden="true">✏️</span>
              生成当堂练习
            </button>
            <button class="t-btn" type="button" @click="generateBoardOutline">
              <span aria-hidden="true">📋</span>
              生成板书提纲
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, authHeaders } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { lessonsApi } from '@/api/teacher/lessons'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useLessonArtifactsStore } from '@/stores/teacher/lessonArtifacts'
import { suggestionsForKnowledgePoints } from '@/mock/teachingAdvice'
import type { LessonPlanSection } from '@/types/teacher'

const router = useRouter()
const ctx = useTeacherContextStore()
const store = useLessonArtifactsStore()
const showToast = inject('showToast') as (msg: string) => void

// ---- 数据状态 ----
const selectedClass = ref('')
const classes = ref<Array<{ id: string; name: string }>>([])
const selectedSource = ref('last-lesson')

interface SourceOption {
  id: string
  icon: string
  title: string
  desc: string
}

const sourceOptions: SourceOption[] = [
  { id: 'last-lesson', icon: '📚', title: '上次类似课', desc: '基于同课题改编' },
  { id: 'word-ppt', icon: '📁', title: '我的 Word/PPT', desc: '上传已有课件' },
  { id: 'blank', icon: '✨', title: '空白新建', desc: '从零开始设计' },
]

interface LessonStep {
  id: string
  title: string
  timeRange: string
  tagText: string
  tagClass: string
  description: string
  added?: boolean
  /** RD-1 结构化环节字段（additive/optional，旧 payload 可回退到 description） */
  kind?: string
  learningObjective?: string
  teacherAction?: string
  studentAction?: string
  coreQuestion?: string
  assessmentCheck?: string
  linkedInsights?: string[]
  locked?: boolean
  /** 旧格式（仅 description）占位标记，用于抽屉无结构化字段时的编辑提示 */
  legacy?: boolean
}

const lessonSteps = ref<LessonStep[]>([])
const totalMinutes = computed(() => lessonSteps.value.reduce((sum, step) => sum + stepDuration(step), 0))

interface Suggestion {
  id: string
  title: string
  description: string
  evidence: string
  adopted: boolean
  targetStepId: string
}

const suggestions = ref<Suggestion[]>([])
/** 建议来源模式：kp=按知识点通用建议（班级数据不足时）；class=按班级学情驱动。用于如实标注，不虚构数据 */
const suggestionMode = ref<'class' | 'kp'>('kp')

// ---- 结构化抽屉状态（RD-1：目标/师生活动/核心问题/素材/检查理解/时长，替代 window.prompt） ----
const editingStepId = ref('')
const editDraft = ref({
  description: '', material: '', minutes: 5, focus: 'content' as string,
  learningObjective: '', teacherAction: '', studentAction: '', coreQuestion: '', assessmentCheck: '',
})

// ---- 交互逻辑 ----
async function selectSource(id: string) {
  selectedSource.value = id
  const src = sourceOptions.find((s) => s.id === id)
  if (id === 'word-ppt') {
    router.push('/teacher/resources')
    return
  }
  if (id === 'last-lesson' && selectedClass.value) {
    const lessons = await lessonsApi.list(selectedClass.value)
    if (lessons.length) {
      store.artifact = lessons[0]
      applyArtifact()
      showToast?.('已载入服务器中的最近教案')
      return
    }
  }
  await createLesson()
  showToast?.(`已选择「${src?.title}」作为起点`)
}

function onClassChange() {
  const className = classes.value.find((item) => item.id === selectedClass.value)?.name || ''
  ctx.setClass(selectedClass.value, className)
  showToast?.(`已切换到${className}`)
  createLesson()
}

async function saveDraft() {
  if (!store.artifact) return createLesson()
  await store.save({
    version: store.artifact.version,
    content: { ...store.artifact.content, timeline: lessonSteps.value.map((s) => ({ phase: s.title, minutes: stepDuration(s) || 5 })) },
  })
  showToast?.('草稿已保存到服务器')
}

async function confirmLesson() {
  if (!store.artifact) await createLesson()
  if (!store.artifact) return
  store.artifact = await artifactsApi.confirm(store.artifact.artifact_id, `confirm:${store.artifact.artifact_id}`)
  showToast?.('本节课已确认，可生成正式 PPT')
}

function autoBalance() {
  if (!lessonSteps.value.length) return
  const base = Math.floor(45 / lessonSteps.value.length)
  let elapsed = 0
  lessonSteps.value.forEach((step, index) => {
    const minutes = index === lessonSteps.value.length - 1 ? 45 - elapsed : base
    step.timeRange = `${elapsed}-${elapsed + minutes} min`
    elapsed += minutes
  })
  showToast?.('已将课堂环节自动平衡为 45 分钟')
}

function openEdit(step: LessonStep, focus?: 'material' | 'time') {
  editingStepId.value = step.id
  editDraft.value.description = step.description
  editDraft.value.material = ''
  editDraft.value.minutes = stepDuration(step) || 5
  editDraft.value.focus = focus || 'content'
  editDraft.value.learningObjective = step.learningObjective || ''
  editDraft.value.teacherAction = step.teacherAction || ''
  editDraft.value.studentAction = step.studentAction || ''
  editDraft.value.coreQuestion = step.coreQuestion || ''
  editDraft.value.assessmentCheck = step.assessmentCheck || ''
}

function closeEdit() {
  editingStepId.value = ''
  editDraft.value.material = ''
}

function saveStep(step: LessonStep) {
  // 内容（主内容）
  if (editDraft.value.description.trim()) step.description = editDraft.value.description.trim()
  // 附加材料（RD-1：素材引用落到内容备注）
  if (editDraft.value.material.trim()) {
    step.description = `${step.description || ''}\n材料：${editDraft.value.material.trim()}`.trim()
  }
  // RD-1 结构化字段（去空写回）
  step.learningObjective = editDraft.value.learningObjective.trim() || undefined
  step.teacherAction = editDraft.value.teacherAction.trim() || undefined
  step.studentAction = editDraft.value.studentAction.trim() || undefined
  step.coreQuestion = editDraft.value.coreQuestion.trim() || undefined
  step.assessmentCheck = editDraft.value.assessmentCheck.trim() || undefined
  step.legacy = false
  // 时长
  const minutes = Number(editDraft.value.minutes)
  if (Number.isFinite(minutes) && minutes > 0) {
    const start = Number(step.timeRange.match(/\d+/)?.[0] || 0)
    step.timeRange = `${start}-${start + Math.round(minutes)} min`
    recalculateRanges()
  }
  closeEdit()
  showToast?.('已更新该环节')
}

function stepDuration(step: LessonStep) {
  const values = step.timeRange.match(/\d+/g)?.map(Number) || []
  return values.length > 1 ? Math.max(0, values[1] - values[0]) : 0
}

function recalculateRanges() {
  let elapsed = 0
  lessonSteps.value.forEach((step) => {
    const minutes = stepDuration(step) || 5
    step.timeRange = `${elapsed}-${elapsed + minutes} min`
    elapsed += minutes
  })
}

function deleteStep(_step: LessonStep, idx: number) {
  if (lessonSteps.value.length <= 2) {
    showToast?.('至少保留 2 个教学环节')
    return
  }
  lessonSteps.value.splice(idx, 1)
  recalculateRanges()
  showToast?.('已删除该环节')
}

function adoptSuggestion(sug: Suggestion) {
  if (sug.adopted) return
  sug.adopted = true
  const step = lessonSteps.value.find((s) => s.id === sug.targetStepId)
  if (step) {
    step.added = true
    step.tagText = '已采纳'
    step.tagClass = 'green'
  }
  showToast?.(`已采纳建议：${sug.title}`)
}

async function generateSlides() {
  try {
    if (!store.artifact) await createLesson()
    if (!store.artifact) return
    if (store.artifact.status === 'draft') await confirmLesson()
    const slide = (await lessonsApi.createSlides(store.artifact.artifact_id, { version: store.artifact.version, style: '简洁课堂' })).data
    const url = String(slide.content.download_url || '')
    const response = await fetch(url, { headers: authHeaders() as HeadersInit })
    if (!response.ok) throw new Error('PPT 下载失败')
    const objectUrl = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = String(slide.content.filename || '课堂课件.pptx')
    link.click()
    URL.revokeObjectURL(objectUrl)
    showToast?.('PPT 已生成并开始下载')
  } catch (e: any) { showToast?.(e?.message || 'PPT 生成失败') }
}

async function exportWord() {
  try {
    if (!store.artifact) await createLesson()
    if (!store.artifact) return
    const response = await fetch(`/api/teacher/lessons/${store.artifact.artifact_id}/download`, { headers: authHeaders() as HeadersInit })
    if (!response.ok) throw new Error('Word 教案下载失败')
    downloadBlob(await response.blob(), `${String(store.artifact.content.topic || '课堂教案')}.docx`)
    showToast?.('Word 教案已生成并开始下载')
  } catch (e: any) {
    showToast?.(e?.message || 'Word 教案生成失败')
  }
}

function generatePractice() {
  router.push('/teacher/assign')
  showToast?.('跳转到作业测验工作台')
}

function generateBoardOutline() {
  if (!lessonSteps.value.length) {
    showToast?.('请先生成教案')
    return
  }
  const lines = lessonSteps.value.flatMap((step, index) => [
    `${index + 1}. ${step.title}（${step.timeRange}）`,
    `   ${step.description}`,
  ])
  downloadBlob(new Blob([`课堂板书提纲\n\n${lines.join('\n')}`], { type: 'text/plain;charset=utf-8' }), '课堂板书提纲.txt')
  showToast?.('板书提纲已生成并开始下载')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ---- 生命周期 ----
// RD-1 环节类型标签与配色（仅使用既有 .t-tag 配色：blue/green/red/amber/violet/peach）
const KIND_LABELS: Record<string, string> = {
  import: '复习导入', concept: '新知探究', example: '例题精讲', practice: '当堂练习',
  check: '检查理解', summary: '课堂小结', intervention: '干预/复习',
}
const KIND_CLASS: Record<string, string> = {
  import: 'violet', concept: 'blue', example: 'peach', practice: 'green',
  check: 'amber', summary: 'violet', intervention: 'red',
}

function applyArtifact() {
  const content = (store.artifact?.content || {}) as Record<string, unknown>
  // RD-1 三级回退：segments（LessonSegment）/ sections（历史 lesson_plan）/ timeline（更早 phase+minutes）
  const segs = (content.segments || content.sections || content.timeline || []) as Array<Record<string, unknown>>
  let elapsed = 0
  lessonSteps.value = segs.map((s, index) => {
    const minutes = Number(s.duration_min ?? s.duration_minutes ?? s.minutes ?? 5)
    const activities = Array.isArray(s.activities) ? s.activities.filter(Boolean) : []
    const materials = Array.isArray(s.materials) ? s.materials : []
    const materialNote = materials.length
      ? `素材：${materials.map((m) => String((m as any).name || (m as any).title || m)).join('、')}`
      : ''
    const baseDesc = activities.length
      ? activities.map((a) => `• ${a}`).join('\n')
      : String(s.content || s.description || '').trim()
    const hasStructured = !!(s.learning_objective || s.teacher_action || s.student_action || s.core_question || s.assessment_check)
    const step: LessonStep = {
      id: String(s.id || `step-${index + 1}`),
      title: String(s.title ?? s.phase ?? `环节 ${index + 1}`),
      timeRange: `${elapsed}-${elapsed + minutes} min`,
      tagText: String(KIND_LABELS[s.kind as string] || (baseDesc ? '可编辑' : '待补充')),
      tagClass: String(KIND_CLASS[s.kind as string] || 'blue'),
      description: materialNote ? (baseDesc ? `${baseDesc}\n${materialNote}` : materialNote) : baseDesc,
      // RD-1 结构化字段（仅 segments 具备；sections/timeline 回退为空 → legacy 兼容旧 payload）
      kind: s.kind ? String(s.kind) : undefined,
      learningObjective: s.learning_objective ? String(s.learning_objective) : undefined,
      teacherAction: s.teacher_action ? String(s.teacher_action) : undefined,
      studentAction: s.student_action ? String(s.student_action) : undefined,
      coreQuestion: s.core_question ? String(s.core_question) : undefined,
      assessmentCheck: s.assessment_check ? String(s.assessment_check) : undefined,
      linkedInsights: Array.isArray(s.linked_insights) ? s.linked_insights.map(String) : undefined,
      locked: s.locked === true,
      legacy: !hasStructured,
      added: false,
    }
    elapsed += minutes
    return step
  })
  populateSuggestions(content)
}

// ---- 教学建议：班级数据不足时退化为按「本课知识点」给通用建议（不显示“数据不足”空态） ----
// 依据 teachingAdvice.ts 的知识点→建议池；证据为课标/教法，绝不虚构班级统计数字。
const KP_KEYWORDS: Record<string, string[]> = {
  '函数的单调性': ['单调', '递增', '递减', '单调区间', '单调性'],
  '函数的奇偶性': ['奇偶', '偶函数', '奇函数', '对称'],
  '函数的基本性质': ['最值', '值域', '周期性', '函数性质'],
  '函数与导数': ['导数', '切线', "f'(x)", '求导'],
  '集合': ['集合', '交集', '并集', '补集', '文氏'],
}

function detectKps(content: Record<string, unknown>): string[] {
  const text = [
    String(content.topic || ''),
    ...((content.segments as Array<Record<string, unknown>>) || []).flatMap((s: Record<string, unknown>) => [
      String(s.learning_objective || ''), String(s.core_question || ''), String(s.title || ''), String(s.content || ''),
    ]),
  ].join(' ')
  const hits: string[] = []
  for (const [kp, kw] of Object.entries(KP_KEYWORDS)) {
    if (kw.some((w) => text.includes(w))) hits.push(kp)
  }
  return hits
}

function populateSuggestions(content: Record<string, unknown>) {
  const kps = detectKps(content)
  const advices = suggestionsForKnowledgePoints(kps, 4)
  // 优先把建议安放到与之匹配的环节（targetStepKind）；无匹配环节则落到最后一步
  suggestions.value = advices.map((a, i) => {
    const step =
      lessonSteps.value.find((s) => s.kind === a.targetStepKind) ||
      (lessonSteps.value[a.targetStepKind === 'import' || a.targetStepKind === 'summary' ? 0 : lessonSteps.value.length - 1] as LessonStep | undefined) ||
      lessonSteps.value[lessonSteps.value.length - 1]
    return {
      id: `kp-sug-${i + 1}`,
      title: a.title,
      description: a.description,
      evidence: a.evidence,
      adopted: false,
      targetStepId: step ? step.id : '',
    }
  })
  suggestionMode.value = 'kp'
}

/** P-2：同班级最近教案的真实 topic 作为改编起点；无则回落默认课题（不再硬编码单课题） */
async function resolveTopic(): Promise<string> {
  try {
    const lessons = await lessonsApi.list(selectedClass.value)
    const t = lessons?.[0]?.content?.topic
    if (t) return String(t)
  } catch { /* 回落默认 */ }
  return '导数与函数单调性'
}

async function createLesson() {
  if (!selectedClass.value) return
  // P-2：不再硬编码课题名——取同班级最近一次教案的真实 topic，无则回落默认课题
  const topic = await resolveTopic()
  await store.adapt({ class_id: selectedClass.value, topic, requirements: '包含例题、练习与课堂小结', duration_minutes: 45 })
  applyArtifact()
  if (store.error) showToast?.(store.error)
}

onMounted(async () => {
  try {
    const data = await api.get('/classes/mine')
    classes.value = data?.items || []
    if (classes.value.length) {
      selectedClass.value = classes.value[0].id
      ctx.setClass(classes.value[0].id, classes.value[0].name)
      await createLesson()
    }
  } catch (e: any) { showToast?.(e?.message || '班级加载失败') }
})
</script>
