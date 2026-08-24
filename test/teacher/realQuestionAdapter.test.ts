/**
 * 真实取题适配层契约测试。
 * 覆盖：后端题行 → 前端 QuizQuestion 归一化 / 来源标记 / 本地兜底不可变。
 */
import { describe, expect, it } from 'vitest'
import { fromRealItem, provenanceLabel, isRealSource } from '@/mock/realQuestionAdapter'
import { buildQuizSet } from '@/mock/questionBank'

/** 后端 question_bank 题行真实形状（_item_from_row 返回：analysis/source/hash/options 对象） */
function realBackendChoice() {
  return {
    item_no: 1,
    q_type: 'choice',
    difficulty: 'medium',
    question_text: '函数 $f(x)=x^2-2x$ 的单调递减区间是？',
    options: { A: '$(-\\infty,1]$', B: '$[1,+\\infty)$', C: '$(-\\infty,2]$', D: '$[2,+\\infty)$' },
    answer: 'A',
    analysis: '求导 $f\'(x)=2x-2$，令 $f\'(x)<0$ 得 $x<1$，故递减区间为 $(-\\infty,1]$。',
    hash: 'abc123',
    source: '2023新课标I卷',
    source_ref: 'qb:1234',
  }
}

describe('fromRealItem 归一化后端题行', () => {
  it('analysis → answer_analysis、source/source_ref 透传、hash 忽略', () => {
    const n = fromRealItem(realBackendChoice())
    expect(n.answer_analysis).toContain('求导')
    expect(n.source).toBe('2023新课标I卷')
    expect(n.source_ref).toBe('qb:1234')
    expect(n.item_no).toBe(1)
  })

  it('options 对象 → 数组（保持 A/B/C/D 字母序）', () => {
    const n = fromRealItem(realBackendChoice())
    expect(Array.isArray(n.options)).toBe(true)
    expect(n.options?.length).toBe(4)
    expect(n.answer).toBe('A')
  })

  it('q_type solution → text（前端无 solution 类型）', () => {
    const n = fromRealItem({ q_type: 'solution', question_text: 'x', analysis: '', answer: '', difficulty: 'easy' })
    expect(n.q_type).toBe('text')
  })

  it('兼容前端历史形状（answer_analysis/options 数组）', () => {
    const n = fromRealItem({
      q_type: 'choice',
      difficulty: 'easy',
      question_text: 't',
      options: ['a', 'b', 'c', 'd'],
      answer: 'C',
      answer_analysis: '解析',
      source: '2023新课标I卷',
    })
    expect(n.answer_analysis).toBe('解析')
    expect(n.options).toEqual(['a', 'b', 'c', 'd'])
    expect(n.source).toBe('2023新课标I卷')
  })
})

describe('provenanceLabel / isRealSource 诚实标注', () => {
  it('有 source → 真题·来源', () => {
    expect(provenanceLabel({ source: '2023新课标I卷' })).toBe('真题 · 2023新课标I卷')
    expect(isRealSource({ source: '2023新课标I卷' })).toBe(true)
  })
  it('无 source → 本地样例，且不冒充真题', () => {
    expect(provenanceLabel({ source: undefined })).toBe('本地样例')
    expect(isRealSource({ source: undefined })).toBe(false)
  })
})

describe('buildQuizSet 作为本地兜底不可变', () => {
  it('知识点头命中仍足额返回', () => {
    const qs = buildQuizSet({ knowledge_points: ['函数的单调性'], count: 8 })
    expect(qs.length).toBe(8)
  })
  it('本地兜底题不带 source → 如实标注为本地样例', () => {
    const qs = buildQuizSet({ knowledge_points: ['函数的单调性'], count: 6 })
    expect(qs.every((q) => isRealSource(q) === false)).toBe(true)
    expect(qs.every((q) => provenanceLabel(q) === '本地样例')).toBe(true)
  })
})