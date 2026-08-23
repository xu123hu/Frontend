<template>
  <div class="rs-page rs-review">
    <!-- 1. 页面头部 -->
    <div class="rs-page-header">
      <div class="rs-page-eyebrow">Paper Review</div>
      <h1 class="rs-page-title">论文初审</h1>
      <p class="rs-page-subtitle">AI 辅助初审，自动检测创新性、正确性、完整性问题，生成可溯源审稿报告</p>
    </div>

    <!-- 2. 统计概览 -->
    <div class="rs-review-summary">
      <div class="rs-summary-card">
        <div class="rs-summary-icon brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="rs-summary-value">{{ stats.pending }}</div>
        <div class="rs-summary-label">待审论文</div>
      </div>

      <div class="rs-summary-card">
        <div class="rs-summary-icon warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div class="rs-summary-value">{{ stats.analyzing }}</div>
        <div class="rs-summary-label">分析中</div>
      </div>

      <div class="rs-summary-card">
        <div class="rs-summary-icon success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="rs-summary-value">{{ stats.completed }}</div>
        <div class="rs-summary-label">已完成初审</div>
      </div>

      <div class="rs-summary-card">
        <div class="rs-summary-icon info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="rs-summary-value">{{ stats.avgScore }}<span class="rs-summary-unit"> / 100</span></div>
        <div class="rs-summary-label">平均得分</div>
      </div>
    </div>

    <!-- 3. 双栏布局 -->
    <div class="rs-g2">
      <!-- 左栏：待审论文列表 -->
      <div class="rs-panel rs-review-list-panel">
        <div class="rs-panel-header">
          <div class="rs-panel-title-group">
            <h2>待审论文</h2>
            <p>按提交时间排序</p>
          </div>
          <select class="rs-select rs-filter-select" v-model="statusFilter">
            <option value="all">全部</option>
            <option value="pending">待分析</option>
            <option value="analyzing">分析中</option>
            <option value="reviewed">已完成</option>
          </select>
        </div>
        <div class="rs-review-table-wrap">
          <table class="rs-review-table">
            <thead>
              <tr>
                <th>论文</th>
                <th>作者</th>
                <th>提交时间</th>
                <th class="rs-col-score">创新性</th>
                <th class="rs-col-score">正确性</th>
                <th class="rs-col-score">完整性</th>
                <th class="rs-col-attention">关注度</th>
                <th class="rs-col-status">状态</th>
                <th class="rs-col-action">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in filteredSubmissions"
                :key="s.id"
                class="rs-review-row"
                :class="{ selected: selectedSubmission?.id === s.id }"
                @click="selectSubmission(s)"
              >
                <td class="rs-col-paper">
                  <div class="rs-paper-title">{{ s.title }}</div>
                  <div class="rs-paper-tags">
                    <span class="rs-tag rs-tag-brand rs-tag-sm">{{ getDomainTag(s.id) }}</span>
                  </div>
                </td>
                <td class="rs-col-authors">
                  {{ s.authors[0] }} et al.
                </td>
                <td class="rs-col-time">
                  {{ formatDate(s.submittedAt) }}
                </td>
                <td class="rs-col-score">
                  <template v-if="s.status !== 'pending'">
                    <div class="rs-score-ring-sm" :class="getScoreClass(score100(s.scores.novelty))">
                      <svg width="32" height="32">
                        <circle class="rs-ring-track" cx="16" cy="16" r="13" stroke-width="3"/>
                        <circle
                          class="rs-ring-fill"
                          cx="16" cy="16" r="13" stroke-width="3"
                          :stroke-dasharray="smallRingCirc"
                          :stroke-dashoffset="smallRingOffset(score100(s.scores.novelty))"
                        />
                      </svg>
                      <span class="rs-ring-value">{{ Math.round(score100(s.scores.novelty)) }}</span>
                    </div>
                  </template>
                  <span v-else class="rs-score-na">—</span>
                </td>
                <td class="rs-col-score">
                  <template v-if="s.status !== 'pending'">
                    <div class="rs-score-ring-sm" :class="getScoreClass(score100(s.scores.correctness))">
                      <svg width="32" height="32">
                        <circle class="rs-ring-track" cx="16" cy="16" r="13" stroke-width="3"/>
                        <circle
                          class="rs-ring-fill"
                          cx="16" cy="16" r="13" stroke-width="3"
                          :stroke-dasharray="smallRingCirc"
                          :stroke-dashoffset="smallRingOffset(score100(s.scores.correctness))"
                        />
                      </svg>
                      <span class="rs-ring-value">{{ Math.round(score100(s.scores.correctness)) }}</span>
                    </div>
                  </template>
                  <span v-else class="rs-score-na">—</span>
                </td>
                <td class="rs-col-score">
                  <template v-if="s.status !== 'pending'">
                    <div class="rs-score-ring-sm" :class="getScoreClass(score100(s.scores.completeness))">
                      <svg width="32" height="32">
                        <circle class="rs-ring-track" cx="16" cy="16" r="13" stroke-width="3"/>
                        <circle
                          class="rs-ring-fill"
                          cx="16" cy="16" r="13" stroke-width="3"
                          :stroke-dasharray="smallRingCirc"
                          :stroke-dashoffset="smallRingOffset(score100(s.scores.completeness))"
                        />
                      </svg>
                      <span class="rs-ring-value">{{ Math.round(score100(s.scores.completeness)) }}</span>
                    </div>
                  </template>
                  <span v-else class="rs-score-na">—</span>
                </td>
                <td class="rs-col-attention">
                  <div class="rs-attention">
                    <svg class="rs-attention-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 23c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v6l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                    <span class="rs-attention-text">{{ getAttentionTrend(s.id) }}</span>
                  </div>
                </td>
                <td class="rs-col-status">
                  <span class="rs-status-badge" :class="s.status">
                    {{ statusText(s.status) }}
                  </span>
                </td>
                <td class="rs-col-action">
                  <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="selectSubmission(s)">
                    查看
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredSubmissions.length === 0" class="rs-empty-state">
            暂无符合条件的论文
          </div>
        </div>
      </div>

      <!-- 右栏：分析详情 -->
      <div class="rs-panel rs-review-detail-panel">
        <template v-if="selectedSubmission">
          <!-- 详情头部 -->
          <div class="rs-detail-header">
            <h2 class="rs-detail-title">{{ selectedSubmission.title }}</h2>
            <div class="rs-detail-authors">{{ selectedSubmission.authors.join(', ') }}</div>
            <div class="rs-detail-meta">
              <span class="rs-detail-time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ formatDate(selectedSubmission.submittedAt) }} 提交
              </span>
              <span class="rs-tag rs-tag-brand">{{ getDomainTag(selectedSubmission.id) }}</span>
            </div>
            <div class="rs-detail-actions">
              <button class="rs-btn rs-btn-secondary rs-btn-sm" @click="handleReanalyze" :disabled="selectedSubmission.status === 'analyzing'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                重新分析
              </button>
              <button class="rs-btn rs-btn-secondary rs-btn-sm" @click="handleGenerateReport">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                生成报告
              </button>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="handleExport">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                导出
              </button>
            </div>
          </div>

          <div class="rs-detail-body">
            <!-- 综合评分卡 -->
            <div class="rs-score-card">
              <div class="rs-score-ring-lg">
                <svg width="120" height="120">
                  <circle class="rs-ring-track-lg" cx="60" cy="60" r="52" stroke-width="8"/>
                  <circle
                    class="rs-ring-fill-lg"
                    cx="60" cy="60" r="52" stroke-width="8"
                    :stroke-dasharray="largeRingCirc"
                    :stroke-dashoffset="largeRingOffset(overallScore)"
                  />
                </svg>
                <div class="rs-ring-lg-center">
                  <div class="rs-ring-lg-value">{{ overallScore.toFixed(1) }}</div>
                  <div class="rs-ring-lg-label">综合评分</div>
                </div>
              </div>
              <div class="rs-score-bars">
                <div class="rs-score-bar-row">
                  <div class="rs-score-bar-label">
                    <span class="rs-score-bar-name">创新性</span>
                    <span class="rs-score-bar-num">{{ Math.round(score100(selectedSubmission.scores.novelty)) }}</span>
                  </div>
                  <div class="rs-score-bar-track">
                    <div
                      class="rs-score-bar-fill rs-bar-novelty"
                      :style="{ width: score100(selectedSubmission.scores.novelty) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="rs-score-bar-row">
                  <div class="rs-score-bar-label">
                    <span class="rs-score-bar-name">正确性</span>
                    <span class="rs-score-bar-num">{{ Math.round(score100(selectedSubmission.scores.correctness)) }}</span>
                  </div>
                  <div class="rs-score-bar-track">
                    <div
                      class="rs-score-bar-fill rs-bar-correctness"
                      :style="{ width: score100(selectedSubmission.scores.correctness) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="rs-score-bar-row">
                  <div class="rs-score-bar-label">
                    <span class="rs-score-bar-name">完整性</span>
                    <span class="rs-score-bar-num">{{ Math.round(score100(selectedSubmission.scores.completeness)) }}</span>
                  </div>
                  <div class="rs-score-bar-track">
                    <div
                      class="rs-score-bar-fill rs-bar-completeness"
                      :style="{ width: score100(selectedSubmission.scores.completeness) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="rs-score-bar-row">
                  <div class="rs-score-bar-label">
                    <span class="rs-score-bar-name">清晰度</span>
                    <span class="rs-score-bar-num">{{ Math.round(score100(selectedSubmission.scores.clarity)) }}</span>
                  </div>
                  <div class="rs-score-bar-track">
                    <div
                      class="rs-score-bar-fill rs-bar-clarity"
                      :style="{ width: score100(selectedSubmission.scores.clarity) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 问题发现漏斗 -->
            <div class="rs-finding-funnel">
              <div class="rs-finding-funnel-header">
                <h3>发现的问题</h3>
                <span class="rs-finding-count">共 {{ findings.length }} 项</span>
              </div>
              <div class="rs-funnel-stats">
                <div class="rs-funnel-item">
                  <div class="rs-funnel-dot rs-funnel-critical"></div>
                  <span class="rs-funnel-label">严重问题</span>
                  <span class="rs-funnel-num">{{ findingStats.critical }}</span>
                </div>
                <div class="rs-funnel-item">
                  <div class="rs-funnel-dot rs-funnel-major"></div>
                  <span class="rs-funnel-label">主要问题</span>
                  <span class="rs-funnel-num">{{ findingStats.major }}</span>
                </div>
                <div class="rs-funnel-item">
                  <div class="rs-funnel-dot rs-funnel-minor"></div>
                  <span class="rs-funnel-label">次要问题</span>
                  <span class="rs-funnel-num">{{ findingStats.minor }}</span>
                </div>
                <div class="rs-funnel-item">
                  <div class="rs-funnel-dot rs-funnel-info"></div>
                  <span class="rs-funnel-label">建议改进</span>
                  <span class="rs-funnel-num">{{ findingStats.info }}</span>
                </div>
              </div>
            </div>

            <!-- 问题详情列表 -->
            <div class="rs-finding-list">
              <div
                v-for="f in findings"
                :key="f.id"
                class="rs-finding-item"
                :class="[f.severity, { read: readFindings.has(f.id) }]"
              >
                <div class="rs-finding-severity-bar"></div>
                <div class="rs-finding-content">
                  <div class="rs-finding-header" @click="toggleFinding(f.id)">
                    <div class="rs-finding-tags">
                      <span class="rs-finding-category-tag">{{ f.category }}</span>
                      <span class="rs-finding-severity-tag" :class="f.severity">
                        {{ severityText(f.severity) }}
                      </span>
                    </div>
                    <svg
                      class="rs-finding-expand-icon"
                      :class="{ expanded: expandedFindings.has(f.id) }"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  <div class="rs-finding-description">{{ f.description }}</div>
                  <div class="rs-finding-location" v-if="f.location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {{ f.location }}
                  </div>
                  <div v-if="expandedFindings.has(f.id)" class="rs-finding-evidence">
                    <div class="rs-finding-evidence-title">依据引用</div>
                    <div class="rs-finding-evidence-content">
                      <p>基于论文中相关段落的语义分析与领域知识库对比，AI 检测到以下问题：</p>
                      <ul>
                        <li>相关文献对比：与 12 篇同领域高引用论文相比，该方面论述存在不足</li>
                        <li>逻辑一致性：第 3.2 节的推导前提与第 2.1 节的假设存在潜在冲突</li>
                        <li>实验充分性：实验覆盖的基准测试集不足 SOTA 标准的 60%</li>
                      </ul>
                    </div>
                  </div>
                  <div class="rs-finding-actions">
                    <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="markAsRead(f.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      {{ readFindings.has(f.id) ? '已读' : '标记已读' }}
                    </button>
                    <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="addNote(f.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      添加备注
                    </button>
                    <button class="rs-btn rs-btn-ghost rs-btn-sm" @click.stop="ignoreFinding(f.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      忽略
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 反例构造区 -->
            <div class="rs-counterexample-section">
              <div class="rs-counterexample-header">
                <div class="rs-counterexample-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div>
                  <h3>AI 构造的反例</h3>
                  <p>针对论文中的错误结论，AI 构造了反例</p>
                </div>
              </div>
              <div class="rs-counterexample-body">
                <div class="rs-counterexample-formula">
                  <span class="rs-formula-label">反例构造：</span>
                  <code>f(x) = x² sin(1/x)，当 x → 0 时</code>
                </div>
                <div class="rs-counterexample-desc">
                  <p>论文声称「若 f(x) 在 x=0 处连续且 f'(0) 存在，则 f(x) 在 x=0 的某个邻域内单调」。</p>
                  <p>AI 构造了上述反例：f(x) = x² sin(1/x) 在 x=0 处可导（导数为 0），但在 x=0 的任何邻域内都不单调，因为 f'(x) = 2x sin(1/x) - cos(1/x) 在 x→0 时振荡。</p>
                </div>
              </div>
              <div class="rs-counterexample-actions">
                <button class="rs-btn rs-btn-primary rs-btn-sm" @click="handleVerifyCounterexample">
                  验证反例 →
                </button>
                <button class="rs-btn rs-btn-secondary rs-btn-sm" @click="handleAddToReview">
                  加入审稿意见
                </button>
              </div>
            </div>

            <!-- 初审报告生成区 -->
            <div class="rs-report-section">
              <div class="rs-report-header">
                <div class="rs-report-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div>
                  <h3>生成初审报告</h3>
                  <p>基于以上发现，AI 可生成完整的初审报告，包含问题汇总、评分详情和修改建议</p>
                </div>
              </div>
              <div class="rs-report-actions">
                <button
                  class="rs-btn rs-btn-primary rs-btn-md"
                  @click="handleGenerateFullReport"
                  :disabled="generating"
                >
                  <svg v-if="generating" class="rs-spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  {{ generating ? '正在生成…' : '生成初审报告' }}
                </button>
                <button class="rs-btn rs-btn-ghost rs-btn-md" @click="handleCustomizeOutline">
                  自定义报告大纲
                </button>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="rs-detail-empty">
          <div class="rs-empty-illustration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3>选择一篇论文查看初审详情</h3>
          <p>点击左侧列表中的论文，查看 AI 分析结果</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { researchReviewApi } from '@/api/research'
