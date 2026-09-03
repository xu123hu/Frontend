// V3 页面级交互：PrepView 打开教案详情（走查疑点复现）
// vi.mock v3Api，验证 openPlan 点击 → editor 视图切换是否成立。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

const plansList = vi.fn()
const plansGet = vi.fn()
const classesFn = vi.fn()
const lessonTemplatesFn = vi.fn()
const deckTemplatesFn = vi.fn()
const textbookChaptersFn = vi.fn()

vi.mock('@/api/teacherV3', () => ({
  v3Api: {
    plans: { list: (...a: unknown[]) => plansList(...a), get: (...a: unknown[]) => plansGet(...a) },
    catalog: {
      classes: (...a: unknown[]) => classesFn(...a),
      lessonTemplates: (...a: unknown[]) => lessonTemplatesFn(...a),
      deckTemplates: (...a: unknown[]) => deckTemplatesFn(...a),
      textbookChapters: (...a: unknown[]) => textbookChaptersFn(...a),
    },
    generation: { plan: vi.fn(), planOutline: vi.fn() },
  },
}))

import PrepView from '@/pages/teacher-v3/PrepView.vue'

const mkPlan = (id: string) => ({
  id, topic: `课题 ${id}`, class_id: 'c2-03', lesson_type: '新授课', section_count: 4, confirmed: false, updated_at: '2026-09-01',
})

const mkDetail = (id: string) => ({
  id, topic: `课题 ${id}`, class_id: 'c2-03', lesson_type: '新授课', template_id: 'lt-explorer',
  objectives: ['理解定义', '掌握推导'],
  key_points: ['$2a>2c$ 的必要性'],
  sections: [
    { id: 's1', name: '复习引入', minutes: 5, teacher_activity: '提问 $a^2=b^2+c^2$', student_activity: '回答', design_intent: '唤醒旧知' },
    { id: 's2', name: '概念生成', minutes: 12, teacher_activity: '演示画椭圆', student_activity: '动手画', design_intent: '直观生成' },
  ],
  board_design_note: '主板书：定义 + 推导主线',
  homework_tiers: [
    { tier: '基础', items: ['课本 P42 例1、例2'] },
    { tier: '挑战', items: ['证明 $2a>2c$ 的必要性'] },
  ],
  refs: ['人教A版选修一', '校本讲义 §2.1'],
})

function mountPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }] })
  return mount(PrepView, { global: { plugins: [router] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  plansList.mockResolvedValue({ data: { items: [mkPlan('plan-ellipse'), mkPlan('plan-derivative')] } })
  plansGet.mockResolvedValue({ data: mkDetail('plan-ellipse') })
  classesFn.mockResolvedValue({ data: { items: [{ class_id: 'c2-03', name: '高二(3)班' }] } })
  lessonTemplatesFn.mockResolvedValue({ data: { items: [{ id: 'lt-explorer', name: '探究式', style_tag: '探究', sections: ['复习引入', '概念生成'], recommended_for: '新授课' }] } })
  deckTemplatesFn.mockResolvedValue({ data: { items: [{ id: 'tpl-academic-blue', name: '学术蓝', swatch: { bg: '#fff', primary: '#0a3568', accent: '#c99735', light: true }, recommended_for: '新授课' }] } })
  textbookChaptersFn.mockResolvedValue({ data: { textbooks: [{ name: '人教A版（2019）', chapters: [{ id: 'ch1', path: '选择性必修一 ▸ 圆锥曲线 ▸ 椭圆' }] }] } })
})

describe('PrepView：教案列表 → 详情编辑', () => {
  it('点击教案行 → 请求 plans.get 并切换到 editor 视图', async () => {
    const w = mountPage()
    await flushPromises()
    expect(w.findAll('.tv3-row')).toHaveLength(2)

    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()

    expect(plansGet).toHaveBeenCalledWith('plan-ellipse')
    expect(w.find('[data-testid="tv3-plan-save"]').exists()).toBe(true)
    expect(w.text()).toContain('← 教案库')
    expect(w.text()).toContain('课题 plan-ellipse')
  })

  it('已确认环节计数与逐环节确认交互', async () => {
    const w = mountPage()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()

    await w.find('[data-testid="tv3-sec-confirm-0"]').trigger('click')
    expect(w.find('[data-testid="tv3-plan-push"]').exists()).toBe(false)
    await w.find('[data-testid="tv3-sec-confirm-1"]').trigger('click')
    expect(w.find('[data-testid="tv3-plan-push"]').exists()).toBe(true)
  })

  it('plans.get 失败 → 留在列表视图（静默降级不崩溃）', async () => {
    plansGet.mockRejectedValue(new Error('network'))
    const w = mountPage()
    await flushPromises()
    await w.findAll('.tv3-row')[0].trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-plan-save"]').exists()).toBe(false)
    expect(w.findAll('.tv3-row')).toHaveLength(2)
  })
})
