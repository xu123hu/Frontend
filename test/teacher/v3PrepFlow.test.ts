// V3.1 · PrepView 两段式教案生成：五件套表单 → 大纲确认（增删环节/调时长）→ SSE 成稿携带大纲
// 以及「我的模板」上传体检链路（import → reports → extract）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

const plansList = vi.fn()
const classesFn = vi.fn()
const lessonTemplatesFn = vi.fn()
const deckTemplatesFn = vi.fn()
const textbookChaptersFn = vi.fn()
const planOutlineFn = vi.fn()
const planGen = vi.fn()
const tplImportFn = vi.fn()
const tplExtractFn = vi.fn()

vi.mock('@/api/teacherV3', () => ({
  v3Api: {
    plans: { list: (...a: unknown[]) => plansList(...a) },
    catalog: {
      classes: (...a: unknown[]) => classesFn(...a),
      lessonTemplates: (...a: unknown[]) => lessonTemplatesFn(...a),
      deckTemplates: (...a: unknown[]) => deckTemplatesFn(...a),
      textbookChapters: (...a: unknown[]) => textbookChaptersFn(...a),
      planTemplatesImport: (...a: unknown[]) => tplImportFn(...a),
      planTemplatesExtract: (...a: unknown[]) => tplExtractFn(...a),
    },
    generation: { plan: (...a: unknown[]) => planGen(...a), planOutline: (...a: unknown[]) => planOutlineFn(...a) },
  },
}))

import PrepView from '@/pages/teacher-v3/PrepView.vue'

function mountPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }] })
  return mount(PrepView, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  plansList.mockResolvedValue({ data: { items: [] } })
  classesFn.mockResolvedValue({ data: { items: [{ class_id: 'c2-05', name: '高二(5)班' }] } })
  lessonTemplatesFn.mockResolvedValue({ data: { items: [
    { id: 'lt-explorer', name: '探究式', style_tag: '探究', sections: ['情境引入', '概念生成'], recommended_for: '新授课', sample_topic: '' },
  ] } })
  deckTemplatesFn.mockResolvedValue({ data: { items: [] } })
  textbookChaptersFn.mockResolvedValue({ data: { textbooks: [{ name: '人教A版（2019）', chapters: [
    { id: 'ch1', path: '选择性必修一 ▸ 圆锥曲线 ▸ 双曲线' },
    { id: 'ch2', path: '选择性必修一 ▸ 圆锥曲线 ▸ 椭圆' },
  ] }] } })
})

describe('PrepView · 两段式（五件套 → 大纲确认 → 成稿）', () => {
  it('点「生成大纲」→ planOutline 收到完整五件套 → 展示可编辑大纲行', async () => {
    planOutlineFn.mockResolvedValue({ data: {
      topic: '双曲线及其标准方程（第1课时）', duration: 45, total_minutes: 45,
      sections: [
        { id: 'bd-intro', name: '情境引入', minutes: 4, goal: '用一个 90 秒情境引出问题。' },
        { id: 'bd-explore', name: '新知探究', minutes: 12, goal: '经历生成过程。' },
        { id: 'bd-examples', name: '例题精讲', minutes: 14, goal: '精讲主干方法。', example_suggestion: '题库检索：配 1 道基础例题' },
      ],
      notes: ['依据：人教A版（2019） · 双曲线', '课型：新授课 · 一节课 45 分钟'],
    } })
    const w = mountPage()
    await flushPromises()

    await w.find('[data-testid="tv3-prep-new"]').trigger('click')
    await w.find('[data-testid="tv3-plan-generate"]').trigger('click')
    await flushPromises()

    expect(planOutlineFn).toHaveBeenCalledTimes(1)
    const body = planOutlineFn.mock.calls[0][0]
    // 五件套字段齐备：课题/班级/课型/模板/教材版本/章节/课时/时长/重难点/补充/例题来源
    expect(body).toMatchObject({ topic: expect.any(String), class_id: 'c2-05', lesson_type: '新授课', template_id: 'lt-explorer' })
    expect(body.textbook_version).toBe('人教A版（2019）')
    expect(body.chapter).toContain('双曲线')
    expect(body.duration).toBe(45)
    expect(body.example_source).toBe('bank')

    expect(w.find('[data-testid="tv3-prep-outline"]').exists()).toBe(true)
    expect(w.findAll('[data-testid^="tv3-outline-row-"]')).toHaveLength(3)
    // 生成依据展示（教师可核对）
    expect(w.text()).toContain('生成依据')
    // attachable 板块给出例题建议
    expect(w.text()).toContain('题库检索：配 1 道基础例题')
  })

  it('大纲可编辑：调时长 / 删环节 / 增自定义环节 → 确认后 SSE 成稿携带修改后的大纲', async () => {
    planOutlineFn.mockResolvedValue({ data: {
      topic: '课题X', duration: 45, total_minutes: 30,
      sections: [
        { id: 'bd-intro', name: '情境引入', minutes: 4, goal: 'g1' },
        { id: 'bd-explore', name: '新知探究', minutes: 12, goal: 'g2' },
        { id: 'bd-examples', name: '例题精讲', minutes: 14, goal: 'g3' },
      ],
    } })
    planGen.mockReturnValue({ abort: () => {} })
    const w = mountPage()
    await flushPromises()

    await w.find('[data-testid="tv3-prep-new"]').trigger('click')
    await w.find('[data-testid="tv3-plan-generate"]').trigger('click')
    await flushPromises()

    // 删除第 3 个环节（例题精讲）
    await w.find('[data-testid="tv3-outline-del-2"]').trigger('click')
    expect(w.findAll('[data-testid^="tv3-outline-row-"]')).toHaveLength(2)

    // 调整第 1 个环节时长为 6 分钟
    const min0 = w.find('[data-testid="tv3-outline-min-0"]').element as HTMLInputElement
    min0.value = '6'
    await w.find('[data-testid="tv3-outline-min-0"]').trigger('input')

    // 增加自定义环节
    await w.find('[data-testid="tv3-outline-add"]').trigger('click')
    expect(w.findAll('[data-testid^="tv3-outline-row-"]')).toHaveLength(3)
    const name2 = w.find('[data-testid="tv3-outline-name-2"]').element as HTMLInputElement
    name2.value = '当堂检测'
    await w.find('[data-testid="tv3-outline-name-2"]').trigger('input')

    // 确认大纲 → 成稿
    await w.find('[data-testid="tv3-outline-confirm"]').trigger('click')

    expect(planGen).toHaveBeenCalledTimes(1)
    const genBody = planGen.mock.calls[0][0]
    expect(genBody.outline).toHaveLength(3)
    expect(genBody.outline[0]).toMatchObject({ name: '情境引入', minutes: 6 })
    expect(genBody.outline[2]).toMatchObject({ name: '当堂检测' })
    expect(genBody.outline.some((s: { name: string }) => s.name === '例题精讲')).toBe(false)
    // 成稿仍携带五件套（供后端落库生成依据）
    expect(genBody.topic).toBeTypeOf('string')
    expect(genBody.template_id).toBe('lt-explorer')
  })

  it('大纲生成失败 → 回退十板块骨架并如实提示，不静默', async () => {
    planOutlineFn.mockRejectedValue(new Error('network'))
    const w = mountPage()
    await flushPromises()

    await w.find('[data-testid="tv3-prep-new"]').trigger('click')
    await w.find('[data-testid="tv3-plan-generate"]').trigger('click')
    await flushPromises()

    expect(w.find('[data-testid="tv3-prep-outline"]').exists()).toBe(true)
    expect(w.text()).toContain('大纲生成失败')
    expect(w.findAll('[data-testid^="tv3-outline-row-"]').length).toBeGreaterThanOrEqual(8)
  })
})

