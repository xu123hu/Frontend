import { teacherGet, teacherPost } from './client'
import type { Assignment } from '@/types/teacher'

export interface AssignmentActionBody {
  client_request_id: string
  idempotency_key?: string
}

export const assignmentsApi = {
  /** 后端返回 data:{assignments:[...]}，此处解包数组（审计 C-04 对齐） */
  list: async (classId?: string, status?: string, signal?: AbortSignal): Promise<Assignment[]> => {
    const res = await teacherGet<{ assignments: Assignment[] }>(
      '/teacher/assignments',
      { class_id: classId, status },
      signal,
    )
    return res.data?.assignments ?? []
  },
  create: (payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>('/teacher/assignments', payload, idempotencyKey, signal),
  publish: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(
      `/teacher/assignments/${assignmentId}/publish`,
      { client_request_id: `publish:${assignmentId}`, idempotency_key: idempotencyKey } satisfies AssignmentActionBody,
      idempotencyKey,
      signal,
    ),
  close: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(
      `/teacher/assignments/${assignmentId}/close`,
      { client_request_id: `close:${assignmentId}`, idempotency_key: idempotencyKey } satisfies AssignmentActionBody,
      idempotencyKey,
      signal,
    ),
  archive: (assignmentId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<Assignment>(
      `/teacher/assignments/${assignmentId}/archive`,
      { client_request_id: `archive:${assignmentId}`, idempotency_key: idempotencyKey } satisfies AssignmentActionBody,
      idempotencyKey,
      signal,
    ),
}
