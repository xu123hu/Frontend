export type TeacherIdentity = {
  nickname: string
  avatar_url?: string | null
  status?: string
  active_role: string
  roles: Array<{ role: string; verified: boolean; org_name?: string | null }>
}

export type TeacherModelConfig = {
  configured: boolean
  secondary?: { model?: string; source?: 'user' | 'env_default' }
}

async function envelope<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || '教师资料服务暂不可用')
  return body.data as T
}

export async function loadTeacherIdentity(signal?: AbortSignal): Promise<TeacherIdentity> {
  return envelope<TeacherIdentity>(await fetch('/api/auth/me', { credentials: 'include', signal }))
}

export async function loadTeacherModelConfig(signal?: AbortSignal): Promise<TeacherModelConfig> {
  return envelope<TeacherModelConfig>(await fetch('/api/model-config', { credentials: 'include', signal }))
}
