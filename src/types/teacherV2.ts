/**
 * 教师工作台 V2 类型（teacherV2Server 契约）
 * 设计依据：D:\teacher-research\01-frontend\design\DESIGN-V2.md
 * 复用：ApiEnvelope / TeacherTask / SourceRef / StableErrorCode（@/types/teacher）
 */

/* ===== 今日工作台 ===== */
export interface V2ScheduleSlot {
  slot_no: number
  time_range: string
  class_id: string
  class_name: string
  topic: string
  lesson_type: 'new' | 'review' | 'exercise' | 'talk'
  prep_completion: number
  missing_items: string[]
  starts_at: string
  ends_at: string
}

export interface V2Todo {
  id: string
  title: string
  reason: string
  due_at: string
  count?: number
  priority: 'high' | 'mid' | 'low'
  route: string
  route_label: string
}

export interface V2ClassBrief {
  class_id: string
  class_name: string
  student_count: number
  avg_score: number
  submission_rate: number
  hot_kp: { name: string; error_rate: number }
  trend: number[]
}

export interface V2TodayData {
  teacher: { name: string; greeting: string }
  date_label: string
  schedule: V2ScheduleSlot[]
  todos: V2Todo[]
  classes: V2ClassBrief[]
  tomorrow_preview: { time_range: string; class_name: string; topic: string } | null
}

/* ===== 教案 ===== */
export interface V2LessonOutlineItem {
  id: string
  kind: string
  title: string
  minutes: number
  summary: string
}

export interface V2LessonSection {
  id: string
  phase: string
  minutes: number
  teacher_activity: string
  student_activity: string
  design_intent: string
  content_items: string[]
}

export interface V2LessonPlan {
  plan_id: string
  topic: string
  textbook_ref: string
  lesson_type: string
  duration_minutes: number
  class_id: string
  class_name: string
  design_basis: { text: string; evidence: { label: string; value: string; detail: string }[] } | null
  objectives: string[]
  key_point: string
  difficulty_point: string
  aids: string
  outline: V2LessonOutlineItem[]
  sections: V2LessonSection[]
  board_design: string
  homework: { tier: string; items: string[] }[]
  citations: { kind: string; title: string; page: string }[]
  quality_check: { item: string; pass: boolean }[]
  version: number
  status: 'draft' | 'confirmed'
  updated_at: string
}

/* ===== 课件 ===== */
export type V2SlideKind =
  | 'cover' | 'objective' | 'explore' | 'example' | 'variant' | 'summary' | 'homework' | 'end'

interface V2SlideBaseElement {
  id: string
  left: number
  top: number
  width: number
  height: number
  rotate?: number
  name?: string
}

export type V2SlideElement =
  | (V2SlideBaseElement & { type: 'text'; html: string; fontSize: number; color: string; bold?: boolean; align?: 'left' | 'center' | 'right' })
  | (V2SlideBaseElement & { type: 'latex'; latex: string; color: string; fontSize: number; display?: boolean })
  | (V2SlideBaseElement & { type: 'functionGraph'; expr: string; domain?: [number, number]; samples?: number; axis?: boolean })
  | (V2SlideBaseElement & { type: 'geometry'; shape: string; params: Record<string, number | number[]> })
  | (V2SlideBaseElement & { type: 'image'; src: string; alt?: string })
  | (V2SlideBaseElement & { type: 'pageNo'; pageNo: number })

export interface V2Slide {
  id: string
  kind: V2SlideKind
  title: string
  elements: V2SlideElement[]
  remark?: string
}

export interface V2SlideTemplate {
  template_id: string
  name: string
  desc: string
  swatch: { bg: string; primary: string; accent: string }
}

export interface V2SlideDeck {
  deck_id: string
  title: string
  class_id: string
  class_name: string
  template_id: string
  slides: V2Slide[]
  version: number
  plan_id: string | null
  exported_at: string | null
}

/* ===== 组卷 ===== */
export interface V2KpNode {
  code: string
  name: string
  children?: V2KpNode[]
  error_rate?: number
  question_count?: number
}

export type V2QuestionType = 'choice' | 'fill' | 'solution'
export type V2Difficulty = 'basic' | 'medium' | 'hard'

export interface V2Question {
  question_id: string
  kp_code: string
  kp_name: string
  q_type: V2QuestionType
  difficulty: V2Difficulty
  source: 'official' | 'school' | 'ai_variant'
  stem: string
  options?: string[]
  answer: string
  analysis: { analysis: string; solution: string; comment: string }
  score: number
  class_error_rate?: number
}

