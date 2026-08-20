import { teacherGet, teacherPost } from './client'
import type { TeacherArtifact, TeacherTask } from '@/types/teacher'

export const lessonsApi = {
  adapt: (payload: unknown, signal?: AbortSignal) => teacherPost<TeacherArtifact>('/teacher/lessons/adapt', payload, undefined, signal),
  applyInsight: (lessonId: string, payload: unknown, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/lessons/${lessonId}/apply-insight`, payload, idempotencyKey, signal),
  list: (classId?: string, signal?: AbortSignal) => teacherGet<TeacherArtifact[]>('/teacher/lessons', classId ? { class_id: classId } : undefined, signal),
  get: (lessonId: string, signal?: AbortSignal) => teacherGet<TeacherArtifact>(`/teacher/lessons/${lessonId}`, undefined, signal),
  createSlides: (lessonId: string, payload?: unknown, signal?: AbortSignal) =>
    teacherPost<{ task_id: string }>(`/teacher/lessons/${lessonId}/slides`, payload ?? {}, undefined, signal),
  createExplainer: (lessonId: string, payload?: unknown, signal?: AbortSignal) =>
    teacherPost<{ task_id: string }>(`/teacher/lessons/${lessonId}/explainer`, payload ?? {}, undefined, signal),
}

export const taskApi = {
  get: (taskId: string, signal?: AbortSignal) => teacherGet<TeacherTask>(`/teacher/tasks/${taskId}`, undefined, signal),
  cancel: (taskId: string, signal?: AbortSignal) => teacherPost<TeacherTask>(`/teacher/tasks/${taskId}/cancel`, undefined, undefined, signal),
}