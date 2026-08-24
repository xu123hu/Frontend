import { authHeaders } from '@/api/client'
import { teacherGet, teacherPost } from './client'
import type { ConfirmWorkspaceDecision, GradingWorkspaceQuery, SetWorkspaceReview } from '@/features/teacher-grading-v2/contracts'

function queryFor(input: GradingWorkspaceQuery): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (input.classId) query.class_id = input.classId
  if (input.assignmentId) query.assignment_id = input.assignmentId
  if (input.itemNo !== undefined) query.item_no = input.itemNo
  if (input.status) query.status = input.status
  if (input.submissionItemId) query.submission_item_id = input.submissionItemId
  return query
}

export const gradingWorkspaceApi = {
  get: (query: GradingWorkspaceQuery, signal?: AbortSignal) =>
    teacherGet<unknown>('/teacher/grading/workspace', queryFor(query), signal),
  suggest: (submissionItemId: string, payload: unknown, signal?: AbortSignal) =>
    teacherPost<unknown>('/teacher/grading/' + submissionItemId + '/suggest', payload, undefined, signal),
  confirm: (submissionItemId: string, payload: ConfirmWorkspaceDecision & { suggestion_id: string; version: number }, idempotencyKey: string, signal?: AbortSignal) =>
    teacherPost<unknown>('/teacher/grading/' + submissionItemId + '/confirm', {
      suggestion_id: payload.suggestion_id,
      decision: payload.decision,
      final_score: payload.finalScore,
      teacher_feedback: payload.feedback || null,
      version: payload.version,
    }, idempotencyKey, signal),
  review: (submissionItemId: string, payload: SetWorkspaceReview, idempotencyKey: string, signal?: AbortSignal) =>
    teacherPost<unknown>('/teacher/grading/' + submissionItemId + '/review', {
      state: payload.state,
      note: payload.note || null,
      client_request_id: payload.clientRequestId,
    }, idempotencyKey, signal),
  file: async (submissionItemId: string, signal?: AbortSignal): Promise<Blob> => {
    const response = await fetch('/api/teacher/grading/' + submissionItemId + '/file', {
      headers: authHeaders() as Record<string, string>,
      signal,
    })
    if (!response.ok) throw new Error('无法加载学生原始文件')
    return response.blob()
  },
}
