<!--
  V2 reconstruction source: Paper LMS CoursePacingPage (MIT), cloned at
  D:\teacher-v2-reference-repos\kocherm-paper-lms, commit 543c… .
  Its source-first pacing workspace is adapted here for teacher-owned Chinese
  high-school mathematics materials, explicit provenance and teacher approval.
-->
<template>
  <div class="prep-v2">
    <header class="prep-v2__head">
      <div>
        <p class="prep-v2__eyebrow">备课 · 高中数学</p>
        <h1>从真实材料开始备课</h1>
        <p>选择你上传且可提取文本的讲义、试卷或课件，再生成可追溯的课案草稿。不会预填课题或编造教学建议。</p>
      </div>
      <div class="prep-v2__head-actions">
        <button class="t-btn" type="button" @click="router.push('/teacher/resources')">管理资料</button>
        <button class="t-btn primary" type="button" :disabled="!canGenerate || store.loading" @click="generateDraft">
          {{ store.loading ? '正在生成…' : '生成来源化草稿' }}
        </button>
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


    <main class="prep-v2__grid">
      <section class="prep-v2__inputs" aria-labelledby="input-title">
        <header><p class="prep-v2__eyebrow">第一步</p><h2 id="input-title">明确本节课的输入</h2></header>
        <label>授课班级
          <select v-model="selectedClass" @change="loadLessons">
            <option value="" disabled>请选择已有班级</option>
            <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <label>课题
          <input v-model.trim="topic" maxlength="200" placeholder="例如：利用导数研究函数单调性（由教师填写）">
        </label>
        <label>教学要求（可选）
          <textarea v-model.trim="requirements" rows="4" placeholder="例如：保留教材例题的条件；安排学生板演；说明本班易错点的处理方式"></textarea>
        </label>
        <label>课堂时长
          <input v-model.number="durationMinutes" type="number" min="1" max="240">
        </label>

        <div class="prep-v2__source-head"><div><p class="prep-v2__eyebrow">第二步</p><h2>来源材料</h2></div><span>{{ selectedResourceIds.length }} 份已选</span></div>
        <p class="prep-v2__hint">只有已成功提取文字的教师自有资料可进入生成上下文；图片或扫描件未提取文字时不会被假装“已理解”。</p>
        <div v-if="!resources.length" class="prep-v2__empty"><strong>尚无可用来源资料</strong><p>请先上传真实讲义、试卷、课件或文本材料。</p><button class="t-btn sm" type="button" @click="router.push('/teacher/resources')">去上传资料</button></div>
        <div v-else class="prep-v2__source-list">
          <label v-for="resource in resources" :key="resource.resource_id" class="prep-v2__source" :class="{ 'is-disabled': !hasText(resource) }">
            <input v-model="selectedResourceIds" type="checkbox" :value="resource.resource_id" :disabled="!hasText(resource)">
            <span><strong>{{ resource.name }}</strong><small>{{ hasText(resource) ? '已提取文本，可作为本课依据' : '尚无可提取文本，不能作为生成输入' }}</small></span>
          </label>
        </div>

        <div v-if="lessons.length" class="prep-v2__prior">
          <p class="prep-v2__eyebrow">或选择已有教案作为改编来源</p>
          <label v-for="lesson in lessons.slice(0, 3)" :key="lesson.artifact_id" class="prep-v2__source">
            <input v-model="selectedLessonId" type="radio" :value="lesson.artifact_id" name="prior-lesson">
            <span><strong>{{ lessonTitle(lesson) }}</strong><small>版本 {{ lesson.version }} · {{ lesson.status === 'confirmed' ? '已确认' : '草稿' }}</small></span>
          </label>
        </div>
      </section>

      <section class="prep-v2__workspace" aria-labelledby="workspace-title">
        <header class="prep-v2__workspace-head"><div><p class="prep-v2__eyebrow">第三步</p><h2 id="workspace-title">课案草稿与教师确认</h2></div><span v-if="artifact" :class="['prep-v2__state', artifact.status]">{{ stateText(artifact.status) }}</span></header>
        <div v-if="!artifact" class="prep-v2__blank"><h3>尚未生成课案</h3><p>填写课题并选择至少一份来源材料或已有课案后，生成第一个草稿。</p></div>
        <template v-else>
          <div v-if="artifact.degraded" class="prep-v2__warning"><strong>基础草稿</strong><p>当前没有获得可验证的来源化模型结果。此稿不能确认为正式课案，也不能生成正式 PPT；请检查模型配置、来源材料或改为人工编辑后再继续。</p><small v-for="warning in artifact.warnings" :key="warning">{{ warning }}</small></div>
          <div v-else class="prep-v2__provenance"><strong>来源引用</strong><span v-for="ref in artifact.source_refs" :key="sourceLabel(ref)">{{ sourceLabel(ref) }}</span><span v-if="!artifact.source_refs.length">服务未返回来源引用，不能作为正式课案确认。</span></div>
          <article class="prep-v2__lesson">
            <h3>{{ lessonTitle(artifact) }}</h3>
            <p v-if="lessonObjectives(artifact).length" class="prep-v2__objectives">{{ lessonObjectives(artifact).join('；') }}</p>
            <ol v-if="lessonTimeline(artifact).length" class="prep-v2__timeline"><li v-for="(step, index) in lessonTimeline(artifact)" :key="`${index}-${step.title}`"><span>{{ step.minutes ? `${step.minutes} 分钟` : '时长待定' }}</span><div><strong>{{ step.title }}</strong><p v-for="activity in step.activities" :key="activity">{{ activity }}</p></div></li></ol>
            <p v-else class="prep-v2__empty">服务未返回教学环节。请勿将空草稿确认或用于生成课件。</p>
          </article>
          <div class="prep-v2__actions">
            <button class="t-btn" type="button" @click="downloadWord">下载 Word 草稿</button>
            <button v-if="artifact.status === 'draft'" class="t-btn primary" type="button" :disabled="artifact.degraded || !artifact.source_refs.length" @click="confirmLesson">教师确认课案</button>
            <button v-if="artifact.status === 'confirmed'" class="t-btn primary" type="button" :disabled="artifact.degraded" @click="generateSlides">生成并下载 PPT</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/assign')">基于已审核题库组卷</button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, authHeaders } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { lessonsApi } from '@/api/teacher/lessons'
