<template>
  <div class="rs-page rs-verify">
    <!-- 页面头部 -->
    <div class="rs-page-header">
      <div class="rs-page-eyebrow">Mathematical Verification</div>
      <h1 class="rs-page-title">数学验证台</h1>
      <p class="rs-page-subtitle">输入命题表达式，AI 自动进行 6 种验证，生成可溯源证据</p>
    </div>

    <!-- 双栏验证布局 -->
    <div class="rs-verify-layout">
      <!-- 左栏：表达式输入面板 -->
      <div class="rs-panel rs-expression-panel">
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2 class="rs-panel-title">命题表达式</h2>
            <p class="rs-panel-subtitle">支持 LaTeX / 自然语言 / 代码</p>
          </div>
          <span class="rs-tag rs-tag-brand">GNN 路径规划项目</span>
        </div>

        <div class="rs-panel-body">
          <!-- 表达式输入 -->
          <div class="rs-expression-input">
            <textarea
              v-model="expression"
              class="rs-textarea rs-expression-textarea"
              placeholder="请输入要验证的数学命题或推导过程..."
              rows="6"
            ></textarea>
            <div class="rs-expression-toolbar">
              <div class="rs-expression-chips">
                <div
                  v-for="tab in inputTabs"
                  :key="tab.key"
                  class="rs-chip"
                  :class="{ active: activeTab === tab.key }"
                  @click="activeTab = tab.key"
                >
                  {{ tab.label }}
                </div>
              </div>
              <div class="rs-expression-actions">
                <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="clearExpression">
                  清空
                </button>
                <button
                  class="rs-btn rs-btn-primary rs-btn-sm"
                  :disabled="verifying || !expression.trim()"
                  @click="runVerify"
                >
                  <span v-if="verifying" class="rs-btn-spinner"></span>
                  {{ verifying ? '验证中...' : '运行验证' }}
                </button>
              </div>
            </div>
          </div>

          <div class="rs-divider"></div>

          <!-- 标准化形式 -->
          <div class="rs-formal-section">
            <label class="rs-section-label">标准化形式</label>
            <pre class="rs-formal-code" :class="{ verified: result }"><code>∀T ∈ ℕ⁺, ∃C > 0, ||f(T) - f*|| ≤ C / √T</code></pre>
          </div>

          <div class="rs-divider"></div>

          <!-- 前置假设 -->
          <div class="rs-assumptions-section">
            <label class="rs-section-label">前置假设</label>
            <ul class="rs-assumptions-list">
              <li v-for="(item, index) in assumptions" :key="index" class="rs-assumption-item">
                <span class="rs-assumption-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span class="rs-assumption-text">{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="rs-divider"></div>

          <!-- 信息提示 -->
          <div class="rs-info-box">
            <div class="rs-info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <span class="rs-info-text">验证将在云端进行，结果自动存入证据账本</span>
          </div>
        </div>
      </div>

      <!-- 右栏：验证结果区 -->
      <div class="rs-verify-results">
        <!-- 结果汇总卡 -->
        <div class="rs-panel rs-result-summary">
          <!-- 空状态 -->
          <div v-if="!verifying && !result" class="rs-result-empty">
            <div class="rs-result-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </div>
            <h3 class="rs-result-empty-title">点击「运行验证」开始</h3>
            <p class="rs-result-empty-desc">输入数学命题后，AI 将自动进行 6 维度交叉验证</p>
          </div>

          <!-- 验证中 -->
          <div v-else-if="verifying" class="rs-result-verifying">
            <div class="rs-result-verifying-icon">
              <div class="rs-spinner-ring"></div>
            </div>
            <h3 class="rs-result-verifying-title">正在验证...</h3>
            <p class="rs-result-verifying-desc">AI 正在对命题进行多维度交叉验证</p>
            <div class="rs-result-progress">
              <div class="rs-progress-bar">
                <div class="rs-progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <span class="rs-result-progress-text">{{ verifyingCapCount }}/6 项已完成</span>
            </div>
          </div>

          <!-- 验证通过 -->
          <div v-else-if="result?.status === 'verified'" class="rs-result-success">
            <div class="rs-result-icon success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div class="rs-result-content">
              <h3 class="rs-result-title success">全部通过 ✓</h3>
              <p class="rs-result-desc">{{ result.summary }}</p>
            </div>
            <button class="rs-btn rs-btn-primary" @click="goToLean">
              升级为形式化证明
              <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>

          <!-- 验证失败 -->
          <div v-else-if="result?.status === 'failed'" class="rs-result-failed">
            <div class="rs-result-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div class="rs-result-content">
              <h3 class="rs-result-title error">发现问题</h3>
              <p class="rs-result-desc">{{ result.summary }}</p>
            </div>
          </div>

          <!-- 部分通过 -->
          <div v-else-if="result?.status === 'partial'" class="rs-result-partial">
            <div class="rs-result-icon warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div class="rs-result-content">
              <h3 class="rs-result-title warning">部分通过</h3>
              <p class="rs-result-desc">{{ result.summary }}</p>
            </div>
          </div>
        </div>

        <!-- 6 个能力卡片网格 -->
        <div class="rs-capability-grid">
          <div
            v-for="(cap, index) in displayCapabilities"
            :key="cap.key"
            class="rs-capability-card"
            :class="[
              `status-${cap.status}`,
              { 'is-verifying': cap.status === 'running' },
              { 'is-expandable': cap.detail },
              { 'is-expanded': expandedCaps.includes(cap.key) }
            ]"
            :style="{ animationDelay: `${index * 0.1}s` }"
            @click="toggleCapDetail(cap.key)"
          >
            <div class="rs-cap-header">
              <div class="rs-cap-icon" :class="cap.status">
                <svg v-if="cap.status === 'passed'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else-if="cap.status === 'failed'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <svg v-else-if="cap.status === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <svg v-else-if="cap.status === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <div v-else-if="cap.status === 'running'" class="rs-cap-spinner"></div>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div class="rs-cap-info">
                <h4 class="rs-cap-name">{{ cap.name }}</h4>
              </div>
              <span class="rs-tag" :class="`rs-tag-${getStatusTagClass(cap.status)}`">
                {{ getStatusLabel(cap.status) }}
              </span>
            </div>
            <p class="rs-cap-description">{{ cap.description }}</p>
            <div v-if="cap.detail" class="rs-cap-detail">
              <div class="rs-cap-detail-content">
                {{ cap.detail }}
              </div>
              <div v-if="cap.key === 'formal_proof'" class="rs-cap-upgrade">
                <button class="rs-btn rs-btn-primary rs-btn-sm" @click.stop="goToLean">
                  升级证明
                  <svg class="rs-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="cap.detail" class="rs-cap-expand-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { researchVerifyApi } from '@/api/research'
