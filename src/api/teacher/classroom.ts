import { teacherGet, teacherPost } from './client'
import type { ClassroomModeState, ClassroomSessionQuestion, ClassroomSessionState, VideoInsight } from '@/types/teacher'

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
  // ===== 课堂会话（§14 调研版） =====
  fetchSession: (classId: string, signal?: AbortSignal) =>
    teacherGet<ClassroomSessionState>(`/teacher/classes/${classId}/classroom-session`, undefined, signal),
  startSession: (classId: string, payload: { topic: string; room?: string }, signal?: AbortSignal) =>
    teacherPost<ClassroomSessionState>(
      `/teacher/classes/${classId}/classroom-session/start`,
      {
        topic: payload.topic,
        room: payload.room ?? undefined,
        client_request_id: `session:${classId}:start`,
      },
      undefined,
      signal,
    ),
  launchQuestion: (classId: string, questionNo: number, signal?: AbortSignal) =>
    teacherPost<ClassroomSessionQuestion>(
      `/teacher/classes/${classId}/classroom-session/question`,
      {
        question_no: questionNo,
        client_request_id: `session:${classId}:q:${questionNo}:${Date.now()}`,
      },
      undefined,
      signal,
    ),
  closeSession: (classId: string, signal?: AbortSignal) =>
    teacherPost<{ status: string }>(
      `/teacher/classes/${classId}/classroom-session/close`,
      { client_request_id: `session:${classId}:close` },
      undefined,
      signal,
    ),
}