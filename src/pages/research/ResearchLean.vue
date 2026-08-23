<template>
  <div class="rs-immersive rs-lean-workbench">
    <!-- 工作台顶栏 -->
    <div class="rs-workbench-bar">
      <!-- 左侧：标题和状态 -->
      <div class="rs-wb-left">
        <div class="rs-wb-title">
          <strong>GNN-Path Convergence</strong>
          <span>{{ currentFile }} · 第 {{ currentLine }} 行</span>
        </div>
        <div class="rs-wb-status" :class="buildStatus">
          <span class="rs-wb-status-dot"></span>
          <span class="rs-wb-status-text">{{ statusText }}</span>
          <span v-if="buildStatus === 'building'" class="rs-wb-status-progress">{{ buildProgress }}%</span>
        </div>
      </div>

      <!-- 中间：工具链信息 -->
      <div class="rs-wb-meta">
        <span class="rs-wb-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
          Lean v4.12.0
        </span>
        <span class="rs-wb-meta-divider"></span>
        <span class="rs-wb-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Mathlib v2026.08
        </span>
        <span class="rs-wb-meta-divider"></span>
        <span class="rs-wb-meta-item rs-wb-mode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0 0-9h-11A4.5 4.5 0 0 0 6.5 19z"/><polyline points="12 2 12 6 12 2"/></svg>
          FULL 云端
        </span>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="rs-wb-actions">
        <button class="rs-btn rs-btn-sm rs-btn-ghost" @click="handleSave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          保存
        </button>
        <button class="rs-btn rs-btn-sm rs-btn-ghost" @click="handleCheckSyntax">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          检查语法
        </button>
        <button v-if="buildStatus !== 'building'" class="rs-btn rs-btn-sm rs-btn-primary" @click="handleBuild">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          构建
        </button>
        <button v-else class="rs-btn rs-btn-sm rs-btn-danger" @click="handleCancelBuild">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"/></svg>
          取消
        </button>
        <button class="rs-btn rs-btn-sm rs-btn-ghost rs-btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>
    </div>

    <!-- 三栏工作台布局 -->
    <div class="rs-workbench-layout">
      <!-- 左栏：文件/大纲面板 -->
      <div class="rs-file-pane">
        <div class="rs-pane-tabs">
          <button
            class="rs-pane-tab"
            :class="{ active: activePane === 'files' }"
            @click="activePane = 'files'"
          >
            文件
          </button>
          <button
            class="rs-pane-tab"
            :class="{ active: activePane === 'outline' }"
            @click="activePane = 'outline'"
          >
            大纲
          </button>
        </div>
        <div class="rs-pane-body">
          <!-- 文件视图 -->
          <div v-if="activePane === 'files'" class="rs-file-tree">
            <div class="rs-file-folder">
              <div class="rs-file-folder-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span>GNN-Path</span>
              </div>
              <div class="rs-file-folder-children">
                <div
                  v-for="file in fileList"
                  :key="file.name"
                  class="rs-file-item"
                  :class="{ active: currentFile === file.name }"
                  @click="switchFile(file.name)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span class="rs-file-item-name">{{ file.name }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 大纲视图 -->
          <div v-else class="rs-outline">
            <div
              v-for="item in outlineItems"
              :key="item.name"
              class="rs-outline-item"
              :style="{ paddingLeft: (item.level * 16 + 8) + 'px' }"
              @click="scrollToLine(item.line)"
            >
              <span class="rs-outline-icon" :class="item.status">
                <svg v-if="item.status === 'proven'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>
              </span>
              <span class="rs-outline-name">{{ item.name }}</span>
              <span class="rs-outline-line">L{{ item.line }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 中栏：代码编辑器 -->
      <div class="rs-code-editor">
        <div class="rs-code-tabs">
          <div class="rs-code-tab active">
            <svg class="rs-code-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>{{ currentFile }}</span>
            <button class="rs-code-tab-close" @click="closeFile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="rs-code-editor-body" ref="editorBodyRef">
          <div class="rs-code-grid">
            <!-- 行号区 -->
            <div class="rs-line-numbers">
              <div
                v-for="n in codeLines.length"
                :key="n"
                class="rs-line-num"
                :class="{
                  active: n === currentLine,
                  error: errorLines.includes(n),
                  warning: warningLines.includes(n)
                }"
              >{{ n + startLine - 1 }}</div>
            </div>
            <!-- 代码内容区 -->
            <div class="rs-code-content">
              <div
                v-for="(line, idx) in codeLines"
                :key="idx"
                class="rs-code-line"
                :class="{
                  active: idx + 1 === currentLine,
                  error: errorLines.includes(idx + 1),
                  warning: warningLines.includes(idx + 1)
                }"
                @click="setCurrentLine(idx + 1)"
              >
                <span class="rs-code-line-gutter"></span>
                <span class="rs-code-line-text" v-html="highlightCode(line)"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：目标视图 -->
      <div class="rs-goal-pane">
        <div class="rs-goal-header">
          <span class="rs-goal-title">Infoview</span>
          <span class="rs-goal-location">@ {{ currentFile }}:{{ currentLine }}</span>
        </div>
        <div class="rs-goal-body">
          <div v-if="currentGoal" class="rs-goal-area">
            <div class="rs-goal-context">
              <div class="rs-goal-context-label">假设</div>
              <div
                v-for="(h, idx) in currentGoal.hypotheses"
                :key="idx"
                class="rs-goal-hypothesis"
              >
                <span class="rs-hyp-name">h{{ idx + 1 }}</span>
                <span class="rs-hyp-sep">:</span>
                <span class="rs-hyp-type">{{ h }}</span>
              </div>
            </div>
            <div class="rs-goal-divider">
              <span class="rs-goal-turnstile">⊢</span>
            </div>
            <div class="rs-goal-target">
              <span v-html="highlightGoal(currentGoal.target)"></span>
            </div>
          </div>
          <div v-else class="rs-goal-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p>将光标移动到定理内部查看证明目标</p>
          </div>

          <!-- 证明确认记录 -->
          <div class="rs-proof-history">
            <div class="rs-proof-history-label">证明步骤</div>
            <div
              v-for="(step, idx) in proofSteps"
              :key="idx"
              class="rs-proof-step"
              :class="{ latest: idx === proofSteps.length - 1 && buildStatus === 'building' }"
            >
              <span class="rs-proof-step-tactic">{{ step.tactic }}</span>
              <span class="rs-proof-step-status" :class="step.status">
                <svg v-if="step.status === 'done'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else-if="step.status === 'active'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制台 -->
    <div class="rs-build-console" :class="{ collapsed: !consoleOpen }">
      <div class="rs-console-handle" @click="consoleOpen = !consoleOpen">
        <div class="rs-console-tabs">
          <button
            class="rs-console-tab"
            :class="{ active: consoleTab === 'problems' }"
            @click.stop="consoleTab = 'problems'; consoleOpen = true"
          >
            问题
            <span v-if="errorCount + warningCount > 0" class="rs-console-tab-badge" :class="{ error: errorCount > 0 }">
              {{ errorCount + warningCount }}
            </span>
          </button>
          <button
            class="rs-console-tab"
            :class="{ active: consoleTab === 'output' }"
            @click.stop="consoleTab = 'output'; consoleOpen = true"
          >
            输出
          </button>
          <button
            class="rs-console-tab"
            :class="{ active: consoleTab === 'terminal' }"
            @click.stop="consoleTab = 'terminal'; consoleOpen = true"
          >
            终端
          </button>
          <button
            class="rs-console-tab"
            :class="{ active: consoleTab === 'infoview' }"
            @click.stop="consoleTab = 'infoview'; consoleOpen = true"
          >
            Infoview
          </button>
          <button class="rs-console-toggle" @click.stop="consoleOpen = !consoleOpen">
            <svg v-if="consoleOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
        </div>
      </div>
      <div v-show="consoleOpen" class="rs-console-body" ref="consoleBodyRef">
        <!-- 问题标签 -->
        <div v-if="consoleTab === 'problems'" class="rs-problems-list">
          <div v-if="errorCount + warningCount === 0" class="rs-problems-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            未发现问题
          </div>
          <div
            v-for="(problem, idx) in problems"
            :key="idx"
            class="rs-problem-item"
            :class="problem.severity"
          >
            <span class="rs-problem-icon">
              <svg v-if="problem.severity === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <span class="rs-problem-msg">{{ problem.message }}</span>
            <span class="rs-problem-loc">{{ problem.file }}:{{ problem.line }}</span>
          </div>
        </div>

        <!-- 输出标签 -->
        <div v-else-if="consoleTab === 'output'" class="rs-console-output">
          <div
            v-for="(log, idx) in buildLogs"
            :key="idx"
            class="rs-console-log"
            :class="log.type"
          >
            <span class="rs-console-log-time">[{{ log.time }}]</span>
            <span class="rs-console-log-msg">{{ log.message }}</span>
          </div>
          <div v-if="buildLogs.length === 0" class="rs-console-empty">
            暂无构建输出。点击「构建」开始编译。
          </div>
        </div>

        <!-- 终端标签 -->
        <div v-else-if="consoleTab === 'terminal'" class="rs-terminal">
          <div class="rs-terminal-line">
            <span class="rs-terminal-prompt">lean@cloud:~/gnn_path_planning$</span>
            <span class="rs-terminal-cursor"></span>
          </div>
        </div>

        <!-- Infoview 标签（详细版） -->
        <div v-else-if="consoleTab === 'infoview'" class="rs-infoview-detail">
          <div v-if="currentGoal" class="rs-infoview-goal">
            <div class="rs-infoview-section-title">当前目标</div>
            <div class="rs-goal-area rs-goal-area-large">
              <div class="rs-goal-context">
                <div class="rs-goal-context-label">假设 (Hypotheses)</div>
                <div
                  v-for="(h, idx) in currentGoal.hypotheses"
                  :key="idx"
                  class="rs-goal-hypothesis"
                >
                  <span class="rs-hyp-name">h{{ idx + 1 }}</span>
                  <span class="rs-hyp-sep">:</span>
                  <span class="rs-hyp-type">{{ h }}</span>
                </div>
              </div>
              <div class="rs-goal-divider">
                <span class="rs-goal-turnstile">⊢</span>
              </div>
              <div class="rs-goal-target">
                <span v-html="highlightGoal(currentGoal.target)"></span>
              </div>
            </div>
          </div>
          <div v-else class="rs-console-empty">
            暂无目标信息
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { researchLeanApi } from '@/api/research'
import type { LeanFile, LeanBuildStatus, LeanGoal } from '@/types/research'