import type { VerifyResult, VerifyCapability } from '@/types/research'

const router = useRouter()

// 状态
const expression = ref('证明：对于图神经网络路径规划算法 GNN-Path，其收敛速率为 O(1/√T)，其中 T 为迭代次数')
const verifying = ref(false)
const result = ref<VerifyResult | null>(null)
const activeTab = ref('latex')
const expandedCaps = ref<string[]>([])
const verifyingCapIndex = ref(-1)

// 输入模式标签
const inputTabs = [
  { key: 'latex', label: 'LaTeX' },
  { key: 'natural', label: '自然语言' },
  { key: 'lean4', label: 'Lean4' },
]

// 前置假设
const assumptions = [
  '损失函数 L-Lipschitz 连续',
  '步长 α_t = 1/√t',
  '图结构满足 α-扩张性质',
]

// 默认能力卡片（未验证状态）
const defaultCapabilities: VerifyCapability[] = [
  { name: '数值验证', key: 'numerical', status: 'info', description: '随机采样 1000 组参数验证结论成立' },
  { name: '符号推导', key: 'symbolic', status: 'info', description: '代数变形与化简验证等式结构' },
  { name: '量纲检查', key: 'dimensional', status: 'info', description: '检查所有项的量纲一致性' },
  { name: '不等式边界', key: 'inequality', status: 'info', description: '验证边界的紧致性与可达性' },
  { name: '反例搜索', key: 'counterexample', status: 'info', description: '尝试构造反例验证命题' },
  { name: '形式化证明', key: 'formal_proof', status: 'info', description: '升级到 Lean4 进行严格证明' },
]

// 计算属性：显示的能力列表
const displayCapabilities = computed<VerifyCapability[]>(() => {
  if (result.value) {
    return result.value.capabilities
  }
  if (verifying.value) {
    return defaultCapabilities.map((cap, idx) => ({
      ...cap,
      status: idx <= verifyingCapIndex.value ? 'running' : ('info' as const),
    }))
  }
  return defaultCapabilities
})

// 计算验证进度百分比
const progressPercent = computed(() => {
  if (!verifying.value) return 0
  return Math.round(((verifyingCapIndex.value + 1) / 6) * 100)
})

// 正在验证的能力数量
const verifyingCapCount = computed(() => {
  if (!verifying.value) return 0
  return Math.max(0, verifyingCapIndex.value + 1)
})

// 获取状态标签样式类
function getStatusTagClass(status: string): string {
  switch (status) {
    case 'passed': return 'success'
    case 'failed': return 'error'
    case 'warning': return 'warning'
    case 'running': return 'brand'
    default: return 'info'
  }
}

// 获取状态文本
function getStatusLabel(status: string): string {
  switch (status) {
    case 'passed': return '通过'
    case 'failed': return '失败'
    case 'warning': return '警告'
    case 'running': return '验证中'
    default: return '待验证'
  }
}

