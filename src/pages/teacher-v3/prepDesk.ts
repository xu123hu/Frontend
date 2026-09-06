/**
 * V3.4 · 二次备课共备桌 —— 前端原型状态层（PROTOTYPE-ONLY，IFC-V34-a）
 *
 * 边界声明（§8/§9）：
 *  - 本文件是独立的前端原型状态与适配层，承载 WorkspaceLesson / WorkspaceBlock / SourceReference /
 *    SuggestionPatch / ProjectionSnapshot / UndoRecord 六个原型对象；不进 src/types/teacherV3.ts、
 *    不进生产 API、不进 mock 服务端契约。
 *  - 持久化为「本机演示保存」（版本化 localStorage 命名空间 tv3-prep-desk/v1），不是云端保存；
 *    读取失败 / 版本不兼容时保留损坏原文为可恢复备份，并提供重新开始路径。
 *  - 撤销栈以数据快照承载（可随刷新恢复）；快照仅覆盖共备稿内容（blocks/suggestions/classNote/lastStop）。
 */
import { computed, reactive } from 'vue'

/* ==================== 原型类型 ==================== */

export type DeskBlockType =
  | 'text' | 'core-question' | 'concept' | 'example' | 'pitfall'
  | 'checkpoint' | 'board-split' | 'quote' | 'class-note'

export const DESK_BLOCK_LABELS: Record<DeskBlockType, string> = {
  'text': '段落',
  'core-question': '核心问题',
  'concept': '概念形成',
  'example': '例题',
  'pitfall': '易错点',
  'checkpoint': '课堂检查点',
  'board-split': '板书 / PPT 分工',
  'quote': '资源引用',
  'class-note': '本班调整理由',
}

export interface DeskSourcePage {
  id: string
  label: string
  body: string
  /** 整页版式配图（SVG 字符串，演示教材页用；真实能力为授权教材页图，IFC） */
  figure?: string
}

export type DeskSourceKind = 'old-lesson' | 'common-plan' | 'textbook-demo' | 'class-note' | 'external'
export type DeskSourceStatus = 'ok' | 'missing' | 'unverified' | 'stale'

export interface DeskSourceRef {
  id: string
  kind: DeskSourceKind
  name: string
  sourceLabel: string          // 来源类别（我的旧课 / 备课组共案 / 演示教材页 / 外部引用…）
  locator: string              // 页码或定位
  status: DeskSourceStatus
  note?: string
  pages?: DeskSourcePage[]
}

export interface DeskBlock {
  id: string
  type: DeskBlockType
  text: string                 // 连续文本，允许内联 $..$ 公式（编辑器负责渲染，教师不见 LaTeX）
  locked?: boolean
  sourceRefId?: string         // 引用来源（quote / 资源取用落稿必带）
  sourceLocator?: string
  origin?: 'quote' | 'suggestion' | 'resource' | 'manual'
}

export interface DeskPathOption { id: string; title: string; fit: string; minutes: number; keyQuestions: string[] }