// ===== 状态管理 =====
const buildStatus = ref<'idle' | 'building' | 'success' | 'failed' | 'cancelled'>('idle')
const buildProgress = ref(0)
const currentFile = ref('Convergence.lean')
const activePane = ref<'files' | 'outline'>('files')
const consoleOpen = ref(true)
const consoleTab = ref<'problems' | 'output' | 'terminal' | 'infoview'>('output')
const goals = ref<LeanGoal[]>([])
const buildLogs = ref<{ time: string; message: string; type: string }[]>([])
const currentLine = ref(7)
const startLine = ref(1)

// refs
const editorBodyRef = ref<HTMLElement | null>(null)
const consoleBodyRef = ref<HTMLElement | null>(null)

// 构建定时器
let buildTimer: ReturnType<typeof setInterval> | null = null

// ===== 计算属性 =====
const statusText = computed(() => {
  switch (buildStatus.value) {
    case 'building': return '构建中…'
    case 'success': return '构建成功'
    case 'failed': return '构建失败'
    case 'cancelled': return '已取消'
    default: return '待构建'
  }
})

const fileList = ref([
  { name: 'Convergence.lean', type: 'lean' },
  { name: 'Preliminaries.lean', type: 'lean' },
  { name: 'GraphBasics.lean', type: 'lean' },
  { name: 'README.md', type: 'md' },
])

