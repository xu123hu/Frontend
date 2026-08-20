import { api } from '@/api/client'

export interface TeacherRequestOptions {
  body?: unknown
  query?: Record<string, unknown>
  headers?: Record<string, string>
  signal?: AbortSignal
  idempotencyKey?: string
}

export interface TeacherResponse<T> {
  data: T
  status: number
  request_id?: string
}

export function teacherRequest<T>(method: string, path: string, opts: TeacherRequestOptions = {}): Promise<TeacherResponse<T>> {
  return api.raw(method, path, {
    body: opts.body,
    query: opts.query,
    headers: opts.headers,
    signal: opts.signal,
    idempotencyKey: opts.idempotencyKey,
  }) as Promise<TeacherResponse<T>>
}

export function teacherGet<T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal) {
  return teacherRequest<T>('GET', path, { query, signal })
}
export function teacherPost<T>(path: string, body?: unknown, idempotencyKey?: string, signal?: AbortSignal) {
  return teacherRequest<T>('POST', path, { body, idempotencyKey, signal })
}
export function teacherPut<T>(path: string, body?: unknown, signal?: AbortSignal) {
  return teacherRequest<T>('PUT', path, { body, signal })
}