describe('PrepView · 我的模板（上传教案 → 体检 → 提炼）', () => {
  it('上传体检返回报告，通过者可提炼为个人模板并出现在模板库', async () => {
    lessonTemplatesFn.mockResolvedValue({ data: { items: [
      { id: 'lt-explorer', name: '探究式', style_tag: '探究', sections: [], recommended_for: '新授课', sample_topic: '' },
    ] } })
    tplImportFn.mockResolvedValue({ data: { reports: [
      { file: '公开课教案.docx', score: 86, board_coverage: ['教材分析', '教学目标'], missing_boards: ['教后反思'], cliche_hits: [], recommended: true, suggestion: '栏目齐全' },
      { file: '往年教案.docx', score: 58, board_coverage: ['教学目标'], missing_boards: ['学情分析'], cliche_hits: ['空话'], recommended: false, suggestion: '不建议作模板' },
    ] } })
    tplExtractFn.mockResolvedValue({ data: {
      id: 'lt-mine-9', name: '我的模板 · 公开课教案', style_tag: '提炼自上传教案', sections: [], recommended_for: '个人模板', sample_topic: '',
      source: 'teacher_upload',
    } })

    const w = mountPage()
    await flushPromises()

    await w.find('[data-testid="tv3-tpl-upload-open"]').trigger('click')
    expect(w.find('[data-testid="tv3-tpl-upload"]').exists()).toBe(true)

    // 体检（模拟选择 2 份文件 → change → 点击体检）
    const fileInput = w.find('[data-testid="tv3-tpl-input"]')
    Object.defineProperty(fileInput.element, 'files', { value: [{ name: '公开课教案.docx' }, { name: '往年教案.docx' }] })
    await fileInput.trigger('change')
    await w.find('[data-testid="tv3-tpl-check"]').trigger('click')
    await flushPromises()

    expect(tplImportFn).toHaveBeenCalledWith({ files: ['公开课教案.docx', '往年教案.docx'] })
    expect(w.findAll('[data-testid^="tv3-tpl-report-"]')).toHaveLength(2)
    // 推荐件显示「提炼」按钮，不推荐件显示建议文案
    expect(w.find('[data-testid="tv3-tpl-extract-0"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-tpl-extract-1"]').exists()).toBe(false)
    expect(w.text()).toContain('不建议作模板')

    // 提炼 → 新模板进模板库
    await w.find('[data-testid="tv3-tpl-extract-0"]').trigger('click')
    await flushPromises()
    expect(tplExtractFn).toHaveBeenCalledWith({ file: '公开课教案.docx', name: '公开课教案' })
    expect(w.text()).toContain('我的模板 · 公开课教案')
  })
})
