<template>
  <div class="rs-immersive rs-writing-workbench">
    <!-- ========== 工作台顶栏 ========== -->
    <div class="rs-workbench-bar">
      <!-- 左侧：标题和编译状态 -->
      <div class="rs-wb-left">
        <div class="rs-wb-title">
          <strong>{{ project.title }}</strong>
          <span>{{ currentFile }} · 第 {{ currentLine }} 行</span>
        </div>
        <div class="rs-wb-status" :class="compileStatus">
          <span class="rs-wb-status-dot"></span>
          <span class="rs-wb-status-text">{{ statusText }}</span>
          <span v-if="compileStatus === 'compiling'" class="rs-wb-status-progress">{{ compileProgress }}%</span>
          <span v-else-if="compileStatus === 'success'" class="rs-wb-status-pages">· {{ project.pageCount }} 页</span>
        </div>
      </div>

      <!-- 中间：工具链信息 -->
      <div class="rs-wb-meta">
        <span class="rs-wb-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>
          TeX Live 2024
        </span>
        <span class="rs-wb-meta-divider"></span>
        <span class="rs-wb-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          IEEEtran
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
        <button class="rs-btn rs-btn-sm rs-btn-ghost" @click="handleSpellCheck">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
          拼写检查
        </button>
        <button v-if="compileStatus !== 'compiling'" class="rs-btn rs-btn-sm rs-btn-primary" @click="handleCompile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          编译
        </button>
        <button v-else class="rs-btn rs-btn-sm rs-btn-danger" @click="handleCancelCompile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"/></svg>
          取消
        </button>
        <button class="rs-btn rs-btn-sm rs-btn-ghost" @click="handleExportPdf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          导出 PDF
        </button>
        <button class="rs-btn rs-btn-sm rs-btn-ghost rs-btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
      </div>
    </div>

    <!-- ========== 三栏写作布局 ========== -->
    <div class="rs-writing-layout">
      <!-- ---------- 左栏：大纲/引用/图片面板 ---------- -->
      <div class="rs-outline-pane">
        <div class="rs-pane-tabs">
          <button class="rs-pane-tab" :class="{ active: leftPaneTab === 'outline' }" @click="leftPaneTab = 'outline'">
            大纲
          </button>
          <button class="rs-pane-tab" :class="{ active: leftPaneTab === 'citations' }" @click="leftPaneTab = 'citations'">
            引用
          </button>
          <button class="rs-pane-tab" :class="{ active: leftPaneTab === 'figures' }" @click="leftPaneTab = 'figures'">
            图片
          </button>
        </div>

        <div class="rs-pane-body">
          <!-- 大纲视图 -->
          <div v-if="leftPaneTab === 'outline'" class="rs-outline-tree">
            <div
              v-for="item in outlineItems"
              :key="item.id"
              class="rs-outline-item"
              :class="{ active: currentSection === item.id, 'has-children': item.children?.length }"
              :style="{ paddingLeft: (item.level * 16 + 10) + 'px' }"
              @click="jumpToSection(item)"
            >
              <span class="rs-outline-number">{{ item.number }}</span>
              <span class="rs-outline-name">{{ item.name }}</span>
            </div>
          </div>

          <!-- 引用视图 -->
          <div v-else-if="leftPaneTab === 'citations'" class="rs-citations-pane">
            <div class="rs-citation-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input v-model="citationQuery" type="text" placeholder="搜索引用文献..." />
            </div>
            <div class="rs-citation-list">
              <div
                v-for="cite in filteredCitations"
                :key="cite.id"
                class="rs-citation-item"
              >
                <div class="rs-citation-header">
                  <span class="rs-citation-num">[{{ cite.num }}]</span>
                  <span class="rs-citation-year">{{ cite.year }}</span>
                </div>
                <div class="rs-citation-authors">{{ cite.authors }}</div>
                <div class="rs-citation-title">{{ cite.title }}</div>
                <button class="rs-citation-insert" @click="insertCitation(cite)">
                  插入引用
                </button>
              </div>
            </div>
          </div>

          <!-- 图片视图 -->
          <div v-else-if="leftPaneTab === 'figures'" class="rs-figures-pane">
            <div class="rs-figure-grid">
              <div v-for="fig in figures" :key="fig.id" class="rs-figure-item">
                <div class="rs-figure-thumb">
                  <div class="rs-figure-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                </div>
                <div class="rs-figure-caption">{{ fig.caption }}</div>
                <button class="rs-figure-insert" @click="insertFigure(fig)">
                  插入图片
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ---------- 中栏：LaTeX 编辑器 ---------- -->
      <div class="rs-latex-editor">
        <!-- 文件标签栏 -->
        <div class="rs-editor-tabs">
          <div class="rs-editor-tab active">
            <svg class="rs-editor-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>main.tex</span>
            <button class="rs-editor-tab-close" @click="closeFile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div v-for="file in otherFiles" :key="file" class="rs-editor-tab">
            <svg class="rs-editor-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>{{ file }}</span>
          </div>
        </div>

        <!-- 编辑器主体 -->
        <div class="rs-editor-body" ref="editorBodyRef">
          <div class="rs-editor-grid">
            <!-- 行号区 -->
            <div class="rs-line-numbers">
              <div
                v-for="n in visibleLines"
                :key="n"
                class="rs-line-num"
                :class="{
                  active: n === currentLine,
                  error: errorLines.includes(n),
                  warning: warningLines.includes(n)
                }"
              >{{ n }}</div>
            </div>
            <!-- 代码内容区 -->
            <div class="rs-code-content">
              <div
                v-for="(line, idx) in visibleCodeLines"
                :key="idx"
                class="rs-code-line"
                :class="{
                  active: idx + scrollOffset + 1 === currentLine,
                  error: errorLines.includes(idx + scrollOffset + 1),
                  warning: warningLines.includes(idx + scrollOffset + 1)
                }"
                @click="setCurrentLine(idx + scrollOffset + 1)"
              >
                <span class="rs-code-line-gutter"></span>
                <span class="rs-code-line-text" v-html="highlightLatex(line)"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ---------- 右栏：PDF 预览 ---------- -->
      <div class="rs-pdf-preview">
        <div class="rs-pdf-header">
          <div class="rs-pdf-page-info">
            第 <span class="rs-pdf-page-num">{{ pdfPage }}</span> 页 / 共 {{ project.pageCount }} 页
          </div>
          <div class="rs-pdf-controls">
            <div class="rs-pdf-zoom">
              <button class="rs-pdf-zoom-btn" @click="zoomOut">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span class="rs-pdf-zoom-value">{{ zoom }}%</span>
              <button class="rs-pdf-zoom-btn" @click="zoomIn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            <div class="rs-pdf-fit-btns">
              <button class="rs-pdf-fit-btn" :class="{ active: fitMode === 'width' }" @click="fitWidth">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="16" y2="3"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/></svg>
              </button>
              <button class="rs-pdf-fit-btn" :class="{ active: fitMode === 'height' }" @click="fitHeight">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="rs-pdf-content" ref="pdfContentRef">
          <div class="rs-pdf-page-wrapper" :style="pdfWrapperStyle">
            <!-- PDF 页面模拟 -->
            <div class="rs-pdf-page" :class="{ refreshing: pdfRefreshing }">
              <div class="rs-pdf-page-inner">
                <!-- 论文标题 -->
                <div class="rs-pdf-title">GNN-Path: Convergence Rate Analysis of Graph Neural Network Path Planning</div>
                <div class="rs-pdf-authors">Author One, Author Two, Author Three</div>
                <div class="rs-pdf-affiliation">Department of Computer Science, University</div>

                <!-- 摘要 -->
                <div class="rs-pdf-section">
                  <div class="rs-pdf-section-title">Abstract</div>
                  <p class="rs-pdf-text">
                    In this paper, we analyze the convergence rate of graph neural network (GNN) based path planning algorithms.
                    We propose a novel convergence analysis framework that leverages spectral graph theory and provides tight bounds
                    on the convergence speed of GNN path planners. Our theoretical results show that the convergence rate depends
                    on the graph connectivity and the number of GNN layers. We validate our findings through extensive experiments
                    on both synthetic and real-world road networks, demonstrating significant improvements in convergence speed
                    compared to baseline methods.
                  </p>
                  <p class="rs-pdf-text">
                    <em>Keywords:</em> Graph Neural Networks, Path Planning, Convergence Analysis, Spectral Graph Theory
                  </p>
                </div>

                <!-- 章节 -->
                <div class="rs-pdf-section">
                  <div class="rs-pdf-section-title">1. Introduction</div>
                  <p class="rs-pdf-text">
                    Path planning is a fundamental problem in robotics, autonomous navigation, and transportation systems.
                    Traditional algorithms such as Dijkstra's algorithm and A* search have been widely used for decades,
                    but they often struggle with large-scale graphs and dynamic environments.
                  </p>
                  <p class="rs-pdf-text">
                    Recently, graph neural networks (GNNs) have emerged as a promising approach for learning-based path planning.
                    GNN-based methods can leverage graph structure information and learn efficient heuristics from data,
                    potentially outperforming traditional algorithms in certain scenarios.
                  </p>
                  <p class="rs-pdf-text">
                    However, the theoretical understanding of GNN-based path planning remains limited. In particular,
                    the convergence properties of GNN path planners are not well understood, which hinders their
                    adoption in safety-critical applications.
                  </p>
                </div>

                <div class="rs-pdf-section">
                  <div class="rs-pdf-section-title">2. Related Work</div>
                  <p class="rs-pdf-text">
                    Graph neural networks have been extensively studied in recent years. Early works on GNNs
                    include GCN, GraphSAGE, and GAT, which have demonstrated strong performance on various
                    graph learning tasks.
                  </p>
                </div>

                <!-- 页码 -->
                <div class="rs-pdf-page-number">{{ pdfPage }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 底部编译日志 ========== -->
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
            :class="{ active: consoleTab === 'log' }"
            @click.stop="consoleTab = 'log'; consoleOpen = true"
          >
            编译日志
          </button>
          <button
            class="rs-console-tab"
            :class="{ active: consoleTab === 'refs' }"
            @click.stop="consoleTab = 'refs'; consoleOpen = true"
          >
            参考日志
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

        <!-- 编译日志标签 -->
        <div v-else-if="consoleTab === 'log'" class="rs-console-output">
          <div
            v-for="(log, idx) in compileLogs"
            :key="idx"
            class="rs-console-log"
            :class="log.type"
          >
            <span class="rs-console-log-time">[{{ log.time }}]</span>
            <span class="rs-console-log-msg">{{ log.message }}</span>
          </div>
          <div v-if="compileLogs.length === 0" class="rs-console-empty">
            暂无编译输出。点击「编译」开始构建 PDF。
          </div>
        </div>

        <!-- 参考日志标签 -->
        <div v-else-if="consoleTab === 'refs'" class="rs-console-output">
          <div
            v-for="(log, idx) in refLogs"
            :key="idx"
            class="rs-console-log"
            :class="log.type"
          >
            <span class="rs-console-log-time">[{{ log.time }}]</span>
            <span class="rs-console-log-msg">{{ log.message }}</span>
          </div>
          <div v-if="refLogs.length === 0" class="rs-console-empty">
            暂无参考文献编译日志。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { researchWritingApi } from '@/api/research'
import type { WritingProject } from '@/types/research'

// ===== 项目数据 =====
const project = ref<WritingProject>({
  id: 'proj-gnn-writing',
  title: 'GNN-Path Convergence Rate Analysis',
  compileStatus: 'idle',
  pageCount: 14,
})

// ===== 状态管理 =====
const compileStatus = ref<'idle' | 'compiling' | 'success' | 'failed'>('idle')
const compileProgress = ref(0)
const currentFile = ref('main.tex')
const currentLine = ref(128)
const leftPaneTab = ref<'outline' | 'citations' | 'figures'>('outline')
const consoleOpen = ref(true)
const consoleTab = ref<'problems' | 'log' | 'refs'>('log')
const pdfPage = ref(1)
const zoom = ref(100)
const fitMode = ref<'width' | 'height' | 'none'>('none')
const pdfRefreshing = ref(false)
const citationQuery = ref('')
const currentSection = ref('sec-3-3')
const scrollOffset = ref(80) // 模拟滚动偏移

// ===== Refs =====
const editorBodyRef = ref<HTMLElement | null>(null)
const consoleBodyRef = ref<HTMLElement | null>(null)
const pdfContentRef = ref<HTMLElement | null>(null)

// ===== 编译日志 =====
interface LogEntry {
  time: string
  message: string
  type: string
}

const compileLogs = ref<LogEntry[]>([])
const refLogs = ref<LogEntry[]>([])

// ===== 问题列表 =====
interface ProblemItem {
  severity: 'error' | 'warning'
  message: string
  file: string
  line: number
}

const problems = ref<ProblemItem[]>([
  { severity: 'warning', message: 'Overfull \\hbox (2.3pt too wide) in paragraph', file: 'main.tex', line: 87 },
  { severity: 'warning', message: 'Citation `kim2024gnn\' on page 3 undefined', file: 'main.tex', line: 145 },
])

const errorCount = computed(() => problems.value.filter(p => p.severity === 'error').length)
const warningCount = computed(() => problems.value.filter(p => p.severity === 'warning').length)

const errorLines = computed(() => problems.value.filter(p => p.severity === 'error').map(p => p.line))
const warningLines = computed(() => problems.value.filter(p => p.severity === 'warning').map(p => p.line))

// ===== 状态文本 =====
const statusText = computed(() => {
  switch (compileStatus.value) {
    case 'compiling': return '编译中…'
    case 'success': return '编译成功'
    case 'failed': return '编译失败'
    default: return '待编译'
  }
})

// ===== 大纲数据 =====
interface OutlineItem {
  id: string
  number: string
  name: string
  level: number
  line: number
  children?: OutlineItem[]
}

const outlineItems = ref<OutlineItem[]>([
  { id: 'sec-1', number: '1.', name: 'Introduction', level: 0, line: 25 },
  { id: 'sec-2', number: '2.', name: 'Related Work', level: 0, line: 52 },
  { id: 'sec-3', number: '3.', name: 'Methodology', level: 0, line: 78 },
  { id: 'sec-3-1', number: '3.1', name: 'Graph Neural Network Model', level: 1, line: 85 },
  { id: 'sec-3-2', number: '3.2', name: 'Path Planning Algorithm', level: 1, line: 105 },
  { id: 'sec-3-3', number: '3.3', name: 'Convergence Analysis', level: 1, line: 128 },
  { id: 'sec-4', number: '4.', name: 'Experiments', level: 0, line: 165 },
  { id: 'sec-4-1', number: '4.1', name: 'Datasets', level: 1, line: 172 },
  { id: 'sec-4-2', number: '4.2', name: 'Baselines', level: 1, line: 188 },
  { id: 'sec-4-3', number: '4.3', name: 'Results', level: 1, line: 205 },
  { id: 'sec-5', number: '5.', name: 'Conclusion', level: 0, line: 240 },
  { id: 'sec-refs', number: '', name: 'References', level: 0, line: 260 },
])

// ===== 引用数据 =====
interface CitationItem {
  id: string
  num: number
  authors: string
  title: string
  year: number
  venue: string
}

const citations = ref<CitationItem[]>([
  { id: 'c1', num: 1, authors: 'Kipf et al.', title: 'Semi-Supervised Classification with Graph Convolutional Networks', year: 2017, venue: 'ICLR' },
  { id: 'c2', num: 2, authors: 'Hamilton et al.', title: 'Inductive Representation Learning on Large Graphs', year: 2017, venue: 'NeurIPS' },
  { id: 'c3', num: 3, authors: 'Veličković et al.', title: 'Graph Attention Networks', year: 2018, venue: 'ICLR' },
  { id: 'c4', num: 4, authors: 'Dijkstra', title: 'A Note on Two Problems in Connexion with Graphs', year: 1959, venue: 'Numerische Mathematik' },
  { id: 'c5', num: 5, authors: 'Hart et al.', title: 'A Formal Basis for the Heuristic Determination of Minimum Cost Paths', year: 1968, venue: 'IEEE SSC' },
  { id: 'c6', num: 6, authors: 'Wu et al.', title: 'A Comprehensive Survey on Graph Neural Networks', year: 2020, venue: 'IEEE TNNLS' },
  { id: 'c7', num: 7, authors: 'Zhang et al.', title: 'Graph Neural Networks for Path Planning: A Survey', year: 2023, venue: 'IEEE T-ITS' },
  { id: 'c8', num: 8, authors: 'Liu et al.', title: 'Learning Heuristic Functions for Path Planning with GNNs', year: 2022, venue: 'ICRA' },
  { id: 'c9', num: 9, authors: 'Chen et al.', title: 'Graph Neural Networks with Convergence Guarantees', year: 2024, venue: 'ICML' },
  { id: 'c10', num: 10, authors: 'Wang et al.', title: 'Spectral Analysis of Graph Convolutional Networks', year: 2023, venue: 'JMLR' },
  { id: 'c11', num: 11, authors: 'Kim et al.', title: 'Efficient Path Planning Using Attention-based GNNs', year: 2024, venue: 'AAAI' },
  { id: 'c12', num: 12, authors: 'Park et al.', title: 'Convergence Rate Analysis of Message Passing Neural Networks', year: 2023, venue: 'NeurIPS' },
  { id: 'c13', num: 13, authors: 'Li et al.', title: 'Graph Structure Learning for Optimal Path Finding', year: 2024, venue: 'KDD' },
  { id: 'c14', num: 14, authors: 'Zhao et al.', title: 'A Theoretical Analysis of GNN-based Path Planning', year: 2023, venue: 'ICLR' },
  { id: 'c15', num: 15, authors: 'Sun et al.', title: 'Deep Reinforcement Learning for Path Planning on Graphs', year: 2022, venue: 'IEEE TNNLS' },
  { id: 'c16', num: 16, authors: 'Xu et al.', title: 'How Powerful are Graph Neural Networks?', year: 2019, venue: 'ICLR' },
  { id: 'c17', num: 17, authors: 'Morris et al.', title: 'Weisfeiler and Leman Go Neural: Higher-order Graph Neural Networks', year: 2019, venue: 'AAAI' },
  { id: 'c18', num: 18, authors: 'Battaglia et al.', title: 'Relational Inductive Biases, Deep Learning, and Graph Networks', year: 2018, venue: 'arXiv' },
])

const filteredCitations = computed(() => {
  if (!citationQuery.value) return citations.value
  const q = citationQuery.value.toLowerCase()
  return citations.value.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.authors.toLowerCase().includes(q) ||
    String(c.year).includes(q)
  )
})

