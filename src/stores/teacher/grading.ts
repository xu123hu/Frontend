import { defineStore } from 'pinia'
import { gradingApi } from '@/api/teacher/grading'
import { createIdempotencyTracker } from '@/api/idempotency'
import type { BatchConfirmResult, GradingDetail, GradingQueueItem } from '@/types/teacher'

const idem = createIdempotencyTracker()

export const useGradingStore = defineStore('grading', {
  state: () => ({
    queue: [] as GradingQueueItem[],
    detail: null as GradingDetail | null,
    batchResult: null as BatchConfirmResult | null,
    loading: false,
    confirming: false,
    error: null as string | null,
  }),
  actions: {
    async fetchQueue(classId?: string, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.queue = await gradingApi.queue(classId, signal) }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载批改队列失败' }
      finally { this.loading = false }
    },
    async fetchItem(id: string, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.detail = (await gradingApi.item(id, signal)).data }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载失败' }
      finally { this.loading = false }
    },
    /** 确认（审计 C-04 对齐）：必须携带 suggestion_id + version（乐观锁） */
    async confirm(id: string, decision: 'accept' | 'override', finalScore?: number | null, feedback?: string | null) {
      this.confirming = true; this.error = null
      try {
        const suggestion = this.detail?.suggestion
        if (!suggestion?.suggestion_id) throw new Error('缺少建议记录，无法确认')
        const res = await gradingApi.confirm(id, {
          suggestion_id: suggestion.suggestion_id,
          decision,
          final_score: finalScore ?? null,
          teacher_feedback: feedback ?? null,
          version: suggestion.version ?? 1,
        }, idem.keyFor(`confirm:${id}:${suggestion.suggestion_id}`))
        if (this.detail) this.detail.suggestion = res.data
        return res.data
      } catch (e: any) { this.error = e?.message || '确认失败'; throw e } finally { this.confirming = false }
    },
    async batchConfirm(payload: unknown, idempotencyKey?: string) {
      const res = await gradingApi.batchConfirm(payload, idempotencyKey ?? idem.keyFor('grading:batch-confirm'))
      this.batchResult = res.data
      return res.data
    },
    clear() { this.queue = []; this.detail = null; this.batchResult = null; this.error = null },
  },
})
