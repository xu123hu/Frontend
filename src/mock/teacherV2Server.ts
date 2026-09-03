/**
 * 教师工作台 V2 · Mock 服务（挂载 /api/teacher-v2/*）
 * 契约依据：D:\teacher-research\01-frontend\design\DESIGN-V2.md §四
 * 数据闭环（链路卡验收）：
 *  - 批改页打的教师错因标签 → insights/overview 聚类可见（B）
 *  - 资源候选审核通过 → quiz/questions 可检索到（C）
 *  - 管家对话动作 → 真实创建任务，任务中心可跟踪（D）
 */
import {
  ARITH_PLAN, ELLIPSE_DECK, ELLIPSE_PLAN, MONO_PLAN, V2_ALL_QUESTIONS, V2_CANDIDATES, V2_CLASSES, V2_INSIGHTS, V2_KP_TREE,
  V2_QUESTIONS, V2_QUESTIONS_DC, V2_QUESTIONS_MONO, V2_RESOURCES, V2_ROSTER_3, V2_ROSTER_5, V2_TEMPLATES, V2_TEACHER,
  V2_TEXTBOOK_TREE, iso, seededRandom, v2ClassBriefs, v2Schedule, v2Todos,
} from './teacherV2Data'
import type { TeacherTask } from '@/types/teacher'
import type {
  V2Assignment, V2CandidateQuestion, V2LessonPlan, V2Paper, V2Question, V2ReviewPack, V2Slide, V2SlideDeck,
  V2SlideElement, V2Submission, V2TodayData,
} from '@/types/teacherV2'

function readBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let buf = ''
    req.on('data', (c: any) => { buf += c })
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}) } catch { resolve({}) } })
  })
}
function ok(res: any, data: unknown) {
  if (res.headersSent || res.writableEnded) return
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ code: 0, message: 'ok', data }))
}
function fail(res: any, status: number, code: number, message: string) {
  if (res.headersSent || res.writableEnded) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ code, message, data: null }))
}
function sendSse(res: any, event: string, data: unknown) {
  if (res.writableEnded || res.destroyed) return
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}
function startSse(res: any) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 3000\n\n')
}
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
let seq = 100
const nextId = (p: string) => `${p}-${seq++}`
const isTeacher = (req: any) => (req.headers?.authorization || '').includes('mock-token-teacher-preview')

/* ================= 内存状态 ================= */
let plans = new Map<string, V2LessonPlan>()
let decks = new Map<string, V2SlideDeck>()
let papers = new Map<string, V2Paper>()
let assignments = new Map<string, V2Assignment>()
let submissionsByAssign = new Map<string, V2Submission[]>()
let reviewPacks = new Map<string, V2ReviewPack>()
let teacherTags = new Map<string, { tag: string; count: number; kp_code: string; kp_name: string }[]>()
let schoolQuestions: V2Question[] = []
let candidates: V2CandidateQuestion[] = []
let tasks = new Map<string, TeacherTask>()
let sessions = new Map<string, any>()
let questionBank: V2Question[] = [...V2_ALL_QUESTIONS]

function rosterOf(classId: string): string[] {
  return classId === 'cls-g2-5' ? V2_ROSTER_5 : V2_ROSTER_3
}
function classOf(classId: string) {
  return V2_CLASSES.find((c) => c.class_id === classId) || V2_CLASSES[0]
}

/* ---------- 任务状态机（400/900ms 节奏，与旧版一致） ---------- */
function createTask(capability: string, stage: string, artifactId: string | null = null, onDone?: () => void): TeacherTask {
  const t: TeacherTask = {
    task_id: nextId('task'), capability, status: 'queued', progress: 0, stage,
    artifact_id: artifactId, error_code: null, created_at: iso(), updated_at: iso(),
  }
  tasks.set(t.task_id, t)
  setTimeout(() => {
    const cur = tasks.get(t.task_id)
    if (!cur || cur.status === 'cancelled') return
    cur.status = 'running'; cur.progress = 45; cur.stage = stage; cur.updated_at = iso()
  }, 400)
  setTimeout(() => {
    const cur = tasks.get(t.task_id)
    if (!cur || cur.status === 'cancelled') return
    cur.status = 'succeeded'; cur.progress = 100; cur.stage = '完成'; cur.updated_at = iso()
    if (onDone) onDone()
  }, 1100)
  return t
}
function taskView(t: TeacherTask): TeacherTask {
  if (t.status === 'succeeded' || t.status === 'failed' || t.status === 'cancelled') return t
  const elapsed = Date.now() - new Date(t.created_at || iso()).getTime()
  if (elapsed >= 1100) return { ...t, status: 'succeeded', progress: 100, stage: '完成' }
  if (elapsed >= 400) return { ...t, status: 'running', progress: 45, stage: t.stage }
  return t
}

/* ---------- 副课题（单调性复习课）教案补全：数据包仅给了骨架 ---------- */
function monoPlan(): V2LessonPlan {
  const base = clone(MONO_PLAN) as V2LessonPlan
  base.outline = [
    { id: 'o1', kind: '梳理', title: '单调性定义回顾', minutes: 6, summary: '符号语言复述定义，辨析「任意性」' },
    { id: 'o2', kind: '方法', title: '判断单调性的三条路径', minutes: 8, summary: '图象法、定义法、导数法（高二衔接）' },
    { id: 'o3', kind: '例题', title: '例 · 定义法证明', minutes: 12, summary: '一设二作差三变形四判定，规范步骤' },
    { id: 'o4', kind: '变式', title: '变式 · 含参单调性', minutes: 10, summary: '分类讨论参数 a 的取值' },
    { id: 'o5', kind: '小结', title: '结构化小结', minutes: 4, summary: '定义 → 方法选择树 → 易错清单' },
  ]
  base.sections = [
    { id: 's1', phase: '定义回顾', minutes: 6, teacher_activity: '引导学生用符号语言复述增减函数定义，追问「任意」二字能否去掉', student_activity: '复述定义并举例说明「任意」的必要性', design_intent: '针对证明步骤缺失错因（45%），先固化定义表达', content_items: ['定义：∀x₁<x₂，f(x₁)<f(x₂)'] },
    { id: 's2', phase: '方法梳理', minutes: 8, teacher_activity: '板书三条路径的选择树：图象法（快而不严）、定义法（严谨通用）、导数法（下学期主线）', student_activity: '整理方法对比表', design_intent: '建立方法选择的元认知', content_items: ['方法选择树'] },
    { id: 's3', phase: '例题精讲', minutes: 12, teacher_activity: '讲解：证明 f(x)=x³ 在 R 上单调递增。示范「设元—作差—变形—定号」四步', student_activity: '跟写完整证明，同桌互查变形步骤', design_intent: '定义法证明的规范书写（本班失分主因）', content_items: ['例题完整解答'] },
    { id: 's4', phase: '变式训练', minutes: 10, teacher_activity: '出示变式：f(x)=x³+ax 在 [1,+∞) 单调递增，求 a 范围', student_activity: '独立完成，2 人板演分类讨论', design_intent: '含参讨论提升思维层级', content_items: ['变式题'] },
    { id: 's5', phase: '小结作业', minutes: 4, teacher_activity: '小结方法主线，布置分层作业', student_activity: '完善笔记结构图', design_intent: '结构化收束', content_items: ['A 组：教材 P82 复习参考题 3', 'B 组：恒成立综合题'] },
  ]
  base.board_design = '左：定义与方法选择树\n中：例题完整证明（四步标注）\n右：变式分类讨论表'
  base.homework = [
    { tier: 'A 组 · 全体', items: ['教材 P82 复习参考题 A 组第 3、4 题'] },
    { tier: 'B 组 · 选做', items: ['已知 f(x)=x³+ax 在 [1,+∞) 单调递增，求 a 的取值范围'] },
  ]
  base.quality_check = base.quality_check.map((c) => ({ ...c, pass: true }))
  base.version = 2
  base.status = 'draft'
  return base
}