const outlineItems = ref([
  { name: 'import Mathlib', level: 0, line: 1, status: 'proven' },
  { name: 'theorem convergence_main', level: 0, line: 5, status: 'proven' },
  { name: '  lemma path_exists', level: 1, line: 8, status: 'proven' },
  { name: '  lemma distance_bound', level: 1, line: 15, status: 'proven' },
  { name: '  theorem main_result', level: 1, line: 23, status: 'pending' },
  { name: '    have h1 :', level: 2, line: 25, status: 'pending' },
  { name: '    have h2 :', level: 2, line: 30, status: 'pending' },
  { name: '    exact', level: 2, line: 35, status: 'pending' },
  { name: '#check convergence_main', level: 0, line: 40, status: 'proven' },
])

const codeLines = ref([
  'import Mathlib.Topology.Basic',
  'import Mathlib.Analysis.NormedSpace.Basic',
  '',
  'open Filter Topology',
  '',
  '/-- GNN 路径收敛性主定理 -/',
  'theorem convergence_main {V : Type*} [Fintype V]',
  '  (G : DirectedGraph V) (w : V → V → ℝ)',
  '  (hw_nonneg : ∀ v u, 0 ≤ w v u)',
  '  (hw_pos : ∀ v u, G.adj v u → 0 < w v u) :',
  '  ∃ (C : ℝ), ∀ (n : ℕ), dist (path_length G w n) (shortest_path G w) ≤ C / (n + 1) := by',
  '  have h_path_exists : ∀ v u, G.Reachable v u := by',
  '    intro v u',
  '    exact G.strongly_connected v u',
  '  have h_distance_bound : ∀ n, dist (path_length G w n) (shortest_path G w) ≤ dist (path_length G w 0) (shortest_path G w) := by',
  '    intro n',
  '    apply dist_nonneg',
  '  have h_monotone : Monotone (fun n => dist (path_length G w n) (shortest_path G w)) := by',
  '    intro n m hnm',
  '    simpa using h_distance_bound m',
  '  use dist (path_length G w 0) (shortest_path G w)',
  '  intro n',
  '  have h1 := h_distance_bound n',
  '  have h2 : 0 < (n + 1 : ℝ) := by positivity',
  '  calc',
  '    dist (path_length G w n) (shortest_path G w)',
  '      ≤ dist (path_length G w 0) (shortest_path G w) := h1',
  '    _ = dist (path_length G w 0) (shortest_path G w) * 1 := by ring',
  '    _ ≤ dist (path_length G w 0) (shortest_path G w) * ((n + 1 : ℝ)) := by',
  '      gcongr',
  '      linarith',
  '    _ = dist (path_length G w 0) (shortest_path G w) * (n + 1 : ℝ) := by ring',
  '  -- TODO: 完善收敛速率证明',
  '  sorry',
  '',
  '#check convergence_main',
  '#print convergence_main',
])

const errorLines = ref<number[]>([])
const warningLines = ref<number[]>([28])

const errorCount = computed(() => errorLines.value.length)
const warningCount = computed(() => warningLines.value.length)

const problems = computed(() => {
  const result: { severity: string; message: string; file: string; line: number }[] = []
  warningLines.value.forEach(line => {
    result.push({
      severity: 'warning',
      message: '`sorry` 使用警告：定理尚未完全证明',
      file: currentFile.value,
      line: line + startLine.value - 1,
    })
  })
  errorLines.value.forEach(line => {
    result.push({
      severity: 'error',
      message: '类型不匹配：期望 `ℝ`，得到 `ℕ`',
      file: currentFile.value,
      line: line + startLine.value - 1,
    })
  })
  return result
})

const currentGoal = computed<LeanGoal | null>(() => {
  if (currentLine.value >= 5 && currentLine.value <= 32) {
    return {
      target: '∃ (C : ℝ), ∀ (n : ℕ), dist (path_length G w n) (shortest_path G w) ≤ C / (n + 1)',
      hypotheses: [
        'V : Type*',
        'G : DirectedGraph V',
        'w : V → V → ℝ',
        'hw_nonneg : ∀ v u, 0 ≤ w v u',
        'hw_pos : ∀ v u, G.adj v u → 0 < w v u',
        'h_path_exists : ∀ v u, G.Reachable v u',
        'h_distance_bound : ∀ n, dist (path_length G w n) (shortest_path G w) ≤ dist (path_length G w 0) (shortest_path G w)',
      ],
    }
  }
  return null
})

const proofSteps = ref([
  { tactic: 'intro n', status: 'done' },
  { tactic: 'have h_path_exists', status: 'done' },
  { tactic: 'have h_distance_bound', status: 'done' },
  { tactic: 'have h_monotone', status: 'done' },
  { tactic: 'use dist (...)', status: 'active' },
  { tactic: 'calc', status: 'pending' },
  { tactic: '  _ ≤ _', status: 'pending' },
  { tactic: '  _ = _', status: 'pending' },
])