// ===== 图片数据 =====
interface FigureItem {
  id: string
  caption: string
}

const figures = ref<FigureItem[]>([
  { id: 'fig1', caption: 'Fig. 1: GNN Architecture' },
  { id: 'fig2', caption: 'Fig. 2: Path Planning Example' },
  { id: 'fig3', caption: 'Fig. 3: Convergence Curves' },
  { id: 'fig4', caption: 'Fig. 4: Dataset Statistics' },
  { id: 'fig5', caption: 'Fig. 5: Ablation Study' },
  { id: 'fig6', caption: 'Fig. 6: Qualitative Results' },
])

// ===== 其他文件标签 =====
const otherFiles = ref(['references.bib', 'figures/', 'sections/'])

// ===== LaTeX 代码内容 =====
const latexContent = [
  '\\documentclass[conference]{IEEEtran}',
  '\\usepackage{amsmath,amssymb,amsfonts}',
  '\\usepackage{algorithmic}',
  '\\usepackage{graphicx}',
  '\\usepackage{textcomp}',
  '\\usepackage{xcolor}',
  '\\usepackage{cite}',
  '',
  '\\begin{document}',
  '',
  '\\title{GNN-Path: Convergence Rate Analysis of',
  'Graph Neural Network Path Planning}',
  '',
  '\\author{',
  '\\IEEEauthorblockN{Author One}',
  '\\IEEEauthorblockA{Dept. of Computer Science\\\\',
  'University\\\\',
  'City, Country \\\\',
  'email@university.edu}',
  '\\and',
  '\\IEEEauthorblockN{Author Two}',
  '\\IEEEauthorblockA{Dept. of Computer Science\\\\',
  'University\\\\',
  'City, Country \\\\',
  'email@university.edu}',
  '}',
  '',
  '\\maketitle',
  '',
  '\\begin{abstract}',
  'In this paper, we analyze the convergence rate of graph neural network',
  '(GNN) based path planning algorithms. We propose a novel convergence',
  'analysis framework that leverages spectral graph theory and provides',
  'tight bounds on the convergence speed of GNN path planners.',
  '\\end{abstract}',
  '',
  '\\begin{IEEEkeywords}',
  'Graph Neural Networks, Path Planning, Convergence Analysis',
  '\\end{IEEEkeywords}',
  '',
  '\\section{Introduction}',
  '\\label{sec:introduction}',
  '',
  'Path planning is a fundamental problem in robotics, autonomous navigation,',
  'and transportation systems. Traditional algorithms such as Dijkstra\'s',
  'algorithm \\cite{dijkstra1959note} and A* search \\cite{hart1968formal}',
  'have been widely used for decades, but they often struggle with',
  'large-scale graphs and dynamic environments.',
  '',
  'Recently, graph neural networks (GNNs) have emerged as a promising',
  'approach for learning-based path planning. GNN-based methods can',
  'leverage graph structure information and learn efficient heuristics',
  'from data \\cite{kipf2017semi, hamilton2017inductive, velickovic2018graph}.',
  '',
  '% TODO: add more motivation',
  'The main contributions of this paper are:',
  '\\begin{enumerate}',
  '  \\item A novel theoretical framework for analyzing GNN convergence',
  '  \\item Tight bounds on convergence rate for path planning tasks',
  '  \\item Extensive experiments on synthetic and real-world datasets',
  '\\end{enumerate}',
  '',
  '\\section{Related Work}',
  '\\label{sec:related}',
  '',
  '\\subsection{Graph Neural Networks}',
  'Graph neural networks have been extensively studied in recent years.',
  'Early works on GNNs include GCN \\cite{kipf2017semi}, GraphSAGE',
  '\\cite{hamilton2017inductive}, and GAT \\cite{velickovic2018graph},',
  'which have demonstrated strong performance on various graph learning',
  'tasks \\cite{wu2020comprehensive}.',
  '',
  '\\subsection{Path Planning}',
  'Traditional path planning algorithms...',
  '',
  '\\section{Methodology}',
  '\\label{sec:methodology}',
  '',
  '\\subsection{Graph Neural Network Model}',
  '\\label{sec:gnn-model}',
  '',
  'We consider a graph $G = (V, E)$ with node features $X \\in \\mathbb{R}^{n \\times d}$.',
  'The GNN computes node representations via message passing:',
  '',
  '\\begin{equation}',
  '  H^{(l+1)} = \\sigma(\\hat{D}^{-\\frac{1}{2}} \\hat{A} \\hat{D}^{-\\frac{1}{2}} H^{(l)} W^{(l)})',
  '\\end{equation}',
  '',
  'where $\\hat{A} = A + I$ is the adjacency matrix with self-loops,',
  '$\\hat{D}$ is the degree matrix, and $W^{(l)}$ are learnable parameters.',
  '',
  '\\subsection{Path Planning Algorithm}',
  '\\label{sec:path-algo}',
  '',
  'Our GNN-based path planning algorithm works as follows:',
  '\\begin{algorithmic}',
  '  \\STATE Input: Graph $G$, source $s$, target $t$',
  '  \\STATE Compute node embeddings with GNN',
  '  \\STATE Compute edge scores from node embeddings',
  '  \\STATE Run modified A* with learned heuristics',
  '  \\STATE Return path $P$',
  '\\end{algorithmic}',
  '',
  '\\subsection{Convergence Analysis}',
  '\\label{sec:convergence}',
  '',
  'We now present our main theoretical results on the convergence',
  'rate of GNN-based path planning.',
  '',
  '\\begin{theorem}[Convergence Rate]',
  '  \\label{thm:convergence}',
  '  Let $G$ be a graph with spectral gap $\\delta > 0$. The GNN path',
  '  planner converges to the optimal path with rate $O((1 - \\delta)^L)$',
  '  where $L$ is the number of GNN layers.',
  '\\end{theorem}',
  '',
  '\\begin{proof}',
  '  The proof proceeds by analyzing the spectral properties of the',
  '  normalized adjacency matrix. By the Gershgorin circle theorem,',
  '  all eigenvalues lie in $[-1, 1]$. The convergence rate is',
  '  determined by the second largest eigenvalue in magnitude.',
  '\\end{proof}',
  '',
  '\\section{Experiments}',
  '\\label{sec:experiments}',
  '',
  '\\subsection{Datasets}',
  'We evaluate our method on both synthetic and real-world datasets:',
  '\\begin{itemize}',
  '  \\item Synthetic grid graphs of varying sizes',
  '  \\item Real-world road networks from OpenStreetMap',
  '  \\item Random geometric graphs',
  '\\end{itemize}',
  '',
  '\\subsection{Baselines}',
  'We compare against the following baselines:',
  '\\begin{enumerate}',
  '  \\item Dijkstra\'s algorithm',
  '  \\item A* search with Euclidean heuristic',
  '  \\item GCN-based path planner \\cite{liu2022learning}',
  '  \\item GAT-based path planner \\cite{kim2024efficient}',
  '\\end{enumerate}',
  '',
  '\\subsection{Results}',
  'Table \\ref{tab:results} shows the main results.',
  '',
  '\\begin{table}[h]',
  '  \\centering',
  '  \\caption{Path Planning Performance}',
  '  \\label{tab:results}',
  '  \\begin{tabular}{lcc}',
  '    \\hline',
  '    Method & Success Rate & Runtime (s) \\\\',
  '    \\hline',
  '    Dijkstra & 100\\% & 2.34 \\\\',
  '    A* & 100\\% & 0.89 \\\\',
  '    GCN-Path & 94.2\\% & 0.12 \\\\',
  '    GAT-Path & 96.8\\% & 0.15 \\\\',
  '    \\textbf{Ours} & \\textbf{99.1\\%} & \\textbf{0.10} \\\\',
  '    \\hline',
  '  \\end{tabular}',
  '\\end{table}',
  '',
  '\\section{Conclusion}',
  '\\label{sec:conclusion}',
  '',
  'In this paper, we presented a comprehensive convergence rate analysis',
  'of GNN-based path planning algorithms. Our theoretical framework',
  'provides tight bounds that depend on the graph spectral properties.',
  'Experimental results confirm our theoretical findings and demonstrate',
  'the effectiveness of the proposed approach.',
  '',
  'Future work includes extending the analysis to dynamic graphs and',
  'considering more complex GNN architectures.',
  '',
  '\\bibliographystyle{IEEEtran}',
  '\\bibliography{references}',
  '',
  '\\end{document}',
]

