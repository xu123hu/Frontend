import { describe, it, expect } from 'vitest'
import {
  resolveMockUser,
  isPreviewToken,
  MOCK_TOKEN_ADMIN,
  MOCK_TOKEN_RESEARCHER,
  MOCK_TOKEN_STUDENT,
  MOCK_TOKEN_TEACHER,
  resolveMockStartupIdentity,
} from '@/config/mockIdentity'
import { mockApi } from '@/mock/server'

function requestMock({ method, url, body = {}, headers = {} }: {
  method: string
  url: string
  body?: Record<string, unknown>
  headers?: Record<string, string>
}) {
  return new Promise<{ data: Record<string, any>; headers: Record<string, string | string[]> }>((resolve, reject) => {
    const listeners: Record<string, ((value?: string) => void) | undefined> = {}
    const req = {
      method,
      url,
      headers,
      on(event: string, listener: (value?: string) => void) { listeners[event] = listener },
    }
    const responseHeaders: Record<string, string | string[]> = {}
    const res = {
      statusCode: 200,
      setHeader(name: string, value: string | string[]) { responseHeaders[name] = value },
      end(raw: string) { resolve({ data: JSON.parse(raw).data, headers: responseHeaders }) },
    }
    mockApi(req, res, () => reject(new Error('mock unexpectedly delegated')))
    setTimeout(() => {
      listeners.data?.(JSON.stringify(body))
      listeners.end?.()
    })
  })
}

describe('mock identity preview', () => {
  it('never presets a teacher identity for student role', () => {
    expect(resolveMockUser('student').active_role).toBe('student')
  })
  it('presets teacher identity for teacher role', () => {
    const u = resolveMockUser('teacher')
    expect(u.active_role).toBe('teacher')
    expect(u.roles[0].role).toBe('teacher')
  })
  it('presets every professional preview as its requested identity', () => {
    for (const role of ['teacher', 'researcher', 'admin']) {
      const user = resolveMockUser(role)
      expect(user.active_role).toBe(role)
      expect(user.roles[0].role).toBe(role)
    }
  })
  it('recognizes preview tokens to be cleaned in real mode', () => {
    expect(isPreviewToken(MOCK_TOKEN_TEACHER)).toBe(true)
    expect(isPreviewToken(MOCK_TOKEN_STUDENT)).toBe(true)
    expect(isPreviewToken(MOCK_TOKEN_RESEARCHER)).toBe(true)
    expect(isPreviewToken(MOCK_TOKEN_ADMIN)).toBe(true)
    expect(isPreviewToken('real-jwt')).toBe(false)
  })
  it('preserves a pending teacher target through mock session reload', async () => {
    const login = await requestMock({
      method: 'POST',
      url: '/auth/login/sms',
      headers: { cookie: 'ma_mock_state=pending' },
      body: { preferred_role: 'teacher' },
    })
    const cookies = (login.headers['Set-Cookie'] as string[]).map((cookie) => cookie.split(';')[0]).join('; ')

    const reload = await requestMock({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookies, authorization: `Bearer ${login.data.access_token}` },
    })

    expect(login.data).toMatchObject({ identity_status: 'pending_review', pending_role: 'teacher' })
    expect(reload.data).toMatchObject({ identity_status: 'pending_review', pending_role: 'teacher', active_role: 'student' })
  })
  it('keeps a pending teacher startup state when stale student storage is present', () => {
    expect(resolveMockStartupIdentity(
      'student',
      'ma_mock_role=teacher; ma_mock_state=pending',
      JSON.stringify({ active_role: 'student' }),
    )).toMatchObject({ role: 'teacher', state: 'pending', activeRole: 'student' })
  })
  it('restores pending teacher startup state from persisted identity without cookies', () => {
    expect(resolveMockStartupIdentity(
      'student',
      '',
      JSON.stringify({ active_role: 'student', pending_role: 'teacher', identity_status: 'pending_review' }),
    )).toMatchObject({ role: 'teacher', state: 'pending', activeRole: 'student' })
  })
})
