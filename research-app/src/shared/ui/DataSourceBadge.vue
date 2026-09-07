<script setup lang="ts">
/**
 * 数据源与 AI 服务状态（08 §6 禁静默降级）。
 */
import { computed, onMounted, ref } from 'vue';
import { config } from '@app/config';
import { apiRequest } from '@app/api/client';
import { useUiStore } from '@app/stores/ui';

type BackendState = 'demo' | 'checking' | 'connected' | 'unconfigured' | 'disconnected';
const state = ref<BackendState>(config.runtimeMode === 'demo' ? 'demo' : 'checking');
const ui = useUiStore();

const label = computed(() => {
  if (state.value === 'demo') return '演示数据';
  if (state.value === 'checking') return '正在连接 AI 服务';
  if (state.value === 'disconnected') return config.useMock ? '演示数据 · AI 未连接' : '服务未连接';
  if (state.value === 'unconfigured') return config.useMock ? '演示数据 · AI 未配置' : 'AI 未配置';
  return config.useMock ? '演示数据 · AI 已联通' : '真实服务';
});

onMounted(async () => {
  if (config.runtimeMode === 'demo') return;
  try {
    const response = await apiRequest<{ service: string; model_configured: boolean }>('/steward/status');
    state.value = response.data.model_configured ? 'connected' : 'unconfigured';
    ui.setSystemHealthy(response.data.model_configured);
  } catch {
    state.value = 'disconnected';
    ui.setSystemHealthy(false);
  }
});
</script>

<template>
  <span
    class="ds-badge"
    :class="`is-${state}`"
    role="status"
    :aria-label="label"
    :title="label"
  >
    {{ label }}
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
.ds-badge.is-connected {
  border-color: rgba(37, 164, 111, 0.3);
  background: rgba(37, 164, 111, 0.1);
  color: #13734a;
}
.ds-badge.is-disconnected,
.ds-badge.is-unconfigured {
  border-color: rgba(214, 69, 69, 0.24);
  background: rgba(214, 69, 69, 0.08);
  color: var(--danger);
}
</style>
