/**
 * 本地确定性候选题库（Fixture 层，供"换一题 / 重新生成 / 找相似题"使用）。
 * 隔离于页面组件：页面只通过本模块的函数取候选，不把假数据写死在 UI。
 * 真实后端提供 `/teacher/quizzes` 单题替换端点后，本层对应替换为该 adapter（见 TODO_BACKEND.md）。
 */
import type { QuizQuestion } from '@/types/teacher'

export interface BankQuestion {
  q_type: QuizQuestion['q_type']
  difficulty: QuizQuestion['difficulty']
  kp_code: string
  kp_name: string
  question_text: string
  options?: string[]
  answer: string
  answer_analysis: string
}

/** 输入按题号均分，替换时按稳定索引取候选，保证确定性可复现 */
export const MONOTONICITY_BANK: BankQuestion[] = [
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 f(x)=x^2-2x 的单调递减区间是？', options: ['(-∞,1]', '[1,+∞)', '(-∞,2]', '[2,+∞)'], answer: 'A', answer_analysis: '求导 f\'(x)=2x-2，令 f\'(x)<0 得 x<1。' },
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '下列函数中，在 (0,+∞) 上单调递增的是？', options: ['f(x)=-x', 'f(x)=x^2', 'f(x)=1/x', 'f(x)=-x^2'], answer: 'B', answer_analysis: 'x^2 在正区间单调递增；-x 与 1/x 递减。-x^2 先增后减。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 f(x)=x^3-3x 在区间 (1,+∞) 上是单调____函数。（填"增"或"减"）', answer: '增', answer_analysis: 'f\'(x)=3x^2-3=3(x-1)(x+1)>0 当 x>1，故单调递增。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '若 f(x)=x^3+ax 在 R 上单调递增，则实数 a 的取值范围是____。', answer: 'a≥0', answer_analysis: 'f\'(x)=3x^2+a≥0 恒成立 ⇒ a≥0。' },
  { q_type: 'text', difficulty: 'hard', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '已知 f(x)=x^3-3x，判断并证明其在 R 上的单调区间。', answer: '减区间 (-1,1)，增区间 (-∞,-1) 与 (1,+∞)', answer_analysis: 'f\'(x)=3(x^2-1)，列表分析符号即可。' },
  { q_type: 'text', difficulty: 'hard', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '已知函数 f(x)=x^3-ax 在 [1,+∞) 单调递增，求 a 的取值范围。', answer: 'a≤3', answer_analysis: 'f\'(x)=3x^2-a≥0 在 [1,+∞) 恒成立，3-a≥0。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 f(x)=x^3-3x 的单调递减区间是？', options: ['(-1,1)', '(-∞,-1)', '(1,+∞)', 'R'], answer: 'A', answer_analysis: 'f\'(x)=3(x^2-1)<0 当 -1<x<1。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '若 f(x)=x^3+ax 在 R 上单调递增，实数 a 的取值范围是？', options: ['a≥0', 'a≤0', 'a>0', 'a<0'], answer: 'A', answer_analysis: 'f\'(x)=3x^2+a≥0 恒成立 ⇒ a≥0。' },
]

/** 取与目标知识点/难度匹配、且未被排除的候选题（本地 Fallback） */
export function replacementCandidates(
  kpCode: string | undefined,
  difficulty: QuizQuestion['difficulty'],
  excludeTexts: string[],
): BankQuestion[] {
  return MONOTONICITY_BANK.filter(
    (q) => q.difficulty === difficulty && (!kpCode || q.kp_code === kpCode) && !excludeTexts.includes(q.question_text),
  )
}