const totalLines = latexContent.length

// 可见行（模拟视口内的行）
const visibleLinesCount = 60
const visibleLines = computed(() => {
  const start = scrollOffset.value + 1
  const end = Math.min(scrollOffset.value + visibleLinesCount, totalLines)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const visibleCodeLines = computed(() => {
  return latexContent.slice(scrollOffset.value, scrollOffset.value + visibleLinesCount)
})

// ===== PDF 样式 =====
const pdfWrapperStyle = computed(() => ({
  transform: `scale(${zoom.value / 100})`,
  transformOrigin: 'top center',
}))

// ===== LaTeX 语法高亮 =====
function highlightLatex(line: string): string {
  let result = line

  // 注释（绿色斜体）
  result = result.replace(/^(.*?)(%.*)$/, (_, before, comment) => {
    return before + `<span class="rs-latex-comment">${escapeHtml(comment)}</span>`
  })

  // 章节命令（粗体大号，琥珀色）
  result = result.replace(/(\\section\{[^}]*\})/g, '<span class="rs-latex-section">$1</span>')
  result = result.replace(/(\\subsection\{[^}]*\})/g, '<span class="rs-latex-subsection">$1</span>')
  result = result.replace(/(\\subsubsection\{[^}]*\})/g, '<span class="rs-latex-subsubsection">$1</span>')

  // 数学环境（紫色背景）
  if (result.includes('\\begin{equation}') || result.includes('\\end{equation}') ||
      result.includes('\\begin{align}') || result.includes('\\end{align}') ||
      result.match(/^\$.*\$$/) || result.match(/^\\\[.*\\\]$/)) {
    result = `<span class="rs-latex-math">${result}</span>`
  }

  // 引用（蓝色）
  result = result.replace(/(\\cite\{[^}]*\})/g, '<span class="rs-latex-cite">$1</span>')
  result = result.replace(/(\\ref\{[^}]*\})/g, '<span class="rs-latex-ref">$1</span>')
  result = result.replace(/(\\label\{[^}]*\})/g, '<span class="rs-latex-label">$1</span>')

  // 其他 LaTeX 命令（琥珀色）
  result = result.replace(/(\\[a-zA-Z]+)/g, (match) => {
    // 跳过已经高亮的
    if (match.includes('latex-')) return match
    return `<span class="rs-latex-command">${match}</span>`
  })

  // 环境名称
  result = result.replace(/(\\begin\{)([^}]+)(\})/g,
    '<span class="rs-latex-command">$1</span><span class="rs-latex-env">$2</span><span class="rs-latex-command">$3</span>')
  result = result.replace(/(\\end\{)([^}]+)(\})/g,
    '<span class="rs-latex-command">$1</span><span class="rs-latex-env">$2</span><span class="rs-latex-command">$3</span>')

  return result
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ===== 交互方法 =====
function setCurrentLine(line: number) {
  currentLine.value = line
}

