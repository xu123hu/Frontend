import { teacherGet } from './client'
import type { ActionableInsight } from '@/types/teacher'

export const classesApi = {
  insights: (classId: string, actionable?: boolean, signal?: AbortSignal) =>
    teacherGet<ActionableInsight[]>(`/teacher/classes/${classId}/insights`, actionable === undefined ? undefined : { actionable }, signal),
}