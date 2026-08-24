<template>
  <main class="grading-v2" aria-label="题目聚焦批改工作台">
    <div v-if="store.loading && !workspace" class="grading-v2__state">正在加载题目与作答队列…</div>
    <div v-else-if="store.error && !workspace" class="grading-v2__state grading-v2__state--error">{{ store.error }}</div>
    <div v-else-if="!workspace || !workspace.selected" class="grading-v2__state">
      <h1>当前没有可批改作答</h1>
      <p>已发布的高中数学作业收到学生作答后，会在此按题目进入连续批改。</p>
      <RouterLink to="/teacher/assign">去发布作业</RouterLink>
    </div>
    <section v-else class="grading-v2__workspace">
      <GradingWorkspaceHeader :context="workspace.context" @filter="setFilter" />
      <p v-if="notice" class="grading-v2__notice" role="status">{{ notice }}</p>
      <p v-if="store.error" class="grading-v2__error" role="alert">{{ store.error }}</p>
      <div class="grading-v2__body">
        <SubmissionQueue :entries="workspace.queue" :selected-id="workspace.selected.submissionItemId" @select="select" />
        <SubmissionWorkViewer
          :question="workspace.context.question"
          :selection="workspace.selected"
          :file-url="fileUrl"
          :file-loading="fileLoading"
          :file-error="fileError"
          @retry-file="loadFile"
        />
        <RubricEvidencePanel
          :selection="workspace.selected"
          :final-score="finalScore"
          :feedback="feedback"
          :decision="decision"
          @update:final-score="finalScore = $event"
          @update:feedback="feedback = $event"
          @update:decision="decision = $event"
        />
      </div>
      <GradingActionBar
        :can-previous="Boolean(workspace.navigation.previousId)"
        :can-confirm="canConfirm"
        :action-pending="store.actionPending"
        @previous="previous"
        @review="markForReview"
        @confirm="confirmAndNext"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GradingActionBar from '@/features/teacher-grading-v2/components/GradingActionBar.vue'
import GradingWorkspaceHeader from '@/features/teacher-grading-v2/components/GradingWorkspaceHeader.vue'
import RubricEvidencePanel from '@/features/teacher-grading-v2/components/RubricEvidencePanel.vue'
import SubmissionQueue from '@/features/teacher-grading-v2/components/SubmissionQueue.vue'
import SubmissionWorkViewer from '@/features/teacher-grading-v2/components/SubmissionWorkViewer.vue'
import type { WorkspaceFilter } from '@/features/teacher-grading-v2/contracts'
import { useGradingWorkspaceStore } from '@/stores/teacher/gradingWorkspace'

defineOptions({ name: 'TeacherGradingV2View' })

const route = useRoute()
const router = useRouter()
const store = useGradingWorkspaceStore()
const finalScore = ref<number | null>(null)
const feedback = ref('')
const decision = ref<'accept' | 'override'>('accept')
const fileUrl = ref('')
const fileLoading = ref(false)
const fileError = ref('')
const notice = ref('')
const workspace = computed(() => store.workspace)
const canConfirm = computed(() => Boolean(workspace.value?.selected?.suggestion?.suggestionId) && !store.actionPending)

function queryString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}
function queryItemNo(value: unknown): number | undefined {
  const parsed = Number(queryString(value))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}
function queryFilter(value: unknown): WorkspaceFilter | undefined {
  const parsed = queryString(value)
  return parsed === 'all' || parsed === 'ungraded' || parsed === 'review' || parsed === 'confirmed' ? parsed : undefined
}
function revokeFile() { if (fileUrl.value) URL.revokeObjectURL(fileUrl.value); fileUrl.value = '' }

async function loadFromRoute() {
  await store.load({
    classId: queryString(route.query.class_id),
    assignmentId: queryString(route.query.assignment_id),
    itemNo: queryItemNo(route.query.item_no),
    status: queryFilter(route.query.status),
    submissionItemId: queryString(route.query.submission_item_id),
  })
}
async function select(submissionItemId: string) { await store.select(submissionItemId) }
async function setFilter(status: WorkspaceFilter) {
  await router.replace({ query: { ...route.query, status, submission_item_id: undefined } })
  await store.setFilter(status)
}
async function previous() { await store.previous() }
async function markForReview() {
  try { await store.markForReview(); notice.value = '已标记为稍后复看；尚未写入正式成绩。' }
  catch { notice.value = '' }
}
async function confirmAndNext() {
  if (finalScore.value === null || !Number.isFinite(finalScore.value)) { notice.value = '请先填写有效的最终得分。'; return }
  try {
    await store.confirmAndNext({ decision: decision.value, finalScore: finalScore.value, feedback: feedback.value })
    notice.value = '教师确认已写入，已切换至下一份作答。'
  } catch { notice.value = '' }
}
async function loadFile() {
  const selected = workspace.value?.selected
  if (!selected?.work.fileId) return
  revokeFile(); fileLoading.value = true; fileError.value = ''
  try { fileUrl.value = URL.createObjectURL(await store.loadFile(selected.submissionItemId)) }
  catch { fileError.value = '原始文件暂时不可用，可重试或标记复看。' }
  finally { fileLoading.value = false }
}

watch(() => workspace.value?.selected, (selected) => {
  revokeFile(); fileError.value = ''
  finalScore.value = selected?.confirmedDecision?.finalScore ?? selected?.suggestion?.proposedScore ?? null
  feedback.value = selected?.confirmedDecision?.feedback ?? ''
  decision.value = selected?.confirmedDecision?.decision === 'accepted' ? 'accept' : 'override'
  if (selected?.work.fileId) void loadFile()
}, { immediate: true })
watch(() => workspace.value?.selected?.submissionItemId, (submissionItemId) => {
  if (!submissionItemId || route.query.submission_item_id === submissionItemId) return
  void router.replace({ query: { ...route.query, submission_item_id: submissionItemId } })
})
onMounted(() => { if (!workspace.value) void loadFromRoute() })
onUnmounted(revokeFile)
</script>

<style scoped>
.grading-v2 { box-sizing:border-box; height:calc(100vh - 68px); max-width:1600px; margin:0 auto; padding:24px; color:#1c304a; }
.grading-v2__workspace { display:flex; height:100%; flex-direction:column; overflow:hidden; border:1px solid #cdd9e6; border-radius:16px; background:#fff; box-shadow:0 12px 32px rgba(28,59,92,.12); }
.grading-v2__body { display:grid; flex:1; min-height:0; overflow:hidden; grid-template-columns:minmax(184px,.75fr) minmax(410px,1.9fr) minmax(280px,1fr); }
.grading-v2__state { max-width:600px; margin:80px auto; padding:28px; border:1px solid #d7e2ed; border-radius:14px; background:#fff; color:#597086; line-height:1.7; text-align:center; }
.grading-v2__state h1 { margin:0 0 8px; color:#1c3452; font-size:21px; }
.grading-v2__state p { margin:0 0 16px; }
.grading-v2__state a { color:#1767a8; font-weight:800; }
.grading-v2__state--error, .grading-v2__error { color:#8d2533; }
.grading-v2__notice, .grading-v2__error { margin:0; padding:9px 18px; background:#edf7ff; color:#295f8d; font-size:13px; }
.grading-v2__error { background:#fff0f2; }
@media (max-width: 920px) { .grading-v2 { height:auto; min-height:calc(100vh - 68px); padding:14px; } .grading-v2__workspace { height:auto; } .grading-v2__body { display:grid; overflow:visible; grid-template-columns:1fr; } }
</style>