import { resourcesApi } from '@/api/teacher/resources'
import { useLessonArtifactsStore } from '@/stores/teacher/lessonArtifacts'
import type { LessonTimelineItem, TeacherArtifact } from '@/types/teacher'


const router = useRouter()
const store = useLessonArtifactsStore()
const showToast = inject<(message: string) => void>('showToast', () => {})
const classes = ref<ClassItem[]>([])
const resources = ref<TeacherResource[]>([])
const lessons = ref<TeacherArtifact[]>([])
const selectedClass = ref('')
const classes = ref<Array<{ id: string; name: string }>>([])
const selectedSource = ref('last-lesson')
const topic = ref('')
const requirements = ref('')
const durationMinutes = ref(45)


function hasText(resource: TeacherResource) { return Boolean(resource.slices?.length) }
function lessonTitle(item: TeacherArtifact) { return String(item.content.topic || item.content.title || '未命名教案') }
function stateText(status: TeacherArtifact['status']) { return status === 'confirmed' ? '已确认' : status === 'published' ? '已发布' : '草稿' }
function sourceLabel(ref: SourceRef) { return ref.title || ref.snippet || ref.ref || ref.kind }
function lessonObjectives(item: TeacherArtifact) { return Array.isArray(item.content.objectives) ? item.content.objectives.map(String) : [] }
function lessonTimeline(item: TeacherArtifact): TimelineStep[] {
  const raw = item.content.timeline || item.content.sections || item.content.segments
  if (!Array.isArray(raw)) return []
  return raw.map((step: any, index) => ({ title: String(step.phase || step.title || `环节 ${index + 1}`), minutes: Number(step.minutes ?? step.duration_minutes ?? step.duration_min) || undefined, activities: Array.isArray(step.activities) ? step.activities.map(String) : [String(step.content || step.description || '')].filter(Boolean) }))
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

}
async function generateDraft() {
  if (!canGenerate.value) return
  await store.adapt({ class_id: selectedClass.value, topic: topic.value, requirements: requirements.value || null, duration_minutes: durationMinutes.value, source_resource_ids: selectedResourceIds.value, source_artifact_id: selectedLessonId.value || null, source_refs: [] })
  if (store.artifact) notice.value = store.artifact.degraded ? '已保存基础草稿；它不会被伪装为正式课案。' : '已生成带来源引用的课案草稿，请逐项核对后确认。'
  if (store.error) showToast(store.error)
}

