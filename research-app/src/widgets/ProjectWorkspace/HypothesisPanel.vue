<script setup lang="ts">
/**
 * 假设与验证面板（S3 假设证据链的真数据面）。
 * AI 真生成（Spark）→ platform.hypotheses 落库 → 人工确认/驳回 → 一键 L0-L4 真验证。
 * 空态引导生成；错误态给原因+重试（无空页铁律）。
 */
import { computed, reactive, ref } from 'vue';
import { AppButton, AppChip } from '@shared/ui';
import EmptyState from '@shared/ui/EmptyState.vue';
import { apiRequest } from '@app/api/client';
import {
  useDecideHypothesis,
  useGenerateHypotheses,
  useProjectHypotheses,
} from '@features/steward/queries';
import VerifyLayerList from '@widgets/VerifyLayerList/VerifyLayerList.vue';
import type { VerificationLayer } from '@entities/review/types';

const props = defineProps<{ projectId: string }>();

const hypothesesQuery = useProjectHypotheses(() => props.projectId);
const hypotheses = computed(() => hypothesesQuery.data.value ?? []);
const generateMutation = useGenerateHypotheses();
const decideMutation = useDecideHypothesis();
const generating = computed(() => generateMutation.isPending.value);
const generateError = computed(() => generateMutation.error.value?.message ?? '');

interface HypothesisCheck {
  layers: VerificationLayer[];
  verdict: { all_passed: boolean; has_counterexample: boolean; any_unverifiable: boolean };
  canonical_hash: string;
}
const verifyState = reactive<Record<string, HypothesisCheck | 'loading' | 'error'>>({});
const openId = ref('');

async function verifyHypothesis(id: string, statement: string): Promise<void> {
  openId.value = id;
  verifyState[id] = 'loading';
  try {
    const res = await apiRequest<HypothesisCheck>('/verification/check', {
      method: 'POST',
      body: { expression: statement, assumptions: [] },
    });
    verifyState[id] = res.data;
  } catch {
    verifyState[id] = 'error';
  }
}
function verifyResult(id: string): HypothesisCheck | null {
  const state = verifyState[id];
  return state && state !== 'loading' && state !== 'error' ? state : null;
}
function verifyLayers(id: string): VerificationLayer[] {
  const result = verifyResult(id);
  return result ? result.layers : [];
}
function verifySummary(id: string): string {
  const result = verifyResult(id);
  if (!result) return '';
  const parts = [
    `全通过 ${result.verdict.all_passed ? '是' : '否'}`,
    `存在反例 ${result.verdict.has_counterexample ? '是' : '否'}`,
    `存在不可判定层 ${result.verdict.any_unverifiable ? '是' : '否'}`,
    `hash ${result.canonical_hash.slice(0, 12)}…`,
  ];
  return parts.join(' · ');
}
function confirmHypothesis(id: string, approved: boolean): void {
  void decideMutation.mutateAsync({ hypothesisId: id, approved }).catch(() => undefined);
}
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <span class="panel-title">候选假设</span>
      <AppChip
        tone="warning"
        size="sm"
      >
        AI生成·待确认
      </AppChip>
      <AppButton
        variant="primary"
        size="sm"
        :loading="generating"
        :disabled="generating"
        @click="generateMutation.mutate(props.projectId)"
      >
        {{ generating ? 'AI 生成中…' : 'AI 生成候选假设' }}
      </AppButton>
    </div>
    <p
      v-if="generateError"
      class="hint"
      style="color: var(--ailp-error-500);"
    >
      {{ generateError }}
    </p>

    <ul
      v-if="hypotheses.length > 0"
      class="hyp-list"
    >
      <li
        v-for="h in hypotheses"
        :key="h.id"
        class="hyp-item"
      >
        <div class="hyp-row">
          <AppChip
            tone="warning"
            size="sm"
            aria-label="假设标记"
          >
            假设
          </AppChip>
          <AppChip
            v-if="h.source === 'ai_generated' && h.confirmed === null"
            tone="neutral"
            size="sm"
          >
            待确认
          </AppChip>
          <AppChip
            v-else-if="h.confirmed === true"
            tone="success"
            size="sm"
          >
            已确认
          </AppChip>
          <AppChip
            v-else-if="h.confirmed === false"
            tone="danger"
            size="sm"
          >
            已驳回
          </AppChip>
          <span class="hyp-text">{{ h.statement }}</span>
        </div>
        <p
          v-if="h.rationale"
          class="hint"
        >
          {{ h.rationale }}
        </p>
        <div class="hyp-actions">
          <template v-if="h.confirmed === null">
            <AppButton
              variant="ghost"
              size="sm"
              :disabled="decideMutation.isPending.value"
              @click="confirmHypothesis(h.id, true)"
            >
              确认
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              :disabled="decideMutation.isPending.value"
              @click="confirmHypothesis(h.id, false)"
            >
              驳回
            </AppButton>
          </template>
          <AppButton
            variant="ghost"
            size="sm"
            :disabled="verifyState[h.id] === 'loading'"
            @click="verifyHypothesis(h.id, h.statement)"
          >
            {{ verifyState[h.id] === 'loading' ? '验证中…' : 'L0-L4 验证' }}
          </AppButton>
        </div>
        <div
          v-if="verifyResult(h.id)"
          class="hyp-verify"
        >
          <VerifyLayerList :layers="verifyLayers(h.id)" />
          <p class="hint">
            {{ verifySummary(h.id) }} · 验证由确定性引擎给出，独立于生成模型。
          </p>
        </div>
        <p
          v-else-if="verifyState[h.id] === 'error'"
          class="hint"
          style="color: var(--ailp-error-500);"
        >
          验证请求失败，请重试。
        </p>
      </li>
    </ul>

    <p
      v-else-if="hypothesesQuery.isPending.value"
      class="hint"
    >
      假设加载中…
    </p>
    <p
      v-else-if="hypothesesQuery.isError.value"
      class="hint"
      style="color: var(--ailp-error-500);"
    >
      假设加载失败：{{ hypothesesQuery.error.value?.message }}
    </p>
    <EmptyState
      v-else
      title="还没有候选假设"
      hint="点击右上角「AI 生成候选假设」，管家基于研究问题真模型生成并入库。"
    />
  </div>
</template>

<style scoped>
.panel-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-right: auto;
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 4px 0;
}
.hyp-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}
.hyp-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.hyp-item:last-child {
  border-bottom: none;
}
.hyp-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  flex-wrap: wrap;
}
.hyp-text {
  color: var(--text);
  font-size: 14px;
}
.hyp-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.hyp-verify {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--ailp-gray-50);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
</style>
