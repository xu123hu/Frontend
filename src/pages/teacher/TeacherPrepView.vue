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

    <form class="t-card" style="margin-bottom: 16px" @submit.prevent="createLesson">
      <div class="t-section-title"><div><h2>本节课设定</h2><span class="sub">填写课题、教学要求与课时后生成可编辑草稿</span></div></div>
      <div class="t-grid" style="grid-template-columns: 1fr 1fr 120px; gap: 10px">
        <label>课题<input v-model="topic" aria-label="课题" class="t-input" placeholder="例如：导数的概念" /></label>
        <label>教学要求<input v-model="requirements" aria-label="教学要求" class="t-input" placeholder="例如：包含例题、练习与当堂检测" /></label>
        <label>课时（分钟）<input v-model.number="durationMinutes" aria-label="课时分钟" class="t-input" type="number" min="1" /></label>
      </div>
      <div style="margin-top: 10px"><button class="t-btn primary" type="submit">生成教案草稿</button></div>
    </form>

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
            <div class="t-step-card" :class="{ added: step.added, suggested: step.suggested }">
              <div class="t-step-head">
                <b>{{ idx + 1 }}. {{ step.title }}</b>
                <span class="t-tag" :class="step.tagClass">{{ step.tagText }}</span>
              </div>
              <div class="t-step-body">{{ step.description }}</div>
              <div class="t-step-tools">
                <button class="t-ghost-link" type="button" @click="openEditor(step, 'content')">编辑内容</button>
                <button class="t-ghost-link" type="button" @click="openEditor(step, 'material')">+ 添加材料</button>
                <button class="t-ghost-link" type="button" @click="openEditor(step, 'time')">调时长</button>
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
          <p v-if="!suggestions.length" class="t-muted t-small">当前班级数据不足，暂无可采纳的学情建议。</p>
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

    <!-- 结构化环节编辑抽屉（TC-L2-F05：替代 window.prompt） -->
    <div v-if="editingStep" class="t-edit-overlay" @click="closeEditor"></div>
    <aside v-if="editingStep" class="t-edit-drawer" role="dialog" aria-label="结构化编辑教学环节">
      <div class="t-edit-head">
        <h3>编辑环节</h3>
        <button class="t-ghost-link" type="button" @click="closeEditor">关闭</button>
      </div>
      <label class="t-edit-field">环节标题<input v-model="editForm.title" aria-label="环节标题" /></label>
      <label class="t-edit-field">时长（分钟）<input v-model.number="editForm.minutes" aria-label="环节时长分钟" type="number" min="1" /></label>
      <label class="t-edit-field">师生活动 / 材料（每行一条，支持 $LaTeX$ 公式）
        <textarea v-model="editForm.activitiesText" aria-label="环节活动内容" rows="6"></textarea>
      </label>
      <div class="t-edit-preview">
        <span class="sub">公式预览</span>
        <LatexText :text="editForm.activitiesText || '（空）'" />
      </div>
      <div class="t-edit-actions">
        <button class="t-btn primary sm" type="button" @click="saveEditor">保存环节（草稿）</button>
        <button class="t-btn sm" type="button" @click="closeEditor">取消</button>
      </div>
      <p class="t-edit-hint">保存仅更新本地草稿；点击顶部「保存草稿」同步服务器。</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { classApi } from '@/api'
import { artifactsApi } from '@/api/teacher/artifacts'
import { classesApi } from '@/api/teacher/classes'
import { lessonsApi } from '@/api/teacher/lessons'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useLessonArtifactsStore } from '@/stores/teacher/lessonArtifacts'
import { evidenceText } from '@/utils/insightCopy'
import LatexText from '@/components/LatexText.vue'
import type { LessonTimelineItem, TeacherArtifact } from '@/types/teacher'

const router = useRouter()
const route = useRoute()
const ctx = useTeacherContextStore()
const store = useLessonArtifactsStore()
const showToast = inject('showToast') as (msg: string) => void

// ---- 数据状态 ----
const selectedClass = ref('')
const classes = ref<Array<{ id: string; name: string }>>([])
const selectedSource = ref('last-lesson')
const topic = ref('')
const requirements = ref('')
const durationMinutes = ref(45)
/** 课堂「加入讲解」携带的焦点（L6→L2 闭环） */
const focusFromQuery = ref('')

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
  activities: string[]
  added?: boolean
  /** GP-2：洞察建议的目标环节高亮 */
  suggested?: boolean
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

