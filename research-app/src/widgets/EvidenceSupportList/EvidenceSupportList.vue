<script setup lang="ts">
/**
 * 主张证据支持度列表（提示词 §项目工作区「研究问题—假设—证据—验证」一期用列表）。
 * - support_status 四态 + not_verified（EvidenceRecord 冻结语义），图标+文字不只靠颜色。
 * - 详情链接指向评审工作区（分层验证 L0-L4 / Lean 三状态在评审区内）。
 */
import { CheckCircle2, MinusCircle, AlertTriangle, CircleX, CircleDashed, FileText, ExternalLink } from 'lucide-vue-next';
import type { ReviewClaim } from '@entities/review/types';
import { useRouter } from 'vue-router';

defineProps<{ claims: ReviewClaim[] }>();
const router = useRouter();

function goToReview(paperId: string): void {
  router.push({ name: 'review-paper', params: { paperId } });
}

function goToLiterature(claim: ReviewClaim): void {
  // S3: 页码跳转到文献阅读页（如果有page_index）
  if (claim.page_index != null) {
    router.push({ name: 'literature', query: { page: claim.page_index } });
  }
}

const SUPPORT_LABELS: Record<ReviewClaim['evidence_support'], string> = {
  supported: '证据支持',
  partial: '部分支持',
  insufficient_evidence: '证据不足',
  conflicting: '证据冲突',
  not_verified: '未验证',
};

function icon(s: ReviewClaim['evidence_support']) {
  switch (s) {
    case 'supported':
      return CheckCircle2;
    case 'partial':
      return MinusCircle;
    case 'insufficient_evidence':
      return AlertTriangle;
    case 'conflicting':
      return CircleX;
    default:
      return CircleDashed;
  }
}

function kindLabel(kind: ReviewClaim['kind']): string {
  return kind === 'formula' ? '公式' : kind === 'theorem' ? '定理' : '前提';
}
</script>

<template>
  <ul
    class="evidence-list"
    aria-label="主张证据支持度列表"
  >
    <li
      v-for="claim in claims"
      :key="claim.id"
      class="evidence-row"
      :class="{ conflicting: claim.evidence_support === 'conflicting' }"
      :data-support="claim.evidence_support"
    >
      <div class="evidence-main">
        <div class="evidence-top">
          <span class="kind">{{ kindLabel(claim.kind) }}</span>
          <span class="support">
            <component
              :is="icon(claim.evidence_support)"
              :size="13"
              aria-hidden="true"
            />
            {{ SUPPORT_LABELS[claim.evidence_support] }}
          </span>
          <button
            v-if="claim.page_index != null"
            class="page-link"
            type="button"
            @click="goToLiterature(claim)"
          >
            <FileText :size="11" /> p.{{ claim.page_index + 1 }}
          </button>
          <button
            class="review-link"
            type="button"
            @click="goToReview(claim.paper_id)"
          >
            <ExternalLink :size="11" /> 评审详情
          </button>
        </div>
        <span class="statement mono">{{ claim.corrected_statement ?? claim.statement }}</span>
        <p
          v-if="claim.quote"
          class="quote"
        >
          <span class="quote-label">原文引用：</span>{{ claim.quote }}
        </p>
        <p
          v-if="claim.evidence_support === 'conflicting'"
          class="conflict-note"
        >
          ⚠️ 证据冲突：该主张与现有文献证据存在矛盾，建议人工复核。
        </p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.evidence-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.evidence-row {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  background: var(--surface);
}
.evidence-row.conflicting {
  border-color: var(--ailp-error-500);
  background: var(--danger-bg);
}
.evidence-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.evidence-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.page-link, .review-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--ailp-primary-500);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.page-link:hover, .review-link:hover {
  text-decoration: underline;
}
.quote {
  margin: 0;
  font-size: 12px;
  color: var(--ailp-gray-500);
  font-style: italic;
  border-left: 2px solid var(--ailp-gray-200);
  padding-left: 8px;
}
.quote-label {
  font-weight: 600;
  font-style: normal;
}
.conflict-note {
  margin: 0;
  font-size: 12px;
  color: var(--ailp-error-500);
  font-weight: 500;
}
.kind {
  flex-shrink: 0;
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 11px;
  font-weight: 800;
}
.statement {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-xs);
  line-height: 1.5;
  word-break: break-word;
}
.support {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
[data-support='supported'] .support { color: var(--success); }
[data-support='partial'] .support { color: var(--warning); }
[data-support='insufficient_evidence'] .support { color: var(--warning); }
[data-support='conflicting'] .support { color: var(--danger); }
.mono {
  font-family: var(--mono);
}
</style>