// ===== 方法 =====
function highlightCode(line: string): string {
  if (!line.trim()) return '&nbsp;'
  if (line.trim().startsWith('--')) {
    return `<span class="rs-ck-comment">${escapeHtml(line)}</span>`
  }

  let result = escapeHtml(line)

  // 注释（行内）
  result = result.replace(/(--\s.*)$/g, '<span class="rs-ck-comment">$1</span>')

  // 关键字
  const keywords = ['theorem', 'lemma', 'have', 'exact', 'apply', 'by', 'intro', 'use', 'calc', 'open', 'import', '#check', '#print', 'def', 'inductive', 'structure', 'class', 'instance', 'variable', 'variables', 'section', 'namespace', 'end']
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g')
    result = result.replace(regex, `<span class="rs-ck-keyword">$1</span>`)
  })

  // tactic 关键字
  const tactics = ['simpa', 'positivity', 'linarith', 'gcongr', 'ring', 'simp', 'rw', 'refine', 'cases', 'induction', 'split', 'left', 'right', 'exists']
  tactics.forEach(t => {
    const regex = new RegExp(`\\b(${t})\\b`, 'g')
    result = result.replace(regex, `<span class="rs-ck-tactic">$1</span>`)
  })

  // 类型
  const types = ['Type', 'Type*', 'ℝ', 'ℕ', 'ℤ', 'Prop', 'Fintype', 'DirectedGraph', 'Filter', 'Topology']
  types.forEach(t => {
    const regex = new RegExp(`\\b(${t.replace(/[*]/g, '\\*')})\\b`, 'g')
    result = result.replace(regex, `<span class="rs-ck-type">$1</span>`)
  })

  // 定理/定义名称
  result = result.replace(/\b(theorem|lemma|def)\s+(\w+)/g, '$1 <span class="rs-ck-definition">$2</span>')

  // 字符串/数字
  result = result.replace(/(\d+)/g, '<span class="rs-ck-number">$1</span>')

  return result
}

