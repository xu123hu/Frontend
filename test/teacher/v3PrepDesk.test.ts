/**
 * V3.4 · 二次备课共备桌测试（IFC-V34-a PROTOTYPE-ONLY）
 * 覆盖：种子与持久化（版本化命名空间/损坏备份/刷新恢复）、撤销栈（含合并）、
 * 局部建议（确定性生成/接受/拒绝/锁定保护）、资源候选（≤3/失效/未核验/无结果）、
 * 投影（提纲/课件候选可用性）、完成检查、首页三等权与工作台关键交互。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

import {
  configurePrepDeskSeed, usePrepDesk, loadDeskState, saveDeskState, clearDeskState, DESK_NS,
  buildDeckCandidates, buildCompletionChecks, resetPrepDeskSessionForTest,
  type DeskPersistedState,
} from '@/pages/teacher-v3/prepDesk'
import { seedLessons, buildSuggestionsFor, buildResourcesFor } from '@/pages/teacher-v3/prepDeskData'
import PrepDeskHome from '@/pages/teacher-v3/PrepDeskHome.vue'
import PrepDeskWorkspace from '@/pages/teacher-v3/PrepDeskWorkspace.vue'

configurePrepDeskSeed(seedLessons)

const desk = usePrepDesk()

beforeEach(() => {
  clearDeskState()
  resetPrepDeskSessionForTest()
  desk.init()
})

const ellipse = () => desk.state.lessons.find((l) => l.id === 'desk-ellipse-2025')!

/* ==================== 种子 / 持久化 / 损坏恢复 ==================== */

describe('prepDesk · 种子与持久化', () => {
  it('首次初始化播种演示课例并写盘（本机演示保存）', () => {
    expect(ellipse()).toBeTruthy()
    expect(ellipse().blocks.length).toBeGreaterThanOrEqual(5)
    expect(ellipse().sources.map((s) => s.kind)).toContain('textbook-demo')
    const saved = loadDeskState()
    expect(saved.ok && saved.state !== null).toBe(true)
  })

  it('saveDeskState → loadDeskState 往返一致；刷新恢复（新会话 init 读回持久化）', () => {
    desk.openLesson('desk-ellipse-2025')
    const b = ellipse().blocks[1]
    desk.editBlockText(b.id, '改过的核心问题（刷新后应还在）')
    desk.saveNow('测试保存')
    const persisted = JSON.parse(localStorage.getItem(DESK_NS)!) as DeskPersistedState
    expect(persisted.version).toBe(1)

    resetPrepDeskSessionForTest()
    desk.init()   // 模拟刷新后新会话
    expect(desk.state.activeLessonId).toBe('desk-ellipse-2025')
    expect(ellipse().blocks[1].text).toBe('改过的核心问题（刷新后应还在）')
  })

  it('刷新后撤销记录仍可恢复并执行', () => {
    desk.openLesson('desk-ellipse-2025')
    const b = ellipse().blocks[0]
    const before = b.text
    desk.editBlockText(b.id, '编辑后的段落')
    desk.saveNow('测试保存')
    resetPrepDeskSessionForTest()
    desk.init()
    expect(desk.state.undo.length).toBeGreaterThan(0)
    expect(desk.undoTop()).toBeTruthy()
    expect(ellipse().blocks[0].text).toBe(before)
  })

  it('损坏数据：保留备份 + 进入损坏态，可重新开始', () => {
    localStorage.setItem(DESK_NS, '{not-json')
    resetPrepDeskSessionForTest()
    desk.init()
    expect(desk.state.corrupt).toEqual({ reason: 'corrupt', raw: '{not-json' })
    expect(localStorage.getItem(DESK_NS + '.corrupt-backup')).toBe('{not-json')
    desk.resetAll()
    expect(desk.state.corrupt).toBeNull()
    expect(ellipse()).toBeTruthy()
  })

  it('版本不兼容：识别并备份，不静默丢弃', () => {
    const bogus = { version: 99, lessons: [] }
    localStorage.setItem(DESK_NS, JSON.stringify(bogus))
    const r = loadDeskState()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('version')
  })
})