function jumpToSection(item: OutlineItem) {
  currentSection.value = item.id
  currentLine.value = item.line
  // 模拟滚动到对应行
  scrollOffset.value = Math.max(0, item.line - 10)
}

function handleSave() {
  showToast('已保存')
}

function handleSpellCheck() {
  showToast('拼写检查完成：未发现错误')
}

async function handleCompile() {
  if (compileStatus.value === 'compiling') return

  compileStatus.value = 'compiling'
  compileProgress.value = 0
  compileLogs.value = []
  refLogs.value = []
  pdfRefreshing.value = true

  // 模拟编译进度
  const steps = [
    { msg: 'This is pdfTeX, Version 3.141592653-2.6-1.40.25 (TeX Live 2024)', type: 'info' },
    { msg: 'entering extended mode', type: '' },
    { msg: '(./main.tex', type: '' },
    { msg: 'LaTeX2e <2023-11-01> patch level 1', type: 'info' },
    { msg: 'L3 programming layer <2024-02-20>', type: 'info' },
    { msg: '(/usr/local/texlive/2024/texmf-dist/tex/latex/ieeetran/IEEEtran.cls', type: '' },
    { msg: 'Document Class: IEEEtran 2015/08/26 V1.8b', type: 'info' },
    { msg: 'Loading: amsmath.sty', type: '' },
    { msg: 'Loading: amssymb.sty', type: '' },
    { msg: 'Loading: graphicx.sty', type: '' },
    { msg: 'Loading: algorithmic.sty', type: '' },
    { msg: 'Loading: cite.sty', type: '' },
    { msg: '(./main.aux)', type: '' },
    { msg: 'Overfull \\hbox (2.3pt too wide) in paragraph at lines 87--90', type: 'warn' },
    { msg: '[1]', type: '' },
    { msg: 'Citation `kim2024gnn\' on page 3 undefined on input line 145.', type: 'warn' },
    { msg: '[2] [3]', type: '' },
    { msg: 'Package amsmath Warning: Foreign command \\atopwithdelims', type: 'warn' },
    { msg: '[4] [5] [6] [7]', type: '' },
    { msg: 'Output written on main.pdf (14 pages, 234567 bytes).', type: 'success' },
    { msg: 'Transcript written on main.log.', type: '' },
  ]

  // 模拟 BibTeX
  const bibSteps = [
    { msg: 'This is BibTeX, Version 0.99d (TeX Live 2024)', type: 'info' },
    { msg: 'The top-level auxiliary file: main.aux', type: '' },
    { msg: 'The style file: IEEEtran.bst', type: '' },
    { msg: 'Database file #1: references.bib', type: '' },
    { msg: 'Warning--I didn\'t find a database entry for "kim2024gnn"', type: 'warn' },
    { msg: '(There was 1 warning)', type: 'warn' },
  ]

  let stepIdx = 0
  const interval = setInterval(() => {
    if (stepIdx < steps.length) {
      const step = steps[stepIdx]
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      compileLogs.value.push({ time, message: step.msg, type: step.type })
      compileProgress.value = Math.round(((stepIdx + 1) / steps.length) * 80)
      stepIdx++
      scrollConsoleToBottom()
    } else {
      clearInterval(interval)

      // 添加 BibTeX 日志到参考日志
      bibSteps.forEach(step => {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        refLogs.value.push({ time, message: step.msg, type: step.type })
      })

      // 编译成功
      compileStatus.value = 'success'
      compileProgress.value = 100
      project.value.pageCount = 14
      pdfRefreshing.value = false

      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      compileLogs.value.push({ time, message: '编译完成，共生成 14 页 PDF', type: 'success' })
      scrollConsoleToBottom()
    }
  }, 150)

  // 保存定时器 ID 用于取消
  ;(window as any).__compileInterval = interval
}