function highlightGoal(target: string): string {
  let result = escapeHtml(target)
  // ∀, ∃, →, =, ≤ 等符号
  result = result.replace(/(∀|∃|→|↔|∧|∨|¬|≤|≥|≠)/g, '<span class="rs-goal-symbol">$1</span>')
  // 类型
  result = result.replace(/\b(ℝ|ℕ|ℤ|Type|Prop)\b/g, '<span class="rs-ck-type">$1</span>')
  // 定理名称
  result = result.replace(/^(\w+)\s*:/, '<span class="rs-goal-theorem">$1</span> :')
  return result
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function setCurrentLine(line: number) {
  currentLine.value = line
}

function scrollToLine(line: number) {
  currentLine.value = line
  if (editorBodyRef.value) {
    const codeLine = editorBodyRef.value.querySelector(`.rs-code-line:nth-child(${line})`)
    codeLine?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function switchFile(name: string) {
  currentFile.value = name
  currentLine.value = 1
  // 模拟切换文件内容变化
  if (name === 'Preliminaries.lean') {
    codeLines.value = [
      'import Mathlib.Data.Real.Basic',
      '',
      'namespace GNN',
      '',
      '/-- 基础定义和引理 -/',
      'def Graph (V : Type*) := V → V → Prop',
      '',
      'def path_length {V : Type*} (G : Graph V) (w : V → V → ℝ) (n : ℕ) : ℝ :=',
      '  sorry',
      '',
      'def shortest_path {V : Type*} (G : Graph V) (w : V → V → ℝ) : ℝ :=',
      '  sorry',
      '',
      'end GNN',
    ]
    outlineItems.value = [
      { name: 'import Mathlib', level: 0, line: 1, status: 'proven' },
      { name: 'namespace GNN', level: 0, line: 3, status: 'proven' },
      { name: 'def Graph', level: 1, line: 6, status: 'proven' },
      { name: 'def path_length', level: 1, line: 8, status: 'proven' },
      { name: 'def shortest_path', level: 1, line: 11, status: 'proven' },
      { name: 'end GNN', level: 0, line: 14, status: 'proven' },
    ]
  } else if (name === 'GraphBasics.lean') {
    codeLines.value = [
      'import Mathlib.Combinatorics.SimpleGraph.Basic',
      '',
      'open SimpleGraph',
      '',
      '/-- 有向图基础性质 -/',
      'structure DirectedGraph (V : Type*) where',
      '  adj : V → V → Prop',
      '  refl : ∀ v, adj v v',
      '  trans : ∀ v u w, adj v u → adj u w → adj v w',
      '',
      'namespace DirectedGraph',
      '',
      'def Reachable {V : Type*} (G : DirectedGraph V) (v u : V) : Prop :=',
      '  G.adj v u',
      '',
      'lemma strongly_connected {V : Type*} [Fintype V]',
      '  (G : DirectedGraph V) : ∀ v u, G.Reachable v u := by',
      '  intro v u',
      '  exact G.trans v v u (G.refl v) (G.refl v)',
      '',
      'end DirectedGraph',
    ]
    outlineItems.value = [
      { name: 'import ...', level: 0, line: 1, status: 'proven' },
      { name: 'structure DirectedGraph', level: 0, line: 6, status: 'proven' },
      { name: '  adj', level: 1, line: 7, status: 'proven' },
      { name: '  refl', level: 1, line: 8, status: 'proven' },
      { name: '  trans', level: 1, line: 9, status: 'proven' },
      { name: 'def Reachable', level: 1, line: 13, status: 'proven' },
      { name: 'lemma strongly_connected', level: 1, line: 16, status: 'proven' },
    ]
  } else if (name === 'README.md') {
    codeLines.value = [
      '# GNN-Path Convergence',
      '',
      '基于 Lean4 的 GNN 路径收敛性形式化验证项目。',
      '',
      '## 文件结构',
      '',
      '- `Convergence.lean` - 主收敛性定理',
      '- `Preliminaries.lean` - 基础定义',
      '- `GraphBasics.lean` - 图论基础',
      '',
      '## 构建',
      '',
      '使用 `lake build` 构建项目。',
    ]
    outlineItems.value = [
      { name: 'GNN-Path Convergence', level: 0, line: 1, status: 'proven' },
      { name: '文件结构', level: 0, line: 5, status: 'proven' },
      { name: '构建', level: 0, line: 12, status: 'proven' },
    ]
  } else {
    // Convergence.lean - 恢复原始内容
    codeLines.value = [
      'import Mathlib.Topology.Basic',
      'import Mathlib.Analysis.NormedSpace.Basic',
      '',
      'open Filter Topology',
      '',
      '/-- GNN 路径收敛性主定理 -/',
      'theorem convergence_main {V : Type*} [Fintype V]',
      '  (G : DirectedGraph V) (w : V → V → ℝ)',
      '  (hw_nonneg : ∀ v u, 0 ≤ w v u)',
      '  (hw_pos : ∀ v u, G.adj v u → 0 < w v u) :',
      '  ∃ (C : ℝ), ∀ (n : ℕ), dist (path_length G w n) (shortest_path G w) ≤ C / (n + 1) := by',
      '  have h_path_exists : ∀ v u, G.Reachable v u := by',
      '    intro v u',
      '    exact G.strongly_connected v u',
      '  have h_distance_bound : ∀ n, dist (path_length G w n) (shortest_path G w) ≤ dist (path_length G w 0) (shortest_path G w) := by',
      '    intro n',
      '    apply dist_nonneg',
      '  have h_monotone : Monotone (fun n => dist (path_length G w n) (shortest_path G w)) := by',
      '    intro n m hnm',
      '    simpa using h_distance_bound m',
      '  use dist (path_length G w 0) (shortest_path G w)',
      '  intro n',
      '  have h1 := h_distance_bound n',
      '  have h2 : 0 < (n + 1 : ℝ) := by positivity',
      '  calc',
      '    dist (path_length G w n) (shortest_path G w)',
      '      ≤ dist (path_length G w 0) (shortest_path G w) := h1',
      '    _ = dist (path_length G w 0) (shortest_path G w) * 1 := by ring',
      '    _ ≤ dist (path_length G w 0) (shortest_path G w) * ((n + 1 : ℝ)) := by',
      '      gcongr',
      '      linarith',
      '    _ = dist (path_length G w 0) (shortest_path G w) * (n + 1 : ℝ) := by ring',
      '  -- TODO: 完善收敛速率证明',
      '  sorry',
      '',
      '#check convergence_main',
      '#print convergence_main',
    ]
    outlineItems.value = [
      { name: 'import Mathlib', level: 0, line: 1, status: 'proven' },
      { name: 'theorem convergence_main', level: 0, line: 5, status: 'proven' },
      { name: '  lemma path_exists', level: 1, line: 8, status: 'proven' },
      { name: '  lemma distance_bound', level: 1, line: 15, status: 'proven' },
      { name: '  theorem main_result', level: 1, line: 23, status: 'pending' },
      { name: '    have h1 :', level: 2, line: 25, status: 'pending' },
      { name: '    have h2 :', level: 2, line: 30, status: 'pending' },
      { name: '    exact', level: 2, line: 35, status: 'pending' },
      { name: '#check convergence_main', level: 0, line: 40, status: 'proven' },
    ]
  }
}

function closeFile() {
  // 模拟关闭标签 - 仅保留当前文件
}

function handleSave() {
  buildLogs.value.push({
    time: formatTime(new Date()),
    message: `已保存 ${currentFile.value}`,
    type: 'info',
  })
  scrollConsoleToBottom()
}

function handleCheckSyntax() {
  buildLogs.value.push({
    time: formatTime(new Date()),
    message: `正在检查 ${currentFile.value} 语法...`,
    type: 'info',
  })
  setTimeout(() => {
    buildLogs.value.push({
      time: formatTime(new Date()),
      message: `语法检查完成：${warningLines.value.length} 个警告，0 个错误`,
      type: 'success',
    })
    scrollConsoleToBottom()
  }, 800)
  scrollConsoleToBottom()
}

function handleBuild() {
  if (buildStatus.value === 'building') return

  buildStatus.value = 'building'
  buildProgress.value = 0
  consoleOpen.value = true
  buildLogs.value = []

  const logMessages = [
    { msg: '启动 Lean 构建服务...', type: 'info' },
    { msg: '项目: GNN-Path / Convergence.lean', type: 'info' },
    { msg: '工具链: Lean v4.12.0, Mathlib v2026.08', type: 'info' },
    { msg: '模式: FULL 云端构建', type: 'info' },
    { msg: '解析依赖...', type: '' },
    { msg: '  正在加载 Mathlib...', type: '' },
    { msg: '  Mathlib 加载完成 (2.3s)', type: 'success' },
    { msg: '编译 Preliminaries.lean', type: '' },
    { msg: '  ✓ Preliminaries.lean 编译成功', type: 'success' },
    { msg: '编译 GraphBasics.lean', type: '' },
    { msg: '  ✓ GraphBasics.lean 编译成功', type: 'success' },
    { msg: '编译 Convergence.lean', type: '' },
    { msg: '  正在检查类型...', type: '' },
    { msg: '  正在生成证明义务...', type: '' },
    { msg: '  ⚠ 第 28 行: 使用了 sorry', type: 'warn' },
    { msg: '  ✓ Convergence.lean 编译完成 (1 警告)', type: 'success' },
    { msg: '链接所有模块...', type: '' },
    { msg: '构建完成', type: 'success' },
  ]

  let logIndex = 0
  const totalSteps = logMessages.length

  buildTimer = setInterval(() => {
    if (logIndex < totalSteps) {
      const log = logMessages[logIndex]
      buildLogs.value.push({
        time: formatTime(new Date()),
        message: log.msg,
        type: log.type,
      })
      logIndex++
      buildProgress.value = Math.min(99, Math.floor((logIndex / totalSteps) * 100))
      scrollConsoleToBottom()
    } else {
      clearBuildTimer()
      buildStatus.value = 'success'
      buildProgress.value = 100
      buildLogs.value.push({
        time: formatTime(new Date()),
        message: '✓ 构建成功！共 4 个文件，1 个警告',
        type: 'success',
      })
      // 更新证明步骤状态
      proofSteps.value.forEach(s => { s.status = 'done' })
      scrollConsoleToBottom()
    }
  }, 280)
}

function handleCancelBuild() {
  clearBuildTimer()
  buildStatus.value = 'cancelled'
  buildLogs.value.push({
    time: formatTime(new Date()),
    message: '构建已取消',
    type: 'warn',
  })
  scrollConsoleToBottom()
}

function clearBuildTimer() {
  if (buildTimer) {
    clearInterval(buildTimer)
    buildTimer = null
  }
}

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function scrollConsoleToBottom() {
  nextTick(() => {
    if (consoleBodyRef.value) {
      consoleBodyRef.value.scrollTop = consoleBodyRef.value.scrollHeight
    }
  })
}

// 加载数据
async function loadData() {
  try {
    const files = await researchLeanApi.files('proj-gnn')
    if (files && files.length > 0) {
      // 使用 API 返回的数据（如果有）
    }
  } catch (e) {
    // 使用本地模拟数据
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* ============================================================
   Lean4 沉浸式工作台
   ============================================================ */

.rs-lean-workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--rs-bg-base);
  overflow: hidden;
}

/* ---------- 工作台顶栏 ---------- */
.rs-workbench-bar {
  height: 48px;
  background: var(--rs-bg-surface);
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 20px;
  flex-shrink: 0;
}

.rs-wb-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.rs-wb-title {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}

.rs-wb-title strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
}

.rs-wb-title span {
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-wb-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--rs-radius-full);
  background: var(--rs-bg-surface-2);
}

.rs-wb-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--rs-text-muted);
}

