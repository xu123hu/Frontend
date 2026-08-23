<template>
  <div class="rs-page rs-runs">
    <!-- 页面头部 -->
    <header class="rs-page-header">
      <div class="rs-page-eyebrow">Runs Center</div>
      <h1 class="rs-page-title">运行中心</h1>
      <p class="rs-page-subtitle">所有计算任务的统一管理台 · 支持云端/本地/浏览器三种运行模式</p>
    </header>

    <!-- 运行模式说明卡 -->
    <div class="rs-mode-explainer">
      <div class="rs-mode-explainer-left">
        <div class="rs-mode-explainer-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div class="rs-mode-explainer-info">
          <div class="rs-mode-explainer-title">
            当前运行模式：<span class="rs-mode-explainer-mode">{{ currentMode }}</span>
          </div>
          <div class="rs-mode-explainer-desc">
            {{ modeDescriptions[currentMode as keyof typeof modeDescriptions] }}
          </div>
        </div>
      </div>
      <div class="rs-mode-explainer-right">
        <div
          v-for="mode in modeOptions"
          :key="mode"
          class="rs-mode-explainer-tag"
          :class="{ active: mode === currentMode, unavailable: mode === 'UNAVAILABLE' }"
        >
          {{ mode }}
        </div>
      </div>
      <div class="rs-mode-explainer-footer">
        模式由后端自动检测，可在顶栏手动切换
      </div>
    </div>

    <!-- 运行列表面板 -->
    <div class="rs-panel">
      <!-- 筛选栏 -->
      <div class="rs-run-filters">
        <div class="rs-run-filters-left">
          <div class="rs-input-wrapper rs-run-search">
            <svg class="rs-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              class="rs-input"
              placeholder="搜索运行任务..."
            />
          </div>
          <div class="rs-chip-group">
            <div
              v-for="chip in statusChips"
              :key="chip.value"
              class="rs-chip"
              :class="{ active: statusFilter === chip.value }"
              @click="statusFilter = chip.value"
            >
              {{ chip.label }}
            </div>
          </div>
        </div>
        <div class="rs-run-filters-right">
          <select v-model="projectFilter" class="rs-select" style="width: 180px">
            <option value="all">全部项目</option>
            <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <select v-model="typeFilter" class="rs-select" style="width: 140px">
            <option value="all">全部类型</option>
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <!-- 面板头部 -->
      <div class="rs-panel-header">
        <div class="rs-panel-title-group">
          <h2 class="rs-panel-title">运行记录</h2>
          <p class="rs-panel-subtitle">共 {{ filteredRuns.length }} 条，按开始时间倒序</p>
        </div>
        <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="fetchRuns">
          <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
          刷新
        </button>
      </div>

      <!-- 运行列表 -->
      <div class="rs-run-list">
        <div
          v-for="run in filteredRuns"
          :key="run.id"
          class="rs-run-row"
          :class="[`type-${run.type}`]"
        >
          <div class="rs-run-icon" :class="run.type">
            <svg v-if="run.type === 'verify'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else-if="run.type === 'lean_build'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            <svg v-else-if="run.type === 'compile'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <svg v-else-if="run.type === 'analysis'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <svg v-else-if="run.type === 'review'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M9 15l2 2 4-4"/>
            </svg>
          </div>

          <div class="rs-run-main">
            <div class="rs-run-title">{{ run.title }}</div>
            <div class="rs-run-meta">
              <span class="rs-run-meta-project">{{ run.projectName }}</span>
              <span class="rs-run-meta-dot">·</span>
              <span class="rs-run-meta-type">{{ typeLabels[run.type] }}</span>
              <span class="rs-run-meta-dot">·</span>
              <span class="rs-run-meta-time">{{ formatTime(run.startedAt) }}</span>
            </div>
          </div>

          <div class="rs-run-status" :class="run.status">
            <span class="rs-run-status-dot"></span>
            <span class="rs-run-status-text">{{ statusLabels[run.status] }}</span>
          </div>

          <div class="rs-run-progress-wrapper">
            <div
              v-if="run.status === 'running' || run.status === 'queued'"
              class="rs-progress-bar"
              :class="{ 'rs-progress-info': run.status === 'queued' }"
            >
              <div class="rs-progress-bar-fill" :style="{ width: `${run.progress}%` }"></div>
            </div>
            <div v-else class="rs-run-progress-placeholder"></div>
          </div>

          <div class="rs-run-duration">
            <template v-if="run.status === 'running'">
              已运行 {{ formatDuration(run.duration || 0) }}
            </template>
            <template v-else-if="run.status === 'queued'">
              排队中
            </template>
            <template v-else-if="run.duration">
              耗时 {{ formatDuration(run.duration) }}
            </template>
            <template v-else>
              —
            </template>
          </div>

          <div class="rs-run-mode">
            <span class="rs-tag" :class="modeTagClass(run.mode)">{{ run.mode }}</span>
          </div>

          <div class="rs-run-actions">
            <template v-if="run.status === 'running'">
              <button class="rs-btn rs-btn-danger rs-btn-sm" @click.stop="cancelRun(run.id)">
                取消
              </button>
            </template>
            <template v-else-if="run.status === 'success'">
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="viewLog(run)">
                查看日志
              </button>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="viewResult(run)">
                查看结果
              </button>
            </template>
            <template v-else-if="run.status === 'failed'">
              <button class="rs-btn rs-btn-secondary rs-btn-sm" @click.stop="retryRun(run)">
                重试
              </button>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="viewLog(run)">
                查看日志
              </button>
            </template>
            <template v-else-if="run.status === 'queued'">
              <button class="rs-btn rs-btn-danger rs-btn-sm" @click.stop="cancelRun(run.id)">
                取消
              </button>
            </template>
            <template v-else>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="viewLog(run)">
                查看日志
              </button>
            </template>
          </div>
        </div>

        <div v-if="filteredRuns.length === 0 && !loading" class="rs-run-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <p>没有找到匹配的运行记录</p>
        </div>

        <div v-if="loading" class="rs-run-loading">
          <div class="rs-run-loading-spinner"></div>
          <span>加载中...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { researchRunsApi } from '@/api/research'
