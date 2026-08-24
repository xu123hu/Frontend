export type ButlerReply = {
  message?: string
  confirmation_required?: boolean
  degraded?: boolean
}

export type TodayEvidence = {
  grading_queue?: { count?: number }
  deadlines?: Array<{ id: string; title: string; due_at?: string | null }>
  actionable_insights?: Array<{ id?: string; title?: string; action?: string; evidence?: string }>
  source_missing?: boolean
  degraded?: boolean
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || '教师服务暂不可用')
  return body.data as T
}

export async function loadTodayEvidence(signal?: AbortSignal): Promise<TodayEvidence> {
  return envelope<TodayEvidence>(await fetch('/api/teacher/today', { credentials: 'include', signal }))
}

export async function sendButlerMessage(message: string, signal?: AbortSignal): Promise<ButlerReply> {
  return envelope<ButlerReply>(await fetch('/api/teacher/butler/chat', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      scene: 'teacher.today',
      userMessage: message,
      clientRequestId: crypto.randomUUID(),
    }),
  }))
}
