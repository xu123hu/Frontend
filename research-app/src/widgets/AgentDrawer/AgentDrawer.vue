<script setup lang="ts">
import { computed, ref } from 'vue';
import { X } from 'lucide-vue-next';
import { useUiStore } from '@app/stores/ui';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';
import EmptyState from '@shared/ui/EmptyState.vue';

const ui = useUiStore();

const drawerRoot = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const isOpen = computed(() => ui.agentOpen);
// TC-X01-05：抽屉 Escape 关闭 + 焦点陷阱；层栈保证与弹窗同开时只关最上层。
useDialogA11y(
  drawerRoot,
  isOpen,
  () => {
    if (ui.agentOpen) ui.toggleAgent();
  },
  () => closeButton.value,
);

const tabDefs = [
  { id: 'evidence', label: '证据' },
  { id: 'comments', label: '批注' },
  { id: 'citations', label: '引用' },
  { id: 'tasks', label: '任务' },
] as const;
type TabId = (typeof tabDefs)[number]['id'];

const activeTab = computed(() => ui.agentTab);

function selectTab(tab: TabId): void {
  ui.setAgentTab(tab);
}
</script>

<template>
  <aside
    id="agent-drawer"
    ref="drawerRoot"
    :class="{ open: isOpen }"
    :data-active-tab="activeTab"
    :aria-hidden="!isOpen ? 'true' : 'false'"
    :inert="!isOpen ? true : undefined"
    aria-label="AI 管家上下文抽屉"
  >
    <header class="drawer-head">
      <div>
        <h2>AI 管家</h2>
        <p>当前项目的证据、批注、引用与任务集中在此。</p>
      </div>
      <button
        ref="closeButton"
        class="icon-btn"
        :aria-label="'关闭 AI 管家'"
        @click="ui.toggleAgent()"
      >
        <X :size="16" />
      </button>
    </header>
    <div
      class="drawer-tabs"
      role="tablist"
      aria-label="AI 管家上下文"
    >
      <button
        v-for="tab in tabDefs"
        :id="`agent-tab-${tab.id}`"
        :key="tab.id"
        class="drawer-tab"
        :class="{ active: activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`agent-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        role="tab"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <section
      v-for="tab in tabDefs"
      :id="`agent-panel-${tab.id}`"
      :key="tab.id"
      class="drawer-panel"
      role="tabpanel"
      :aria-labelledby="`agent-tab-${tab.id}`"
      :hidden="activeTab !== tab.id"
    >
      <div class="drawer-body">
        <EmptyState
          :title="`${tab.label} 内容等待 M0 契约`"
          hint="M0 OpenAPI 冻结后，此处会显示真实的 RunEvent / EvidenceRecord / CitationRecord。"
        />
      </div>
    </section>
  </aside>
</template>

<style scoped>
#agent-drawer {
  position: fixed;
  right: 0;
  top: var(--header-height);
  bottom: 0;
  width: min(430px, 100vw);
  background: var(--surface);
  border-left: 1px solid var(--line);
  z-index: var(--z-drawer);
  transform: translateX(101%);
  transition: transform var(--transition-base) ease-out;
  display: flex;
  flex-direction: column;
}
#agent-drawer.open {
  transform: translateX(0);
}
.drawer-head {
  padding: 14px 15px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.drawer-head h2 {
  font-size: var(--font-size-lg);
  margin: 0;
}
.drawer-head p {
  font-size: var(--font-size-xs);
  color: var(--muted);
  margin: 3px 0 0;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--subtle-bg);
}
.drawer-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid var(--line);
  padding: 0 10px;
}
.drawer-tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 10px 4px;
  color: var(--muted);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.drawer-tab.active {
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 750;
}
.drawer-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}
.drawer-panel[hidden] {
  display: none;
}
.drawer-body {
  padding: 14px;
  overflow: auto;
  flex: 1;
}
</style>