import type { ReviewSubmission, ReviewFinding } from '@/types/research'

const router = useRouter()
const toastStore = useToastStore()

// 状态管理
const submissions = ref<ReviewSubmission[]>([])
const selectedSubmission = ref<ReviewSubmission | null>(null)
const findings = ref<ReviewFinding[]>([])
const statusFilter = ref('all')
const loading = ref(false)
const generating = ref(false)
const expandedFindings = ref<Set<string>>(new Set())
const readFindings = ref<Set<string>>(new Set())

// 圆环参数
const smallRingCirc = 2 * Math.PI * 13 // r=13
const largeRingCirc = 2 * Math.PI * 52 // r=52

function smallRingOffset(score: number): number {
  return smallRingCirc - (score / 100) * smallRingCirc
}

function largeRingOffset(score: number): number {
  return largeRingCirc - (score / 100) * largeRingCirc
}

// 将 mock 的 0-5 分转换为 0-100 分
function score100(score: number): number {
  return score * 20
}

// 统计数据
const stats = computed(() => {
  const list = submissions.value
  const pending = list.filter(s => s.status === 'pending').length
  const analyzing = list.filter(s => s.status === 'analyzing').length
  const completed = list.filter(s => s.status === 'reviewed').length
  const reviewed = list.filter(s => s.status === 'reviewed')
  const avgScore = reviewed.length > 0
    ? reviewed.reduce((sum, s) => {
        const avg = (s.scores.novelty + s.scores.correctness + s.scores.completeness + s.scores.clarity) / 4
        return sum + avg
      }, 0) / reviewed.length * 20
    : 0
  return {
    pending,
    analyzing,
    completed,
    avgScore: avgScore.toFixed(1),
  }
})