function handleCancelCompile() {
  if ((window as any).__compileInterval) {
    clearInterval((window as any).__compileInterval)
    delete (window as any).__compileInterval
  }
  compileStatus.value = 'idle'
  compileProgress.value = 0
  pdfRefreshing.value = false

  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  compileLogs.value.push({ time, message: '编译已取消', type: 'warn' })
  scrollConsoleToBottom()
}

function handleExportPdf() {
  showToast('PDF 导出中...')
}

function insertCitation(cite: CitationItem) {
  showToast(`已插入引用 [${cite.num}]`)
}

function insertFigure(fig: FigureItem) {
  showToast(`已插入图片: ${fig.caption}`)
}

function zoomIn() {
  zoom.value = Math.min(200, zoom.value + 10)
  fitMode.value = 'none'
}

function zoomOut() {
  zoom.value = Math.max(50, zoom.value - 10)
  fitMode.value = 'none'
}

function fitWidth() {
  fitMode.value = fitMode.value === 'width' ? 'none' : 'width'
  if (fitMode.value === 'width') {
    zoom.value = 85 // 模拟适合宽度
  }
}

function fitHeight() {
  fitMode.value = fitMode.value === 'height' ? 'none' : 'height'
  if (fitMode.value === 'height') {
    zoom.value = 75 // 模拟适合高度
  }
}

