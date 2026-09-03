<template>
  <div
    class="v3sc" :class="{ 'v3sc--editable': editable }"
    :style="{ width: pxW, height: pxH }"
    :data-testid="testid"
    @dragover.prevent @drop="onDrop($event)"
  >
    <div v-if="slide.anchor_bar" class="v3sc__anchor" :title="slide.anchor_bar">⚓ {{ slide.anchor_bar }}</div>

    <div
      v-for="elx in slide.elements" :key="elx.id"
      class="v3sc__el"
      :class="{
        'mx-object': editable && isMathEl(elx),
        'is-selected': editable && selectedId === elx.id,
        'v3sc__el--confirmed': elx.teacher_confirmed,
      }"
      :style="elStyle(elx)"
      @mousedown.stop="editable && onElDown($event, elx)"
      @click.stop="editable && $emit('select-element', elx.id)"
    >
      <!-- 文本（$..$ 内联公式） -->
      <template v-if="elx.type === 'text'">
        <div class="v3sc__text" :style="textStyle(elx)" v-html="renderRich(elx.html)" />
      </template>

      <!-- 公式（结构化 latex，KaTeX 渲染） -->
      <template v-else-if="elx.type === 'formula'">
        <div class="v3sc__formula" :style="{ fontSize: sc(elx.font_size) + 'px' }" v-html="renderLatex(elx.latex, elx.display)" />
      </template>

      <!-- 几何（结构化 preset，编辑画布用 JSXGraph，缩略图用 miniSvg） -->
      <template v-else-if="elx.type === 'geometry'">
        <GeoFigure
          v-if="!thumb"
          :preset-id="elx.preset_id" :params="elx.params" :toggles="elx.toggles"
          :height="sc(elx.height)" :interactive="presenting" :boxed="false" :show-badge="editable"
        />
        <div v-else class="v3sc__geo-thumb" v-html="miniSvgOf(elx)" />
        <span v-if="elx.recipe_id" class="v3sc__recipe-tag" title="来自构造配方">⚙ 配方</span>
      </template>

      <!-- 函数图像（表达式采样 SVG） -->
      <template v-else-if="elx.type === 'functionPlot'">
        <div class="v3sc__fx" v-html="fxSvg(elx)" />
        <span v-if="elx.live_sliders" class="v3sc__fx-live" :class="{ 'tv3-pulse-dot': presenting }">⟳ 放映可拖参数</span>
      </template>

      <!-- 动态演示卡 -->
      <template v-else-if="elx.type === 'dynamicDemo'">
        <div class="v3sc__demo">
          <div class="v3sc__demo-icon">▶</div>
          <div class="v3sc__demo-body">
            <div class="v3sc__demo-title">{{ demoName(elx.demo_id) }}</div>
            <div class="v3sc__demo-sub">{{ elx.caption || '课堂动态演示 · 点击进入' }}</div>
          </div>
        </div>
      </template>

      <!-- 图片 / 拍照原图锚定 -->
      <template v-else-if="elx.type === 'image'">
        <img class="v3sc__img" :src="elx.src" :alt="elx.alt || ''" draggable="false">
      </template>
      <template v-else-if="elx.type === 'anchorPhoto'">
        <div class="v3sc__anchor-photo" :data-upgrade="elx.upgrade_state">
          <img class="v3sc__img" :src="elx.src" alt="学生作业原图（锚定）" draggable="false">
          <div class="v3sc__anchor-photo-tag">原图锚定 · 不可删除</div>
          <span v-if="elx.upgrade_state !== 'none'" class="v3sc__upgrade-tag">
            {{ upgradeLabel(elx.upgrade_state) }}
          </span>
        </div>
      </template>

      <!-- 页码 -->
      <template v-else-if="elx.type === 'pageNo'">
        <div class="v3sc__pageno">{{ elx.no }}</div>
      </template>

      <!-- 选中态浮动删除按钮（原图锚定元素除外） -->
      <button
        v-if="editable && selectedId === elx.id && elx.type !== 'anchorPhoto'"
        class="v3sc__del" title="删除元素（Delete）"
        :data-testid="`${testid}-del`"
        @mousedown.stop @click.stop="$emit('delete-element', elx.id)"
      >×</button>
    </div>

    <div v-if="fillRate !== undefined" class="v3sc__fillnote" :title="`本页装填率 ${(fillRate * 100).toFixed(0)}%`">
      <div class="tv3-fillbar"><div class="tv3-fillbar__bar" :class="fillClass" :style="{ width: (fillRate * 100) + '%' }" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SlideCanvasV3 —— V3 课件画布（1280×720 逻辑坐标 → 任意宽度等比缩放）
 * 元素八类：text / formula / geometry / functionPlot / dynamicDemo / image / anchorPhoto / pageNo
 * 编辑态：点选（mx-object 金色描边）、拖拽移动、键盘删除由父级处理；
 * 放映态：几何可拖点、函数图带参数滑杆（live_sliders）。
 * 数学元素永远结构化渲染（红线 R1：禁止截图化）。
 */
