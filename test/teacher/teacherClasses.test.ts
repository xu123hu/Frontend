import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const { classApi, classesApi, contextStore, router } = vi.hoisted(() => ({
  classApi: { mine: vi.fn(), members: vi.fn() },
  classesApi: { insights: vi.fn() },
  contextStore: { classId: null as string | null, setClass: vi.fn() },
  router: { push: vi.fn() },
}))

vi.mock('@/api', () => ({ classApi }))
vi.mock('@/api/teacher/classes', () => ({ classesApi }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('vue-router', () => ({ useRouter: () => router }))

import TeacherClassesView from '@/pages/teacher/TeacherClassesView.vue'

const ownedClass = { id: 'class-a', name: '高二（1）班', myRole: 'teacher', confirmed: true, inviteCode: 'MATH26' }
const assistingClass = { id: 'class-b', name: '高二（2）班', myRole: 'teacher', confirmed: true }

function member(userId: string, nicknameInClass: string, nickname: string) {
  return { userId, nicknameInClass, nickname, memberRole: 'student', confirmed: true }
}

describe('TeacherClassesView class-scoped context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contextStore.classId = null
    classApi.mine.mockResolvedValue({ items: [ownedClass, assistingClass] })
    classApi.members.mockResolvedValue({ items: [] })
    classesApi.insights.mockResolvedValue([])
  })

  it('shows the authorized owner invite code with a copy action and hides it when the response has no code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const wrapper = mount(TeacherClassesView)
    await flushPromises()
    expect(wrapper.get('[data-testid="class-invite-code"]').text()).toContain('MATH26')
    await wrapper.get('[aria-label="复制班级邀请码 MATH26"]').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('MATH26')
    expect(wrapper.text()).toContain('邀请码已复制')

    await wrapper.get('select').setValue('class-b')
    await flushPromises()
    expect(wrapper.find('[data-testid="class-invite-code"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('MATH26')
  })

  it('renders class nickname before account nickname and uses a natural unnamed fallback', async () => {
    classApi.members.mockResolvedValue({ items: [
      member('student-a', '小陈', '陈同学'),
      member('student-b', '', '王同学'),
      member('student-c', '', ''),
    ] })
    const wrapper = mount(TeacherClassesView)
    await flushPromises()
    expect(wrapper.text()).toContain('小陈')
    expect(wrapper.text()).not.toContain('陈同学')
    expect(wrapper.text()).toContain('王同学')
    expect(wrapper.text()).toContain('未命名成员')
  })

  it('keeps the selected class authoritative when an older request resolves later', async () => {
    const membersA = deferred<any>()
    const insightsA = deferred<any>()
    const membersB = deferred<any>()
    const insightsB = deferred<any>()
    classApi.members.mockImplementation((classId: string) => classId === 'class-a' ? membersA.promise : membersB.promise)
    classesApi.insights.mockImplementation((classId: string) => classId === 'class-a' ? insightsA.promise : insightsB.promise)

    const wrapper = mount(TeacherClassesView)
    await flushPromises()
    await wrapper.get('select').setValue('class-b')
    membersB.resolve({ items: [member('student-b', 'B 班学生', '')] })
    insightsB.resolve([{ insight_id: 'b', kind: 'queue', summary: 'B 班洞察', evidence: 'B 班 5 份待确认。', data_window: { from: '', to: '' }, recommended_actions: [] }])
    await flushPromises()
    expect(wrapper.text()).toContain('B 班学生')
    expect(wrapper.text()).toContain('B 班洞察')

    membersA.resolve({ items: [member('student-a', 'A 班学生', '')] })
    insightsA.resolve([{ insight_id: 'a', kind: 'queue', summary: 'A 班洞察', evidence: 'A 班 8 份待确认。', data_window: { from: '', to: '' }, recommended_actions: [] }])
    await flushPromises()
    expect(wrapper.text()).toContain('B 班学生')
    expect(wrapper.text()).toContain('B 班洞察')
    expect(wrapper.text()).not.toContain('A 班学生')
    expect(wrapper.text()).not.toContain('A 班洞察')
  })

  it('clears old class content while the newly selected class is still loading', async () => {
    const pendingMembers = deferred<any>()
    const pendingInsights = deferred<any>()
    classApi.members.mockImplementation((classId: string) => classId === 'class-a'
      ? Promise.resolve({ items: [member('student-a', 'A 班学生', '')] })
      : pendingMembers.promise)
    classesApi.insights.mockImplementation((classId: string) => classId === 'class-a'
      ? Promise.resolve([{ insight_id: 'a', kind: 'queue', summary: 'A 班洞察', evidence: 'A 班证据。', data_window: { from: '', to: '' }, recommended_actions: [] }])
      : pendingInsights.promise)

    const wrapper = mount(TeacherClassesView)
    await flushPromises()
    expect(wrapper.text()).toContain('A 班学生')
    await wrapper.get('select').setValue('class-b')
    await flushPromises()
    expect(wrapper.text()).not.toContain('A 班学生')
    expect(wrapper.text()).not.toContain('A 班洞察')

    pendingMembers.resolve({ items: [] })
    pendingInsights.resolve([])
    await flushPromises()
  })

  it('renders human-readable evidence unchanged without exposing legacy key=value diagnostics', async () => {
    classesApi.insights.mockResolvedValue([
      { insight_id: 'human', kind: 'queue', summary: '待批提醒', evidence: '本班有 5 份低置信度作答需要确认。', data_window: { from: '', to: '' }, recommended_actions: [] },
      { insight_id: 'legacy', kind: 'queue', summary: '旧证据', evidence: 'pending_count=5; low_confidence=2', data_window: { from: '', to: '' }, recommended_actions: [] },
    ])
    const wrapper = mount(TeacherClassesView)
    await flushPromises()
    expect(wrapper.text()).toContain('本班有 5 份低置信度作答需要确认。')
    expect(wrapper.text()).not.toContain('pending_count=5')
    expect(wrapper.text()).not.toContain('low_confidence=2')
  })
})