// ---- 结构化环节编辑抽屉（TC-L2-F05：替代 window.prompt×3） ----
type EditorMode = 'content' | 'material' | 'time'
const editingStep = ref<LessonStep | null>(null)
const editForm = reactive({ title: '', minutes: 5, activitiesText: '' })

function openEditor(step: LessonStep, mode: EditorMode) {
  editingStep.value = step
  editForm.title = step.title
  editForm.minutes = stepDuration(step) || 5
  let lines = step.activities.join('\n')
  if (mode === 'material') lines = `${lines}${lines ? '\n' : ''}材料：`
  editForm.activitiesText = lines
}

function closeEditor() { editingStep.value = null }

/** 建议卡来源 = 班级洞察 error_cluster（GP-2 依据链：证据来自后端字段，非编造） */
async function loadSuggestions(classId: string) {
  try {
    const insights = await classesApi.insights(classId)
    const targetStepId = lessonSteps.value[1]?.id || lessonSteps.value[0]?.id || ''
    suggestions.value = insights
      .filter((ins) => ins.kind === 'error_cluster')
      .slice(0, 3)
      .map((ins) => ({
        id: ins.insight_id,
        title: ins.summary,
        description: ins.summary,
        evidence: evidenceText(ins.evidence),
        adopted: false,
        targetStepId,
      }))
  } catch { suggestions.value = [] }
}

/** GP-2：?lesson_id&from=insight:{id} 进入 → 高亮建议目标环节（插入点 diff 标记） */
function markSuggestedStep(suggestionId: string) {
  const sug = suggestions.value.find((item) => item.id === suggestionId) || suggestions.value[0]
  if (!sug) return
  const step = lessonSteps.value.find((item) => item.id === sug.targetStepId)
  if (step && !step.added) {
    step.suggested = true
    step.tagText = '建议插入'
    step.tagClass = 'blue'
  }
}

function saveEditor() {
  const step = editingStep.value
  if (!step) return
  const minutes = Math.max(1, Math.round(Number(editForm.minutes) || stepDuration(step) || 5))
  const start = Number(step.timeRange.match(/\d+/)?.[0] || 0)
  const activities = editForm.activitiesText.split('\n').map((line) => line.trim()).filter(Boolean)
  step.title = editForm.title.trim() || step.title
  step.timeRange = `${start}-${start + minutes} min`
  step.activities = activities
  step.description = activities.join('；')
  recalculateRanges()
  editingStep.value = null
  showToast?.('环节已保存到本地草稿；点顶部「保存草稿」同步服务器')
}
let operationEpoch = 0

function beginOperation() {
  operationEpoch += 1
  return operationEpoch
}

function isCurrentOperation(epoch: number, targetClassId: string) {
  return epoch === operationEpoch && selectedClass.value === targetClassId
}

function clearLessonState() {
  store.artifact = null
  lessonSteps.value = []
}

// ---- 交互逻辑 ----
async function selectSource(id: string) {
  selectedSource.value = id
  const src = sourceOptions.find((s) => s.id === id)
  if (id === 'word-ppt') {
    router.push('/teacher/resources')
    return
  }
  if (id === 'last-lesson' && selectedClass.value) {
    const targetClassId = selectedClass.value
    const epoch = beginOperation()
    clearLessonState()
    try {
      const lessons = await lessonsApi.list(targetClassId)
      if (!isCurrentOperation(epoch, targetClassId)) return
      const targetLesson = lessons.find((lesson) => lesson.class_id === targetClassId)
      if (targetLesson) {
        store.artifact = targetLesson
        applyArtifact()
        void loadSuggestions(targetClassId)
        showToast?.('已载入服务器中的最近教案')
        return
      }
      await createLesson()
      return
    } catch (e: any) {
      if (!isCurrentOperation(epoch, targetClassId)) return
      clearLessonState()
      showToast?.(e?.message || '最近教案加载失败')
      return
    }
  }
  await createLesson()
  showToast?.(`已选择「${src?.title}」作为起点`)
}

