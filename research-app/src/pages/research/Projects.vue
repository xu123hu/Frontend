<script setup lang="ts">
/**
 * 项目列表（黄金链路一 TC-F01-05）。
 * 数据：GET /projects（M4 v2.0，当前租户隔离）。
 * 状态：加载骨架 / 空态引导创建 / 错误可重试 / 创建弹窗 / 成功后进入详情。
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { AppButton, AppCard, AppChip } from '@shared/ui';
import EmptyState from '@shared/ui/EmptyState.vue';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import DataSourceBadge from '@shared/ui/DataSourceBadge.vue';
import CreateProjectDialog from '@widgets/CreateProjectDialog/CreateProjectDialog.vue';
import { useProjects } from '@features/projects/use-projects';
import { useUiStore } from '@app/stores/ui';

const router = useRouter();
const ui = useUiStore();
const projectsQuery = useProjects(20);
const dialogOpen = ref(false);

const projects = computed(() => projectsQuery.data.value?.items ?? []);
const isEmpty = computed(() => !projectsQuery.isPending.value && !projectsQuery.isError.value && projects.value.length === 0);

const STAGE_LABELS: Record<string, string> = {
  discovery: '发现期',
  verification: '验证期',
  writing: '写作期',
  review: '评审期',
  published: '已发表',
};
const STAGE_ORDER = ['discovery', 'verification', 'writing', 'review', 'published'];
const STAGE_COLORS: Record<string, string> = {
  discovery: '#6366f1',
  verification: '#0ea5e9',
  writing: '#8b5cf6',
  review: '#f59e0b',
  published: '#10b981',
};
function stageProgress(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? ((idx + 1) / STAGE_ORDER.length) * 100 : 0;
}
function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? '#64748b';
}
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function enterProject(id: string, title: string): void {
  ui.setProjectName(title);
  router.push({ name: 'project', params: { id } });
}

function onCreated(projectId: string): void {
  dialogOpen.value = false;
  router.push({ name: 'project', params: { id: projectId } });
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>科研项目</h1>
        <p>项目连接文献、论文、审查、教育研究和成果。</p>
      </div>
      <div class="actions">
        <DataSourceBadge />
        <AppButton
          size="md"
          @click="dialogOpen = true"
        >
          新建项目
        </AppButton>
      </div>
    </header>

    <Skeleton
      v-if="projectsQuery.isPending.value"
      label="项目列表加载中"
    />
    <Boundary
      v-else-if="projectsQuery.isError.value"
      tone="danger"
      title="项目列表加载失败"
    >
      {{ projectsQuery.error.value?.message }}
      <AppButton
        variant="danger"
        size="sm"
        class="boundary-action"
        @click="projectsQuery.refetch()"
      >
        重试
      </AppButton>
    </Boundary>

    <EmptyState
      v-else-if="isEmpty"
      title="还没有科研项目"
      hint="项目是科研工作区的组织单元：文献、证据、写作与评审都归属到项目。创建第一个项目开始。"
    >
      <AppButton @click="dialogOpen = true">
        创建第一个项目
      </AppButton>
    </EmptyState>

    <ul
      v-else
      class="project-grid"
    >
      <li
        v-for="project in projects"
        :key="project.id"
      >
        <AppCard
          variant="interactive"
          padding="md"
          role="button"
          tabindex="0"
          class="project-card"
          @click="enterProject(project.id, project.title)"
          @keydown.enter.prevent="enterProject(project.id, project.title)"
          @keydown.space.prevent="enterProject(project.id, project.title)"
        >
          <span
            class="card-cover"
            :style="{ background: `linear-gradient(135deg, ${stageColor(project.stage)}22, ${stageColor(project.stage)}08)` }"
          >
            <span
              class="cover-dot"
              :style="{ background: stageColor(project.stage) }"
            />
            <AppChip
              size="sm"
              :style="{ color: stageColor(project.stage), borderColor: stageColor(project.stage) }"
            >
              {{ STAGE_LABELS[project.stage] ?? project.stage }}
            </AppChip>
          </span>
          <span class="card-top">
            <span class="project-title">{{ project.title }}</span>
          </span>
          <span class="project-rq">{{ project.research_question }}</span>
          <span class="stage-progress">
            <span class="progress-track">
              <span
                class="progress-fill"
                :style="{ width: stageProgress(project.stage) + '%', background: stageColor(project.stage) }"
              />
            </span>
            <span class="progress-stages">
              <span
                v-for="s in STAGE_ORDER"
                :key="s"
                class="stage-dot"
                :style="{ background: STAGE_ORDER.indexOf(s) <= STAGE_ORDER.indexOf(project.stage) ? stageColor(project.stage) : '#e2e8f0' }"
              />
            </span>
          </span>
          <span class="key-numbers">
            <span class="kn-item"><span class="kn-num">-</span><span class="kn-label">文献</span></span>
            <span class="kn-item"><span class="kn-num">-</span><span class="kn-label">主张</span></span>
            <span class="kn-item"><span class="kn-num">-</span><span class="kn-label">已验证</span></span>
          </span>
          <span class="card-bottom">
            <span class="muted small">{{ project.domain }} · {{ project.visibility === 'private' ? '私有' : '团队' }}</span>
            <span class="muted small">更新于 {{ formatDate(project.updated_at) }}</span>
          </span>
        </AppCard>
      </li>
    </ul>

    <CreateProjectDialog
      :open="dialogOpen"
      @close="dialogOpen = false"
      @created="onCreated"
    />
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
  color: var(--ailp-foreground);
}
.page-head p {
  margin: 0;
  color: var(--ailp-muted-foreground);
  max-width: 75ch;
  font-size: var(--font-size-base);
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.boundary-action {
  margin-left: 8px;
}
.project-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.project-card {
  width: 100%;
  height: 100%;
  text-align: left;
  display: grid;
  gap: 8px;
  align-content: start;
  font: inherit;
  color: inherit;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.project-title {
  font-weight: 750;
  font-size: var(--font-size-lg);
  color: var(--ailp-foreground);
}
.project-rq {
  color: var(--ailp-muted-foreground);
  font-size: var(--font-size-base);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}
.card-bottom {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.muted {
  color: var(--ailp-muted-foreground);
}
.small {
  font-size: var(--font-size-xs);
}

.card-cover { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; margin-bottom: 10px; }
.cover-dot { width: 8px; height: 8px; border-radius: 50%; }
.stage-progress { margin: 10px 0; }
.progress-track { display: block; height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
.progress-fill { display: block; height: 100%; border-radius: 2px; transition: width 0.3s; }
.progress-stages { display: flex; justify-content: space-between; }
.stage-dot { width: 6px; height: 6px; border-radius: 50%; }
.key-numbers { display: flex; gap: 16px; margin: 10px 0; padding: 8px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
.kn-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.kn-num { font-size: 16px; font-weight: 700; color: #0f172a; }
.kn-label { font-size: 11px; color: #64748b; }
</style>
