import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const { gradingWorkspaceApi, gradingApi, routeState, router } = vi.hoisted(() => ({
  gradingWorkspaceApi: { get: vi.fn(), confirm: vi.fn(), review: vi.fn(), file: vi.fn() },
  gradingApi: { insights: vi.fn() },
  routeState: { query: {} as Record<string, unknown> },
  router: { push: vi.fn(), replace: vi.fn() },
}))

vi.mock('@/api/teacher/gradingWorkspace', () => ({ gradingWorkspaceApi }))
vi.mock('@/api/teacher/grading', () => ({ gradingApi }))
vi.mock('vue-router', () => ({ useRoute: () => routeState, useRouter: () => router }))

import TeacherGradingV2View from '@/pages/teacher-v2/TeacherGradingV2View.vue'

const emptyWorkspace = {
  data: {
    context: { class: null, assignment: null, question: null, filters: { status: 'all' }, progress: { total: 0, confirmed: 0, remaining: 0 } },
    available_context: { assignments: [], questions: [] },
    queue: [],
    selected: null,
    navigation: { previous_id: null, next_ungraded_id: null },
  },
}

describe('TeacherGradingV2View 批后讲评面板（GP-11 / TC-L4-F07）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    routeState.query = {}
    gradingWorkspaceApi.get.mockResolvedValue(emptyWorkspace)
    gradingWorkspaceApi.file.mockRejectedValue(new Error('no file'))
  })

  it('insights 可用时渲染"最值得讲的题"与错数/正确率，动作落点真实', async () => {
    routeState.query = { class_id: 'c1' }
    gradingApi.insights.mockResolvedValue({
      assignment_id: 'asg-1', title: '《导数周测》', review_rate: 19,
      top_questions: [
        { item_no: 4, question_text: '讨论 f(x)=ln x−ax 的单调性（a=0 边界分类）', wrong_count: 17, correct_ratio: 63 },
      ],
    })
    const wrapper = mount(TeacherGradingV2View)
    await flushPromises()
    expect(wrapper.text()).toContain('本次作业最值得讲的 1 题')
    expect(wrapper.text()).toContain('17 人错')
    expect(wrapper.text()).toContain('正确率 63%')
    const link = wrapper.get('.grading-v2__review-link')
    expect(link.text()).toContain('加入明天讲评')
  })

  it('insights 404/失败时面板静默隐藏，不阻塞批改工作台', async () => {
    routeState.query = { class_id: 'c1' }
    gradingApi.insights.mockRejectedValue(new Error('insights_unavailable'))
    const wrapper = mount(TeacherGradingV2View)
    await flushPromises()
    expect(wrapper.text()).not.toContain('本次作业最值得讲的')
    expect(wrapper.text()).toContain('当前没有可批改作答')
  })
})
