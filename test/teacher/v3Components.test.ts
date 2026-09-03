// V3 组件层：SlideCanvasV3（八类结构化元素渲染 + 点选 + 缩放）
// thumb 模式下几何走 miniSvg 快照，不挂 JSXGraph，jsdom 可稳定运行（红线 R1：禁止截图化）。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SlideCanvasV3 from '@/components/teacherV3/SlideCanvasV3.vue'
import type { V3Slide } from '@/types/teacherV3'

function makeSlide(): V3Slide {
  return {
    id: 's1',
    layout: 'example',
    anchor_bar: '接上页 · l:y=√3(x−1)',
    fill_rate: 0.95,
    elements: [
      { id: 'e1', type: 'text', left: 60, top: 60, width: 600, height: 60, z: 1, html: '求离心率 $e=\\frac{c}{a}$', font_size: 22 },
      { id: 'e2', type: 'formula', left: 60, top: 200, width: 420, height: 70, z: 2, latex: '\\frac{x^2}{4}+\\frac{y^2}{3}=1', font_size: 26, display: true, teacher_confirmed: true },
      { id: 'e3', type: 'geometry', left: 700, top: 120, width: 420, height: 320, z: 3, preset_id: 'conic/ellipse', params: { a: 2, b: 1.73 }, recipe_id: 'rcp-2' },
      { id: 'e4', type: 'anchorPhoto', left: 60, top: 380, width: 480, height: 300, z: 1, src: 'blob:photo-1', upgrade_state: 'none' },
      { id: 'e5', type: 'pageNo', left: 1220, top: 680, width: 40, height: 30, z: 1, no: 2 },
    ],
  }
}

describe('SlideCanvasV3：结构化元素渲染', () => {
  it('八类元素中的五类同页渲染（text/formula/geometry/anchorPhoto/pageNo）', () => {
    const w = mount(SlideCanvasV3, { props: { slide: makeSlide(), width: 640, thumb: true } })
    expect(w.findAll('.v3sc__el')).toHaveLength(5)
    expect(w.find('.v3sc__text').html()).toContain('katex')
    expect(w.find('.v3sc__formula').html()).toContain('katex')
    expect(w.find('.v3sc__geo-thumb').exists()).toBe(true)
    expect(w.find('.v3sc__recipe-tag').text()).toContain('配方')
    const img = w.find('.v3sc__anchor-photo img')
    expect(img.attributes('src')).toBe('blob:photo-1')
    expect(w.find('.v3sc__anchor-photo-tag').text()).toContain('原图锚定 · 不可删除')
    expect(w.find('.v3sc__pageno').text()).toBe('2')
  })

  it('1280×720 逻辑坐标 → 目标宽度等比缩放', () => {
    const w = mount(SlideCanvasV3, { props: { slide: makeSlide(), width: 640, thumb: true } })
    const root = w.find('.v3sc')
    expect(root.attributes('style')).toContain('width: 640px')
    expect(root.attributes('style')).toContain('height: 360px')
    const first = w.findAll('.v3sc__el')[0]
    expect(first.attributes('style')).toContain('left: 30px')
  })

  it('分页锚条 + 装填率条（超限 → over 样式）', () => {
    const w = mount(SlideCanvasV3, { props: { slide: makeSlide(), width: 640, thumb: true } })
    expect(w.find('.v3sc__anchor').text()).toContain('接上页')
    expect(w.find('.tv3-fillbar__bar').classes()).toContain('tv3-fillbar__bar--over')
  })

  it('函数图像元素：表达式采样出 SVG 路径', () => {
    const slide: V3Slide = {
      id: 's2', layout: 'derivation', elements: [
        {
          id: 'f1', type: 'functionPlot', left: 320, top: 120, width: 640, height: 420, z: 2,
          expr: 'y=a\\sin(bx+c)+d',
          params: { a: { value: 1, min: 0.5, max: 3, step: 0.1 }, b: { value: 1, min: 0.5, max: 3, step: 0.1 }, c: { value: 0, min: -3, max: 3, step: 0.1 }, d: { value: 0, min: -2, max: 2, step: 0.1 } },
          domain: [-6.28, 6.28], live_sliders: true,
        },
      ],
    }
    const w = mount(SlideCanvasV3, { props: { slide, width: 640, thumb: true } })
    const fx = w.find('.v3sc__fx')
    expect(fx.html()).toContain('<svg')
    expect(fx.html()).toContain('<path')
    expect(w.find('.v3sc__fx-live').exists()).toBe(true)
  })

  it('动态演示卡：预设名映射', () => {
    const slide: V3Slide = {
      id: 's3', layout: 'keypoints', elements: [
        { id: 'd1', type: 'dynamicDemo', left: 700, top: 420, width: 460, height: 140, z: 2, demo_id: 'solid/cube-section', caption: '截面形状猜一猜' },
      ],
    }
    const w = mount(SlideCanvasV3, { props: { slide, width: 640, thumb: true } })
    expect(w.find('.v3sc__demo-title').text()).toBe('正方体截面 · 三点拖动')
    expect(w.find('.v3sc__demo-sub').text()).toBe('截面形状猜一猜')
  })

  it('编辑态：点选元素 → select-element 事件；确认元素带标记', async () => {
    const w = mount(SlideCanvasV3, { props: { slide: makeSlide(), width: 640, thumb: true, editable: true } })
    const els = w.findAll('.v3sc__el')
    expect(els[1].classes()).toContain('v3sc__el--confirmed')
    expect(els[1].classes()).toContain('mx-object')
    await els[1].trigger('click')
    expect(w.emitted('select-element')![0]).toEqual(['e2'])
  })
})
