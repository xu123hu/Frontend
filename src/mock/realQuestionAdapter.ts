/**
 * 真实取题适配层（作业组卷）。
 *
 * 背景：后端 `POST /api/teacher/quizzes/generate` 已从结构化 question_bank 真实取题，
 * 题行携带 source（真题来源，如「2023新课标I卷」）、hash、source_ref，解析字段名为
 * `analysis`、option 为对象 `{A,B,C,D}`、选择题型值可能是 `solution`。而前端历史
 * QuizQuestion 只有 options:string[]、answer_analysis、q_type:'choice'|'blank'|'text'，
 * 导致真实真题的解析、来源、选项在接入前端时被丢弃。
 *
 * 本适配器只做契约归一化：后端题行 → 前端 QuizQuestion，并如实标记来源。
 * mock/离线环境无后端时，由 buildQuizSet 本地题库兜底，来源如实标注为「本地样例」，
 * 不冒充真题。
 *
 * 诚实边界：GAOKAO 844 的 KB chunks 为「题干+答案+解析」自由文本，无法可靠解析为
 * 结构化 options/answer，故不作为组卷结构化取题源——结构化真实题源 = question_bank
 * （经真实接口）。KB 检索仅作参考/佐证，不冒充出题源。
 */
import type { QuizQuestion } from '@/types/teacher'

export interface NormalizedItem extends QuizQuestion {
  source?: string
  source_ref?: string
}

const TYPE_MAP: Record<string, QuizQuestion['q_type']> = {
  choice: 'choice',
  blank: 'blank',
  text: 'text',
  solution: 'text',
}

/** 后端 options 可能是对象 {A,B,C,D}，前端需要数组；统一归一为数组（保持字母序） */
function normalizeOptions(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) return raw as string[]
  if (raw && typeof raw === 'object') return Object.values(raw as Record<string, string>)
  return undefined
}

/** 后端题行 → 前端 QuizQuestion（补齐 analysis→answer_analysis、透传 source/source_ref） */
export function fromRealItem(raw: Record<string, unknown>): Partial<NormalizedItem> {
  const rawType = String(raw.q_type ?? '')
  const qType = TYPE_MAP[rawType]
  // 后端解析字段名为 analysis，前端为 answer_analysis；兼容两者
  const rawAnalysis = raw.answer_analysis ? String(raw.answer_analysis) : raw.analysis ? String(raw.analysis) : ''
  return {
    item_no: Number(raw.item_no ?? 0),
    q_type: qType,
    difficulty: (raw.difficulty as NormalizedItem['difficulty']) ?? undefined,
    kp_code: raw.kp_code ? String(raw.kp_code) : undefined,
    kp_name: raw.kp_name ? String(raw.kp_name) : undefined,
    question_text: String(raw.question_text ?? raw.stem ?? ''),
    options: normalizeOptions(raw.options),
    answer: raw.answer ? String(raw.answer) : undefined,
    answer_analysis: rawAnalysis || undefined,
    source: raw.source ? String(raw.source) : undefined,
    source_ref: raw.source_ref ? String(raw.source_ref) : undefined,
  }
}

/** 依据 source 如实标记题目来源：有真实来源 → 真题·来源；否则 → 本地样例 */
export function provenanceLabel(item: { source?: string }): string {
  const s = (item.source || '').trim()
  return s ? `真题 · ${s}` : '本地样例'
}

export function isRealSource(item: { source?: string }): boolean {
  return Boolean((item.source || '').trim())
}