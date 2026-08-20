import { teacherGet, teacherPost } from './client'
import type { BatchConfirmResult, GradingDetail, GradingQueueItem, GradingSuggestion } from '@/types/teacher'

export const gradingApi = {
  queue: (classId?: string, signal?: AbortSignal) =>
    teacherGet<GradingQueueItem[]>('/teacher/grading/queue', classId ? { class_id: classId } : undefined, signal),
  item: (submissionItemId: string, signal?: AbortSignal) =>
    teacherGet<GradingDetail>(`/teacher/grading/${submissionItemId}`, undefined, signal),
  suggest: (submissionItemId: string, payload: unknown, signal?: AbortSignal) =>
    teacherPost<GradingSuggestion>(`/teacher/grading/${submissionItemId}/suggest`, payload, undefined, signal),
  confirm: (submissionItemId: string, payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<GradingSuggestion>(`/teacher/grading/${submissionItemId}/confirm`, payload, idempotencyKey, signal),
  batchConfirm: (payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<BatchConfirmResult>('/teacher/grading/batch-confirm', payload, idempotencyKey, signal),
}