.rs-wb-status.idle .rs-wb-status-dot {
  background: var(--rs-text-muted);
}

.rs-wb-status.building .rs-wb-status-dot {
  background: var(--rs-warning);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  animation: rs-status-pulse 1.5s ease-in-out infinite;
}

.rs-wb-status.success .rs-wb-status-dot {
  background: var(--rs-success);
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

.rs-wb-status.failed .rs-wb-status-dot {
  background: var(--rs-error);
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
}

.rs-wb-status.cancelled .rs-wb-status-dot {
  background: var(--rs-text-muted);
}

.rs-wb-status-text {
  color: var(--rs-text-secondary);
}

.rs-wb-status.building .rs-wb-status-text {
  color: var(--rs-warning);
}

.rs-wb-status.success .rs-wb-status-text {
  color: var(--rs-success);
}

.rs-wb-status.failed .rs-wb-status-text {
  color: var(--rs-error);
}

.rs-wb-status-progress {
  font-family: var(--rs-font-mono);
  color: var(--rs-warning);
  font-weight: 500;
}

@keyframes rs-status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* 工具链信息 */
.rs-wb-meta {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-wb-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rs-wb-meta-item svg {
  width: 14px;
  height: 14px;
  color: var(--rs-text-dim);
}

.rs-wb-meta-divider {
  width: 1px;
  height: 14px;
  background: var(--rs-border-default);
}

.rs-wb-mode {
  color: var(--rs-brand-400);
  font-weight: 500;
}

.rs-wb-mode svg {
  color: var(--rs-brand-400);
}

/* 操作按钮 */
.rs-wb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ---------- 三栏工作台布局 ---------- */
.rs-workbench-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  min-height: 0;
  overflow: hidden;
}

/* ---------- 文件/大纲面板 ---------- */
.rs-file-pane {
  background: var(--rs-bg-surface);
  border-right: 1px solid var(--rs-border-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.rs-pane-tabs {
  display: flex;
  border-bottom: 1px solid var(--rs-border-subtle);
  flex-shrink: 0;
}

.rs-pane-tab {
  flex: 1;
  padding: 10px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--rs-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  transition: all var(--rs-transition-fast);
  margin-bottom: -1px;
}

.rs-pane-tab:hover {
  color: var(--rs-text-secondary);
}

.rs-pane-tab.active {
  color: var(--rs-brand-400);
  border-bottom-color: var(--rs-brand-400);
  background: var(--rs-bg-base);
}

.rs-pane-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.rs-pane-body::-webkit-scrollbar {
  width: 6px;
}

.rs-pane-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 3px;
}

/* 文件树 */
.rs-file-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-file-folder {
  display: flex;
  flex-direction: column;
}

.rs-file-folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-secondary);
  cursor: pointer;
  border-radius: var(--rs-radius-sm);
  transition: background var(--rs-transition-fast);
}

.rs-file-folder-header:hover {
  background: var(--rs-bg-hover);
}

.rs-file-folder-header svg {
  width: 16px;
  height: 16px;
  color: var(--rs-brand-400);
}

.rs-file-folder-children {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 4px;
  margin-top: 2px;
}

.rs-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  font-size: 13px;
  color: var(--rs-text-secondary);
  cursor: pointer;
  border-radius: var(--rs-radius-sm);
  transition: all var(--rs-transition-fast);
}