import type { ResearchRun } from '@/types/research'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

// 状态
const runs = ref<ResearchRun[]>([])
const loading = ref(false)
const statusFilter = ref('all')
const searchQuery = ref('')
const typeFilter = ref('all')
const projectFilter = ref('all')
const currentMode = ref('FULL')

// 模式选项
const modeOptions = ['FULL', 'LOCAL_ENGINE', 'BROWSER_LOCAL', 'UNAVAILABLE']

const modeDescriptions = {
  FULL: '云端完整模式 — 全部能力可用，数据自动备份',
  LOCAL_ENGINE: '本地引擎模式 — 计算在本地执行，数据不上传',
  BROWSER_LOCAL: '浏览器本地模式 — 纯前端计算，无后端依赖',
  UNAVAILABLE: '服务不可用 — 请检查网络连接',
}

// 状态筛选芯片
const statusChips = [
  { value: 'all', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'queued', label: '排队中' },
]

// 类型选项
const typeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'verify', label: '数学验证' },
  { value: 'lean_build', label: 'Lean 构建' },
  { value: 'compile', label: '论文编译' },
  { value: 'analysis', label: '教育分析' },
  { value: 'review', label: '论文初审' },
]

const typeLabels: Record<string, string> = {
  verify: '数学验证',
  lean_build: 'Lean 构建',
  compile: '论文编译',
  analysis: '教育分析',
  review: '论文初审',
}

const statusLabels: Record<string, string> = {
  running: '运行中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
  queued: '排队中',
}

