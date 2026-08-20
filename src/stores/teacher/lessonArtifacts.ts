import { defineStore } from 'pinia'
import { artifactsApi } from '@/api/teacher/artifacts'
import { lessonsApi } from '@/api/teacher/lessons'
import type { TeacherArtifact } from '@/types/teacher'

export const useLessonArtifactsStore = defineStore('lessonArtifacts', {
  state: () => ({
    artifact: null as TeacherArtifact | null,
    history: [] as TeacherArtifact[],
    loading: false,
    saving: false,
    error: null as string | null,
  }),
  actions: {
    async adapt(payload: unknown, signal?: AbortSignal) {
      this.loading = true
      this.error = null
      try {
        const res = await lessonsApi.adapt(payload, signal)
        this.artifact = res.data
      } catch (e: any) {
        if (e?.code === -2) return
        this.error = e?.message || '生成教案失败'
      } finally { this.loading = false }
    },
    async save(payload: unknown, signal?: AbortSignal) {
      if (!this.artifact) return null
      this.saving = true
      this.error = null
      try {
        const res = await artifactsApi.update(this.artifact.artifact_id, payload, signal)
        this.artifact = res.data
        return res.data
      } catch (e: any) {
        this.error = e?.message || '保存失败'
        throw e
      } finally { this.saving = false }
    },
    clear() { this.artifact = null; this.history = []; this.error = null },
  },
})