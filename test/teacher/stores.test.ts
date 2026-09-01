import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/teacher/today', () => ({ todayApi: { today: vi.fn() } }))
vi.mock('@/api/teacher/assignments', () => ({ assignmentsApi: { create: vi.fn(), publish: vi.fn(), list: vi.fn() } }))

import { useTeacherTodayStore } from '@/stores/teacher/today'
import { useAssessmentStore } from '@/stores/teacher/assessment'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { todayApi } from '@/api/teacher/today'
import { assignmentsApi } from '@/api/teacher/assignments'

describe('teacher today store', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  it('stores today data on success', async () => {
    const data = { next_lesson: null, grading_queue: { count: 3, action: 'open_grading' }, deadlines: [], actionable_insights: [], degraded: false }
    ;(todayApi.today as any).mockResolvedValue({ data })
    const s = useTeacherTodayStore()
    await s.fetch('2026-08-21')
    expect(s.data?.grading_queue).toEqual({ count: 3, action: 'open_grading' })
    expect(s.loading).toBe(false)
  })
  it('ignores aborted request without flagging an error', async () => {
    const s = useTeacherTodayStore()
    ;(todayApi.today as any).mockRejectedValueOnce({ code: -2 })
    await s.fetch()
    expect(s.error).toBeNull()
    expect(s.data).toBeNull()
  })
})

describe('assessment store', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })
  it('reuses the same idempotency key when publish is retried', async () => {
    const s = useAssessmentStore()
    // 契约对齐：创建作业需先有已生成的 quiz_set Artifact
    s.quizArtifact = {
      artifact_id: 'q1', artifact_type: 'quiz_set', scene: 'teacher.assessment',
      class_id: 'c1', owner_id: 't1', status: 'confirmed', version: 1,
      content: { items: [] }, source_refs: [], warnings: [], degraded: false,
      created_at: '', updated_at: '',
    } as any
    ;(assignmentsApi.create as any).mockResolvedValue({ data: { assignment_id: 'a1', status: 'draft' } })
    ;(assignmentsApi.publish as any).mockResolvedValue({ data: { assignment_id: 'a1', status: 'published' } })
    await s.createAssignment({})
    await s.publish('a1')
    const firstKey = (assignmentsApi.publish as any).mock.calls[0][1]
    await s.publish('a1')
    const secondKey = (assignmentsApi.publish as any).mock.calls[1][1]
    expect(secondKey).toBe(firstKey)
  })
})

describe('teacher context store', () => {
  it('clears class/course scope data on reset', () => {
    setActivePinia(createPinia())
    const ctx = useTeacherContextStore()
    ctx.setClass('c1', '高二（3）班')
    ctx.setCourse('k1', '函数单调性')
    ctx.reset()
    expect(ctx.classId).toBeNull()
    expect(ctx.className).toBeNull()
    expect(ctx.courseId).toBeNull()
  })
})