export interface DeskSuggestion {
  id: string
  targetBlockId: string
  action: 'split-chain' | 'swap-example' | 'board-hint' | 'add-checkpoint' | 'path-candidate'
  actionLabel: string
  title: string
  reason: string               // 推荐理由 + 依据（本班备注 / 演示数据）
  basis: 'ai-demo' | 'class-demo'
  before: string               // 目标块原文（insert 类为空，显示「（新增）」）
  after: string                // 建议后文本（insert 类为新块文本）
  needVerify: boolean          // 数学结论 / 完整解答 / 错因 / 变式需教师核验
  pathOptions?: DeskPathOption[]
  chosenPathId?: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface DeskDeckPage { title: string; lines: string[]; fromBlockIds: string[] }
export interface DeskDeckCandidate { id: string; title: string; usable: boolean; note?: string; pages: DeskDeckPage[] }

export interface DeskProjection {
  builtAt: string
  outline: { blockId: string; type: DeskBlockType; label: string; summary: string }[]
  deckCandidates: DeskDeckCandidate[]
}

export interface DeskLesson {
  id: string
  topic: string
  classId: string
  className: string
  textbookVersion: string
  chapter: string
  lessonType: string
  durationMin: number
  originLabel: string          // 来源说明（如「去年课例（高二(5)班）」）
  updatedAt: string
  lastStop: string             // 上次停留点（给人看的文字）
  blocks: DeskBlock[]
  sources: DeskSourceRef[]
  pageNotes: Record<string, string>   // 页级批注（sourcePageId → 批注文本）
  classNote: string            // 本班班情备注（演示数据则随种子标注）
  suggestions: DeskSuggestion[]
  projections: DeskProjection | null
}

export interface DeskUndoRecord { id: string; label: string; ts: string; snapshot: string }
export interface DeskSaveLogEntry { ts: string; summary: string }

export interface DeskPersistedState {
  version: 1
  savedAt: string
  activeLessonId: string
  lessons: DeskLesson[]
  undo: DeskUndoRecord[]
  saveLog: DeskSaveLogEntry[]
}

export type DeskSaveStatus = 'saved' | 'saving' | 'error' | 'unsupported'

/* ==================== 版本化持久化命名空间 ==================== */

export const DESK_NS = 'tv3-prep-desk/v1'
export const DESK_NS_BACKUP = 'tv3-prep-desk/v1.corrupt-backup'
const UNDO_CAP = 40

export type DeskLoadResult =
  | { ok: true; state: DeskPersistedState | null }          // null = 首次使用
  | { ok: false; reason: 'corrupt' | 'version'; raw: string }

export function loadDeskState(): DeskLoadResult {
  let raw: string | null = null
  try { raw = localStorage.getItem(DESK_NS) } catch { return { ok: true, state: null } }
  if (!raw) return { ok: true, state: null }
  try {
    const parsed = JSON.parse(raw) as DeskPersistedState
    if (parsed.version !== 1) {
      try { localStorage.setItem(DESK_NS_BACKUP, raw) } catch { /* 保留失败不阻断 */ }
      return { ok: false, reason: 'version', raw }
    }
    return { ok: true, state: parsed }
  } catch {
    try { localStorage.setItem(DESK_NS_BACKUP, raw) } catch { /* 保留失败不阻断 */ }
    return { ok: false, reason: 'corrupt', raw }
  }
}

export function saveDeskState(state: DeskPersistedState): { ok: boolean; reason?: string } {
  try {
    localStorage.setItem(DESK_NS, JSON.stringify(state))
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

export function clearDeskState() {
  try { localStorage.removeItem(DESK_NS) } catch { /* ignore */ }
}

/* ==================== 纯操作（可单测） ==================== */

export interface LessonEditableSlice {
  blocks: DeskBlock[]
  suggestions: DeskSuggestion[]
  classNote: string
  lastStop: string
}

export function lessonSlice(lesson: DeskLesson): LessonEditableSlice {
  return { blocks: lesson.blocks, suggestions: lesson.suggestions, classNote: lesson.classNote, lastStop: lesson.lastStop }
}

export function snapshotOf(lesson: DeskLesson): string {
  return JSON.stringify(lessonSlice(lesson))
}

export function restoreSlice(lesson: DeskLesson, snapshot: string): boolean {
  try {
    const s = JSON.parse(snapshot) as LessonEditableSlice
    lesson.blocks = s.blocks
    lesson.suggestions = s.suggestions
    lesson.classNote = s.classNote
    lesson.lastStop = s.lastStop
    return true
  } catch { return false }
}

export function pushUndoRecord(stack: DeskUndoRecord[], label: string, snapshot: string, ts: string): DeskUndoRecord[] {
  const next = [...stack, { id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, ts, snapshot }]
  return next.slice(Math.max(0, next.length - UNDO_CAP))
}

export function moveBlockAt(blocks: DeskBlock[], from: number, to: number): DeskBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks
  const next = [...blocks]
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row)
  return next
}

export const nowTime = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })
export const nowStamp = () => new Date().toLocaleString('zh-CN', { hour12: false })

/* ==================== 投影（提纲 / 课件候选，纯函数） ==================== */

