<script setup lang="ts">
/**
 * 主张证据面板（S3 风险排序的真数据面）。
 * 数据来自评审批次主张（useClaims）；无批次/端点未接通时给诚实错误态与出路。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { AppButton } from '@shared/ui';
import EmptyState from '@shared/ui/EmptyState.vue';
import ErrorState from '@shared/ui/AppButton/ErrorState.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import { useClaims, useReviewPapers } from '@features/review/queries';
import EvidenceSupportList from '@widgets/EvidenceSupportList/EvidenceSupportList.vue';

const props = defineProps<{ projectId: string }>();
const router = useRouter();

const papersQuery = useReviewPapers();
const projectPaper = computed(
  () => papersQuery.data.value?.find((p) => p.project_id === props.projectId) ?? papersQuery.data.value?.[0] ?? null,
);
function openReview(): void {
  if (projectPaper.value) {
    void router.push({ name: 'review-paper', params: { paperId: projectPaper.value.id } });
  }
}
const claimsQuery = useClaims(projectPaper.value?.id ?? '');

const RISK_ORDER: Record<string, number> = {
  conflicting: 0,
  insufficient_evidence: 1,
  not_verified: 2,
  partial: 3,
  supported: 4,
};
const sortedClaims = computed(() => {
  const claims = claimsQuery.data.value ?? [];
  return [...claims].sort((a, b) => (RISK_ORDER[a.evidence_support] ?? 99) - (RISK_ORDER[b.evidence_support] ?? 99));
});
const stats = computed(() => {
  const claims = claimsQuery.data.value ?? [];
  return {
    total: claims.length,
    conflicting: claims.filter((c) => c.evidence_support === 'conflicting').length,
    insufficient: claims.filter((c) => c.evidence_support === 'insufficient_evidence').length,
    notVerified: claims.filter((c) => c.evidence_support === 'not_verified').length,
    partial: claims.filter((c) => c.evidence_support === 'partial').length,
    supported: claims.filter((c) => c.evidence_support === 'supported').length,
  };
});
</script>

<template>
  <div class="panel">
    <div class="stats">
      <span
        class="stat"
        style="color: var(--ailp-error-500);"
      >
        冲突 {{ stats.conflicting }}
      </span>
      <span
        class="stat"
        style="color: var(--ailp-warning-500);"
      >
        不足 {{ stats.insufficient }}
      </span>
      <span
        class="stat"
        style="color: var(--ailp-gray-500);"
      >
        未验 {{ stats.notVerified }}
      </span>
      <span
        class="stat"
        style="color: var(--ailp-accent-500);"
      >
        部分 {{ stats.partial }}
      </span>
      <span
        class="stat"
        style="color: var(--ailp-success-500);"
      >
        支持 {{ stats.supported }}
      </span>
      <span class="stat muted">共 {{ stats.total }} 条 · 风险排序</span>
    </div>

    <Skeleton
      v-if="claimsQuery.isPending.value"
      label="主张加载中"
    />
    <ErrorState
      v-else-if="claimsQuery.isError.value"
      title="主张加载失败"
      :reason="claimsQuery.error.value?.message || '服务暂时不可用。'"
      tone="danger"
      retryable
      @retry="claimsQuery.refetch()"
    />
    <EmptyState
      v-else-if="stats.total === 0"
      title="暂无评审批次主张"
      hint="主张来自评审批次（作者提交 → AI 提取 → 分层验证）。评审域后端接通后此处显示真实主张。"
    >
      <AppButton
        v-if="projectPaper"
        variant="secondary"
        size="sm"
        @click="openReview"
      >
        打开评审工作区
      </AppButton>
    </EmptyState>
    <template v-else>
      <EvidenceSupportList :claims="sortedClaims" />
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.stat {
  font-size: 13px;
  font-weight: 600;
}
.stat.muted {
  color: var(--text-muted);
  font-weight: 400;
  margin-left: auto;
}
</style>
