import { teacherPost } from './client'
import { authHeaders } from '@/api/client'
import type { ButlerSceneInput } from '@/types/teacher'

export interface ButlerChatResult {
  artifact?: unknown
  message?: string
  degraded?: boolean
  confirmation_required?: boolean
}

export const butlerApi = {
  chat: (input: ButlerSceneInput, signal?: AbortSignal) =>
    teacherPost<ButlerChatResult>('/teacher/butler/chat', input, undefined, signal),
}

/** 探测正式 Butler 教学助手契约是否已接通（审计 I-05：
 *  后端未提供该端点时返回 404，前端禁用面板而非假确认）。 */
export async function isButlerChatAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/teacher/butler/chat', {
      method: 'OPTIONS',
      headers: { ...authHeaders() } as Record<string, string>,
    })
    // FastAPI 对未注册路由返回 404/405；注册后 OPTIONS 或 POST 均非 404
    return res.status !== 404
  } catch {
    return false
  }
}