// 筛选后的列表
const filteredSubmissions = computed(() => {
  if (statusFilter.value === 'all') return submissions.value
  return submissions.value.filter(s => s.status === statusFilter.value)
})

// 综合评分
const overallScore = computed(() => {
  if (!selectedSubmission.value) return 0
  const s = selectedSubmission.value.scores
  return score100((s.novelty + s.correctness + s.completeness + s.clarity) / 4)
})

// 问题统计
const findingStats = computed(() => {
  const stats = { critical: 0, major: 0, minor: 0, info: 0 }
  findings.value.forEach(f => {
    if (stats[f.severity] !== undefined) {
      stats[f.severity]++
    }
  })
  return stats
})

// 辅助函数
function statusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待分析',
    analyzing: '分析中',
    reviewed: '已完成',
  }
  return map[status] || status
}

function severityText(severity: string): string {
  const map: Record<string, string> = {
    critical: '严重',
    major: '主要',
    minor: '次要',
    info: '建议',
  }
  return map[severity] || severity
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'rs-score-good'
  if (score >= 60) return 'rs-score-warning'
  return 'rs-score-danger'
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  const diffHours = Math.floor(diffMs / 3600000)

  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 领域标签（模拟）
function getDomainTag(id: string): string {
  const map: Record<string, string> = {
    'rs-1': 'GNN / 路径规划',
    'rs-2': '教育数据 / 跨端协作',
    'rs-3': '强化学习 / 推荐系统',
    'rs-4': '联邦学习 / GNN',
    'rs-5': '课程学习 / DRL',
    'rs-6': '多模态 / 学习分析',
  }
  return map[id] || '机器学习'
}

// 关注度趋势（模拟）
function getAttentionTrend(id: string): string {
  const map: Record<string, string> = {
    'rs-1': '上升 23%',
    'rs-2': '上升 15%',
    'rs-3': '持平',
    'rs-4': '上升 8%',
    'rs-5': '下降 5%',
    'rs-6': '上升 31%',
  }
  return map[id] || '—'
}

// 交互方法
async function selectSubmission(submission: ReviewSubmission) {
  selectedSubmission.value = submission
  if (submission.status !== 'pending') {
    try {
      const data = await researchReviewApi.findings(submission.id)
      findings.value = data
    } catch (e) {
      console.error('Failed to fetch findings:', e)
      findings.value = []
    }
  } else {
    findings.value = []
  }
}

function toggleFinding(id: string) {
  if (expandedFindings.value.has(id)) {
    expandedFindings.value.delete(id)
  } else {
    expandedFindings.value.add(id)
  }
}

function markAsRead(id: string) {
  readFindings.value.add(id)
  toastStore.success('已标记为已读')
}

function addNote(id: string) {
  toastStore.info('添加备注功能开发中')
}

function ignoreFinding(id: string) {
  findings.value = findings.value.filter(f => f.id !== id)
  toastStore.success('已忽略该问题')
}

function handleReanalyze() {
  if (!selectedSubmission.value) return
  if (selectedSubmission.value.status === 'analyzing') return
  selectedSubmission.value.status = 'analyzing'
  toastStore.info('正在重新分析论文…')
  // 模拟分析完成
  setTimeout(() => {
    if (selectedSubmission.value) {
      selectedSubmission.value.status = 'reviewed'
      toastStore.success('分析完成')
    }
  }, 2000)
}

function handleGenerateReport() {
  toastStore.info('正在生成报告…')
}

function handleExport() {
  toastStore.info('正在导出报告…')
}

function handleVerifyCounterexample() {
  router.push('/research/verify')
}

function handleAddToReview() {
  toastStore.success('反例已加入审稿意见')
}

async function handleGenerateFullReport() {
  generating.value = true
  toastStore.info('正在生成初审报告…')
  // 模拟生成过程
  await new Promise(r => setTimeout(r, 2000))
  generating.value = false
  toastStore.success('初审报告已生成')
}

function handleCustomizeOutline() {
  toastStore.info('自定义报告大纲功能开发中')
}

// 初始加载
onMounted(async () => {
  loading.value = true
  try {
    const data = await researchReviewApi.submissions()
    submissions.value = data
    // 默认选中第一篇已完成的论文
    const firstReviewed = data.find((s: ReviewSubmission) => s.status === 'reviewed')
    if (firstReviewed) {
      selectSubmission(firstReviewed)
    }
  } catch (e) {
    console.error('Failed to fetch submissions:', e)
    toastStore.error('加载论文列表失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.rs-page.rs-review {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ---------- 统计概览 ---------- */
.rs-review-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.rs-summary-card {
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all var(--rs-transition-fast);
}

.rs-summary-card:hover {
  border-color: var(--rs-border-default);
  box-shadow: var(--rs-shadow-md);
}

.rs-summary-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--rs-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.rs-summary-icon svg {
  width: 20px;
  height: 20px;
}

.rs-summary-icon.brand {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-summary-icon.warning {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
}

.rs-summary-icon.success {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

.rs-summary-icon.info {
  background: var(--rs-info-bg);
  color: var(--rs-info);
}

.rs-summary-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.rs-summary-unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--rs-text-muted);
}

.rs-summary-label {
  font-size: 13px;
  color: var(--rs-text-secondary);
}

/* ---------- 双栏布局 ---------- */
.rs-g2 {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.rs-review-list-panel,
.rs-review-detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ---------- 面板头部标题组 ---------- */
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

.rs-filter-select {
  width: auto;
  min-width: 100px;
  height: 30px;
  font-size: 12px;
}

/* ---------- 论文表格 ---------- */
.rs-review-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.rs-review-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.rs-review-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

.rs-review-table th {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
  background: var(--rs-bg-surface-2);
  border-bottom: 1px solid var(--rs-border-subtle);
  white-space: nowrap;
}

.rs-review-table td {
  padding: 12px;
  font-size: 13px;
  color: var(--rs-text-secondary);
  border-bottom: 1px solid var(--rs-border-subtle);
  vertical-align: middle;
}

.rs-review-row {
  cursor: pointer;
  transition: background var(--rs-transition-fast);
  position: relative;
}

.rs-review-row:hover {
  background: var(--rs-bg-surface-2);
}

.rs-review-row.selected {
  background: var(--rs-brand-500-soft);
}

.rs-review-row.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--rs-brand-400);
}

.rs-col-paper {
  min-width: 0;
}

.rs-paper-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--rs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.rs-paper-tags .rs-tag {
  font-size: 11px;
  padding: 1px 6px;
}

.rs-tag-sm {
  font-size: 11px;
  padding: 1px 6px;
}

.rs-col-score {
  width: 56px;
  text-align: center;
}

.rs-col-attention {
  width: 70px;
}

.rs-col-status {
  width: 72px;
}

.rs-col-action {
  width: 60px;
}

.rs-score-na {
  color: var(--rs-text-dim);
  font-size: 14px;
}

/* ---------- 小分数圆环 ---------- */
.rs-score-ring-sm {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.rs-score-ring-sm svg {
  transform: rotate(-90deg);
}

.rs-ring-track {
  fill: none;
  stroke: var(--rs-bg-surface-3);
}

.rs-ring-fill {
  fill: none;
  stroke: var(--rs-brand-400);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--rs-transition-slow);
}

.rs-score-ring-sm.rs-score-good .rs-ring-fill {
  stroke: var(--rs-success);
}

.rs-score-ring-sm.rs-score-warning .rs-ring-fill {
  stroke: var(--rs-warning);
}

.rs-score-ring-sm.rs-score-danger .rs-ring-fill {
  stroke: var(--rs-error);
}

.rs-ring-value {
  position: absolute;
  font-size: 10px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

/* ---------- 关注度 ---------- */
.rs-attention {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-attention-icon {
  width: 14px;
  height: 14px;
  color: var(--rs-warning);
}

.rs-attention-text {
  font-size: 11px;
}

/* ---------- 状态徽章 ---------- */
.rs-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--rs-radius-full);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.rs-status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.rs-status-badge.pending {
  background: var(--rs-bg-surface-3);
  color: var(--rs-text-muted);
}

.rs-status-badge.analyzing {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
}

.rs-status-badge.reviewed {
  background: var(--rs-success-bg);
  color: var(--rs-success);
}

/* ---------- 空状态 ---------- */
.rs-empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--rs-text-muted);
  font-size: 13px;
}

/* ---------- 详情面板 ---------- */
.rs-detail-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--rs-border-subtle);
}

.rs-detail-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 6px;
  line-height: 1.3;
}

