import { defineStore } from 'pinia'
import { createIdempotencyTracker } from '@/api/idempotency'
import { classroomApi } from '@/api/teacher/classroom'
import type { ClassroomModeState, ClassroomSessionState, VideoInsight } from '@/types/teacher'

const idem = createIdempotencyTracker()

export const useClassroomStore = defineStore('classroom', {
  state: () => ({
    mode: null as ClassroomModeState | null,
    insights: null as VideoInsight | null,
    session: null as ClassroomSessionState | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    /** 开/关使用不同幂等键（同键会被后端重放，导致无法关闭）；tracker 保证重试同键 */
    async setMode(classId: string, enabled: boolean, lessonId?: string, idempotencyKey?: string) {
      this.loading = true; this.error = null
      try {
        this.mode = (await classroomApi.setMode(
          classId,
          { enabled, lesson_id: lessonId ?? undefined },
          idempotencyKey ?? idem.keyFor(`classroom:mode:${classId}:${enabled ? 'on' : 'off'}`),
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
    // ===== 课堂会话（§14 调研版） =====
    async fetchSession(classId: string, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.session = (await classroomApi.fetchSession(classId, signal)).data }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '会话状态加载失败' }
      finally { this.loading = false }
    },
    async startSession(classId: string, payload: { topic: string; room?: string }) {
      this.loading = true; this.error = null
      try { this.session = (await classroomApi.startSession(classId, payload)).data }
      catch (e: any) { this.error = e?.message || '开启课堂失败'; throw e } finally { this.loading = false }
    },
    async launchQuestion(classId: string, questionNo: number) {
      this.loading = true; this.error = null
      try {
        // 幂等恢复（N2）：tracker 同动作复用同键，网络重试不重复发题
        const result = (await classroomApi.launchQuestion(classId, questionNo, idem.keyFor(`classroom:launch:${classId}:${questionNo}`))).data
        if (this.session) this.session = { ...this.session, last_question: result }
        else this.session = { class_id: classId, session_id: null, topic: '', room: '', started_at: '', status: 'active', connected_total: 0, current_segment: null, last_question: result, degraded: false }
      } catch (e: any) { this.error = e?.message || '发题失败'; throw e } finally { this.loading = false }
    },
    async closeSession(classId: string) {
      this.loading = true; this.error = null
      try {
        await classroomApi.closeSession(classId)
        if (this.session) this.session = { ...this.session, status: 'ended' }
        else this.session = { class_id: classId, session_id: null, topic: '', room: '', started_at: '', status: 'ended', connected_total: 0, current_segment: null, last_question: null, degraded: false }
      } catch (e: any) { this.error = e?.message || '结束课堂失败'; throw e } finally { this.loading = false }
    },
    clear() { this.mode = null; this.insights = null; this.session = null; this.error = null },
  },
})