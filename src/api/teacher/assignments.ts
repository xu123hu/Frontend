import { teacherGet, teacherPost } from './client'
import type { Assignment } from '@/types/teacher'

export const assignmentsApi = {
  list: (classId?: string, status?: string, signal?: AbortSignal) =>
    teacherGet<Assignment[]>('/teacher/assignments', { class_id: classId, status }, signal),
  create: (payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>('/teacher/assignments', payload, idempotencyKey, signal),
  publish: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(`/teacher/assignments/${assignmentId}/publish`, undefined, idempotencyKey, signal),
  close: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(`/teacher/assignments/${assignmentId}/close`, undefined, idempotencyKey, signal),
  archive: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(`/teacher/assignments/${assignmentId}/archive`, undefined, idempotencyKey, signal),
}