<template>
  <div class="rs-page rs-education">
    <!-- 1. 页面头部 -->
    <div class="rs-page-header">
      <div class="rs-page-eyebrow">Education Research</div>
      <h1 class="rs-page-title">教育研究台</h1>
      <p class="rs-page-subtitle">跨端协作的教育数据分析 · 隐私合规预检 · 一键生成研究报告</p>
    </div>

    <!-- 2. 步骤器 -->
    <div class="rs-stepper">
      <div
        v-for="(step, index) in steps"
        :key="step.id"
        class="rs-stepper-item"
        :class="{
          'rs-stepper-completed': index + 1 < currentStep,
          'rs-stepper-active': index + 1 === currentStep,
          'rs-stepper-pending': index + 1 > currentStep,
        }"
        @click="handleStepClick(index + 1)"
      >
        <div class="rs-stepper-circle">
          <svg v-if="index + 1 < currentStep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="rs-stepper-label">{{ step.label }}</div>
        <div v-if="index < steps.length - 1" class="rs-stepper-line">
          <div
            class="rs-stepper-line-fill"
            :style="{ width: index + 1 < currentStep ? '100%' : '0%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 3. 双栏布局 -->
    <div class="rs-g2">
      <!-- 左栏：配置面板 -->
      <div class="rs-panel rs-config-panel">
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2 class="rs-panel-title">选择数据集</h2>
            <p class="rs-panel-subtitle">选择用于分析的教育数据源</p>
          </div>
        </div>
        <div class="rs-panel-body">
          <!-- 数据集卡片 -->
          <div class="rs-dataset-list">
            <div
              v-for="dataset in datasetList"
              :key="dataset.id"
              class="rs-dataset-card"
              :class="{ 'rs-dataset-selected': selectedDataset === dataset.id }"
              @click="selectDataset(dataset.id)"
            >
              <div class="rs-dataset-card-header">
                <div class="rs-dataset-icon" :class="dataset.iconClass">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                </div>
                <div class="rs-dataset-check" v-if="selectedDataset === dataset.id">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div class="rs-dataset-name">{{ dataset.name }}</div>
              <div class="rs-dataset-desc">{{ dataset.description }}</div>
              <div class="rs-dataset-meta">
                <span class="rs-dataset-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {{ dataset.sampleSize }} 样本
                </span>
                <span class="rs-dataset-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  {{ dataset.featureCount }} 特征
                </span>
              </div>
              <div class="rs-dataset-source">
                <span class="rs-dataset-source-label">来源：</span>
                {{ dataset.source }}
              </div>
            </div>
          </div>
        </div>

        <!-- 指标配置区 -->
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2 class="rs-panel-title">分析指标</h2>
            <p class="rs-panel-subtitle">选择需要运行的分析维度</p>
          </div>
          <a class="rs-link-btn" @click="toggleSelectAll">
            {{ allSelected ? '反选' : '全选' }}
          </a>
        </div>
        <div class="rs-panel-body">
          <div class="rs-metric-list">
            <div
              v-for="metric in metrics"
              :key="metric.key"
              class="rs-metric-item"
              @click="toggleMetric(metric.key)"
            >
              <div
                class="rs-checkbox"
                :class="{ checked: selectedMetrics.includes(metric.key) }"
              >
                <div class="rs-checkbox-input"></div>
              </div>
              <div class="rs-metric-item-content">
                <div class="rs-metric-item-name">{{ metric.name }}</div>
                <div class="rs-metric-item-desc">{{ metric.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 隐私合规预检区 -->
        <div class="rs-privacy-card" :class="{ 'rs-privacy-passed': privacyChecked }">
          <div class="rs-privacy-header">
            <div class="rs-privacy-title-group">
              <div class="rs-privacy-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div class="rs-privacy-title">隐私合规预检</div>
            </div>
            <span class="rs-badge" :class="privacyChecked ? 'rs-badge-success' : 'rs-badge-warning'">
              {{ privacyChecked ? '已通过预检' : '待检查' }}
            </span>
          </div>
          <div class="rs-privacy-checklist">
            <div v-for="(item, i) in privacyItems" :key="i" class="rs-privacy-check-item">
              <div class="rs-privacy-check-icon" :class="{ 'rs-privacy-check-pass': privacyChecked }">
                <svg v-if="privacyChecked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span v-else class="rs-privacy-check-dot"></span>
              </div>
              <div class="rs-privacy-check-text">
                {{ item.label }}
                <span class="rs-privacy-check-detail">{{ item.detail }}</span>
              </div>
            </div>
          </div>
          <button
            class="rs-btn rs-btn-primary rs-btn-md rs-w-full"
            :disabled="privacyChecking"
            @click="runPrivacyCheck"
          >
            <svg v-if="privacyChecking" class="rs-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {{ privacyChecking ? '正在检查...' : '运行隐私预检' }}
          </button>
        </div>
      </div>

      <!-- 右栏：分析预览面板 -->
      <div class="rs-panel rs-preview-panel">
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2 class="rs-panel-title">分析预览</h2>
            <p class="rs-panel-subtitle">基于历史相似分析的参考结果</p>
          </div>
          <span class="rs-tag rs-tag-brand">
            <span class="rs-tag-dot"></span>
            基于历史相似分析
          </span>
        </div>

        <div class="rs-panel-body">
          <!-- 主要发现预览 -->
          <div class="rs-findings-preview">
            <div class="rs-section-label">主要发现预览</div>
            <div
              v-for="(finding, index) in findings"
              :key="index"
              class="rs-finding-card"
              :class="{ 'rs-finding-expanded': expandedFinding === index }"
              @click="toggleFinding(index)"
            >
              <div class="rs-finding-card-header">
                <div class="rs-finding-number">{{ index + 1 }}</div>
                <div class="rs-finding-title">{{ finding.title }}</div>
                <svg class="rs-finding-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              <div class="rs-finding-meta">
                <span class="rs-finding-confidence" :class="finding.confidenceClass">
                  置信度：{{ finding.confidence }}
                </span>
                <span class="rs-finding-sample">样本量：N={{ finding.sampleSize }}</span>
              </div>
              <div v-if="expandedFinding === index" class="rs-finding-detail">
                <p>{{ finding.description }}</p>
                <div class="rs-finding-tags">
                  <span v-for="tag in finding.tags" :key="tag" class="rs-chip">{{ tag }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 图表预览区 -->
          <div class="rs-chart-preview">
            <div class="rs-section-label">可视化预览</div>
            <div class="rs-chart-grid">
              <!-- 柱状图：知识掌握度分布 -->
              <div class="rs-chart-card">
                <div class="rs-chart-title">知识掌握度分布</div>
                <div class="rs-bar-chart">
                  <div class="rs-bar-chart-bars">
                    <div
                      v-for="(bar, i) in barChartData"
                      :key="i"
                      class="rs-bar-chart-item"
                    >
                      <div
                        class="rs-bar-chart-bar"
                        :style="{ height: bar.height + '%' }"
                      ></div>
                      <div class="rs-bar-chart-label">{{ bar.label }}</div>
                    </div>
                  </div>
                  <div class="rs-bar-chart-yaxis">
                    <span>100%</span>
                    <span>50%</span>
                    <span>0%</span>
                  </div>
                </div>
              </div>

              <!-- 折线图：学习参与度趋势 -->
              <div class="rs-chart-card">
                <div class="rs-chart-title">学习参与度趋势</div>
                <div class="rs-line-chart">
                  <svg viewBox="0 0 280 140" class="rs-line-chart-svg">
                    <!-- 网格线 -->
                    <line x1="0" y1="35" x2="280" y2="35" stroke="var(--rs-border-subtle)" stroke-width="1"/>
                    <line x1="0" y1="70" x2="280" y2="70" stroke="var(--rs-border-subtle)" stroke-width="1"/>
                    <line x1="0" y1="105" x2="280" y2="105" stroke="var(--rs-border-subtle)" stroke-width="1"/>
                    <!-- 折线 -->
                    <polyline
                      :points="lineChartPoints"
                      fill="none"
                      stroke="var(--rs-brand-400)"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <!-- 渐变填充 -->
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:var(--rs-brand-400);stop-opacity:0.3"/>
                        <stop offset="100%" style="stop-color:var(--rs-brand-400);stop-opacity:0"/>
                      </linearGradient>
                    </defs>
                    <polygon
                      :points="lineChartAreaPoints"
                      fill="url(#lineGradient)"
                    />
                    <!-- 数据点 -->
                    <circle
                      v-for="(p, i) in lineChartData"
                      :key="i"
                      :cx="40 + i * 40"
                      :cy="120 - p * 1.1"
                      r="3.5"
                      fill="var(--rs-bg-surface)"
                      stroke="var(--rs-brand-400)"
                      stroke-width="2"
                    />
                  </svg>
                  <div class="rs-line-chart-xaxis">
                    <span v-for="(label, i) in lineChartLabels" :key="i">{{ label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 跨端协作说明 -->
          <div class="rs-crossflow-section">
            <div class="rs-section-label">跨端协作流程</div>
            <div class="rs-crossflow-cards">
              <div class="rs-crossflow-card">
                <div class="rs-crossflow-icon student">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                </div>
                <div class="rs-crossflow-title">学生端</div>
                <div class="rs-crossflow-desc">数据采集（匿名化）</div>
                <div class="rs-crossflow-tag">数据提供方</div>
              </div>

              <div class="rs-crossflow-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>

              <div class="rs-crossflow-card">
                <div class="rs-crossflow-icon teacher">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div class="rs-crossflow-title">教师端</div>
                <div class="rs-crossflow-desc">教学情境（脱敏）</div>
                <div class="rs-crossflow-tag">情境注入</div>
              </div>

              <div class="rs-crossflow-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>

              <div class="rs-crossflow-card">
                <div class="rs-crossflow-icon research">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div class="rs-crossflow-title">研究端</div>
                <div class="rs-crossflow-desc">分析验证（可溯源）</div>
                <div class="rs-crossflow-tag">结果产出</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 底部操作栏 -->
    <div class="rs-action-bar">
      <div class="rs-action-bar-left">
        <button class="rs-btn rs-btn-ghost rs-btn-md" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          返回
        </button>
        <button class="rs-btn rs-btn-secondary rs-btn-md" @click="saveDraft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          保存草稿
        </button>
      </div>
      <div class="rs-action-bar-right">
        <span class="rs-estimate-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          预计耗时：约 3 分钟
        </span>
        <button class="rs-btn rs-btn-ghost rs-btn-md" @click="runPrivacyCheck">
          运行隐私预检
        </button>
        <button
          class="rs-btn rs-btn-primary rs-btn-lg"
          :disabled="!canRunAnalysis"
          @click="runAnalysis"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          运行分析
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { researchEducationApi } from '@/api/research'
import type { EducationAnalysis } from '@/types/research'

const router = useRouter()
const toastStore = useToastStore()

// ===== 状态管理 =====
const currentStep = ref(2)
const selectedDataset = ref('zhixue-v3')
const selectedMetrics = ref<string[]>(['trajectory', 'mastery', 'error-patterns'])
const privacyChecked = ref(false)
const privacyChecking = ref(false)
const datasets = ref<any[]>([])
const loading = ref(false)
const expandedFinding = ref<number | null>(null)

// ===== 步骤配置 =====
const steps = [
  { id: 'data', label: '选择数据' },
  { id: 'metrics', label: '配置指标' },
  { id: 'privacy', label: '隐私检查' },
  { id: 'run', label: '运行分析' },
]

// ===== 数据集 =====
const datasetList = [
  {
    id: 'zhixue-v3',
    name: '智学数研匿名数据集 v3',
    description: '经过严格匿名化处理的多源融合教育数据集',
    sampleSize: '12,480',
    featureCount: '86',
    source: '智学研究院',
    iconClass: 'primary',
  },
  {
    id: 'public-edu',
    name: '公开教育数据集集合',
    description: '包含多个公开基准教育数据集合',
    sampleSize: '45,200',
    featureCount: '124',
    source: '公开数据集',
    iconClass: 'info',
  },
  {
    id: 'custom',
    name: '自定义上传',
    description: '上传您自己的教育数据进行分析',
    sampleSize: '—',
    featureCount: '—',
    source: '本地上传',
    iconClass: 'muted',
  },
]

// ===== 指标列表 =====
const metrics = [
  { key: 'trajectory', name: '学习轨迹分析', description: '追踪学习者在知识点间的移动路径' },
  { key: 'mastery', name: '知识掌握度建模', description: '基于 IRT 和 DKT 模型估计知识掌握水平' },
  { key: 'error-patterns', name: '错题模式挖掘', description: '识别常见错误类型及其关联模式' },
  { key: 'prediction', name: '学习效果预测', description: '预测未来学习表现和成绩趋势' },
  { key: 'recommendation', name: '个性化推荐评估', description: '评估推荐算法对学习效果的影响' },
  { key: 'group-diff', name: '群体差异分析', description: '对比不同群体间的学习行为差异' },
  { key: 'temporal', name: '时序行为模式', description: '分析学习行为的时间序列模式' },
  { key: 'engagement', name: '参与度与留存', description: '衡量学习参与度和用户留存情况' },
]

// ===== 隐私检查项 =====
const privacyItems = [
  { label: '数据匿名化程度', detail: '（高）' },
  { label: '差分隐私可用', detail: '（ε=1.0）' },
  { label: '跨端数据最小化', detail: '' },
  { label: '合规框架', detail: '（GDPR / 个人信息保护法）' },
]

// ===== 发现预览 =====
const findings = [
  {
    title: '学生错题模式与知识掌握度呈显著负相关 (r=-0.72)',
    confidence: '高',
    confidenceClass: 'high',
    sampleSize: '1,247',
    description: '基于智学数研匿名数据集的分析显示，学生在特定知识点上的错误模式与其整体知识掌握度呈现强烈负相关。错题集中度越高的学生，整体知识掌握水平越低。这一发现支持了"错题集中反映知识薄弱点"的教学假设，为针对性干预提供了数据支撑。',
    tags: ['相关性分析', '错题模式', '知识掌握度'],
  },
  {
    title: '个性化推荐使练习效率提升约 23%',
    confidence: '中',
    confidenceClass: 'medium',
    sampleSize: '856',
    description: '对比实验表明，使用个性化推荐算法的实验组学生在单位练习时间内的知识掌握度提升幅度比对照组高出约 23%。中等置信度源于样本量限制和潜在混淆因素，建议扩大样本进一步验证。',
    tags: ['A/B 测试', '推荐系统', '学习效率'],
  },
  {
    title: '学习参与度在第 3 周出现明显下降拐点',
    confidence: '高',
    confidenceClass: 'high',
    sampleSize: '2,103',
    description: '时序分析显示，学习者的平均参与度在课程开始后的第 3 周出现显著下降，周活跃率从 87% 降至 62%。这一拐点与"中期倦怠"现象高度吻合，提示在第 2-3 周期间应加强学习支持和激励机制设计。',
    tags: ['时序分析', '参与度', '留存预测'],
  },
]

// ===== 图表数据 =====
const barChartData = [
  { label: '代数', height: 78 },
  { label: '几何', height: 65 },
  { label: '函数', height: 82 },
  { label: '概率', height: 54 },
  { label: '统计', height: 71 },
]

const lineChartData = [85, 82, 78, 62, 58, 55, 52]
const lineChartLabels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']

const lineChartPoints = computed(() => {
  return lineChartData.map((v, i) => `${40 + i * 40},${120 - v * 1.1}`).join(' ')
})

const lineChartAreaPoints = computed(() => {
  const points = lineChartData.map((v, i) => `${40 + i * 40},${120 - v * 1.1}`)
  return `${points.join(' ')} ${40 + (lineChartData.length - 1) * 40},120 40,120`
})

// ===== 计算属性 =====
const allSelected = computed(() => selectedMetrics.value.length === metrics.length)

const canRunAnalysis = computed(() => {
  return selectedDataset.value && selectedMetrics.value.length > 0 && privacyChecked.value
})

// ===== 交互方法 =====
function handleStepClick(step: number) {
  if (step <= currentStep.value) {
    currentStep.value = step
    toastStore.info(`已切换到步骤 ${step}：${steps[step - 1].label}`)
  } else {
    toastStore.warning('请先完成当前步骤')
  }
}

function selectDataset(id: string) {
  selectedDataset.value = id
  const ds = datasetList.find(d => d.id === id)
  toastStore.info(`已选择数据集：${ds?.name}`)
}

function toggleMetric(key: string) {
  const idx = selectedMetrics.value.indexOf(key)
  if (idx > -1) {
    selectedMetrics.value.splice(idx, 1)
  } else {
    selectedMetrics.value.push(key)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedMetrics.value = []
  } else {
    selectedMetrics.value = metrics.map(m => m.key)
  }
}

async function runPrivacyCheck() {
  if (privacyChecking.value) return
  privacyChecking.value = true
  privacyChecked.value = false

  try {
    // 模拟检查过程
    await new Promise(r => setTimeout(r, 1800))
    privacyChecked.value = true
    toastStore.success('隐私合规预检已通过')
  } catch (e) {
    toastStore.error('隐私检查失败，请重试')
  } finally {
    privacyChecking.value = false
  }
}

function toggleFinding(index: number) {
  expandedFinding.value = expandedFinding.value === index ? null : index
}

function goBack() {
  router.back()
}

function saveDraft() {
  toastStore.success('草稿已保存')
}

function runAnalysis() {
  if (!canRunAnalysis.value) {
    if (!privacyChecked.value) {
      toastStore.warning('请先运行隐私合规预检')
    } else if (selectedMetrics.value.length === 0) {
      toastStore.warning('请至少选择一个分析指标')
    }
    return
  }

  toastStore.success('分析任务已启动，正在前往运行中心...')
  setTimeout(() => {
    router.push('/research/runs')
  }, 800)
}

// ===== 数据加载 =====
async function loadData() {
  loading.value = true
  try {
    const data = await researchEducationApi.analyses()
    datasets.value = data
  } catch (e) {
    console.error('Failed to load education analyses:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ============================================================
   教育研究台页面样式
   ============================================================ */

.rs-page.rs-education {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 100px;
}

/* ---------- 步骤器 ---------- */
.rs-stepper {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 0 32px;
  gap: 0;
}

.rs-stepper-item {
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.rs-stepper-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  border: 2px solid var(--rs-border-strong);
  background: var(--rs-bg-surface);
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
  flex-shrink: 0;
  z-index: 2;
}

.rs-stepper-circle svg {
  width: 18px;
  height: 18px;
}

.rs-stepper-active .rs-stepper-circle {
  border-color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
  box-shadow: 0 0 0 4px var(--rs-brand-500-soft);
}

.rs-stepper-completed .rs-stepper-circle {
  border-color: var(--rs-success);
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-stepper-pending .rs-stepper-circle {
  border-color: var(--rs-border-default);
  color: var(--rs-text-muted);
}

.rs-stepper-label {
  margin-left: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rs-text-secondary);
  white-space: nowrap;
}

.rs-stepper-active .rs-stepper-label {
  color: var(--rs-brand-300);
  font-weight: 600;
}

.rs-stepper-completed .rs-stepper-label {
  color: var(--rs-success);
}

.rs-stepper-line {
  width: 80px;
  height: 2px;
  background: var(--rs-border-default);
  margin: 0 16px;
  position: relative;
  top: 0;
  align-self: center;
}

.rs-stepper-line-fill {
  height: 100%;
  background: var(--rs-success);
  transition: width var(--rs-transition-base);
  border-radius: 1px;
}

/* ---------- 双栏布局 ---------- */
.rs-g2 {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  flex: 1;
}

/* ---------- 配置面板 ---------- */
.rs-config-panel {
  display: flex;
  flex-direction: column;
}

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

.rs-link-btn {
  font-size: 12px;
  color: var(--rs-brand-400);
  cursor: pointer;
  transition: color var(--rs-transition-fast);
  user-select: none;
}

.rs-link-btn:hover {
  color: var(--rs-brand-300);
}

/* ---------- 数据集卡片 ---------- */
.rs-dataset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-dataset-card {
  padding: 14px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  position: relative;
}

.rs-dataset-card:hover {
  border-color: var(--rs-border-default);
  background: var(--rs-bg-surface-3);
}

.rs-dataset-card.rs-dataset-selected {
  border-color: var(--rs-brand-500);
  background: var(--rs-brand-500-soft);
  box-shadow: 0 0 0 1px var(--rs-brand-500-soft-2);
}

.rs-dataset-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rs-dataset-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-dataset-icon.primary {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-dataset-icon.info {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-dataset-icon.muted {
  background: var(--rs-bg-surface-3);
  color: var(--rs-text-muted);
}

.rs-dataset-icon svg {
  width: 18px;
  height: 18px;
}

.rs-dataset-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--rs-brand-500);
  color: var(--rs-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-dataset-check svg {
  width: 12px;
  height: 12px;
}

.rs-dataset-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 4px;
}

.rs-dataset-desc {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
  margin-bottom: 10px;
}

.rs-dataset-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.rs-dataset-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-dataset-meta-item svg {
  width: 14px;
  height: 14px;
}

.rs-dataset-source {
  font-size: 11px;
  color: var(--rs-text-dim);
}

.rs-dataset-source-label {
  color: var(--rs-text-muted);
}

/* ---------- 指标列表 ---------- */
.rs-metric-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-metric-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--rs-radius-md);
  cursor: pointer;
  transition: background var(--rs-transition-fast);
}

.rs-metric-item:hover {
  background: var(--rs-bg-surface-3);
}

.rs-metric-item-content {
  flex: 1;
  min-width: 0;
}

.rs-metric-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--rs-text-primary);
  margin-bottom: 2px;
}

.rs-metric-item-desc {
  font-size: 11px;
  color: var(--rs-text-muted);
  line-height: 1.4;
}

/* ---------- 隐私合规卡片 ---------- */
.rs-privacy-card {
  margin: 0 16px 16px;
  padding: 16px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  transition: all var(--rs-transition-fast);
}

.rs-privacy-card.rs-privacy-passed {
  border-color: var(--rs-success-border);
  background: var(--rs-success-bg);
}

.rs-privacy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.rs-privacy-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rs-privacy-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs-radius-md);
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--rs-transition-fast);
}

.rs-privacy-passed .rs-privacy-icon {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-privacy-icon svg {
  width: 18px;
  height: 18px;
}

.rs-privacy-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-privacy-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.rs-privacy-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rs-privacy-check-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--rs-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--rs-transition-fast);
}

.rs-privacy-check-icon.rs-privacy-check-pass {
  background: var(--rs-success);
  border-color: var(--rs-success);
  color: var(--rs-text-inverse);
}

.rs-privacy-check-icon svg {
  width: 10px;
  height: 10px;
}

.rs-privacy-check-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--rs-text-muted);
}

