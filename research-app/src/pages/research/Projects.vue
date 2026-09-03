<script setup lang="ts">
/**
 * 项目列表（黄金链路一 TC-F01-05）。
 * 数据：GET /projects（M4 v2.0，当前租户隔离）。
 * 状态：加载骨架 / 空态引导创建 / 错误可重试 / 创建弹窗 / 成功后进入详情。
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
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
        <button
          class="btn primary"
          type="button"
          @click="dialogOpen = true"
        >
          新建项目
        </button>
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
      <button
        class="retry"
        type="button"
        @click="projectsQuery.refetch()"
      >
        重试
      </button>
    </Boundary>

    <EmptyState
      v-else-if="isEmpty"
      title="还没有科研项目"
      hint="项目是科研工作区的组织单元：文献、证据、写作与评审都归属到项目。创建第一个项目开始。"
    >
      <button
        class="btn primary"
        type="button"
        @click="dialogOpen = true"
      >
        创建第一个项目
      </button>
    </EmptyState>

    <ul
      v-else
      class="project-grid"
    >
      <li
        v-for="project in projects"
        :key="project.id"
      >
        <button
          type="button"
          class="project-card"
          @click="enterProject(project.id, project.title)"
        >
          <span class="card-top">
            <span class="project-title">{{ project.title }}</span>
            <span class="stage-chip">{{ STAGE_LABELS[project.stage] ?? project.stage }}</span>
          </span>
          <span class="project-rq">{{ project.research_question }}</span>
          <span class="card-bottom">
            <span class="muted small">{{ project.domain }} · {{ project.visibility === 'private' ? '私有' : '团队' }}</span>
            <span class="muted small">更新于 {{ formatDate(project.updated_at) }}</span>
          </span>
        </button>
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
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
}
.actions {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.retry {
  border: 1px solid var(--danger);
  background: #fff;
  color: var(--danger);
  border-radius: 6px;
  padding: 2px 9px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
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
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
  font: inherit;
}
.project-card:hover {
  border-color: #b8c4d5;
  box-shadow: var(--shadow);
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
}
.stage-chip {
  flex-shrink: 0;
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.project-rq {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
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
  color: var(--text-muted);
}
.small {
  font-size: var(--font-size-xs);
}
</style>
