import { teacherGet, teacherPost } from './client'
import type { ClassroomModeState, VideoInsight } from '@/types/teacher'

export interface ClassroomModeBody {
  enabled: boolean
  lesson_id?: string
  duration_minutes?: number
  client_request_id: string
  idempotency_key?: string
}

export const classroomApi = {
  setMode: (
    classId: string,
    payload: { enabled: boolean; lesson_id?: string },
    idempotencyKey?: string,
    signal?: AbortSignal,
  ) =>
    teacherPost<ClassroomModeState>(
      `/teacher/classes/${classId}/classroom-mode`,
      {
        enabled: payload.enabled,
        lesson_id: payload.lesson_id ?? undefined,
        client_request_id: `mode:${classId}:${payload.enabled ? 'on' : 'off'}`,
        idempotency_key: idempotencyKey,
      } satisfies ClassroomModeBody,
      idempotencyKey,
      signal,
    ),
  state: (classId: string, signal?: AbortSignal) =>
    teacherGet<ClassroomModeState>(`/teacher/classes/${classId}/classroom-mode`, undefined, signal),
  videoInsights: (classId: string, lessonId?: string, signal?: AbortSignal) =>
    teacherGet<VideoInsight>(`/teacher/classes/${classId}/video-insights`, lessonId ? { lesson_id: lessonId } : undefined, signal),
}
