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
      try { this.items = (await resourcesApi.list(signal)).data }
      catch (e: any) { if (e?.code === -2) return; this.error = e?.message || '加载资源失败' }
      finally { this.loading = false }
    },
    async upload(payload: unknown, signal?: AbortSignal) {
      this.loading = true; this.error = null
      try {
        this.ticket = (await resourcesApi.upload(payload, undefined, signal)).data
        return this.ticket
      } catch (e: any) { if (e?.code === -2) return null; this.error = e?.message || '上传失败'; throw e }
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
    patchItem(r: TeacherResource) {
      const i = this.items.findIndex((x) => x.resource_id === r.resource_id)
      if (i >= 0) this.items[i] = r; else this.items.unshift(r)
    },
    clear() { this.items = []; this.ticket = null; this.error = null },
  },
})