async function onClassChange() {
  const targetClassId = selectedClass.value
  const epoch = beginOperation()
  const className = classes.value.find((item) => item.id === targetClassId)?.name || ''
  ctx.setClass(targetClassId, className)
  clearLessonState()
  try {
    const lessons = await lessonsApi.list(targetClassId)
    if (!isCurrentOperation(epoch, targetClassId)) return
    const targetLesson = lessons.find((lesson) => lesson.class_id === targetClassId)
    if (targetLesson) {
      store.artifact = targetLesson
      applyArtifact()
      void loadSuggestions(targetClassId)
      showToast?.(`已切换到${className}，已载入该班教案`)
      return
    }
    clearLessonState()
    showToast?.(`已切换到${className}`)
  } catch (e: any) {
    if (!isCurrentOperation(epoch, targetClassId)) return
    clearLessonState()
    showToast?.(e?.message || '目标班级教案加载失败')
  }
}

function selectedClassArtifact() {
  const artifact = store.artifact
  if (!artifact) {
    showToast?.('请先生成该班教案')
    return null
  }
  if (artifact.class_id !== selectedClass.value) {
    showToast?.('当前教案不属于所选班级，请先加载或生成该班级教案')
    return null
  }
  return artifact
}

async function saveDraft() {
  const artifact = selectedClassArtifact()
  if (!artifact) return
  // R06 Phase A：按 artifact 自身的单一数据源回写——segments 版回写 segments，旧版回写 timeline，不做双写
  const segments = Array.isArray((artifact.content as any).segments) ? ((artifact.content as any).segments as any[]) : null
  const nextContent: Record<string, unknown> = { ...artifact.content }
  if (segments) {
    nextContent.segments = lessonSteps.value.map((step, index) => ({
      ...(segments[index] || { id: `seg-${index + 1}`, kind: 'teaching', source: 'teacher_edit', locked: false }),
      title: step.title,
      duration_min: stepDuration(step) || 5,
      teacher_action: step.activities[0] || (segments[index]?.teacher_action ?? ''),
      student_action: step.activities[1] || (segments[index]?.student_action ?? ''),
      content: step.description,
    }))
  } else {
    nextContent.timeline = lessonSteps.value.map((s) => ({ phase: s.title, minutes: stepDuration(s) || 5, activities: s.activities }))
  }
  await store.save({ version: artifact.version, content: nextContent })
  showToast?.('草稿已保存到服务器')
}

async function confirmLesson() {
  const artifact = selectedClassArtifact()
  if (!artifact) return
  store.artifact = await artifactsApi.confirm(artifact.artifact_id, `confirm:${artifact.artifact_id}`)
  showToast?.('本节课已确认，可生成正式 PPT')
}

function autoBalance() {
  if (!lessonSteps.value.length) return
  const targetMinutes = Math.max(1, Number(durationMinutes.value) || Number(store.artifact?.content?.duration_minutes) || 45)
  const base = Math.floor(targetMinutes / lessonSteps.value.length)
  let elapsed = 0
  lessonSteps.value.forEach((step, index) => {
    const minutes = index === lessonSteps.value.length - 1 ? targetMinutes - elapsed : base
    step.timeRange = `${elapsed}-${elapsed + minutes} min`
    elapsed += minutes
  })
  showToast?.(`已将课堂环节自动平衡为 ${targetMinutes} 分钟`)
}

function editStep(step: LessonStep) { openEditor(step, 'content') }

function addMaterial(step: LessonStep) { openEditor(step, 'material') }

function adjustTime(step: LessonStep) { openEditor(step, 'time') }

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

/** 采纳建议：落库到教案 artifact（契约 2026-09-01 accepted）；端点未开通时诚实提示不假装成功 */
async function adoptSuggestion(sug: Suggestion) {
  if (sug.adopted) return
  const artifact = selectedClassArtifact()
  if (!artifact) return
  try {
    const updated = await lessonsApi.adoptSuggestion(artifact.artifact_id, {
      segment_id: sug.targetStepId,
      suggestion_id: sug.id,
      content: sug.description,
    })
    if (updated?.data && updated.data.version) store.artifact = updated.data
  } catch (e: any) {
    if (e?.code === 404) {
      showToast?.('采纳落库端点尚未开通（契约已受理，后端排期中），建议暂未入库')
      return
    }
    showToast?.(e?.message || '采纳建议失败')
    return
  }
  sug.adopted = true
  const step = lessonSteps.value.find((s) => s.id === sug.targetStepId)
  if (step) {
    step.added = true
    step.tagText = '已采纳'
    step.tagClass = 'green'
  }
  showToast?.(`已采纳建议并落库：${sug.title}`)
}

