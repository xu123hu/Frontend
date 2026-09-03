import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * AI 管家 F0 占位 store。
 * 真实数据由后端 RunEvent SSE 接入（F1/M0 之后）。
 */
export interface AgentTaskSummary {
  id: string;
  title: string;
  state: 'queued' | 'running' | 'partial' | 'waiting_for_approval' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  needsApproval: boolean;
}

export const useAgentStore = defineStore('agent', () => {
  const tasks = ref<AgentTaskSummary[]>([]);
  const orbStatus = ref<'idle' | 'running' | 'waiting' | 'complete' | 'failed' | 'offline'>('idle');

  const pendingCount = computed(() => tasks.value.filter((t) => t.needsApproval).length);

  function setOrbStatus(s: typeof orbStatus.value): void {
    orbStatus.value = s;
  }

  function addTask(t: AgentTaskSummary): void {
    tasks.value.unshift(t);
  }

  function clear(): void {
    tasks.value = [];
  }

  return {
    tasks,
    orbStatus,
    pendingCount,
    setOrbStatus,
    addTask,
    clear,
  };
});