const trimLine = (s: string, n = 46) => {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '…' : flat
}

export function buildOutline(lesson: DeskLesson): DeskProjection['outline'] {
  return lesson.blocks.map((b) => ({ blockId: b.id, type: b.type, label: DESK_BLOCK_LABELS[b.type], summary: trimLine(b.text) }))
}

export function buildDeckCandidates(lesson: DeskLesson): DeskDeckCandidate[] {
  const byType = (t: DeskBlockType) => lesson.blocks.filter((b) => b.type === t && b.text.trim())
  const questions = byType('core-question')
  const concepts = byType('concept')
  const examples = byType('example')
  const checkpoints = byType('checkpoint')
  const pitfalls = byType('pitfall')

  const cover: DeskDeckPage = {
    title: '封面 · 课题与章节',
    lines: [lesson.topic, lesson.textbookVersion, lesson.chapter],
    fromBlockIds: [],
  }
  const defPage: DeskDeckPage = {
    title: '定义与核心问题',
    lines: [...questions.map((b) => trimLine(b.text, 60)), ...concepts.map((b) => trimLine(b.text, 60))].slice(0, 4),
    fromBlockIds: [...questions, ...concepts].map((b) => b.id),
  }
  const exPage: DeskDeckPage = {
    title: '例题与对答案',
    lines: examples.map((b) => trimLine(b.text, 60)).slice(0, 3),
    fromBlockIds: examples.map((b) => b.id),
  }
  const checkPage: DeskDeckPage = {
    title: '当堂检测',
    lines: checkpoints.map((b) => trimLine(b.text, 60)).slice(0, 3),
    fromBlockIds: checkpoints.map((b) => b.id),
  }

  return [
    {
      id: 'cand-outline3',
      title: '候选 A · 提纲式三页（封面 / 定义 / 例题）',
      usable: questions.length + concepts.length > 0 && examples.length > 0,
      note: examples.length ? undefined : '缺少例题块——先在共备稿写一道例题，该候选才可用',
      pages: [cover, defPage, exPage],
    },
    {
      id: 'cand-example',
      title: '候选 B · 例题精讲单页（含易错提示）',
      usable: examples.length > 0,
      note: examples.length ? undefined : '缺少例题块',
      pages: [{
        title: '例题精讲',
        lines: [...examples.map((b) => trimLine(b.text, 60)).slice(0, 2), ...pitfalls.map((b) => `易错：${trimLine(b.text, 50)}`).slice(0, 2)],
        fromBlockIds: [...examples, ...pitfalls].map((b) => b.id),
      }],
    },
    {
      id: 'cand-check',
      title: '候选 C · 当堂检测页',
      usable: checkpoints.length > 0,
      note: checkpoints.length ? undefined : '缺少课堂检查点块——检测页暂不可投影',
      pages: [checkPage],
    },
  ]
}

export function buildProjection(lesson: DeskLesson, at: string): DeskProjection {
  return { builtAt: at, outline: buildOutline(lesson), deckCandidates: buildDeckCandidates(lesson) }
}

/* ==================== 完成检查（纯函数） ==================== */

export function buildCompletionChecks(lesson: DeskLesson) {
  const has = (t: DeskBlockType) => lesson.blocks.some((b) => b.type === t && b.text.trim())
  const quotes = lesson.blocks.filter((b) => b.type === 'quote')
  const quotesSourced = quotes.every((b) => !!b.sourceRefId)
  return [
    { key: 'question', label: '至少一个核心问题', done: has('core-question') },
    { key: 'example', label: '至少一道例题', done: has('example') },
    { key: 'checkpoint', label: '至少一个课堂检查点', done: has('checkpoint') },
    { key: 'note', label: '已写本班调整理由', done: has('class-note') },
    { key: 'quote-src', label: '引用块都带来源', done: quotesSourced, detail: quotes.length ? `${quotes.length} 条引用` : '暂无引用块' },
    { key: 'empty', label: '没有空块残留', done: lesson.blocks.every((b) => b.text.trim().length > 0) },
  ]
}

/* ==================== 状态仓（模块级单例 composable，随 useCompanion 模式） ==================== */

