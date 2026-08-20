import { teacherPost } from './client'
import type { TeacherArtifact } from '@/types/teacher'

export const quizzesApi = {
  generate: (payload: unknown, signal?: AbortSignal) =>
    teacherPost<TeacherArtifact>('/teacher/quizzes/generate', payload, undefined, signal),
}