/**
 * 教师工作台 V3 · Mock 服务（挂载 /api/teacher-v3/*）
 * 契约依据：src/types/teacherV3.ts + src/api/teacherV3.ts
 * 域划分与四个后端智能体对齐：catalog / recognition(SSE) / generation(SSE) / figures / grading
 * 深链路：
 *  - photo-ingest SSE：meta → photo → block×n → paginate → done（识别块全部 editable，教师可改）
 *  - generation deck SSE：meta → outline → slide×n → done（AI 只出草稿，teacher_confirmed=false）
 */
import {
  V3_CLASSES, V3_DECKS, V3_DECK_TEMPLATES, V3_DRAW_LIBRARY, V3_GRADING_ASSIGNMENTS, V3_GRADING_DATA, V3_INSIGHTS,
  V3_LESSON_PLANS, V3_LESSON_TEMPLATES, V3_QUIZ_QUESTIONS, V3_RECOGNIZE_BLOCKS, V3_RECIPES,
  V3_RESOURCES, V3_TASKS, V3_TEN_BOARDS, V3_TODAY, V3_QUIZ_KP_TREE, V3_FOLDERS, V3_TEXTBOOK_CHAPTERS, buildRebuiltTextbook,
} from './teacherV3Data'
// 相对路径导入（非 @/ 别名）：本文件被 vite.config.js 的加载链引入，别名在 config 打包阶段不可解析
import { FIGURE_PRESETS } from '../components/mathx/presets'
import type { V3Deck, V3FigureLibraryItem, V3LessonPlan, V3Slide, V3Task, V3LessonTemplate } from '@/types/teacherV3'

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
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const isTeacher = (req: any) => (req.headers?.authorization || '').includes('mock-token-teacher-preview')
function fail(res: any, status: number, code: number, message: string) {
  if (res.headersSent || res.writableEnded) return
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ code, message, data: null }))
}

/* ================= 内存态（页面间共享，模拟后端持久化） ================= */
const decks: V3Deck[] = JSON.parse(JSON.stringify(V3_DECKS))
const plans: V3LessonPlan[] = JSON.parse(JSON.stringify(V3_LESSON_PLANS))
const tasks: V3Task[] = [...V3_TASKS]
const recipes = [...V3_RECIPES]
const grading = JSON.parse(JSON.stringify(V3_GRADING_DATA))
const drawLibrary: V3FigureLibraryItem[] = JSON.parse(JSON.stringify(V3_DRAW_LIBRARY))
const quizQuestions = JSON.parse(JSON.stringify(V3_QUIZ_QUESTIONS))
const folders = JSON.parse(JSON.stringify(V3_FOLDERS)) as { id: string; name: string; desc?: string; count: number; updated_at: string }[]
const kpTree = JSON.parse(JSON.stringify(V3_QUIZ_KP_TREE)) as any[]
const lessonTemplates: V3LessonTemplate[] = JSON.parse(JSON.stringify(V3_LESSON_TEMPLATES))

let _id = 100
const uid = (p: string) => `${p}-${++_id}`

/** 专题夹实时计数（引用式：数 question.folder_refs） */
function folderCount(id: string) { return quizQuestions.filter((q: any) => (q.folder_refs || []).includes(id)).length }
function refreshFolderCounts() { for (const f of folders) f.count = folderCount(f.id) }

/** 知识点树：按 id 查节点 / 递归删除（V3.2 树编辑） */
function findKp(nodes: any[], id: string): any {
  for (const n of nodes) {
    if (n.id === id) return n
    const hit = n.children?.length ? findKp(n.children, id) : null
    if (hit) return hit
  }
  return null
}
function removeKp(nodes: any[], id: string): boolean {
  const i = nodes.findIndex((n) => n.id === id)
  if (i >= 0) { nodes.splice(i, 1); return true }
  for (const n of nodes) if (n.children?.length && removeKp(n.children, id)) return true
  return false
}

/**
 * 中文数学口语 → LaTeX（mock 规则层演示；real = 规则 → LLM → KaTeX 编译验证三层）。
 * 覆盖高中高频结构：根号下 / n次方 / 分之 / 加减 / 绝对值 / 三角对数。
 * 仅做确定性替换供原型演示，完整语义解析由后端 P1 实现。
 */
function voiceToLatex(spoken: string): string {
  let s = String(spoken || '').trim()
  // 句式引导词
  s = s.replace(/^(帮我|请|把|转换成|转成|输入|说出|说)(可编辑)?(的)?(公式)?/g, '')
  s = s.replace(/(转换|转)成(可编辑)?(的)?公式$/g, '')
  // "x分之y"（分母在前）→ \frac{y}{x}
  s = s.replace(/([^，。 ]{1,12}?)分之([^，。 ]{1,12}?)(?=[，。]|$)/g, '\\frac{$2}{$1}')
  // "根号下 X"（到逗号/句号/结尾）
  s = s.replace(/根号下([^，。 ]{1,20}?)(?=[，。 ]|$)/g, '\\sqrt{$1}')
  // "X的n次方 / X平方 / X立方"
  s = s.replace(/的平方/g, '^{2}').replace(/平方/g, '^{2}')
  s = s.replace(/的立方/g, '^{3}')
  s = s.replace(/的(\d+)次方/g, '^{$1}')
  s = s.replace(/的([a-z])次方/g, '^{$1}')
  // 运算与符号词
  s = s.replace(/加减/g, '\\pm')
  s = s.replace(/乘以|乘/g, '\\times').replace(/除以/g, '\\div')
  s = s.replace(/绝对值([^，。 ]{1,12}?)(?=[，。 ]|$)/g, '\\left|$1\\right|')
  s = s.replace(/等于/g, '=').replace(/大于等于/g, '\\geq').replace(/小于等于/g, '\\leq').replace(/不等于/g, '\\neq')
  s = s.replace(/约等于/g, '\\approx')
  s = s.replace(/无穷大/g, '\\infty')
  // 三角/对数/指数
  s = s.replace(/正弦/g, '\\sin ').replace(/余弦/g, '\\cos ').replace(/正切/g, '\\tan ')
  s = s.replace(/自然对数/g, '\\ln ').replace(/对数/g, '\\log ')
  s = s.replace(/e的/g, 'e^')
  // 单字母变量间补乘号省略（保持可读），英文数字字母原样
  s = s.replace(/\s+/g, ' ').trim()
  // 结果若仍含中文且无 LaTeX 指令，包 \text{} 兜底展示
  if (/[\u4e00-\u9fa5]/.test(s) && !/\\/.test(s)) s = `\\text{${s}}`
  return s
}