export interface V2ComposeParams {
  title: string
  kp_codes: string[]
  counts: { choice: number; fill: number; solution: number }
  difficulty_ratio: { basic: number; medium: number; hard: number }
  scene: 'exam' | 'quiz' | 'homework'
}

export interface V2PaperItem {
  seq: number
  question: V2Question
}

export interface V2Paper {
  paper_id: string
  title: string
  scene: string
  duration_minutes: number
  total_score: number
  items: V2PaperItem[]
  gaps: { kp_name: string; requested: number; available: number; action: string }[]
  created_at: string
}

/* ===== 作业与批改 ===== */
export interface V2TierConfig {
  tier: 'base' | 'consolid' | 'challenge'
  label: string
  student_count: number
  items: string[]
}

export interface V2Assignment {
  assignment_id: string
  title: string
  class_id: string
  class_name: string
  kp_name: string
  due_at: string
  tiers: V2TierConfig[]
  status: 'collecting' | 'grading' | 'reviewed'
  submitted: number
  total: number
}

export interface V2Submission {
  submission_id: string
  student: { user_id: string; name: string; tier: 'base' | 'consolid' | 'challenge' }
  submitted_at: string
  objective: { total: number; correct: number }
  ai_suggested_score: number | null
  ai_confidence: 'high' | 'mid' | 'low'
  needs_manual: boolean
  error_tags: { tag: string; source: 'ai' | 'teacher' }[]
  final_score: number | null
  teacher_feedback: string | null
  work_image_hint: string
}

export interface V2ReviewPack {
  pack_id: string
  top_errors: { question: V2Question; error_rate: number; wrong_students: string[]; tag: string }[]
  variant_pick: V2Question[]
}

/* ===== 课堂 ===== */
export interface V2ClassroomSession {
  session_id: string
  class_id: string
  class_name: string
  topic: string
  status: 'open' | 'questioning' | 'reviewing' | 'closed'
  started_at: string
  roster: { user_id: string; name: string; picked: boolean }[]
  questions: V2SessionQuestion[]
  active_question_id: string | null
}

export interface V2SessionQuestion {
  question_id: string
  stem: string
  options?: string[]
  answer: string
  kp_name: string
  sent_at: string | null
  stats: { total: number; answered: number; distribution: Record<string, number>; correct_rate: number; error_cluster: { option: string; count: number; tag: string }[] }
  status: 'pending' | 'collecting' | 'closed'
}

export interface V2PickResult {
  student: { user_id: string; name: string }
  remaining: number
}

/* ===== 学情 ===== */
export interface V2InsightOverview {
  class_id: string
  class_name: string
  student_count: number
  metrics: { avg_score: number; pass_rate: number; submission_rate: number; progress_count: number }
  heatmap: { kp_code: string; kp_name: string; error_rate: number; sample: number }[]
  error_clusters: { tag: string; ratio: number; count: number; kp_name: string; kp_code: string; example_question_id: string }[]
  trend: { date: string; avg: number }[]
  tier_lists: { tier: 'consolid' | 'challenge'; label: string; students: string[] }[]
}

export interface V2KpDetail {
  kp_code: string
  kp_name: string
  error_rate: number
  trend: { date: string; error_rate: number }[]
  error_breakdown: { tag: string; count: number }[]
  typical_question: V2Question
  wrong_students_sample: string[]
}

/* ===== 资源 ===== */
export interface V2ResourceNode {
  code: string
  name: string
  children?: V2ResourceNode[]
}

export interface V2ResourceItem {
  resource_id: string
  title: string
  kind: 'question_set' | 'lesson' | 'video' | 'doc'
  origin: 'school' | 'official' | 'platform'
  kp_name: string
  updated_at: string
  size_label: string
  question_count?: number
}

export interface V2CandidateQuestion {
  candidate_id: string
  stem: string
  kp_name: string
  confidence: 'high' | 'mid' | 'low'
  ocr_image_hint: string
  suggested: V2Question
  status: 'pending' | 'approved' | 'rejected'
}

export interface V2IngestResult {
  task_id: string
  file_name: string
  total: number
  candidates: V2CandidateQuestion[]
}

/* ===== 管家 ===== */
export interface V2ButlerMessage {
  role: 'user' | 'assistant'
  content: string
  actions?: { label: string; kind: string; payload?: Record<string, unknown> }[]
  streaming?: boolean
}
