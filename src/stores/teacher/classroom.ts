import { defineStore } from 'pinia'
import { classroomApi } from '@/api/teacher/classroom'
import { createIdempotencyTracker } from '@/api/idempotency'
import type { ClassroomModeState, VideoInsight } from '@/types/teacher'

const idem = createIdempotencyTracker()

export const useClassroomStore = defineStore('classroom', {
  state: () => ({
    mode: null as ClassroomModeState | null,
    insights: null as VideoInsight | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    /** 开/关使用不同幂等键（同键会被后端重放，导致无法关闭） */
    async setMode(classId: string, enabled: boolean, lessonId?: string, idempotencyKey?: string) {
      this.loading = true; this.error = null
      try {
        this.mode = (await classroomApi.setMode(
          classId,
          { enabled, lesson_id: lessonId ?? undefined },
          idempotencyKey ?? idem.keyFor(`mode:${classId}:${enabled ? 'on' : 'off'}:${crypto.randomUUID()}`),
        )).data
      } catch (e: any) { this.error = e?.message || '操作课堂模式失败'; throw e } finally { this.loading = false }
    },
    async fetchState(classId: string, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.mode = (await classroomApi.state(classId, signal)).data }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载失败' }
      finally { this.loading = false }
    },
    async fetchVideoInsights(classId: string, lessonId?: string, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.insights = (await classroomApi.videoInsights(classId, lessonId, signal)).data }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载失败' }
      finally { this.loading = false }
    },
    clear() { this.mode = null; this.insights = null; this.error = null },
  },
})
