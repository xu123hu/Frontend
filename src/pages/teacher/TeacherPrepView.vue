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

              <!-- 内联编辑面板（替代 window.prompt） -->
              <div v-if="editingStepId === step.id" class="t-step-edit">
                <label class="t-edit-label">教学内容
                  <textarea v-model="editDraft.description" rows="3" class="t-input" style="width:100%"></textarea>
                </label>
                <label class="t-edit-label">添加材料
                  <input v-model="editDraft.material" class="t-input" style="width:100%" placeholder="材料名称或使用说明" @keyup.enter="saveStep(step)" />
                </label>
                <label class="t-edit-label">时长（分钟）
                  <input v-model.number="editDraft.minutes" type="number" min="1" class="t-input" style="width:120px" />
                </label>
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

// ---- 内联编辑状态（替代 window.prompt） ----
const editingStepId = ref('')
const editDraft = ref({ description: '', material: '', minutes: 5, focus: 'content' })

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
}

function closeEdit() {
  editingStepId.value = ''
  editDraft.value.material = ''
}

function saveStep(step: LessonStep) {
  // 内容
  if (editDraft.value.description.trim()) step.description = editDraft.value.description.trim()
  // 附加材料
  if (editDraft.value.material.trim()) {
    step.description = `${step.description || ''}\n材料：${editDraft.value.material.trim()}`.trim()
  }
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
function applyArtifact() {
  const content = (store.artifact?.content || {}) as Record<string, unknown>
  // 服务端返回 sections（title/duration_minutes/activities），历史数据可能是 timeline（phase/minutes）
  const sections = (content.sections ||
    content.timeline ||
    []) as Array<{ title?: string; phase?: string; duration_minutes?: number; minutes?: number; activities?: string[]; description?: string }>
  let elapsed = 0
  lessonSteps.value = sections.map((s, index) => {
    const minutes = Number(s.duration_minutes ?? s.minutes ?? 5)
    const activities = Array.isArray(s.activities) ? s.activities.filter(Boolean) : []
    const item = {
      id: `step-${index + 1}`,
      title: s.title || s.phase || `环节 ${index + 1}`,
      timeRange: `${elapsed}-${elapsed + minutes} min`,
      tagText: '可编辑',
      tagClass: 'blue',
      description: activities.length ? activities.map((a) => `• ${a}`).join('\n') : String(s.description || '可编辑教学环节，确认后生成 PPT。'),
      added: false,
    }
    elapsed += minutes
    return item
  })
}

async function createLesson() {
  if (!selectedClass.value) return
  await store.adapt({ class_id: selectedClass.value, topic: '函数的单调性', requirements: '包含例题、练习与课堂小结', duration_minutes: 45 })
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
