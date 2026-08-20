import { defineStore } from 'pinia'
import { todayApi } from '@/api/teacher/today'
import type { TeacherTodayData } from '@/types/teacher'

export const useTeacherTodayStore = defineStore('teacherToday', {
  state: () => ({
    data: null as TeacherTodayData | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetch(date?: string, signal?: AbortSignal) {
      this.loading = true
      this.error = null
      try {
        const res = await todayApi.today(date, signal)
        this.data = res.data
      } catch (e: any) {
        if (e?.code === -2) return // 已取消：忽略旧响应
        this.error = e?.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    clear() { this.data = null; this.error = null },
  },
})