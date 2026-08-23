/** 仅 VITE_USE_MOCK=1 时使用的本地预览身份；默认真实 API 模式绝不预置 mock 身份 */
export const MOCK_TOKEN_STUDENT = 'mock-token-preview'
export const MOCK_TOKEN_TEACHER = 'mock-token-teacher-preview'

export function resolveMockUser(mockRole: string): { nickname: string; roles: { role: string }[]; active_role: string; grade: string } {
  if (mockRole === 'teacher') {
    return { nickname: '李老师', roles: [{ role: 'teacher' }], active_role: 'teacher', grade: '' }
  }
  return { nickname: '小婷', roles: [{ role: 'student' }], active_role: 'student', grade: '高二（3）班' }
}

export function isPreviewToken(token: string | null): boolean {
  return token === MOCK_TOKEN_STUDENT || token === MOCK_TOKEN_TEACHER
}