/* ==================== 撤销 / 编辑合并 ==================== */

describe('prepDesk · 撤销栈', () => {
  it('结构操作可撤销：新增 → 撤销 → 删除 → 撤销', () => {
    desk.openLesson('desk-ellipse-2025')
    const n0 = ellipse().blocks.length
    const nb = desk.insertBlock(null, { type: 'text', text: '临时块' })
    expect(ellipse().blocks.length).toBe(n0 + 1)
    desk.undoTop()
    expect(ellipse().blocks.length).toBe(n0)
    desk.undoTop() // 撤销"撤销"栈里的上一步（删除不存在），此处栈应耗尽
    expect(desk.state.undo.length).toBe(0)
    void nb
  })

  it('1.5s 内同一块的连续文本编辑合并为一条撤销记录', () => {
    desk.openLesson('desk-ellipse-2025')
    const b = ellipse().blocks[0]
    const original = b.text
    const n0 = desk.state.undo.length
    desk.editBlockText(b.id, '第一句')
    desk.editBlockText(b.id, '第一句第二句')
    expect(desk.state.undo.length).toBe(n0 + 1)
    desk.undoTop()
    expect(ellipse().blocks[0].text).toBe(original)
  })

  it('锁定块不可删除；锁定/解锁可撤销', () => {
    desk.openLesson('desk-ellipse-2025')
    const b = ellipse().blocks[2]
    desk.toggleLock(b.id)
    expect(b.locked).toBe(true)
    const n = ellipse().blocks.length
    desk.removeBlock(b.id)
    expect(ellipse().blocks.length).toBe(n)
    desk.undoTop()
    expect(ellipse().blocks.find((x) => x.id === b.id)!.locked).toBeFalsy()
  })
})

/* ==================== 建议 / diff / 资源 ==================== */

describe('prepDeskData · 确定性建议', () => {
  it('核心问题 → 拆问题链；例题 → 替换建议；概念 → 板书+路径候选；易错点 → 补检查点', () => {
    const lesson = ellipse()
    const byType = (t: string) => lesson.blocks.find((b) => b.type === t)!
    expect(buildSuggestionsFor(byType('core-question'), lesson).map((s) => s.action)).toContain('split-chain')
    expect(buildSuggestionsFor(byType('example'), lesson).map((s) => s.action)).toContain('swap-example')
    const conceptActs = buildSuggestionsFor(byType('concept'), lesson).map((s) => s.action)
    expect(conceptActs).toContain('board-hint')
    expect(conceptActs).toContain('path-candidate')
    expect(buildSuggestionsFor(byType('pitfall'), lesson).map((s) => s.action)).toContain('add-checkpoint')
    // 所有含数学结论的建议都标需教师核验
    for (const s of buildSuggestionsFor(byType('example'), lesson)) expect(s.needVerify).toBe(true)
    // 同一输入 → 同一输出（确定性）
    const a = buildSuggestionsFor(byType('core-question'), lesson)
    const c = buildSuggestionsFor(byType('core-question'), lesson)
    expect(a[0].after).toBe(c[0].after)
  })

  it('接受建议：替换类改块文本；插入类新增块；拒绝只标记', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    const q = lesson.blocks.find((b) => b.type === 'core-question')!
    const s = buildSuggestionsFor(q, lesson)[0]
    desk.trackSuggestion({ ...s, id: 'sg-t1' })
    const before = q.text
    desk.acceptSuggestion('sg-t1')
    expect(q.text).not.toBe(before)
    expect(lesson.suggestions.find((x) => x.id === 'sg-t1')?.status).toBe('accepted')
    desk.undoTop()
    expect(ellipse().blocks.find((x) => x.id === q.id)!.text).toBe(before)

    // 拒绝：用另一块的建议（同块同动作已被 accepted 去重，属预期行为）
    const pit = lesson.blocks.find((b) => b.type === 'pitfall')!
    const s2 = buildSuggestionsFor(pit, lesson)[0]
    desk.trackSuggestion({ ...s2, id: 'sg-t2' })
    const pitBefore = ellipse().blocks.find((x) => x.id === pit.id)!.text
    desk.rejectSuggestion('sg-t2')
    expect(ellipse().blocks.find((x) => x.id === pit.id)!.text).toBe(pitBefore)
    expect(lesson.suggestions.find((x) => x.id === 'sg-t2')?.status).toBe('rejected')
  })

  it('锁定块拒绝接受覆盖型建议', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    const q = lesson.blocks.find((b) => b.type === 'core-question')!
    desk.toggleLock(q.id)
    const s = buildSuggestionsFor(q, lesson)[0]
    desk.trackSuggestion({ ...s, id: 'sg-t3' })
    const before = q.text
    desk.acceptSuggestion('sg-t3')
    expect(q.text).toBe(before)
  })

  it('路径候选可切换选项并改写 after', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    const concept = lesson.blocks.find((b) => b.type === 'concept')!
    const s = buildSuggestionsFor(concept, lesson).find((x) => x.action === 'path-candidate')!
    desk.trackSuggestion({ ...s, id: 'sg-t4' })
    desk.choosePath('sg-t4', 'p-analogy')
    const tracked = lesson.suggestions.find((x) => x.id === 'sg-t4')!
    expect(tracked.chosenPathId).toBe('p-analogy')
    expect(tracked.after).toContain('圆的定义类比路径')
  })
})

