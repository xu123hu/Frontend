import type { QuizQuestion } from '@/types/teacher'

export interface PreviewOption {
  key: string
  text: string
}

export interface QuizPreviewQuestion {
  id: string
  text: string
  kp: string
  qType: QuizQuestion['q_type']
  difficulty: QuizQuestion['difficulty']
  difficultyLabel: string
  score: number
  options: PreviewOption[]
  standardAnswer: string | null
  analysis: string
}

const ANALYSIS_FALLBACK = '题库未提供解析，请教师确认后补充。'

function previewOptions(options: QuizQuestion['options']): PreviewOption[] {
  if (Array.isArray(options)) {
    return options
      .filter((value) => String(value).trim())
      .map((text, index) => ({ key: String.fromCharCode(65 + index), text: String(text) }))
  }
  if (options && typeof options === 'object') {
    return Object.entries(options)
      .filter(([key, value]) => key.trim() && String(value).trim())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, text]) => ({ key, text: String(text) }))
  }
  return []
}

export function makeQuizPreviewQuestions(items: QuizQuestion[]): QuizPreviewQuestion[] {
  return items.map((item, index) => ({
    id: String(item.hash || item.item_no || index),
    text: String(item.question_text || ''),
    kp: String(item.kp_code || item.kp_name || '综合数学'),
    qType: item.q_type,
    difficultyLabel: item.difficulty === 'hard' ? '挑战' : item.difficulty === 'medium' ? '提升' : '基础',
    score: item.q_type === 'solution' || item.q_type === 'text' ? 10 : 5,
    difficulty: item.difficulty || 'medium',
    options: item.q_type === 'choice' ? previewOptions(item.options) : [],
    standardAnswer: String(item.answer || item.solution || '').trim() || null,
    analysis: String(item.analysis || item.answer_analysis || '').trim() || ANALYSIS_FALLBACK,
  }))
}
