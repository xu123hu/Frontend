import { teacherGet, teacherPost, teacherPut } from './client'
import type { TeacherArtifact } from '@/types/teacher'

export interface ArtifactActionBody {
  client_request_id: string
  idempotency_key?: string
}

/** 后端动作响应 data:{artifact, replayed}，此处解包 artifact（审计 C-04 对齐） */
export const artifactsApi = {
  get: (id: string, signal?: AbortSignal) => teacherGet<TeacherArtifact>(`/teacher/artifacts/${id}`, undefined, signal),
  update: async (id: string, body: unknown, signal?: AbortSignal): Promise<TeacherArtifact> => {
    const res = await teacherPut<{ artifact: TeacherArtifact; created_new_version: boolean }>(
      `/teacher/artifacts/${id}`, body, signal,
    )
    return res.data?.artifact ?? res.data
  },
  confirm: async (id: string, idempotencyKey?: string, signal?: AbortSignal): Promise<TeacherArtifact> => {
    const res = await teacherPost<{ artifact: TeacherArtifact; replayed: boolean }>(
      `/teacher/artifacts/${id}/confirm`,
      { client_request_id: `confirm:${id}`, idempotency_key: idempotencyKey } satisfies ArtifactActionBody,
      idempotencyKey, signal,
    )
    return res.data?.artifact ?? res.data
  },
  publish: async (id: string, idempotencyKey?: string, signal?: AbortSignal): Promise<TeacherArtifact> => {
    const res = await teacherPost<{ artifact: TeacherArtifact; replayed: boolean }>(
      `/teacher/artifacts/${id}/publish`,
      { client_request_id: `publish:${id}`, idempotency_key: idempotencyKey } satisfies ArtifactActionBody,
      idempotencyKey, signal,
    )
    return res.data?.artifact ?? res.data
  },
  archive: async (id: string, idempotencyKey?: string, signal?: AbortSignal): Promise<TeacherArtifact> => {
    const res = await teacherPost<{ artifact: TeacherArtifact; replayed: boolean }>(
      `/teacher/artifacts/${id}/archive`,
      { client_request_id: `archive:${id}`, idempotency_key: idempotencyKey } satisfies ArtifactActionBody,
      idempotencyKey, signal,
    )
    return res.data?.artifact ?? res.data
  },
}