interface DeskStoreState {
  ready: boolean
  corrupt: { reason: 'corrupt' | 'version'; raw: string } | null
  lessons: DeskLesson[]
  activeLessonId: string
  undo: DeskUndoRecord[]
  saveLog: DeskSaveLogEntry[]
  saveStatus: DeskSaveStatus
  saveError: string
  lastSavedAt: string
  demoFailures: { ai: boolean; resource: boolean; save: boolean }
}

const state = reactive<DeskStoreState>({
  ready: false,
  corrupt: null,
  lessons: [],
  activeLessonId: '',
  undo: [],
  saveLog: [],
  saveStatus: 'saved',
  saveError: '',
  lastSavedAt: '',
  demoFailures: { ai: false, resource: false, save: false },
})

let seedFn: () => DeskLesson[] = () => []
let saveTimer: ReturnType<typeof setTimeout> | null = null
let lastEditKey = ''
let lastEditAt = 0

function toPersisted(): DeskPersistedState {
  return {
    version: 1,
    savedAt: nowStamp(),
    activeLessonId: state.activeLessonId,
    lessons: state.lessons,
    undo: state.undo,
    saveLog: state.saveLog,
  }
}

function doSave(summary: string) {
  if (state.demoFailures.save) {
    state.saveStatus = 'error'
    state.saveError = '本机演示保存失败（演示开关打开）——内容仍在此页面上，可继续编辑'
    return
  }
  state.saveStatus = 'saving'
  const r = saveDeskState(toPersisted())
  if (r.ok) {
    state.saveStatus = 'saved'
    state.saveError = ''
    state.lastSavedAt = nowTime()
    state.saveLog = [{ ts: nowStamp(), summary }, ...state.saveLog].slice(0, 8)
  } else {
    state.saveStatus = 'error'
    state.saveError = `本机演示保存失败（${r.reason || '浏览器存储不可用'}）——内容仍在此页面上`
  }
}

function scheduleSave(summary: string) {
  state.saveStatus = 'saving'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveTimer = null; doSave(summary) }, 600)
}

export function configurePrepDeskSeed(seed: () => DeskLesson[]) { seedFn = seed }

/** 仅供测试：把单例重置为"未初始化"态，模拟跨页面刷新后的新会话（localStorage 内容保留） */
export function resetPrepDeskSessionForTest() {
  state.ready = false
  state.lessons = []
  state.activeLessonId = ''
  state.undo = []
  state.saveLog = []
  state.corrupt = null
  state.saveStatus = 'saved'
  state.saveError = ''
}

