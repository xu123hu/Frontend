import { teacherGet, teacherPost } from './client'
import type { TeacherResource, UploadTicket } from '@/types/teacher'
import { authHeaders } from '@/api/client'
import { ApiError } from '@/api/client'

export interface ResourceActionBody {
  client_request_id: string
}

export const resourcesApi = {
  /** 后端返回 data:{resources:[...]}，此处解包数组（审计 C-04 对齐） */
  list: async (signal?: AbortSignal): Promise<TeacherResource[]> => {
    const res = await teacherGet<{ resources: TeacherResource[] }>('/teacher/resources', undefined, signal)
    return res.data?.resources ?? []
  },
  /** 上传走 multipart（后端为 UploadFile 端点，审计 C-04 对齐；
   *  不经 api.raw：其会强制 JSON.stringify，FormData 需原生 fetch 让浏览器设置 boundary） */
  upload: async (file: File, signal?: AbortSignal): Promise<UploadTicket> => {
    const fd = new FormData()
    fd.append('file', file, file.name)
    let res: Response
    try {
      res = await fetch('/api/teacher/resources/upload', {
        method: 'POST',
        headers: { ...authHeaders() } as Record<string, string>,
        body: fd,
        signal,
      })
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw new ApiError(-2, '请求已取消')
      throw new ApiError(-1, '网络连接失败，请确认后端已启动')
    }
    if (res.status === 401) throw new ApiError(401, '登录已过期')
    const json = await res.json().catch(() => null)
    if (json && json.code === 0) return json.data ?? null
    throw new ApiError(json?.code ?? res.status, json?.message || '上传失败')
  },
  preprocess: (resourceId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(
      `/teacher/resources/${resourceId}/preprocess`,
      { client_request_id: `preprocess:${resourceId}` } satisfies ResourceActionBody,
      idempotencyKey,
      signal,
    ),
  understand: (resourceId: string, idempotencyKey?: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(
      `/teacher/resources/${resourceId}/understand`,
      { client_request_id: `understand:${resourceId}` } satisfies ResourceActionBody,
      idempotencyKey,
      signal,
    ),
  publish: (resourceId: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(`/teacher/resources/${resourceId}/publish`, {}, undefined, signal),
  unpublish: (resourceId: string, signal?: AbortSignal) =>
    teacherPost<TeacherResource>(`/teacher/resources/${resourceId}/unpublish`, {}, undefined, signal),
  approveQuestionCandidates: (resourceId: string, candidateIds: string[], signal?: AbortSignal) =>
    teacherPost<{ resource_id: string; approved_hashes: string[]; review_required: boolean }>(
      `/teacher/resources/${resourceId}/question-candidates/approve`,
      { candidate_ids: candidateIds },
      undefined,
      signal,
    ),
}