function closeFile() {
  // 模拟关闭当前标签（实际项目中应有多文件管理）
}

function scrollConsoleToBottom() {
  nextTick(() => {
    if (consoleBodyRef.value) {
      consoleBodyRef.value.scrollTop = consoleBodyRef.value.scrollHeight
    }
  })
}

// ===== Toast 提示 =====
function showToast(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') {
  // 使用简单的 toast 提示（实际项目中可接入 toast store）
  const toast = document.createElement('div')
  toast.className = `rs-toast rs-toast-${type}`
  toast.textContent = message
  toast.style.cssText = `
    position: fixed; top: 70px; right: 24px; z-index: 9999;
    padding: 10px 16px; border-radius: 6px; font-size: 13px;
    background: var(--rs-bg-elevated); color: var(--rs-text-primary);
    border: 1px solid var(--rs-border-default);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    animation: rs-toast-in 0.2s ease;
  `
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.animation = 'rs-toast-out 0.2s ease forwards'
    setTimeout(() => toast.remove(), 200)
  }, 2000)
}

// ===== 初始加载 =====
onMounted(async () => {
  try {
    const data = await researchWritingApi.list()
    if (data && data.length > 0) {
      const first = data[0]
      project.value = {
        ...project.value,
        id: first.id,
        title: first.title || project.value.title,
        compileStatus: first.compileStatus || 'idle',
        pageCount: first.pageCount || 14,
      }
    }
  } catch (e) {
    // 使用默认 mock 数据
  }
})
</script>

<style scoped>
/* ============================================================
   论文写作台 · 沉浸式工作台
   三栏布局：大纲/引用/图片 | LaTeX 编辑器 | PDF 预览
   ============================================================ */

.rs-writing-workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--rs-bg-base);
  overflow: hidden;
}

/* ========== 工作台顶栏增强 ========== */
.rs-workbench-bar {
  height: 48px;
  background: var(--rs-bg-surface);
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-wb-title span {
  font-size: 11px;
  color: var(--rs-text-muted);
  margin-top: 2px;
}

.rs-wb-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--rs-radius-full);
  font-size: 12px;
  font-weight: 500;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
}

.rs-wb-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--rs-text-muted);
  flex-shrink: 0;
}

.rs-wb-status.idle .rs-wb-status-dot {
  background: var(--rs-text-muted);
}

.rs-wb-status.compiling .rs-wb-status-dot {
  background: var(--rs-warning);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
  animation: rs-pulse 1.5s infinite;
}

.rs-wb-status.success .rs-wb-status-dot {
  background: var(--rs-success);
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
}

.rs-wb-status.failed .rs-wb-status-dot {
  background: var(--rs-error);
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.4);
}

.rs-wb-status-text {
  color: var(--rs-text-secondary);
}

.rs-wb-status.compiling .rs-wb-status-text {
  color: var(--rs-warning);
}

.rs-wb-status.success .rs-wb-status-text {
  color: var(--rs-success);
}

.rs-wb-status.failed .rs-wb-status-text {
  color: var(--rs-error);
}

.rs-wb-status-progress {
  color: var(--rs-warning);
  font-family: var(--rs-font-mono);
  font-size: 11px;
}

.rs-wb-status-pages {
  color: var(--rs-text-muted);
  font-size: 11px;
}

/* 中间工具链信息 */
.rs-wb-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 auto;
  font-size: 12px;
  color: var(--rs-text-muted);
}

.rs-wb-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
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

/* 右侧操作按钮 */
.rs-wb-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ========== 三栏写作布局 ========== */
.rs-writing-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 260px 1fr 380px;
  min-height: 0;
  overflow: hidden;
}

/* ---------- 左栏：大纲/引用/图片面板 ---------- */
.rs-outline-pane {
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
  background: var(--rs-bg-surface-2);
  flex-shrink: 0;
}

.rs-pane-tab {
  flex: 1;
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--rs-text-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  margin-bottom: -1px;
}

.rs-pane-tab:hover {
  color: var(--rs-text-secondary);
}

.rs-pane-tab.active {
  color: var(--rs-brand-400);
  border-bottom-color: var(--rs-brand-400);
  background: var(--rs-bg-surface);
}

.rs-pane-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.rs-pane-body::-webkit-scrollbar {
  width: 6px;
}

