<!--
  V2 reconstruction source: TeacherBuddy quiz-editor-form (MIT), cloned at
  D:\teacher-v2-reference-repos\mrbubbles-teacherbuddy, commit 8daa9c… .
  We adapt its draft builder / question-list relationship to a server-owned,
  provenance-first high-school mathematics quiz workflow.
-->
<template>
  <div class="assign-v2">
    <header class="assign-v2__head">
      <div>
        <p class="assign-v2__eyebrow">作业与测验 · 高中数学</p>
        <h1>组卷草稿</h1>
        <p>只从已审核且可发布的题库取题。题库不足时会停止在草稿，绝不使用本地模板补题。</p>
      </div>
      <button class="t-btn" type="button" @click="loadAssignments">刷新我的作业</button>
    </header>

    <p v-if="store.error || notice" :class="['assign-v2__notice', { error: store.error }]" role="status">{{ store.error || notice }}</p>

    <main class="assign-v2__workspace">
      <section class="assign-v2__builder" aria-labelledby="builder-title">
        <div class="assign-v2__section-head"><div><p class="assign-v2__eyebrow">严格题源</p><h2 id="builder-title">建立组卷条件</h2></div><span>{{ selectedClassName || '尚未选择班级' }}</span></div>
        <div class="assign-v2__form">
          <label>目标班级
            <select v-model="form.classId" @change="onClassChanged">
              <option value="">请选择一个真实班级</option>
              <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </label>
          <label>作业名称<input v-model.trim="form.title" maxlength="100" placeholder="例如：函数单调性随堂练习"></label>
          <label class="wide">知识点代码
            <textarea v-model.trim="form.knowledgePoints" rows="3" placeholder="输入题库或已审核候选题标注的知识点代码；可用逗号或换行分隔"></textarea>
            <small>资料中心中已审核候选题会保留它的知识点代码；没有题源时，请先上传并审核真实材料。</small>
          </label>
          <label>题量<input v-model.number="form.count" type="number" min="1" max="100"></label>
          <label>选择题数<input v-model.number="form.choice" type="number" min="0" :max="form.count"></label>
          <label>填空题数<input v-model.number="form.blank" type="number" min="0" :max="form.count"></label>
          <label>解答题数<input v-model.number="form.text" type="number" min="0" :max="form.count"></label>
        </div>
        <p v-if="typeTotal !== form.count" class="assign-v2__guard">题型总数为 {{ typeTotal }}，需要与题量 {{ form.count }} 一致后才能请求题库。</p>
        <button class="t-btn primary lg" type="button" :disabled="!canGenerate || store.generating" @click="generateDraft">{{ store.generating ? '正在检索题库…' : '从严格题源生成草稿' }}</button>
      </section>

      <section class="assign-v2__paper" aria-labelledby="paper-title">
        <div class="assign-v2__section-head"><div><p class="assign-v2__eyebrow">教师审阅</p><h2 id="paper-title">题集与发布状态</h2></div><span>{{ draftStatus }}</span></div>
        <div v-if="!quizItems.length" class="assign-v2__empty"><h3>尚未生成题集</h3><p>设置真实班级和知识点后，从现有题库建立可审阅草稿。</p></div>
        <template v-else>
          <div v-if="isInsufficient" class="assign-v2__blocker"><strong>题库供题不足，不能确认或发布。</strong><p>已取得 {{ quizItems.length }}/{{ form.count }} 道严格命中题。请调整知识点、题型或题量，或先在资源中心审核真实题源。</p></div>
          <ol class="assign-v2__questions">
            <li v-for="question in quizItems" :key="`${question.source_ref || question.question_text}-${question.item_no}`">
              <div><LatexText :text="question.question_text" /></div>
              <p>{{ typeLabel(question.q_type) }} · {{ difficultyLabel(question.difficulty) }} · 来源：{{ question.source || '题库未标注来源' }}<span v-if="question.source_ref">（{{ question.source_ref }}）</span></p>
              <p v-if="question.answer_analysis" class="analysis">解析：{{ question.answer_analysis }}</p>
            </li>
          </ol>
          <div class="assign-v2__actions">
            <button v-if="artifactStatus === 'draft'" class="t-btn primary" type="button" :disabled="isInsufficient" @click="confirmArtifact">确认题集草稿</button>
            <button v-if="artifactStatus === 'confirmed' && !store.assignment" class="t-btn primary" type="button" @click="createAssignment">创建作业草稿</button>
            <button v-if="store.assignment?.status === 'draft' && !publishConfirmation" class="t-btn primary" type="button" @click="publishConfirmation = true">发布给学生</button>
            <button v-if="store.assignment?.status === 'draft' && publishConfirmation" class="t-btn primary" type="button" @click="confirmPublish">确认发布给学生</button>
            <button v-if="publishConfirmation" class="t-btn" type="button" @click="publishConfirmation = false">返回审阅</button>
          </div>
        </template>
      </section>
    </main>

    <section class="assign-v2__history" aria-labelledby="history-title">
      <div class="assign-v2__section-head"><div><p class="assign-v2__eyebrow">学生联动</p><h2 id="history-title">我的作业</h2></div><span>{{ assignments.length }} 条</span></div>
      <div v-if="!assignments.length" class="assign-v2__history-empty">当前范围没有可显示的作业；不会使用示例试卷填充。</div>
      <article v-for="assignment in assignments" :key="assignment.assignment_id" class="assign-v2__assignment"><div><h3>{{ assignment.title }}</h3><p>{{ assignment.created_at ? new Date(assignment.created_at).toLocaleString('zh-CN') : '创建时间待返回' }}</p></div><span :class="`status-${assignment.status}`">{{ assignmentStatusLabel(assignment.status) }}</span></article>
    </section>

  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { assignmentsApi } from '@/api/teacher/assignments'