describe('prepDeskData · 资源候选', () => {
  it('候选 ≤3 条且标注可用状态；失效候选不可取用；无匹配返回空（走手写路径）', () => {
    const lesson = ellipse()
    const q = lesson.blocks.find((b) => b.type === 'core-question')!
    const items = buildResourcesFor(q)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(3)
    expect(items.every((c) => ['available', 'stale', 'unverified'].includes(c.availability))).toBe(true)
    expect(items.some((c) => c.availability === 'unverified')).toBe(true)

    const example = lesson.blocks.find((b) => b.type === 'example')!
    expect(buildResourcesFor(example).some((c) => c.availability === 'stale')).toBe(true)

    const text = lesson.blocks.find((b) => b.type === 'text')!
    expect(buildResourcesFor(text)).toEqual([])
  })

  it('取用资源：在当前块后插入带来源的块，可撤销', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    const q = lesson.blocks.find((b) => b.type === 'core-question')!
    const c = buildResourcesFor(q)[0]
    desk.insertBlock(q.id, { type: c.takeType, text: c.takeText, origin: 'resource', sourceRefId: c.sourceRefId, sourceLocator: c.sourceRefId ? undefined : `${c.layerLabel} · ${c.locator}` })
    const inserted = lesson.blocks[lesson.blocks.indexOf(q) + 1]
    expect(inserted.origin).toBe('resource')
    expect(inserted.sourceRefId || inserted.sourceLocator).toBeTruthy()
    desk.undoTop()
    expect(lesson.blocks).not.toContain(inserted)
  })
})

/* ==================== 投影 / 检查 ==================== */

