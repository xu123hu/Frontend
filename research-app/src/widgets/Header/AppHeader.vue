<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Bot, Bell, Search, LogOut, UserRound } from 'lucide-vue-next';
import { useAgentStore } from '@app/stores/agent';
import { useUiStore } from '@app/stores/ui';
import { useSession } from '@features/auth/use-session';
import ProjectSwitcher from '@widgets/ProjectSwitcher/ProjectSwitcher.vue';
import { config } from '@app/config';

const router = useRouter();
const ui = useUiStore();
const agent = useAgentStore();
const session = useSession();

const taskCount = computed(() => agent.pendingCount);
const account = computed(() => session.account.value);
const isHealthy = computed(() => ui.systemHealthy);
const headStateLabel = computed(() => {
  if (config.runtimeMode === 'demo') return '演示模式';
  if (!isHealthy.value) return 'AI 服务未就绪';
  return config.useMock ? '演示工作区 · AI 已连接' : '真实服务 · 已连接';
});

const accountMenuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

function onDocumentClick(event: MouseEvent): void {
  if (menuRoot.value && !menuRoot.value.contains(event.target as Node)) accountMenuOpen.value = false;
}
onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

async function signOut(): Promise<void> {
  accountMenuOpen.value = false;
  try {
    await session.logout();
  } catch {
    // 用户登出意图明确：仍前往登录页；若服务端会话仍存活，登录页探测会将其重定向回应用（结果可观察）。
  }
  await router.replace({ name: 'login' });
}
</script>

<template>
  <header
    id="app-header"
    role="banner"
  >
    <ProjectSwitcher />
    <span class="head-spacer" />
    <span
      class="head-state"
      aria-live="polite"
    >
      <span
        class="dot"
        :class="{ ok: isHealthy, warn: !isHealthy }"
      />
      {{ headStateLabel }}
    </span>
    <div class="header-actions">
      <button
        class="btn ghost"
        :aria-label="'全局搜索'"
      >
        <Search :size="16" />
      </button>
      <button
        class="btn"
        :aria-label="'通知'"
      >
        <Bell :size="16" />
      </button>
      <button
        class="btn primary"
        :aria-label="'打开 AI 管家'"
        @click="ui.toggleAgent()"
      >
        <Bot :size="16" />
        <span class="agent-label">科研智能体</span>
        <span
          v-if="taskCount > 0"
          class="badge-counter"
          aria-label="`${taskCount} 项待确认`"
        >
          {{ taskCount }}
        </span>
      </button>
      <div
        ref="menuRoot"
        class="account"
      >
        <button
          type="button"
          class="btn account-btn"
          :aria-expanded="accountMenuOpen"
          aria-haspopup="menu"
          aria-label="账户菜单"
          @click="accountMenuOpen = !accountMenuOpen"
        >
          <UserRound :size="16" />
          <span
            v-if="account"
            class="account-name"
          >{{ account.display_name }}</span>
        </button>
        <div
          v-if="accountMenuOpen"
          class="account-menu"
          role="menu"
          aria-label="账户操作"
        >
          <p
            v-if="account"
            class="menu-phone mono"
          >
            {{ account.phone_masked }}
          </p>
          <button
            type="button"
            role="menuitem"
            class="menu-item"
            @click="router.push({ name: 'personal' }); accountMenuOpen = false"
          >
            个人中心
          </button>
          <button
            type="button"
            role="menuitem"
            class="menu-item danger"
            @click="signOut"
          >
            <LogOut :size="14" />
            退出登录
          </button>
        </div>
      </div>
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
  align-items: center;
}
.account {
  position: relative;
}
.account-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.account-name {
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  padding: 6px;
  z-index: 40;
}
.menu-phone {
  margin: 0;
  padding: 6px 10px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: 650;
  cursor: pointer;
}
.menu-item:hover {
  background: var(--subtle-bg);
}
.menu-item.danger {
  color: var(--danger);
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
.mono {
  font-family: var(--mono);
}
/* 移动端（≤760px）：顶栏内容必须收敛进可视视口。
   溢出会把布局视口撑到 504px 并触发 Chrome 移动端整体缩放（visual 393 / layout 504），
   所有命中坐标随之错位——真实手机上表现为整页缩小发虚。 */
@media (max-width: 760px) {
  #app-header {
    padding: 0 10px;
    gap: 8px;
  }
  .head-state,
  .agent-label,
  .account-name {
    display: none;
  }
  .header-actions {
    gap: 4px;
  }
  .header-actions > .btn,
  .account-btn {
    width: 32px;
    min-height: 32px;
    padding: 5px;
  }
}
</style>