.rs-pane-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 3px;
}

/* 大纲树 */
.rs-outline-tree {
  padding: 8px 0;
}

.rs-outline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 10px;
  font-size: 13px;
  color: var(--rs-text-secondary);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  border-left: 2px solid transparent;
  position: relative;
}

.rs-outline-item:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-outline-item.active {
  color: var(--rs-brand-300);
  background: var(--rs-brand-500-soft);
  border-left-color: var(--rs-brand-400);
  font-weight: 500;
}

.rs-outline-number {
  color: var(--rs-text-dim);
  font-family: var(--rs-font-mono);
  font-size: 11px;
  flex-shrink: 0;
}

.rs-outline-item.active .rs-outline-number {
  color: var(--rs-brand-400);
}

.rs-outline-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 引用面板 */
.rs-citations-pane {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-citation-search {
  position: relative;
  flex-shrink: 0;
}

.rs-citation-search svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--rs-text-muted);
}

.rs-citation-search input {
  width: 100%;
  height: 32px;
  padding: 0 12px 0 32px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  font-size: 12px;
  color: var(--rs-text-primary);
  outline: none;
  transition: all var(--rs-transition-fast);
}

.rs-citation-search input:focus {
  border-color: var(--rs-brand-500);
  box-shadow: 0 0 0 2px var(--rs-brand-500-soft);
}

.rs-citation-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rs-citation-list::-webkit-scrollbar {
  width: 4px;
}

.rs-citation-list::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 2px;
}

.rs-citation-item {
  padding: 10px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  transition: all var(--rs-transition-fast);
}

.rs-citation-item:hover {
  background: var(--rs-bg-surface-3);
  border-color: var(--rs-border-default);
}

.rs-citation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.rs-citation-num {
  font-family: var(--rs-font-mono);
  font-size: 11px;
  color: var(--rs-brand-400);
  font-weight: 600;
}

.rs-citation-year {
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-citation-authors {
  font-size: 11px;
  color: var(--rs-text-muted);
  margin-bottom: 4px;
}

.rs-citation-title {
  font-size: 12px;
  color: var(--rs-text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.rs-citation-insert {
  width: 100%;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
  border: 1px solid var(--rs-brand-500-soft-2);
  border-radius: var(--rs-radius-sm);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-citation-insert:hover {
  background: var(--rs-brand-500-soft-2);
  border-color: var(--rs-brand-400);
}

/* 图片面板 */
.rs-figures-pane {
  padding: 10px;
}

.rs-figure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rs-figure-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rs-figure-thumb {
  aspect-ratio: 1;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  overflow: hidden;
  transition: all var(--rs-transition-fast);
}

.rs-figure-item:hover .rs-figure-thumb {
  border-color: var(--rs-brand-500-soft-2);
}

.rs-figure-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--rs-text-dim);
}

.rs-figure-placeholder svg {
  width: 32px;
  height: 32px;
}

.rs-figure-caption {
  font-size: 11px;
  color: var(--rs-text-secondary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rs-figure-insert {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
  border: 1px solid var(--rs-brand-500-soft-2);
  border-radius: var(--rs-radius-sm);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-figure-insert:hover {
  background: var(--rs-brand-500-soft-2);
}

/* ---------- 中栏：LaTeX 编辑器 ---------- */
.rs-latex-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--rs-bg-base);
}

.rs-editor-tabs {
  height: 36px;
  background: var(--rs-bg-surface);
  border-bottom: 1px solid var(--rs-border-subtle);
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  flex-shrink: 0;
}

.rs-editor-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 100%;
  font-size: 12px;
  color: var(--rs-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--rs-transition-fast);
}

.rs-editor-tab:hover {
  color: var(--rs-text-secondary);
}

.rs-editor-tab.active {
  color: var(--rs-text-primary);
  border-bottom-color: var(--rs-brand-400);
  background: var(--rs-bg-base);
}

.rs-editor-tab-icon {
  width: 14px;
  height: 14px;
}

.rs-editor-tab-close {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all var(--rs-transition-fast);
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.rs-editor-tab:hover .rs-editor-tab-close {
  opacity: 1;
}

.rs-editor-tab-close:hover {
  background: var(--rs-bg-hover);
}

.rs-editor-tab-close svg {
  width: 12px;
  height: 12px;
}

/* 编辑器主体 */
.rs-editor-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-family: var(--rs-font-mono);
  font-size: 13px;
  line-height: 1.65;
  color: var(--rs-text-primary);
}

.rs-editor-body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.rs-editor-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 5px;
}

.rs-editor-body::-webkit-scrollbar-thumb:hover {
  background: var(--rs-border-strong);
}

.rs-editor-grid {
  display: flex;
  min-width: 100%;
}

/* 行号区 */
.rs-line-numbers {
  flex-shrink: 0;
  padding: 16px 0;
  text-align: right;
  user-select: none;
  background: var(--rs-bg-surface);
  border-right: 1px solid var(--rs-border-subtle);
  min-width: 50px;
}

.rs-line-num {
  height: 1.65em;
  padding: 0 12px;
  font-size: 12px;
  color: var(--rs-text-dim);
  transition: color var(--rs-transition-fast);
}

.rs-line-num.active {
  color: var(--rs-brand-400);
  font-weight: 600;
}

.rs-line-num.error {
  color: var(--rs-error);
}

.rs-line-num.warning {
  color: var(--rs-warning);
}

/* 代码内容区 */
.rs-code-content {
  flex: 1;
  padding: 16px 20px;
  min-width: 0;
}

.rs-code-line {
  display: flex;
  align-items: flex-start;
  gap: 0;
  height: 1.65em;
  transition: background var(--rs-transition-fast);
  position: relative;
}

.rs-code-line-gutter {
  position: absolute;
  left: -20px;
  top: 0;
  bottom: 0;
  width: 3px;
  opacity: 0;
  transition: opacity var(--rs-transition-fast);
}

.rs-code-line.active {
  background: var(--rs-brand-500-soft);
}

.rs-code-line.active .rs-code-line-gutter {
  opacity: 1;
  background: var(--rs-brand-400);
}

.rs-code-line.error {
  background: var(--rs-error-bg);
}

.rs-code-line.warning {
  background: var(--rs-warning-bg);
}

.rs-code-line-text {
  white-space: pre;
  flex: 1;
  min-width: 0;
}

/* LaTeX 语法高亮颜色 */
.rs-latex-comment {
  color: #4ade80;
  font-style: italic;
}

.rs-latex-command {
  color: var(--rs-brand-400);
}

.rs-latex-env {
  color: #c084fc;
}

.rs-latex-section {
  color: var(--rs-brand-300);
  font-weight: 700;
}

.rs-latex-subsection {
  color: var(--rs-brand-400);
  font-weight: 600;
}

.rs-latex-subsubsection {
  color: var(--rs-brand-400);
  font-weight: 500;
}

.rs-latex-math {
  background: rgba(139, 92, 246, 0.08);
  padding: 0 2px;
  border-radius: 2px;
}

.rs-latex-cite {
  color: var(--rs-info);
}

.rs-latex-ref {
  color: #38bdf8;
}

.rs-latex-label {
  color: #22d3ee;
}

/* ---------- 右栏：PDF 预览 ---------- */
.rs-pdf-preview {
  background: var(--rs-bg-surface);
  border-left: 1px solid var(--rs-border-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.rs-pdf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 40px;
  background: var(--rs-bg-surface-2);
  border-bottom: 1px solid var(--rs-border-subtle);
  flex-shrink: 0;
}

.rs-pdf-page-info {
  font-size: 12px;
  color: var(--rs-text-secondary);
}

.rs-pdf-page-num {
  color: var(--rs-text-primary);
  font-weight: 600;
  font-family: var(--rs-font-mono);
}

.rs-pdf-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rs-pdf-zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--rs-bg-surface-3);
  border-radius: var(--rs-radius-sm);
  padding: 2px;
}

