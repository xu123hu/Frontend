/**
 * P · 备课中心整链路状态仓（PROTOTYPE-ONLY，IFC-P-a 登记中）
 * 链路：对话首页 → 从教材开始 / 上传资料 / 模板库 → AI 生成 → 大纲确认 → 备课编辑器
 * 轻量 reactive 模块（同 teacherContext/companion 惯例，不用 Pinia）。
 * 诚实原则：没有的数据就是 undefined——界面显示"未选择"，不冒充。
 */
import { reactive } from 'vue'

export type PrepStage = 'home' | 'textbook' | 'upload' | 'generating' | 'outline' | 'editor'
export type PrepSource = 'input' | 'textbook' | 'upload' | 'template'

export interface PrepBrief {
  topic: string
  textbook?: string
  chapter?: string
  classId?: string
  className?: string
  courseType?: string
  duration?: number
  source: PrepSource
  requirements: string[]
  materials?: { name: string; size: string; pages?: number }[]
  templateId?: string
  templateName?: string
}

export interface PrepRichOutline {
  topic: string
  duration: number
  sections: { id: string; name: string; minutes: number; goal: string; example_suggestion?: string }[]
  total_minutes: number
  notes: string[]
  objectives?: string[]
  keypoints?: { major: string[]; hard: string[] }
  blackboard?: { main: string[]; side: string[] }
  homework?: { tier: string; label: string; items: string[]; minutes: string }[]
}

const state = reactive({
  stage: 'home' as PrepStage,
  brief: null as PrepBrief | null,
  outline: null as PrepRichOutline | null,
  planId: '',
})

export function usePrepChain() {
  return state
}

export function startBrief(b: Partial<PrepBrief> & { source: PrepSource; topic: string }) {
  state.brief = {
    topic: b.topic,
    textbook: b.textbook,
    chapter: b.chapter,
    classId: b.classId || 'c2-05',
    className: b.className || '高二(5)班',
    courseType: b.courseType || '新授课',
    duration: b.duration || 45,
    source: b.source,
    requirements: b.requirements || [],
    materials: b.materials,
    templateId: b.templateId,
    templateName: b.templateName,
  }
  state.outline = null
  state.planId = ''
  state.stage = 'generating'
}

export function setOutline(o: PrepRichOutline) {
  state.outline = o
  state.stage = 'outline'
}

export function enterEditor(planId: string) {
  state.planId = planId
  state.stage = 'editor'
}

export function gotoStage(s: PrepStage) {
  state.stage = s
}

export function resetChain() {
  state.stage = 'home'
  state.brief = null
  state.outline = null
  state.planId = ''
}

export function __resetPrepChainForTest() {
  resetChain()
}