export function usePrepDesk() {
  const activeLesson = computed(() => state.lessons.find((l) => l.id === state.activeLessonId) || null)

  function init() {
    if (state.ready) return
    const loaded = loadDeskState()
    if (loaded.ok) {
      if (loaded.state) {
        state.lessons = loaded.state.lessons || []
        state.activeLessonId = loaded.state.activeLessonId || ''
        state.undo = loaded.state.undo || []
        state.saveLog = loaded.state.saveLog || []
        // 恢复自上一次本机保存：如实显示其时刻（不伪装"刚保存"）
        const savedAt = loaded.state.savedAt || ''
        state.lastSavedAt = savedAt.includes(' ') ? savedAt.slice(savedAt.indexOf(' ') + 1) : savedAt
      } else {
        state.lessons = seedFn()
        state.activeLessonId = ''
        doSave('首次初始化演示共备数据')
      }
    } else {
      state.corrupt = { reason: loaded.reason, raw: loaded.raw }
    }
    state.ready = true
  }

  function resetAll() {
    clearDeskState()
    try { localStorage.removeItem(DESK_NS_BACKUP) } catch { /* ignore */ }
    state.lessons = seedFn()
    state.activeLessonId = ''
    state.undo = []
    state.saveLog = []
    state.corrupt = null
    state.saveStatus = 'saved'
    state.saveError = ''
    doSave('重新开始（重置演示数据）')
  }

  /** 文本编辑：按块 + 时间窗合并撤销记录（1.5s 内同一块的连续编辑算一次） */
  function editBlockText(blockId: string, text: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const key = `edit:${blockId}`
    const fresh = Date.now() - lastEditAt > 1500
    if (fresh || lastEditKey !== key) {
      state.undo = pushUndoRecord(state.undo, `编辑「${DESK_BLOCK_LABELS[lesson.blocks.find((b) => b.id === blockId)?.type || 'text']}」`, snapshotOf(lesson), nowTime())
    }
    lastEditKey = key
    lastEditAt = Date.now()
    const b = lesson.blocks.find((x) => x.id === blockId)
    if (b) b.text = text
    lesson.updatedAt = nowStamp()
    scheduleSave('编辑共备稿')
  }

  function pushLessonUndo(label: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    state.undo = pushUndoRecord(state.undo, label, snapshotOf(lesson), nowTime())
    lastEditKey = ''
  }

  function insertBlock(afterBlockId: string | null, block: Omit<DeskBlock, 'id'>): DeskBlock {
    const lesson = activeLesson.value
    const full: DeskBlock = { ...block, id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
    if (lesson) {
      pushLessonUndo(`新增${DESK_BLOCK_LABELS[full.type]}块`)
      const idx = afterBlockId ? lesson.blocks.findIndex((b) => b.id === afterBlockId) : -1
      if (idx >= 0) lesson.blocks.splice(idx + 1, 0, full)
      else lesson.blocks.push(full)
      lesson.updatedAt = nowStamp()
      lesson.lastStop = `${DESK_BLOCK_LABELS[full.type]}（新增）`
    }
    scheduleSave('新增块')
    return full
  }

  function removeBlock(blockId: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const b = lesson.blocks.find((x) => x.id === blockId)
    if (!b || b.locked) return
    pushLessonUndo(`删除${DESK_BLOCK_LABELS[b.type]}块`)
    lesson.blocks = lesson.blocks.filter((x) => x.id !== blockId)
    lesson.updatedAt = nowStamp()
    scheduleSave('删除块')
  }

  function moveBlock(blockId: string, toIndex: number) {
    const lesson = activeLesson.value
    if (!lesson) return
    const from = lesson.blocks.findIndex((b) => b.id === blockId)
    if (from < 0 || from === toIndex) return
    pushLessonUndo('调整块顺序')
    lesson.blocks = moveBlockAt(lesson.blocks, from, toIndex)
    lesson.updatedAt = nowStamp()
    scheduleSave('调整块顺序')
  }

  function toggleLock(blockId: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const b = lesson.blocks.find((x) => x.id === blockId)
    if (!b) return
    pushLessonUndo(b.locked ? '解除锁定' : '锁定块')
    b.locked = !b.locked
    scheduleSave(b.locked ? '锁定块' : '解除锁定')
  }

  function setStop(blockId: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const b = lesson.blocks.find((x) => x.id === blockId)
    if (!b) return
    lesson.lastStop = `${DESK_BLOCK_LABELS[b.type]} · ${trimLine(b.text, 18)}`
    scheduleSave('停留位置更新')
  }

  function insertQuote(sourceRefId: string, sourceLocator: string, text: string, afterBlockId: string | null) {
    const lesson = activeLesson.value
    const src = lesson?.sources.find((s) => s.id === sourceRefId)
    if (!lesson || !src) return null
    const block = insertBlock(afterBlockId, {
      type: 'quote',
      text: text.trim() || `（来自「${src.name}」的引用）`,
      sourceRefId,
      sourceLocator: sourceLocator || src.locator,
      origin: 'quote',
    })
    return block
  }

  function setPageNote(pageId: string, note: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    lesson.pageNotes = { ...lesson.pageNotes, [pageId]: note }
    scheduleSave('页级批注')
  }

  function setClassNote(note: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    pushLessonUndo('修改班情备注')
    lesson.classNote = note
    scheduleSave('修改班情备注')
  }

  /** 记录一条建议（去重：同块同动作已有 pending/accepted 不重复生成） */
  function trackSuggestion(s: DeskSuggestion) {
    const lesson = activeLesson.value
    if (!lesson) return
    const dup = lesson.suggestions.find((x) => x.targetBlockId === s.targetBlockId && x.action === s.action && x.status !== 'rejected')
    if (dup) return
    lesson.suggestions.push(s)
    scheduleSave('生成演示建议')
  }

  function acceptSuggestion(suggId: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const s = lesson.suggestions.find((x) => x.id === suggId)
    if (!s || s.status !== 'pending') return
    const target = lesson.blocks.find((b) => b.id === s.targetBlockId)
    if (target?.locked) return   // 锁定块不执行覆盖
    pushLessonUndo(`接受建议：${s.title}`)
    if (s.action === 'split-chain' || s.action === 'swap-example') {
      if (target) target.text = s.after
    } else {
      // board-hint / add-checkpoint / path-candidate：在目标块后插入新块
      const type: DeskBlockType = s.action === 'board-hint' ? 'board-split' : s.action === 'add-checkpoint' ? 'checkpoint' : 'core-question'
      const nb: DeskBlock = { id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, text: s.after, origin: 'suggestion' }
      const idx = target ? lesson.blocks.findIndex((b) => b.id === target.id) : lesson.blocks.length - 1
      lesson.blocks.splice(idx + 1, 0, nb)
    }
    s.status = 'accepted'
    lesson.updatedAt = nowStamp()
    scheduleSave('接受建议')
  }

  function rejectSuggestion(suggId: string) {
    const lesson = activeLesson.value
    if (!lesson) return
    const s = lesson.suggestions.find((x) => x.id === suggId)
    if (!s || s.status !== 'pending') return
    pushLessonUndo(`拒绝建议：${s.title}`)
    s.status = 'rejected'
    scheduleSave('拒绝建议')
  }

  function choosePath(suggId: string, pathId: string) {
    const lesson = activeLesson.value
    const s = lesson?.suggestions.find((x) => x.id === suggId)
    if (!s || !s.pathOptions) return
    s.chosenPathId = pathId
    const p = s.pathOptions.find((x) => x.id === pathId)
    if (p) s.after = `问题链（${p.title}，约 ${p.minutes} 分钟）：\n${p.keyQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  }

  function undoTop(): string | null {
    const lesson = activeLesson.value
    if (!lesson || !state.undo.length) return null
    const top = state.undo[state.undo.length - 1]
    if (!restoreSlice(lesson, top.snapshot)) return null
    state.undo = state.undo.slice(0, -1)
    lesson.updatedAt = nowStamp()
    lastEditKey = ''
    doSave(`撤销：${top.label}`)
    return top.label
  }

  function openLesson(id: string) {
    if (!state.lessons.some((l) => l.id === id)) return
    state.activeLessonId = id
    state.undo = []
    doSave('打开共备课例')
  }

  function createBlankFromTextbook(topic: string, chapter: string) {
    const lesson = seedFn().find((l) => l.originLabel === '空白共备稿（演示教材页）')
    if (!lesson) return
    const blank: DeskLesson = {
      ...JSON.parse(JSON.stringify(lesson)),
      id: `desk-blank-${Date.now()}`,
      topic: topic || '未命名课时（待补充）',
      chapter,
      blocks: [],
      suggestions: [],
      projections: null,
      pageNotes: {},
      updatedAt: nowStamp(),
      lastStop: '空白稿 · 从教材开始',
      originLabel: '从教材开始（本机新建）',
    }
    state.lessons.push(blank)
    state.activeLessonId = blank.id
    state.undo = []
    doSave('从教材新建空白共备稿')
  }

  function saveNow(summary = '手动保存') { doSave(summary) }
  function setDemoFailure(kind: 'ai' | 'resource' | 'save', on: boolean) { state.demoFailures[kind] = on }

  return {
    state,
    activeLesson,
    init, resetAll,
    openLesson, createBlankFromTextbook,
    editBlockText, insertBlock, removeBlock, moveBlock, toggleLock, setStop,
    insertQuote, setPageNote, setClassNote,
    trackSuggestion, acceptSuggestion, rejectSuggestion, choosePath,
    pushLessonUndo, undoTop, saveNow,
    setDemoFailure,
  }
}
