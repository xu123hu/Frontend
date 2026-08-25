import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/teacher/gradingWorkspace', () => ({
  gradingWorkspaceApi: {
    get: vi.fn(),
    suggest: vi.fn(),
    confirm: vi.fn(),
    review: vi.fn(),
    file: vi.fn(),
  },
}))

import { gradingWorkspaceApi } from '@/api/teacher/gradingWorkspace'
import { useGradingWorkspaceStore } from '@/stores/teacher/gradingWorkspace'
import { serverWorkspaceFixture } from './fixtures/gradingWorkspace'

const nextWorkspaceFixture = {
  ...serverWorkspaceFixture,
  data: {
    ...serverWorkspaceFixture.data,
    selected: { ...serverWorkspaceFixture.data.selected, submission_item_id: 'si-3' },
    navigation: { previous_id: 'si-2', next_ungraded_id: 'si-1' },
  },
}

describe('Grading Workspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('refetches server navigation after a confirmed decision', async () => {
    const api = gradingWorkspaceApi as any
    api.get.mockResolvedValueOnce(serverWorkspaceFixture).mockResolvedValueOnce(nextWorkspaceFixture)
    api.confirm.mockResolvedValue({ data: { submission_item_id: 'si-2', decision: 'accepted' } })
    const store = useGradingWorkspaceStore()

    await store.load({ classId: 'c1', assignmentId: 'a1', itemNo: 1, submissionItemId: 'si-2' })
    await store.confirmAndNext({ decision: 'accept', finalScore: null, feedback: '' })

    expect(api.confirm).toHaveBeenCalledWith(
      'si-2',
      expect.objectContaining({ suggestion_id: 'sug-si-2', version: 1, decision: 'accept' }),
      expect.any(String),
    )
    expect(store.workspace?.selected?.submissionItemId).toBe('si-3')
  })

  it('marks review separately and then trusts the refreshed server queue state', async () => {
    const api = gradingWorkspaceApi as any
    const reviewWorkspace = {
      ...serverWorkspaceFixture,
      data: {
        ...serverWorkspaceFixture.data,
        queue: serverWorkspaceFixture.data.queue.map((entry) => entry.submission_item_id === 'si-2'
          ? { ...entry, state: 'review', manual_review: true }
          : entry),
      },
    }
    api.get.mockResolvedValueOnce(serverWorkspaceFixture).mockResolvedValueOnce(reviewWorkspace)
    api.review.mockResolvedValue({ data: { submission_item_id: 'si-2', state: 'pending', replayed: false } })
    const store = useGradingWorkspaceStore()

    await store.load({ classId: 'c1', assignmentId: 'a1', itemNo: 1, submissionItemId: 'si-2' })
    await store.markForReview('核对 a=0 边界')

    expect(api.review).toHaveBeenCalledWith('si-2', expect.objectContaining({ state: 'pending' }), expect.any(String))
    expect(store.workspace?.queue.find((entry) => entry.submissionItemId === 'si-2')).toMatchObject({ state: 'review', manualReview: true })
  })
})
