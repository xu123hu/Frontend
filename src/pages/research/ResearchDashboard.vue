<template>
  <div class="rs-page rs-dashboard">
    <!-- 加载态 -->
    <div v-if="loading" class="rs-dashboard-loading">
      <div class="rs-loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- 1. 页面头部 -->
      <div class="rs-page-header">
        <div class="rs-page-eyebrow">Dashboard</div>
        <h1 class="rs-page-title">早上好，{{ userName }}</h1>
        <p class="rs-page-subtitle">
          {{ formattedDate }} · {{ pendingTasksCount }} 个待处理任务 · {{ newPapersCount }} 篇新文献
        </p>
      </div>

      <!-- 2. 焦点任务条 -->
      <div v-if="dashboard?.focusTask" class="rs-focus-strip">
        <div class="rs-focus-icon">🎯</div>
        <div class="rs-focus-text">
          <strong>{{ dashboard.focusTask.title }}</strong>
          <p>{{ dashboard.focusTask.description }}</p>
        </div>
        <div class="rs-progress-ring" :style="{ width: '52px', height: '52px' }">
          <svg width="52" height="52">
            <circle
              class="rs-progress-ring-track"
              cx="26" cy="26" r="22"
              stroke-width="4"
            />
            <circle
              class="rs-progress-ring-fill"
              cx="26" cy="26" r="22"
              stroke-width="4"
              :stroke-dasharray="ringCircumference"
              :stroke-dashoffset="ringOffset"
            />
          </svg>
          <span class="rs-progress-ring-value">{{ dashboard.focusTask.progress }}%</span>
        </div>
        <button class="rs-btn rs-btn-primary rs-btn-sm" @click="continueWork">
          继续工作 →
        </button>
      </div>

      <!-- 3. 指标网格 -->
      <div class="rs-metric-grid">
        <div class="rs-metric-card">
          <div class="rs-metric-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="rs-metric-value">
            <div class="rs-metric-label">进行中项目</div>
            <div class="rs-metric-number">{{ dashboard?.projectsCount ?? 0 }}</div>
            <div class="rs-metric-delta"><b>+1</b> 本月新增</div>
          </div>
        </div>

        <div class="rs-metric-card">
          <div class="rs-metric-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <div class="rs-metric-value">
            <div class="rs-metric-label">文献总量</div>
            <div class="rs-metric-number">{{ dashboard?.literatureCount ?? 0 }}</div>
            <div class="rs-metric-delta"><b>+12</b> 本周新增</div>
          </div>
        </div>

        <div class="rs-metric-card">
          <div class="rs-metric-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="rs-metric-value">
            <div class="rs-metric-label">已验证证据</div>
            <div class="rs-metric-number">{{ dashboard?.verifiedEvidence ?? 0 }}</div>
            <div class="rs-metric-delta"><b>+5</b> 本周新增</div>
          </div>
        </div>

        <div class="rs-metric-card">
          <div class="rs-metric-icon amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div class="rs-metric-value">
            <div class="rs-metric-label">本周运行</div>
            <div class="rs-metric-number">{{ dashboard?.weeklyRuns ?? 0 }}</div>
            <div class="rs-metric-delta"><b>{{ dashboard?.successRate ?? 0 }}%</b> 成功率</div>
          </div>
        </div>
      </div>

      <!-- 4. 双栏仪表盘网格 -->
      <div class="rs-dashboard-grid">
        <!-- 左栏：我的项目 -->
        <div class="rs-panel">
          <div class="rs-panel-header">
            <div class="rs-panel-title-group">
              <h2>我的项目</h2>
              <p>按最近活动排序</p>
            </div>
            <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="goToProjects">
              查看全部 →
            </button>
          </div>
          <div class="rs-project-list">
            <div
              v-for="(project, index) in dashboard?.recentProjects?.slice(0, 3) ?? []"
              :key="project.id"
              class="rs-project-row"
              @click="goToProject(project)"
            >
              <div class="rs-project-symbol" :class="projectColors[index % 3]">
                {{ project.name.charAt(0) }}
              </div>
              <div class="rs-project-details">
                <strong>{{ project.name }}</strong>
                <small>{{ project.tags?.slice(0, 2).join(' · ') }}</small>
                <div class="rs-project-progress-bar">
                  <i :style="{ width: project.progress + '%' }"></i>
                </div>
              </div>
              <div class="rs-project-meta">
                <b>{{ project.progress }}%</b>
                <small>{{ statusText(project.status) }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- 右栏：最近动态 -->
        <div class="rs-panel">
          <div class="rs-panel-header">
            <div class="rs-panel-title-group">
              <h2>最近动态</h2>
              <p>过去 48 小时</p>
            </div>
          </div>
          <div class="rs-timeline">
            <div
              v-for="item in dashboard?.recentActivity?.slice(0, 4) ?? []"
              :key="item.id"
              class="rs-timeline-item"
            >
              <div class="rs-timeline-icon" :class="getActivityColor(item.type)">
                {{ getActivityIcon(item.type) }}
              </div>
              <div class="rs-timeline-content">
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
                <small>{{ formatTime(item.time) }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. 快速开始工作流面板 -->
      <div class="rs-panel">
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2>快速开始工作流</h2>
            <p>选一个模板，AI 帮你跑通全流程</p>
          </div>
        </div>
        <div class="rs-panel-body">
          <div class="rs-workflow-grid">
            <div
              v-for="workflow in workflows"
              :key="workflow.id"
              class="rs-workflow-card"
              @click="startWorkflow(workflow)"
            >
              <div class="rs-workflow-icon">{{ workflow.icon }}</div>
              <div class="rs-workflow-title">{{ workflow.title }}</div>
              <div class="rs-workflow-desc">{{ workflow.description }}</div>
              <div class="rs-workflow-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { researchDashboardApi } from '@/api/research'
import type { DashboardData, ResearchProject, ActivityItem } from '@/types/research'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const loading = ref(true)
const dashboard = ref<DashboardData | null>(null)

// 工作流配置
const workflows = [
  {
    id: 'literature-review',
    icon: '📚',
    title: '文献综述流水线',
    description: '一键导入 100 篇 + 提取证据 + 生成综述',
    targetView: '/research/literature',
  },
  {
    id: 'theorem-verify',
    icon: '🧮',
    title: '定理验证流水线',
    description: '输入命题 + 自动 6 种验证 + 生成证据',
    targetView: '/research/verify',
  },
  {
    id: 'paper-review',
    icon: '📝',
    title: '论文初审流水线',
    description: '上传 PDF + 自动分析 + 生成报告',
    targetView: '/research/review',
  },
  {
    id: 'education-analysis',
    icon: '📊',
    title: '教育数据分析',
    description: '选择数据 + 隐私检查 + 生成报告',
    targetView: '/research/education',
  },
]

// 项目颜色映射
const projectColors = ['purple', 'blue', 'teal']

// 计算属性
const userName = computed(() => {
  // 从 auth store 获取昵称，去掉姓氏显示"明远"风格
  const name = authStore.nickname || '研究员'
  // 如果名字是三个字，取后两个字；否则取全名
  return name.length >= 3 ? name.slice(1) : name
})

const formattedDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[now.getDay()]
  return `${year}年${month}月${day}日 ${weekday}`
})

