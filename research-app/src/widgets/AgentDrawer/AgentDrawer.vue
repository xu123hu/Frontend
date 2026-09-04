<script setup lang="ts">
/**
 * AI 管家上下文抽屉（F4：任务 Tab 填充研究循环，06 §8）。
 * - 任务 Tab：发起研究循环（研究问题）→ StewardTaskTimeline（计划/步骤/预算/产物）+ 待审批 ApprovalCard。
 * - 球体联动：待审批 → waiting + 徽标；运行中 → running；全部完成 → complete（TC-X06-02）。
 * - 其余 Tab（证据/批注/引用）为 F5 证据域接线，保持占位。
 */
import { computed, ref, watch } from 'vue';
import { X, Send } from 'lucide-vue-next';
import { useUiStore } from '@app/stores/ui';
import { useAgentStore } from '@app/stores/agent';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';
import { useApprovals, useStartResearchCycle, useStewardPlans } from '@features/steward/queries';
import StewardTaskTimeline from '@widgets/StewardTaskTimeline/StewardTaskTimeline.vue';
import ApprovalCard from '@widgets/ApprovalCard/ApprovalCard.vue';
import EmptyState from '@shared/ui/EmptyState.vue';

const ui = useUiStore();
const agent = useAgentStore();

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

// ---------- 任务 Tab 数据（研究循环 + 审批） ----------
const plansQuery = useStewardPlans();
const approvalsQuery = useApprovals();
const pendingApprovals = computed(() => (approvalsQuery.data.value ?? []).filter((a) => a.status === 'pending'));

const researchQuestion = ref('');
const startCycle = useStartResearchCycle();
async function startCycleRun(): Promise<void> {
  const q = researchQuestion.value.trim();
  if (!q) return;
  try {
    await startCycle.mutateAsync(q);
    researchQuestion.value = '';
  } catch {
    // 失败保持输入，用户可重试（mutation error 展示在行内）。
  }
}

// ---------- 球体联动（TC-X06-02）：抽屉常驻挂载，查询结果驱动全局球体状态 ----------
watch(
  [plansQuery.data, approvalsQuery.data] as const,
  ([plans, approvals]) => {
    const list = plans ?? [];
    const pending = (approvals ?? []).filter((a) => a.status === 'pending');
    // 徽标：待审批数（ApprovalRequest pending）。
    agent.tasks = pending.map((a) => ({
      id: a.id,
      title: a.action,
      state: 'waiting_for_approval' as const,
      progress: 0,
      needsApproval: true,
    }));
    if (pending.length > 0) {
      agent.setOrbStatus('waiting');
      return;
    }
    if (list.some((p) => p.status === 'running' || p.status === 'queued')) {
      agent.setOrbStatus('running');
      return;
    }
    if (list.length > 0 && list.every((p) => p.status === 'succeeded' || p.status === 'partial')) {
      agent.setOrbStatus('complete');
      return;
    }
    if (list.some((p) => p.status === 'failed' || p.status === 'budget_exhausted')) {
      agent.setOrbStatus('failed');
      return;
    }
    agent.setOrbStatus('idle');
  },
  { immediate: true },
);
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
        <p>研究循环、审批与证据集中在此。</p>
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
        <span
          v-if="tab.id === 'tasks' && agent.pendingCount > 0"
          class="tab-badge"
          :aria-label="`${agent.pendingCount} 项待审批`"
        >{{ agent.pendingCount }}</span>
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
        <!-- 任务 Tab：研究循环（TC-F06-01..05） -->
        <template v-if="tab.id === 'tasks'">
          <form
            class="start-cycle"
            aria-label="发起研究循环"
            @submit.prevent="startCycleRun"
          >
            <label for="research-question-input">研究问题</label>
            <textarea
              id="research-question-input"
              v-model="researchQuestion"
              rows="2"
              placeholder="例：学校资源投入如何影响分层模型下的数学成绩差异？"
            />
            <button
              class="start-btn"
              type="submit"
              :disabled="!researchQuestion.trim() || startCycle.isPending.value"
            >
              <Send
                :size="13"
                aria-hidden="true"
              />
              {{ startCycle.isPending.value ? '发起中…' : '发起研究循环（严谨模式）' }}
            </button>
            <p
              v-if="startCycle.isError.value"
              class="start-error"
              role="alert"
            >
              发起失败：{{ startCycle.error.value?.message }}
            </p>
          </form>

          <!-- 待审批（高风险工具，参数哈希绑定） -->
          <section
            v-if="pendingApprovals.length > 0"
            class="approvals"
            aria-label="待审批（高风险工具）"
          >
            <h3>待审批（{{ pendingApprovals.length }}）</h3>
            <ApprovalCard
              v-for="approval in pendingApprovals"
              :key="approval.id"
              :approval="approval"
            />
          </section>

          <StewardTaskTimeline />
        </template>

        <!-- 证据/批注/引用：F5 证据域接线占位 -->
        <EmptyState
          v-else
          :title="`${tab.label} 内容等待 F5 证据域接线`"
          hint="EvidenceRecord / Annotation / CitationRecord 契约已冻结，场景接线在 F5 交付。"
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.drawer-tab.active {
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 750;
}
.tab-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--warning);
  color: #172b4d;
  font-size: 10px;
  font-weight: 800;
  display: inline-grid;
  place-items: center;
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
  display: grid;
  gap: 12px;
  align-content: start;
}
.start-cycle {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 7px;
}
.start-cycle label {
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--muted);
}
.start-cycle textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 10px;
  font-size: var(--font-size-sm);
  resize: vertical;
  background: var(--surface);
  color: var(--text);
}
.start-btn {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  border-radius: 7px;
  padding: 6px 12px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  cursor: pointer;
}
.start-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.start-error {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--danger);
}
.approvals {
  display: grid;
  gap: 8px;
}
.approvals h3 {
  margin: 0;
  font-size: var(--font-size-sm);
}
</style>