.rs-privacy-check-text {
  font-size: 13px;
  color: var(--rs-text-secondary);
}

.rs-privacy-check-detail {
  color: var(--rs-text-muted);
  font-size: 12px;
}

.rs-w-full {
  width: 100%;
}

.rs-spin {
  width: 16px;
  height: 16px;
  animation: rs-spin 1s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 预览面板 ---------- */
.rs-preview-panel {
  display: flex;
  flex-direction: column;
}

.rs-section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rs-section-label::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--rs-brand-400);
  border-radius: 2px;
}

/* ---------- 发现卡片 ---------- */
.rs-findings-preview {
  margin-bottom: 24px;
}

.rs-finding-card {
  padding: 14px 16px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  margin-bottom: 10px;
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-finding-card:hover {
  border-color: var(--rs-border-default);
  background: var(--rs-bg-surface-3);
}

.rs-finding-card.rs-finding-expanded {
  border-color: var(--rs-brand-500-soft-2);
  background: var(--rs-brand-500-soft);
}

.rs-finding-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.rs-finding-number {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm, 6px);
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  border-radius: var(--rs-radius-md);
}

.rs-finding-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  line-height: 1.5;
  min-width: 0;
}

.rs-finding-caret {
  width: 18px;
  height: 18px;
  color: var(--rs-text-muted);
  transition: transform var(--rs-transition-fast);
  flex-shrink: 0;
  margin-top: 4px;
}