const pendingTasksCount = computed(() => {
  // 从 mock 数据估算：每个项目的 todo 任务数
  return 8
})

const newPapersCount = computed(() => {
  // 本周新增文献数
  return 12
})

const ringCircumference = 2 * Math.PI * 22 // r=22

const ringOffset = computed(() => {
  const progress = dashboard.value?.focusTask?.progress ?? 0
  return ringCircumference - (progress / 100) * ringCircumference
})

// 方法
async function fetchDashboard() {
  loading.value = true
  try {
    const data = await researchDashboardApi.overview()
    dashboard.value = data
  } catch (e) {
    console.error('Failed to fetch dashboard:', e)
    toastStore.error('加载仪表盘数据失败')
  } finally {
    loading.value = false
  }
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    active: '进行中',
    paused: '已暂停',
    completed: '已完成',
  }
  return map[status] || status
}

function getActivityColor(type: string): string {
  const map: Record<string, string> = {
    verify: 'green',
    literature: 'blue',
    lean_build: 'purple',
    analysis: 'amber',
    review: 'amber',
    evidence: 'green',
  }
  return map[type] || 'brand'
}

function getActivityIcon(type: string): string {
  const map: Record<string, string> = {
    verify: '✓',
    literature: '📖',
    lean_build: '⟨/⟩',
    analysis: '📈',
    review: '📋',
    evidence: '🛡',
  }
  return map[type] || '•'
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return `${date.getMonth() + 1}/${date.getDate()}`
}

function continueWork() {
  const target = dashboard.value?.focusTask?.targetView
  if (target) {
    router.push(target)
  }
}

function goToProject(project: ResearchProject) {
  router.push({ path: '/research/project', query: { id: project.id } })
}

function goToProjects() {
  router.push('/research/project')
}

function startWorkflow(workflow: typeof workflows[0]) {
  toastStore.success(`已启动「${workflow.title}」`)
  router.push(workflow.targetView)
}

onMounted(() => {
  fetchDashboard()
})
</script>

<style scoped>
/* ---------- 加载态 ---------- */
.rs-dashboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
  color: var(--rs-text-muted);
}

.rs-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--rs-border-default);
  border-top-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 焦点任务条自定义 ---------- */