/** 大纲环节目标草案（围绕课题与课型的可执行表述，教师可改） */
function goalOf(b: { id: string; name: string }, topic: string, lessonType: string): string {
  const map: Record<string, string> = {
    'bd-context': `对齐课标与 ${topic} 的学情：明确起点（已会什么）与障碍（容易错在哪）。`,
    'bd-objectives': `用可检验行为写出 ${topic} 的 3 条目标（每个目标对应一道可出的题）。`,
    'bd-keypoints': `标出 ${topic} 的重点与难点，并各给一个突破动作（实验 / 反例 / 分步板书）。`,
    'bd-intro': `用一个 90 秒内讲完的情境引出 ${topic} 的问题（与教材或本班经验挂钩）。`,
    'bd-explore': `让学生经历 ${topic} 的生成过程：先动手/观察，再归纳，最后符号化。`,
    'bd-examples': `精讲 1 道覆盖 ${topic} 主干方法的例题，板书分步并标注每步依据。`,
    'bd-variation': `配 1-2 道变式（改一个条件），检验方法迁移而非记忆。`,
    'bd-pitfalls': `用 2 个反例暴露 ${topic} 的常见误用，由学生判断并说理由。`,
    'bd-summary': `用主线图收束 ${topic}，当堂 1 道小题回收掌握度。`,
    'bd-homework': `按基础/巩固/挑战三层布置，每层 1-2 题，挑战层衔接下一课。`,
  }
  if (lessonType === '讲评课' && b.id === 'bd-intro') return `出示 ${topic} 的得分分布，让学生先看自己的位置。`
  return map[b.id] || `围绕「${topic}」完成本环节。`
}