.rs-detail-authors {
  font-size: 13px;
  color: var(--rs-text-secondary);
  margin-bottom: 10px;
}

.rs-detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.rs-detail-time {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-detail-time svg {
  width: 14px;
  height: 14px;
}

.rs-detail-actions {
  display: flex;
  gap: 8px;
}

.rs-detail-actions .rs-btn svg {
  width: 14px;
  height: 14px;
}

.rs-detail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rs-detail-body::-webkit-scrollbar {
  width: 6px;
}

.rs-detail-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 3px;
}

/* ---------- 综合评分卡 ---------- */
.rs-score-card {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.rs-score-ring-lg {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-score-ring-lg svg {
  transform: rotate(-90deg);
}

.rs-ring-track-lg {
  fill: none;
  stroke: var(--rs-bg-surface-3);
}

.rs-ring-fill-lg {
  fill: none;
  stroke: var(--rs-brand-400);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--rs-transition-slow);
}

.rs-ring-lg-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.rs-ring-lg-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--rs-text-primary);
  letter-spacing: -0.02em;
  line-height: 1;
}

.rs-ring-lg-label {
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-score-bars {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-score-bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-score-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.rs-score-bar-name {
  color: var(--rs-text-secondary);
  font-weight: 500;
}

.rs-score-bar-num {
  color: var(--rs-text-primary);
  font-weight: 600;
  font-family: var(--rs-font-mono);
}

.rs-score-bar-track {
  height: 6px;
  background: var(--rs-bg-surface-3);
  border-radius: 3px;
  overflow: hidden;
}

.rs-score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--rs-transition-slow);
}

