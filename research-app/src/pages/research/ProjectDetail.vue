<script setup lang="ts">
/**
 * 项目详情 = 项目工作台（research-v2 重设计）。
 * 布局参照 GitHub 仓库页（紧凑头部 + 水平 Tab + 右侧 About 元数据栏）与
 * Linear issue 视图（左工作内容、右元数据）：
 * - 头部：标题 + 阶段徽标 + 研究问题 + 管家入口（一行内，不再占整屏）
 * - 主区 Tab：假设与验证 / 主张证据 / 活动（全部真数据面板）
 * - 右栏：紧凑阶段步进器 + 折叠的项目信息 + AI 管家状态
 * 取消整屏卡片堆叠与裸 ID 展示；无空页铁律由各面板自担。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { AppButton, AppChip } from '@shared/ui';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import { useProject } from '@features/projects/use-projects';
import { useUiStore } from '@app/stores/ui';
import { apiRequest, ApiError } from '@app/api/client';
import ActivityPanel from '@widgets/ProjectWorkspace/ActivityPanel.vue';
import ClaimPanel from '@widgets/ProjectWorkspace/ClaimPanel.vue';
import HypothesisPanel from '@widgets/ProjectWorkspace/HypothesisPanel.vue';
import StageStepper from '@widgets/ProjectWorkspace/StageStepper.vue';

const route = useRoute();
const ui = useUiStore();

const projectId = computed(() => String(route.params.id ?? ''));
const projectQuery = useProject(projectId.value);
const project = computed(() => projectQuery.data.value ?? null);
const errorKind = computed(() => (projectQuery.error.value instanceof ApiError ? projectQuery.error.value.kind : ''));

watch(
  project,
  (value) => {
    if (value) ui.setProjectName(value.title);
  },
  { immediate: true },
);

const STAGE_LABELS: Record<string, string> = {
  discovery: '发现期',
  verification: '验证期',
  writing: '写作期',
  review: '评审期',
  published: '已发表',
};

const TABS = [
  { key: 'hypotheses', label: '假设与验证' },
  { key: 'claims', label: '主张证据' },
  { key: 'activity', label: '活动' },
] as const;
const activeTab = ref<'hypotheses' | 'claims' | 'activity'>('hypotheses');

const stewardStatus = ref<'checking' | 'up' | 'down'>('checking');
onMounted(async () => {
  try {
    await apiRequest<{ model_configured: boolean }>('/steward/status');
    stewardStatus.value = 'up';
  } catch {
    stewardStatus.value = 'down';
  }
});
function openSteward(): void {
  ui.setAgentTab('tasks');
  if (!ui.agentOpen) ui.toggleAgent();
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="page">
    <Skeleton
      v-if="projectQuery.isPending.value"
      label="项目详情加载中"
    />

    <Boundary
      v-else-if="projectQuery.isError.value && (errorKind === 'forbidden' || errorKind === 'not_found')"
      tone="warning"
      title="无法访问该项目"
    >
      <p class="boundary-text">
        该项目不存在，或当前账户无权访问。
      </p>
    </Boundary>

    <Boundary
      v-else-if="projectQuery.isError.value"
      tone="danger"
      title="项目详情加载失败"
    >
      {{ projectQuery.error.value?.message }}
      <AppButton
        variant="danger"
        size="sm"
        @click="projectQuery.refetch()"
      >
        重试
      </AppButton>
    </Boundary>

    <template v-else-if="project">
      <header class="head">
        <div class="head-main">
          <p class="eyebrow">
            {{ project.domain }} · {{ project.visibility === 'private' ? '私有' : '团队' }}
            <AppChip
              tone="primary"
              size="sm"
            >
              {{ STAGE_LABELS[project.stage] ?? project.stage }}
            </AppChip>
          </p>
          <h1>{{ project.title }}</h1>
          <p class="rq">
            {{ project.research_question }}
          </p>
        </div>
        <div class="head-actions">
          <AppButton
            variant="primary"
            size="sm"
            @click="openSteward"
          >
            AI 管家
          </AppButton>
        </div>
      </header>

      <nav
        class="tabs"
        role="tablist"
        aria-label="项目工作区"
      >
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          role="tab"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="workspace">
        <section class="main">
          <HypothesisPanel
            v-show="activeTab === 'hypotheses'"
            :project-id="projectId"
          />
          <ClaimPanel
            v-show="activeTab === 'claims'"
            :project-id="projectId"
          />
          <ActivityPanel
            v-show="activeTab === 'activity'"
            :project-id="projectId"
          />
        </section>

        <aside class="aside">
          <div class="aside-block">
            <h2>研究阶段</h2>
            <StageStepper :current-stage="project.stage" />
          </div>
          <div class="aside-block">
            <h2>AI 管家</h2>
            <p class="aside-line">
              <span
                class="dot"
                :style="{ background: stewardStatus === 'up' ? 'var(--ailp-success-500)' : 'var(--ailp-gray-300)' }"
              />
              {{ stewardStatus === 'up' ? '已连接 · 模型就绪' : stewardStatus === 'down' ? '未连接' : '检测中…' }}
            </p>
            <AppButton
              variant="secondary"
              size="sm"
              block
              @click="openSteward"
            >
              发起研究循环
            </AppButton>
          </div>
          <details class="aside-block facts">
            <summary>项目信息</summary>
            <dl>
              <div>
                <dt>项目 ID</dt>
                <dd class="mono">
                  {{ project.id }}
                </dd>
              </div>
              <div>
                <dt>租户</dt>
                <dd class="mono">
                  {{ project.tenant_id }}
                </dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>v{{ project.version }}</dd>
              </div>
              <div>
                <dt>创建</dt>
                <dd>{{ formatDate(project.created_at) }}</dd>
              </div>
              <div>
                <dt>更新</dt>
                <dd>{{ formatDate(project.updated_at) }}</dd>
              </div>
            </dl>
          </details>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}
.eyebrow {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--ailp-primary-600);
  margin-bottom: 2px;
}
.head h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 2px;
}
.rq {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
}
.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.tab {
  appearance: none;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 8px 14px;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
}
.tab:hover {
  color: var(--text);
}
.tab.active {
  color: var(--ailp-primary-600);
  font-weight: 600;
  border-bottom-color: var(--ailp-primary-600);
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 272px;
  gap: 20px;
  align-items: start;
}
.main {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
}
.aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.aside-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}
.aside-block h2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px;
}
.aside-line {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  flex: none;
}
.facts summary {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}
.facts dl {
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.facts dt {
  font-size: 11px;
  color: var(--text-weak);
}
.facts dd {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  word-break: break-all;
}
.mono {
  font-family: var(--mono);
}
@media (max-width: 980px) {
  .workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
