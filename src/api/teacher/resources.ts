import { teacherGet, teacherPost } from './client'
import type { TeacherResource, UploadTicket } from '@/types/teacher'

export const resourcesApi = {
  list: (signal?: AbortSignal) => teacherGet<TeacherResource[]>('/teacher/resources', undefined, signal),
  upload: (payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<UploadTicket>('/teacher/resources/upload', payload, idempotencyKey, signal),
  preprocess: (resourceId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(`/teacher/resources/${resourceId}/preprocess`, undefined, idempotencyKey, signal),
  understand: (resourceId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(`/teacher/resources/${resourceId}/understand`, undefined, idempotencyKey, signal),
}