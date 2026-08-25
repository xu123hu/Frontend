import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { authStore, todayStore } = vi.hoisted(() => ({
  authStore: { nickname: null as string | null },
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

describe('TeacherTodayView 教师面向前端语言', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.nickname = null
    todayStore.data.actionable_insights = []
  })

  it.each([
    ['李老师', '李老师'],
    ['李', '李老师'],
    [undefined, '老师'],
  ])('昵称 %s 规范化为 %s，无重复后缀或 undefined', (nickname, expected) => {
    authStore.nickname = nickname as string | null
    const wrapper = mount(TeacherTodayView, { global: { stubs: { ButlerPanel: true } } })
    const heading = wrapper.get('.t-today-head h1').text()
    expect(heading).toMatch(new RegExp(`，${expected}$`))
    expect(heading).not.toContain('老师老师')
    expect(heading).not.toContain('undefined')
  })

  it('人类可读证据原样展示，旧式 key=value 诊断被隐藏', () => {
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
    const wrapper = mount(TeacherTodayView, { global: { stubs: { ButlerPanel: true } } })
    expect(wrapper.text()).toContain('近 7 天 23 次作答，正确率为 74%。')
    expect(wrapper.text()).not.toContain('sample_size=23')
    expect(wrapper.text()).not.toContain('correct_rate=0.74')
  })
})