.rs-focus-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.rs-focus-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--rs-radius-md);
  background: var(--rs-brand-500-soft-2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.rs-focus-text {
  flex: 1;
  min-width: 0;
}

.rs-focus-text strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-focus-text p {
  font-size: 13px;
  color: var(--rs-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-focus-strip .rs-progress-ring {
  flex-shrink: 0;
}

.rs-focus-strip .rs-btn {
  flex-shrink: 0;
  margin-left: 4px;
}

/* ---------- 指标卡片自定义 ---------- */
.rs-metric-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
}

.rs-metric-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rs-metric-icon svg {
  width: 22px;
  height: 22px;
}

.rs-metric-icon.purple {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-metric-icon.blue {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-metric-icon.green {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-metric-icon.amber {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
}

.rs-metric-value {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-metric-label {
  font-size: 13px;
  color: var(--rs-text-secondary);
  order: 1;
}

.rs-metric-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
  order: 0;
  margin-bottom: 2px;
}

.rs-metric-delta {
  font-size: 12px;
  color: var(--rs-text-muted);
  order: 2;
  margin-top: 4px;
}

.rs-metric-delta b {
  color: var(--rs-success);
  font-weight: 600;
}

.rs-metric-card:last-child .rs-metric-delta b {
  color: var(--rs-warning);
}

/* ---------- 面板标题组 ---------- */
.rs-panel-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-panel-title-group h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin: 0;
}

.rs-panel-title-group p {
  font-size: 12px;
  color: var(--rs-text-muted);
  margin: 0;
}

/* ---------- 项目列表自定义 ---------- */
.rs-project-list {
  padding: 4px 0;
}

.rs-project-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background var(--rs-transition-fast);
  border-bottom: 1px solid var(--rs-border-subtle);
}

.rs-project-row:last-child {
  border-bottom: none;
}

.rs-project-row:hover {
  background: var(--rs-bg-surface-2);
}

.rs-project-symbol {
  width: 40px;
  height: 40px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.rs-project-symbol.purple {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-project-symbol.blue {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-project-symbol.teal {
  background: rgba(45, 212, 191, 0.12);
  color: #2dd4bf;
}

.rs-project-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rs-project-details strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-project-details small {
  font-size: 12px;
  color: var(--rs-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-project-progress-bar {
  height: 4px;
  background: var(--rs-bg-surface-3);
  border-radius: 2px;
  overflow: hidden;
}

.rs-project-progress-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--rs-brand-500), var(--rs-brand-400));
  border-radius: 2px;
  transition: width var(--rs-transition-slow);
}

.rs-project-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  min-width: 60px;
}

.rs-project-meta b {
  font-size: 15px;
  font-weight: 700;
  color: var(--rs-text-primary);
}

.rs-project-meta small {
  font-size: 11px;
  color: var(--rs-text-muted);
}

/* ---------- 时间线自定义 ---------- */
.rs-timeline {
  padding: 16px;
  position: relative;
}

.rs-timeline-item {
  display: flex;
  gap: 12px;
  padding-bottom: 18px;
  position: relative;
}

.rs-timeline-item:last-child {
  padding-bottom: 0;
}

.rs-timeline-item::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 36px;
  bottom: 0;
  width: 2px;
  background: var(--rs-border-default);
}

.rs-timeline-item:last-child::before {
  display: none;
}

.rs-timeline-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.rs-timeline-icon.green {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-timeline-icon.blue {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-timeline-icon.purple {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.rs-timeline-icon.amber {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
}

.rs-timeline-icon.brand {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-timeline-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}

.rs-timeline-content strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-timeline-content p {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rs-timeline-content small {
  font-size: 11px;
  color: var(--rs-text-muted);
  margin-top: 2px;
}

/* ---------- 工作流卡片自定义 ---------- */
.rs-panel-body {
  padding: 16px;
}

.rs-workflow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.rs-workflow-card {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 18px;
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rs-workflow-card:hover {
  border-color: var(--rs-brand-500-soft-2);
  box-shadow: var(--rs-shadow-glow);
  transform: translateY(-2px);
  background: var(--rs-bg-surface-3);
}

.rs-workflow-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--rs-radius-md);
  background: var(--rs-brand-500-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 4px;
}

.rs-workflow-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-workflow-desc {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
  flex: 1;
}

.rs-workflow-arrow {
  align-self: flex-end;
  width: 20px;
  height: 20px;
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
  margin-top: 4px;
}

.rs-workflow-card:hover .rs-workflow-arrow {
  color: var(--rs-brand-400);
  transform: translateX(3px);
}

.rs-workflow-arrow svg {
  width: 20px;
  height: 20px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1280px) {
  .rs-metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .rs-workflow-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
