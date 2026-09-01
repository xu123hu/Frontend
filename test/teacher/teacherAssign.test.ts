import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const routeState = vi.hoisted(() => ({ query: {} as Record<string, unknown> }))
const { classApi, assignmentsApi, artifactsApi, assessmentStore, contextStore } = vi.hoisted(() => ({
  classApi: { mine: vi.fn() },
  assignmentsApi: { list: vi.fn() },
  artifactsApi: { confirm: vi.fn() },
  assessmentStore: {
    error: null as string | null,
    generating: false,
    quizArtifact: null as any,
    assignment: null as any,
    clear: vi.fn(),
    generateQuiz: vi.fn(),
    createAssignment: vi.fn(),
    publish: vi.fn(),
  },
  contextStore: { classId: null as string | null, className: null as string | null, setClass: vi.fn() },
}))

vi.mock('@/api', () => ({ classApi }))
vi.mock('@/api/teacher/artifacts', () => ({ artifactsApi }))
vi.mock('@/api/teacher/assignments', () => ({ assignmentsApi }))
vi.mock('@/stores/teacher/assessment', () => ({ useAssessmentStore: () => assessmentStore }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('vue-router', () => ({ useRoute: () => routeState }))

import TeacherAssignView from '@/pages/teacher/TeacherAssignView.vue'

const ownedClass = { id: 'class-3', name: '高二（3）班', myRole: 'teacher', confirmed: true }

function quizItem(itemNo: number) {
  return { item_no: itemNo, q_type: 'choice', difficulty: 'medium', question_text: `已知函数 f(x)=x³−3x，求单调区间（第${itemNo}题）`, source: 'GAOKAO 2017', source_ref: '2017·全国卷Ⅱ', answer_analysis: 'f′(x)=3x²−3' }
}

function numberInputs(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('input[type="number"]')
}

describe('TeacherAssignView blueprint prefill and honest swap degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.query = {}
    assessmentStore.quizArtifact = null
    assessmentStore.assignment = null
    assessmentStore.error = null
    contextStore.classId = null
    classApi.mine.mockResolvedValue({ items: [ownedClass] })
    assignmentsApi.list.mockResolvedValue([])
  })

  it('prefills builder form from the lesson blueprint query (GP-6)', async () => {
    routeState.query = { topic: '导数与函数单调性 随堂检测', kp_codes: 'DERIV-BOUNDARY, DERIV-SIGN', count: '6', source: 'lesson:les-1' }
    const wrapper = mount(TeacherAssignView)
    await flushPromises()
    const titleInput = wrapper.find('input[placeholder^="例如：函数单调性"]')
    expect((titleInput.element as HTMLInputElement).value).toBe('导数与函数单调性 随堂检测')
    const kpArea = wrapper.find('textarea')
    expect((kpArea.element as HTMLTextAreaElement).value).toBe('DERIV-BOUNDARY、DERIV-SIGN')
    const [count, choice, blank, text] = numberInputs(wrapper)
    expect((count.element as HTMLInputElement).value).toBe('6')
    expect((choice.element as HTMLInputElement).value).toBe('3')
    expect((blank.element as HTMLInputElement).value).toBe('2')
    expect((text.element as HTMLInputElement).value).toBe('1')
    expect(wrapper.text()).toContain('已按上课蓝图预填组卷条件')
  })

  it('keeps default form values when no blueprint query is present', async () => {
    const wrapper = mount(TeacherAssignView)
    await flushPromises()
    const titleInput = wrapper.find('input[placeholder^="例如：函数单调性"]')
    expect((titleInput.element as HTMLInputElement).value).toBe('高中数学练习')
    const [count, choice, blank, text] = numberInputs(wrapper)
    expect((count.element as HTMLInputElement).value).toBe('8')
    expect((choice.element as HTMLInputElement).value).toBe('4')
    expect((blank.element as HTMLInputElement).value).toBe('2')
    expect((text.element as HTMLInputElement).value).toBe('2')
    expect(wrapper.text()).not.toContain('已按上课蓝图预填组卷条件')
  })

  it('loads classes through classApi and remembers the teacher context class', async () => {
    contextStore.classId = 'class-3'
    const wrapper = mount(TeacherAssignView)
    await flushPromises()
    expect(classApi.mine).toHaveBeenCalledTimes(1)
    expect(contextStore.setClass).toHaveBeenCalledWith('class-3', '高二（3）班')
    expect(wrapper.text()).toContain('高二（3）班')
  })

  it('disables per-question swap with an explicit pending-contract hint (honest degradation)', async () => {
    assessmentStore.quizArtifact = { artifact_id: 'art-1', status: 'draft', degraded: false, content: { items: [quizItem(1), quizItem(2)] } }
    const wrapper = mount(TeacherAssignView)
    await flushPromises()
    const hint = wrapper.get('[data-testid="swap-pending"]')
    expect(hint.text()).toContain('已提请后端契约')
    const swapButtons = wrapper.findAll('button').filter((button) => button.text() === '换一题')
    expect(swapButtons.length).toBe(2)
    for (const button of swapButtons) expect(button.attributes('disabled')).toBeDefined()
  })
})