import LatexText from '@/components/LatexText.vue'

import { useAssessmentStore } from '@/stores/teacher/assessment'
import { useTeacherContextStore } from '@/stores/teacher/context'
import type { Assignment, QuizQuestion } from '@/types/teacher'

const store = useAssessmentStore()
const context = useTeacherContextStore()
const showToast = inject<(message: string) => void>('showToast', () => {})
const classes = ref<Array<{ id: string; name: string }>>([])
const assignments = ref<Assignment[]>([])
const notice = ref('')
const publishConfirmation = ref(false)
const form = reactive({ classId: '', title: '高中数学练习', knowledgePoints: '', count: 8, choice: 4, blank: 2, text: 2 })

const typeTotal = computed(() => Math.max(0, form.choice) + Math.max(0, form.blank) + Math.max(0, form.text))
const knowledgePoints = computed(() => form.knowledgePoints.split(/[，,\n\s]+/).map((item) => item.trim()).filter(Boolean))
const canGenerate = computed(() => Boolean(form.classId && knowledgePoints.value.length && form.count >= 1 && typeTotal.value === form.count))
const selectedClassName = computed(() => classes.value.find((item) => item.id === form.classId)?.name || context.className || '')
const quizItems = computed(() => ((store.quizArtifact?.content?.items || []) as QuizQuestion[]))
const artifactStatus = computed(() => store.quizArtifact?.status || '')
const isInsufficient = computed(() => Boolean(store.quizArtifact?.degraded || store.quizArtifact?.content?.insufficient || quizItems.value.length !== form.count))
const draftStatus = computed(() => store.assignment?.status === 'published' ? '已发布给学生' : artifactStatus.value === 'confirmed' ? (store.assignment ? '作业草稿待发布' : '题集已确认') : artifactStatus.value === 'draft' ? '待教师确认' : '未建立')

function typeLabel(value: QuizQuestion['q_type']) { return value === 'choice' ? '选择题' : value === 'blank' ? '填空题' : '解答题' }
function difficultyLabel(value: QuizQuestion['difficulty']) { return value === 'easy' ? '基础' : value === 'medium' ? '提升' : '挑战' }
function assignmentStatusLabel(value: Assignment['status']) { return value === 'published' ? '学生可见' : value === 'draft' ? '草稿' : value === 'closed' ? '已截止' : '已归档' }

async function loadAssignments() {
  try { assignments.value = await assignmentsApi.list(form.classId || undefined) }
  catch (error: any) { notice.value = error?.message || '作业列表未能加载' }
}
function onClassChanged() { publishConfirmation.value = false; store.clear(); const selected = classes.value.find((item) => item.id === form.classId); context.setClass(form.classId || null, selected?.name || null); void loadAssignments() }
async function generateDraft() {
  if (!canGenerate.value) return
  publishConfirmation.value = false
  try {
    await store.generateQuiz({ class_id: form.classId, knowledge_points: knowledgePoints.value, count: form.count, question_types: { choice: form.choice, blank: form.blank, text: form.text }, difficulty: { easy: 0.6, medium: 0.3, hard: 0.1 }, exclude_hashes: [] })
    notice.value = isInsufficient.value ? '题库严格匹配不足，草稿已保留供核对，但确认与发布被阻止。' : '题集草稿已建立，请逐题核对来源后确认。'
  } catch (error: any) { showToast(error?.message || store.error || '题集生成失败') }
}
async function confirmArtifact() {
  if (!store.quizArtifact || isInsufficient.value) return
  try { store.quizArtifact = await artifactsApi.confirm(store.quizArtifact.artifact_id, `confirm:${store.quizArtifact.artifact_id}`); notice.value = '题集已由教师确认，可以创建学生作业草稿。' }
  catch (error: any) { showToast(error?.message || '题集确认失败') }

}
async function createAssignment() {
  if (!store.quizArtifact || artifactStatus.value !== 'confirmed') return
  try { await store.createAssignment({ class_id: form.classId, title: form.title, artifact_id: store.quizArtifact.artifact_id }); notice.value = '已创建作业草稿；学生端暂不可见。'; await loadAssignments() }
  catch (error: any) { showToast(error?.message || store.error || '创建作业草稿失败') }
}
async function confirmPublish() {
  if (!store.assignment) return
  try { await store.publish(store.assignment.assignment_id); publishConfirmation.value = false; notice.value = '作业已发布，目标班级的学生端现在可见。'; await loadAssignments() }
  catch (error: any) { showToast(error?.message || store.error || '发布失败') }
}
onMounted(async () => {
  try {
    const data = await api.get('/classes/mine')
    classes.value = data?.items || []
    const remembered = classes.value.find((item) => item.id === context.classId)
    const initial = remembered || classes.value[0]
    if (initial) { form.classId = initial.id; context.setClass(initial.id, initial.name); await loadAssignments() }
    else notice.value = '还没有可用班级，不能建立面向学生的作业。'
  } catch (error: any) { notice.value = error?.message || '班级信息未能加载' }
})
</script>

