<template>
  <div id="page-grading">
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>批改作业</h1>
        <p>系统只提供预批改建议；教师确认后才写入正式成绩并同步给学生。</p>
      </div>
      <span class="t-tag blue">待处理 {{ pendingCount }} 份</span>
    </header>

    <div v-if="store.error" class="t-card" style="color: var(--t-red); margin-bottom: 16px;">
      {{ store.error }}
    </div>
    <div v-if="store.loading && !store.detail" class="t-card">正在加载真实批改队列…</div>
    <div v-else-if="!store.queue.length" class="t-card">
      <h2 style="margin-top: 0;">当前没有待批作答</h2>
      <p class="t-muted">学生提交已发布的试卷或作业后，待批题目会出现在这里。</p>
      <button class="t-btn primary" type="button" @click="router.push('/teacher/assign')">去发布试卷</button>
    </div>

    <div v-else class="t-grade-layout">
      <section class="t-answer-panel">
        <div class="t-section-title">
          <div>
            <h2>学生原始作答</h2>
            <div class="sub">{{ store.detail?.student_label || '请选择待批记录' }}</div>
          </div>
          <select v-model="selectedId" class="t-input" style="max-width: 220px;" @change="loadSelected">
            <option v-for="item in store.queue" :key="item.submission_item_id" :value="item.submission_item_id">
              {{ item.student_label }} · {{ statusText(item.status) }}
            </option>
          </select>
        </div>

        <div v-if="store.detail" class="t-paper">
          <div class="qtitle">评分标准</div>
          <p>{{ store.detail.scoring_standard }}</p>
          <div class="qtitle" style="margin-top: 24px;">作答内容</div>
          <p style="white-space: pre-wrap; line-height: 1.8;">{{ store.detail.original_answer || '学生未填写文本答案' }}</p>
          <div v-if="store.detail.file_id" class="t-card soft" style="margin-top: 20px;">
            <b>本题包含学生拍照原稿</b>
            <p class="t-small t-muted" style="margin-bottom: 0;">文件编号：{{ store.detail.file_id }}。评分建议已按低置信度转人工复核，不会自动记分。</p>
            <img v-if="photoUrl" :src="photoUrl" alt="学生拍照原稿" style="display: block; max-width: 100%; max-height: 640px; margin-top: 12px; border-radius: 8px; object-fit: contain;" />
            <p v-else class="t-small t-muted">正在加载原始照片…</p>
          </div>
        </div>
      </section>

      <aside v-if="store.detail" class="t-grade-side">
        <div class="t-card">
          <div class="t-section-title">
            <div>
              <h2>预批改建议</h2>
              <div class="sub">建议由评分标准分步核对生成，教师复核后生效</div>
            </div>
            <span class="t-tag" :class="store.detail.suggestion?.review_needed ? 'amber' : 'green'">
              {{ store.detail.suggestion?.review_needed ? '需要人工复核' : '可复核确认' }}
            </span>
          </div>
          <div class="t-scorebox">
            <span class="score">{{ suggestedScore }}</span>
            <span class="full">分（建议）</span>
          </div>
          <p class="t-small t-muted">{{ store.detail.suggestion?.evidence || '暂无自动评分依据，请人工评分。' }}</p>
        </div>

        <div class="t-card">
          <div class="t-section-title"><h2>教师最终确认</h2></div>
          <label class="t-small t-strong" for="final-score">最终得分</label>
          <input id="final-score" v-model.number="finalScore" class="t-input" type="number" min="0" step="0.5" style="width: 100%; margin: 8px 0 14px;" />
          <label class="t-small t-strong" for="feedback">反馈给学生</label>
          <textarea id="feedback" v-model="feedback" class="t-input" rows="4" style="width: 100%; margin: 8px 0 14px; resize: vertical;" placeholder="写下可执行的改进建议"></textarea>
          <div class="t-grade-buttons">
            <button class="t-btn primary lg" type="button" :disabled="store.confirming || !canConfirm" @click="confirmAccept">
              {{ store.confirming ? '正在写入…' : '接受建议并确认' }}
            </button>
            <button class="t-btn lg" type="button" :disabled="store.confirming || !canConfirm" @click="confirmOverride">
              按当前分数改分并确认
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authHeaders } from '@/api/client'
import { useGradingStore } from '@/stores/teacher/grading'
import { useTeacherContextStore } from '@/stores/teacher/context'

