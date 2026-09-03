<template>
  <div class="tv2-canvas" :style="canvasStyle" :data-slide-id="slide?.id">
    <!-- 模板装饰 -->
    <div class="tv2-canvas__tpl-bar" :style="{ background: tplAccent }" />
    <div class="tv2-canvas__tpl-dots" :style="{ borderColor: tplDots }" />

    <template v-if="slide">
      <template v-for="el in slide.elements" :key="el.id">
        <!-- 文本（支持 $..$ 行内公式与 b/br 等白名单标签） -->
        <div v-if="el.type === 'text'" class="tv2-canvas__el" :style="posStyle(el)">
          <div class="tv2-canvas__text" :style="textStyle(el)" v-html="rendered(el.html)" />
        </div>

        <!-- LaTeX 公式 -->
        <div v-else-if="el.type === 'latex'" class="tv2-canvas__el tv2-canvas__el--flex" :style="posStyle(el)">
          <div v-html="renderLatex(el.latex, el.display)" :style="{ color: remap(el.color), fontSize: cqw(el.fontSize), lineHeight: 1.5 }" />
        </div>

        <!-- 几何图形（程序化 SVG） -->
        <div v-else-if="el.type === 'geometry'" class="tv2-canvas__el" :style="posStyle(el)" v-html="geometrySvg(el)" />

        <!-- 函数曲线 -->
        <div v-else-if="el.type === 'functionGraph'" class="tv2-canvas__el" :style="posStyle(el)" v-html="graphSvg(el)" />

        <!-- 图片 -->
        <img v-else-if="el.type === 'image'" class="tv2-canvas__el" :style="posStyle(el)" :src="el.src" :alt="el.alt || ''" />

        <!-- 页码 -->
        <div v-else-if="el.type === 'pageNo'" class="tv2-canvas__el tv2-canvas__pageno" :style="posStyle(el)">
          <span :style="{ color: isLight ? '#8b95a7' : '#6B8AC9', fontSize: cqw(13) }">{{ el.pageNo }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import katex from 'katex'
import DOMPurify from 'dompurify'
import type { V2Slide, V2SlideElement, V2SlideTemplate } from '@/types/teacherV2'

const props = defineProps<{
  slide: V2Slide | null
  template?: V2SlideTemplate | null
}>()

const isLight = computed(() => {
  const bg = props.template?.swatch?.bg || '#0F1E3C'
  const m = /^#?([0-9a-f]{6})$/i.exec(bg)
  if (!m) return false
  const n = parseInt(m[1], 16)
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  return lum > 128
})

/* 深色模板色板 → 浅色模板色板（换模板内容不丢，色彩自适应） */
const LIGHT_MAP: Record<string, string> = {
  '#FFFFFF': '#17233D', '#E6EDF7': '#2B3A55', '#93B4F5': '#5A78B0', '#6B8AC9': '#8296BC',
}
function remap(color?: string): string {
  if (!color) return '#17233D'
  if (!isLight.value) return color
  if (LIGHT_MAP[color.toUpperCase()]) return LIGHT_MAP[color.toUpperCase()]
  if (color.toUpperCase() === '#3B82F6') return props.template?.swatch?.primary || '#1D5BBF'
  if (color.toUpperCase() === '#F59E0B') return props.template?.swatch?.accent || '#B45309'
  return color
}

const tplAccent = computed(() => props.template?.swatch?.accent || '#F59E0B')
const tplDots = computed(() => (isLight.value ? 'rgba(23,35,61,.12)' : 'rgba(255,255,255,.14)'))
const canvasStyle = computed(() => ({
  background: props.template?.swatch?.bg || '#0F1E3C',
}))

/* 1280×720 基准坐标 → cqw 响应式单位（1cqw = 画布宽的 1%） */
const cqw = (px: number) => `${px / 12.8}cqw`
function posStyle(el: V2SlideElement) {
  return {
    left: cqw(el.left), top: cqw(el.top), width: cqw(el.width), height: cqw(el.height),
    ...(el.rotate ? { transform: `rotate(${el.rotate}deg)` } : {}),
  }
}
function textStyle(el: Extract<V2SlideElement, { type: 'text' }>) {
  return {
    color: remap(el.color), fontSize: cqw(el.fontSize),
    fontWeight: el.bold ? 700 : 400, textAlign: el.align || 'left',
  }
}

/* ---------- 文本渲染：转义 + 白名单标签 + $..$ KaTeX + 消毒 ---------- */
const ALLOW_TAG = /&lt;(\/?)(b|i|u|br|sub|sup)&gt;/g
function escapeSegment(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(ALLOW_TAG, '<$1$2>')
}
function rendered(src?: string): string {
  const s = String(src ?? '')
  let out = ''
  let i = 0
  while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === '$') { out += '$'; i += 2; continue }
    if (s[i] !== '$') {
      const next = s.indexOf('$', i)
      const end = next === -1 ? s.length : next
      out += escapeSegment(s.slice(i, end))
      i = end
      continue
    }
    const close = s.indexOf('$', i + 1)
    if (close === -1) { out += '$'; i += 1; continue }
    try {
      out += katex.renderToString(s.slice(i + 1, close), { throwOnError: false })
    } catch {
      out += escapeSegment(s.slice(i, close + 1))
    }
    i = close + 1
  }
  return DOMPurify.sanitize(out, { USE_PROFILES: { html: true, mathMl: true } })
}
function renderLatex(latex?: string, display?: boolean): string {
  try {
    return DOMPurify.sanitize(katex.renderToString(String(latex ?? ''), { throwOnError: false, displayMode: !!display }), { USE_PROFILES: { html: true, mathMl: true } })
  } catch {
    return escapeSegment(String(latex ?? ''))
  }
}

