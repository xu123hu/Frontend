import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  revokeSession: vi.fn().mockResolvedValue({ revoked: true }),
  approve: vi.fn().mockResolvedValue({ status: 'approved' }),
}))

vi.mock('@/api/auth', () => ({
  securityApi: { revokeSession: apiMocks.revokeSession },
  adminIdentityApi: { approve: apiMocks.approve },
}))

import AccountSecurity from '@/pages/AccountSecurity.vue'
import AdminIdentityReview from '@/pages/admin/AdminIdentityReview.vue'

describe('account security and identity administration', () => {
  it('revokes a selected device session', async () => {
    const wrapper = mount(AccountSecurity, {
      props: { initialSessions: [{ id: 's1', device_name: 'Chrome · Windows', current: false, revoked: false }] },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await wrapper.get('[data-action="revoke-session"]').trigger('click')
    expect(apiMocks.revokeSession).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('已撤销')
  })

  it('filters pending applications and sends recent re-auth on approval', async () => {
    const wrapper = mount(AdminIdentityReview, {
      props: {
        initialApplications: [{ id: 'a1', role: 'teacher', status: 'pending', organization_name: '示例中学' }],
        initialReauthProof: 'recent-proof',
      },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await wrapper.get('[data-action="approve"]').trigger('click')
    expect(apiMocks.approve).toHaveBeenCalledWith('a1', expect.any(String), expect.any(String))
    expect(wrapper.text()).toContain('已通过')
  })
})
