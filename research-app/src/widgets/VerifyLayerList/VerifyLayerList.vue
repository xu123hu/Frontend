<script setup lang="ts">
/**
 * 分层验证五能力分项卡（L0-L4，M4 §8.3）。
 * 体验轨 TC-X05-02：状态不只靠颜色——图标 + 文字 + role=alert。
 */
import { computed } from 'vue';
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, AlertTriangle } from 'lucide-vue-next';
import type { VerificationLayer } from '@entities/review/types';

const props = defineProps<{ layers: VerificationLayer[] }>();

const ORDER: VerificationLayer['layer'][] = ['L0', 'L1', 'L2', 'L3', 'L4'];
const sorted = computed(() => [...props.layers].sort((a, b) => ORDER.indexOf(a.layer) - ORDER.indexOf(b.layer)));

function statusIcon(status: VerificationLayer['status']) {
  switch (status) {
    case 'passed':
      return CheckCircle2;
    case 'failed':
      return XCircle;
    case 'partial':
      return AlertTriangle;
    case 'inconclusive':
      return HelpCircle;
    default:
      return MinusCircle;
  }
}
function statusText(status: VerificationLayer['status']): string {
  switch (status) {
    case 'passed':
      return '通过';
    case 'failed':
      return '未通过';
    case 'partial':
      return '部分通过';
    case 'inconclusive':
      return '无法判定';
    default:
      return '未运行';
  }
}
</script>

<template>
  <ul
    class="layer-list"
    aria-label="分层验证（L0-L4 五能力独立分项）"
  >
    <li
      v-for="layer in sorted"
      :key="layer.layer"
      class="layer-card"
      :class="`status-${layer.status}`"
      :data-layer="layer.layer"
    >
      <header class="layer-head">
        <span
          class="layer-chip"
          aria-hidden="true"
        >{{ layer.layer }}</span>
        <b class="layer-label">{{ layer.label }}</b>
        <span
          class="layer-status"
          :role="layer.status === 'failed' ? 'alert' : undefined"
        >
          <component
            :is="statusIcon(layer.status)"
            :size="14"
            aria-hidden="true"
          />
          {{ statusText(layer.status) }}
        </span>
      </header>
      <p class="layer-summary">
        {{ layer.summary }}
      </p>
      <p class="layer-tool">
        {{ layer.method }} · {{ layer.tool_name }} {{ layer.tool_version }}
      </p>
      <details
        v-if="layer.counterexample"
        class="counterexample"
      >
        <summary>反例详情（代入值 / 前提检查 / 复算）</summary>
        <dl>
          <div><dt>代入值</dt><dd>{{ layer.counterexample.assignment }}</dd></div>
          <div><dt>前提约束检查</dt><dd>{{ layer.counterexample.assumption_check }}</dd></div>
          <div><dt>复算</dt><dd>{{ layer.counterexample.recompute }}</dd></div>
        </dl>
      </details>
    </li>
  </ul>
</template>

<style scoped>
.layer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.layer-card {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 6px;
  align-content: start;
}
.layer-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.layer-chip {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 22px;
  border-radius: 6px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 800;
  flex-shrink: 0;
}
.layer-label {
  font-size: var(--font-size-sm);
}
.layer-status {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.status-passed .layer-status { color: var(--success); }
.status-failed .layer-status { color: var(--danger); }
.status-partial .layer-status,
.status-inconclusive .layer-status { color: var(--warning); }
.status-not_run .layer-status { color: var(--muted); }
.status-failed {
  border-color: #e6c0bc;
  background: var(--danger-bg);
}
.layer-summary {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--ink-2);
  line-height: 1.5;
}
.layer-tool {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.counterexample summary {
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--danger);
}
.counterexample dl {
  margin: 8px 0 0;
  display: grid;
  gap: 6px;
}
.counterexample dt {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
.counterexample dd {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
}
@media (max-width: 760px) {
  .layer-list {
    grid-template-columns: 1fr;
  }
}
</style>