/* ---------- 几何图形：按 shape 程序化绘制（SVG viewBox 480×300） ---------- */
function geometrySvg(el: Extract<V2SlideElement, { type: 'geometry' }>): string {
  const p = el.params as Record<string, number>
  const a = Number(p.a) || 5, b = Number(p.b) || 3, c = Number(p.foci) || 4
  const showPoint = !!p.point
  const vertical = el.shape === 'ellipse-focus-v'
  const cx = 240, cy = 150
  const rx = vertical ? Math.min(120, 40 * b) : Math.min(200, 40 * a)
  const ry = vertical ? Math.min(130, 26 * a) : Math.min(130, 43.3 * b)
  const fx = vertical ? 0 : Math.min(160, 40 * c)
  const fy = vertical ? Math.min(160, 40 * c) : 0
  const stroke = isLight.value ? '#1D5BBF' : '#5B8FF0'
  const amber = isLight.value ? '#B45309' : '#F59E0B'
  const labelColor = isLight.value ? '#4A5568' : '#93B4F5'
  const theta = -0.7
  const mx = rx * Math.cos(theta), my = ry * Math.sin(theta)

  const fociDots = `
    <circle cx="${cx - fx}" cy="${cy - fy}" r="5.5" fill="${amber}"/>
    <circle cx="${cx + fx}" cy="${cy + fy}" r="5.5" fill="${amber}"/>
    <text x="${cx - fx - 30}" y="${cy - fy + 5}" font-size="16" fill="${amber}" font-style="italic">F₁</text>
    <text x="${cx + fx + 10}" y="${cy + fy + 5}" font-size="16" fill="${amber}" font-style="italic">F₂</text>`

  const pointM = showPoint ? `
    <circle cx="${cx + mx}" cy="${cy + my}" r="5" fill="${stroke}"/>
    <text x="${cx + mx + 8}" y="${cy + my - 8}" font-size="15" fill="${stroke}" font-style="italic">M</text>
    <line x1="${cx - fx}" y1="${cy - fy}" x2="${cx + mx}" y2="${cy + my}" stroke="${amber}" stroke-width="1.6" stroke-dasharray="5 4"/>
    <line x1="${cx + fx}" y1="${cy + fy}" x2="${cx + mx}" y2="${cy + my}" stroke="${amber}" stroke-width="1.6" stroke-dasharray="5 4"/>` : ''

  let extra = ''
  if (el.shape === 'ellipse-coordinate') {
    extra = `
      <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="${labelColor}"/></marker></defs>
      <line x1="20" y1="${cy}" x2="458" y2="${cy}" stroke="${labelColor}" stroke-width="1.4" marker-end="url(#ah)"/>
      <line x1="${cx}" y1="282" x2="${cx}" y2="18" stroke="${labelColor}" stroke-width="1.4" marker-end="url(#ah)"/>
      <text x="452" y="${cy + 18}" font-size="14" fill="${labelColor}" font-style="italic">x</text>
      <text x="${cx + 8}" y="24" font-size="14" fill="${labelColor}" font-style="italic">y</text>
      <text x="${cx - 14}" y="${cy + 16}" font-size="13" fill="${labelColor}" font-style="italic">O</text>
      <text x="${cx - fx - 58}" y="${cy + 22}" font-size="13" fill="${labelColor}">(-c,0)</text>
      <text x="${cx + fx + 10}" y="${cy + 22}" font-size="13" fill="${labelColor}">(c,0)</text>
      <text x="${cx + mx + 12}" y="${cy + my + 16}" font-size="13" fill="${labelColor}">P(x,y)</text>`
  } else if (el.shape === 'string-experiment') {
    extra = `
      <text x="${cx + mx + 14}" y="${cy + my + 4}" font-size="15" fill="${stroke}">✏️</text>
      <text x="30" y="270" font-size="13" fill="${labelColor}">细绳总长 2a = |MF₁| + |MF₂|</text>`
  } else if (el.shape === 'orbit-demo') {
    extra = `
      <circle cx="${cx - fx}" cy="${cy - fy}" r="9" fill="${amber}"/>
      <circle cx="${cx - fx}" cy="${cy - fy}" r="15" fill="none" stroke="${amber}" stroke-width="1" opacity="0.5"/>
      <circle cx="${cx + mx}" cy="${cy + my}" r="6" fill="${stroke}"/>
      <text x="30" y="270" font-size="13" fill="${labelColor}">行星绕太阳运动 · 轨迹是椭圆</text>`
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${stroke}" stroke-width="2.4"/>
    ${el.shape === 'orbit-demo' || el.shape === 'string-experiment' ? '' : fociDots}
    ${pointM}${extra}
  </svg>`
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })
}

/* ---------- 函数曲线：安全采样折线 ---------- */
function graphSvg(el: Extract<V2SlideElement, { type: 'functionGraph' }>): string {
  const expr = String(el.expr || '').replace(/\s+/g, '')
  const [x0, x1] = el.domain || [-6, 6]
  const pts: string[] = []
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `"use strict";return (${expr.replace(/\^/g, '**')})`) as (x: number) => number
    const n = el.samples || 160
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = fn(x)
      if (Number.isFinite(y)) pts.push(`${(20 + (440 * (x - x0)) / (x1 - x0)).toFixed(1)},${(150 - y * 28).toFixed(1)}`)
    }
  } catch {
    return `<div style="color:#8b95a7;font-size:12px;padding:8px">${escapeSegment(expr)}</div>`
  }
  const stroke = isLight.value ? '#1D5BBF' : '#5B8FF0'
  const axis = el.axis === false ? '' : `
    <line x1="20" y1="150" x2="460" y2="150" stroke="#8b95a7" stroke-width="1"/>
    <line x1="240" y1="20" x2="240" y2="280" stroke="#8b95a7" stroke-width="1"/>`
  return DOMPurify.sanitize(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">
      ${axis}<polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="2.2"/>
    </svg>`,
    { USE_PROFILES: { svg: true } },
  )
}
</script>

<style scoped>
.tv2-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  container-type: inline-size;
  font-family: "PingFang SC", "Microsoft YaHei", "Inter", system-ui, sans-serif;
  box-shadow: var(--tv2-shadow-md);
}
.tv2-canvas__el { position: absolute; box-sizing: border-box; }
.tv2-canvas__el--flex { display: flex; align-items: center; }
.tv2-canvas__text { width: 100%; line-height: 1.55; word-break: break-word; }
.tv2-canvas__text :deep(.katex) { font-size: 1.06em; }
.tv2-canvas__pageno { display: flex; align-items: center; justify-content: flex-end; }
.tv2-canvas__tpl-bar { position: absolute; left: 0; top: 0; right: 0; height: 0.5cqw; opacity: 0.9; }
.tv2-canvas__tpl-dots {
  position: absolute; right: 2cqw; bottom: 2cqw; width: 5cqw; height: 5cqw;
  border: 0.28cqw dashed; border-radius: 50%; opacity: 0.55; pointer-events: none;
}
</style>