.rs-bar-novelty {
  background: linear-gradient(90deg, var(--rs-brand-500), var(--rs-brand-400));
}

.rs-bar-correctness {
  background: linear-gradient(90deg, var(--rs-error), #fca5a5);
}

.rs-bar-completeness {
  background: linear-gradient(90deg, var(--rs-info), #93c5fd);
}

.rs-bar-clarity {
  background: linear-gradient(90deg, var(--rs-success), #6ee7b7);
}

/* ---------- 问题发现漏斗 ---------- */
.rs-finding-funnel {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  padding: 16px;
}

.rs-finding-funnel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rs-finding-funnel-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-finding-count {
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-funnel-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.rs-funnel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  background: var(--rs-bg-surface);
  border-radius: var(--rs-radius-md);
  border: 1px solid var(--rs-border-subtle);
}

.rs-funnel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.rs-funnel-critical {
  background: var(--rs-error);
  box-shadow: 0 0 6px rgba(248, 113, 113, 0.4);
}

.rs-funnel-major {
  background: var(--rs-brand-400);
  box-shadow: 0 0 6px var(--rs-brand-glow);
}

.rs-funnel-minor {
  background: var(--rs-warning);
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.4);
}

.rs-funnel-info {
  background: var(--rs-info);
  box-shadow: 0 0 6px rgba(96, 165, 250, 0.4);
}

.rs-funnel-label {
  font-size: 11px;
  color: var(--rs-text-secondary);
}

.rs-funnel-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--rs-text-primary);
}

