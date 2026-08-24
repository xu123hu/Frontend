import { defineStore } from 'pinia'
import { createIdempotencyTracker } from '@/api/idempotency'
import { gradingWorkspaceApi } from '@/api/teacher/gradingWorkspace'
import { toGradingWorkspace } from '@/features/teacher-grading-v2/gradingWorkspaceAdapter'
import type { ConfirmWorkspaceDecision, GradingWorkspace, GradingWorkspaceQuery, WorkspaceFilter } from '@/features/teacher-grading-v2/contracts'

const idempotency = createIdempotencyTracker()

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export const useGradingWorkspaceStore = defineStore('gradingWorkspace', {
  state: () => ({
    workspace: null as GradingWorkspace | null,
    loading: false,
    actionPending: false,
    error: null as string | null,
    selectionQuery: {} as GradingWorkspaceQuery,
    controller: null as AbortController | null,
  }),
  actions: {
    async load(query: GradingWorkspaceQuery = {}, signal?: AbortSignal) {
      this.controller?.abort()
      const controller = signal ? null : new AbortController()
      this.controller = controller
      this.loading = true
      this.error = null
      this.selectionQuery = { ...this.selectionQuery, ...query }
      try {
        const response = await gradingWorkspaceApi.get(this.selectionQuery, signal ?? controller?.signal)
        const workspace = toGradingWorkspace(response)
        this.workspace = workspace
        const selectedId = workspace.selected?.submissionItemId
        if (selectedId) this.selectionQuery.submissionItemId = selectedId
        else delete this.selectionQuery.submissionItemId
        return workspace
      } catch (error: unknown) {
        if ((error as { code?: number }).code === -2) return null
        this.error = messageOf(error, '加载批改工作台失败')
        throw error
      } finally {
        if (this.controller === controller) this.controller = null
        this.loading = false
      }
    },
    async select(submissionItemId: string) {
      return this.load({ submissionItemId })
    },
    async setFilter(status: WorkspaceFilter) {
      return this.load({ status, submissionItemId: undefined })
    },
    async previous() {
      const previousId = this.workspace?.navigation.previousId
      if (!previousId) return null
      return this.select(previousId)
    },
    async markForReview(note = '') {
      const selected = this.workspace?.selected
      if (!selected) throw new Error('未选择待批作答')
      this.actionPending = true
      this.error = null
      try {
        await gradingWorkspaceApi.review(selected.submissionItemId, {
          state: 'pending',
          note: note || null,
          clientRequestId: 'grading-review-' + selected.submissionItemId,
        }, idempotency.keyFor('grading:review:' + selected.submissionItemId))
        return await this.load({ submissionItemId: selected.submissionItemId })
      } catch (error: unknown) {
        this.error = messageOf(error, '标记复看失败')
        throw error
      } finally { this.actionPending = false }
    },
    async confirmAndNext(decision: ConfirmWorkspaceDecision) {
      const selected = this.workspace?.selected
      const suggestion = selected?.suggestion
      if (!selected || !suggestion?.suggestionId || suggestion.version === null) throw new Error('缺少可确认的评分建议')
      this.actionPending = true
      this.error = null
      try {
        await gradingWorkspaceApi.confirm(selected.submissionItemId, {
          ...decision,
          suggestion_id: suggestion.suggestionId,
          version: suggestion.version,
        }, idempotency.keyFor('grading:confirm:' + selected.submissionItemId + ':' + suggestion.suggestionId))
        const nextId = this.workspace?.navigation.nextUngradedId
        return await this.load({ submissionItemId: nextId ?? undefined })
      } catch (error: unknown) {
        this.error = messageOf(error, '确认评分失败')
        throw error
      } finally { this.actionPending = false }
    },
    loadFile(submissionItemId: string, signal?: AbortSignal) {
      return gradingWorkspaceApi.file(submissionItemId, signal)
    },
    clear() {
      this.controller?.abort()
      this.controller = null
      this.workspace = null
      this.loading = false
      this.actionPending = false
      this.error = null
      this.selectionQuery = {}
    },
  },
})