import { computed } from 'vue'
import { renderLatex, renderRich } from '@/components/mathx/latex'
import { FIGURE_PRESETS } from '@/components/mathx/presets'
import { makeFn, parseLatexExpr } from '@/components/mathx/expr'
import GeoFigure from '@/components/mathx/GeoFigure.vue'
import type { V3Element, V3Slide } from '@/types/teacherV3'

const props = withDefaults(defineProps<{
  slide: V3Slide
  width?: number
  editable?: boolean
  presenting?: boolean
  thumb?: boolean
  selectedId?: string
  testid?: string
}>(), {
  width: 960,
  editable: false,
  presenting: false,
  thumb: false,
  selectedId: '',
})

const emit = defineEmits<{
  (e: 'select-element', id: string): void
  (e: 'delete-element', id: string): void
  (e: 'move-element', id: string, left: number, top: number): void
  (e: 'drop-latex', payload: { latex: string; left: number; top: number }): void
}>()

const pxW = computed(() => `${props.width}px`)
const pxH = computed(() => `${Math.round((props.width / 1280) * 720)}px`)
const k = computed(() => props.width / 1280)
const sc = (v: number) => Math.round(v * k.value * 10) / 10

const fillRate = computed(() => props.slide.fill_rate)
const fillClass = computed(() => (fillRate.value === undefined ? '' : fillRate.value > 0.92 ? 'tv3-fillbar__bar--over' : fillRate.value > 0.6 ? 'tv3-fillbar__bar--ok' : 'tv3-fillbar__bar--warn'))

const DEMO_NAMES: Record<string, string> = {
  'conic/ellipse-def': '椭圆定义 · 绳长实验',
  'function/sine': '正弦函数 · 三参数联动',
  'solid/cube-section': '正方体截面 · 三点拖动',
  'plane/circle-line': '直线与圆 · 位置关系',
}

function elStyle(elx: V3Element) {
  return {
    left: sc(elx.left) + 'px',
    top: sc(elx.top) + 'px',
    width: sc(elx.width) + 'px',
    height: sc(elx.height) + 'px',
    zIndex: elx.z,
  }
}
function textStyle(elx: Extract<V3Element, { type: 'text' }>) {
  return {
    fontSize: sc(elx.font_size) + 'px',
    color: elx.color || undefined,
    fontWeight: elx.bold ? 700 : undefined,
  }
}
const isMathEl = (elx: V3Element) => ['formula', 'geometry', 'functionPlot', 'dynamicDemo'].includes(elx.type)
const demoName = (id: string) => DEMO_NAMES[id] || id

function miniSvgOf(elx: Extract<V3Element, { type: 'geometry' }>) {
  const def = FIGURE_PRESETS.find((p) => p.id === elx.preset_id)
  if (!def) return ''
  try { return def.miniSvg(elx.params, elx.toggles) } catch { return '' }
}
const upgradeLabel = (s: string) => (s === 'library' ? '↑ 图形库' : s === 'rebuilt' ? '✓ 已重建' : s === 'demo' ? '▶ 动态演示' : '')

/** 函数图像：采样 SVG（无引擎开销；参数取当前值） */
function fxSvg(elx: Extract<V3Element, { type: 'functionPlot' }>): string {
  const W = 1000
  const H = Math.round((elx.height / elx.width) * W)
  const [x0, x1] = elx.domain
  const ySpan = Math.max(4, (x1 - x0) / 2)
  const xv = (x: number) => ((x - x0) / (x1 - x0)) * W
  const yv = (y: number) => H / 2 - (y / ySpan) * (H / 2)
  const parsed = parseLatexExpr(elx.expr)
  const fn = makeFn(parsed)
  const p: Record<string, number> = {}
  for (const [key, spec] of Object.entries(elx.params || {})) p[key] = spec.value
  let d = ''
  let pen = false
  for (let i = 0; i <= 400; i++) {
    const x = x0 + ((x1 - x0) * i) / 400
    const y = fn(x, p)
    if (!Number.isFinite(y) || Math.abs(y) > ySpan * 1.6) { pen = false; continue }
    d += `${pen ? 'L' : 'M'}${xv(x).toFixed(1)},${yv(y).toFixed(1)} `
    pen = true
  }
  const axisX = `<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#c3cad6" stroke-width="1"/>`
  const axisY = `<line x1="${xv(0)}" y1="0" x2="${xv(0)}" y2="${H}" stroke="#c3cad6" stroke-width="1"/>`
  const exprTex = renderLatex(elx.expr.replace(/^y\s*=/, 'y='), false)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:100%">${axisX}${axisY}` +
    `<path d="${d}" fill="none" stroke="#0f4787" stroke-width="2.4"/>` +
    `<text x="12" y="22" font-size="26" fill="#16233b" font-family="Cambria Math,Georgia,serif">${exprTex.replace(/<[^>]+>/g, (m) => m.includes('katex') ? '' : m) || elx.expr}</text></svg>`
}

