import { teacherGet, teacherPost } from './client'
import type { LessonAdaptRequest, TeacherArtifact, TeacherTask } from '@/types/teacher'

export const lessonsApi = {
  /** 后端返回完整 TeacherArtifact（content 含教案草稿，审计 C-04 对齐） */
  adapt: (payload: LessonAdaptRequest, signal?: AbortSignal) => teacherPost<TeacherArtifact>('/teacher/lessons/adapt', payload, undefined, signal),
  applyInsight: (lessonId: string, payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/lessons/${lessonId}/apply-insight`, payload, idempotencyKey, signal),
  /** 后端返回 data:{lessons:[...]}，此处解包数组 */
  list: async (classId?: string, signal?: AbortSignal): Promise<TeacherArtifact[]> => {
    const res = await teacherGet<{ lessons: TeacherArtifact[] }>(
      '/teacher/lessons',
      classId ? { class_id: classId } : undefined,
      signal,
    )
    return res.data?.lessons ?? []
  },
  get: (lessonId: string, signal?: AbortSignal) => teacherGet<TeacherArtifact>(`/teacher/lessons/${lessonId}`, undefined, signal),
  /** 课件为同步 Artifact（slide_deck draft，content.slides 为可编辑大纲），非异步任务 */
  createSlides: (lessonId: string, payload?: unknown, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/lessons/${lessonId}/slides`, payload ?? { version: 1 }, undefined, signal),
  /** 讲题卡为同步 Artifact（explanation draft） */
  createExplainer: (lessonId: string, payload?: unknown, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/lessons/${lessonId}/explainer`, payload ?? {}, undefined, signal),
}

export const taskApi = {
  get: (taskId: string, signal?: AbortSignal) => teacherGet<TeacherTask>(`/teacher/tasks/${taskId}`, undefined, signal),
  cancel: (taskId: string, signal?: AbortSignal) =>
    teacherPost<TeacherTask>(`/teacher/tasks/${taskId}/cancel`, { client_request_id: `cancel:${taskId}` }, undefined, signal),
}
