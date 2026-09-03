// V3.2 · 头脑风暴落地：挂例题分组筛选+答案随题 / 课堂任务答案策略 / 公式画布 / 双框入库+AI识别知识点+树编辑 / 资源中心分类
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

/* ============ 共享 mock ============ */
const plansList = vi.fn()
const plansGet = vi.fn()
const classesFn = vi.fn()
const lessonTemplatesFn = vi.fn()
const deckTemplatesFn = vi.fn()
const quizQuestions = vi.fn()
const textbookChaptersFn = vi.fn()
const planOutlineFn = vi.fn()
const handRecognize = vi.fn()

vi.mock('@/api/teacherV3', () => ({
  v3Api: {
    plans: { list: (...a: unknown[]) => plansList(...a), get: (...a: unknown[]) => plansGet(...a) },
    catalog: {
      classes: (...a: unknown[]) => classesFn(...a),
      lessonTemplates: (...a: unknown[]) => lessonTemplatesFn(...a),
      deckTemplates: (...a: unknown[]) => deckTemplatesFn(...a),
      quizQuestions: (...a: unknown[]) => quizQuestions(...a),
      textbookChapters: (...a: unknown[]) => textbookChaptersFn(...a),
    },
    generation: { plan: vi.fn(), planOutline: (...a: unknown[]) => planOutlineFn(...a) },
    draw: { handRecognize: (...a: unknown[]) => handRecognize(...a) },
  },
}))

import PrepView from '@/pages/teacher-v3/PrepView.vue'
import MathKeyboard from '@/components/mathx/MathKeyboard.vue'

const CANDS = [
  { id: 'q1', kp_name: '椭圆标准方程', kp_code: 'YD-01', q_type: 'choice', difficulty: 'easy', stem_latex: '椭圆的焦点坐标', answer: 'A', analysis: 'c²=a²−b²', source: '校本' },
  { id: 'q2', kp_name: '椭圆标准方程', kp_code: 'YD-01', q_type: 'solve', difficulty: 'medium', stem_latex: '求椭圆标准方程', answer: '\\frac{y^2}{25}+\\frac{x^2}{16}=1', analysis: '焦轴判别', source: '自编' },
  { id: 'q3', kp_name: '导数与单调性', kp_code: 'DR-02', q_type: 'fill', difficulty: 'hard', stem_latex: '单调递增区间', answer: '(-1,1)', analysis: "f'(x)>0", source: '区库' },
]

const mkDetail = (id: string) => ({
  id, topic: `课题 ${id}`, class_id: 'c2-03', lesson_type: '新授课', template_id: 'lt-explorer',
  objectives: [], key_points: [], refs: [], board_design_note: '', homework_tiers: [],
  sections: [
    { id: 'bd-examples', name: '例题精讲', minutes: 14, teacher_activity: '讲例。', student_activity: '', design_intent: '', examples: [] },
  ],
})

function mountPrep() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }] })
  return mount(PrepView, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  plansList.mockResolvedValue({ data: { items: [{ id: 'plan-a', topic: '课题 plan-a', class_id: 'c2-03', lesson_type: '新授课', section_count: 1, confirmed: false, updated_at: '2026-09-03' }] } })
  plansGet.mockResolvedValue({ data: mkDetail('plan-a') })
  classesFn.mockResolvedValue({ data: { items: [{ class_id: 'c2-03', name: '高二(3)班' }] } })
  lessonTemplatesFn.mockResolvedValue({ data: { items: [] } })
  deckTemplatesFn.mockResolvedValue({ data: { items: [] } })
  quizQuestions.mockResolvedValue({ data: { items: CANDS, total: 3 } })
  textbookChaptersFn.mockResolvedValue({ data: { textbooks: [] } })
  planOutlineFn.mockResolvedValue({ data: { topic: 't', duration: 45, total_minutes: 45, sections: [], notes: [] } })
})

