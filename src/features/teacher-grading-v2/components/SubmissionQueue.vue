<template>
  <aside class="submission-queue" data-grading-region="queue" aria-label="匿名作答队列">
    <div class="submission-queue__head">
      <div>
        <p>作答队列</p>
        <small>按本题连续批改</small>
      </div>
      <span>{{ entries.length }}</span>
    </div>
    <ol class="submission-queue__list">
      <li v-for="entry in entries" :key="entry.submissionItemId">
        <button
          type="button"
          :class="{ 'is-selected': entry.submissionItemId === selectedId }"
          :aria-current="entry.submissionItemId === selectedId ? 'true' : undefined"
          @click="$emit('select', entry.submissionItemId)"
        >
          <span class="submission-queue__label">{{ entry.anonymousLabel }}</span>
          <span class="submission-queue__state" :data-state="entry.state">{{ stateLabel(entry.state, entry.manualReview) }}</span>
        </button>
      </li>
    </ol>
  </aside>
</template>

<script setup lang="ts">
import type { SubmissionQueueEntry } from '../contracts'

defineProps<{ entries: SubmissionQueueEntry[]; selectedId: string | null }>()
defineEmits<{ select: [submissionItemId: string] }>()

function stateLabel(state: SubmissionQueueEntry['state'], manualReview: boolean): string {
  if (state === 'confirmed') return '已确认'
  if (manualReview || state === 'review') return '待复看'
  return '待批改'
}
</script>

<style scoped>
.submission-queue { min-width:0; background:#f5f8fc; border-right:1px solid #dbe4ef; }
.submission-queue__head { display:flex; align-items:center; justify-content:space-between; padding:18px 17px 14px; border-bottom:1px solid #dbe4ef; }
.submission-queue__head p { margin:0; color:#162d4b; font-size:14px; font-weight:800; }
.submission-queue__head small { color:#63738a; font-size:12px; }
.submission-queue__head > span { display:grid; place-items:center; width:24px; height:24px; border-radius:50%; background:#dcecff; color:#174f88; font-size:12px; font-weight:800; }
.submission-queue__list { list-style:none; padding:8px; margin:0; display:grid; gap:5px; overflow:auto; max-height:calc(100vh - 286px); }
.submission-queue__list button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:8px; border:1px solid transparent; border-radius:9px; padding:11px 10px; background:transparent; color:#263b57; text-align:left; cursor:pointer; font:inherit; }
.submission-queue__list button:hover { background:#e9f1fb; }
.submission-queue__list button.is-selected { border-color:#78a9de; background:#fff; box-shadow:0 2px 6px rgba(25,63,102,.08); }
.submission-queue__label { font-weight:700; font-size:13px; }
.submission-queue__state { flex-shrink:0; padding:3px 6px; border-radius:999px; font-size:11px; font-weight:700; color:#657388; background:#e8edf4; }
.submission-queue__state[data-state="review"] { color:#8a5510; background:#fff0c9; }
.submission-queue__state[data-state="confirmed"] { color:#256342; background:#daf3e4; }
@media (max-width: 920px) { .submission-queue { border-right:0; border-bottom:1px solid #dbe4ef; } .submission-queue__list { grid-template-columns:repeat(auto-fit,minmax(135px,1fr)); max-height:168px; } }
</style>
