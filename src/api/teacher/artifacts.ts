import { teacherGet, teacherPut } from './client'

export const artifactsApi = {
  get: (id: string, signal?: AbortSignal) => teacherGet<import('@/types/teacher').TeacherArtifact>(`/teacher/artifacts/${id}`, undefined, signal),
  update: (id: string, body: unknown, signal?: AbortSignal) => teacherPut<import('@/types/teacher').TeacherArtifact>(`/teacher/artifacts/${id}`, body, signal),
}