async function generateSlides() {
  try {
    const artifact = selectedClassArtifact()
    if (!artifact) return
    if (artifact.status !== 'confirmed') {
      showToast?.('请先确认教案后再生成 PPT')
      return
    }
    const slide = (await lessonsApi.createSlides(artifact.artifact_id, { version: artifact.version, style: '简洁课堂' })).data
    const url = String(slide?.content?.download_url || '')
    if (!url) throw new Error('课件服务未返回下载地址')
    const { blob, filename } = await api.download(url.replace(/^\/api/, ''))
    downloadBlob(blob, filename || String(slide?.content?.filename || '课堂课件.pptx'))
    showToast?.('PPT 已生成并开始下载')
  } catch (e: any) { showToast?.(e?.message || 'PPT 生成失败') }
}

async function exportWord() {
  try {
    const artifact = selectedClassArtifact()
    if (!artifact) return
    const { blob, filename } = await api.download(`/teacher/lessons/${artifact.artifact_id}/download`)
    downloadBlob(blob, filename || `${String(artifact.content.topic || '课堂教案')}.txt`)
    showToast?.('Word 教案已生成并开始下载')
  } catch (e: any) {
    showToast?.(e?.message || 'Word 教案生成失败')
  }
}

/** 当堂练习：携带本节课蓝图（课题/知识点/题量/来源）跳转组卷工作台（GP-6） */
function generatePractice() {
  const artifact = store.artifact
  const kp = topic.value.trim() || String(artifact?.content?.topic || '')
  const query: Record<string, string> = { count: '3', source: `lesson:${artifact?.artifact_id || 'draft'}` }
  if (kp) { query.topic = kp; query.kp_codes = kp }
  router.push({ path: '/teacher/assign', query })
  showToast?.('已携带本节课蓝图跳转组卷，可在组卷台继续调整')
}

/** 板书提纲：后端生成（TC-L2-F09，废除前端拼 txt），走 client 下载（401 自动刷新） */
async function generateBoardOutline() {
  try {
    const artifact = selectedClassArtifact()
    if (!artifact) return
    if (!lessonSteps.value.length) {
      showToast?.('请先生成教案')
      return
    }
    const outline = (await lessonsApi.createExplainer(artifact.artifact_id, { kind: 'board_outline', version: artifact.version })).data
    const url = String(outline?.content?.download_url || '')
    if (!url) throw new Error('提纲服务未返回下载地址')
    const { blob, filename } = await api.download(url.replace(/^\/api/, ''))
    downloadBlob(blob, filename || '课堂板书提纲.txt')
    showToast?.('板书提纲已生成并开始下载')
  } catch (e: any) { showToast?.(e?.message || '板书提纲生成失败') }
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
function applyArtifact() {
  // R06 Phase A：segments 为单一数据源；旧 artifacts（timeline 兼容层）仍可读
  const content = (store.artifact?.content || {}) as Record<string, unknown>
  const segments = Array.isArray(content.segments) && content.segments.length ? (content.segments as any[]) : null
  const legacy = Array.isArray(content.timeline) ? (content.timeline as LessonTimelineItem[]) : []
  const source = segments || legacy
  let elapsed = 0
  lessonSteps.value = source.map((seg: any, index: number) => {
    const minutes = Number(seg.duration_min || seg.minutes || 5)
    const fromStructured = [seg.teacher_action, seg.student_action]
      .filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item: string) => item.trim())
    const fromLegacy = Array.isArray(seg.activities) ? seg.activities.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : []
    const activities = fromStructured.length ? fromStructured : fromLegacy
    const item = {
      id: `step-${index + 1}`,
      title: seg.title || seg.phase || `环节 ${index + 1}`,
      timeRange: `${elapsed}-${elapsed + minutes} min`,
      tagText: '本地草稿',
      tagClass: 'blue',
      description: (typeof seg.content === 'string' && seg.content.trim()) || activities.join('；'),
      activities,
    }
    elapsed += minutes
    return item
  })
  const artifactDuration = Number(store.artifact?.content?.duration_minutes)
  if (Number.isFinite(artifactDuration) && artifactDuration > 0) durationMinutes.value = artifactDuration
}