.rs-pdf-zoom-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--rs-text-muted);
  border-radius: 3px;
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  padding: 0;
}

.rs-pdf-zoom-btn:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-pdf-zoom-btn svg {
  width: 14px;
  height: 14px;
}

.rs-pdf-zoom-value {
  min-width: 42px;
  text-align: center;
  font-size: 11px;
  font-family: var(--rs-font-mono);
  color: var(--rs-text-secondary);
}

.rs-pdf-fit-btns {
  display: flex;
  gap: 2px;
}

.rs-pdf-fit-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  color: var(--rs-text-muted);
  border-radius: var(--rs-radius-sm);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  padding: 0;
}

.rs-pdf-fit-btn:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-pdf-fit-btn.active {
  background: var(--rs-brand-500-soft);
  border-color: var(--rs-brand-500-soft-2);
  color: var(--rs-brand-400);
}

.rs-pdf-fit-btn svg {
  width: 14px;
  height: 14px;
}

/* PDF 内容区 */
.rs-pdf-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 16px;
  background: #1a1812;
  display: flex;
  justify-content: center;
}

.rs-pdf-content::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.rs-pdf-content::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 5px;
}

.rs-pdf-page-wrapper {
  transition: transform var(--rs-transition-base);
  transform-origin: top center;
  width: 100%;
  max-width: 540px;
}

.rs-pdf-page {
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  padding: 48px 42px;
  min-height: 700px;
  color: #1a1a1a;
  font-family: 'Times New Roman', 'Songti SC', Georgia, serif;
  font-size: 10.5pt;
  line-height: 1.5;
  position: relative;
  transition: opacity var(--rs-transition-base);
}

.rs-pdf-page.refreshing {
  opacity: 0.5;
}

.rs-pdf-page-inner {
  position: relative;
}

.rs-pdf-title {
  font-size: 18pt;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
  line-height: 1.3;
  color: #000;
}

.rs-pdf-authors {
  text-align: center;
  font-size: 11pt;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.rs-pdf-affiliation {
  text-align: center;
  font-size: 9.5pt;
  font-style: italic;
  color: #444;
  margin-bottom: 24px;
}

.rs-pdf-section {
  margin-bottom: 14px;
}

.rs-pdf-section-title {
  font-size: 12pt;
  font-weight: 700;
  margin-bottom: 6px;
  color: #000;
  text-transform: none;
}

.rs-pdf-text {
  font-size: 10pt;
  line-height: 1.5;
  margin-bottom: 8px;
  text-align: justify;
  color: #1a1a1a;
}

.rs-pdf-text em {
  font-style: italic;
}

.rs-pdf-page-number {
  position: absolute;
  bottom: -32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9pt;
  color: #666;
  font-family: 'Times New Roman', serif;
}

/* ========== 底部编译日志 ========== */
.rs-build-console {
  border-top: 1px solid var(--rs-border-subtle);
  background: var(--rs-bg-surface);
  display: flex;
  flex-direction: column;
  max-height: 260px;
  flex-shrink: 0;
  transition: max-height var(--rs-transition-base);
}

.rs-build-console.collapsed {
  max-height: var(--rs-drawer-handle-height);
}

.rs-console-handle {
  cursor: pointer;
  flex-shrink: 0;
}

.rs-console-tabs {
  height: var(--rs-drawer-handle-height);
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
  font-size: 10px;
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
  padding: 10px 16px;
  font-family: var(--rs-font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.rs-console-body::-webkit-scrollbar {
  width: 8px;
}

.rs-console-body::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 4px;
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
  padding: 30px;
  color: var(--rs-text-muted);
  font-size: 13px;
}

.rs-problems-empty svg {
  width: 20px;
  height: 20px;
  color: var(--rs-success);
}

.rs-problem-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--rs-radius-sm);
  transition: background var(--rs-transition-fast);
}

.rs-problem-item:hover {
  background: var(--rs-bg-surface-2);
}

.rs-problem-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.rs-problem-item.error .rs-problem-icon {
  color: var(--rs-error);
}

.rs-problem-item.warning .rs-problem-icon {
  color: var(--rs-warning);
}

.rs-problem-icon svg {
  width: 14px;
  height: 14px;
}

.rs-problem-msg {
  flex: 1;
  font-size: 12px;
  color: var(--rs-text-secondary);
  font-family: var(--rs-font-mono);
}

.rs-problem-loc {
  font-size: 11px;
  color: var(--rs-text-dim);
  font-family: var(--rs-font-mono);
  flex-shrink: 0;
}

/* 日志输出 */
.rs-console-output {
  display: flex;
  flex-direction: column;
}

.rs-console-log {
  padding: 1px 0;
  font-size: 12px;
  color: var(--rs-text-secondary);
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
  padding: 30px;
  text-align: center;
  color: var(--rs-text-muted);
  font-size: 12px;
  font-family: var(--rs-font-sans);
}

/* ========== Toast 动画 ========== */
@keyframes rs-toast-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes rs-toast-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

@keyframes rs-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ========== 响应式微调 ========== */
@media (max-width: 1400px) {
  .rs-writing-layout {
    grid-template-columns: 240px 1fr 340px;
  }

  .rs-pdf-page {
    padding: 40px 36px;
  }
}
</style>
