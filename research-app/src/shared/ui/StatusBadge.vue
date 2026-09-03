<script setup lang="ts">
import { computed } from 'vue';
import { STATE_TONE, type AsyncStateType } from '@shared/state/async-state';
import { degradedLabel } from '@shared/state/degraded-messages';

const props = defineProps<{
  state: AsyncStateType;
  label?: string;
}>();

const tone = computed(() => STATE_TONE[props.state]);
const displayLabel = computed(() => props.label ?? degradedLabel(props.state));
</script>

<template>
  <span class="badge" :class="`tone-${tone}`" :data-state="state">{{ displayLabel }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  white-space: nowrap;
  color: var(--ink-2);
  background: var(--surface);
}
.tone-success {
  color: var(--success);
  background: var(--success-bg);
  border-color: #bfdfd0;
}
.tone-warning {
  color: var(--warning);
  background: var(--warning-bg);
  border-color: #ead29e;
}
.tone-danger {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: #e6c0bc;
}
.tone-info {
  color: var(--info);
  background: var(--info-bg);
  border-color: #c7d9e8;
}
.tone-muted {
  color: var(--muted);
}
</style>
