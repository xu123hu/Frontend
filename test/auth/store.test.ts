import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const authMocks = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  switchRole: vi.fn(),
}))

vi.mock('@/api/auth', () => ({ authApi: authMocks }))

import { useAuthStore } from '@/stores/auth'

describe('auth bootstrap state machine', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('restores a cold session and filters roles to approved bindings', async () => {
    authMocks.refreshSession.mockResolvedValue({ access_token: 'fresh' })
    authMocks.me.mockResolvedValue({
      id: 'u1',
      nickname: '小数',
      active_role: 'student',
      onboarding_status: 'completed',
      status: 'active',
      roles: [
        { role: 'student', status: 'approved' },
        { role: 'teacher', status: 'pending' },
      ],
    })
    const store = useAuthStore()

    await store.bootstrap()

    expect(store.status).toBe('authenticated')
    expect(store.roles).toEqual(['student'])
    expect(store.pendingRoles).toEqual(['teacher'])
    expect(store.isLoggedIn).toBe(true)
  })

  it('becomes anonymous when no refresh session exists', async () => {
    authMocks.refreshSession.mockRejectedValue(new Error('no cookie'))
    const store = useAuthStore()

    await store.bootstrap()

    expect(store.status).toBe('anonymous')
    expect(store.user).toBeNull()
  })
})