/* ---------- 问题列表 ---------- */
.rs-finding-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-finding-item {
  display: flex;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  overflow: hidden;
  transition: all var(--rs-transition-fast);
}

.rs-finding-item:hover {
  border-color: var(--rs-border-default);
}

.rs-finding-item.read {
  opacity: 0.6;
}

.rs-finding-severity-bar {
  width: 4px;
  flex-shrink: 0;
  background: var(--rs-brand-400);
}

.rs-finding-item.critical .rs-finding-severity-bar {
  background: var(--rs-error);
}

.rs-finding-item.major .rs-finding-severity-bar {
  background: var(--rs-brand-400);
}

.rs-finding-item.minor .rs-finding-severity-bar {
  background: var(--rs-warning);
}

.rs-finding-item.info .rs-finding-severity-bar {
  background: var(--rs-info);
}

.rs-finding-content {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
}

.rs-finding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  cursor: pointer;
}

.rs-finding-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rs-finding-category-tag {
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-finding-severity-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: var(--rs-radius-sm);
}

.rs-finding-severity-tag.critical {
  background: var(--rs-error-bg);
  color: var(--rs-error);
  border: 1px solid var(--rs-error-border);
}

.rs-finding-severity-tag.major {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
  border: 1px solid var(--rs-brand-500-soft-2);
}