// 清空表达式
function clearExpression() {
  expression.value = ''
  result.value = null
  expandedCaps.value = []
}

// 切换能力卡片详情展开
function toggleCapDetail(key: string) {
  const idx = expandedCaps.value.indexOf(key)
  if (idx > -1) {
    expandedCaps.value.splice(idx, 1)
  } else {
    expandedCaps.value.push(key)
  }
}

// 运行验证
async function runVerify() {
  if (!expression.value.trim() || verifying.value) return

  verifying.value = true
  result.value = null
  expandedCaps.value = []
  verifyingCapIndex.value = -1

  // 模拟逐个能力验证的动画
  const animateVerification = () => {
    return new Promise<void>((resolve) => {
      let idx = 0
      const step = () => {
        verifyingCapIndex.value = idx
        if (idx < 5) {
          idx++
          setTimeout(step, 350)
        } else {
          resolve()
        }
      }
      setTimeout(step, 200)
    })
  }

  try {
    // 并行执行动画和 API 调用
    const [verifyResult] = await Promise.all([
      researchVerifyApi.verify({ expression: expression.value }),
      animateVerification(),
    ])

    // 确保最后一个也在动画中
    verifyingCapIndex.value = 5
    await new Promise(r => setTimeout(r, 300))

    result.value = verifyResult as VerifyResult
  } catch (e) {
    console.error('验证失败:', e)
  } finally {
    verifying.value = false
    verifyingCapIndex.value = -1
  }
}

// 跳转到 Lean4 页面
function goToLean() {
  router.push('/research/lean')
}
</script>

<style scoped>
/* ============================================================
   数学验证台页面样式
   ============================================================ */

.rs-verify {
  min-height: 100%;
}

/* ---------- 双栏布局 ---------- */
.rs-verify-layout {
  display: grid;
  grid-template-columns: 45% 55%;
  gap: 20px;
  align-items: start;
}

/* ---------- 面板通用 ---------- */
.rs-panel-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-panel-title-group .rs-panel-title {
  margin-bottom: 0;
}

.rs-panel-subtitle {
  font-size: 12px;
  color: var(--rs-text-muted);
  font-weight: 400;
}

/* ---------- 表达式输入面板 ---------- */
.rs-expression-panel {
  position: sticky;
  top: 0;
}

.rs-expression-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-expression-textarea {
  min-height: 120px;
  font-family: var(--rs-font-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: none;
}

.rs-expression-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rs-expression-chips {
  display: flex;
  gap: 6px;
}

.rs-expression-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 按钮加载动画 */
.rs-btn-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ---------- Section 标签 ---------- */
.rs-section-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}

/* ---------- 标准化形式 ---------- */
.rs-formal-section {
  margin-bottom: 0;
}

.rs-formal-code {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  padding: 14px 16px;
  font-family: var(--rs-font-mono);
  font-size: 14px;
  color: var(--rs-text-secondary);
  overflow-x: auto;
  line-height: 1.6;
  transition: all var(--rs-transition-base);
}

.rs-formal-code.verified {
  background: var(--rs-brand-500-soft);
  border-color: var(--rs-brand-500-soft-2);
  color: var(--rs-text-primary);
}

.rs-formal-code code {
  font-family: inherit;
}

/* ---------- 前置假设 ---------- */
.rs-assumptions-section {
  margin-bottom: 0;
}

.rs-assumptions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rs-assumption-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  font-size: 13px;
  color: var(--rs-text-secondary);
  transition: all var(--rs-transition-fast);
}

.rs-assumption-item:hover {
  border-color: var(--rs-border-default);
}

.rs-assumption-check {
  width: 18px;
  height: 18px;
  color: var(--rs-success);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-assumption-check svg {
  width: 16px;
  height: 16px;
}

.rs-assumption-text {
  flex: 1;
}

/* ---------- 信息提示框 ---------- */
.rs-info-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--rs-brand-500-soft);
  border: 1px solid var(--rs-brand-500-soft-2);
  border-radius: var(--rs-radius-md);
}

.rs-info-icon {
  width: 18px;
  height: 18px;
  color: var(--rs-brand-400);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-info-icon svg {
  width: 18px;
  height: 18px;
}

.rs-info-text {
  font-size: 13px;
  color: var(--rs-brand-300);
  line-height: 1.4;
}

/* ---------- 结果汇总卡 ---------- */
.rs-result-summary {
  margin-bottom: 16px;
}

/* 空状态 */
.rs-result-empty {
  padding: 40px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rs-result-empty-icon {
  width: 56px;
  height: 56px;
  color: var(--rs-text-dim);
  margin-bottom: 4px;
}

.rs-result-empty-icon svg {
  width: 56px;
  height: 56px;
}

.rs-result-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--rs-text-secondary);
}

