import { teacherGet, teacherPost, teacherPut } from './client'
import type { TeacherArtifact } from '@/types/teacher'

export const artifactsApi = {
  get: (id: string, signal?: AbortSignal) => teacherGet<TeacherArtifact>(`/teacher/artifacts/${id}`, undefined, signal),
  update: (id: string, body: unknown, signal?: AbortSignal) => teacherPut<TeacherArtifact>(`/teacher/artifacts/${id}`, body, signal),
  confirm: (id: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/artifacts/${id}/confirm`, undefined, idempotencyKey, signal),
  publish: (id: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/artifacts/${id}/publish`, undefined, idempotencyKey, signal),
  archive: (id: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>(`/teacher/artifacts/${id}/archive`, undefined, idempotencyKey, signal),
}