import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ query: {} }),
  RouterLink: { template: '<a><slot /></a>' },
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    challengeSms: vi.fn(),
    currentRoleApplications: vi.fn().mockResolvedValue([]),
    submitRoleApplication: vi.fn(),
    onboardStudent: vi.fn(),
  },
}))

import PhoneField from '@/components/auth/PhoneField.vue'
import Login from '@/pages/Login.vue'
import PendingReview from '@/pages/PendingReview.vue'
import RoleApplication from '@/pages/RoleApplication.vue'

describe('unified authentication pages', () => {
  it('normalizes +86 phone input and exposes an accessible label', async () => {
    const wrapper = mount(PhoneField, { props: { modelValue: '' } })
    const input = wrapper.get('input')
    await input.setValue('+86 138-0000-0000')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['13800000000'])
    expect(input.attributes('aria-label')).toBe('手机号')
  })

  it('offers SMS and password login without a privileged-role selector', async () => {
    const wrapper = mount(Login, {
      global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(wrapper.get('[role="tablist"]').text()).toContain('短信验证码')
    expect(wrapper.get('[role="tablist"]').text()).toContain('密码登录')
    expect(wrapper.text()).toContain('注册新账号')
    expect(wrapper.text()).not.toContain('选择教师身份')
    expect(wrapper.find('select[name="role"]').exists()).toBe(false)
  })

  it('shows role-specific application fields and a clear pending state', async () => {
    const wrapper = mount(RoleApplication, { global: { plugins: [createPinia()] } })
    expect(wrapper.find('[name="teaching_stage"]').exists()).toBe(true)
    await wrapper.get('[name="role"]').setValue('researcher')
    expect(wrapper.find('[name="research_direction"]').exists()).toBe(true)

    const pending = mount(PendingReview, {
      props: { initialApplications: [{ id: 'a1', role: 'teacher', status: 'pending' }] },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    expect(pending.text()).toContain('审核中')
    expect(pending.text()).toContain('教师')
  })
})