function seed() {
  plans = new Map()
  decks = new Map()
  papers = new Map()
  assignments = new Map()
  submissionsByAssign = new Map()
  reviewPacks = new Map()
  teacherTags = new Map()
  schoolQuestions = []
  candidates = []
  tasks = new Map()
  sessions = new Map()
  questionBank = [...V2_ALL_QUESTIONS]

  const ellipse = clone(ELLIPSE_PLAN) as V2LessonPlan
  ellipse.status = 'confirmed'
  plans.set(ellipse.plan_id, ellipse)
  plans.set('plan-mono-001', monoPlan())
  plans.set('plan-arith-001', clone(ARITH_PLAN) as V2LessonPlan)

  // 已有课件（承接链路卡 A：today 显示课件已生成 60% → 这里给一版可继续编辑的初稿）
  const deck = clone(ELLIPSE_DECK) as V2SlideDeck
  deck.version = 1
  decks.set(deck.deck_id, deck)

  // 种子作业：昨晚预习单（批改队列入口，链路卡 B 起点）
  const assign: V2Assignment = {
    assignment_id: 'assign-pre-001',
    title: '椭圆预习单（8 月 31 日晚）',
    class_id: 'cls-g2-3', class_name: '高二 3 班',
    kp_name: '椭圆的定义',
    due_at: '09-01 07:40',
    tiers: [
      { tier: 'base', label: '基础组', student_count: 46, items: ['预习单 3 题'] },
    ],
    status: 'grading', submitted: 46, total: 46,
  }
  assignments.set(assign.assignment_id, assign)
  submissionsByAssign.set(assign.assignment_id, genSubmissions('cls-g2-3'))
}

/* ---------- 批改队列：46 份确定性生成，5 份低置信度 ---------- */
function genSubmissions(classId: string): V2Submission[] {
  const roster = rosterOf(classId)
  const rand = seededRandom(classId === 'cls-g2-5' ? 55 : 33)
  const consolid = (V2_INSIGHTS[classId]?.tier_lists.find((t) => t.tier === 'consolid')?.students) || []
  const challenge = (V2_INSIGHTS[classId]?.tier_lists.find((t) => t.tier === 'challenge')?.students) || []
  return roster.map((name, i) => {
    const tier = consolid.includes(name) ? 'base' : challenge.includes(name) ? 'challenge' : 'consolid'
    const isLow = i % 9 === 4 && i < 46 // 恰好 5 份低置信度（i=4,13,22,31,40）
    const correct = isLow ? 1 : Math.min(3, Math.max(0, Math.round(rand() * 3 + (tier === 'challenge' ? 2.4 : tier === 'consolid' ? 1.3 : 0.9))))
    const suggested = Math.round((correct / 3) * 100 * (isLow ? 0.85 : 0.97) * 10) / 10
    return {
      submission_id: `sub-${classId.slice(-1)}-${String(i + 1).padStart(2, '0')}`,
      student: { user_id: `stu-${i + 1}`, name, tier: tier as 'base' | 'consolid' | 'challenge' },
      submitted_at: `09-01 ${String(19 + (i % 3)).padStart(2, '0')}:${String(10 + (i % 40)).padStart(2, '0')}`,
      objective: { total: 3, correct },
      ai_suggested_score: Math.max(30, Math.min(100, suggested)),
      ai_confidence: isLow ? 'low' : rand() > 0.35 ? 'high' : 'mid',
      needs_manual: isLow,
      error_tags: correct < 3
        ? [{ tag: correct === 0 ? '概念混淆 · 忽略定义条件' : '运算失误 · 平方化简跳步', source: 'ai' as const }]
        : [],
      final_score: null,
      teacher_feedback: null,
      work_image_hint: `扫描件 · 第 ${1 + (i % 2)} 页（共 2 页）`,
    }
  })
}

/* ---------- 课件：从教案生成（椭圆走元素级数据，其余走程序合成） ---------- */
function buildDeckFromPlan(plan: V2LessonPlan, templateId: string): V2SlideDeck {
  const topic = plan.topic || ''
  if (topic.includes('椭圆')) {
    const deck = clone(ELLIPSE_DECK) as V2SlideDeck
    deck.template_id = templateId || deck.template_id
    deck.version = 1
    deck.exported_at = null
    return deck
  }
  const qs = topic.includes('单调') ? V2_QUESTIONS_MONO : topic.includes('等差') ? V2_QUESTIONS_DC : V2_QUESTIONS
  const ex = qs.filter((q) => q.q_type === 'solution').slice(0, 2)
  const slides: V2Slide[] = []
  const push = (id: string, kind: V2Slide['kind'], title: string, elements: V2Slide['elements']) => slides.push({ id, kind, title, elements })
  const T = (id: string, left: number, top: number, width: number, html: string, fontSize: number, color: string, bold = false) =>
    ({ id, left, top, width, height: 60, type: 'text' as const, html, fontSize, color, bold })
  push('ms-1', 'cover', '封面', [
    T('e1', 140, 200, 1000, plan.topic, 44, '#FFFFFF', true),
    T('e2', 340, 320, 600, plan.textbook_ref, 18, '#93B4F5'),
    T('e3', 340, 380, 600, `${plan.class_name} · 数学 · 李文澜`, 16, '#6B8AC9'),
  ])
  push('ms-2', 'objective', '学习目标', [
    T('e1', 100, 70, 800, '学习目标', 30, '#3B82F6', true),
    ...plan.objectives.map((o, i) => T(`e${i + 2}`, 100, 170 + i * 80, 1080, `${i + 1}. ${o}`, 20, '#E6EDF7')),
  ])
  push('ms-3', 'summary', '复习结构', [
    T('e1', 100, 70, 900, '知识结构', 30, '#3B82F6', true),
    ...plan.outline.map((o, i) => T(`e${i + 2}`, 100, 160 + i * 70, 1080, `${o.title}（${o.minutes} 分钟）— ${o.summary}`, 19, '#E6EDF7')),
  ])
  ex.forEach((q, i) => {
    push(`ms-${4 + i}`, 'example', `例 ${i + 1}`, [
      T('e1', 100, 70, 900, `例 ${i + 1}`, 30, '#2F855A', true),
      T('e2', 110, 160, 1060, q.stem, 20, '#FFFFFF'),
      T('e3', 110, 420, 1060, q.analysis.solution, 18, '#E6EDF7'),
    ])
  })
  push('ms-6', 'homework', '作业', [
    T('e1', 100, 70, 900, '分层作业', 30, '#3B82F6', true),
    ...plan.homework.flatMap((h, i) => [
      T(`t${i}`, 110, 170 + i * 120, 1060, h.tier, 18, '#F59E0B', true),
      T(`i${i}`, 110, 220 + i * 120, 1060, h.items.join('；'), 18, '#E6EDF7'),
    ]),
  ])
  return {
    deck_id: nextId('deck'), title: plan.topic, class_id: plan.class_id, class_name: plan.class_name,
    template_id: templateId || 'math-theorem-dark', slides, version: 1, plan_id: plan.plan_id, exported_at: null,
  }
}