.rs-file-item:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-file-item.active {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
}

.rs-file-item svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.rs-file-item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 大纲 */
.rs-outline {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rs-outline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--rs-text-secondary);
  cursor: pointer;
  border-radius: var(--rs-radius-sm);
  transition: all var(--rs-transition-fast);
}

.rs-outline-item:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-outline-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-outline-icon svg {
  width: 12px;
  height: 12px;
}

.rs-outline-icon.proven {
  color: var(--rs-success);
}

.rs-outline-icon.pending {
  color: var(--rs-warning);
}

.rs-outline-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--rs-font-mono);
}

.rs-outline-line {
  font-size: 11px;
  color: var(--rs-text-dim);
  font-family: var(--rs-font-mono);
}

/* ---------- 代码编辑器 ---------- */
.rs-code-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--rs-bg-base);
}

.rs-code-tabs {
  height: 36px;
  background: var(--rs-bg-surface);
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  flex-shrink: 0;
}

.rs-code-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 100%;
  font-size: 13px;
  color: var(--rs-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--rs-transition-fast);
  font-family: var(--rs-font-mono);
}

.rs-code-tab:hover {
  color: var(--rs-text-secondary);
}

.rs-code-tab.active {
  color: var(--rs-text-primary);
  border-bottom-color: var(--rs-brand-400);
  background: var(--rs-bg-base);
}

.rs-code-tab-icon {
  width: 14px;
  height: 14px;
  color: var(--rs-brand-400);
}

.rs-code-tab-close {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--rs-transition-fast);
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.rs-code-tab:hover .rs-code-tab-close {
  opacity: 0.6;
}

.rs-code-tab-close:hover {
  opacity: 1 !important;
  background: var(--rs-bg-hover);
}

.rs-code-tab-close svg {
  width: 12px;
  height: 12px;
}

.rs-code-editor-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-family: var(--rs-font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--rs-text-primary);
}

.rs-code-editor-body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.rs-code-editor-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 5px;
}

.rs-code-editor-body::-webkit-scrollbar-track {
  background: var(--rs-bg-surface);
}

.rs-code-grid {
  display: flex;
  min-width: max-content;
  padding: 16px 0;
}

.rs-line-numbers {
  display: flex;
  flex-direction: column;
  padding: 0 12px 0 20px;
  text-align: right;
  user-select: none;
  flex-shrink: 0;
  border-right: 1px solid var(--rs-border-subtle);
}

.rs-line-num {
  height: 1.7em;
  font-size: 12px;
  color: var(--rs-text-dim);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  transition: color var(--rs-transition-fast);
}

.rs-line-num.active {
  color: var(--rs-brand-400);
  font-weight: 600;
}

.rs-line-num.warning {
  color: var(--rs-warning);
}

.rs-line-num.error {
  color: var(--rs-error);
}

.rs-code-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
}

.rs-code-line {
  height: 1.7em;
  display: flex;
  align-items: center;
  position: relative;
  cursor: text;
  transition: background var(--rs-transition-fast);
}

.rs-code-line:hover {
  background: rgba(255, 255, 255, 0.02);
}

.rs-code-line.active {
  background: var(--rs-brand-500-soft);
}

.rs-code-line-gutter {
  position: absolute;
  left: -24px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
}

.rs-code-line.warning .rs-code-line-gutter {
  background: var(--rs-warning);
}

.rs-code-line.error .rs-code-line-gutter {
  background: var(--rs-error);
}

.rs-code-line-text {
  white-space: pre;
}

/* 语法高亮 */
.rs-ck-keyword {
  color: var(--rs-brand-400);
  font-weight: 500;
}

.rs-ck-tactic {
  color: var(--rs-info);
}

.rs-ck-type {
  color: #a78bfa; /* 紫色 - 类型 */
}

.rs-ck-comment {
  color: var(--rs-text-muted);
  font-style: italic;
}

.rs-ck-definition {
  color: var(--rs-success);
  font-weight: 600;
}

.rs-ck-number {
  color: #f472b6; /* 粉色 - 数字 */
}

/* ---------- 目标视图 ---------- */
.rs-goal-pane {
  background: var(--rs-bg-surface);
  border-left: 1px solid var(--rs-border-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.rs-goal-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.rs-goal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--rs-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rs-goal-location {
  font-size: 11px;
  color: var(--rs-text-dim);
  font-family: var(--rs-font-mono);
}

.rs-goal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rs-goal-body::-webkit-scrollbar {
  width: 6px;
}

.rs-goal-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 3px;
}

.rs-goal-area {
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  padding: 12px;
  font-family: var(--rs-font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.rs-goal-context-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
}

.rs-goal-context {
  margin-bottom: 8px;
}

.rs-goal-hypothesis {
  display: flex;
  gap: 6px;
  padding: 2px 0;
  color: var(--rs-text-secondary);
}

.rs-hyp-name {
  color: var(--rs-info);
  font-weight: 500;
  flex-shrink: 0;
}

.rs-hyp-sep {
  color: var(--rs-text-dim);
}

.rs-hyp-type {
  flex: 1;
  color: var(--rs-text-primary);
  word-break: break-all;
}

.rs-goal-divider {
  display: flex;
  align-items: center;
  margin: 10px 0;
  position: relative;
}

.rs-goal-divider::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rs-border-default);
}

.rs-goal-turnstile {
  padding: 0 10px;
  color: var(--rs-brand-400);
  font-size: 14px;
  font-weight: 600;
}

.rs-goal-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rs-border-default);
}

.rs-goal-target {
  color: var(--rs-brand-300);
  font-weight: 500;
  padding: 4px 0;
  word-break: break-all;
}