/* ---------- 编辑态拖拽移动 ---------- */
function onElDown(ev: MouseEvent, elx: V3Element) {
  if (!props.editable || ev.button !== 0) return
  emit('select-element', elx.id)
  const startX = ev.clientX
  const startY = ev.clientY
  const originLeft = elx.left
  const originTop = elx.top
  let moved = false
  const onMove = (e2: MouseEvent) => {
    const dx = (e2.clientX - startX) / k.value
    const dy = (e2.clientY - startY) / k.value
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true
    if (moved) {
      elx.left = Math.max(0, Math.min(1280 - elx.width, Math.round(originLeft + dx)))
      elx.top = Math.max(0, Math.min(720 - elx.height, Math.round(originTop + dy)))
    }
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    if (moved) emit('move-element', elx.id, elx.left, elx.top)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/* 公式键盘拖入画布 → 生成公式元素（dataTransfer mx/latex）
 * 坐标用画布 rect 计算：offsetX 相对命中子元素，拖到公式/图形上方会错位 */
function onDrop(ev: DragEvent) {
  if (!props.editable || !ev.dataTransfer) return
  const latex = ev.dataTransfer.getData('mx/latex')
  if (!latex) return
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  emit('drop-latex', {
    latex,
    left: Math.round((ev.clientX - rect.left) / k.value),
    top: Math.round((ev.clientY - rect.top) / k.value),
  })
}
</script>

<style scoped>
.v3sc {
  position: relative; background: #fff; border-radius: 6px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(10, 53, 104, 0.08); flex-shrink: 0;
}
.v3sc--editable { cursor: default; }
.v3sc__el { position: absolute; }
.v3sc__del {
  position: absolute; right: 4px; top: 4px; z-index: 30;
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: var(--tv3-rose, #dc2646); color: #fff; cursor: pointer;
  font-size: 14px; line-height: 18px; padding: 0; text-align: center;
  box-shadow: 0 2px 6px rgba(220, 38, 70, 0.35);
}
.v3sc__del:hover { background: #b71e39; }
.v3sc__el.v3sc--editable { cursor: move; }
.v3sc__text { line-height: 1.65; white-space: pre-wrap; }
.v3sc__text :deep(.katex) { font-size: 1.02em; }
.v3sc__formula { line-height: 1.4; }
.v3sc__geo-thumb, .v3sc__fx { width: 100%; height: 100%; }
.v3sc__geo-thumb :deep(svg) { width: 100%; height: 100%; }
.v3sc__recipe-tag {
  position: absolute; left: 4px; top: 4px; z-index: 4;
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: var(--tv3-gold-soft); color: var(--tv3-gold-deep); border: 1px solid var(--tv3-gold-border);
}
.v3sc__fx-live {
  position: absolute; right: 4px; top: 4px; z-index: 4;
  font-size: 10px; padding: 1px 6px; border-radius: 999px;
  background: var(--tv3-ai-soft); color: var(--tv3-ai); border: 1px solid var(--tv3-ai-border);
}
.v3sc__demo {
  width: 100%; height: 100%; border-radius: 10px;
  background: linear-gradient(135deg, #f3eefd, #ece2fb);
  border: 1.5px dashed var(--tv3-ai-border);
  display: flex; align-items: center; gap: 14px; padding: 0 20px;
}
.v3sc__demo-icon {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: var(--tv3-ai); color: #fff; display: grid; place-items: center; font-size: 16px;
}
.v3sc__demo-title { font-size: 15px; font-weight: 700; color: var(--tv3-ai-deep); }
.v3sc__demo-sub { font-size: 12px; color: #7c6ba8; margin-top: 2px; }
.v3sc__img { width: 100%; height: 100%; object-fit: contain; border-radius: 4px; }
.v3sc__anchor-photo {
  width: 100%; height: 100%; position: relative;
  border: 2px dashed var(--tv3-gold); border-radius: 8px; padding: 3px; background: #fffdf6;
}
.v3sc__anchor-photo-tag {
  position: absolute; left: 6px; bottom: 6px; z-index: 4;
  font-size: 11px; padding: 1px 8px; border-radius: 999px;
  background: rgba(168, 123, 36, 0.92); color: #fff;
}
.v3sc__upgrade-tag {
  position: absolute; right: 6px; top: 6px; z-index: 4;
  font-size: 11px; padding: 1px 8px; border-radius: 999px;
  background: var(--tv3-teal); color: #fff; font-weight: 600;
}
.v3sc__pageno {
  font-family: var(--tv3-font-num); font-size: 13px; color: var(--tv3-ink3);
  display: grid; place-items: center; width: 100%; height: 100%;
}
.v3sc__anchor {
  position: absolute; top: 0; left: 0; right: 0; z-index: 20;
  font-size: 11.5px; color: var(--tv3-primary);
  background: linear-gradient(90deg, var(--tv3-primary-soft), transparent 85%);
  padding: 4px 10px; border-bottom: 1px solid var(--tv3-primary-border);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.v3sc__fillnote { position: absolute; right: 8px; bottom: 6px; width: 90px; z-index: 20; }
</style>
