/**
 * 科研端统一类型定义
 * 覆盖项目管理、文献管理、数学验证、Lean4、论文写作、论文初审、教育研究、运行中心、证据账本、仪表盘等模块
 */

// ===== 项目管理 =====
export interface ResearchProject {
  id: string
  name: string
  description: string
  tags: string[]
  progress: number
  status: 'active' | 'paused' | 'completed'
  memberCount: number
  createdAt: string
  updatedAt: string
  researchQuestion?: string
  hypotheses?: string[]
}

export interface ProjectMember {
  id: string
  name: string
  role: string
  avatar?: string
}

export interface ProjectTask {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  assignee?: string
  priority: 'low' | 'medium' | 'high'
}

// ===== 文献管理 =====
export interface Paper {
  id: string
  title: string
  authors: string[]
  venue: string
  year: number
  abstract: string
  tags: string[]
  citations: number
  readStatus: 'unread' | 'reading' | 'read'
  addedAt: string
  hasEvidence: boolean
}

export interface LiteratureCollection {
  id: string
  name: string
  count: number
  type: 'smart' | 'manual'
}

// ===== 数学验证 =====
export interface VerifyResult {
  id: string
  expression: string
  status: 'verified' | 'failed' | 'partial'
  capabilities: VerifyCapability[]
  summary: string
}

export interface VerifyCapability {
  name: string
  key: string
  status: 'passed' | 'failed' | 'warning' | 'info' | 'running'
  description: string
  detail?: string
}

// ===== Lean4 =====
export interface LeanFile {
  id: string
  name: string
  path: string
  type: 'file' | 'folder'
  children?: LeanFile[]
}

export interface LeanBuildStatus {
  id: string
  status: 'running' | 'success' | 'failed' | 'idle'
  progress: number
  totalFiles: number
  processedFiles: number
  startTime?: string
  endTime?: string
  errors: number
  warnings: number
}

export interface LeanGoal {
  target: string
  hypotheses: string[]
}

// ===== 论文写作 =====
export interface WritingProject {
  id: string
  title: string
  compileStatus: 'idle' | 'compiling' | 'success' | 'failed'
  lastCompiled?: string
  pageCount: number
}

// ===== 论文初审 =====
export interface ReviewSubmission {
  id: string
  title: string
  authors: string[]
  submittedAt: string
  status: 'pending' | 'analyzing' | 'reviewed'
  scores: {
    novelty: number
    correctness: number
    completeness: number
    clarity: number
  }
  findingsCount: number
}

export interface ReviewFinding {
  id: string
  category: string
  severity: 'critical' | 'major' | 'minor' | 'info'
  description: string
  location?: string
}

// ===== 教育研究 =====
export interface EducationAnalysis {
  id: string
  name: string
  status: 'configuring' | 'privacy_check' | 'running' | 'completed'
  step: number
  dataset?: string
  metrics: string[]
  findings?: string[]
}

// ===== 运行中心 =====
export interface ResearchRun {
  id: string
  type: 'verify' | 'lean_build' | 'compile' | 'analysis' | 'review'
  title: string
  status: 'running' | 'success' | 'failed' | 'cancelled' | 'queued'
  progress: number
  mode: 'FULL' | 'LOCAL_ENGINE' | 'BROWSER_LOCAL'
  duration?: number
  startedAt: string
  projectId?: string
  projectName?: string
}

// ===== 证据账本 =====
export interface EvidenceItem {
  id: string
  type: 'derivation' | 'theorem' | 'numerical' | 'literature' | 'experiment'
  title: string
  source: string
  status: 'verified' | 'pending' | 'rejected'
  createdAt: string
  projectId: string
}

// ===== 仪表盘 =====
export interface DashboardData {
  projectsCount: number
  literatureCount: number
  verifiedEvidence: number
  weeklyRuns: number
  successRate: number
  focusTask?: {
    title: string
    description: string
    progress: number
    targetView: string
  }
  recentProjects: ResearchProject[]
  recentActivity: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  time: string
  icon: string
}