describe('V3.2 · 挂例题：分组 + 筛选 + 答案随题', () => {
  async function openPicker() {
    const w = mountPrep()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()
    await w.find('[data-testid="tv3-sec-example-0"]').trigger('click')
    await flushPromises()
    return w
  }

  it('候选题按知识点分组展示，不再全部堆在一起', async () => {
    const w = await openPicker()
    expect(w.find('[data-testid="tv3-example-group-椭圆标准方程"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-example-group-导数与单调性"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-example-count"]').text()).toContain('3 道可挂')
  })

  it('按知识点筛选 → 只剩该组；答案与解析可预览', async () => {
    const w = await openPicker()
    await w.find('[data-testid="tv3-example-filter-kp"]').setValue('导数与单调性')
    expect(w.find('[data-testid="tv3-example-count"]').text()).toContain('1 道可挂')
    expect(w.find('[data-testid="tv3-example-cand-q3"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-example-cand-q1"]').exists()).toBe(false)

    // 答案预览（不触发挂题）
    await w.find('[data-testid="tv3-example-cand-q3"] button').trigger('click')
    expect(w.find('[data-testid="tv3-example-cand-answer-q3"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-example-cand-answer-q3"]').text()).toContain('(-1,1)')
    expect(w.find('[data-testid="tv3-example-cand-answer-q3"]').text()).toContain("f'(x)>0")
  })

  it('挂入后答案随题：含答案 ✓ 可关；看答案展开显示题库答案与解析', async () => {
    const w = await openPicker()
    await w.find('[data-testid="tv3-example-cand-q1"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-examples-0"]').exists()).toBe(true)

    // 默认含答案
    const toggle = w.find('[data-testid="tv3-example-ans-toggle-0-0"]')
    expect(toggle.text()).toContain('含答案')
    await toggle.trigger('click')
    expect(w.find('[data-testid="tv3-example-ans-toggle-0-0"]').text()).toContain('不含答案')

    // 看答案：显示题库带来的 answer + analysis
    await w.find('[data-testid="tv3-example-ans-view-0-0"]').trigger('click')
    const box = w.find('[data-testid="tv3-example-answer-0-0"]')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('c²=a²−b²')
  })
})

describe('V3.2 · 课堂任务答案策略（推送弹层）', () => {
  it('推送弹层有三档答案策略 + 手写参考答案上传入口', async () => {
    const w = mountPrep()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()
    // 编辑器内确认全部板块 → 出现「推送课件 →」
    await w.find('[data-testid="tv3-sec-confirm-0"]').trigger('click')
    await w.find('[data-testid="tv3-plan-push"]').trigger('click')
    await flushPromises()

    const policy = w.find('[data-testid="tv3-push-ans-policy"]')
    expect(policy.exists()).toBe(true)
    expect(w.find('[data-testid="tv3-push-ans-teacher"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-push-ans-submit"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-push-ans-manual"]').exists()).toBe(true)
    // 手写参考答案上传入口：选文件后出缩略图
    const input = w.find('[data-testid="tv3-push-ans-input"]')
    Object.defineProperty(input.element, 'files', { value: [{ name: '手写答案.png' }] })
    vi.spyOn(window, 'FileReader').mockImplementation(() => {
      const fake: any = { readAsDataURL: () => Promise.resolve().then(() => fake.onload?.()), result: 'data:image/png;base64,AAA' }
      return fake
    })
    await input.trigger('change')
    await flushPromises()
    expect(w.find('[data-testid="tv3-push-ans-thumb"]').exists()).toBe(true)
    vi.restoreAllMocks()
  })
})

describe('V3.2 · 公式画布（键盘/画布可选）', () => {
  it('切「✍ 画布」→ 手写板出现；识别走 handRecognize；插入 emit latex', async () => {
    handRecognize.mockImplementation((_body: unknown, onEvent: (e: string, d: any) => void) => {
      onEvent('meta', { strokes: 2 })
      onEvent('recognizing', { stage: '笔迹分割 → 符号分类 → LaTeX 组装' })
      onEvent('result', { latex: '\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1', confidence: 0.91 })
      onEvent('done', {})
      return { abort: () => {} }
    })
    const w = mount(MathKeyboard, { props: { smartFor: 'conic' } })
    // 默认是键盘模式
    expect(w.find('[data-testid="mx-kbd-canvas"]').exists()).toBe(false)
    await w.find('[data-testid="mx-kbd-canvas-tab"]').trigger('click')
    expect(w.find('[data-testid="mx-kbd-canvas"]').exists()).toBe(true)
    expect(w.find('[data-testid="mx-kbd-pad"]').exists()).toBe(true)

    // 真实 pointer 事件写两笔（jsdom 下 setPointerCapture 走可选链兜底）
    const pad = () => w.find('[data-testid="mx-kbd-pad"]')
    await pad().trigger('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 })
    await pad().trigger('pointermove', { clientX: 30, clientY: 30 })
    await pad().trigger('pointerup', {})
    await pad().trigger('pointerdown', { button: 0, clientX: 40, clientY: 20, pointerId: 1 })
    await pad().trigger('pointermove', { clientX: 60, clientY: 40 })
    await pad().trigger('pointerup', {})
    await w.find('[data-testid="mx-kbd-recognize"]').trigger('click')
    await flushPromises()
    expect(handRecognize).toHaveBeenCalled()
    expect(w.find('[data-testid="mx-kbd-result"]').exists()).toBe(true)

    // 插入 → emit insert 携带识别 latex
    await w.find('[data-testid="mx-kbd-insert"]').trigger('click')
    const emitted = w.emitted('insert')!
    expect(emitted.length).toBeGreaterThan(0)
    expect((emitted.at(-1)![0] as { latex: string }).latex).toBe('\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1')
  })
})