const router = useRouter()
const route = useRoute()
const store = useGradingStore()
const context = useTeacherContextStore()
const showToast = inject<(msg: string) => void>('showToast', () => {})
const selectedId = ref('')
const finalScore = ref<number | null>(null)
const feedback = ref('')
const photoUrl = ref('')

const pendingCount = computed(() => store.queue.filter((item) => item.status !== 'confirmed').length)
const suggestedScore = computed(() => store.detail?.suggestion?.suggestion_score ?? '—')
const canConfirm = computed(() => Boolean(store.detail?.suggestion?.suggestion_id))

function normalizeQueryId(value: unknown): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

/** URL 与当前份同步：`submission_item_id` 进入 query，刷新/分享/直接打开回到同一份 */
watch(selectedId, (id) => {
  const query = { ...route.query }
  if (id) query.submission_item_id = id
  else delete query.submission_item_id
  router.replace({ query })
})

watch(() => store.detail, (detail) => {
  finalScore.value = detail?.suggestion?.suggestion_score ?? detail?.teacher_final_score ?? null
  feedback.value = detail?.suggestion?.teacher_feedback || ''
})

watch(() => store.detail?.submission_item_id, async (submissionItemId) => {
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  photoUrl.value = ''
  if (!submissionItemId || !store.detail?.file_id) return
  try {
    const response = await fetch(`/api/teacher/grading/${submissionItemId}/file`, {
      headers: authHeaders() as HeadersInit,
    })
    if (response.ok) photoUrl.value = URL.createObjectURL(await response.blob())
  } catch {
    photoUrl.value = ''
  }
})

function statusText(status: string) {
  return status === 'confirmed' ? '已确认' : status === 'low_confidence' ? '待人工复核' : '待处理'
}

async function loadSelected() {
  if (selectedId.value) await store.fetchItem(selectedId.value)
}

async function refreshAndAdvance() {
  const previous = selectedId.value
  await store.fetchQueue(context.classId || undefined)
  const next = store.queue.find((item) => item.status !== 'confirmed' && item.submission_item_id !== previous)
    || store.queue.find((item) => item.submission_item_id !== previous)
  if (next) {
    selectedId.value = next.submission_item_id
    await loadSelected()
  } else {
    store.detail = null
    selectedId.value = ''
  }
}

async function confirmAccept() {
  if (!store.detail || !canConfirm.value) return
  try {
    await store.confirm(store.detail.submission_item_id, 'accept', null, feedback.value || null)
    showToast('已确认评分，学生端可查看结果')
    await refreshAndAdvance()
  } catch (error: any) {
    showToast(error?.message || '确认失败')
  }
}

async function confirmOverride() {
  if (!store.detail || finalScore.value === null || !Number.isFinite(Number(finalScore.value))) {
    showToast('请填写有效的最终得分')
    return
  }
  try {
    await store.confirm(store.detail.submission_item_id, 'override', Number(finalScore.value), feedback.value || null)
    showToast('改分已确认，学生端可查看结果')
    await refreshAndAdvance()
  } catch (error: any) {
    showToast(error?.message || '确认失败')
  }
}

onMounted(async () => {
  await store.fetchQueue(context.classId || undefined)
  const requested = normalizeQueryId(route.query.submission_item_id)
  const requestedItem = requested ? store.queue.find((item) => item.submission_item_id === requested) : null
  const first = requestedItem
    || store.queue.find((item) => item.status !== 'confirmed')
    || store.queue[0]
  if (first) {
    selectedId.value = first.submission_item_id
    await loadSelected()
  }
  window.addEventListener('keydown', onKeydown)
})

/** RC-05-4 #4：Enter = 确认并推进下一份（多行反馈框保持换行，不误触跳转） */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement | null
  if (target?.tagName === 'TEXTAREA') return
  if (!canConfirm.value || store.confirming) return
  e.preventDefault()
  void confirmAccept()
}

onUnmounted(() => {
  if (photoUrl.value) URL.revokeObjectURL(photoUrl.value)
  window.removeEventListener('keydown', onKeydown)
})
</script>
