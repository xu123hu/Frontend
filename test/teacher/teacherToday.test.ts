import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { authStore, todayStore } = vi.hoisted(() => ({
  authStore: { user: null as null | { nickname?: string | null } },
  todayStore: {
    data: {
      next_lesson: null,
      grading_queue: { count: 0, action: 'open_grading' },
      deadlines: [],
      actionable_insights: [],
      degraded: false,
    } as any,
    loading: false,
    error: null,
    fetch: vi.fn(),
  },
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: () => authStore }))
vi.mock('@/stores/teacher/today', () => ({ useTeacherTodayStore: () => todayStore }))
vi.mock('@/stores/teacher/context', () => ({
  useTeacherContextStore: () => ({ setClass: vi.fn() }),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import TeacherTodayView from '@/pages/teacher/TeacherTodayView.vue'

describe('TeacherTodayView teacher-facing language', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.user = null
    todayStore.data.actionable_insights = []
  })

  it.each([
    ['李老师', '李老师'],
    ['李', '李老师'],
    [undefined, '老师'],
  ])('normalizes nickname %s without an undefined or repeated suffix', (nickname, expected) => {
    authStore.user = nickname === undefined ? null : { nickname }
    const wrapper = mount(TeacherTodayView)
    const heading = wrapper.get('.t-hello h1').text()
    expect(heading).toMatch(new RegExp(`，${expected}$`))
    expect(heading).not.toContain('老师老师')
    expect(heading).not.toContain('undefined')
  })

  it('renders human-readable backend evidence unchanged and hides legacy key=value diagnostics', () => {
    todayStore.data.actionable_insights = [
      {
        insight_id: 'human', kind: 'mastery_drop', summary: '掌握度变化',
        evidence: '近 7 天 23 次作答，正确率为 74%。',
        data_window: { from: '2026-08-15', to: '2026-08-22' }, recommended_actions: [],
      },
      {
        insight_id: 'legacy', kind: 'mastery_drop', summary: '旧格式证据',
        evidence: 'sample_size=23; correct_rate=0.74',
        data_window: { from: '2026-08-15', to: '2026-08-22' }, recommended_actions: [],
      },
    ]
    const wrapper = mount(TeacherTodayView)
    expect(wrapper.text()).toContain('近 7 天 23 次作答，正确率为 74%。')
    expect(wrapper.text()).not.toContain('sample_size=23')
    expect(wrapper.text()).not.toContain('correct_rate=0.74')
  })
})