.rs-finding-expanded .rs-finding-caret {
  transform: rotate(180deg);
  color: var(--rs-brand-400);
}

.rs-finding-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  margin-left: 40px;
}

.rs-finding-confidence {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--rs-radius-full);
}

.rs-finding-confidence.high {
  background: var(--rs-success-bg);
  color: var(--rs-success);
  border: 1px solid var(--rs-success-border);
}

.rs-finding-confidence.medium {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
  border: 1px solid var(--rs-warning-border);
}

.rs-finding-sample {
  font-size: 12px;
  color: var(--rs-text-muted);
  display: flex;
  align-items: center;
}

.rs-finding-detail {
  margin-top: 12px;
  margin-left: 40px;
  padding-top: 12px;
  border-top: 1px solid var(--rs-border-subtle);
}

.rs-finding-detail p {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.rs-finding-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rs-finding-tags .rs-chip {
  font-size: 11px;
  padding: 3px 10px;
}

/* ---------- 图表预览 ---------- */
.rs-chart-preview {
  margin-bottom: 24px;
}

.rs-chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.rs-chart-card {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 14px;
}

.rs-chart-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 12px;
}

/* 柱状图 */
.rs-bar-chart {
  display: flex;
  gap: 8px;
  position: relative;
  height: 140px;
  padding-left: 36px;
}