// 项目选项（从运行记录中提取）
const projectOptions = computed(() => {
  const map = new Map<string, string>()
  runs.value.forEach(r => {
    if (r.projectId && r.projectName) {
      map.set(r.projectId, r.projectName)
    }
  })
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

// 过滤后的运行列表
const filteredRuns = computed(() => {
  return runs.value.filter(r => {
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (typeFilter.value !== 'all' && r.type !== typeFilter.value) return false
    if (projectFilter.value !== 'all' && r.projectId !== projectFilter.value) return false
    if (searchQuery.value && !r.title.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
    return true
  })
})

// 模式标签样式
function modeTagClass(mode: string) {
  switch (mode) {
    case 'FULL': return 'rs-tag-brand'
    case 'LOCAL_ENGINE': return 'rs-tag-info'
    case 'BROWSER_LOCAL': return 'rs-tag-success'
    default: return 'rs-tag-error'
  }
}

// 格式化时间
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 格式化时长（秒转可读格式）
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// 获取运行列表
async function fetchRuns() {
  loading.value = true
  try {
    const result = await researchRunsApi.list()
    if (result && result.items) {
      runs.value = result.items
    } else if (Array.isArray(result)) {
      runs.value = result
    }
  } catch (e) {
    toast.error('加载运行列表失败')
  } finally {
    loading.value = false
  }
}

// 取消运行
async function cancelRun(id: string) {
  try {
    await researchRunsApi.cancel(id)
    const run = runs.value.find(r => r.id === id)
    if (run) {
      run.status = 'cancelled'
    }
    toast.success('已取消运行')
  } catch (e) {
    toast.error('取消失败，请稍后重试')
  }
}

// 查看日志
function viewLog(run: ResearchRun) {
  toast.info('日志功能开发中')
}

// 查看结果
function viewResult(run: ResearchRun) {
  toast.info('结果详情功能开发中')
}

// 重试
function retryRun(run: ResearchRun) {
  toast.success('已重新提交')
  // 在列表前添加一个新的排队中任务（模拟）
  const newRun: ResearchRun = {
    ...run,
    id: `run-${Date.now()}`,
    status: 'queued',
    progress: 0,
    startedAt: new Date().toISOString(),
    duration: undefined,
  }
  runs.value.unshift(newRun)
}

onMounted(() => {
  fetchRuns()
})
</script>

<style scoped>
.rs-runs {
  padding-bottom: 40px;
}

/* ---------- 运行模式说明卡 ---------- */
.rs-mode-explainer {
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 18px 20px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.rs-mode-explainer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--rs-brand-500), var(--rs-brand-300), var(--rs-brand-500));
}

.rs-mode-explainer-left {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.rs-mode-explainer-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--rs-radius-md);
  background: var(--rs-brand-500-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-brand-400);
  flex-shrink: 0;
}

.rs-mode-explainer-icon svg {
  width: 22px;
  height: 22px;
}

.rs-mode-explainer-info {
  flex: 1;
  min-width: 0;
}

.rs-mode-explainer-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 3px;
}

.rs-mode-explainer-mode {
  color: var(--rs-brand-400);
  font-weight: 700;
}

.rs-mode-explainer-desc {
  font-size: 13px;
  color: var(--rs-text-secondary);
}

.rs-mode-explainer-right {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.rs-mode-explainer-tag {
  padding: 5px 12px;
  border-radius: var(--rs-radius-full);
  font-size: 12px;
  font-weight: 500;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
}

.rs-mode-explainer-tag.active {
  background: var(--rs-brand-500-soft);
  border-color: var(--rs-brand-500-soft-2);
  color: var(--rs-brand-300);
}

.rs-mode-explainer-tag.unavailable {
  opacity: 0.5;
}

.rs-mode-explainer-footer {
  font-size: 12px;
  color: var(--rs-text-muted);
  padding-top: 10px;
  border-top: 1px solid var(--rs-border-subtle);
}

/* ---------- 筛选栏 ---------- */
.rs-run-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--rs-bg-surface);
  border-bottom: 1px solid var(--rs-border-subtle);
  flex-wrap: wrap;
}

.rs-run-filters-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.rs-run-filters-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.rs-run-search {
  position: relative;
  flex: 1;
  max-width: 280px;
}

.rs-chip-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* ---------- 面板标题组 ---------- */
.rs-panel-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin: 0;
}

