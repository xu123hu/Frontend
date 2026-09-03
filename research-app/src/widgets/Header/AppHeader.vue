<script setup lang="ts">
import { computed } from 'vue';
import { Bot, Bell, Search } from 'lucide-vue-next';
import { useAgentStore } from '@app/stores/agent';
import { useUiStore } from '@app/stores/ui';

const ui = useUiStore();
const agent = useAgentStore();

const taskCount = computed(() => agent.pendingCount);
const projectName = computed(() => ui.currentProjectName);
const isHealthy = computed(() => ui.systemHealthy);
</script>

<template>
  <header id="app-header" role="banner">
    <span class="header-title">科研端 · {{ projectName }}</span>
    <span class="head-spacer" />
    <span class="head-state" aria-live="polite">
      <span class="dot" :class="{ ok: isHealthy, warn: !isHealthy }" />
      {{ isHealthy ? '私有运行 · 已保存' : '运行降级中' }}
    </span>
    <div class="header-actions">
      <button class="btn ghost" :aria-label="'全局搜索'">
        <Search :size="16" />
      </button>
      <button class="btn" :aria-label="'通知'">
        <Bell :size="16" />
      </button>
      <button
        class="btn primary"
        :aria-label="'打开 AI 管家'"
        @click="ui.toggleAgent()"
      >
        <Bot :size="16" />
        科研智能体
        <span v-if="taskCount > 0" class="badge-counter" aria-label="`${taskCount} 项待确认`">
          {{ taskCount }}
        </span>
      </button>
    </div>
  </header>
</template>

<style scoped>
#app-header {
  height: var(--header-height);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.header-title {
  font-weight: 750;
  font-size: var(--font-size-base);
}
.head-spacer {
  flex: 1;
}
.head-state {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  display: flex;
  gap: 7px;
  align-items: center;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
}
.dot.ok {
  background: var(--success);
}
.dot.warn {
  background: var(--warning);
}
.header-actions {
  display: flex;
  gap: 7px;
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text);
}
.btn:hover {
  background: var(--subtle-bg);
  border-color: #b8c4d5;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn.primary:hover {
  background: var(--primary-hover);
}
.btn.ghost {
  border-color: transparent;
  background: transparent;
  color: var(--text-muted);
}
.badge-counter {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--warning);
  color: #172b4d;
  font-size: 10px;
  font-weight: 700;
}
</style>
