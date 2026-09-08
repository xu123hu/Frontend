<script setup lang="ts">
/**
 * 活动面板：本项目的真实运行记录（GET /runs，按 project_id 过滤）。
 * 每行 = 运行类型 + 状态 + 预算/耗时（有则显示）+ 时间；空态引导发起研究循环。
 */
import { computed } from 'vue';
import { AppChip } from '@shared/ui';
import EmptyState from '@shared/ui/EmptyState.vue';
import ErrorState from '@shared/ui/AppButton/ErrorState.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import { useRuns } from '@features/runs/use-runs';
import type { Run } from '@entities/run/types';

const props = defineProps<{ projectId: string }>();

const runsQuery = useRuns(30);
const projectRuns = computed(() => (runsQuery.data.value?.items ?? []).filter((r) => r.project_id === props.projectId));

const STATUS_TONE: Record<string, string> = {
  queued: 'var(--ailp-gray-500)',
  running: 'var(--ailp-primary-500)',
  waiting_for_approval: 'var(--ailp-warning-500)',
  paused: 'var(--ailp-gray-500)',
  completed: 'var(--ailp-success-500)',
  failed: 'var(--ailp-error-500)',
  cancelled: 'var(--ailp-gray-500)',
};
const RUN_TYPE_LABELS: Record<string, string> = {
  research_cycle: '研究循环',
  translation: '翻译',
  writing: '写作',
  compile: '编译',
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
function spentText(run: Run): string {
  const spent = run.spent;
  if (!spent) return '';
  const parts: string[] = [];
  if (spent.model_tokens) parts.push(`tokens ${spent.model_tokens}`);
  if (spent.runtime_seconds) parts.push(`${Math.round(spent.runtime_seconds)}s`);
  return parts.join(' · ');
}
</script>

<template>
  <div class="panel">
    <Skeleton
      v-if="runsQuery.isPending.value"
      label="运行记录加载中"
    />
    <ErrorState
      v-else-if="runsQuery.isError.value"
      title="运行记录加载失败"
      :reason="runsQuery.error.value?.message || '服务暂时不可用。'"
      tone="danger"
      retryable
      @retry="runsQuery.refetch()"
    />
    <EmptyState
      v-else-if="projectRuns.length === 0"
      title="本项目暂无运行记录"
      hint="在 AI 管家抽屉发起研究循环后，检索/假设生成/验证等活动会以运行记录形式出现在这里。"
    />
    <ul
      v-else
      class="run-list"
    >
      <li
        v-for="run in projectRuns"
        :key="run.id"
        class="run-item"
      >
        <AppChip
          tone="primary"
          size="sm"
        >
          {{ RUN_TYPE_LABELS[run.run_type] ?? run.run_type }}
        </AppChip>
        <span
          class="run-status"
          :style="{ color: STATUS_TONE[run.status] ?? 'var(--ailp-gray-500)' }"
        >
          {{ run.status }}
        </span>
        <span class="run-spent">{{ spentText(run) }}</span>
        <span class="run-time">{{ formatTime(run.created_at) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.run-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.run-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.run-item:last-child {
  border-bottom: none;
}
.run-status {
  font-weight: 600;
}
.run-spent {
  color: var(--text-muted);
  margin-left: auto;
}
.run-time {
  color: var(--text-weak);
  font-size: 12px;
}
</style>