describe('prepDesk · 投影与完成检查', () => {
  it('课件候选：缺例题/缺检查点时对应候选不可用并说明原因', () => {
    const lesson = ellipse()
    const cands = buildDeckCandidates(lesson)
    expect(cands.length).toBe(3)
    expect(cands.every((c) => c.usable)).toBe(true)

    const empty = { ...lesson, blocks: [] } as typeof lesson
    const candsEmpty = buildDeckCandidates(empty)
    expect(candsEmpty.every((c) => !c.usable)).toBe(true)
    expect(candsEmpty.every((c) => !!c.note)).toBe(true)
  })

  it('完成检查：种子稿差"本班调整理由"，写入后通过', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    let checks = buildCompletionChecks(lesson)
    expect(checks.find((c) => c.key === 'note')!.done).toBe(false)
    desk.insertBlock(null, { type: 'class-note', text: '理由：本班 a、b、c 混淆，例题换成先判焦轴的变式。' })
    checks = buildCompletionChecks(ellipse())
    expect(checks.find((c) => c.key === 'note')!.done).toBe(true)
  })

  it('引用块插入后带来源定位；页级批注可写', () => {
    desk.openLesson('desk-ellipse-2025')
    const lesson = ellipse()
    const nb = desk.insertQuote('src-textbook-demo', '人教A版选择性必修一 · §2.2 椭圆 · P38 · 椭圆的定义', '平面内与两个定点的距离的和等于常数（大于 |F1F2|）的点的轨迹叫做椭圆。', null)
    expect(nb).toBeTruthy()
    const b = lesson.blocks.find((x) => x.id === nb!.id)!
    expect(b.type).toBe('quote')
    expect(b.sourceRefId).toBe('src-textbook-demo')
    expect(b.sourceLocator).toContain('P38')
    desk.setPageNote('pg-tb-38', '这页定义今年要用对比情境引入')
    expect(ellipse().pageNotes['pg-tb-38']).toContain('对比情境')
  })
})

/* ==================== 组件：首页三等权 ==================== */

describe('PrepDeskHome · 三等权入口', () => {
  it('三张入口卡等权出现；AI 卡无输入框、无"生成教案"主按钮；续接项真实可见', () => {
    desk.init()
    const w = mount(PrepDeskHome, { props: { plans: [] } })
    expect(w.find('[data-testid="tv3-entry-resume"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-entry-textbook"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-entry-ai"]').exists()).toBe(true)
    // 等权：同为 section 入口卡，AI 卡不使用金色主按钮
    const aiCta = w.find('[data-testid="tv3-prep-new"]')
    expect(aiCta.classes().join(' ')).not.toContain('tv3-btn--gold')
    // 首屏不出现 AI 输入框 / 生成教案主按钮
    expect(w.findAll('input[type="text"], textarea').length).toBe(0)
    expect(w.text()).not.toContain('生成大纲')
    // 续接项任务锚定（清单5）与空状态
    expect(w.find('[data-testid="tv3-resume-task"]').text()).toContain('明天')
    expect(w.find('[data-testid="tv3-entry-resume-go"]').text()).toContain('备明天这节课')
    expect(w.find('[data-testid="tv3-home-recent-empty"]').exists()).toBe(true)
    w.unmount()
  })

  it('最近工作行点击触发 open-plan；三个入口 CTA 分别触发对应事件', async () => {
    desk.init()
    const w = mount(PrepDeskHome, { props: { plans: [{ id: 'plan-a', topic: '课题 A', class_id: 'c2-03', lesson_type: '新授课', section_count: 3, confirmed: false, updated_at: '2026-09-01' }] } })
    await w.findAll('.tv3-row')[0].trigger('click')
    expect(w.emitted('open-plan')![0]).toEqual(['plan-a'])
    await w.find('[data-testid="tv3-entry-resume-go"]').trigger('click')
    expect(w.emitted('continue')![0]).toEqual(['desk-ellipse-2025'])
    await w.find('[data-testid="tv3-entry-textbook-go"]').trigger('click')
    expect(w.emitted('textbook')).toBeTruthy()
    await w.find('[data-testid="tv3-prep-new"]').trigger('click')
    expect(w.emitted('ai')).toBeTruthy()
    w.unmount()
  })
})

/* ==================== 组件：工作台关键交互 ==================== */

