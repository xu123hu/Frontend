<script setup lang="ts">
/**
 * 修订时间线（CR-F4-04 / 06 §7 步骤 7）。
 * - 作者模式：提交修订（summary + diff 摘要）。
 * - 评委模式：查看差异/原问题/证据 + 复核（approved / needs_more_work + 备注）。
 * 注：一期 diff 为文本摘要展示（结构化 diff 视图待后端版线端点冻结）。
 */
import { reactive, ref } from 'vue';
import { CheckCircle2, Clock, CircleX } from 'lucide-vue-next';
import { useReviewRevision } from '@features/review/queries';
import type { Revision, ReviewMode } from '@entities/review/types';

const props = defineProps<{ paperId: string; revisions: Revision[]; mode: ReviewMode }>();

const reviewMutation = useReviewRevision(props.paperId);
const notes = reactive<Record<string, string>>({});
const submitting = ref<string | null>(null);

function statusIcon(status: Revision['status']) {
  switch (status) {
    case 'approved':
      return CheckCircle2;
    case 'needs_more_work':
      return CircleX;
    default:
      return Clock;
  }
}
function statusText(status: Revision['status']): string {
  switch (status) {
    case 'approved':
      return '复核通过';
    case 'needs_more_work':
      return '需继续修改';
    default:
      return '待复核';
  }
}

async function decide(revision: Revision, status: 'approved' | 'needs_more_work'): Promise<void> {
  submitting.value = revision.id;
  try {
    await reviewMutation.mutateAsync({ revisionId: revision.id, status, reviewerNote: notes[revision.id] ?? '' });
  } finally {
    submitting.value = null;
  }
}
</script>

<template>
  <ol
    class="revisions"
    aria-label="修订时间线"
  >
    <li
      v-for="revision in revisions"
      :key="revision.id"
      class="revision-card"
      :data-status="revision.status"
    >
      <header class="rev-head">
        <span class="version-chip">v{{ revision.version }}</span>
        <b>{{ revision.summary }}</b>
        <span class="rev-status">
          <component
            :is="statusIcon(revision.status)"
            :size="14"
            aria-hidden="true"
          />
          {{ statusText(revision.status) }}
        </span>
      </header>
      <p class="diff mono">
        {{ revision.diff }}
      </p>
      <p
        v-if="revision.reviewer_note"
        class="note"
      >
        评委备注：{{ revision.reviewer_note }}
      </p>

      <!-- 评委复核（仅 pending_review 且评委模式） -->
      <div
        v-if="mode === 'reviewer' && revision.status === 'pending_review'"
        class="review-actions"
      >
        <label :for="`note-${revision.id}`">复核备注</label>
        <input
          :id="`note-${revision.id}`"
          v-model="notes[revision.id]"
          type="text"
          placeholder="复核意见（可选）"
        >
        <div class="row">
          <button
            class="btn ok"
            type="button"
            :disabled="submitting === revision.id"
            @click="decide(revision, 'approved')"
          >
            复核通过
          </button>
          <button
            class="btn danger"
            type="button"
            :disabled="submitting === revision.id"
            @click="decide(revision, 'needs_more_work')"
          >
            需继续修改
          </button>
        </div>
      </div>
    </li>
    <li
      v-if="revisions.length === 0"
      class="empty"
    >
      暂无修订记录。
    </li>
  </ol>
</template>

<style scoped>
.revisions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.revision-card {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}
.rev-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.version-chip {
  display: inline-grid;
  place-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 800;
  flex-shrink: 0;
}
.rev-head b {
  font-size: var(--font-size-sm);
}
.rev-status {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
[data-status='approved'] .rev-status { color: var(--success); }
[data-status='needs_more_work'] .rev-status { color: var(--danger); }
[data-status='pending_review'] .rev-status { color: var(--muted); }
.diff {
  margin: 0;
  font-size: var(--font-size-xs);
  background: var(--subtle-bg);
  border-radius: 7px;
  padding: 8px 10px;
  line-height: 1.55;
  word-break: break-word;
}
.note {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.review-actions {
  border-top: 1px dashed var(--border);
  padding-top: 8px;
  display: grid;
  gap: 6px;
}
.review-actions label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
.review-actions input {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 10px;
  font-size: var(--font-size-sm);
  background: var(--surface);
  color: var(--text);
}
.row {
  display: flex;
  gap: 7px;
}
.btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  padding: 5px 11px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.btn.ok { color: var(--success); border-color: #bfdfd0; }
.btn.danger { color: var(--danger); border-color: #e6c0bc; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.empty {
  font-size: var(--font-size-sm);
  color: var(--muted);
}
.mono {
  font-family: var(--mono);
}
</style>
