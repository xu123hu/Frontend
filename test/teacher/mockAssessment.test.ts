import { describe, expect, it } from 'vitest'
import { quizArtifact } from '@/mock/teacherData'

describe('assessment mock contract', () => {
  it('uses requested type/difficulty slots and emits backend-shaped complete questions', () => {
    const artifact = quizArtifact(
      ['MATH-003'], 4,
      { choice: 2, blank: 1, text: 1 },
      { easy: 0.5, medium: 0.5, hard: 0 },
    )
    const items = artifact.content.items as any[]

    expect(artifact.content.question_type_distribution).toEqual({ choice: 2, blank: 1, solution: 1 })
    expect(artifact.validation).toMatchObject({
      requested_count: 4, available_count: 4, quota_normalized: false,
      slot_fulfillment: expect.any(Array),
    })
    expect(items.filter((item) => item.q_type === 'choice')).toHaveLength(2)
    expect(items.find((item) => item.q_type === 'choice')).toMatchObject({
      options: expect.any(Object), answer: expect.any(String), analysis: expect.any(String),
    })
    expect(items.filter((item) => item.q_type !== 'choice').every((item) => !item.options)).toBe(true)
  })

  it('reduces insufficient inventory across planned types and reports measured solution distribution', () => {
    const artifact = quizArtifact(['MATH-003'], 8, { choice: 2, blank: 2, text: 4 }, undefined)
    const items = artifact.content.items as any[]
    expect(items.some((item) => item.q_type === 'solution')).toBe(true)
    expect(artifact.content.question_type_distribution).toEqual(
      items.reduce((counts, item) => ({ ...counts, [item.q_type]: counts[item.q_type] + 1 }), { choice: 0, blank: 0, solution: 0 }),
    )
    expect(artifact.validation).toMatchObject({ requested_difficulty_distribution: {}, slot_fulfillment: expect.arrayContaining([expect.objectContaining({ difficulty: 'any' })]) })
    expect(artifact.content.difficulty).toEqual({})
  })

  it('expands only the requested mock subtree and makes parent inventory auditable', () => {
    const parent = quizArtifact(['MATH-001'], 3, { text: 3 })
    const parentItems = parent.content.items as any[]
    expect(parent.validation?.expanded_knowledge_points).toEqual(['MATH-001', 'MATH-002', 'MATH-003'])
    expect(parentItems.map((item) => item.kp_code)).toContain('MATH-002')

    const leaf = quizArtifact(['MATH-003'], 3, { text: 3 })
    expect(leaf.validation?.expanded_knowledge_points).toEqual(['MATH-003'])
    expect((leaf.content.items as any[]).every((item) => item.kp_code === 'MATH-003')).toBe(true)
  })
})
