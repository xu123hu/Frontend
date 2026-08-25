import { describe, expect, it } from 'vitest'
import { toGradingWorkspace } from '@/features/teacher-grading-v2/gradingWorkspaceAdapter'
import { serverWorkspaceFixture } from './fixtures/gradingWorkspace'

describe('Grading Workspace adapter', () => {
  it('maps one server workspace without retaining confidence or inventing score points', () => {
    const workspace = toGradingWorkspace(serverWorkspaceFixture)

    expect(workspace.selected?.scoring.rubricItems[0]).toEqual({
      id: 'derivative', criterion: '正确求导', points: 3, evidenceHint: '写出 f′(x)=3x²−3',
    })
    expect(workspace.selected?.suggestion).not.toHaveProperty('confidence')
    expect(workspace.selected?.scoring.rubricStatus).toBe('ready')
    const question = workspace.context.question
    if (!question) throw new Error('fixture must include question context')
    expect(question.maxScore).toBe(10)
  })

  it('rejects an incomplete server payload instead of filling in a scoring model', () => {
    expect(() => toGradingWorkspace({ data: { queue: [] }, status: 200 } as any)).toThrow('批改工作台数据不完整')
  })
})
