<script setup lang="ts">
/**
 * AI 管家上下文抽屉：真实模型对话 + 研究循环任务与审批。
 * - 任务 Tab：发起研究循环（研究问题）→ StewardTaskTimeline（计划/步骤/预算/产物）+ 待审批 ApprovalCard。
 * - 球体联动：待审批 → waiting + 徽标；运行中 → running；全部完成 → complete（TC-X06-02）。
 * - 文献证据、批注、引用留在各自工作台，不在此重复制造空页面。
 */
import { computed, ref, watch } from 'vue';
import { X, Send } from 'lucide-vue-next';
import { useUiStore } from '@app/stores/ui';
import { useAgentStore } from '@app/stores/agent';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';
import { useApprovals, useStartResearchCycle, useStewardChat, useStewardPlans } from '@features/steward/queries';
import type { StewardChatMessage } from '@features/steward/api';
import StewardTaskTimeline from '@widgets/StewardTaskTimeline/StewardTaskTimeline.vue';
import ApprovalCard from '@widgets/ApprovalCard/ApprovalCard.vue';

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
  { id: 'chat', label: '对话' },
  { id: 'tasks', label: '任务' },
] as const;
type TabId = (typeof tabDefs)[number]['id'];

const activeTab = computed(() => ui.agentTab);

function selectTab(tab: TabId): void {
  ui.setAgentTab(tab);
}

// ---------- 真实模型对话 ----------
const chatInput = ref('');
const chatMessages = ref<StewardChatMessage[]>([
  {
    role: 'assistant',
    content: '你好，我是科研管家。你可以让我梳理研究问题、检查论证链或规划论文评审。',
  },
]);
const chatMutation = useStewardChat();

async function sendChat(): Promise<void> {
  const content = chatInput.value.trim();
  if (!content || chatMutation.isPending.value) return;
  const userMessage: StewardChatMessage = { role: 'user', content };
  const history = [...chatMessages.value, userMessage].slice(-20);
  chatMessages.value.push(userMessage);
  chatInput.value = '';
  try {
    const response = await chatMutation.mutateAsync({
      messages: history,
      reasoningPolicyId: 'standard',
    });
    chatMessages.value.push({ role: 'assistant', content: response.content });
  } catch {
    chatInput.value = content;
  }
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
        <p>科研对话、研究循环与审批集中在此。</p>
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
        <template v-if="tab.id === 'chat'">
          <div
            class="chat-thread"
            aria-live="polite"
          >
            <article
              v-for="(message, index) in chatMessages"
              :key="`${message.role}-${index}`"
              class="chat-message"
              :class="`is-${message.role}`"
            >
              <span>{{ message.role === 'assistant' ? 'AI 管家' : '我' }}</span>
              <p>{{ message.content }}</p>
            </article>
            <p
              v-if="chatMutation.isPending.value"
              class="chat-status"
              role="status"
            >
              正在分析研究上下文…
            </p>
            <p
              v-if="chatMutation.isError.value"
              class="start-error"
              role="alert"
            >
              {{ chatMutation.error.value?.message }} 输入内容已保留，可稍后重试。
            </p>
          </div>
          <form
            class="chat-composer"
            aria-label="与 AI 科研管家对话"
            @submit.prevent="sendChat"
          >
            <label for="steward-chat-input">向科研管家提问</label>
            <textarea
              id="steward-chat-input"
              v-model="chatInput"
              rows="3"
              maxlength="8000"
              placeholder="例如：请检查这段证明缺少哪些前提，并给出核查顺序。"
            />
            <div class="composer-footer">
              <small>回答会区分事实、推断与候选假设</small>
              <button
                class="start-btn"
                type="submit"
                :disabled="!chatInput.trim() || chatMutation.isPending.value"
              >
                <Send
                  :size="13"
                  aria-hidden="true"
                />
                发送
              </button>
            </div>
          </form>
        </template>
        <!-- 任务 Tab：研究循环（TC-F06-01..05） -->
        <template v-else>
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
  grid-template-columns: repeat(2, 1fr);
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
.chat-thread {
  display: grid;
  gap: 10px;
}
.chat-message {
  max-width: 92%;
  display: grid;
  gap: 4px;
}
.chat-message.is-user {
  justify-self: end;
}
.chat-message > span {
  color: var(--muted);
  font-size: var(--font-size-xs);
  font-weight: 750;
}
.chat-message.is-user > span {
  text-align: right;
}
.chat-message p {
  margin: 0;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--subtle-bg);
  color: var(--text);
  font-size: var(--font-size-sm);
  line-height: 1.65;
  white-space: pre-wrap;
}
.chat-message.is-user p {
  border-color: rgba(49, 87, 213, 0.2);
  background: rgba(49, 87, 213, 0.08);
}
.chat-status {
  margin: 0;
  color: var(--muted);
  font-size: var(--font-size-xs);
}
.chat-composer {
  position: sticky;
  bottom: -14px;
  display: grid;
  gap: 7px;
  margin: 4px -2px -14px;
  padding: 12px 2px 14px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}
.chat-composer label {
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--muted);
}
.chat-composer textarea {
  width: 100%;
  min-height: 76px;
  padding: 9px 10px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  line-height: 1.5;
}
.chat-composer textarea:focus {
  outline: 2px solid rgba(49, 87, 213, 0.18);
  border-color: var(--primary);
}
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.composer-footer small {
  color: var(--muted);
  font-size: 11px;
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
