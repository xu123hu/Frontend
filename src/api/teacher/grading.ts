import { teacherGet, teacherPost } from './client'
import type { BatchConfirmResult, GradingDetail, GradingQueueItem, GradingReviewInsights, GradingSuggestion } from '@/types/teacher'

export const gradingApi = {
  /** 后端返回 data:{queue:[...]}，此处解包数组（审计 C-04 对齐） */
  queue: async (classId?: string, signal?: AbortSignal): Promise<GradingQueueItem[]> => {
    const res = await teacherGet<{ queue: GradingQueueItem[] }>(
      '/teacher/grading/queue',
      classId ? { class_id: classId } : undefined,
      signal,
    )
    return res.data?.queue ?? []
  },
  item: (submissionItemId: string, signal?: AbortSignal) =>
    teacherGet<GradingDetail>(`/teacher/grading/${submissionItemId}`, undefined, signal),
  suggest: (submissionItemId: string, payload: unknown, signal?: AbortSignal) =>
    teacherPost<GradingSuggestion>(`/teacher/grading/${submissionItemId}/suggest`, payload, undefined, signal),
  confirm: (submissionItemId: string, payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<GradingSuggestion>(`/teacher/grading/${submissionItemId}/confirm`, payload, idempotencyKey, signal),
  batchConfirm: (payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<BatchConfirmResult>('/teacher/grading/batch-confirm', payload, idempotencyKey, signal),
  /** 批后讲评建议：最近一份已批作业最值得讲的 Top 题（调研版） */
  insights: async (classId: string, signal?: AbortSignal): Promise<GradingReviewInsights> => {
    const res = await teacherGet<GradingReviewInsights>('/teacher/grading/insights', { class_id: classId }, signal)
    return res.data ?? { assignment_id: null, title: '', review_rate: 0, top_questions: [] }
  },
}