<style scoped>
.assign-v2 { max-width: 1500px; margin: 0 auto; padding: 30px 32px 44px; color: #17243b; }.assign-v2__head, .assign-v2__section-head, .assign-v2__assignment { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }.assign-v2__eyebrow { margin: 0; color: #64748b; font-size: 12px; font-weight: 700; letter-spacing: .08em; }.assign-v2 h1 { margin: 4px 0 8px; font-size: 32px; letter-spacing: -.04em; }.assign-v2 h2 { margin: 5px 0 0; font-size: 20px; }.assign-v2__head > div > p:last-child { margin: 0; color: #53637b; max-width: 720px; }.assign-v2__notice { margin: 22px 0 0; padding: 11px 14px; color: #175e8f; background: #edf7ff; border-radius: 8px; }.assign-v2__notice.error { color: #b42318; background: #fff1f2; }
.assign-v2__workspace { display: grid; grid-template-columns: minmax(320px, .8fr) minmax(0, 1.2fr); gap: 22px; margin-top: 24px; }.assign-v2__builder, .assign-v2__paper, .assign-v2__history { border: 1px solid #e1e7ef; background: #fff; border-radius: 14px; overflow: hidden; }.assign-v2__section-head { padding: 19px 21px 15px; border-bottom: 1px solid #edf0f4; }.assign-v2__section-head > span { color: #65758b; font-size: 13px; }.assign-v2__form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 20px; }.assign-v2__form label { display: flex; flex-direction: column; gap: 6px; color: #405168; font-size: 13px; font-weight: 650; }.assign-v2__form label.wide { grid-column: 1 / -1; }.assign-v2__form input, .assign-v2__form textarea, .assign-v2__form select { box-sizing: border-box; width: 100%; border: 1px solid #d5dee9; border-radius: 7px; padding: 9px 10px; color: #17243b; background: #fff; font: inherit; font-weight: 400; }.assign-v2__form textarea { resize: vertical; line-height: 1.45; }.assign-v2__form small { color: #738198; font-weight: 400; line-height: 1.5; }.assign-v2__builder > .t-btn { margin: 0 20px 22px; }.assign-v2__guard { margin: 0 20px 14px; color: #a16207; font-size: 13px; }.assign-v2__empty, .assign-v2__history-empty { margin: 18px; padding: 28px; text-align: center; color: #6b7a90; background: #f8fafc; border-radius: 9px; }.assign-v2__empty h3 { margin: 0 0 7px; color: #334155; }.assign-v2__empty p { margin: 0; }.assign-v2__blocker { margin: 16px; padding: 13px 15px; border: 1px solid #f2c36d; border-radius: 9px; color: #92400e; background: #fffbeb; }.assign-v2__blocker p { margin: 6px 0 0; line-height: 1.5; font-size: 13px; }.assign-v2__questions { margin: 0; padding: 0 18px 12px 42px; }.assign-v2__questions li { padding: 15px 5px 14px 0; border-bottom: 1px solid #edf0f4; line-height: 1.55; }.assign-v2__questions li > p { margin: 7px 0 0; color: #65758b; font-size: 12px; }.assign-v2__questions li .analysis { color: #475569; }.assign-v2__actions { display: flex; flex-wrap: wrap; gap: 9px; padding: 16px 20px 20px; }.assign-v2__history { margin-top: 22px; }.assign-v2__assignment { align-items: center; padding: 15px 21px; border-bottom: 1px solid #edf0f4; }.assign-v2__assignment:last-child { border-bottom: 0; }.assign-v2__assignment h3 { margin: 0; font-size: 15px; }.assign-v2__assignment p { margin: 5px 0 0; color: #718096; font-size: 12px; }.assign-v2__assignment span { padding: 5px 8px; border-radius: 999px; font-size: 12px; white-space: nowrap; }.status-published { color: #166534; background: #ecfdf3; }.status-draft { color: #1d4ed8; background: #eff6ff; }.status-closed, .status-archived { color: #65758b; background: #f1f5f9; }
@media (max-width: 900px) { .assign-v2 { padding: 22px 16px; }.assign-v2__head { flex-direction: column; }.assign-v2__workspace { grid-template-columns: 1fr; }.assign-v2__form { grid-template-columns: 1fr; }.assign-v2__form label.wide { grid-column: auto; } }
</style>