export async function handleTeacherV3Api(req: any, res: any): Promise<boolean> {
  const url = String(req.url || '')
  if (!url.startsWith('/teacher-v3/')) return false
  const method = String(req.method || 'GET').toUpperCase()
  if (!isTeacher(req)) { fail(res, 403, 40301, 'role_denied'); return true }
  const path = url.split('?')[0]
  const body = method === 'GET' || method === 'DELETE' ? {} : await readBody(req)

  /* ============ catalog 基础目录域 ============ */
  if (method === 'GET' && path === '/teacher-v3/today') return ok(res, V3_TODAY), true
  if (method === 'GET' && path === '/teacher-v3/classes') return ok(res, { items: V3_CLASSES }), true
  if (method === 'GET' && path === '/teacher-v3/tasks') {
    const t = tasks.find((x) => x.task_id === 'task-photo-1')
    if (t && t.status === 'running') { t.progress = Math.min(100, t.progress + 11); if (t.progress >= 100) { t.status = 'succeeded'; t.stage = '完成' } }
    return ok(res, { items: tasks, running: tasks.filter((x) => x.status === 'running' || x.status === 'queued').length }), true
  }
  if (method === 'GET' && path === '/teacher-v3/deck-templates') return ok(res, { items: V3_DECK_TEMPLATES }), true
  if (method === 'GET' && path === '/teacher-v3/lesson-templates') return ok(res, { items: lessonTemplates }), true
  if (method === 'GET' && path === '/teacher-v3/recipes') return ok(res, { items: recipes }), true
  if (method === 'GET' && path === '/teacher-v3/textbook-chapters') return ok(res, V3_TEXTBOOK_CHAPTERS), true
  if (method === 'POST' && path === '/teacher-v3/textbooks/rebuild-index') {
    // V3.3：上传教材 → AI 重建「知识库目录」（mock 确定性样例；real = 教材 PDF/图片 → 版面分析 → 目录树）
    const fileName = String(body.file || '新教材.pdf')
    const rebuilt = buildRebuiltTextbook(fileName, body.version)
    return ok(res, rebuilt), true
  }

  /* ============ V3.1：上传教案 → 质量体检 → 提炼个人模板 ============ */
  if (method === 'POST' && path === '/teacher-v3/plan-templates/import') {
    // 体检（反套话 + 栏目完整度）：帮老师挑出值得当模板的 1-3 份（RESEARCH_LESSON_PREP §5.3）
    const files: string[] = Array.isArray(body.files) && body.files.length ? body.files : ['上传教案.docx']
    const qualityPool = [
      { file: files[0] || '上传教案.docx', score: 86, board_coverage: ['教材分析', '学情分析', '教学目标', '重难点', '教学过程三栏', '板书设计'], missing_boards: ['教后反思'], cliche_hits: [], recommended: true, suggestion: '栏目齐全、套话率低，适合作为个人模板' },
      { file: files[1] || '往年常规教案.docx', score: 58, board_coverage: ['教学目标', '教学过程'], missing_boards: ['学情分析', '重难点', '板书设计', '教后反思'], cliche_hits: ['「激发学习兴趣」未落到具体活动', '「培养分析问题与解决问题的能力」口号式'], recommended: false, suggestion: '栏目缺 4 项且套话密度高，不建议作模板' },
      { file: files[2] || '备课组详案.docx', score: 74, board_coverage: ['教材分析', '学情分析', '教学目标', '重难点', '教学过程三栏'], missing_boards: ['板书设计'], cliche_hits: [], recommended: false, suggestion: '仅缺板书设计，补齐后可用' },
    ]
    return ok(res, { reports: qualityPool.slice(0, Math.max(1, files.length)) }), true
  }
  const tplExtract = path === '/teacher-v3/plan-templates/extract'
  if (method === 'POST' && tplExtract) {
    const t: V3LessonTemplate = {
      id: uid('lt-mine'), name: `我的模板 · ${body.name || '上传提炼'}`,
      style_tag: '提炼自上传教案 · 三栏写法 · 栏目已体检',
      sections: ['教材分析·学情', '教学目标（素养线）', '重难点与突破', '情境引入', '新知探究', '例题变式', '课堂检测', '分层作业'],
      recommended_for: '个人模板 · 仅本人可见', sample_topic: body.name || '',
      source: 'teacher_upload',
      quality_report: { file: body.file || '上传教案.docx', score: 86, board_coverage: ['教材分析', '学情分析', '教学目标', '重难点', '教学过程三栏', '板书设计'], missing_boards: ['教后反思'], cliche_hits: [], recommended: true, suggestion: '栏目齐全、套话率低，适合作为个人模板' },
    }
    lessonTemplates.push(t)
    return ok(res, t), true
  }

  if (method === 'GET' && path === '/teacher-v3/quiz/questions') {
    // 服务端筛选：kp（多码逗号分隔）/ q（题干模糊）/ difficulty / q_type / source / folder（专题夹引用过滤）
    let items = quizQuestions as any[]
    const q = url.includes('?') ? Object.fromEntries(new URL(url, 'http://mock.local').searchParams.entries()) : {}
    if (q.kp) { const codes = String(q.kp).split(','); items = items.filter((x) => codes.includes(x.kp_code)) }
    if (q.q) { const kw = String(q.q).trim(); if (kw) items = items.filter((x) => (x.stem_latex || '').includes(kw)) }
    if (q.difficulty) items = items.filter((x) => x.difficulty === q.difficulty)
    if (q.q_type) items = items.filter((x) => x.q_type === q.q_type)
    if (q.source) items = items.filter((x) => x.source === q.source)
    if (q.folder) items = items.filter((x) => (x.folder_refs || []).includes(q.folder))
    return ok(res, { items, total: items.length }), true
  }
  if (method === 'POST' && path === '/teacher-v3/quiz/questions') {
    // V3.1：自编题录入（结构化手输，source='自编'）
    const q = {
      id: uid('q-self'),
      kp_name: body.kp_name || '自编', kp_code: body.kp_code || 'YD-01',
      kp_path: body.kp_path || [], q_type: body.q_type || 'solve', difficulty: body.difficulty || 'medium',
      stem_latex: body.stem_latex || '', answer: body.answer || '', analysis: body.analysis || '',
      source: '自编' as const, folder_refs: [] as string[], usage_count: 0,
    }
    quizQuestions.unshift(q)
    return ok(res, q), true
  }
  const quizDelMatch = path.match(/^\/teacher-v3\/quiz\/questions\/([^/]+)$/)
  if (method === 'DELETE' && quizDelMatch) {
    // V3.3：删除一道题（含拍照入库题；同步清理所在专题夹的引用计数）
    const i = quizQuestions.findIndex((x: any) => x.id === quizDelMatch[1])
    if (i < 0) return fail(res, 404, 40402, '题目不存在'), true
    quizQuestions.splice(i, 1)
    refreshFolderCounts()
    return ok(res, { ok: true as const }), true
  }
  if (method === 'GET' && path === '/teacher-v3/quiz/kp-tree') return ok(res, { tree: kpTree }), true

  /* ============ V3.2：知识点树编辑（个人定制层）+ AI 识别归属 ============ */
  if (method === 'POST' && path === '/teacher-v3/quiz/kp-tree') {
    const parent = body.parent_id ? findKp(kpTree, String(body.parent_id)) : null
    const node = { id: uid('kp-x'), name: String(body.name || '新知识点'), kp_codes: [uid('KP').toUpperCase()] }
    if (parent) { if (!parent.children) parent.children = []; parent.children.push(node) }
    else kpTree.push(node as never)
    return ok(res, node), true
  }
  const kpItemMatch = path.match(/^\/teacher-v3\/quiz\/kp-tree\/([^/]+)$/)
  if (method === 'PATCH' && kpItemMatch) {
    const n = findKp(kpTree, kpItemMatch[1])
    if (!n) return fail(res, 404, 40401, '知识点不存在'), true
    n.name = String(body.name || n.name)
    return ok(res, { ok: true as const }), true
  }
  if (method === 'DELETE' && kpItemMatch) {
    const done = removeKp(kpTree, kpItemMatch[1])
    if (!done) return fail(res, 404, 40401, '知识点不存在'), true
    return ok(res, { ok: true as const }), true
  }
  if (method === 'POST' && path === '/teacher-v3/quiz/kp-suggest') {
    // mock 启发式：按题干/图片名关键词匹配分类树叶子（真实链路 = 题干/图片 → VLM → 树内最近叶节点 + 备选）
    let text = String(body.stem || '')
    if (!text && body.src) {
      try { text = decodeURIComponent(String(body.src)) } catch { text = String(body.src) }
    }
    const leafsWithPath: { code: string; path: string[]; name: string; kw: string }[] = []
    const walk = (nodes: any[], prefix: string[]) => {
      for (const n of nodes) {
        const p = [...prefix, n.name]
        if (n.children?.length) walk(n.children, p)
        else leafsWithPath.push({ code: n.kp_codes?.[0] || n.id, path: p, name: n.name, kw: n.name })
      }
    }
    walk(kpTree, [])
    const scored = leafsWithPath
      .map((l) => ({ ...l, score: (text.includes(l.kw.slice(0, 2)) ? 2 : 0) + (text.includes(l.kw) ? 2 : 0) }))
      .sort((a, b) => b.score - a.score)
    const top = scored[0]
    const fallback = leafsWithPath[0]
    const best = top && top.score > 0 ? top : fallback
    const alternates = scored.filter((s) => s.code !== best.code).slice(0, 2).map(({ code, path, name }) => ({ code, path, name }))
    return ok(res, {
      suggestion: { code: best.code, path: best.path, name: best.name, confidence: top && top.score > 0 ? 0.92 : 0.41 },
      alternates,
      note: top && top.score > 0 ? '按题干关键词匹配分类树（mock 启发式）' : '题干信息不足，给默认归属；可在树中自行调整',
    }), true
  }

  /* ============ V3.1：我的专题夹（引用式收集，不挪题） ============ */
  if (method === 'GET' && path === '/teacher-v3/folders') { refreshFolderCounts(); return ok(res, { items: folders }), true }
  if (method === 'POST' && path === '/teacher-v3/folders') {
    const f = { id: uid('fld'), name: String(body.name || '新专题夹'), desc: body.desc || '', count: 0, updated_at: new Date().toISOString().slice(0, 10) }
    folders.push(f)
    return ok(res, f), true
  }
  const folderMatch = path.match(/^\/teacher-v3\/folders\/([^/]+)$/)
  if (method === 'DELETE' && folderMatch) {
    const i = folders.findIndex((f) => f.id === folderMatch[1])
    if (i >= 0) folders.splice(i, 1)
    return ok(res, { ok: true as const }), true
  }
  const folderQMatch = path.match(/^\/teacher-v3\/folders\/([^/]+)\/questions$/)
  if (method === 'POST' && folderQMatch) {
    for (const qid of (body.question_ids || []) as string[]) {
      const q = quizQuestions.find((x: any) => x.id === qid)
      if (q) { if (!Array.isArray(q.folder_refs)) q.folder_refs = []; if (!q.folder_refs.includes(folderQMatch[1])) q.folder_refs.push(folderQMatch[1]) }
    }
    refreshFolderCounts()
    return ok(res, { ok: true as const, count: folderCount(folderQMatch[1]) }), true
  }
  const folderQDel = path.match(/^\/teacher-v3\/folders\/([^/]+)\/questions\/([^/]+)$/)
  if (method === 'DELETE' && folderQDel) {
    const q = quizQuestions.find((x: any) => x.id === folderQDel[2])
    if (q && Array.isArray(q.folder_refs)) q.folder_refs = q.folder_refs.filter((r: string) => r !== folderQDel[1])
    refreshFolderCounts()
    return ok(res, { ok: true as const, count: folderCount(folderQDel[1]) }), true
  }
  if (method === 'POST' && path === '/teacher-v3/quiz/scan-import') {
    const q = {
      id: uid('q-img'),
      kp_name: body.kp_name || '拍照入库',
      kp_code: body.kp_code || 'SCAN-00',
      kp_path: body.kp_path || [],
      q_type: body.as_image ? ('image' as const) : ('solve' as const),
      difficulty: 'medium' as const,
      stem_latex: body.as_image ? '（图片题）扫描原图题目。' : '（拍照识别题）扫描原图题目。',
      stem_image: body.src,
      answer: body.solution_src ? '见解答过程' : '待批改',
      /** V3.2：解答过程原图与题干分开上传、分开存储（原样保留，不强转文字） */
      solution_image: body.solution_src || undefined,
      analysis: body.solution_src ? '（解答过程已按原图入库，可在下方对照查看）' : undefined,
      source: '拍照入库' as const,
    }
    quizQuestions.push(q)
    return ok(res, q), true
  }
  if (method === 'GET' && path === '/teacher-v3/insights/overview') return ok(res, V3_INSIGHTS), true
  if (method === 'GET' && path === '/teacher-v3/resources') return ok(res, { items: V3_RESOURCES }), true

  /* ============ 课件 decks ============ */
  if (method === 'GET' && path === '/teacher-v3/decks') {
    return ok(res, {
      items: decks.map((d) => ({
        id: d.id, title: d.title, template_id: d.template_id, source: d.source,
        slide_count: d.slides.length, class_name: d.photo_context ? '高二(3)班' : '高二(5)班', updated_at: d.updated_at,
      })),
    }), true
  }
  const deckMatch = path.match(/^\/teacher-v3\/decks\/([^/]+)$/)
  if (method === 'GET' && deckMatch) {
    const d = decks.find((x) => x.id === deckMatch[1])
    if (!d) return ok(res, null), true
    return ok(res, d), true
  }
  if (method === 'PATCH' && deckMatch) {
    const d = decks.find((x) => x.id === deckMatch[1])
    if (!d) return ok(res, null), true
    if (body.title !== undefined) d.title = body.title
    if (body.template_id !== undefined) d.template_id = body.template_id
    d.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ')
    return ok(res, d), true
  }
  const addSlideMatch = path.match(/^\/teacher-v3\/decks\/([^/]+)\/slides$/)
  if (method === 'POST' && addSlideMatch) {
    const d = decks.find((x) => x.id === addSlideMatch[1])
    if (!d) return ok(res, null), true
    const slide: V3Slide = body.slide
    const idx = body.after_id ? d.slides.findIndex((s) => s.id === body.after_id) + 1 : d.slides.length
    d.slides.splice(idx, 0, slide)
    return ok(res, { deck: d }), true
  }
  const delSlideMatch = path.match(/^\/teacher-v3\/decks\/([^/]+)\/slides\/([^/]+)$/)
  if (method === 'DELETE' && delSlideMatch) {
    const d = decks.find((x) => x.id === delSlideMatch[1])
    if (!d) return ok(res, null), true
    d.slides = d.slides.filter((s) => s.id !== delSlideMatch[2])
    return ok(res, { deck: d }), true
  }
  if (method === 'PATCH' && delSlideMatch) {
    const d = decks.find((x) => x.id === delSlideMatch[1])
    if (!d) return ok(res, null), true
    const s = d.slides.find((x) => x.id === delSlideMatch[2])
    if (!s) return ok(res, null), true
    if (body.notes !== undefined) s.notes = body.notes
    if (body.anchor_bar !== undefined) s.anchor_bar = body.anchor_bar
    if (body.elements !== undefined) s.elements = body.elements
    return ok(res, d), true
  }
  const exportMatch = path.match(/^\/teacher-v3\/decks\/([^/]+)\/export$/)
  if (method === 'POST' && exportMatch) {
    const taskId = uid('task')
    tasks.unshift({ task_id: taskId, title: `导出课件（${body.format}）`, capability: 'generation', status: 'running', progress: 10, stage: '渲染公式与图形' })
    return ok(res, { task_id: taskId }), true
  }

  /* ============ 教案 plans ============ */
  if (method === 'GET' && path === '/teacher-v3/plans') {
    return ok(res, {
      items: plans.map((p) => ({ id: p.id, topic: p.topic, class_id: p.class_id, lesson_type: p.lesson_type, section_count: p.sections.length, confirmed: !!(p as any).confirmed, updated_at: '2026-09-02' })),
    }), true
  }
  const planMatch = path.match(/^\/teacher-v3\/plans\/([^/]+)$/)
  if (method === 'GET' && planMatch) {
    const p = plans.find((x) => x.id === planMatch[1])
    return ok(res, p ?? null), true
  }
  if (method === 'PATCH' && planMatch) {
    const p = plans.find((x) => x.id === planMatch[1])
    if (p && body && typeof body === 'object') Object.assign(p, body)
    return ok(res, p ?? null), true
  }
  const planConfirm = path.match(/^\/teacher-v3\/plans\/([^/]+)\/confirm$/)
  if (method === 'POST' && planConfirm) {
    const p = plans.find((x) => x.id === planConfirm[1])
    if (p) (p as any).confirmed = true
    return ok(res, p ?? null), true
  }
  const pushMatch = path.match(/^\/teacher-v3\/plans\/([^/]+)\/push-to-deck$/)
  if (method === 'POST' && pushMatch) {
    const src = plans.find((x) => x.id === pushMatch[1])
    const deck = JSON.parse(JSON.stringify(decks.find((d) => d.id === 'deck-ellipse')))
    deck.id = uid('deck')
    deck.title = `${src?.topic ?? '教案'} · 教案直通`
    deck.template_id = body.template_id
    deck.source = 'lesson-push'
    deck.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ')
    decks.unshift(deck)
    return ok(res, { deck_id: deck.id }), true
  }

  /* ============ recognition 识别域 ============ */
  if (method === 'POST' && path === '/teacher-v3/recognition/photo-ingest') {
    startSse(res)
    const cfg = body.config || {}
    const photos = Math.max(1, Math.min(6, Array.isArray(body.photos) ? body.photos.length : 1))
    sendSse(res, 'meta', { question_label: body.question_label || '拍照例题', photos, config: cfg, steps_total: photos + V3_RECOGNIZE_BLOCKS.length + 2 })
    await sleep(420)
    for (let i = 0; i < photos; i++) {
      sendSse(res, 'photo', { index: i, status: 'received', note: i === 0 ? '原图已锚定（后续每页保留对照）' : '原图已锚定' })
      await sleep(300)
    }
    for (const b of V3_RECOGNIZE_BLOCKS) {
      sendSse(res, 'block', { ...b, page_id: 'p0' })
      await sleep(260)
    }
    sendSse(res, 'paginate', {
      note: '长解答自动分页：步骤边界换页，字号下限 20pt，未缩放内容',
      pages: 2, anchor_bars: ['接上页 · l:y=√3(x−1)', '接上页 · 弦长与面积'],
      font_tier: cfg.font_tier || 'standard',
    })
    await sleep(320)
    const deck = JSON.parse(JSON.stringify(decks.find((d) => d.id === 'deck-photo')))
    deck.id = uid('deck')
    deck.title = body.question_label || '椭圆焦点弦例题（拍照生成）'
    deck.photo_context = { config: cfg, photos, question_label: body.question_label || '' }
    deck.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ')
    decks.unshift(deck)
    tasks.unshift({ task_id: uid('task'), title: `拍照生成《${deck.title}》`, capability: 'recognition', status: 'succeeded', progress: 100, stage: '完成' })
    sendSse(res, 'done', { deck_id: deck.id, slides: deck.slides.length })
    res.end()
    return true
  }
  if (method === 'POST' && path === '/teacher-v3/recognition/rebuild') {
    return ok(res, {
      candidates: [
        { id: 'rb1', preset_id: 'conic/ellipse-coordinate', params: { a: 2, b: 1.73 }, passed_validation: true, match_note: '与原图区域高度匹配：椭圆+焦点+弦（a=2,b=√3）' },
        { id: 'rb2', preset_id: 'conic/ellipse', params: { a: 2, b: 1.73 }, passed_validation: true, match_note: '仅椭圆轮廓，无坐标轴标注' },
        { id: 'rb3', preset_id: 'plane/circle-line', params: { r: 1.9, d: 1 }, passed_validation: false, match_note: '构造校验未通过：焦点不在圆上，不允许上屏' },
      ],
    }), true
  }
  if (method === 'POST' && path === '/teacher-v3/recognition/photo-to-formula') {
    // P2：单张照片 → 公式识别（mock 确定性样例，含置信度）。真实实现走 VLM；红线 R2 要求识别结果必须进编辑器审查。
    const samples = [
      { latex: '\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1\\;(a>b>0)', confidence: 0.86, note: '椭圆标准方程' },
      { latex: '|MF_{1}|+|MF_{2}|=2a\\;(2a>2c)', confidence: 0.9, note: '椭圆定义' },
      { latex: 'y=\\frac{b}{a}\\sqrt{a^{2}-x^{2}}', confidence: 0.74, note: '上半椭圆显式' },
    ]
    const pick = samples[(body.src?.length || 0) % samples.length]
    return ok(res, { latex: pick.latex, confidence: pick.confidence, note: pick.note }), true
  }
  if (method === 'POST' && path === '/teacher-v3/recognition/plan-photo-draft') {
    // P5：教案板块拍照填充（mock 确定性样例）。识别整理成三栏草稿（R2：教师可改），real 实现走 VLM 读图 + 板块语义改写。
    const board = String(body.board_name || '新知探究')
    const topic = String(body.topic || '本课题')
    const drafts: Record<string, { t: string; s: string; d: string }> = {
      '复习引入': { t: `出示 ${topic} 的教材场景图，提问学生已有认知，引出本课要解决的问题。`, s: '观察题目情境，回顾相关已学知识，尝试表述思路。', d: '用生活/教材情境激活前测，定位学生起点。' },
      '新知探究': { t: `引导学生从实例归纳 ${topic} 的定义，用 $\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1$ 逐步建式。`, s: '经历抽象过程，指出定义中需注意的限制条件。', d: '以认知冲突驱动探究，避免直接给结论。' },
      '例题精讲': { t: `讲透一道 ${topic} 高考真题：先启发动笔，再对照标准答案提炼步骤。`, s: '独立试做并核对，说出每一步的依据。', d: '示范规范解题路径，渗透通性通法。' },
      '课堂小结与检测': { t: '用思维导图带领学生梳理本课知识结构，配一道限时小题即时检测。', s: '自主小结知识框架，完成检测小题自查。', d: '当堂反馈，暴露未掌握的环节。' },
    }
    const w = drafts[board] || { t: `围绕「${topic}」组织本板块教学，引导学生动手与思考。`, s: '参与活动，记录要点并尝试应用。', d: '落实本课目标，关注全体学生参与度。' }
    return ok(res, { teacher_activity: w.t, student_activity: w.s, design_intent: w.d, confidence: 0.81 }), true
  }

  /* ============ generation AI 生成域（SSE） ============ */
  if (method === 'POST' && path === '/teacher-v3/generation/deck') {
    startSse(res)
    sendSse(res, 'meta', { topic: body.topic, template_id: body.template_id, class_id: body.class_id })
    await sleep(400)
    const outline = ['复习回顾', '概念定义', '标准方程推导', '例题精讲', '变式训练', '课堂小结']
    sendSse(res, 'outline', { items: outline })
    const tpl = decks.find((d) => d.id === 'deck-ellipse')
    if (!tpl) { sendSse(res, 'done', { deck_id: '', slides: 0, note: '模板缺失' }); res.end(); return true }
    for (let i = 0; i < Math.min(outline.length, tpl.slides.length); i++) {
      await sleep(520)
      const s = JSON.parse(JSON.stringify(tpl.slides[i]))
      s.id = uid('sl')
      for (const e of s.elements) { e.teacher_confirmed = false; e.id = uid('e') }
      sendSse(res, 'slide', { index: i, slide: s, note: 'AI 草稿页：所有元素未确认，等教师审定' })
    }
    await sleep(280)
    const deck = JSON.parse(JSON.stringify(tpl))
    deck.id = uid('deck')
    deck.title = body.topic
    deck.template_id = body.template_id
    deck.source = 'topic'
    deck.updated_at = new Date().toISOString().slice(0, 16).replace('T', ' ')
    decks.unshift(deck)
    sendSse(res, 'done', { deck_id: deck.id, slides: deck.slides.length })
    res.end()
    return true
  }
  if (method === 'POST' && path === '/teacher-v3/generation/plan/outline') {
    // V3.1 两段式第一段：五件套 → 大纲（环节 / 时长预算 / 目标草案 / 例题建议）。
    // 教师确认/编辑大纲后才走 generation/plan 成稿（消灭流程性黑盒，RESEARCH_LESSON_PREP §5.2 方案 A）
    const duration = Math.max(30, Math.min(60, Number(body.duration) || 45))
    const topic = String(body.topic || '本课题')
    const lessonType = String(body.lesson_type || '新授课')
    // 课型裁剪：习题课/讲评课压掉「新知探究」，复习课换「整体回顾」；骨架不换（P3 定案）
    let boards = V3_TEN_BOARDS
    if (lessonType === '习题课' || lessonType === '讲评课') boards = V3_TEN_BOARDS.filter((b) => b.id !== 'bd-context' && b.id !== 'bd-explore')
    if (lessonType === '复习课') boards = V3_TEN_BOARDS.filter((b) => b.id !== 'bd-context')
    const exampleSrc = body.example_source === 'ai' ? 'AI 配题' : '题库检索'
    const sections = boards.map((b) => ({
      id: b.id,
      name: b.name,
      minutes: b.minutes,
      goal: goalOf(b, topic, lessonType),
      example_suggestion: b.attachable ? `${exampleSrc}：围绕「${topic}」配 1 道${b.id === 'bd-variation' ? '变式' : b.id === 'bd-homework' ? '分层作业' : '基础例题'}（难度可调）` : undefined,
    }))
    // 按一节课时长等比缩放（0 分钟板块不缩放），保证 total = duration
    const raw = sections.filter((s) => s.minutes > 0)
    const rawSum = raw.reduce((a, s) => a + s.minutes, 0) || 1
    const k = duration / rawSum
    for (const s of raw) s.minutes = Math.max(1, Math.round(s.minutes * k))
    const total = raw.reduce((a, s) => a + s.minutes, 0)
    const notes = [
      `依据：${body.textbook_version || '人教A版（2019）'}${body.chapter ? ` · ${body.chapter}` : ''}`,
      body.lesson_no ? `第 ${body.lesson_no} 课时` : '',
      `课型：${lessonType} · 一节课 ${duration} 分钟`,
      body.class_id ? `班级学情锚点：${(V3_CLASSES.find((c) => c.class_id === body.class_id)?.name) || ''}（薄弱：椭圆离心率与几何性质）` : '',
      body.key_points ? `强调重难点：${body.key_points}` : '',
      `例题来源：${exampleSrc}（先检索相似题，避免重复出题）`,
    ].filter(Boolean)
    return ok(res, { topic, duration, sections, total_minutes: total, notes }), true
  }
  if (method === 'POST' && path === '/teacher-v3/generation/plan') {
    startSse(res)
    sendSse(res, 'meta', { topic: body.topic, lesson_type: body.lesson_type, template_id: body.template_id, boards: V3_TEN_BOARDS.length, note: body.outline ? '按教师确认的大纲生成（可增删环节 / 调时长）' : '按十板块骨架生成' })
    await sleep(400)
    // 教师确认后的大纲优先；未携带时回退十板块（兼容旧流程）
    const outline: { id: string; name: string; minutes: number }[] = Array.isArray(body.outline) && body.outline.length
      ? body.outline.map((s: any, i: number) => ({ id: s.id || `bd-${i}`, name: s.name, minutes: Number(s.minutes) || 0 }))
      : V3_TEN_BOARDS.map((b) => ({ id: b.id, name: b.name, minutes: b.minutes }))
    sendSse(res, 'outline', { sections: outline.map((s) => s.name) })
    const src = plans[0]
    for (let i = 0; i < outline.length; i++) {
      await sleep(360)
      const o = outline[i]
      const b = V3_TEN_BOARDS.find((x) => x.id === o.id)
      const s: any = JSON.parse(JSON.stringify(src?.sections[Math.min(i, (src?.sections.length || 1) - 1)] || {}))
      s.id = o.id
      s.name = o.name
      s.minutes = o.minutes
      s.confirmed = false
      // 例题/变式/作业板块自动附例题（挂例题）；教学目标板块演示套话检测（反套话）
      if (b?.attachable) {
        s.examples = (b.id === 'bd-examples' ? src?.sections.find((x) => x.id === 'bd-examples')?.examples
          : b.id === 'bd-variation' ? src?.sections.find((x) => x.id === 'bd-variation')?.examples
          : src?.sections.find((x) => x.id === 'bd-homework')?.examples) || [
          { id: uid('ex'), label: b.id === 'bd-examples' ? '例 1' : b.id === 'bd-variation' ? '变式 1' : '作业题', q_type: 'solve', difficulty: 'medium', stem_latex: `结合「${body.topic || '本课题'}」给出的一道例题。`, answer: '略', source: '校本' },
        ]
      }
      if (o.id === 'bd-objectives') {
        s.teacher_activity = '引导学生自主探究，激发学习兴趣，培养学生分析问题与解决问题的能力。'
        s.student_activity = '体会知识的形成过程，增强学好数学的信心。'
        s.cliche = true
        s.cliche_hits = ['空泛的「激发……兴趣」，未说清用什么激', '口号式能力表述，缺具体题例']
      }
      sendSse(res, 'section', { index: i, section: s })
    }
    await sleep(240)
    const plan = JSON.parse(JSON.stringify(src))
    plan.id = uid('plan')
    plan.topic = body.topic
    plan.class_id = body.class_id
    plan.lesson_type = body.lesson_type
    plan.template_id = body.template_id
    if (!Array.isArray(plan.sections)) plan.sections = []
    plans.unshift(plan)
    sendSse(res, 'done', { plan_id: plan.id })
    res.end()
    return true
  }
  const aiElMatch = path.match(/^\/teacher-v3\/generation\/decks\/([^/]+)\/ai-element$/)
  if (method === 'POST' && aiElMatch) {
    startSse(res)
    sendSse(res, 'meta', { deck_id: aiElMatch[1], slide_id: body.slide_id, hint: body.hint })
    await sleep(360)
    sendSse(res, 'suggest', { note: `理解意图：${body.hint || '优化当前页'}` })
    await sleep(420)
    sendSse(res, 'diff', {
      diffs: [
        { slide_id: body.slide_id, op: 'add', after: { id: uid('e'), type: 'formula', left: 460, top: 520, width: 460, height: 52, z: 2, latex: 'e=\\frac{c}{a}=\\frac{1}{2}', font_size: 22, display: true, teacher_confirmed: false }, reason: '补充离心率表达式，呼应「焦点弦」考点' },
        { slide_id: body.slide_id, op: 'modify', element_id: 'e1', after: null, reason: '建议收紧题干行距（不改动内容）' },
      ],
    })
    await sleep(220)
    sendSse(res, 'done', { applied: false, note: 'diff 已生成，等待教师逐条采纳' })
    res.end()
    return true
  }

  /* ============ figures 图形域 ============ */
  if (method === 'GET' && path === '/teacher-v3/figures/presets') {
    return ok(res, {
      items: FIGURE_PRESETS.map(({ build, miniSvg, boundingbox, axis, ...rest }) => rest),
    }), true
  }
  if (method === 'POST' && path === '/teacher-v3/figures/recipes') {
    const r = { id: uid('rcp'), name: body.name, category: 'solid', author: '李文澜', school_shared: !!body.school_shared, params: [], usage_count: 0, note: body.note || '' }
    recipes.unshift(r as any)
    return ok(res, r), true
  }

  /* ============ draw 绘图工作台域（P1） ============ */
  if (method === 'GET' && path === '/teacher-v3/draw/library') return ok(res, { items: drawLibrary }), true
  if (method === 'POST' && path === '/teacher-v3/draw/library') {
    const item = {
      id: uid('fig'), name: String(body.name || '未命名图形'), kind: body.kind === 'fx' ? 'fx' as const : 'free' as const,
      author: '我', shared: !!body.shared, updated_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      thumb: String(body.thumb || ''), records: body.records, expr: body.expr,
    }
    drawLibrary.unshift(item)
    return ok(res, item), true
  }
  if (method === 'POST' && path === '/teacher-v3/draw/hand-recognize') {
    startSse(res)
    const strokes = Math.max(1, Number(body.strokes) || 1)
    sendSse(res, 'meta', { model: 'mock-hand-latex', strokes, note: '手写公式识别（VLM）：识别结果载入编辑器审查，不直接定稿' })
    await sleep(420)
    sendSse(res, 'recognizing', { stage: '笔迹分割 → 符号分类 → LaTeX 组装', progress: 40 })
    await sleep(560)
    const pool = [
      'a^{2}+b^{2}=c^{2}',
      '\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1',
      "f'(x)=3x^{2}-2",
      '\\sin^{2}\\theta+\\cos^{2}\\theta=1',
      'e=\\frac{c}{a}',
      'y=2x-\\frac{1}{x}',
      '\\int_{1}^{e}\\frac{1}{x}\\,\\mathrm{d}x=1',
      '\\sqrt{a^{2}+b^{2}}',
    ]
    sendSse(res, 'result', { latex: pool[strokes % pool.length], confidence: 0.82 + (strokes % 5) * 0.03 })
    await sleep(240)
    sendSse(res, 'done', { editable: true, note: '识别结果已生成，请在编辑器中审查修改后使用' })
    res.end()
    return true
  }

  /* ============ butler AI 管家域（悬浮球 chat-to-action） ============ */
  if (method === 'GET' && path === '/teacher-v3/butler/tools') {
    return ok(res, {
      tools: [
        { name: 'search_web', label: '联网搜索', kind: 'read', confirm_required: false, description: '联网检索教学资料，返回带引用的结果' },
        { name: 'kb_search', label: '个人知识库检索', kind: 'read', confirm_required: false, description: '在教师上传的教材/教案/课件中检索' },
        { name: 'quiz_import_question', label: '题目入库', kind: 'write', confirm_required: true, description: '识别/编辑后的题目结构化写入题库（教师确认后执行）' },
        { name: 'navigate', label: '页面跳转', kind: 'frontend', confirm_required: false, description: '跳转到课件工坊/备课中心等页面并预填参数' },
        { name: 'prefill', label: '表单预填', kind: 'frontend', confirm_required: false, description: '在当前页面预填生成表单参数' },
        { name: 'insert_element', label: '插入画布元素', kind: 'frontend', confirm_required: false, description: '把公式/图形卡片插入当前课件页（teacher_confirmed=false）' },
      ],
    }), true
  }

  if (method === 'POST' && path === '/teacher-v3/butler/chat') {
    startSse(res)
    const msg = String(body.message || '')
    const text = msg.toLowerCase()
    const hasImages = Array.isArray(body.images) && body.images.length > 0
    const ctx = body.context || {}
    const sessionId = uid('bs')

    /* 意图路由（P0 规则层演示；real = 规则 + 小模型分类 + 大模型 FC 三层） */
    const wantsDeck = /做.{0,16}?(课件|ppt|演示文稿)|生成.{0,12}?(课件|ppt)|备课/.test(text)
    const wantsQuizImport = (hasImages && /存(入|到).{0,6}(题库|题目|错题)|入库/.test(text)) || (/存(入|到).{0,6}(题库|错题)/.test(text) && hasImages)
    const wantsSearch = body.web_search === true || /联网|搜索|查一查|最新/.test(text)
    const wantsFormula = /根号|平方|分之|阶乘|绝对值|正弦|余弦|正切|对数|极限|导数/.test(msg)

    if (wantsQuizImport) {
      /* 剧本B：题目图片 + 存入题库 → 识别预览卡 → 确认动作卡（R2：教师确认后才入库） */
      sendSse(res, 'meta', { session_id: sessionId, intent: 'quiz_import', note: '图片已附带，走拍照识别链路' })
      await sleep(300)
      sendSse(res, 'thinking', { text: '先解读题目照片，再生成入库草稿；原图保留对照，入库前由教师确认。' })
      await sleep(260)
      sendSse(res, 'tool_call', { tool: 'photo_recognize', label: '识别题目照片' })
      await sleep(620)
      const kp = /圆锥|椭圆|双曲线|抛物线/.test(msg) ? '圆锥曲线' : /函数|导数/.test(msg) ? '导数及其应用' : /三角/.test(msg) ? '三角函数' : '数列'
      sendSse(res, 'tool_result', { tool: 'photo_recognize', ok: true, summary: `已识别题干与解答（知识点建议：${kp}），识别块均可编辑` })
      await sleep(200)
      sendSse(res, 'card', {
        type: 'action', id: uid('act'), title: '存入题库', confirm_required: true, status: 'pending',
        summary: `将识别的题目写入「${kp}」分类，题干与解析可在题库中继续编辑`,
        params: { kp_name: kp, q_type: 'solve', difficulty: 'medium' },
      })
      await sleep(180)
      sendSse(res, 'token', { text: '已生成入库草稿。请核对右侧动作卡的内容，点击「执行」后才会真正写入题库；原图与识别结果均可在题库中查看修改。' })
    } else if (wantsDeck) {
      /* 剧本A：我要做PPT → 理解摘要 + 预填跳转（进入既有生成工作流，模板选择/大纲确认保留） */
      sendSse(res, 'meta', { session_id: sessionId, intent: 'deck_generate', note: '跳转课件工坊并预填' })
      await sleep(300)
      const topicMatch = msg.match(/[《「“"]([^》」”"]+)[》」”"]/)
      const topic = topicMatch ? topicMatch[1] : msg.replace(/帮|我|请|做|个|一|份|生成|课件|ppt|演示文稿|关于|的|主题/g, '').slice(0, 18) || '椭圆及其标准方程'
      sendSse(res, 'thinking', { text: '生成课件需要教师控制模板与大纲，跳转课件工坊并预填表单最合适。' })
      await sleep(240)
      sendSse(res, 'token', { text: `好的，将前往课件工坊并预填：主题「${topic}」、班级高二(3)班、模板学术蓝。模板与大纲仍由您在工坊内选定确认。` })
      await sleep(220)
      sendSse(res, 'card', {
        type: 'link', id: uid('lnk'), title: `课件工坊 · 主题生成（${topic}）`,
        route: '/teacher-v3/slides', query: { mode: 'topic', topic, class_id: 'c2-03', template_id: 'tpl-academic-blue' },
        note: '预填后仍需您确认模板与大纲',
      })
      await sleep(160)
      sendSse(res, 'action', { action: 'navigate', route: '/teacher-v3/slides', query: { mode: 'topic', topic, class_id: 'c2-03', template_id: 'tpl-academic-blue' }, toast: `已预填主题「${topic}」` })
    } else if (wantsSearch) {
      sendSse(res, 'meta', { session_id: sessionId, intent: 'web_search' })
      await sleep(280)
      sendSse(res, 'tool_call', { tool: 'search_web', label: '联网检索' })
      await sleep(560)
      sendSse(res, 'tool_result', { tool: 'search_web', ok: true, summary: '检索到 3 条相关来源' })
      await sleep(200)
      sendSse(res, 'token', { text: '结合检索结果：椭圆的第一定义为平面上到两定点距离之和为常数（大于两定点间距）的点的轨迹，人教A版教材同时给出第二定义（焦点-准线）。建议课堂用绳长实验引入第一定义，再从第二定义过渡到离心率。' })
      await sleep(240)
      sendSse(res, 'citation', { sources: [
        { index: 1, title: '人教A版选择性必修一 · 2.2 椭圆', url: 'https://www.pep.com.cn/gzsx/xrjdgzsx/ssl', snippet: '教材原文：平面内与两个定点F₁、F₂的距离的和等于常数…' },
        { index: 2, title: '课程标准（2017版2020修订）· 圆锥曲线', url: 'http://www.moe.gov.cn', snippet: '经历从具体情境中抽象出椭圆的过程…' },
        { index: 3, title: '椭圆定义的六种引入方式比较', url: 'https://example.com/ellipse-intro', snippet: '绳长实验引入在课堂实测中概念留存率最高…' },
      ] })
    } else if (wantsFormula) {
      /* 数学口语直接出公式卡（与语音公式链路同一解析层） */
      sendSse(res, 'meta', { session_id: sessionId, intent: 'formula_parse' })
      await sleep(260)
      const latex = voiceToLatex(msg)
      sendSse(res, 'token', { text: '识别为如下公式，可拖入课件或点开编辑：' })
      await sleep(200)
      sendSse(res, 'card', { type: 'formula', id: uid('fml'), latex, confidence: 0.88, source: 'chat' })
    } else {
      /* 默认：数学对话（流式 + KaTeX 内联） */
      sendSse(res, 'meta', { session_id: sessionId, intent: 'math_chat' })
      await sleep(280)
      sendSse(res, 'thinking', { text: ctx.route_title ? `结合当前页面（${ctx.route_title}）回答。` : '直接回答数学问题。' })
      await sleep(200)
      const reply = `好的。以 $\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1\\;(a>b>0)$ 为例：这个方程里 $a$ 定长轴、$b$ 定短轴，离心率 $e=\\frac{c}{a}$ 反映扁圆程度。需要我把它做成公式卡片拖进课件，还是展开讲解推导？`
      for (const seg of reply.match(/[\s\S]{1,14}/g) || []) {
        sendSse(res, 'token', { text: seg })
        await sleep(90)
      }
      await sleep(140)
      sendSse(res, 'card', { type: 'formula', id: uid('fml'), latex: '\\frac{x^{2}}{a^{2}}+\\frac{y^{2}}{b^{2}}=1\\;(a>b>0)', confidence: 0.92, source: 'chat' })
    }
    await sleep(160)
    sendSse(res, 'done', { finish_reason: 'stop' })
    res.end()
    return true
  }

  if (method === 'POST' && path === '/teacher-v3/butler/voice-formula') {
    /* 语音公式链（P0：text 模拟语音；P1 挂真 ASR）：
       asr_partial*（教师能看到 AI 听到了什么）→ asr_final → card(formula) → done。
       解析三层 = 规则引擎（下述映射）→ LLM（real）→ KaTeX 编译验证；结果必须进编辑器审查（R2）。 */
    startSse(res)
    const spoken = String(body.text || '')
    sendSse(res, 'meta', { session_id: uid('bs'), intent: 'voice_formula', note: 'P0 文本模拟语音输入；P1 接入讯飞/Whisper ASR' })
    const chunks = spoken.match(/[\s\S]{1,6}/g) || []
    for (const c of chunks) {
      await sleep(150)
      sendSse(res, 'asr_partial', { text: c })
    }
    await sleep(180)
    sendSse(res, 'asr_final', { text: spoken })
    await sleep(260)
    const latex = voiceToLatex(spoken)
    const alts = latex.includes('sqrt') ? [latex.replace(/\\sqrt\{([^{}]+)\}/, '$1'), latex] : [latex]
    sendSse(res, 'card', { type: 'formula', id: uid('fml'), latex, confidence: 0.86, alternatives: alts, source: 'voice' })
    await sleep(160)
    sendSse(res, 'done', { finish_reason: 'stop', note: '识别结果可编辑可拖拽，未直接定稿' })
    res.end()
    return true
  }

  const butlerConfirmMatch = path.match(/^\/teacher-v3\/butler\/actions\/([^/]+)\/confirm$/)
  if (method === 'POST' && butlerConfirmMatch) {
    /* 写动作确认（R 红线：教师点了执行才入库；这里复用题库 quizQuestions 的内存态） */
    const kp = String((body.params as Record<string, unknown>)?.kp_name || '圆锥曲线')
    const q = {
      id: uid('q'),
      kp_name: kp,
      kp_code: 'CV-01',
      kp_path: ['数学', '圆锥曲线'],
      q_type: 'solve',
      difficulty: 'medium',
      stem_latex: '\\text{（管家识别入库）设椭圆}\\frac{x^{2}}{4}+\\frac{y^{2}}{3}=1\\text{的左右焦点为}F_1,F_2\\text{，过}F_1\\text{的直线交椭圆于}A,B\\text{，求}\\triangle ABF_2\\text{的周长。}',
      answer: '8',
      analysis: '由椭圆定义 |AF₁|+|AF₂|=2a=4，|BF₁|+|BF₂|=4，周长=8。',
      source: '拍照入库',
      year: '2026',
      use_count: 0,
      folder_refs: [],
    }
    quizQuestions.unshift(q)
    tasks.unshift({ task_id: uid('task'), title: `管家入库：${kp}题目`, capability: 'butler', status: 'succeeded', progress: 100, stage: '完成' })
    return ok(res, { ok: true as const, result: { question_id: q.id, kp_name: kp } }), true
  }

  /* ============ grading 批改域 ============ */
  if (method === 'GET' && path === '/teacher-v3/grading/assignments') return ok(res, { items: V3_GRADING_ASSIGNMENTS }), true
  const gaMatch = path.match(/^\/teacher-v3\/grading\/assignments\/([^/]+)$/)
  if (method === 'GET' && gaMatch) return ok(res, grading), true
  const clusterMatch = path.match(/^\/teacher-v3\/grading\/assignments\/([^/]+)\/clusters\/([^/]+)\/confirm$/)
  if (method === 'POST' && clusterMatch) {
    for (const q of grading.questions) {
      const c = q.clusters.find((x: { id: string }) => x.id === clusterMatch[2])
      if (c) { for (const s of c.sample) s.feedback = body.feedback }
    }
    return ok(res, { ok: true as const }), true
  }
  const reviewMatch = path.match(/^\/teacher-v3\/grading\/assignments\/([^/]+)\/review-pack$/)
  if (method === 'POST' && reviewMatch) {
    startSse(res)
    sendSse(res, 'meta', { assignment_id: reviewMatch[1], questions: grading.questions.length })
    await sleep(380)
    for (let i = 0; i < grading.questions.length; i++) {
      const q = grading.questions[i]
      await sleep(480)
      sendSse(res, 'slide', {
        index: i, q_no: q.q_no, accuracy: q.accuracy,
        top_error: q.error_dist[0]?.tag || '无',
        clusters: q.clusters.map((c: any) => ({ id: c.id, kind: c.kind, count: c.count })),
      })
    }
    await sleep(240)
    sendSse(res, 'done', { deck_id: 'deck-review-1', slides: grading.questions.length + 1 })
    res.end()
    return true
  }

  return false
}
