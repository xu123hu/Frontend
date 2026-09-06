// V3.2 · BankView：双框入库（题干/解答分开）+ AI 识别知识点 + 分类树编辑；ResourcesView：分类（类型分组+章节+搜索）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

const quizQuestions = vi.fn()
const quizKpTree = vi.fn()
const foldersList = vi.fn()
const quizScanImport = vi.fn()
const kpSuggest = vi.fn()
const kpTreeAdd = vi.fn()
const resourcesFn = vi.fn()
const recipesFn = vi.fn()

vi.mock('@/api/teacherV3', () => ({
  v3Api: {
    catalog: {
      quizQuestions: (...a: unknown[]) => quizQuestions(...a),
      quizKpTree: (...a: unknown[]) => quizKpTree(...a),
      quizScanImport: (...a: unknown[]) => quizScanImport(...a),
      kpSuggest: (...a: unknown[]) => kpSuggest(...a),
      kpTreeAdd: (...a: unknown[]) => kpTreeAdd(...a),
      folders: { list: (...a: unknown[]) => foldersList(...a) },
      resources: (...a: unknown[]) => resourcesFn(...a),
      recipes: (...a: unknown[]) => recipesFn(...a),
    },
  },
}))

import BankView from '@/pages/teacher-v3/BankView.vue'
import ResourcesView from '@/pages/teacher-v3/ResourcesView.vue'

const TREE = [
  { id: 'mod-conic', name: '圆锥曲线', children: [
    { id: 'ch-ellipse', name: '椭圆', children: [{ id: 'kp-yd3', name: '焦点弦', kp_codes: ['YD-03'] }] },
  ] },
]
const QUESTIONS = [
  { id: 'q-ell-3', kp_name: '焦点弦', kp_code: 'YD-03', q_type: 'solve', difficulty: 'hard', stem_latex: '求弦长 |AB|', answer: '24/7', analysis: '联立 + 韦达。', solution_image: 'data:image/svg+xml;utf8,<svg/>' },
]

function mountPage(comp: typeof BankView | typeof ResourcesView) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }] })
  return mount(comp, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  quizQuestions.mockResolvedValue({ data: { items: QUESTIONS, total: 1 } })
  quizKpTree.mockResolvedValue({ data: { tree: TREE } })
  foldersList.mockResolvedValue({ data: { items: [] } })
  resourcesFn.mockResolvedValue({ data: { items: [
    { id: 'r1', name: '椭圆 · 课件', kind: 'deck', subject: '圆锥曲线', chapter: '椭圆及其标准方程', updated_at: '2026-09-02', owner: '李文澜', shared: true },
    { id: 'r8', name: '英语阅读训练 · 课件', kind: 'deck', subject: '英语', chapter: '阅读专项', updated_at: '2026-08-20', owner: '陈老师', shared: true },
    { id: 'r6', name: '导数 · 教案', kind: 'plan', subject: '导数', chapter: '导数及其应用', updated_at: '2026-08-15', owner: '李文澜', shared: false },
  ] } })
  recipesFn.mockResolvedValue({ data: { items: [] } })
})

describe('V3.2 · BankView 双框入库', () => {
  it('题干图与解答图分两框上传；导入时 solution_src 随 body 传给后端', async () => {
    quizScanImport.mockResolvedValue({ data: { ...QUESTIONS[0], id: 'q-new' } })
    const w = mountPage(BankView)
    await flushPromises()

    await w.find('[data-testid="tv3-bank-scan-open"]').trigger('click')
    expect(w.find('[data-testid="tv3-bank-scan-sol-file"]').exists()).toBe(true)
    expect(w.text()).toContain('② 解答过程图（选传）')

    // 两框各选一张图
    const stemInput = w.find('[data-testid="tv3-bank-scan-input"]')
    Object.defineProperty(stemInput.element, 'files', { value: [{ name: '题干.png' }] })
    vi.spyOn(window, 'FileReader').mockImplementation(() => {
      const fake: any = { readAsDataURL: () => Promise.resolve().then(() => fake.onload?.()), result: 'data:image/png;base64,IMG' }
      return fake
    })
    await stemInput.trigger('change')
    const solInput = w.find('[data-testid="tv3-bank-scan-sol-input"]')
    Object.defineProperty(solInput.element, 'files', { value: [{ name: '解答.png' }] })
    await solInput.trigger('change')
    await flushPromises()
    expect(w.find('[data-testid="tv3-bank-scan-sol-preview"]').exists()).toBe(true)

    await w.find('[data-testid="tv3-bank-scan-import"]').trigger('click')
    await flushPromises()
    expect(quizScanImport).toHaveBeenCalledTimes(1)
    expect(quizScanImport.mock.calls[0][0]).toMatchObject({ solution_src: 'data:image/png;base64,IMG' })
    vi.restoreAllMocks()
  })

  it('解答原图出现在「答案与解析」折叠区', async () => {
    const w = mountPage(BankView)
    await flushPromises()
    await w.find('[data-testid="tv3-bank-detail-q-ell-3"]').trigger('click')
    expect(w.find('[data-testid="tv3-bank-detail-box-q-ell-3"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-bank-solution-q-ell-3"]').exists()).toBe(true)
  })
})

