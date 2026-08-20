import { teacherGet } from './client'
import type { TeacherTodayData } from '@/types/teacher'

export const todayApi = {
  today: (date?: string, signal?: AbortSignal) => teacherGet<TeacherTodayData>('/teacher/today', date ? { date } : undefined, signal),
}