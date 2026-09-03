// P3 · PrepView 十板块交互：反套话（去套话重写）+ 挂例题（挂入结构化例题）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

const plansList = vi.fn()
const plansGet = vi.fn()
const classesFn = vi.fn()
const lessonTemplatesFn = vi.fn()
const deckTemplatesFn = vi.fn()
const quizQuestions = vi.fn()
const photoToFormula = vi.fn()
const planPhotoDraft = vi.fn()
const textbookChaptersFn = vi.fn()
const planOutlineFn = vi.fn()
const tplImportFn = vi.fn()
const tplExtractFn = vi.fn()

vi.mock('@/api/teacherV3', () => ({
  v3Api: {
    plans: { list: (...a: unknown[]) => plansList(...a), get: (...a: unknown[]) => plansGet(...a) },
    catalog: {
      classes: (...a: unknown[]) => classesFn(...a),
      lessonTemplates: (...a: unknown[]) => lessonTemplatesFn(...a),
      deckTemplates: (...a: unknown[]) => deckTemplatesFn(...a),
      quizQuestions: (...a: unknown[]) => quizQuestions(...a),
      textbookChapters: (...a: unknown[]) => textbookChaptersFn(...a),
      planTemplatesImport: (...a: unknown[]) => tplImportFn(...a),
      planTemplatesExtract: (...a: unknown[]) => tplExtractFn(...a),
    },
    recognition: {
      photoToFormula: (...a: unknown[]) => photoToFormula(...a),
      planPhotoDraft: (...a: unknown[]) => planPhotoDraft(...a),
    },
    generation: { plan: vi.fn(), planOutline: (...a: unknown[]) => planOutlineFn(...a) },
  },
}))

import PrepView from '@/pages/teacher-v3/PrepView.vue'

const mkPlan = (id: string) => ({ id, topic: `课题 ${id}`, class_id: 'c2-03', lesson_type: '新授课', section_count: 10, confirmed: false, updated_at: '2026-09-01' })

const mkBoards = () => [
  { id: 'bd-objectives', name: '教学目标', minutes: 0, teacher_activity: '激发学生学习兴趣，培养学生分析问题与解决问题的能力。', student_activity: '体会知识的形成过程。', design_intent: '增强信心。', cliche: true, cliche_hits: ['激发'] },
  { id: 'bd-examples', name: '例题精讲', minutes: 14, teacher_activity: '讲例1：a=5、b=3 求椭圆方程。', student_activity: '', design_intent: '', examples: [] },
  { id: 'bd-summary', name: '课堂小结与检测', minutes: 3, teacher_activity: '梳理主线。', student_activity: '', design_intent: '' },
]

const mkDetail = (id: string) => ({
  id, topic: `课题 ${id}`, class_id: 'c2-03', lesson_type: '新授课', template_id: 'lt-explorer',
  objectives: [], key_points: [], sections: mkBoards(), board_design_note: '', homework_tiers: [], refs: [],
})

function mountPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }] })
  return mount(PrepView, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  plansList.mockResolvedValue({ data: { items: [mkPlan('plan-a')] } })
  plansGet.mockResolvedValue({ data: mkDetail('plan-a') })
  classesFn.mockResolvedValue({ data: { items: [{ class_id: 'c2-03', name: '高二(3)班' }] } })
  lessonTemplatesFn.mockResolvedValue({ data: { items: [{ id: 'lt-explorer', name: '探究式', style_tag: '', sections: [], recommended_for: '' }] } })
  deckTemplatesFn.mockResolvedValue({ data: { items: [] } })
  quizQuestions.mockResolvedValue({ data: { items: [{ id: 'q1', kp_name: '椭圆', kp_code: 'YD', q_type: 'solve', difficulty: 'easy', stem_latex: '挂题题干', answer: '略', source: '校本' }] } })
  planPhotoDraft.mockResolvedValue({
    data: { teacher_activity: '出示双曲线的教材图，提问学生已有认知。', student_activity: '观察并回顾已学定义。', design_intent: '激活前测，定位起点。' },
  })
  textbookChaptersFn.mockResolvedValue({ data: { textbooks: [{ name: '人教A版（2019）', chapters: [{ id: 'ch1', path: '选择性必修一 ▸ 圆锥曲线 ▸ 双曲线' }] }] } })
  planOutlineFn.mockResolvedValue({
    data: {
      topic: '双曲线及其标准方程（第1课时）', duration: 45, total_minutes: 45,
      sections: [
        { id: 'bd-intro', name: '情境引入', minutes: 4, goal: '用一个 90 秒情境引出问题。' },
        { id: 'bd-explore', name: '新知探究', minutes: 12, goal: '经历生成过程。' },
        { id: 'bd-examples', name: '例题精讲', minutes: 14, goal: '精讲主干方法。', example_suggestion: '题库检索：配 1 道基础例题（难度可调）' },
      ],
      notes: ['依据：人教A版（2019） · 选择性必修一 ▸ 圆锥曲线 ▸ 双曲线', '课型：新授课 · 一节课 45 分钟'],
    },
  })
  tplImportFn.mockResolvedValue({
    data: {
      reports: [
        { file: '公开课教案.docx', score: 86, board_coverage: ['教材分析', '学情分析', '教学目标', '重难点', '教学过程三栏', '板书设计'], missing_boards: ['教后反思'], cliche_hits: [], recommended: true, suggestion: '栏目齐全、套话率低' },
        { file: '往年教案.docx', score: 58, board_coverage: ['教学目标'], missing_boards: ['学情分析'], cliche_hits: ['空话'], recommended: false, suggestion: '不建议' },
      ],
    },
  })
  tplExtractFn.mockResolvedValue({
    data: { id: 'lt-mine-1', name: '我的模板 · 公开课教案', style_tag: '提炼', sections: [], recommended_for: '个人模板', sample_topic: '' },
  })
})

describe('PrepView · 反套话', () => {
  it('套话板块显示反套话横幅；点「一键去套话」重写为围绕课题的具体表述', async () => {
    const w = mountPage()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()

    expect(w.find('[data-testid="tv3-sec-cliche"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-cliche-0"]').exists()).toBe(true)

    await w.find('[data-testid="tv3-dejargon-0"]').trigger('click')
    await flushPromises()
    const activity = (w.find('[data-testid="tv3-sec-teacher-0"]').element as HTMLTextAreaElement).value
    expect(activity).toContain('课题 plan-a')
    expect(activity).not.toContain('激发学生学习兴趣')
    // 重写后实时去空话 → 横幅消失
    expect(w.find('[data-testid="tv3-cliche-0"]').exists()).toBe(false)
  })
})

describe('PrepView · 挂例题', () => {
  it('可挂例题板块显示「＋挂例题」；从题库挂入后展示结构化题 + 计数', async () => {
    const w = mountPage()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()

    // 例题精讲（index=1）可挂
    await w.find('[data-testid="tv3-sec-example-1"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-example-picker"]').exists()).toBe(true)

    await w.find('[data-testid="tv3-example-cand-q1"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-examples-1"]').exists()).toBe(true)
    expect(w.text()).toContain('已挂例题 1 道')
    expect(w.text()).toContain('挂题题干')
    expect(w.find('[data-testid="tv3-sec-example-1"]').text()).toContain('（1）')
  })
})

describe('PrepView · 板块拍照填充', () => {
  async function openEditorIn() {
    const w = mountPage()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()
    return w
  }
  it('板块卡片有「拍照填充」；用示例图 → 识别 → 填入三栏并锚定原图（R8）', async () => {
    const w = await openEditorIn()

    // 打开板块0（教学目标）的拍照填充
    await w.find('[data-testid="tv3-sec-photo-0"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-photo-fill-panel"]').exists()).toBe(true)

    // 用示例图 → 出现增强预览
    await w.find('[data-testid="tv3-photo-fill-sample"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-photo-fill-preview"]').exists()).toBe(true)

    // 识别 → 出现可编辑三栏草稿（R2）
    await w.find('[data-testid="tv3-photo-fill-run"]').trigger('click')
    await flushPromises()
    expect(planPhotoDraft).toHaveBeenCalled()
    expect(w.find('[data-testid="tv3-photo-fill-draft"]').exists()).toBe(true)

    // 填入 → 板块三栏已被识别草稿覆盖 + 原图锚定条出现
    await w.find('[data-testid="tv3-photo-fill-apply"]').trigger('click')
    await flushPromises()
    const ta = w.find('[data-testid="tv3-sec-teacher-0"]').element as HTMLTextAreaElement
    expect(ta.value).toContain('出示双曲线的教材图')
    expect(w.find('[data-testid="tv3-sec-photo-anchor-0"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-photo-fill-panel"]').exists()).toBe(false)
  })
})