/* ---------- 组卷：参数选择 + 缺口明示 ---------- */
function composePaper(body: any): V2Paper {
  const counts = body.counts || { choice: 6, fill: 4, solution: 2 }
  const ratio = body.difficulty_ratio || { basic: 3, medium: 5, hard: 2 }
  const kpCodes: string[] = body.kp_codes?.length ? body.kp_codes : ['KP-TY', 'KP-BZ']
  const pool = questionBank.filter((q) => kpCodes.includes(q.kp_code))
  const total = counts.choice + counts.fill + counts.solution
  const ratioSum = ratio.basic + ratio.medium + ratio.hard
  const want = (d: 'basic' | 'medium' | 'hard') => Math.round((ratio[d] / ratioSum) * total)

  const picked: V2Question[] = []
  const used = new Set<string>()
  const gaps: V2Paper['gaps'] = []
  const byDiff: Record<string, V2Question[]> = { basic: [], medium: [], hard: [] }
  pool.forEach((q) => { if (!used.has(q.question_id)) byDiff[q.difficulty].push(q) })
  ;(['basic', 'medium', 'hard'] as const).forEach((d) => {
    const need = want(d)
    const avail = byDiff[d]
    if (avail.length < need) {
      gaps.push({
        kp_name: kpCodes.length === 1 ? (pool[0]?.kp_name || '所选知识点') : `${kpCodes.length} 个知识点（${pool[0]?.kp_name || ''} 等）`,
        requested: need, available: avail.length,
        action: avail.length === 0 ? '该难度暂无题源，建议上传校本习题集补充' : `已用 ${avail.length} 题补齐，缺口 ${need - avail.length} 题`,
      })
    }
    avail.slice(0, need).forEach((q) => { picked.push(q); used.add(q.question_id) })
  })
  // 按题型排序：选择 → 填空 → 解答
  const order = { choice: 0, fill: 1, solution: 2 }
  picked.sort((a, b) => order[a.q_type] - order[b.q_type])

  const scoreMap: Record<string, number> = { choice: 5, fill: 5, solution: 12 }
  const items = picked.map((q, i) => ({ seq: i + 1, question: { ...q, score: scoreMap[q.q_type] } }))
  const scene = body.scene || 'exam'
  return {
    paper_id: nextId('paper'),
    title: body.title || `${kpCodes.length === 1 ? pool[0]?.kp_name || '综合' : '圆锥曲线'}${scene === 'exam' ? '周测卷' : scene === 'quiz' ? '当堂检测' : '分层作业'}`,
    scene, duration_minutes: scene === 'exam' ? 90 : scene === 'quiz' ? 40 : 35,
    total_score: items.reduce((s, it) => s + it.question.score, 0),
    items, gaps, created_at: iso(),
  }
}

