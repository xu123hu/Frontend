import { defineStore } from 'pinia'
import { resourcesApi } from '@/api/teacher/resources'
import type { TeacherResource, UploadTicket } from '@/types/teacher'

export const useResourcesStore = defineStore('resources', {
  state: () => ({
    items: [] as TeacherResource[],
    ticket: null as UploadTicket | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async fetch(signal?: AbortSignal) {
      this.loading = true; this.error = null
      try { this.items = await resourcesApi.list(signal) }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载资源失败' }
      finally { this.loading = false }
    },
    /** 上传（审计 C-04 对齐）：后端为 multipart UploadFile 端点，传 File 对象 */
    async upload(file: File, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try {
        this.ticket = await resourcesApi.upload(file, signal)
        this.patchItem({
          resource_id: this.ticket.resource_id,
          name: file.name,
          file_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          status: this.ticket.status,
          task_id: this.ticket.task_id,
          created_at: new Date().toISOString(),
        })
        return this.ticket
      } catch (e: any) { if (e?.code === -2) return null; this.error = e?.message || '上传失败'; throw e }
      finally { this.loading = false }
    },
    async createExternalReference(payload: { title: string; url: string; provider?: string; attribution?: string; intended_use?: string }, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try {
        const created = await resourcesApi.createExternalReference(payload, signal)
        this.patchItem(created.data)
        return created.data
      } catch (e: any) { this.error = e?.message || '保存公开引用失败'; throw e }
      finally { this.loading = false }
    },
    async preprocess(id: string, signal?: AbortSignal) {
      this.error = null
      try { this.patchItem((await resourcesApi.preprocess(id, undefined, signal)).data) }
      catch (e: any) { this.error = e?.message || '预处理失败'; throw e }
    },
    async understand(id: string, signal?: AbortSignal) {
      this.error = null
      try { this.patchItem((await resourcesApi.understand(id, undefined, signal)).data) }
      catch (e: any) { this.error = e?.message || '解析失败'; throw e }
    },
    async setPublished(id: string, published: boolean, signal?: AbortSignal) {
      const response = published
        ? await resourcesApi.publish(id, signal)
        : await resourcesApi.unpublish(id, signal)
      this.patchItem(response.data)
    },
    async remove(id: string, signal?: AbortSignal) {
      this.error = null
      try {
        await resourcesApi.remove(id, signal)
        this.items = this.items.filter((x) => x.resource_id !== id)
      } catch (e: any) { this.error = e?.message || '删除失败'; throw e }
    },
    async approveQuestionCandidate(resourceId: string, candidateId: string, signal?: AbortSignal) {
      this.error = null
      try {
        await resourcesApi.approveQuestionCandidates(resourceId, [candidateId], signal)
        await this.fetch(signal)
      } catch (e: any) { this.error = e?.message || '候选题审核失败'; throw e }
    },
    patchItem(r: TeacherResource) {
      const i = this.items.findIndex((x) => x.resource_id === r.resource_id)
      if (i >= 0) this.items[i] = r; else this.items.unshift(r)
    },
    clear() { this.items = []; this.ticket = null; this.error = null },
  },
})