.rs-bar-chart-yaxis {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: var(--rs-text-muted);
  padding: 0 4px;
}

.rs-bar-chart-bars {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex: 1;
  height: calc(100% - 20px);
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rs-border-subtle);
}

.rs-bar-chart-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.rs-bar-chart-bar {
  width: 100%;
  max-width: 36px;
  background: linear-gradient(180deg, var(--rs-brand-400), var(--rs-brand-600));
  border-radius: 4px 4px 0 0;
  transition: height var(--rs-transition-slow);
  min-height: 4px;
}

.rs-bar-chart-label {
  font-size: 11px;
  color: var(--rs-text-muted);
  margin-top: 6px;
  position: absolute;
  bottom: 0;
}

/* 折线图 */
.rs-line-chart {
  position: relative;
  padding-bottom: 20px;
}

.rs-line-chart-svg {
  width: 100%;
  height: 140px;
  display: block;
}

.rs-line-chart-xaxis {
  display: flex;
  justify-content: space-between;
  padding: 0 28px;
  font-size: 10px;
  color: var(--rs-text-muted);
  margin-top: 4px;
}

.rs-line-chart-xaxis span {
  flex: 1;
  text-align: center;
}

/* ---------- 跨端协作 ---------- */
.rs-crossflow-section {
  margin-bottom: 8px;
}

