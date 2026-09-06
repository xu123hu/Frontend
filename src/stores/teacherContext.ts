/**
 * B6 · 教师端 V3 页面上下文（PROTOTYPE-ONLY，IFC-PRODUCT-01 登记中）
 * 轻量 reactive 模块（非 Pinia，避免测试环境依赖）：各视图写入当前工件上下文，AI 管家读取。
 * 原则：没采集到的字段就是 undefined——UI 显示"尚未打开/未选择"，不用演示值冒充真实识别。
 * 另含轻量决策记录（§15：只记本次接受/拒绝/修改，仅本机 localStorage，不入库、不跨班固化）。
 */
import { reactive } from 'vue'

export interface Tv3Context {
  route: string
  class_name?: string
  /** 课题 / 工件标题（教案课题、课件标题、作业标题…） */
  topic?: string
  plan_id?: string
  deck_id?: string
  deck_title?: string
  slide_index?: number
  slide_count?: number
  selection?: { type: string; summary: string }
  /** 页面特有补充（课堂状态、作业提交数等，一行内） */
  extra?: string
}

const state = reactive<Tv3Context>({ route: '' })

export function useTv3Context(): Tv3Context {
  return state
}

/** 视图写入：route 变化时自动清空上一页的工件上下文（防止跨页残留误导） */
export function updateTv3Context(patch: Partial<Tv3Context> & { route: string }) {
  if (patch.route !== state.route) {
    state.class_name = undefined
    state.topic = undefined
    state.plan_id = undefined
    state.deck_id = undefined
    state.deck_title = undefined
    state.slide_index = undefined
    state.slide_count = undefined
    state.selection = undefined
    state.extra = undefined
  }
  Object.assign(state, patch)
}

/** route 是否匹配当前上下文（管家侧判断"工件字段是否可信任"） */
export function contextBelongsTo(route: string): boolean {
  return state.route === route
}

/* ---------- 轻量决策记忆（仅本机） ---------- */
const DECISION_KEY = 'tv3-decision-log'
export interface DecisionEntry { ts: string; kind: string; detail: string }
export function logDecision(kind: 'accept' | 'reject' | 'execute' | 'cancel' | 'fix', detail: string) {
  try {
    const raw = localStorage.getItem(DECISION_KEY)
    const log: DecisionEntry[] = raw ? JSON.parse(raw) : []
    log.unshift({ ts: new Date().toISOString().slice(11, 19), kind, detail })
    localStorage.setItem(DECISION_KEY, JSON.stringify(log.slice(0, 30)))
  } catch { /* 隐私模式允许失败 */ }
}
export function decisionLog(): DecisionEntry[] {
  try {
    const raw = localStorage.getItem(DECISION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
