import { describe, it, expect } from 'vitest'
import {
  resolveMockUser,
  isPreviewToken,
  MOCK_TOKEN_ADMIN,
  MOCK_TOKEN_RESEARCHER,
  MOCK_TOKEN_STUDENT,
  MOCK_TOKEN_TEACHER,
} from '@/config/mockIdentity'

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
})