.rs-goal-symbol {
  color: var(--rs-brand-400);
  font-weight: 600;
}

.rs-goal-theorem {
  color: var(--rs-success);
  font-weight: 600;
}

.rs-goal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--rs-text-muted);
  text-align: center;
  gap: 10px;
}

.rs-goal-empty svg {
  width: 32px;
  height: 32px;
  opacity: 0.4;
}

.rs-goal-empty p {
  font-size: 12px;
  line-height: 1.5;
}

/* 证明确认记录 */
.rs-proof-history {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-proof-history-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 4px;
}

.rs-proof-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  font-family: var(--rs-font-mono);
  font-size: 12px;
  border-radius: var(--rs-radius-sm);
  transition: all var(--rs-transition-fast);
}

.rs-proof-step.latest {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
}

.rs-proof-step-tactic {
  color: var(--rs-text-secondary);
}

.rs-proof-step.latest .rs-proof-step-tactic {
  color: var(--rs-brand-300);
  font-weight: 500;
}

.rs-proof-step-status {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-proof-step-status svg {
  width: 14px;
  height: 14px;
}

.rs-proof-step-status.done {
  color: var(--rs-success);
}

.rs-proof-step-status.active {
  color: var(--rs-brand-400);
  animation: rs-status-pulse 1.5s ease-in-out infinite;
}

.rs-proof-step-status.pending {
  color: var(--rs-text-dim);
}

/* ---------- 底部控制台 ---------- */
.rs-build-console {
  border-top: 1px solid var(--rs-border-subtle);
  background: var(--rs-bg-surface);
  display: flex;
  flex-direction: column;
  height: 240px;
  flex-shrink: 0;
  transition: height var(--rs-transition-base);
}

.rs-build-console.collapsed {
  height: 40px;
}

.rs-console-handle {
  height: 40px;
  cursor: row-resize;
  flex-shrink: 0;
  position: relative;
}

.rs-console-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: var(--rs-border-strong);
  border-radius: 2px;
  margin-top: 4px;
}

.rs-console-tabs {
  height: 100%;
  background: var(--rs-bg-surface-2);
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
}

.rs-console-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 100%;
  font-size: 12px;
  font-weight: 500;
  color: var(--rs-text-muted);
  border-bottom: 2px solid transparent;
  transition: all var(--rs-transition-fast);
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  margin-bottom: -1px;
  position: relative;
  top: 1px;
}

.rs-console-tab:hover {
  color: var(--rs-text-secondary);
}

.rs-console-tab.active {
  color: var(--rs-text-primary);
  border-bottom-color: var(--rs-brand-400);
}

.rs-console-tab-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--rs-bg-surface-3);
  border-radius: var(--rs-radius-full);
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-console-tab-badge.error {
  background: var(--rs-error-bg);
  color: var(--rs-error);
}

.rs-console-toggle {
  margin-left: auto;
  padding: 4px 8px;
  color: var(--rs-text-muted);
  border-radius: var(--rs-radius-sm);
  transition: all var(--rs-transition-fast);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.rs-console-toggle:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-secondary);
}

.rs-console-toggle svg {
  width: 16px;
  height: 16px;
}

.rs-console-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  font-family: var(--rs-font-mono);
  font-size: 12px;
  line-height: 1.7;
}

.rs-console-body::-webkit-scrollbar {
  width: 8px;
}

.rs-console-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 4px;
}

.rs-console-log {
  color: var(--rs-text-secondary);
  padding: 1px 0;
  animation: rs-log-appear 0.2s ease-out;
}

@keyframes rs-log-appear {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.rs-console-log.error {
  color: var(--rs-error);
}

.rs-console-log.warn {
  color: var(--rs-warning);
}

.rs-console-log.success {
  color: var(--rs-success);
}

.rs-console-log.info {
  color: var(--rs-info);
}

.rs-console-log-time {
  color: var(--rs-text-dim);
  margin-right: 8px;
}

.rs-console-empty {
  color: var(--rs-text-dim);
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

/* 问题列表 */
.rs-problems-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rs-problems-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--rs-success);
  font-size: 13px;
}

.rs-problems-empty svg {
  width: 20px;
  height: 20px;
}

.rs-problem-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--rs-radius-sm);
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
}

.rs-problem-item.error {
  border-left: 3px solid var(--rs-error);
}

.rs-problem-item.warning {
  border-left: 3px solid var(--rs-warning);
}

.rs-problem-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rs-problem-item.error .rs-problem-icon {
  color: var(--rs-error);
}

.rs-problem-item.warning .rs-problem-icon {
  color: var(--rs-warning);
}

.rs-problem-icon svg {
  width: 16px;
  height: 16px;
}

.rs-problem-msg {
  flex: 1;
  color: var(--rs-text-primary);
  font-size: 12px;
}

.rs-problem-loc {
  color: var(--rs-text-dim);
  font-size: 11px;
  flex-shrink: 0;
}

/* 终端 */
.rs-terminal {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--rs-text-primary);
}

.rs-terminal-line {
  display: flex;
  gap: 8px;
}

.rs-terminal-prompt {
  color: var(--rs-success);
  font-weight: 500;
  flex-shrink: 0;
}

.rs-terminal-cursor {
  width: 8px;
  height: 14px;
  background: var(--rs-brand-400);
  animation: rs-blink 1s step-end infinite;
  display: inline-block;
  margin-top: 3px;
}

@keyframes rs-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Infoview 详细版 */
.rs-infoview-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rs-infoview-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 8px;
}

.rs-goal-area-large {
  font-size: 13px;
  padding: 16px;
}

/* 沉浸式模式下隐藏导航 */
.rs-immersive.rs-lean-workbench {
  /* 全屏沉浸式 */
}
</style>