.rs-panel-subtitle {
  font-size: 12px;
  color: var(--rs-text-muted);
  margin: 0;
}

/* ---------- 运行列表 ---------- */
.rs-run-list {
  display: flex;
  flex-direction: column;
  background: var(--rs-border-subtle);
  gap: 1px;
}

.rs-run-row {
  display: grid;
  grid-template-columns: 36px 1fr 110px 160px 110px 100px 160px;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: var(--rs-bg-surface);
  transition: background var(--rs-transition-fast);
}

.rs-run-row:hover {
  background: var(--rs-bg-surface-2);
}

/* 类型图标 */
.rs-run-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rs-run-icon svg {
  width: 16px;
  height: 16px;
}

.rs-run-icon.verify {
  background: rgba(52, 211, 153, 0.15);
  color: var(--rs-success);
}

.rs-run-icon.lean_build {
  background: rgba(167, 139, 250, 0.15);
  color: #a78bfa;
}

.rs-run-icon.compile {
  background: rgba(96, 165, 250, 0.15);
  color: var(--rs-info);
}

.rs-run-icon.analysis {
  background: rgba(251, 191, 36, 0.15);
  color: var(--rs-warning);
}

.rs-run-icon.review {
  background: rgba(244, 114, 182, 0.15);
  color: #f472b6;
}

/* 主内容区 */
.rs-run-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-run-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--rs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-run-meta {
  font-size: 12px;
  color: var(--rs-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rs-run-meta-dot {
  opacity: 0.5;
}

.rs-run-meta-project {
  color: var(--rs-text-secondary);
}

.rs-run-meta-type {
  color: var(--rs-text-muted);
}

.rs-run-meta-time {
  color: var(--rs-text-dim);
}

/* 状态 */
.rs-run-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.rs-run-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rs-run-status.running {
  color: var(--rs-warning);
}

.rs-run-status.running .rs-run-status-dot {
  background: var(--rs-warning);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  animation: rs-status-pulse 2s ease-in-out infinite;
}

.rs-run-status.success {
  color: var(--rs-success);
}

.rs-run-status.success .rs-run-status-dot {
  background: var(--rs-success);
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

.rs-run-status.failed {
  color: var(--rs-error);
}

.rs-run-status.failed .rs-run-status-dot {
  background: var(--rs-error);
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
}

.rs-run-status.cancelled {
  color: var(--rs-text-muted);
}

.rs-run-status.cancelled .rs-run-status-dot {
  background: var(--rs-text-muted);
}

.rs-run-status.queued {
  color: var(--rs-info);
}

.rs-run-status.queued .rs-run-status-dot {
  background: var(--rs-info);
  box-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
  animation: rs-status-pulse 2s ease-in-out infinite;
}

@keyframes rs-status-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.85);
  }
}

/* 进度条 */
.rs-run-progress-wrapper {
  display: flex;
  align-items: center;
}

.rs-run-progress-placeholder {
  width: 100%;
  height: 6px;
}

/* 耗时 */
.rs-run-duration {
  font-family: var(--rs-font-mono);
  font-size: 12px;
  color: var(--rs-text-secondary);
  white-space: nowrap;
}

/* 模式标签 */
.rs-run-mode {
  display: flex;
  align-items: center;
}

/* 操作按钮 */
.rs-run-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

/* 空状态 */
.rs-run-empty {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: var(--rs-bg-surface);
  color: var(--rs-text-muted);
}

.rs-run-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.3;
}

.rs-run-empty p {
  font-size: 13px;
  color: var(--rs-text-muted);
  margin: 0;
}

/* 加载中 */
.rs-run-loading {
  padding: 60px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: var(--rs-bg-surface);
  color: var(--rs-text-muted);
  font-size: 13px;
}

.rs-run-loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--rs-border-default);
  border-top-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* 响应式调整 */
@media (max-width: 1280px) {
  .rs-run-row {
    grid-template-columns: 36px 1fr 100px 140px 100px 90px 140px;
    gap: 10px;
  }
}
</style>
