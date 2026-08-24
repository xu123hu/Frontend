export type QuestionCandidate = {
  candidate_id: string
  stem: string
  q_type: 'choice' | 'blank' | 'solution'
  answer: string
  knowledge_points?: string[]
  review_status: 'pending_review' | 'approved'
}

export type TeacherResource = {
  resource_id: string
  name: string
  file_type: string
  size_bytes: number
  status: 'preprocessing' | 'ready' | 'failed' | 'cancelled'
  summary?: string
  published: boolean
  warnings: string[]
  download_url: string
  question_candidates: QuestionCandidate[]
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || '教师资源服务暂不可用')
  return body.data as T
}

export async function loadTeacherResources(signal?: AbortSignal): Promise<TeacherResource[]> {
  const data = await envelope<{ resources: TeacherResource[] }>(await fetch('/api/teacher/resources', { credentials: 'include', signal }))
  return data.resources
}

export async function uploadTeacherResource(file: File): Promise<void> {
  const form = new FormData()
  form.set('file', file)
  await envelope(await fetch('/api/teacher/resources/upload', { method: 'POST', credentials: 'include', body: form }))
}

export async function approveQuestionCandidates(resourceId: string, candidateIds: string[]): Promise<void> {
  await envelope(await fetch(`/api/teacher/resources/${resourceId}/question-candidates/approve`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ candidate_ids: candidateIds }),
  }))
}
