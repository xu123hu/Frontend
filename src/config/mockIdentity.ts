/** 仅 VITE_USE_MOCK=1 时使用的本地预览身份；默认真实 API 模式绝不预置 mock 身份 */
export const MOCK_TOKEN_STUDENT = 'mock-token-preview'
export const MOCK_TOKEN_TEACHER = 'mock-token-teacher-preview'
export const MOCK_TOKEN_RESEARCHER = 'mock-token-researcher-preview'
export const MOCK_TOKEN_ADMIN = 'mock-token-admin-preview'

type MockRole = 'student' | 'teacher' | 'researcher' | 'admin'

type MockUser = { nickname: string; roles: { role: MockRole }[]; active_role: MockRole; grade: string }

const previewUsers: Record<MockRole, MockUser> = {
  student: { nickname: '小婷', roles: [{ role: 'student' }], active_role: 'student', grade: '高二（3）班' },
  teacher: { nickname: '王老师', roles: [{ role: 'teacher' }], active_role: 'teacher', grade: '' },
  researcher: { nickname: '陈研究员', roles: [{ role: 'researcher' }], active_role: 'researcher', grade: '' },
  admin: { nickname: '管理员', roles: [{ role: 'admin' }], active_role: 'admin', grade: '' },
}

export function resolveMockUser(mockRole: string): MockUser {
  if (mockRole in previewUsers) {
    return previewUsers[mockRole as MockRole]
  }
  return previewUsers.student
}

export function isPreviewToken(token: string | null): boolean {
  return [MOCK_TOKEN_STUDENT, MOCK_TOKEN_TEACHER, MOCK_TOKEN_RESEARCHER, MOCK_TOKEN_ADMIN].includes(token || '')
}
