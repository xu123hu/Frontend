<script setup lang="ts">
/**
 * 评审工作区（作者 / 评委双视图，06 §7 步骤 1-7）。
 * 权限由后端裁剪：作者可见 author_suggestions，评委视图不渲染该字段；
 * 主张修正仅作者；修订复核仅评委。
 */
import { computed } from 'vue';
import { useClaims, useRevisions, useReviewPaper } from '@features/review/queries';
import ClaimReviewList from '@widgets/ClaimReviewList/ClaimReviewList.vue';
import RevisionTimeline from '@widgets/RevisionTimeline/RevisionTimeline.vue';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import EmptyState from '@shared/ui/EmptyState.vue';
import { ApiError } from '@app/api/client';

const props = defineProps<{ paperId: string; mode: 'author' | 'reviewer' }>();

const paperQuery = useReviewPaper(props.paperId);
const claimsQuery = useClaims(props.paperId);
const revisionsQuery = useRevisions(props.paperId);

const errorIsNotFound = computed(() => paperQuery.error.value instanceof ApiError && paperQuery.error.value.kind === 'not_found');

const VERDICT_LABELS: Record<string, string> = {
  in_review: '评审中',
  needs_revision: '需修订',
  accepted: '已接受',
  rejected: '已拒绝',
};
const verdict = computed(() => (paperQuery.data.value ? VERDICT_LABELS[paperQuery.data.value.verdict] ?? paperQuery.data.value.verdict : ''));
</script>

<template>
  <div
    class="workspace"
    :data-mode="mode"
  >
    <Skeleton
      v-if="paperQuery.isPending.value"
      label="评审工作区加载中"
    />

    <Boundary
      v-else-if="paperQuery.isError.value"
      :tone="errorIsNotFound ? 'warning' : 'danger'"
      title="无法打开评审工作区"
    >
      {{ paperQuery.error.value?.message }}
    </Boundary>

    <template v-else-if="paperQuery.data.value">
      <header class="paper-head">
        <div>
          <h2>{{ paperQuery.data.value.title }}</h2>
          <p class="meta">
            批次 {{ paperQuery.data.value.id }} · 更新于 {{ new Date(paperQuery.data.value.updated_at).toLocaleString('zh-CN') }}
          </p>
        </div>
        <span
          class="verdict"
          :data-verdict="paperQuery.data.value.verdict"
        >{{ verdict }}</span>
      </header>

      <!-- 作者可见建议（评委视图不渲染：字段按 mode 裁剪，TC-F05-01） -->
      <section
        v-if="mode === 'author' && paperQuery.data.value.author_suggestions"
        class="panel suggestions"
        aria-label="作者可见建议"
      >
        <h3>评审建议（仅作者可见）</h3>
        <ul>
          <li
            v-for="(s, i) in paperQuery.data.value.author_suggestions"
            :key="i"
          >
            {{ s }}
          </li>
        </ul>
      </section>

      <section
        class="panel"
        aria-label="主张提取与分层验证"
      >
        <h3>待审主张（公式 / 定理 / 前提）</h3>
        <p class="panel-desc">
          提取自论文的待审主张；作者可修正表述，验证按 L0-L4 与 Lean 三状态独立分项（永不合并为「论文正确」）。
        </p>
        <ClaimReviewList
          v-if="claimsQuery.data.value && claimsQuery.data.value.length > 0"
          :paper-id="paperId"
          :claims="claimsQuery.data.value"
          :mode="mode"
        />
        <EmptyState
          v-else-if="claimsQuery.data.value"
          title="暂无待审主张"
          hint="主张提取由解析服务产出；当前批次未提取到公式/定理/前提。"
        />
      </section>

      <section
        class="panel"
        aria-label="修订与复核"
      >
        <h3>修订时间线{{ mode === 'reviewer' ? '（评委复核）' : '' }}</h3>
        <RevisionTimeline
          :paper-id="paperId"
          :revisions="revisionsQuery.data.value ?? []"
          :mode="mode"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.workspace {
  display: grid;
  gap: 14px;
}
.paper-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}
.paper-head h2 {
  margin: 0 0 4px;
  font-size: var(--font-size-xl);
}
.meta {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.verdict {
  flex-shrink: 0;
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: 800;
  border: 1px solid var(--border);
  color: var(--ink-2);
  background: var(--surface);
}
.verdict[data-verdict='needs_revision'] { border-color: #ead29e; color: var(--warning); background: var(--warning-bg); }
.verdict[data-verdict='accepted'] { border-color: #bfdfd0; color: var(--success); background: var(--success-bg); }
.verdict[data-verdict='rejected'] { border-color: #e6c0bc; color: var(--danger); background: var(--danger-bg); }
.panel {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 16px;
  display: grid;
  gap: 10px;
}
.panel h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}
.panel-desc {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.suggestions ul {
  margin: 0;
  padding-left: 20px;
  font-size: var(--font-size-sm);
  display: grid;
  gap: 4px;
}
</style>
