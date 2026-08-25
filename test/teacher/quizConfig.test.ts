import { describe, expect, it } from 'vitest'
import { resolveScopeKnowledgePoints } from '@/domain/teacher/quizConfig'

describe('resolveScopeKnowledgePoints', () => {
  it('maps teacher quiz scopes to their approved knowledge-point codes', () => {
    expect(resolveScopeKnowledgePoints('monotonicity')).toEqual(['MATH-003'])
    expect(resolveScopeKnowledgePoints('parity')).toEqual(['MATH-003'])
    expect(resolveScopeKnowledgePoints('basic')).toEqual(['MATH-002'])
    expect(resolveScopeKnowledgePoints('chapter1')).toEqual(['MATH-001', 'MATH-002', 'MATH-003'])
    expect(resolveScopeKnowledgePoints('derivative')).toEqual(['MATH-005'])
  })

  it('rejects unknown scopes instead of silently widening the quiz', () => {
    expect(() => resolveScopeKnowledgePoints('unknown')).toThrow('未知知识点范围')
  })
})
