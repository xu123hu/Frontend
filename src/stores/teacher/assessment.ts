import { defineStore } from 'pinia'
import { assignmentsApi } from '@/api/teacher/assignments'
import { quizzesApi } from '@/api/teacher/quizzes'
import { createIdempotencyTracker } from '@/api/idempotency'
import type { Assignment, TeacherArtifact } from '@/types/teacher'

const idem = createIdempotencyTracker()

export const useAssessmentStore = defineStore('assessment', {
  state: () => ({
    quizArtifact: null as TeacherArtifact | null,
    assignment: null as Assignment | null,
    generating: false,
    publishing: false,
    error: null as string | null,
  }),
  actions: {
    async generateQuiz(payload: unknown, signal?: AbortSignal) {
      this.generating = true
      this.error = null
      try {
        this.quizArtifact = (await quizzesApi.generate(payload, signal)).data
      } catch (e: any) {
        if (e?.code === -2) return
        this.error = e?.message || '生成题集失败'
        throw e
      } finally { this.generating = false }
    },
    patchQuiz(patch: Record<string, unknown>) {
      if (this.quizArtifact) this.quizArtifact.content = { ...this.quizArtifact.content, ...patch }
    },
    async createAssignment(payload: unknown, idempotencyKey?: string) {
      this.error = null
      try {
        this.assignment = (await assignmentsApi.create(payload, idempotencyKey ?? idem.keyFor('create:assignment'))).data
        return this.assignment
      } catch (e: any) { this.error = e?.message || '创建作业草稿失败'; throw e }
    },
    async publish(assignmentId?: string) {
      const id = assignmentId ?? this.assignment?.assignment_id
      if (!id) return null
      this.publishing = true
      this.error = null
      try {
        this.assignment = (await assignmentsApi.publish(id, idem.keyFor(`publish:${id}`))).data
        return this.assignment
      } catch (e: any) { this.error = e?.message || '发布失败'; throw e } finally { this.publishing = false }
    },
    clear() { this.quizArtifact = null; this.assignment = null; this.error = null },
  },
})