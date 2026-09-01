/**
 * 双师课堂纯函数工具（可单测，不依赖 DOM/API）。
 *
 * - groupSlideSections：把一页 slide 的 blocks 按「效果图课堂版式」归类：
 *   学习目标 / 定理框 / 主讲讲解 / 例题 / 表格 / 图形 / 公式板书 / 结论小结。
 * - splitSolutionSteps：把例题解析按 ①②③ / 换行 / 分号切成分步板书。
 * - practiceAccuracy：分层练习正确率（含环形图角度）。
 * - verificationMeta / sourceTypeMeta / deriveSourceTitle / 时间工具。
 */

/** 验证状态元信息 */
export function verificationMeta(status) {
  const map = {
    verified: { label: '数学已验证', tone: 'ok', icon: '✓' },
    needs_review: { label: '需要复核', tone: 'warn', icon: '⚠' },
    failed: { label: '验证未通过', tone: 'err', icon: '✗' },
    generating: { label: '生成中', tone: 'muted', icon: '…' },
  }
  return map[status] || { label: '未验证', tone: 'muted', icon: '·' }
}

/** 课堂来源元信息 */
export function sourceTypeMeta(type) {
  const map = {
    topic: { label: '主题生成', icon: '✍️' },
    photo: { label: '拍题', icon: '📷' },
    file: { label: '教案上传', icon: '📄' },
  }
  return map[type] || { label: '课堂', icon: '📘' }
}

/** 从前 N 行文本推导课堂标题（首行去行号/编号，截断 20 字） */
export function deriveSourceTitle(text, fallback = '数学课堂') {
  if (!text || !text.trim()) return fallback
  const firstLine = text
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0) || ''
  const cleaned = firstLine.replace(/^[（(]?\d+[）).:：、]?/, '').replace(/\s+/g, ' ').trim()
  const title = cleaned || fallback
  return title.length > 22 ? title.slice(0, 21) + '…' : title
}

/** 旧版生成管线遗留的工程警告文本（学生端一律不展示，OpenMAIC 哲学：缺口静默降级） */
const LEGACY_WARNING_RE =
  /未渲染图形|未自动补造|缺少可验证构造数据|请先补充题目条件|需要教师复核|未检索到可引用教材|不渲染默认/

function isLegacyWarning(block) {
  if (!block || typeof block !== 'object') return false
  const text = String(block.text || block.caption || '')
  return LEGACY_WARNING_RE.test(text)
}

/** 把一页 slide 归类为课堂版式结构（每段均为数组，缺失时为空数组由模板兜底） */
export function groupSlideSections(slide) {
  const empty = {
    goals: [], theorems: [], lecture: [], examples: [], tables: [],
    figures: [], formulas: [], summary: [], textbook: null,
  }
  if (!slide || !Array.isArray(slide.blocks)) {
    return { ...empty, practice: [] }
  }
  const sections = { ...empty }
  const examples = []
  for (const b of slide.blocks) {
    if (!b || typeof b !== 'object') continue
    if (isLegacyWarning(b)) continue
    const kind = b.kind || 'text'
    if (kind === 'latex') sections.formulas.push(b)
    else if (kind === 'plot2d' || kind === 'geometry' || kind === 'figure' || kind === 'ggb') sections.figures.push(b)
    else if (kind === 'example' || kind === 'question') examples.push(b)
    else if (kind === 'note') sections.summary.push(b)
    else if (kind === 'theorem') sections.theorems.push(b)
    else if (kind === 'table') sections.tables.push(b)
    else if (kind === 'textbook_association') sections.textbook = b
    else sections.lecture.push(b)
  }
  sections.examples = examples
  sections.practice = examples
  if (slide.key_points && slide.key_points.length) sections.goals = slide.key_points
  return sections
}

/** 例题解析 → 分步板书（按 ①②③/换行/分号切分，保留编号） */
export function splitSolutionSteps(analysis) {
  const text = String(analysis || '').trim()
  if (!text) return []
  const byMark = text.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩])/g).map((s) => s.trim()).filter(Boolean)
  const parts = byMark.length >= 2
    ? byMark
    : text.split(/\n+|；|;/g).map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts : [text]
}

/** 分层练习正确率（跨档汇总）：返回 0-100 整数 */
export function practiceAccuracy(stats) {
  const s = stats && typeof stats === 'object' ? stats : {}
  let total = 0
  let correct = 0
  for (const tier of ['basic', 'advanced', 'challenge']) {
    const t = s[tier] || {}
    total += Number(t.total) || 0
    correct += Number(t.correct) || 0
  }
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

/** 页面结构序数（渲染六段标题用） */
export const SECTION_STEPS = [
  { key: 'goals', label: '学习目标', icon: '🎯' },
  { key: 'lecture', label: '主讲讲解', icon: '👨‍🏫' },
  { key: 'formulas', label: '公式 / 板书', icon: '📐' },
  { key: 'figures', label: '图形示意', icon: '🧊' },
  { key: 'practice', label: '学生跟做', icon: '✍️' },
  { key: 'summary', label: '小结 · 易错', icon: '📌' },
]

export function percent(a, b) {
  return b ? Math.min(100, Math.round((a / b) * 100)) : 0
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

/** 课堂计时（HH:MM:SS，效果图顶栏样式） */
export function fmtClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function fmtTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}