.rs-result-empty-desc {
  font-size: 13px;
  color: var(--rs-text-muted);
  max-width: 320px;
}

/* 验证中 */
.rs-result-verifying {
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rs-result-verifying-icon {
  margin-bottom: 4px;
}

.rs-spinner-ring {
  width: 48px;
  height: 48px;
  border: 3px solid var(--rs-bg-surface-3);
  border-top-color: var(--rs-brand-400);
  border-right-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 1s linear infinite;
}

.rs-result-verifying-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-result-verifying-desc {
  font-size: 13px;
  color: var(--rs-text-muted);
}

.rs-result-progress {
  width: 100%;
  max-width: 280px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.rs-result-progress-text {
  font-size: 12px;
  color: var(--rs-text-muted);
  font-family: var(--rs-font-mono);
}

/* 验证结果通用 */
.rs-result-success,
.rs-result-failed,
.rs-result-partial {
  padding: 28px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.rs-result-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--rs-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rs-result-icon svg {
  width: 28px;
  height: 28px;
}

.rs-result-icon.success {
  background: var(--rs-success-bg);
  color: var(--rs-success);
  border: 1px solid var(--rs-success-border);
}

.rs-result-icon.error {
  background: var(--rs-error-bg);
  color: var(--rs-error);
  border: 1px solid var(--rs-error-border);
}

.rs-result-icon.warning {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
  border: 1px solid var(--rs-warning-border);
}

.rs-result-content {
  flex: 1;
  min-width: 0;
}

.rs-result-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}

.rs-result-title.success {
  color: var(--rs-success);
}

.rs-result-title.error {
  color: var(--rs-error);
}

.rs-result-title.warning {
  color: var(--rs-warning);
}

.rs-result-desc {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
}

/* ---------- 能力卡片网格 ---------- */
.rs-capability-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.rs-capability-card {
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 14px;
  cursor: default;
  transition: all var(--rs-transition-base);
  position: relative;
  overflow: hidden;
}

.rs-capability-card.is-expandable {
  cursor: pointer;
}

.rs-capability-card.is-expandable:hover {
  border-color: var(--rs-border-default);
  transform: translateY(-1px);
  box-shadow: var(--rs-shadow-sm);
}

.rs-capability-card.status-passed {
  border-color: var(--rs-success-border);
}

.rs-capability-card.status-failed {
  border-color: var(--rs-error-border);
}

.rs-capability-card.status-warning {
  border-color: var(--rs-warning-border);
}

.rs-capability-card.is-verifying {
  border-color: var(--rs-brand-500-soft-2);
  animation: rs-cap-pulse 2s ease-in-out infinite;
}

@keyframes rs-cap-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--rs-brand-glow);
  }
  50% {
    box-shadow: 0 0 16px 2px var(--rs-brand-glow);
  }
}

.rs-cap-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.rs-cap-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--rs-bg-surface-2);
  color: var(--rs-text-muted);
}

.rs-cap-icon svg {
  width: 18px;
  height: 18px;
}

.rs-cap-icon.passed {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-cap-icon.failed {
  background: var(--rs-error-bg);
  color: var(--rs-error);
}

.rs-cap-icon.warning {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
}

.rs-cap-icon.info {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-cap-icon.running {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-cap-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(245, 158, 11, 0.2);
  border-top-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

.rs-cap-info {
  flex: 1;
  min-width: 0;
}

.rs-cap-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-cap-description {
  font-size: 12px;
  color: var(--rs-text-muted);
  line-height: 1.5;
  margin-bottom: 10px;
}

.rs-cap-detail {
  padding-top: 10px;
  border-top: 1px solid var(--rs-border-subtle);
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all var(--rs-transition-base);
}

.rs-capability-card.is-expanded .rs-cap-detail {
  max-height: 200px;
  opacity: 1;
  padding-top: 10px;
}

.rs-cap-detail-content {
  margin-bottom: 10px;
}

.rs-cap-upgrade {
  display: flex;
  justify-content: flex-end;
}

.rs-cap-expand-indicator {
  position: absolute;
  bottom: 8px;
  right: 10px;
  width: 16px;
  height: 16px;
  color: var(--rs-text-dim);
  transition: transform var(--rs-transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-cap-expand-indicator svg {
  width: 14px;
  height: 14px;
}

.rs-capability-card.is-expanded .rs-cap-expand-indicator {
  transform: rotate(180deg);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1200px) {
  .rs-verify-layout {
    grid-template-columns: 1fr;
  }

  .rs-expression-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .rs-capability-grid {
    grid-template-columns: 1fr;
  }

  .rs-result-success,
  .rs-result-failed,
  .rs-result-partial {
    flex-direction: column;
    text-align: center;
  }
}
</style>