.rs-finding-severity-tag.minor {
  background: var(--rs-warning-bg);
  color: var(--rs-warning);
  border: 1px solid var(--rs-warning-border);
}

.rs-finding-severity-tag.info {
  background: var(--rs-info-bg);
  color: var(--rs-info);
  border: 1px solid var(--rs-info-border);
}

.rs-finding-expand-icon {
  width: 16px;
  height: 16px;
  color: var(--rs-text-muted);
  transition: transform var(--rs-transition-fast);
  flex-shrink: 0;
}

.rs-finding-expand-icon.expanded {
  transform: rotate(180deg);
}

.rs-finding-description {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.rs-finding-location {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--rs-text-muted);
  margin-bottom: 10px;
}

.rs-finding-location svg {
  width: 12px;
  height: 12px;
}

.rs-finding-evidence {
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-sm);
  padding: 10px 12px;
  margin-bottom: 10px;
}

.rs-finding-evidence-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-brand-400);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 6px;
}

.rs-finding-evidence-content {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
}

.rs-finding-evidence-content p {
  margin-bottom: 6px;
}

.rs-finding-evidence-content ul {
  padding-left: 16px;
  list-style: disc;
}

.rs-finding-evidence-content li {
  margin-bottom: 3px;
}

.rs-finding-actions {
  display: flex;
  gap: 6px;
}

