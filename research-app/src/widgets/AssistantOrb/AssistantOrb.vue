<script setup lang="ts">
import { computed } from 'vue';
import { Sparkles } from 'lucide-vue-next';
import { useUiStore } from '@app/stores/ui';
import { useAgentStore } from '@app/stores/agent';

const ui = useUiStore();
const agent = useAgentStore();

const status = computed(() => agent.orbStatus);
const label = computed(() => {
  switch (status.value) {
    case 'running':
      return '执行中';
    case 'waiting':
      return '等待确认';
    case 'complete':
      return '已完成';
    case 'failed':
      return '执行失败';
    case 'offline':
      return '离线';
    default:
      return '空闲';
  }
});
</script>

<template>
  <button
    id="assistant-orb"
    class="assistant-orb floating-ai-btn"
    :class="`status-${status}`"
    :data-status="status"
    :aria-label="`AI 管家 · ${label}`"
    :aria-expanded="ui.agentDrawerOpen"
    aria-controls="agent-drawer"
    @click="ui.toggleAgent()"
  >
    <span
      class="assistant-orb-label"
      aria-hidden="true"
    >
      <Sparkles :size="20" />
    </span>
    <span
      v-if="agent.pendingCount > 0"
      class="assistant-orb-badge"
      :aria-label="`${agent.pendingCount} 项待确认`"
    >
      {{ agent.pendingCount }}
    </span>
  </button>
</template>

<style scoped>
.assistant-orb {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 50%;
  z-index: var(--z-orb);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.assistant-orb:hover {
  transform: translateY(-3px);
}
.assistant-orb:active {
  transform: translateY(-1px);
}
.assistant-orb-badge {
  position: absolute;
  right: -4px;
  top: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid var(--ailp-card, #fff);
  border-radius: var(--ailp-radius-full, 9999px);
  background: var(--ailp-warning-500, var(--ailp-warning-500));
  color: var(--ailp-gray-950, var(--ailp-gray-950));
  font-size: 10px;
  display: grid;
  place-items: center;
  font-weight: 700;
}
@media (prefers-reduced-motion: reduce) {
  .assistant-orb {
    transition: none;
  }
}
</style>