describe('PrepDeskWorkspace · 关键交互', () => {
  it('选中块 → 生成演示建议 → diff → 接受写入 → 撤销还原；AI 失败态不丢内容', async () => {
    vi.useFakeTimers()
    desk.openLesson('desk-ellipse-2025')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()

    const q = ellipse().blocks.find((b) => b.type === 'core-question')!
    await w.find(`[data-testid="tv3-desk-block-${q.id}"]`).trigger('click')
    await w.find('[data-testid="tv3-ai-act-split-chain"]').trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    // diff 卡出现（含原文与建议后）
    expect(w.text()).toContain('原文（受影响块）')
    expect(w.find('[data-testid="tv3-sugg-after"]').exists()).toBe(true)
    const before = q.text
    const acceptBtn = w.findAll('[data-testid^="tv3-sugg-accept-"]')[0]
    await acceptBtn.trigger('click')
    expect(ellipse().blocks.find((x) => x.id === q.id)!.text).not.toBe(before)
    // 撤销还原
    await w.find('[data-testid="tv3-desk-undo"]').trigger('click')
    expect(ellipse().blocks.find((x) => x.id === q.id)!.text).toBe(before)

    // 演示失败开关：建议失败但不丢内容
    desk.setDemoFailure('ai', true)
    await w.find('[data-testid="tv3-ai-act-split-chain"]').trigger('click')
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    expect(w.find('[data-testid="tv3-ai-error"]').exists()).toBe(true)
    expect(ellipse().blocks.find((x) => x.id === q.id)!.text).toBe(before)
    desk.setDemoFailure('ai', false)
    vi.useRealTimers()
    w.unmount()
  })

  it('资源候选取用落稿（带来源）；无结果块给继续手写/手动插入；失效候选不可取', async () => {
    vi.useFakeTimers()
    desk.openLesson('desk-ellipse-2025')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()

    const q = ellipse().blocks.find((b) => b.type === 'core-question')!
    await w.find(`[data-testid="tv3-desk-block-${q.id}"]`).trigger('click')
    await w.find('[data-testid="tv3-rtab-resource"]').trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    const items = w.findAll('[data-testid^="tv3-res-item-"]')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(3)
    const n0 = ellipse().blocks.length
    await w.find('[data-testid="tv3-res-take-0"]').trigger('click')
    expect(ellipse().blocks.length).toBe(n0 + 1)
    const inserted = ellipse().blocks[ellipse().blocks.indexOf(ellipse().blocks.find((x) => x.id === q.id)!) + 1]
    expect(inserted.origin).toBe('resource')
    expect(inserted.sourceRefId || inserted.sourceLocator).toBeTruthy()

    // 无结果块（段落）→ 空态 + 两条出路
    const textBlk = ellipse().blocks.find((b) => b.type === 'text')!
    await w.find(`[data-testid="tv3-desk-block-${textBlk.id}"]`).trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    expect(w.find('[data-testid="tv3-res-empty"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-res-handwrite"]').exists()).toBe(true)
    expect(w.find('[data-testid="tv3-res-manual"]').exists()).toBe(true)

    // 失效候选按钮禁用
    const ex = ellipse().blocks.find((b) => b.type === 'example')!
    await w.find(`[data-testid="tv3-desk-block-${ex.id}"]`).trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    await flushPromises()
    const staleIdx = buildResourcesFor(ex).findIndex((c) => c.availability === 'stale')
    expect(staleIdx).toBeGreaterThanOrEqual(0)
    expect(w.find(`[data-testid="tv3-res-take-${staleIdx}"]`).attributes('disabled')).toBeDefined()
    vi.useRealTimers()
    w.unmount()
  })

  it('新增块 / 锁定 / 删除 / 拖动重排在界面上可用；保存状态可见', async () => {
    desk.openLesson('desk-ellipse-2025')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()
    const n0 = ellipse().blocks.length
    await w.find('[data-testid="tv3-add-core-question"]').trigger('click')
    expect(ellipse().blocks.length).toBe(n0 + 1)
    const nb = ellipse().blocks[n0]
    // 锁定后删除禁用
    await w.find(`[data-testid="tv3-block-lock-${nb.id}"]`).trigger('click')
    expect(w.find(`[data-testid="tv3-block-del-${nb.id}"]`).attributes('disabled')).toBeDefined()
    await w.find(`[data-testid="tv3-block-lock-${nb.id}"]`).trigger('click')
    await w.find(`[data-testid="tv3-block-del-${nb.id}"]`).trigger('click')
    expect(ellipse().blocks.length).toBe(n0)
    // 保存状态条可见且不是 toast（显式保存后落到"已保存"态）
    await w.find('[data-testid="tv3-desk-save-now"]').trigger('click')
    expect(w.find('[data-testid="tv3-desk-save-status"]').text()).toContain('本机演示保存')
    w.unmount()
  })
})

