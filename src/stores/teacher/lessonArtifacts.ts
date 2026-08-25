import { defineStore } from 'pinia'
import { artifactsApi } from '@/api/teacher/artifacts'
import { lessonsApi } from '@/api/teacher/lessons'
import type { LessonAdaptRequest, TeacherArtifact } from '@/types/teacher'

export interface LessonAdaptResult {
  artifact: TeacherArtifact | null
  error: string | null
}

export const useLessonArtifactsStore = defineStore('lessonArtifacts', {
  state: () => ({
    artifact: null as TeacherArtifact | null,
    history: [] as TeacherArtifact[],
    loading: false,
    saving: false,
    error: null as string | null,
  }),
  actions: {
    async adapt(payload: LessonAdaptRequest, signal?: AbortSignal): Promise<LessonAdaptResult> {
      this.loading = true
      this.error = null
      // A new topic is a new draft attempt: never leave an older lesson
      // visible or actionable while this request is pending or fails.
      this.artifact = null
      try {
        const res = await lessonsApi.adapt(payload, signal)
        return { artifact: res.data, error: null }
      } catch (e: any) {
        if (e?.code === -2) return { artifact: null, error: null }
        return { artifact: null, error: e?.message || '生成教案失败' }
      } finally { this.loading = false }
    },
    async save(payload: unknown, signal?: AbortSignal) {
      if (!this.artifact) return null
      this.saving = true
      this.error = null
      try {
        // artifactsApi.update 已解包返回最新 TeacherArtifact（含新版本号）
        this.artifact = await artifactsApi.update(this.artifact.artifact_id, payload, signal)
        return this.artifact
      } catch (e: any) {
        this.error = e?.message || '保存失败'
        throw e
      } finally { this.saving = false }
    },
    clear() { this.artifact = null; this.history = []; this.error = null },
  },
})