.rs-crossflow-cards {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0;
}

.rs-crossflow-card {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 16px;
  flex: 1;
  max-width: 200px;
  text-align: center;
  transition: all var(--rs-transition-fast);
}

.rs-crossflow-card:hover {
  border-color: var(--rs-border-default);
  transform: translateY(-2px);
  box-shadow: var(--rs-shadow-md);
}

.rs-crossflow-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.rs-crossflow-icon svg {
  width: 22px;
  height: 22px;
}

.rs-crossflow-icon.student {
  background: rgba(96, 165, 250, 0.12);
  color: var(--rs-info);
}

.rs-crossflow-icon.teacher {
  background: rgba(52, 211, 153, 0.12);
  color: var(--rs-success);
}

.rs-crossflow-icon.research {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-crossflow-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 4px;
}

.rs-crossflow-desc {
  font-size: 12px;
  color: var(--rs-text-secondary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.rs-crossflow-tag {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11px;
  color: var(--rs-text-muted);
  background: var(--rs-bg-surface-3);
  border-radius: var(--rs-radius-full);
}

.rs-crossflow-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  color: var(--rs-text-muted);
  flex-shrink: 0;
}

.rs-crossflow-arrow svg {
  width: 20px;
  height: 20px;
}

/* ---------- 底部操作栏 ---------- */
.rs-action-bar {
  position: fixed;
  bottom: 0;
  left: calc(var(--rs-sidebar-width) + 0px);
  right: 0;
  height: 64px;
  background: var(--rs-bg-surface);
  border-top: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  z-index: 40;
  backdrop-filter: blur(8px);
}

.rs-action-bar-left,
.rs-action-bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rs-estimate-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--rs-text-muted);
  margin-right: 8px;
}

.rs-estimate-time svg {
  width: 14px;
  height: 14px;
}

.rs-btn svg {
  width: 16px;
  height: 16px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1440px) {
  .rs-g2 {
    grid-template-columns: 340px 1fr;
  }

  .rs-crossflow-cards {
    flex-wrap: wrap;
    gap: 10px;
  }

  .rs-crossflow-arrow {
    display: none;
  }
}
</style>