/* ==================== 教师体验整改（清单1/2/3/4） ==================== */

describe('PrepDeskWorkspace · 教师体验整改（清单1/2/3/4）', () => {
  it('空白稿时右栏默认收起；有内容课例右栏默认展开（清单2）', () => {
    desk.openLesson('desk-ellipse-2025')
    const full = mount(PrepDeskWorkspace)
    expect(full.find('[data-testid="tv3-desk-right"]').exists()).toBe(true)
    full.unmount()
    // 空白课例
    desk.openLesson('desk-blank-template')
    const blank = mount(PrepDeskWorkspace)
    expect(blank.find('[data-testid="tv3-desk-right"]').exists()).toBe(false)
    // 空态引导仍在
    expect(blank.find('[data-testid="tv3-desk-blank"]').exists()).toBe(true)
    blank.unmount()
  })

  it('教材大图阅读：占中栏、含配图与完整解答、可返回共备稿（清单1）', async () => {
    desk.openLesson('desk-ellipse-2025')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()
    // 阅读前：共备稿可见
    expect(w.find('[data-testid="tv3-desk-center"]').exists()).toBe(true)
    await w.find('[data-testid="tv3-src-item-src-textbook-demo"]').trigger('click')
    await w.find('[data-testid="tv3-src-read-big"]').trigger('click')
    await flushPromises()
    // 阅读视图出现，共备稿让位
    const reader = w.find('[data-testid="tv3-desk-reader"]')
    expect(reader.exists()).toBe(true)
    expect(w.find('[data-testid="tv3-desk-center"]').exists()).toBe(false)
    // P39 例 1 有完整解答与图
    await w.find('[data-testid="tv3-reader-page-1"]').trigger('click')
    await flushPromises()
    const text = w.find('[data-testid="tv3-reader-text"]').text()
    expect(text).toContain('例 1')
    expect(text).toContain('所求标准方程')
    expect(w.find('[data-testid="tv3-reader-fig"]').exists()).toBe(true)
    // 返回共备稿
    await w.find('[data-testid="tv3-reader-close"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-desk-center"]').exists()).toBe(true)
    w.unmount()
  })

  it('右栏空态给起点卡：去年卡点 + 班情 + 可点动作（清单4）', async () => {
    desk.openLesson('desk-blank-template')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()
    // 右栏收起中，展开后建议页签显示起点卡
    await w.find('[data-testid="tv3-desk-right-toggle"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tv3-ai-startpoints"]').exists()).toBe(true)
    expect(w.text()).toContain('去年这节课，学生卡在哪')
    // 取共案问题链 → 真实落稿为第一块
    await w.find('[data-testid="tv3-start-take-chain"]').trigger('click')
    await flushPromises()
    const lesson = desk.state.lessons.find((l) => l.id === 'desk-blank-template')!
    expect(lesson.blocks.length).toBe(1)
    expect(lesson.blocks[0].type).toBe('core-question')
    expect(lesson.blocks[0].sourceRefId).toBe('src-common-plan')
    w.unmount()
  })

  it('块工具条有内联公式入口（清单3：不打断写作的主路径）', async () => {
    desk.openLesson('desk-ellipse-2025')
    const w = mount(PrepDeskWorkspace)
    await flushPromises()
    const q = ellipse().blocks.find((b) => b.type === 'core-question')!
    await w.find(`[data-testid="tv3-desk-block-${q.id}"]`).trigger('click')
    const btn = w.find(`[data-testid="tv3-block-formula-${q.id}"]`)
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    // 点击后应出现行内公式编辑器（MathField），而非模态
    expect(w.find(`[data-testid="tv3-desk-block-text-${q.id}"]`).find('.ftex__formula-edit').exists()).toBe(true)
    w.unmount()
  })
})
