<template>
  <section class="tdr-ws" :aria-label="'批改'">
    <header class="tdr-ws-head">
      <h1>批改</h1>
      <p class="tdr-ws-desc">队列区分未处理、低置信度与已确认；AI 建议不得伪装成正式分数。</p>
    </header>

    <div class="tseg" role="group" aria-label="批改队列筛选">
      <button type="button" :class="{ active: tab === 'unprocessed' }" @click="tab = 'unprocessed'">未处理</button>
      <button type="button" :class="{ active: tab === 'low_confidence' }" @click="tab = 'low_confidence'">低置信度</button>
      <button type="button" :class="{ active: tab === 'confirmed' }" @click="tab = 'confirmed'">已确认</button>
    </div>

    <div v-if="store.loading" class="tdr-skeleton" style="height: 120px"></div>
    <div v-else-if="!filtered.length" class="tdr-card"><p class="tcard-empty muted">该队列暂无待处理项。</p></div>
    <div v-else class="tdr-ws-grid">
      <div v-for="item in filtered" :key="item.submission_item_id" class="tlist-item tcard" style="cursor:pointer" @click="open(item)">
        <div class="tlist-main">
          <span class="tlist-title">{{ item.student_label }}</span>
          <span class="tlist-meta">置信度 {{ Math.round((item.confidence ?? 0) * 100) }}%</span>
        </div>
        <ArtifactStatusBadge :status="item.status" />
      </div>
    </div>

    <div v-if="store.detail" class="tdr-card tcard">
      <div class="tdr-ws-h-row">
        <h3 class="tdr-ws-h">批改详情 · {{ store.detail.student_label }}</h3>
        <button class="tdr-btn slim" type="button" @click="closeDetail">关闭</button>
      </div>
      <p style="margin:0"><strong>学生原答：</strong>{{ store.detail.original_answer }}</p>
      <p style="margin:0"><strong>评分标准：</strong>{{ store.detail.scoring_standard }}</p>
      <div v-if="needsReview" class="tdr-banner warn">OCR 不清或低置信度，请人工复核。</div>
      <div v-if="store.detail.suggestion" class="tq">
        <div class="tq-head"><strong>AI 建议</strong><span class="tdr-badge" :class="store.detail.suggestion.decision">{{ scoreText }}</span></div>
        <p style="margin:0">建议分：{{ store.detail.suggestion.suggestion_score ?? '—' }} 分 · 置信度 {{ Math.round(store.detail.suggestion.confidence * 100) }}%</p>
        <p class="muted" style="margin:0">{{ store.detail.suggestion.evidence }}</p>
      </div>
      <div class="tfrm-row">
        <div class="tfrm-field"><label for="g-score">正式分数</label><input id="g-score" v-model.number="finalScore" type="number" min="0" /></div>
        <div class="tfrm-field"><label for="g-fb">教师评语</label><input id="g-fb" v-model="feedback" /></div>
      </div>
      <div class="tfrm-actions">
        <button class="tdr-btn primary" type="button" @click="accept">接受建议</button>
        <button class="tdr-btn" type="button" @click="override">按我的分数确认</button>
      </div>
      <p v-if="store.error" class="tdr-banner err">{{ store.error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useGradingStore } from '@/stores/teacher/grading'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import ArtifactStatusBadge from '@/components/teacher/ArtifactStatusBadge.vue'
import type { GradingQueueItem } from '@/types/teacher'

const store = useGradingStore()
const { confirm } = useConfirm()
const toast = useToastStore()

const tab = ref<'unprocessed' | 'low_confidence' | 'confirmed'>('unprocessed')
const finalScore = ref<number | null>(null)
const feedback = ref('')

const filtered = computed(() => store.queue.filter((item) => item.status === tab.value))
const needsReview = computed<boolean>(() => !!store.detail && (store.detail.confidence < 0.6 || store.detail.status === 'low_confidence'))
const scoreText = computed(() => (store.detail?.suggestion?.decision === 'overridden' ? '已覆盖' : store.detail?.suggestion?.decision === 'accepted' ? '已接受' : '待确认'))

function open(item: GradingQueueItem) {
  store.fetchItem(item.submission_item_id)
  finalScore.value = store.detail?.suggestion?.suggestion_score ?? null
}

function closeDetail() { store.detail = null }

async function accept() {
  if (!store.detail) return
  const ok = await confirm({ title: '接受 AI 建议', message: '将把 AI 建议分作为正式分数写入，是否继续？', confirmText: '接受' })
  if (!ok) return
  try {
    await store.confirm(store.detail.submission_item_id, 'accept', store.detail.suggestion?.suggestion_score ?? null, feedback.value)
    toast.success('已接受并记为正式分')
    refreshQueue()
  } catch { toast.error('确认失败') }
}

async function override() {
  if (!store.detail || finalScore.value == null) { toast.info('请先填写正式分数'); return }
  const ok = await confirm({ title: '按个人判定确认', message: `将以 ${finalScore.value} 分覆盖 AI 建议作为正式结果，是否继续？`, confirmText: '确认' })
  if (!ok) return
  try {
    await store.confirm(store.detail.submission_item_id, 'override', finalScore.value, feedback.value)
    toast.success('已确认正式结果')
    refreshQueue()
  } catch { toast.error('确认失败') }
}

function refreshQueue() { store.fetchQueue(); store.detail = null }
onMounted(() => { store.fetchQueue() })
</script>