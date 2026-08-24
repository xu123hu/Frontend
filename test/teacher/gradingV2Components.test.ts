import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount } from '@vue/test-utils'
import TeacherGradingV2View from '@/pages/teacher-v2/TeacherGradingV2View.vue'
import { toGradingWorkspace } from '@/features/teacher-grading-v2/gradingWorkspaceAdapter'
import { useGradingWorkspaceStore } from '@/stores/teacher/gradingWorkspace'
import { serverWorkspaceFixture } from './fixtures/gradingWorkspace'

async function mountWorkspace() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/teacher/grading', component: { template: '<div />' } }],
  })
  await router.push('/teacher/grading?submission_item_id=si-2')
  await router.isReady()
  const store = useGradingWorkspaceStore()
  store.workspace = toGradingWorkspace(serverWorkspaceFixture)
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
    expect(wrapper.find('[data-grading-region="queue"]').text()).toContain('作答 #002')
    expect(wrapper.find('[data-grading-region="work"]').text()).toContain('f′(x)=3x²−3')
    expect(wrapper.find('[data-grading-region="rubric"]').text()).toContain('正确求导')
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
})