const suggestions = ref<Suggestion[]>([])
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
  await store.save({
    version: artifact.version,
    content: { ...artifact.content, timeline: lessonSteps.value.map((s) => ({ phase: s.title, minutes: stepDuration(s) || 5, activities: s.activities })) },
  })
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

function editStep(step: LessonStep) {
  const value = window.prompt('编辑教学内容', step.description)
  if (value !== null && value.trim()) {
    step.activities = [value.trim()]
    step.description = step.activities.join('；')
  }
}

function addMaterial(step: LessonStep) {
  const value = window.prompt('输入材料名称或使用说明', '')
  if (value?.trim()) {
    step.activities = [...step.activities, `材料：${value.trim()}`]
    step.description = step.activities.join('；')
  }
}

function adjustTime(step: LessonStep) {
  const value = window.prompt('输入该环节时长（分钟）', String(stepDuration(step)))
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return
  const start = Number(step.timeRange.match(/\d+/)?.[0] || 0)
  step.timeRange = `${start}-${start + Math.round(minutes)} min`
  recalculateRanges()
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
    const artifact = selectedClassArtifact()
    if (!artifact) return
    if (artifact.status !== 'confirmed') {
      showToast?.('请先确认教案后再生成 PPT')
      return
    }
    const slide = (await lessonsApi.createSlides(artifact.artifact_id, { version: artifact.version, style: '简洁课堂' })).data
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
    const artifact = selectedClassArtifact()
    if (!artifact) return
    const response = await fetch(`/api/teacher/lessons/${artifact.artifact_id}/download`, { headers: authHeaders() as HeadersInit })
    if (!response.ok) throw new Error('Word 教案下载失败')
    downloadBlob(await response.blob(), `${String(artifact.content.topic || '课堂教案')}.docx`)
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
  if (!selectedClassArtifact()) return
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
  const timeline = (store.artifact?.content?.timeline || []) as LessonTimelineItem[]
  let elapsed = 0
  lessonSteps.value = timeline.map((step, index) => {
    const minutes = Number(step.minutes || 5)
    const activities = Array.isArray(step.activities) ? step.activities.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : []
    const item = {
      id: `step-${index + 1}`,
      title: step.phase || `环节 ${index + 1}`,
      timeRange: `${elapsed}-${elapsed + minutes} min`,
      tagText: '本地草稿',
      tagClass: 'blue',
      description: activities.join('；'),
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
}

onMounted(async () => {
  try {
    const data = await api.get('/classes/mine')
    classes.value = data?.items || []
    if (classes.value.length) {
      selectedClass.value = classes.value[0].id
      ctx.setClass(classes.value[0].id, classes.value[0].name)
    }
  } catch (e: any) { showToast?.(e?.message || '班级加载失败') }
})

</script>

<style scoped>
.prep-v2{max-width:1500px;margin:0 auto;padding:30px 32px 42px;color:#17243b}.prep-v2__head,.prep-v2__head-actions,.prep-v2__workspace-head,.prep-v2__source-head,.prep-v2__actions{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.prep-v2__head h1{margin:3px 0 8px;font-size:32px;letter-spacing:-.04em}.prep-v2__head>div:first-child>p:last-child{max-width:760px;margin:0;color:#53637b;line-height:1.6}.prep-v2__head-actions{align-items:center}.prep-v2__eyebrow{margin:0;color:#69758b;font-size:12px;letter-spacing:.08em;font-weight:700}.prep-v2__notice{margin:22px 0 0;padding:11px 14px;background:#edf7ff;color:#175e8f;border-radius:9px}.prep-v2__notice.is-error{background:#fff1f1;color:#b42318}.prep-v2__grid{display:grid;grid-template-columns:minmax(310px,.78fr) minmax(0,1.42fr);gap:22px;margin-top:24px}.prep-v2__inputs,.prep-v2__workspace{background:#fff;border:1px solid #e1e7ef;border-radius:14px;padding:22px;min-width:0}.prep-v2 h2{margin:5px 0 0;font-size:20px}.prep-v2__inputs>label{display:grid;gap:7px;margin-top:17px;color:#35455d;font-size:13px;font-weight:700}.prep-v2 input,.prep-v2 select,.prep-v2 textarea{box-sizing:border-box;width:100%;border:1px solid #d8e1ec;border-radius:8px;padding:10px 11px;color:#17243b;background:#fff;font:inherit}.prep-v2 textarea{resize:vertical;line-height:1.5}.prep-v2__source-head{margin-top:27px;align-items:end}.prep-v2__source-head>span{font-size:12px;color:#6b7280}.prep-v2__hint{margin:9px 0 12px;color:#64748b;font-size:12px;line-height:1.55}.prep-v2__source-list,.prep-v2__prior{display:grid;gap:8px}.prep-v2__prior{margin-top:18px}.prep-v2__source{display:flex!important;grid-template-columns:none!important;align-items:flex-start;gap:10px;margin:0!important;padding:11px;border:1px solid #e1e7ef;border-radius:9px;cursor:pointer}.prep-v2__source input{width:auto;margin:3px 0 0}.prep-v2__source span{display:grid;gap:4px}.prep-v2__source small{color:#66758a;font-weight:400;line-height:1.4}.prep-v2__source.is-disabled{opacity:.58;cursor:not-allowed;background:#f8fafc}.prep-v2__empty,.prep-v2__blank{margin-top:16px;padding:28px 20px;background:#f8fafc;border-radius:10px;color:#64748b;text-align:center;line-height:1.55}.prep-v2__empty p,.prep-v2__blank p{margin:6px 0 14px}.prep-v2__workspace-head{padding-bottom:17px;border-bottom:1px solid #edf0f4}.prep-v2__state{padding:5px 9px;border-radius:999px;background:#fff7df;color:#a16207;font-size:12px}.prep-v2__state.confirmed{background:#ecfdf3;color:#166534}.prep-v2__warning{margin:18px 0;padding:16px;border:1px solid #fdba74;background:#fff7ed;border-radius:10px;color:#9a3412}.prep-v2__warning p{margin:6px 0;line-height:1.55}.prep-v2__warning small{display:block;margin-top:4px}.prep-v2__provenance{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:18px 0;padding:12px;background:#f0f9ff;border-radius:9px;color:#175e8f;font-size:13px}.prep-v2__provenance span{padding:4px 7px;background:#fff;border-radius:5px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.prep-v2__lesson{padding:19px 0}.prep-v2__lesson h3{margin:0;font-size:21px}.prep-v2__objectives{padding:10px 12px;background:#f8fafc;border-radius:8px;color:#4b5c72;line-height:1.55}.prep-v2__timeline{display:grid;gap:14px;padding:0;margin:18px 0;list-style:none}.prep-v2__timeline li{display:grid;grid-template-columns:75px 1fr;gap:14px}.prep-v2__timeline li>span{color:#9a6700;font-size:12px;padding-top:3px}.prep-v2__timeline li>div{padding:13px;border-left:3px solid #f59e0b;background:#fffdf8;border-radius:0 8px 8px 0}.prep-v2__timeline p{margin:7px 0 0;color:#56667d;line-height:1.5}.prep-v2__actions{padding-top:17px;border-top:1px solid #edf0f4;justify-content:flex-start;flex-wrap:wrap}@media(max-width:900px){.prep-v2{padding:22px 16px}.prep-v2__grid{grid-template-columns:1fr}.prep-v2__head{flex-direction:column}.prep-v2__head-actions{width:100%;justify-content:flex-start}}
</style>

