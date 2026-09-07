<script setup lang="ts">
/**
 * 科研首页（黄金链路一 TC-F01-03）。
 * 数据：最近项目（M4 v2.0 /projects）+ 运行任务（M4 v2.0 /runs，CR-F1-06）。
 * 诚实性：待处理评审尚无契约数据源 → 显示明确说明，不造假数据；
 * 空状态 → 引导创建项目；模块级错误用 Boundary 隔离，不整页崩溃。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import EmptyState from '@shared/ui/EmptyState.vue';
import Boundary from '@shared/ui/Boundary.vue';
import StatusBadge from '@shared/ui/StatusBadge.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import DataSourceBadge from '@shared/ui/DataSourceBadge.vue';
import { useProjects } from '@features/projects/use-projects';
import { useRuns } from '@features/runs/use-runs';
import { RUN_STATUS_LABELS, RUN_TYPE_LABELS } from '@entities/run/types';
import { ApiError } from '@app/api/client';

const router = useRouter();
const projectsQuery = useProjects(5);
const runsQuery = useRuns(5);

const recentProjects = computed(() => projectsQuery.data.value?.items ?? []);
const activeRuns = computed(() =>
  (runsQuery.data.value?.items ?? []).filter(
    (r) => r.status === 'running' || r.status === 'queued' || r.status === 'waiting_for_approval',
  ),
);
const runsErrorKind = computed(() => (runsQuery.error.value instanceof ApiError ? runsQuery.error.value.kind : ''));

const STAGE_LABELS: Record<string, string> = {
  discovery: '发现期',
  verification: '验证期',
  writing: '写作期',
  review: '评审期',
  published: '已发表',
};
function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function openProject(id: string): void {
  router.push({ name: 'project', params: { id } });
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>科研首页</h1>
        <p>围绕当前项目安排下一步工作，并在需要确认时保留人工决策。</p>
      </div>
      <div class="actions">
        <DataSourceBadge />
        <button
          class="btn primary"
          type="button"
          @click="router.push({ name: 'projects' })"
        >
          新建科研项目
        </button>
      </div>
    </header>

    <!-- 最近项目 -->
    <section
      class="panel"
      aria-label="最近项目"
    >
      <header class="panel-head">
        <h2>最近项目</h2>
        <button
          class="link"
          type="button"
          @click="router.push({ name: 'projects' })"
        >
          查看全部
        </button>
      </header>
      <Skeleton
        v-if="projectsQuery.isPending.value"
        label="最近项目加载中"
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
        v-else-if="recentProjects.length === 0"
        title="还没有科研项目"
        hint="创建第一个项目后，文献、证据、写作与评审都会围绕它组织。"
      >
        <button
          class="btn primary"
          type="button"
          @click="router.push({ name: 'projects' })"
        >
          创建项目
        </button>
      </EmptyState>
      <ul
        v-else
        class="project-list"
      >
        <li
          v-for="project in recentProjects"
          :key="project.id"
        >
          <button
            type="button"
            class="project-card"
            @click="openProject(project.id)"
          >
            <span class="project-title">{{ project.title }}</span>
            <span class="project-rq">{{ project.research_question }}</span>
            <span class="project-meta">
              <span class="stage-chip">{{ stageLabel(project.stage) }}</span>
              <span class="muted small">{{ project.domain }} · 更新于 {{ formatDate(project.updated_at) }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 正在运行任务 -->
    <section
      class="panel"
      aria-label="正在运行任务"
    >
      <header class="panel-head">
        <h2>正在运行任务</h2>
      </header>
      <Skeleton
        v-if="runsQuery.isPending.value"
        label="运行任务加载中"
      />
      <Boundary
        v-else-if="runsQuery.isError.value && runsErrorKind === 'not_wired'"
        tone="warning"
        title="任务数据源未接线"
      >
        后端运行列表端点尚未接线（M0 声明的诚实 501）。接线后此处将显示真实的运行任务，不提供模拟数据。
      </Boundary>
      <Boundary
        v-else-if="runsQuery.isError.value"
        tone="danger"
        title="运行任务加载失败"
      >
        {{ runsQuery.error.value?.message }}
        <button
          class="retry"
          type="button"
          @click="runsQuery.refetch()"
        >
          重试
        </button>
      </Boundary>
      <EmptyState
        v-else-if="activeRuns.length === 0"
        title="没有进行中的任务"
        hint="当 AI 管家开始检索、翻译或验证时，任务会出现在这里。"
      />
      <ul
        v-else
        class="run-list"
      >
        <li
          v-for="run in activeRuns"
          :key="run.id"
          class="run-item"
        >
          <StatusBadge
            :state="run.status"
            :label="RUN_STATUS_LABELS[run.status]"
          />
          <span class="run-kind">{{ RUN_TYPE_LABELS[run.run_type] }}</span>
          <span class="muted small mono">{{ run.id }}</span>
        </li>
      </ul>
    </section>

    <!-- 评审入口：不伪造待处理数量。 -->
    <section
      class="panel"
      aria-label="待处理评审"
    >
      <header class="panel-head">
        <h2>待处理评审</h2>
      </header>
      <Boundary
        tone="info"
        title="暂无新的待处理评审"
      >
        当前没有需要立即复核的论文；可从左侧进入评审工作台查看已有论文、主张与修订记录。
      </Boundary>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  text-wrap: balance;
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
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-head h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}
.link {
  border: 0;
  background: none;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 650;
  cursor: pointer;
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
.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.project-card {
  width: 100%;
  text-align: left;
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--subtle-bg);
  cursor: pointer;
  font: inherit;
}
.project-card:hover {
  border-color: #b8c4d5;
  background: var(--primary-soft);
}
.project-title {
  font-weight: 700;
}
.project-rq {
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.project-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 2px;
}
.stage-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.run-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.run-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.run-kind {
  font-weight: 700;
  font-size: var(--font-size-sm);
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: var(--font-size-xs);
}
.mono {
  font-family: var(--mono);
}
</style>