/* ================= 路由入口 ================= */
export async function handleTeacherV2Api(req: any, res: any): Promise<boolean> {
  const [url] = (req.url || '').split('?')
  const qs = new URLSearchParams((req.url || '').split('?')[1] || '')
  const method = req.method
  const seg = url.split('/').filter(Boolean)
  if (seg[0] !== 'teacher-v2') return false
  if (!isTeacher(req)) { fail(res, 403, 40301, 'role_denied'); return true }
  const body = method === 'GET' ? {} : await readBody(req)

  /* ---------- 今日工作台 ---------- */
  if (method === 'GET' && url === '/teacher-v2/today') {
    const data: V2TodayData = {
      teacher: { name: V2_TEACHER.name, greeting: '上午好' },
      date_label: '9 月 2 日 · 周三',
      schedule: v2Schedule(), todos: v2Todos(), classes: v2ClassBriefs(),
      tomorrow_preview: { time_range: '08:10 - 08:55', class_name: '高二 5 班', topic: '函数的单调性（复习课）' },
    }
    ok(res, data); return true
  }

  /* ---------- 教案 ---------- */
  if (method === 'POST' && url === '/teacher-v2/lesson-plans/generate') {
    const topic = String(body.topic || '')
    const classId = body.class_id || 'cls-g2-3'
    const base = topic.includes('单调') ? monoPlan() : topic.includes('等差') ? clone(ARITH_PLAN) as V2LessonPlan : clone(ELLIPSE_PLAN) as V2LessonPlan
    const plan: V2LessonPlan = {
      ...base,
      plan_id: nextId('plan'), topic: topic || base.topic, class_id: classId, class_name: classOf(classId).class_name,
      status: 'draft', version: 1, updated_at: iso(),
      design_basis: base.design_basis || null,
    }
    plans.set(plan.plan_id, plan)
    startSse(res)
    sendSse(res, 'meta', { plan_id: plan.plan_id, topic: plan.topic, class_name: plan.class_name, design_basis: plan.design_basis })
    const t1 = setTimeout(() => sendSse(res, 'outline', { outline: plan.outline }), 700)
    let acc = 1400
    const timers: any[] = [t1]
    plan.sections.forEach((s, i) => {
      timers.push(setTimeout(() => sendSse(res, 'section', { section: s, index: i + 1, total: plan.sections.length }), acc))
      acc += 550
    })
    timers.push(setTimeout(() => { sendSse(res, 'done', { plan }); res.end() }, acc + 300))
    req.on('close', () => timers.forEach(clearTimeout))
    return true
  }
  if (method === 'GET' && seg[1] === 'lesson-plans' && seg[2] && !seg[3]) {
    const plan = plans.get(seg[2])
    if (!plan) { fail(res, 404, 40400, '教案不存在'); return true }
    ok(res, plan); return true
  }
  if (method === 'GET' && url === '/teacher-v2/lesson-plans') {
    ok(res, { items: [...plans.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }); return true
  }
  if (method === 'PATCH' && seg[1] === 'lesson-plans' && seg[2]) {
    const plan = plans.get(seg[2])
    if (!plan) { fail(res, 404, 40400, '教案不存在'); return true }
    if (body.version !== undefined && body.version !== plan.version) { fail(res, 409, 40901, 'version_conflict'); return true }
    const patch = body.patch || body
    ;(['objectives', 'key_point', 'difficulty_point', 'aids', 'sections', 'homework', 'board_design'] as const).forEach((k) => {
      if (patch[k] !== undefined) (plan as any)[k] = patch[k]
    })
    plan.version += 1
    plan.updated_at = iso()
    ok(res, plan); return true
  }
  if (method === 'POST' && seg[1] === 'lesson-plans' && seg[2] && seg[3] === 'confirm') {
    const plan = plans.get(seg[2])
    if (!plan) { fail(res, 404, 40400, '教案不存在'); return true }
    plan.status = 'confirmed'
    plan.version += 1
    plan.updated_at = iso()
    ok(res, plan); return true
  }

  /* ---------- 课件 ---------- */
  if (method === 'GET' && url === '/teacher-v2/slides/templates') { ok(res, { items: V2_TEMPLATES }); return true }
  if (method === 'GET' && url === '/teacher-v2/slides') {
    ok(res, { items: [...decks.values()].map((d) => ({ deck_id: d.deck_id, title: d.title, class_name: d.class_name, template_id: d.template_id, slide_count: d.slides.length, version: d.version })) })
    return true
  }
  if (method === 'POST' && url === '/teacher-v2/slides/generate') {
    const plan = plans.get(body.plan_id) || plans.get('plan-ellipse-001')!
    const deck = buildDeckFromPlan(plan, body.template_id)
    decks.set(deck.deck_id, deck)
    startSse(res)
    sendSse(res, 'meta', { deck_id: deck.deck_id, title: deck.title, class_name: deck.class_name, slide_count: deck.slides.length })
    const t1 = setTimeout(() => sendSse(res, 'outline', { slides: deck.slides.map((s, i) => ({ index: i + 1, id: s.id, kind: s.kind, title: s.title })) }), 600)
    const timers: any[] = [t1]
    let acc = 1100
    deck.slides.forEach((s, i) => {
      timers.push(setTimeout(() => sendSse(res, 'page', { index: i + 1, total: deck.slides.length, slide: s }), acc))
      acc += 260
    })
    timers.push(setTimeout(() => { sendSse(res, 'done', { deck }); res.end() }, acc + 200))
    req.on('close', () => timers.forEach(clearTimeout))
    return true
  }
  if (method === 'GET' && seg[1] === 'slides' && seg[2] && !seg[3]) {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    ok(res, deck); return true
  }
  /* ---------- 大纲编辑：增页 / 删页 / 改页（页类型与标题） ---------- */
  const slideScaffold = (kind: V2Slide['kind'], title: string, deck: V2SlideDeck): V2Slide => {
    const T = (id: string, left: number, top: number, width: number, html: string, fontSize: number, color: string, bold = false) =>
      ({ id, left, top, width, height: 60, type: 'text' as const, html, fontSize, color, bold })
    const topic = (deck.title || '').replace(/^\d+(\.\d+)*\s*/, '')
    if (kind === 'cover') return { id: nextId('pg'), kind, title: title || '封面', elements: [
      T('e1', 140, 200, 1000, title || deck.title, 44, '#FFFFFF', true),
      T('e2', 340, 330, 600, `${deck.class_name} · 数学 · 李文澜`, 16, '#6B8AC9'),
    ] }
    if (kind === 'objective') return { id: nextId('pg'), kind, title: title || '学习目标', elements: [
      T('e1', 100, 70, 900, title || '学习目标', 30, '#3B82F6', true),
      T('e2', 100, 170, 1080, `1. 理解「${topic}」的核心概念与成立条件`, 20, '#E6EDF7'),
      T('e3', 100, 250, 1080, '2. 掌握规范的解题步骤，能独立完成中档难度问题', 20, '#E6EDF7'),
      T('e4', 100, 330, 1080, '3. 体会数形结合与由特殊到一般的思想方法，提升数学运算与逻辑推理素养', 20, '#E6EDF7'),
    ] }
    if (kind === 'explore') return { id: nextId('pg'), kind, title: title || '课堂探究', elements: [
      T('e1', 100, 70, 900, title || '课堂探究', 30, '#F59E0B', true),
      T('e2', 100, 170, 1080, `问题：${topic}中蕴含的规律是什么？动手试一试，记录你的发现。`, 20, '#E6EDF7'),
      T('e3', 100, 260, 1080, '小组任务：① 先独立思考 2 分钟；② 组内交流各自的观察；③ 代表汇报结论与依据。', 18, '#93B4F5'),
    ] }
    if (kind === 'example' || kind === 'variant') {
      const plan = plans.get(deck.plan_id || '')
      const pt = plan?.topic || ''
      const qs = pt.includes('单调') ? V2_QUESTIONS_MONO : pt.includes('等差') ? V2_QUESTIONS_DC : V2_QUESTIONS
      const sols = qs.filter((x) => x.q_type === 'solution')
      const q = (kind === 'variant' ? sols[1] : sols[0]) || sols[0] || qs[0]
      const diff = (q?.difficulty || 'medium') as string
      return { id: nextId('pg'), kind, title: title || (kind === 'example' ? '例题' : '变式'), elements: [
        T('e1', 100, 70, 900, title || (kind === 'example' ? '例题' : '变式练习'), 30, '#2F855A', true),
        T('e2', 110, 160, 1060, q?.stem || '补充例题', 20, '#FFFFFF'),
        T('e3', 110, 290, 1060, q?.analysis?.solution || '', 18, '#E6EDF7'),
        T('e4', 110, 400, 1060, `来源：${q?.source === 'school' ? '校本题库' : '官方题库'} · 难度 ${diff === 'basic' ? '基础' : diff === 'medium' ? '中档' : '压轴'}`, 15, '#93B4F5'),
      ] }
    }
    if (kind === 'summary') return { id: nextId('pg'), kind, title: title || '课堂小结', elements: [
      T('e1', 100, 70, 900, title || '课堂小结', 30, '#3B82F6', true),
      T('e2', 100, 170, 1080, '知识主线：定义 → 性质 → 方法 → 应用', 20, '#E6EDF7'),
      T('e3', 100, 250, 1080, '方法选择：先判断类型，再选工具，最后规范书写', 20, '#E6EDF7'),
      T('e4', 100, 330, 1080, '易错提醒：条件检验不可省略；运算跳步是本班主要失分点', 18, '#F6AD55'),
    ] }
    if (kind === 'homework') return { id: nextId('pg'), kind, title: title || '分层作业', elements: [
      T('e1', 100, 70, 900, title || '分层作业', 30, '#0E9488', true),
      T('e2', 100, 170, 1080, 'A 组 · 全体：教材本节练习第 1、2 题', 20, '#E6EDF7'),
      T('e3', 100, 250, 1080, 'B 组 · 选做：本节配套中档综合题（含分类讨论）', 20, '#E6EDF7'),
      T('e4', 100, 330, 1080, '提交方式：学生端拍照上传 · 明日 08:00 截止', 16, '#93B4F5'),
    ] }
    return { id: nextId('pg'), kind: 'end', title: title || '谢谢', elements: [
      T('e1', 420, 280, 440, title || '本节课结束 · 谢谢', 40, '#FFFFFF', true),
      T('e2', 470, 400, 340, `${deck.class_name} · 数学`, 18, '#6B8AC9'),
    ] }
  }
  if (method === 'POST' && seg[1] === 'slides' && seg[2] && seg[3] === 'pages' && !seg[4]) {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    const kinds: V2Slide['kind'][] = ['cover', 'objective', 'explore', 'example', 'variant', 'summary', 'homework', 'end']
    const kind = kinds.includes(body.kind) ? body.kind : 'example'
    const slide = slideScaffold(kind, String(body.title || ''), deck)
    const afterIdx = body.after_page_id ? deck.slides.findIndex((s) => s.id === body.after_page_id) : deck.slides.length - 1
    deck.slides.splice(afterIdx + 1, 0, slide)
    deck.version += 1
    ok(res, { slide, deck }); return true
  }
  if (method === 'DELETE' && seg[1] === 'slides' && seg[2] && seg[3] === 'pages' && seg[4]) {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    if (deck.slides.length <= 1) { fail(res, 400, 40001, '至少保留一页'); return true }
    const idx = deck.slides.findIndex((s) => s.id === seg[4])
    if (idx < 0) { fail(res, 404, 40400, '页面不存在'); return true }
    deck.slides.splice(idx, 1)
    deck.version += 1
    ok(res, { removed: seg[4], deck }); return true
  }
  if (method === 'PATCH' && seg[1] === 'slides' && seg[2] && seg[3] === 'pages' && seg[4]) {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    const slide = deck.slides.find((s) => s.id === seg[4])
    if (!slide) { fail(res, 404, 40400, '页面不存在'); return true }
    if (typeof body.title === 'string' && body.title.trim()) {
      slide.title = body.title.trim()
      const head = slide.elements.find((e): e is Extract<V2SlideElement, { type: 'text' }> => e.type === 'text')
      if (head) head.html = slide.title
    }
    if (body.kind && body.kind !== slide.kind) {
      const rebuilt = slideScaffold(body.kind, slide.title, deck)
      rebuilt.id = slide.id
      rebuilt.remark = slide.remark
      deck.slides[deck.slides.indexOf(slide)] = rebuilt
    }
    deck.version += 1
    ok(res, deck); return true
  }
  if (method === 'PATCH' && seg[1] === 'slides' && seg[2]) {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    if (body.template_id) deck.template_id = body.template_id // 模板与内容分离：换模板不动 slides
    if (body.page_id && body.elements) {
      const slide = deck.slides.find((s) => s.id === body.page_id)
      if (slide) slide.elements = body.elements
    }
    deck.version += 1
    ok(res, deck); return true
  }
  if (method === 'POST' && seg[1] === 'slides' && seg[2] && seg[3] === 'pages' && seg[5] === 'regenerate') {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    const idx = deck.slides.findIndex((s) => s.id === seg[4])
    if (idx < 0) { fail(res, 404, 40400, '页面不存在'); return true }
    const old = deck.slides[idx]
    // 例题/变式页：从题库换一道同知识点题生成新页；其余页：微调排版参数
    const alt = V2_QUESTIONS.filter((q) => q.kp_code === 'KP-BZ' && q.question_id !== 'q-e-02')[0]
    const fresh: V2Slide = old.kind === 'example' || old.kind === 'variant'
      ? {
          id: old.id, kind: old.kind, title: old.title,
          elements: [
            { id: 'e1', left: 100, top: 70, width: 900, height: 56, type: 'text', html: `${old.title} · 重生成`, fontSize: 30, color: '#2F855A', bold: true },
            { id: 'e2', left: 110, top: 160, width: 1060, height: 100, type: 'text', html: alt?.stem || old.title, fontSize: 20, color: '#FFFFFF' },
            { id: 'e3', left: 110, top: 290, width: 1060, height: 80, type: 'text', html: alt?.analysis.solution || '', fontSize: 18, color: '#E6EDF7' },
            { id: 'e4', left: 110, top: 400, width: 1060, height: 60, type: 'text', html: alt ? `来源：${alt.source === 'school' ? '校本题库' : '官方题库'} · 难度 ${alt.difficulty === 'basic' ? '基础' : alt.difficulty === 'medium' ? '中档' : '压轴'}` : '', fontSize: 15, color: '#93B4F5' },
          ],
          remark: '单页重生成 · 保留原页面直至确认',
        }
      : { ...old, remark: '单页重生成 · 版式微调' }
    deck.slides[idx] = fresh
    deck.version += 1
    ok(res, { slide: fresh, deck }); return true
  }
  if (method === 'POST' && seg[1] === 'slides' && seg[2] && seg[3] === 'export') {
    const deck = decks.get(seg[2])
    if (!deck) { fail(res, 404, 40400, '课件不存在'); return true }
    const format = body.format || 'pptx'
    const task = createTask('slides.export', `导出 ${format.toUpperCase()} · ${deck.title}`, null, () => { deck.exported_at = iso() })
    ok(res, { task_id: task.task_id }); return true
  }

  /* ---------- 组卷 ---------- */
  if (method === 'GET' && url === '/teacher-v2/quiz/questions') {
    const kp = (qs.get('kp_code') || '').split(',').filter(Boolean)
    const difficulty = qs.get('difficulty') || ''
    const qType = qs.get('q_type') || ''
    const kw = (qs.get('q') || '').toLowerCase()
    let items = [...questionBank, ...schoolQuestions]
    if (kp.length) items = items.filter((q) => kp.includes(q.kp_code))
    if (difficulty) items = items.filter((q) => q.difficulty === difficulty)
    if (qType) items = items.filter((q) => q.q_type === qType)
    if (kw) items = items.filter((q) => q.stem.toLowerCase().includes(kw) || q.kp_name.toLowerCase().includes(kw))
    ok(res, { items, total: items.length }); return true
  }
  if (method === 'GET' && url === '/teacher-v2/quiz/kp-tree') {
    const all = [...questionBank, ...schoolQuestions]
    const countOf = (code: string) => all.filter((q) => q.kp_code === code).length
    const tree = clone(V2_KP_TREE).map((b) => ({
      ...b,
      children: b.children?.map((c) => ({ ...c, children: c.children?.map((k) => ({ ...k, question_count: countOf(k.code) })) })),
    }))
    ok(res, { tree }); return true
  }
  if (method === 'POST' && url === '/teacher-v2/quiz/compose') {
    const paper = composePaper(body)
    papers.set(paper.paper_id, paper)
    ok(res, paper); return true
  }
  if (method === 'GET' && seg[1] === 'quiz' && seg[2] === 'papers' && seg[3]) {
    const paper = papers.get(seg[3])
    if (!paper) { fail(res, 404, 40400, '试卷不存在'); return true }
    ok(res, paper); return true
  }
  if (method === 'POST' && seg[1] === 'quiz' && seg[2] === 'papers' && seg[3] && seg[4] === 'items' && seg[5] && seg[6] === 'swap') {
    const paper = papers.get(seg[3])
    if (!paper) { fail(res, 404, 40400, '试卷不存在'); return true }
    const seqNo = Number(seg[5])
    const item = paper.items.find((it) => it.seq === seqNo)
    if (!item) { fail(res, 404, 40400, '题号不存在'); return true }
    const used = new Set(paper.items.map((it) => it.question.question_id))
    const pool = [...questionBank, ...schoolQuestions].filter((q) => q.kp_code === item.question.kp_code && q.q_type === item.question.q_type && q.difficulty === item.question.difficulty && !used.has(q.question_id))
    if (pool.length) {
      item.question = pool[Math.floor(Math.random() * pool.length)]
      ok(res, { item }); return true
    }
    fail(res, 404, 40400, '暂无可替换的同类题'); return true
  }

  /* ---------- 作业与批改 ---------- */
  if (method === 'GET' && url === '/teacher-v2/assignments') {
    ok(res, { items: [...assignments.values()] }); return true
  }
  if (method === 'POST' && url === '/teacher-v2/assignments') {
    const classId = body.class_id || 'cls-g2-3'
    const cls = classOf(classId)
    const assign: V2Assignment = {
      assignment_id: nextId('assign'),
      title: body.title || '分层作业',
      class_id: classId, class_name: cls.class_name,
      kp_name: body.kp_name || '椭圆的标准方程',
      due_at: body.due_at || '09-03 22:00',
      tiers: body.tiers || [
        { tier: 'base', label: '基础组（预习单 <60）', student_count: 12, items: ['A 卷 · 6 题（3:2:1）'] },
        { tier: 'consolid', label: '巩固组', student_count: 24, items: ['B 卷 · 8 题（3:4:1）'] },
        { tier: 'challenge', label: '挑战组', student_count: 10, items: ['C 卷 · 6 题（1:3:2）'] },
      ],
      status: 'collecting', submitted: 0, total: cls.student_count,
    }
    assignments.set(assign.assignment_id, assign)
    ok(res, assign); return true
  }
  if (method === 'GET' && seg[1] === 'assignments' && seg[2] && seg[3] === 'submissions') {
    const assign = assignments.get(seg[2])
    if (!assign) { fail(res, 404, 40400, '作业不存在'); return true }
    let items = submissionsByAssign.get(seg[2]) || []
    if (!items.length) {
      items = genSubmissions(assign.class_id)
      submissionsByAssign.set(seg[2], items)
      assign.status = 'grading'
      assign.submitted = items.length
    }
    const filter = qs.get('filter') || ''
    if (filter === 'manual') items = items.filter((s) => s.needs_manual)
    ok(res, { items, context: { assignment: assign } }); return true
  }
  if (method === 'POST' && seg[1] === 'submissions' && seg[2] && seg[3] === 'grade') {
    for (const [assignId, list] of submissionsByAssign) {
      const sub = list.find((s) => s.submission_id === seg[2])
      if (!sub) continue
      if (body.final_score !== undefined) sub.final_score = Number(body.final_score)
      if (body.teacher_feedback !== undefined) sub.teacher_feedback = body.teacher_feedback
      if (Array.isArray(body.error_tags)) {
        sub.error_tags = body.error_tags.map((tag: string) => ({ tag, source: 'teacher' as const }))
        // 链路卡 B 数据闭环：教师打的标签进入 insights 聚类
        const assign = assignments.get(assignId)!
        const bucket = teacherTags.get(assign.class_id) || []
        for (const tag of body.error_tags) {
          const hit = bucket.find((b) => b.tag === tag)
          if (hit) hit.count += 1
          else bucket.push({ tag, count: 1, kp_code: body.kp_code || 'KP-BZ', kp_name: body.kp_name || assign.kp_name })
        }
        teacherTags.set(assign.class_id, bucket)
      }
      ok(res, sub); return true
    }
    fail(res, 404, 40400, '作答不存在'); return true
  }
  if (method === 'POST' && seg[1] === 'assignments' && seg[2] && seg[3] === 'review-pack') {
    const assign = assignments.get(seg[2])
    if (!assign) { fail(res, 404, 40400, '作业不存在'); return true }
    const subs = submissionsByAssign.get(seg[2]) || genSubmissions(assign.class_id)
    const wrongCount = subs.filter((s) => (s.final_score ?? s.ai_suggested_score ?? 100) < 100).length
    const qs2 = V2_QUESTIONS.filter((q) => ['KP-TY', 'KP-BZ'].includes(q.kp_code))
    const pack: V2ReviewPack = {
      pack_id: nextId('pack'),
      top_errors: qs2.slice(0, 3).map((q, i) => ({
        question: q,
        error_rate: [0.4, 0.33, 0.19][i],
        wrong_students: subs.filter((s) => s.objective.correct <= i).slice(0, 6).map((s) => s.student.name),
        tag: ['概念混淆 · 忽略定义条件', '运算失误 · 平方化简跳步', '审题遗漏 · 焦点位置判断'][i],
      })),
      variant_pick: V2_QUESTIONS.filter((q) => ['q-e-01', 'q-e-07', 'q-e-08'].includes(q.question_id)),
    }
    reviewPacks.set(pack.pack_id, pack)
    assign.status = 'reviewed'
    ok(res, { pack, wrong_count: wrongCount }); return true
  }
  if (method === 'GET' && seg[1] === 'review-packs' && seg[2]) {
    const pack = reviewPacks.get(seg[2])
    if (!pack) { fail(res, 404, 40400, '讲评材料不存在'); return true }
    ok(res, pack); return true
  }

  /* ---------- 课堂 ---------- */
  if (method === 'POST' && url === '/teacher-v2/classroom/sessions') {
    const classId = body.class_id || 'cls-g2-3'
    const roster = rosterOf(classId)
    const session = {
      session_id: nextId('cs'), class_id: classId, class_name: classOf(classId).class_name,
      topic: body.topic || '椭圆的标准方程（新授）',
      status: 'open', started_at: iso(),
      roster: roster.map((name, i) => ({ user_id: `stu-${i + 1}`, name, picked: false })),
      questions: V2_QUESTIONS.filter((q) => ['q-e-01', 'q-e-02', 'q-e-08'].includes(q.question_id)).map((q) => ({
        question_id: q.question_id, stem: q.stem, options: q.options, answer: q.answer, kp_name: q.kp_name,
        sent_at: null, status: 'pending',
        stats: { total: roster.length, answered: 0, distribution: {}, correct_rate: 0, error_cluster: [] },
      })),
      active_question_id: null,
    }
    sessions.set(session.session_id, session)
    ok(res, session); return true
  }
  if (method === 'GET' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && !seg[4]) {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    ok(res, session); return true
  }
  if (method === 'POST' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && seg[4] === 'questions') {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    const q = session.questions.find((x: any) => x.question_id === body.question_id)
    if (!q) { fail(res, 404, 40400, '题目不在本课题单'); return true }
    q.sent_at = iso()
    q.status = 'collecting'
    q.stats = { total: session.roster.length, answered: 0, distribution: {}, correct_rate: 0, error_cluster: [] }
    session.active_question_id = q.question_id
    session.status = 'questioning'
    ok(res, session); return true
  }
  if (method === 'POST' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && seg[4] === 'close-question') {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    const q = session.questions.find((x: any) => x.question_id === (body.question_id || session.active_question_id))
    if (q) { q.status = 'closed'; q.stats.answered = q.stats.total }
    session.status = 'reviewing'
    ok(res, session); return true
  }
  if (method === 'POST' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && seg[4] === 'close') {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    session.status = 'closed'
    ok(res, session); return true
  }
  if (method === 'GET' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && seg[4] === 'stats') {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    const q = session.questions.find((x: any) => x.question_id === (qs.get('question_id') || session.active_question_id))
    if (!q) { fail(res, 404, 40400, '当前无进行中的题目'); return true }
    startSse(res)
    const rand = seededRandom(q.question_id.split('-').reduce((s: number, p: string) => s + p.charCodeAt(0), 0))
    const batch = Math.max(3, Math.round(q.stats.total / 12))
    const opts = q.options ? ['A', 'B', 'C', 'D'] : ['对', '错']
    const correctIdx = q.options ? opts.indexOf(q.answer) : 0
    const errRate = 0.4
    const timers: any[] = []
    const tick = () => {
      if (res.writableEnded) return
      const remaining = q.stats.total - q.stats.answered
      if (remaining <= 0) {
        sendSse(res, 'stats', { ...q.stats, finished: true })
        sendSse(res, 'done', { question_id: q.question_id })
        res.end()
        return
      }
      const add = Math.min(remaining, batch + Math.round(rand() * 4))
      for (let i = 0; i < add; i++) {
        const pickOpt = rand() > errRate ? opts[correctIdx] : opts[Math.floor(rand() * opts.length)]
        q.stats.distribution[pickOpt] = (q.stats.distribution[pickOpt] || 0) + 1
      }
      q.stats.answered += add
      const totalAns = Object.values(q.stats.distribution).reduce((s: number, v) => s + (Number(v) || 0), 0)
      q.stats.correct_rate = totalAns ? (Number(q.stats.distribution[opts[correctIdx]]) || 0) / totalAns : 0
      q.stats.error_cluster = opts
        .filter((o) => o !== opts[correctIdx] && q.stats.distribution[o])
        .map((o) => ({ option: o, count: q.stats.distribution[o], tag: o === opts[1] ? '概念混淆 · 忽略定义条件' : '审题遗漏 / 运算失误' }))
      sendSse(res, 'stats', { ...q.stats, finished: q.stats.answered >= q.stats.total })
      timers.push(setTimeout(tick, 1300))
    }
    timers.push(setTimeout(tick, 500))
    req.on('close', () => timers.forEach(clearTimeout))
    return true
  }
  if (method === 'POST' && seg[1] === 'classroom' && seg[2] === 'sessions' && seg[3] && seg[4] === 'pick') {
    const session = sessions.get(seg[3])
    if (!session) { fail(res, 404, 40400, '课堂不存在'); return true }
    const pool = session.roster.filter((r: any) => !r.picked)
    if (!pool.length) {
      session.roster.forEach((r: any) => { r.picked = false })
      ok(res, { student: null, remaining: session.roster.length, reset: true }); return true
    }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    pick.picked = true
    ok(res, { student: { user_id: pick.user_id, name: pick.name }, remaining: pool.length - 1 }); return true
  }

  /* ---------- 学情 ---------- */
  if (method === 'GET' && url === '/teacher-v2/insights/overview') {
    const classId = qs.get('class_id') || 'cls-g2-3'
    const base = V2_INSIGHTS[classId]
    if (!base) { fail(res, 404, 40400, '班级不存在'); return true }
    const teacher = (teacherTags.get(classId) || [])
    const cls = classOf(classId)
    const clusters = [...base.error_clusters]
    for (const t of teacher) {
      const hit = clusters.find((c) => c.tag.includes(t.tag) || t.tag.includes(c.tag.split(' · ')[1] || ''))
      if (hit) { hit.count += t.count; hit.ratio = Math.min(1, hit.ratio + t.count / cls.student_count) }
      else clusters.unshift({ tag: t.tag, ratio: t.count / cls.student_count, count: t.count, kp_name: t.kp_name, kp_code: t.kp_code, example_question_id: 'q-e-07' })
    }
    clusters.sort((a, b) => b.count - a.count)
    ok(res, { class_id: classId, class_name: cls.class_name, student_count: cls.student_count, ...base, error_clusters: clusters })
    return true
  }
  if (method === 'GET' && seg[1] === 'insights' && seg[2] === 'kp' && seg[3]) {
    const classId = qs.get('class_id') || 'cls-g2-3'
    const base = V2_INSIGHTS[classId]
    const cell = base?.heatmap.find((h) => h.kp_code === seg[3])
    if (!cell) { fail(res, 404, 40400, '知识点不存在'); return true }
    const q = [...questionBank, ...schoolQuestions].find((x) => x.kp_code === seg[3])
    ok(res, {
      kp_code: cell.kp_code, kp_name: cell.kp_name, error_rate: cell.error_rate, sample: cell.sample,
      trend: [-0.06, -0.02, 0.01, -0.03, 0.02, 0].map((d, i) => ({ date: `08-${18 + i * 3}`, error_rate: Math.max(0.05, cell.error_rate + d) })),
      error_breakdown: (base.error_clusters.filter((c) => c.kp_code === seg[3]).length
        ? base.error_clusters.filter((c) => c.kp_code === seg[3])
        : [{ tag: '综合错因', count: Math.round(cell.error_rate * cell.sample) }]).map((c) => ({ tag: c.tag, count: c.count })),
      typical_question: q,
      wrong_students_sample: base.tier_lists[0]?.students.slice(0, 8) || [],
    })
    return true
  }

  /* ---------- 资源 ---------- */
  if (method === 'GET' && url === '/teacher-v2/resources') {
    ok(res, { tree: V2_TEXTBOOK_TREE, items: V2_RESOURCES }); return true
  }
  if (method === 'POST' && url === '/teacher-v2/resources/upload') {
    const fileName = body.file_name || '教研组椭圆习题集.pdf'
    const task = createTask('resources.ingest', `摄取 ${fileName}`, null, () => {
      if (!candidates.length) candidates = clone(V2_CANDIDATES).map((c) => ({ ...c, status: 'pending' as const }))
    })
    ok(res, { task_id: task.task_id }); return true
  }
  if (method === 'GET' && url === '/teacher-v2/resources/candidates') {
    ok(res, { items: candidates, ingest_task_id: null }); return true
  }
  if (method === 'POST' && seg[1] === 'resources' && seg[2] === 'candidates' && seg[3] && (seg[4] === 'approve' || seg[4] === 'reject')) {
    const cand = candidates.find((c) => c.candidate_id === seg[3])
    if (!cand) { fail(res, 404, 40400, '候选不存在（请先上传文件完成摄取）'); return true }
    cand.status = seg[4] === 'approve' ? 'approved' : 'rejected'
    if (seg[4] === 'approve' && !schoolQuestions.some((q) => q.question_id === cand.suggested.question_id)) {
      // 链路卡 C 数据闭环：审核通过的题进入组卷检索池（带校本角标）
      schoolQuestions.push(clone(cand.suggested))
    }
    ok(res, cand); return true
  }

  /* ---------- 任务中心 ---------- */
  if (method === 'GET' && url === '/teacher-v2/tasks') {
    const items = [...tasks.values()]
      .map(taskView)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 20)
    ok(res, { items, running: items.filter((t) => t.status === 'queued' || t.status === 'running').length })
    return true
  }
  if (method === 'GET' && seg[1] === 'tasks' && seg[2]) {
    const t = tasks.get(seg[2])
    if (!t) { fail(res, 404, 40400, '任务不存在'); return true }
    ok(res, taskView(t)); return true
  }

  /* ---------- AI 管家 ---------- */
  if (method === 'POST' && url === '/teacher-v2/butler/chat') {
    const text = String(body.message || '')
    const scene = body.scene || 'teacher.v2.today'
    startSse(res)
    const timers: any[] = []
    let acc = 80
    const push = (event: string, data: unknown, delay = 140) => {
      timers.push(setTimeout(() => sendSse(res, event, data), acc))
      acc += delay
    }
    push('meta', { msg_id: nextId('bm'), scene })
    const streamText = (s: string) => {
      for (let p = 0; p < s.length; p += 10) push('token', { text: s.slice(p, p + 10) }, 60)
    }
    if (text.includes('课件')) {
      const plan = [...plans.values()].find((p) => p.status === 'confirmed') || plans.get('plan-ellipse-001')!
      const deck = buildDeckFromPlan(plan, 'math-theorem-dark')
      decks.set(deck.deck_id, deck)
      const task = createTask('slides.generate', `生成课件 · ${plan.topic}`)
      streamText(`好的，我基于已定稿的教案《${plan.topic}》直接发起课件生成：大纲沿用教案 8 个环节，例题取自班级高频错题对应知识点。任务已在后台运行，完成后可直接进入课件工坊查看与微调。`)
      push('card', {
        type: 'task', task_id: task.task_id, capability: 'slides.generate',
        title: `生成课件 · ${plan.topic}`, route: '/teacher-v2/slides', deck_id: deck.deck_id,
      }, 200)
    } else if (text.includes('组卷') || text.includes('变式')) {
      const paper = composePaper({ kp_codes: ['KP-TY', 'KP-BZ'], counts: { choice: 4, fill: 4, solution: 2 }, difficulty_ratio: { basic: 3, medium: 5, hard: 2 }, scene: 'quiz', title: '椭圆错因变式卷' })
      papers.set(paper.paper_id, paper)
      streamText(`收到。我按「椭圆定义 + 标准方程」两个薄弱知识点出了一组变式卷：8 题、难度 3:5:2，对应学情聚类前两位错因。已存入组卷中心，可继续调整或转为作业。`)
      push('card', { type: 'paper', paper_id: paper.paper_id, title: paper.title, route: '/teacher-v2/quiz' }, 200)
    } else if (text.includes('批改') || text.includes('作业')) {
      streamText('昨晚预习单 46 份已全部 AI 预批，其中 5 份低置信度需要您复核。建议先处理低置信度队列，平均每份 40 秒；复核时如发现错因标签不准，可直接修正——修正后的标签会自动进入学情聚类。')
      push('card', { type: 'route', title: '进入批改队列', route: '/teacher-v2/assign', desc: '5 份待人工复核' }, 200)
    } else {
      streamText('我在。当前上下文：教师工作台。我可以：① 把定稿教案直接生成课件；② 按错因聚类出变式卷；③ 汇总今日待办。直接说「帮我把定稿教案生成课件」试试。')
      push('card', { type: 'route', title: '查看今日工作台', route: '/teacher-v2/today', desc: '课表 · 待办 · 班级速览' }, 200)
    }
    timers.push(setTimeout(() => { sendSse(res, 'done', { ok: true }); res.end() }, acc + 150))
    req.on('close', () => timers.forEach(clearTimeout))
    return true
  }

  /* ---------- Mock 重置（E2E） ---------- */
  if (method === 'POST' && url === '/teacher-v2/_reset') { seed(); ok(res, { reset: true }); return true }

  fail(res, 404, 40400, `teacher-v2 mock 未实现：${method} ${url}`)
  return true
}

seed()