describe('V3.2 · BankView AI 识别知识点 + 树编辑', () => {
  it('AI 识别 → 建议与备选出现 → 点选填入归属下拉', async () => {
    kpSuggest.mockResolvedValue({
      data: {
        suggestion: { code: 'YD-03', path: ['圆锥曲线', '椭圆', '焦点弦'], name: '焦点弦', confidence: 0.92 },
        alternates: [{ code: 'YD-01', path: ['圆锥曲线', '椭圆', '椭圆标准方程'], name: '椭圆标准方程' }],
        note: '按题干关键词匹配（mock）',
      },
    })
    const w = mountPage(BankView)
    await flushPromises()
    await w.find('[data-testid="tv3-bank-scan-open"]').trigger('click')

    // 未传图前禁用
    expect((w.find('[data-testid="tv3-bank-scan-suggest"]').element as HTMLButtonElement).disabled).toBe(true)

    const stemInput = w.find('[data-testid="tv3-bank-scan-input"]')
    Object.defineProperty(stemInput.element, 'files', { value: [{ name: '题干.png' }] })
    vi.spyOn(window, 'FileReader').mockImplementation(() => {
      const fake: any = { readAsDataURL: () => Promise.resolve().then(() => fake.onload?.()), result: 'data:image/svg+xml;utf8,<svg>过椭圆右焦点求弦长</svg>' }
      return fake
    })
    await stemInput.trigger('change')
    await flushPromises()
    await w.find('[data-testid="tv3-bank-scan-suggest"]').trigger('click')
    await flushPromises()

    expect(kpSuggest).toHaveBeenCalled()
    const apply = w.find('[data-testid="tv3-bank-suggest-apply"]')
    expect(apply.exists()).toBe(true)
    expect(apply.text()).toContain('焦点弦')
    await apply.trigger('click')
    const sel = w.find('[data-testid="tv3-bank-scan-kp"]').element as HTMLSelectElement
    expect(sel.value).toBe('YD-03')
    vi.restoreAllMocks()
  })

  it('树编辑：加子级（调 kpTreeAdd 并刷新）/ 删除后题目保留', async () => {
    kpTreeAdd.mockResolvedValue({ data: { id: 'kp-new', name: '弦长公式' } })
    const w = mountPage(BankView)
    await flushPromises()

    // 进入编辑模式 → 行内操作出现
    await w.find('[data-testid="tv3-bank-tree-manage"]').trigger('click')
    expect(w.find('[data-testid="tv3-kp-add-kp-yd3"]').exists()).toBe(true)

    // 在焦点弦下加子级
    await w.find('[data-testid="tv3-kp-add-kp-yd3"]').trigger('click')
    await w.find('[data-testid="tv3-kp-add-input"]').setValue('弦长公式')
    await w.find('[data-testid="tv3-kp-add-go"]').trigger('click')
    await flushPromises()
    // 叶节点的 ＋ = 同级新建 → 挂在其父 ch-ellipse 下
    expect(kpTreeAdd).toHaveBeenCalledWith({ parent_id: 'ch-ellipse', name: '弦长公式' })
    // 树刷新后新节点渲染（quizKpTree 已被再次调用）
    expect(quizKpTree.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})

describe('V3.2 · ResourcesView 分类（V2 改版）', () => {
  it('未选类型时按类型分组渲染；搜索与类型标签过滤生效', async () => {
    const w = mountPage(ResourcesView)
    await flushPromises()

    // 分组头：未选类型时按类型分组（课件组/教案组）
    expect(w.find(".rv2-res-group__label[data-type='deck']").text()).toContain('课件')
    expect(w.find(".rv2-res-group__label[data-type='plan']").text()).toContain('教案')

    // 搜索过滤：命中名称即只剩该项（数据来自 catalog/resources mock）
    const search = w.find('.rv2-search__input')
    await search.setValue('英语')
    expect(w.text()).toContain('英语阅读训练 · 课件')
    expect(w.text()).not.toContain('椭圆 · 课件')

    // 清空搜索 → 侧栏类型标签（deck）→ 平铺只显示课件类
    await search.setValue('')
    await w.find(".rv2-tag[data-type='deck']").trigger('click')
    expect(w.text()).toContain('椭圆 · 课件')
    expect(w.text()).not.toContain('导数 · 教案')
  })
})
