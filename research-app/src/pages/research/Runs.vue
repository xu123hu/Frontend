<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Pause, X, Clock, CheckCircle2, AlertCircle, Loader2, Activity } from 'lucide-vue-next';
import { AppButton, AppCard } from '@shared/ui';
import { apiRequest } from '@app/api/client';

interface ResearchRun {
  id: string;
  project_id: string;
  run_type: string;
  status: string;
  reasoning_policy_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  budget?: Record<string, unknown>;
}

const router = useRouter();
const runs = ref<ResearchRun[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const selectedRunId = ref<string | null>(null);

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  queued: { label: '排队中', color: '#64748b', icon: Clock },
  running: { label: '运行中', color: '#6366f1', icon: Loader2 },
  waiting_for_approval: { label: '待审批', color: '#f59e0b', icon: AlertCircle },
  paused: { label: '已暂停', color: '#64748b', icon: Pause },
  completed: { label: '已完成', color: '#10b981', icon: CheckCircle2 },
  failed: { label: '失败', color: '#ef4444', icon: AlertCircle },
  cancelled: { label: '已取消', color: '#64748b', icon: X },
};

const selectedRun = computed(() => runs.value.find((r) => r.id === selectedRunId.value) ?? null);

async function fetchRuns(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiRequest<ResearchRun[]>('/runs', { query: { limit: 50 } });
    runs.value = response.data ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载运行列表失败';
  } finally {
    loading.value = false;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: '#64748b', icon: Clock };
}

onMounted(() => {
  fetchRuns();
});
</script>

<template>
  <div class="page runs-center">
    <header class="page-head">
      <div>
        <h1>运行中心</h1>
        <p>管家任务编排运行状态、SSE 进度、子任务树与审批卡。</p>
      </div>
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        :disabled="loading"
        @click="fetchRuns"
      >
        <Activity :size="14" /> 刷新
      </AppButton>
    </header>

    <div
      v-if="loading"
      class="loading-state"
    >
      <Loader2
        :size="24"
        class="spin"
      /> 加载运行列表…
    </div>

    <div
      v-else-if="error"
      class="error-state"
      role="alert"
    >
      <AlertCircle :size="20" /> {{ error }}
      <AppButton
        type="button"
        size="sm"
        @click="fetchRuns"
      >
        重试
      </AppButton>
    </div>

    <div
      v-else-if="runs.length === 0"
      class="empty-state"
    >
      <Activity :size="32" />
      <p>暂无运行记录</p>
      <p class="empty-hint">
        在首页输入研究问题启动管家研究循环
      </p>
      <AppButton
        type="button"
        @click="router.push({ name: 'home' })"
      >
        返回首页
      </AppButton>
    </div>

    <div
      v-else
      class="runs-layout"
    >
      <div class="runs-list">
        <AppCard
          v-for="run in runs"
          :key="run.id"
          class="run-card"
          :class="{ active: run.id === selectedRunId }"
          @click="selectedRunId = run.id"
        >
          <div class="run-card-head">
            <span class="run-type">{{ run.run_type }}</span>
            <span
              class="run-status"
              :style="{ color: statusMeta(run.status).color }"
            >
              <component
                :is="statusMeta(run.status).icon"
                :size="12"
                :class="{ spin: run.status === 'running' }"
              />
              {{ statusMeta(run.status).label }}
            </span>
          </div>
          <div class="run-card-body">
            <div class="run-id">
              {{ run.id.slice(0, 8) }}…
            </div>
            <div class="run-meta">
              <span>策略: {{ run.reasoning_policy_id }}</span>
              <span>{{ formatTime(run.created_at) }}</span>
            </div>
          </div>
        </AppCard>
      </div>

      <div
        v-if="selectedRun"
        class="run-detail"
      >
        <AppCard class="detail-card">
          <h2>运行详情</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <label>运行 ID</label>
              <value>{{ selectedRun.id }}</value>
            </div>
            <div class="detail-item">
              <label>类型</label>
              <value>{{ selectedRun.run_type }}</value>
            </div>
            <div class="detail-item">
              <label>状态</label>
              <value :style="{ color: statusMeta(selectedRun.status).color }">
                {{ statusMeta(selectedRun.status).label }}
              </value>
            </div>
            <div class="detail-item">
              <label>推理策略</label>
              <value>{{ selectedRun.reasoning_policy_id }}</value>
            </div>
            <div class="detail-item">
              <label>创建时间</label>
              <value>{{ formatTime(selectedRun.created_at) }}</value>
            </div>
            <div class="detail-item">
              <label>更新时间</label>
              <value>{{ formatTime(selectedRun.updated_at) }}</value>
            </div>
          </div>
          <div class="detail-actions">
            <AppButton
              type="button"
              size="sm"
              variant="secondary"
              @click="router.push({ name: 'home' })"
            >
              返回首页
            </AppButton>
          </div>
        </AppCard>
      </div>

      <div
        v-else
        class="run-detail empty-detail"
      >
        <Activity :size="24" />
        <p>选择左侧运行查看详情</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.runs-center { padding: 24px; max-width: 1200px; margin: 0 auto; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-head h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: var(--s16-text, #0f172a); }
.page-head p { margin: 0; color: var(--s16-text-secondary, #64748b); font-size: 14px; }
.loading-state, .error-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: var(--s16-text-secondary, #64748b); }
.error-state { color: var(--s16-danger, #ef4444); }
.empty-hint { font-size: 13px; opacity: 0.7; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.runs-layout { display: grid; grid-template-columns: 360px 1fr; gap: 20px; }
.runs-list { display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow-y: auto; }
.run-card { cursor: pointer; transition: all 0.15s; border: 1px solid var(--s16-border, #e2e8f0); }
.run-card:hover { border-color: var(--s16-primary, #6366f1); }
.run-card.active { border-color: var(--s16-primary, #6366f1); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
.run-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.run-type { font-weight: 600; font-size: 14px; color: var(--s16-text, #0f172a); }
.run-status { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
.run-card-body { display: flex; flex-direction: column; gap: 4px; }
.run-id { font-family: monospace; font-size: 12px; color: var(--s16-text-secondary, #64748b); }
.run-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--s16-text-secondary, #64748b); }
.run-detail { min-height: 400px; }
.detail-card h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: var(--s16-text, #0f172a); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; color: var(--s16-text-secondary, #64748b); font-weight: 500; }
.detail-item value { font-size: 14px; color: var(--s16-text, #0f172a); word-break: break-all; }
.detail-actions { display: flex; gap: 8px; }
.empty-detail { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--s16-text-secondary, #64748b); border: 1px dashed var(--s16-border, #e2e8f0); border-radius: 12px; }
</style>
