export type TeacherAssignment = {
  assignment_id: string
  class_id: string
  title: string
  type: string
  status: 'draft' | 'published' | 'closed' | 'archived'
  deadline?: string | null
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || '作业服务暂不可用')
  return body.data as T
}

export async function loadAssignments(signal?: AbortSignal): Promise<TeacherAssignment[]> {
  const data = await envelope<{ assignments: TeacherAssignment[] }>(await fetch('/api/teacher/assignments', { credentials: 'include', signal }))
  return data.assignments
}

export async function publishAssignment(assignmentId: string): Promise<void> {
  await envelope(await fetch(`/api/teacher/assignments/${assignmentId}/publish`, {
    method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_request_id: crypto.randomUUID(), idempotency_key: crypto.randomUUID() }),
  }))
}
