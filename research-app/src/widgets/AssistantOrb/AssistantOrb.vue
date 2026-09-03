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
    class="assistant-orb"
    :class="`status-${status}`"
    :data-status="status"
    :aria-label="`AI 管家 · ${label}`"
    :aria-expanded="ui.agentDrawerOpen"
    aria-controls="agent-drawer"
    @click="ui.toggleAgent()"
  >
    <span class="assistant-orb-label" aria-hidden="true">
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
  background: radial-gradient(circle at 34% 28%, #8da5f6 0, #5272dc 36%, #2949b4 100%);
  box-shadow: 0 8px 22px rgba(49, 87, 213, 0.28);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  cursor: pointer;
}
.assistant-orb::before {
  content: '';
  position: absolute;
  inset: -6px;
  border: 2px solid transparent;
  border-radius: inherit;
  pointer-events: none;
}
.assistant-orb.status-running::before {
  border-color: rgba(49, 87, 213, 0.35);
  animation: orb-ring 1.8s ease-out infinite;
}
.assistant-orb.status-waiting {
  box-shadow:
    0 8px 22px rgba(242, 169, 59, 0.3),
    0 0 0 3px rgba(242, 169, 59, 0.18);
}
.assistant-orb.status-failed {
  box-shadow:
    0 8px 22px rgba(214, 69, 69, 0.32),
    0 0 0 3px rgba(214, 69, 69, 0.18);
}
.assistant-orb.status-complete {
  box-shadow:
    0 8px 22px rgba(37, 164, 111, 0.3),
    0 0 0 3px rgba(37, 164, 111, 0.16);
}
.assistant-orb-label {
  font-size: 14px;
  letter-spacing: 0.04em;
}
.assistant-orb-badge {
  position: absolute;
  right: -4px;
  top: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--warning);
  color: #172b4d;
  font-size: 10px;
  display: grid;
  place-items: center;
  font-weight: 700;
}
@keyframes orb-ring {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  75%,
  100% {
    transform: scale(1.18);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .assistant-orb.status-running::before {
    animation: none;
  }
}
</style>
