import { teacherGet, teacherPost } from './client'
import type { ClassroomModeState, VideoInsight } from '@/types/teacher'

export const classroomApi = {
  setMode: (classId: string, payload: { enabled: boolean; lesson_id?: string }, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<ClassroomModeState>(`/teacher/classes/${classId}/classroom-mode`, payload, idempotencyKey, signal),
  state: (classId: string, signal?: AbortSignal) =>
    teacherGet<ClassroomModeState>(`/teacher/classes/${classId}/classroom-mode`, undefined, signal),
  videoInsights: (classId: string, lessonId?: string, signal?: AbortSignal) =>
    teacherGet<VideoInsight>(`/teacher/classes/${classId}/video-insights`, lessonId ? { lesson_id: lessonId } : undefined, signal),
}