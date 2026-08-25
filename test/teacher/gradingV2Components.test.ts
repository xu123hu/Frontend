import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'
import TeacherGradingV2View from '@/pages/teacher-v2/TeacherGradingV2View.vue'
import { toGradingWorkspace } from '@/features/teacher-grading-v2/gradingWorkspaceAdapter'
import { useGradingWorkspaceStore } from '@/stores/teacher/gradingWorkspace'
import { serverWorkspaceFixture } from './fixtures/gradingWorkspace'

async function mountWorkspace(response: unknown = serverWorkspaceFixture) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teacher/grading', component: { template: '<div />' } }],
  })
  await router.push('/teacher/grading?submission_item_id=si-2')
  await router.isReady()
  const store = useGradingWorkspaceStore()
  store.workspace = toGradingWorkspace(response)
  store.selectionQuery = { classId: 'c1', assignmentId: 'a1', itemNo: 1, submissionItemId: 'si-2' }
  const confirmAndNext = vi.fn().mockResolvedValue(undefined)
  store.confirmAndNext = confirmAndNext as typeof store.confirmAndNext
  const wrapper = mount(TeacherGradingV2View, { global: { plugins: [pinia, router] } })
  return { wrapper, confirmAndNext }
}

afterEach(() => vi.restoreAllMocks())

describe('Teacher Grading V2 reconstruction', () => {
  it('renders context, anonymous queue, original work, rubric and actions together', async () => {
    const { wrapper } = await mountWorkspace()

    expect(wrapper.find('[data-grading-region="header"]').text()).toContain('函数的单调性')
    expect(wrapper.find('[data-grading-region="queue"]').text()).toContain('第 2 份作答')
    expect(wrapper.find('[data-grading-region="queue"]').text()).toContain('为保证公平，按本题作答顺序批改')
    expect(wrapper.find('[data-grading-region="queue"]').text()).toContain('人工复看')
    const visibleMath = wrapper.findAll('[data-grading-region="work"] .katex-html')
    expect(visibleMath.length).toBeGreaterThan(0)
    const visibleMathText = visibleMath.map((node) => node.text()).join(' ')
    expect(visibleMathText).toContain('x=±1')
    expect(visibleMathText).not.toContain('\\pm')
    expect(wrapper.find('[data-grading-region="rubric"]').text()).toContain('正确求导')
    expect(wrapper.get('#grading-final-score').attributes('max')).toBe('10')
    expect(wrapper.get('button[data-action="confirm-next"]').attributes('aria-label')).toBe('确认并下一份')
    expect(wrapper.find('select[data-legacy-student-select]').exists()).toBe(false)
  })

  it('does not confirm inside feedback input but confirms from action bar Enter', async () => {
    const { wrapper, confirmAndNext } = await mountWorkspace()

    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    expect(confirmAndNext).not.toHaveBeenCalled()
    await wrapper.get('[data-grading-action-bar]').trigger('keydown', { key: 'Enter' })
    expect(confirmAndNext).toHaveBeenCalledOnce()
  })

  it('renders bare high-school-math TeX as readable notation in every V2 evidence region', async () => {
    const response = structuredClone(serverWorkspaceFixture)
    response.data.context.question.question_text = '当 x=\\pm 1 时，比较 f′(x) 的符号。'
    response.data.selected.work.original_answer = '令 x=\\pm 1，区间为 (-\\infty,-1)\\cup(1,+\\infty)。'
    response.data.selected.scoring.standard_answer = '在 (-\\infty,-1)\\cup(1,+\\infty) 单调递增。'
    response.data.selected.suggestion.evidence = [{ kind: 'grading_evidence', text: '临界点应为 x=\\pm 1。' }]

    const { wrapper } = await mountWorkspace(response)
    const header = wrapper.find('[data-grading-region="header"]').text()
    const work = wrapper.find('[data-grading-region="work"]').text()
    const rubric = wrapper.find('[data-grading-region="rubric"]').text()

    expect(header).toContain('±')
    expect(work).toContain('∞')
    expect(rubric).toContain('∞')
    expect(header + work + rubric).not.toContain('\\pm')
    expect(header + work + rubric).not.toContain('\\infty')
    expect(header + work + rubric).not.toContain('\\cup')
  })
})