.rs-finding-actions .rs-btn svg {
  width: 12px;
  height: 12px;
}

/* ---------- 反例构造区 ---------- */
.rs-counterexample-section {
  background: var(--rs-error-bg);
  border: 1px solid var(--rs-error-border);
  border-radius: var(--rs-radius-lg);
  padding: 16px;
}

.rs-counterexample-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.rs-counterexample-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs-radius-md);
  background: rgba(248, 113, 113, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-error);
  flex-shrink: 0;
}

.rs-counterexample-icon svg {
  width: 20px;
  height: 20px;
}

.rs-counterexample-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 2px;
}

.rs-counterexample-header p {
  font-size: 12px;
  color: var(--rs-text-secondary);
}

.rs-counterexample-body {
  margin-bottom: 14px;
}

.rs-counterexample-formula {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-error-border);
  border-radius: var(--rs-radius-md);
  margin-bottom: 10px;
}

.rs-formula-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-error);
  flex-shrink: 0;
}

.rs-counterexample-formula code {
  font-family: var(--rs-font-mono);
  font-size: 13px;
  color: var(--rs-text-primary);
}

.rs-counterexample-desc {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
}

.rs-counterexample-desc p {
  margin-bottom: 6px;
}

.rs-counterexample-desc p:last-child {
  margin-bottom: 0;
}

.rs-counterexample-actions {
  display: flex;
  gap: 8px;
}

/* ---------- 报告生成区 ---------- */
.rs-report-section {
  background: var(--rs-brand-500-soft);
  border: 1px solid var(--rs-brand-500-soft-2);
  border-radius: var(--rs-radius-lg);
  padding: 16px;
}

.rs-report-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.rs-report-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs-radius-md);
  background: var(--rs-brand-500-soft-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-brand-400);
  flex-shrink: 0;
}

.rs-report-icon svg {
  width: 20px;
  height: 20px;
}

.rs-report-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 2px;
}

.rs-report-header p {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
}

.rs-report-actions {
  display: flex;
  gap: 8px;
}

.rs-spin-icon {
  width: 16px;
  height: 16px;
  animation: rs-spin 1s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 详情空状态 ---------- */
.rs-detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--rs-text-muted);
}

.rs-empty-illustration {
  width: 64px;
  height: 64px;
  border-radius: var(--rs-radius-lg);
  background: var(--rs-bg-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-text-dim);
  margin-bottom: 8px;
}

.rs-empty-illustration svg {
  width: 32px;
  height: 32px;
}

.rs-detail-empty h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--rs-text-secondary);
}

.rs-detail-empty p {
  font-size: 13px;
  color: var(--rs-text-muted);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1440px) {
  .rs-review-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .rs-g2 {
    grid-template-columns: 1fr;
  }
}
</style>
