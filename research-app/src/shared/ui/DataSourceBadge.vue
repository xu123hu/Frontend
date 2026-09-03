<script setup lang="ts">
/**
 * 数据源徽标（08 §6 禁静默降级）：当应用运行在契约草案模拟数据上时
 * 常驻显示，让每一次走查都能区分「真实后端」与「契约草案」。
 */
import { config } from '@app/config';
</script>

<template>
  <span
    v-if="config.useMock"
    class="ds-badge"
    role="status"
    aria-label="契约草案数据源"
    title="当前数据来自 MSW 契约草案模拟，非真实后端"
  >
    契约草案数据源
  </span>
</template>

<style scoped>
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--warning-bg);
  border: 1px solid #ead29e;
  color: #8a5b00;
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
}
</style>