async function createLesson() {
  const cleanTopic = topic.value.trim()
  if (!cleanTopic) {
    showToast?.('请填写课题')
    return
  }
  if (!selectedClass.value) return
  const targetClassId = selectedClass.value
  const epoch = beginOperation()
  clearLessonState()
  let result
  try {
    result = await store.adapt({ class_id: targetClassId, topic: cleanTopic, requirements: requirements.value.trim(), duration_minutes: Math.max(1, Number(durationMinutes.value) || 45) })
  } catch (e: any) {
    if (!isCurrentOperation(epoch, targetClassId)) return
    clearLessonState()
    showToast?.(e?.message || '生成教案失败')
    return
  }
  if (!isCurrentOperation(epoch, targetClassId)) return
  const generated = result.artifact as TeacherArtifact | null
  if (!generated || result.error || generated.class_id !== targetClassId) {
    clearLessonState()
    if (result.error) showToast?.(result.error)
    return
  }
  store.artifact = generated
  applyArtifact()
  void loadSuggestions(targetClassId)
}

onMounted(async () => {
  // 支持 ?focus={prompt}&from=classroom（课堂「加入讲解」带焦点进入，L6→L2 闭环）
  focusFromQuery.value = typeof route.query.focus === 'string' ? route.query.focus : ''
  // GP-2：?lesson_id&from=insight:{id}（Today 洞察「加入下节课」）→ 载入指定教案并高亮插入点
  const insightParam = typeof route.query.from === 'string' && route.query.from.startsWith('insight:') ? route.query.from.slice('insight:'.length) : ''
  const lessonParam = typeof route.query.lesson_id === 'string' ? route.query.lesson_id : ''
  try {
    const data = await classApi.mine()
    classes.value = data?.items || []
    if (classes.value.length) {
      selectedClass.value = classes.value[0].id
      ctx.setClass(classes.value[0].id, classes.value[0].name)
    }
    if (lessonParam) {
      try {
        const loaded = (await lessonsApi.get(lessonParam)).data
        store.artifact = loaded
        applyArtifact()
        await loadSuggestions(loaded?.class_id || selectedClass.value)
        if (insightParam) markSuggestedStep(insightParam)
        showToast?.('已载入洞察指向的教案，插入点已高亮')
      } catch { showToast?.('洞察指向的教案未能载入，可从下方起点重新生成') }
    } else {
      if (insightParam) {
        await loadSuggestions(selectedClass.value)
        if (lessonSteps.value.length) markSuggestedStep(insightParam)
      }
    }
    if (focusFromQuery.value) showToast?.(`已带入课堂焦点：${focusFromQuery.value}，可粘贴进对应环节`)
  } catch (e: any) { showToast?.(e?.message || '班级加载失败') }
})
</script>

<style scoped>
/* 结构化环节编辑抽屉（TC-L2-F05）：右侧滑出，含 KaTeX 预览 */
.t-edit-overlay { position: fixed; inset: 0; z-index: 70; background: rgba(23, 36, 59, .28); }
.t-edit-drawer { position: fixed; top: 0; right: 0; bottom: 0; z-index: 71; box-sizing: border-box; width: min(440px, 92vw); padding: 22px 24px; overflow-y: auto; background: #fff; border-left: 1px solid #e1e7ef; box-shadow: -18px 0 40px rgba(23, 36, 59, .16); display: grid; gap: 12px; align-content: start; }
.t-edit-head { display: flex; align-items: center; justify-content: space-between; }
.t-edit-head h3 { margin: 0; font-size: 17px; color: #1c3452; }
.t-edit-field { display: grid; gap: 6px; color: #405168; font-size: 13px; font-weight: 650; }
.t-edit-field input, .t-edit-field textarea { box-sizing: border-box; width: 100%; padding: 9px 10px; border: 1px solid #d5dee9; border-radius: 8px; color: #17243b; background: #fff; font: inherit; font-weight: 400; }
.t-edit-field textarea { resize: vertical; line-height: 1.5; }
.t-edit-preview { border: 1px dashed #cdd9e6; border-radius: 9px; padding: 10px 12px; background: #fbfdff; color: #47586e; font-size: 13px; line-height: 1.6; }
.t-edit-preview .sub { display: block; margin-bottom: 4px; color: #7c8aa0; font-size: 12px; }
.t-edit-actions { display: flex; gap: 9px; }
.t-edit-hint { margin: 0; color: #91a0b8; font-size: 12px; line-height: 1.5; }
</style>
