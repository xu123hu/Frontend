import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

const gradingStore = reactive({
  error: null as string | null,
  loading: false,
  confirming: false,
  queue: [] as any[],
  detail: null as any,
  fetchQueue: vi.fn().mockResolvedValue(undefined),
  fetchItem: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(undefined),
})
const contextStore = reactive({ classId: null as string | null })

vi.mock('@/stores/teacher/grading', () => ({ useGradingStore: () => gradingStore }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/api/client', () => ({ authHeaders: () => ({}) }))

import TeacherGradingView from '@/pages/teacher/TeacherGradingView.vue'

function detail(context: Record<string, unknown>) {
  return {
    submission_item_id: 'item-1',
    student_label: '作答 #001',
    status: 'unprocessed',
    confidence: 1,
    suggestion_score: 1,
    teacher_final_score: null,
    original_answer: 'B',
    scoring_standard: '按题目评分点逐项给分',
    suggestion: {
      suggestion_id: 'suggestion-1',
      suggestion_score: 1,
      confidence: 1,
      evidence: '客观题按标准答案判定',
      review_needed: false,
      teacher_feedback: null,
    },
    ...context,
  }
}

beforeEach(() => {
  gradingStore.error = null
  gradingStore.loading = false
  gradingStore.confirming = false
  gradingStore.queue = [{ submission_item_id: 'item-1', student_label: '作答 #001', status: 'unprocessed' }]
  gradingStore.detail = null
  gradingStore.fetchQueue.mockClear()
  gradingStore.fetchItem.mockClear()
})

describe('TeacherGradingView question context', () => {
  it('shows the persisted assignment, question, options, answer and analysis to the teacher', async () => {
    gradingStore.detail = detail({
      assignment_title: '二次函数随堂作业',
      question_text: '函数 f(x)=x² 的最小值是？',
      question_type: 'choice',
      options: { A: '-1', B: '0', C: '1' },
      standard_answer: 'B',
      answer_analysis: '因为 x² ≥ 0，所以最小值为 0。',
    })
    const wrapper = mount(TeacherGradingView)
    await nextTick()

    expect(wrapper.text()).toContain('二次函数随堂作业')
    expect(wrapper.text()).toContain('函数 f(x)=x² 的最小值是？')
    expect(wrapper.text()).toContain('A. -1')
    expect(wrapper.text()).toContain('标准答案（仅教师可见）')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).toContain('因为 x² ≥ 0，所以最小值为 0。')
  })

  it('keeps the assignment title visible when persisted question context is unavailable', async () => {
    gradingStore.detail = detail({
      assignment_title: '二次函数随堂作业',
      question_text: null,
      question_type: null,
      options: null,
      standard_answer: null,
      answer_analysis: null,
    })
    const wrapper = mount(TeacherGradingView)
    await nextTick()

    expect(wrapper.text()).toContain('二次函数随堂作业')
    expect(wrapper.text()).toContain('题目上下文缺失，请人工复核。')
  })
})
