<script setup lang="ts">
/**
 * 评审页（06 §7 步骤 1-7，F4 完成 F0 占位）。
 * - 无 paperId：评审批次列表（进入工作区入口）。
 * - 有 paperId：作者/评委双视图切换（权限由后端裁剪，前端仅渲染可见字段，TC-F05-01）。
 *   mode 持久化到 query（?mode=reviewer 可深链分享）。
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReviewPapers } from '@features/review/queries';
import ReviewWorkspace from '@widgets/ReviewWorkspace/ReviewWorkspace.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import EmptyState from '@shared/ui/EmptyState.vue';

const route = useRoute();
const router = useRouter();
const paperId = computed(() => (typeof route.params.paperId === 'string' ? route.params.paperId : null));
const mode = computed<'author' | 'reviewer'>(() => (route.query.mode === 'reviewer' ? 'reviewer' : 'author'));

const papersQuery = useReviewPapers();

const VERDICT_LABELS: Record<string, string> = {
  in_review: '评审中',
  needs_revision: '需修订',
  accepted: '已接受',
  rejected: '已拒绝',
};


// S10 评审UI：顶部结论摘要 + 风险排序
const RISK_ORDER: Record<string, number> = {
  rejected: 0,
  needs_revision: 1,
  in_review: 2,
  accepted: 3,
};
const paperStats = computed(() => {
  const papers = papersQuery.data.value ?? [];
  return {
    total: papers.length,
    in_review: papers.filter((p) => p.verdict === 'in_review').length,
    needs_revision: papers.filter((p) => p.verdict === 'needs_revision').length,
    accepted: papers.filter((p) => p.verdict === 'accepted').length,
    rejected: papers.filter((p) => p.verdict === 'rejected').length,
  };
});
const sortedPapers = computed(() => {
  const papers = papersQuery.data.value ?? [];
  return [...papers].sort((a, b) => (RISK_ORDER[a.verdict] ?? 99) - (RISK_ORDER[b.verdict] ?? 99));
});
const overallRating = computed(() => {
  const s = paperStats.value;
  if (s.rejected > 0) return { label: '有拒稿风险', color: '#ef4444' };
  if (s.needs_revision > 0) return { label: '需修订', color: '#f59e0b' };
  if (s.in_review > 0) return { label: '评审中', color: '#6366f1' };
  if (s.accepted > 0) return { label: '全部通过', color: '#10b981' };
  return { label: '无数据', color: '#64748b' };
});

function setMode(next: 'author' | 'reviewer'): void {
  if (next === mode.value) return;
  void router.replace({ query: { ...route.query, mode: next === 'author' ? undefined : next } });
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>评审</h1>
        <p>作者投稿前自检与评委论文初审；主张修正、分层验证 L0–L4 与 Lean 三状态分项。</p>
      </div>
      <div
        v-if="paperId"
        class="mode-switch"
        role="tablist"
        aria-label="评审视图切换"
      >
        <button
          type="button"
          role="tab"
          class="mode-btn"
          :class="{ active: mode === 'author' }"
          :aria-selected="mode === 'author'"
          @click="setMode('author')"
        >
          作者视图
        </button>
        <button
          type="button"
          role="tab"
          class="mode-btn"
          :class="{ active: mode === 'reviewer' }"
          :aria-selected="mode === 'reviewer'"
          @click="setMode('reviewer')"
        >
          评委视图
        </button>
      </div>
    </header>

    <!-- S10 顶部结论摘要 -->
    <AppCard
      v-if="papersQuery.data.value && papersQuery.data.value.length > 0"
      class="summary-bar"
    >
      <div class="summary-header">
        <span class="summary-title">结论摘要</span>
        <AppChip :style="{ color: overallRating.color, borderColor: overallRating.color }">
          {{ overallRating.label }}
        </AppChip>
      </div>
      <div class="summary-stats">
        <div class="stat-item">
          <span class="stat-num">{{ paperStats.total }}</span>
          <span class="stat-label">总批次</span>
        </div>
        <div
          class="stat-item"
          style="color:#6366f1"
        >
          <span class="stat-num">{{ paperStats.in_review }}</span>
          <span class="stat-label">评审中</span>
        </div>
        <div
          class="stat-item"
          style="color:#f59e0b"
        >
          <span class="stat-num">{{ paperStats.needs_revision }}</span>
          <span class="stat-label">需修订</span>
        </div>
        <div
          class="stat-item"
          style="color:#10b981"
        >
          <span class="stat-num">{{ paperStats.accepted }}</span>
          <span class="stat-label">已接受</span>
        </div>
        <div
          class="stat-item"
          style="color:#ef4444"
        >
          <span class="stat-num">{{ paperStats.rejected }}</span>
          <span class="stat-label">已拒绝</span>
        </div>
      </div>
      <p class="summary-note">
        风险排序：已拒绝 > 需修订 > 评审中 > 已接受
      </p>
    </AppCard>
    <!-- 批次列表（无 paperId） -->
    <template v-if="!paperId">
      <Skeleton
        v-if="papersQuery.isPending.value"
        label="评审批次加载中"
      />
      <EmptyState
        v-else-if="papersQuery.data.value && papersQuery.data.value.length === 0"
        title="暂无评审批次"
        hint="上传论文并完成解析后，评审批次会在此出现。"
      />
      <ul
        v-else-if="papersQuery.data.value"
        class="paper-list"
        aria-label="评审批次列表"
      >
        <li
          v-for="paper in sortedPapers"
          :key="paper.id"
          class="paper-card"
        >
          <div>
            <RouterLink
              class="paper-link"
              :to="{ name: 'review-paper', params: { paperId: paper.id } }"
            >
              {{ paper.title }}
            </RouterLink>
            <p class="meta">
              批次 {{ paper.id }} · 更新于 {{ new Date(paper.updated_at).toLocaleString('zh-CN') }}
            </p>
          </div>
          <span
            class="verdict"
            :data-verdict="paper.verdict"
          >{{ VERDICT_LABELS[paper.verdict] ?? paper.verdict }}</span>
        </li>
      </ul>
    </template>

    <!-- 工作区（有 paperId）：双视图 -->
    <ReviewWorkspace
      v-else
      :key="`${paperId}-${mode}`"
      :paper-id="paperId"
      :mode="mode"
    />
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
}
.mode-switch {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.mode-btn {
  border: 0;
  background: var(--surface);
  padding: 7px 14px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--ink-2);
  cursor: pointer;
}
.mode-btn + .mode-btn {
  border-left: 1px solid var(--border);
}
.mode-btn.active {
  background: var(--primary);
  color: #fff;
}
.paper-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.paper-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 14px 16px;
}
.paper-link {
  font-weight: 750;
  color: var(--text);
  text-decoration: none;
}
.paper-link:hover {
  color: var(--primary);
}
.meta {
  margin: 4px 0 0;
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

.summary-bar { margin-bottom: 20px; padding: 16px 20px; }
.summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.summary-title { font-size: 16px; font-weight: 600; color: var(--s16-text, #0f172a); }
.summary-stats { display: flex; gap: 24px; margin-bottom: 8px; }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--s16-text-secondary, #64748b); }
.summary-note { margin: 0; font-size: 12px; color: var(--s16-text-secondary, #64748b); }
</style>
