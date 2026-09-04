<script setup lang="ts">
/**
 * 公式保真报告（TC-F03-03/04）：数量/顺序/哈希/引用 key/label-ref 逐项比较。
 * - 永不输出「整篇翻译成功」总标记，除非全部 consistent（06 §5 步骤 6）。
 * - 失败块显式标记（role=alert），原公式保留。
 */
import { computed } from 'vue';
import { Check, X, TriangleAlert, FlaskConical } from 'lucide-vue-next';
import Skeleton from '@shared/ui/Skeleton.vue';
import Boundary from '@shared/ui/Boundary.vue';
import { useFidelityReport } from '@features/translation/queries';

const props = defineProps<{ runId: string | null }>();

const reportQuery = useFidelityReport(() => props.runId);
const report = computed(() => reportQuery.data.value);

const ITEMS = computed(() => {
  const r = report.value;
  if (!r) return [];
  return [
    { label: '公式数量', ok: r.formula_count.consistent, detail: `${r.formula_count.original} → ${r.formula_count.translated}` },
    { label: '公式顺序', ok: r.formula_order.consistent, detail: r.formula_order.consistent ? '一致' : '顺序漂移' },
    { label: '公式哈希', ok: r.formula_hash.consistent, detail: r.formula_hash.consistent ? '一致' : '不一致' },
    { label: '引用 key', ok: r.citation_keys.consistent, detail: r.citation_keys.consistent ? '一致' : '丢失' },
    { label: 'label/ref', ok: r.label_ref.consistent, detail: r.label_ref.consistent ? '一致' : '漂移' },
  ];
});
</script>

<template>
  <div
    class="fidelity"
    aria-label="公式保真报告"
  >
    <p class="title">
      <FlaskConical :size="13" />
      公式保真报告
    </p>

    <Skeleton
      v-if="reportQuery.isPending.value"
      label="保真报告加载中"
    />
    <Boundary
      v-else-if="reportQuery.isError.value"
      tone="danger"
      title="保真报告加载失败"
    >
      {{ reportQuery.error.value?.message }}
    </Boundary>
    <template v-else-if="report">
      <div
        v-if="report.overall !== 'pass'"
        class="warn"
        role="alert"
      >
        <TriangleAlert :size="13" />
        {{ report.overall === 'partial' ? '部分块未通过保真检查，未标记为整篇翻译成功' : '保真检查失败' }}
      </div>
      <p
        v-else
        class="ok"
      >
        <Check :size="13" />
        全部保真检查一致
      </p>

      <ul class="items">
        <li
          v-for="it in ITEMS"
          :key="it.label"
          class="item"
        >
          <span
            class="mark"
            :class="it.ok ? 'ok' : 'bad'"
          >
            <Check
              v-if="it.ok"
              :size="12"
            />
            <X
              v-else
              :size="12"
            />
          </span>
          <span class="label">{{ it.label }}</span>
          <span class="detail">{{ it.detail }}</span>
        </li>
      </ul>

      <div
        v-if="report.failed_blocks.length > 0"
        class="failed"
      >
        <p class="failed-title">
          失败块（原公式保留）
        </p>
        <ul class="failed-list">
          <li
            v-for="b in report.failed_blocks"
            :key="b.block_id"
            class="failed-item"
            role="alert"
          >
            <code>{{ b.block_id }}</code>
            <span>{{ b.reason }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fidelity {
  display: grid;
  gap: 7px;
}
.title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.warn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 7px;
  background: var(--warning-bg);
  color: #664718;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.ok {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #1c6a4a;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: var(--font-size-xs);
}
.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
}
.mark.ok {
  background: var(--success-bg);
  color: #1c6a4a;
}
.mark.bad {
  background: var(--danger-bg);
  color: #a03030;
}
.label {
  font-weight: 700;
}
.detail {
  margin-left: auto;
  color: var(--text-muted);
}
.failed {
  border-top: 1px solid var(--border);
  padding-top: 7px;
}
.failed-title {
  margin: 0 0 5px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: #92400e;
}
.failed-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.failed-item {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  font-size: var(--font-size-xs);
  color: #664718;
  background: var(--warning-bg);
  border-radius: 6px;
  padding: 5px 8px;
}
.failed-item code {
  font-family: var(--mono);
  font-weight: 800;
}
</style>
