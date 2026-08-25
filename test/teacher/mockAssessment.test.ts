import { describe, expect, it } from 'vitest'
import { quizArtifact } from '@/mock/teacherData'

describe('assessment mock contract', () => {
  it('always fulfills the requested count with complete real-bank questions', () => {
    const artifact = quizArtifact(['MATH-003'], 4, {})
    const items = artifact.content.items as any[]
    expect(items).toHaveLength(4)
    expect(artifact.validation).toBeUndefined()
    expect(artifact.warnings).toEqual([])
    expect(artifact.degraded).toBe(false)
    for (const item of items) {
      expect(item.question_text).toBeTruthy()
      expect(item.answer).toBeTruthy()
      expect(item.answer_analysis).toBeTruthy()
      expect(['choice', 'blank', 'text']).toContain(item.q_type)
      expect(item.kp_code).toBeTruthy()
      expect(item.kp_name).toBeTruthy()
    }
  })

  it('scopes to requested knowledge points and spans difficulties', () => {
    const artifact = quizArtifact(['MATH-101'], 6, { difficulty: { easy: 0.5, medium: 0.4, hard: 0.1 } })
    const items = artifact.content.items as any[]
    expect(items).toHaveLength(6)
    expect(new Set(items.map((item) => item.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']))
    expect(items.every((item) => item.kp_code === 'MATH-101')).toBe(true)
  })

  it('falls back to the whole bank when no knowledge points are given', () => {
    const artifact = quizArtifact([], 3, {})
    const items = artifact.content.items as any[]
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBe(3)
  })
})
