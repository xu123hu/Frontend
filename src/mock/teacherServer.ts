import {
  ROSTER_NAMES, TEACHER_CLASSES, classInsights, gradingDetail, gradingQueue, iso, lessonArtifact, quizArtifact, seedResources, todayData, videoInsights,
} from './teacherData'
import type {
  Assignment, AssignmentStatus, ClassroomModeState, ClassroomSessionQuestion, ClassroomSessionState, GradingQueueItem, SourceRef, TeacherArtifact, TeacherResource, TeacherTask, UploadTicket,
} from '@/types/teacher'

function readBody(req: any) {
  return new Promise<any>((resolve) => {
    let buf = ''
    req.on('data', (c: any) => { buf += c })
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}) } catch { resolve({}) } })
  })
}
function send(res: any, status: number, obj: any) { if (res.headersSent || res.writableEnded) return; res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
function ok(res: any, data: any, status = 200) { send(res, status, { code: 0, message: 'ok', data }) }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fail(res: any, status: number, code: number, message: string, data: unknown = null) { send(res, status, { code, message, data }) }
function sendFile(res: any, filename: string, text: string) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
  res.end(text)
}
/** 演示文件正文：由教案 artifact 生成（mock 仅服务 e2e 稳定性，真实文件由后端产出） */
function mockLessonFileText(art: TeacherArtifact | undefined, kind: 'plan' | 'slides' | 'outline') {
  const content = (art?.content || {}) as { topic?: string; timeline?: Array<{ phase?: string; minutes?: number; activities?: string[] }> }
  const topic = content.topic || '课堂教案'
  if (kind === 'slides') {
    const lines = (content.timeline || []).map((s, i) => `${i + 1}. ${s.phase}（${s.minutes || 5} 分钟）：${(s.activities || []).join('；')}`)
    return `课堂课件大纲（演示）· ${topic}\n\n${lines.join('\n')}\n`
  }
  if (kind === 'outline') {
    const lines = (content.timeline || []).map((s, i) => `${i + 1}. ${s.phase}（${s.minutes || 5} 分钟）：${(s.activities || []).join('；')}`)
    return `课堂板书提纲（演示）· ${topic}\n\n${lines.join('\n')}\n`
  }
  const lines = (content.timeline || []).map((s, i) => `环节${i + 1} ${s.phase}（${s.minutes || 5} 分钟）：${(s.activities || []).join('；')}`)
  return `教案（演示）· ${topic}\n\n${lines.join('\n')}\n`
}

/* ===== 内存状态（E2E 每个 worker 独立进程/数据实例，可确定性重置） ===== */
let artifacts = new Map<string, TeacherArtifact>()
let assignments = new Map<string, Assignment>()
let gradingItems: GradingQueueItem[] = gradingQueue()
let gradingReviews = new Map<string, 'pending' | 'cleared'>()
let resources: TeacherResource[] = seedResources()
let tasks = new Map<string, TeacherTask>()
let modes = new Map<string, ClassroomModeState>()
let sessions = new Map<string, ClassroomSessionState>()
const idem = new Map<string, unknown>()
let seq = 1

function nextId(prefix: string) { return `${prefix}-${seq++}` }
function isTeacherToken(req: any) { return (req.headers?.authorization || '').includes('mock-token-teacher-preview') }

function advanceTask(id: string): TeacherTask {
  const t = tasks.get(id)
  if (!t) return { task_id: id, capability: '', status: 'failed', progress: 0, stage: '未找到', artifact_id: null, error_code: null }
  const elapsed = Date.now() - (t.created_at ? new Date(t.created_at).getTime() : Date.now())
  if (t.status === 'cancelled') return t
  if (elapsed < 400) { t.status = 'queued'; t.progress = 0 }
  else if (elapsed < 900) { t.status = 'running'; t.progress = 50; t.stage = '生成中' }
  else { t.status = 'succeeded'; t.progress = 100; t.stage = '完成'; t.artifact_id = t.artifact_id || `art-slides-${id.split('-').pop()}` }
  tasks.set(id, t)
  return t
}

function resetTeacherMock() {
  artifacts = new Map(); assignments = new Map(); gradingItems = gradingQueue(); resources = seedResources()
  gradingReviews = new Map(); tasks = new Map(); modes = new Map(); sessions = new Map(); idem.clear(); seq = 1
}

function assertScope(cid: string): boolean { return TEACHER_CLASSES.some((c) => c.id === cid) }

function workspaceState(item: GradingQueueItem): 'ungraded' | 'review' | 'confirmed' {
  if (item.status === 'confirmed') return 'confirmed'
  if (gradingReviews.get(item.submission_item_id) === 'pending' || item.status === 'low_confidence') return 'review'
  return 'ungraded'
}

function gradingWorkspace(selectedId: string | null, status: string) {
  const queue = gradingItems
    .map((item, index) => ({
      submission_item_id: item.submission_item_id,
      anonymous_label: '第 ' + String(index + 1) + ' 份作答',
      state: workspaceState(item),
      manual_review: gradingReviews.get(item.submission_item_id) === 'pending',
    }))
    .filter((item) => status === 'all' || item.state === status)
  const selected = queue.find((item) => item.submission_item_id === selectedId)
    || queue.find((item) => item.state !== 'confirmed')
    || queue[0]
  const selectedIndex = selected ? queue.findIndex((item) => item.submission_item_id === selected.submission_item_id) : -1
  const item = selected ? gradingItems.find((candidate) => candidate.submission_item_id === selected.submission_item_id) : null
  const detail = item ? gradingDetail(item) : null
  const sourceFileId = selected?.submission_item_id === 'si-4' ? 'scan-si-4' : null
  const following = selectedIndex >= 0 ? [...queue.slice(selectedIndex + 1), ...queue.slice(0, selectedIndex)] : []
  const nextUngraded = following.find((entry) => entry.state !== 'confirmed')
  const confirmed = queue.filter((entry) => entry.state === 'confirmed').length
  return {
    context: {
      class: { class_id: 'c1', label: '高二（3）班 · 46 人' },
      assignment: { assignment_id: 'a1', title: '函数的单调性' },
      question: {
        item_no: 1,
        question_text: '已知 f(x)=x^3-3x，讨论函数的单调性。',
        q_type: 'solution',
        options: null,
        max_score: 10,
      },
      filters: { status },
      progress: { total: queue.length, confirmed, remaining: queue.length - confirmed },
    },
    available_context: {
      assignments: [{ assignment_id: 'a1', title: '函数的单调性' }],
      questions: [{ item_no: 1, label: '第 1 题', question_text: '已知 f(x)=x^3-3x，讨论函数的单调性。' }],
    },
    queue,
    selected: detail && selected ? {
      submission_item_id: selected.submission_item_id,
      work: { original_answer: detail.original_answer, file_id: sourceFileId },
      scoring: {
        max_score: 10,
        rubric_status: 'ready',
        rubric_items: [
          { id: 'derivative', criterion: '正确求导', points: 3, evidence_hint: '写出 f′(x)=3x²−3' },
          { id: 'critical', criterion: '确定分界点', points: 3, evidence_hint: 'x=-1,1' },
          { id: 'interval', criterion: '写出单调区间', points: 4, evidence_hint: '给出增减区间' },
        ],
        standard_answer: 'f′(x)=3x²−3；由导数符号判断函数的增减区间。',
        answer_analysis: '先求导，确定临界点，再判断每个区间的导数符号。',
        fallback_standard: detail.scoring_standard,
      },
      suggestion: {
        suggestion_id: detail.suggestion?.suggestion_id ?? null,
        version: detail.suggestion?.version ?? 1,
        proposed_score: detail.suggestion?.suggestion_score ?? null,
        review_needed: detail.suggestion?.review_needed ?? true,
        evidence: [{ kind: 'grading_evidence', text: detail.suggestion?.evidence ?? '待教师核对原始作答与评分点。' }],
      },
      confirmed_decision: item?.teacher_final_score === null ? null : {
        final_score: item?.teacher_final_score,
        feedback: detail.suggestion?.teacher_feedback ?? null,
        decision: detail.suggestion?.decision ?? null,
      },
      fixture_id: sourceFileId ? 'handwritten-scan' : 'derivative-solution',
      source_ref: 'docs/teacher-v2/references/grading/TEST_INPUT_CORPUS.md',
    } : null,
    navigation: {
      previous_id: selectedIndex > 0 ? queue[selectedIndex - 1].submission_item_id : null,
      next_ungraded_id: nextUngraded?.submission_item_id ?? null,
    },
  }
}

export async function handleTeacherApi(req: any, res: any): Promise<boolean> {
  const [url, queryString = ''] = (req.url || '').split('?')
  const query = new URLSearchParams(queryString)
  const method = req.method
  const seg = url.split('/').filter(Boolean)
  const isTeacher = isTeacherToken(req)

  // 鉴权：教师端点必须 teacher 预览 token；否则 401/403
  if (seg[0] === 'teacher' || seg[0] === '_mock') {
    if (seg[0] === '_mock' && seg[1] === 'teacher' && seg[2] === 'reset') { resetTeacherMock(); ok(res, { reset: true }); return true }
    if (!isTeacher) { fail(res, 403, 40301, 'role_denied'); return true }
  }
  if (method === 'GET' && url === '/classes/mine') { ok(res, { items: TEACHER_CLASSES }); return true }
  if (method === 'GET' && seg[0] === 'classes' && seg[1] && seg[2] === 'members') {
    // 班级花名册（L5/TC-L5-F04）：与统一数据世界同源——高二（3）班 46 名学生 + 1 名教师
    if (!assertScope(seg[1])) { fail(res, 403, 40302, 'class_scope_denied'); return true }
    const students = ROSTER_NAMES.map((name, i) => ({
      userId: `stu-${i + 1}`,
      nickname: name,
      nicknameInClass: name,
      memberRole: 'student',
      confirmed: true,
    }))
    ok(res, { items: [{ userId: 't1', nickname: '李老师', nicknameInClass: '李老师', memberRole: 'teacher', confirmed: true }, ...students] })
    return true
  }
  if (seg[0] !== 'teacher') return false

  if (method === 'GET' && url === '/teacher/today') { ok(res, todayData()); return true }

  /* 班级洞察 / 课堂 */
  if (seg[0] === 'teacher' && seg[1] === 'classes' && seg[2]) {
    const cid = seg[2]
    if (!assertScope(cid)) { fail(res, 403, 40302, 'class_scope_denied'); return true }
    // 契约同构：后端返回 data:{insights:[...]}（api 层按 res.data.insights 解包），mock 同形
    if (seg[3] === 'insights') { ok(res, { insights: classInsights(cid) }); return true }
    if (seg[3] === 'video-insights') { ok(res, videoInsights(cid)); return true }
    if (seg[3] === 'classroom-mode') {
      if (method === 'GET') { ok(res, modes.get(cid) || { enabled: false, class_id: cid, lesson_id: null, ttl_seconds: 0, updated_at: iso(), degraded: false }); return true }
      if (method === 'POST') {
        const b = await readBody(req)
        const mode: ClassroomModeState = { enabled: !!b.enabled, class_id: cid, lesson_id: b.lesson_id || null, ttl_seconds: b.enabled ? 3600 : 0, updated_at: iso(), degraded: false }
        modes.set(cid, mode)
        ok(res, mode); return true
      }
    }
    // ===== 课堂会话（契约 2026-09-01 accepted；镜像后端 test_m3_teacher_classroom.py 断言） =====
    if (seg[3] === 'classroom-session') {
      if (method === 'GET' && !seg[4]) {
        ok(res, sessions.get(cid) || { class_id: cid, session_id: null, topic: '', room: '', started_at: '', status: 'idle', connected_total: 0, current_segment: null, last_question: null, degraded: false })
        return true
      }
      if (seg[4] === 'start' && method === 'POST') {
        const b = await readBody(req)
        const session: ClassroomSessionState = {
          class_id: cid, session_id: `sess-${cid}-${seq++}`, topic: String(b.topic || ''), room: String(b.room || ''),
          started_at: iso(), status: 'active', connected_total: 44, current_segment: null, last_question: null, degraded: false,
        }
        sessions.set(cid, session)
        ok(res, session); return true
      }
      if (seg[4] === 'question' && method === 'POST') {
        const b = await readBody(req)
        const session = sessions.get(cid)
        if (!session || session.status !== 'active') { fail(res, 409, 40910, 'session_not_active'); return true }
        // 确定性：同 question_no 同分布（对标后端 question_no % 题池长度 断言）
        const no = Math.max(0, Number(b.question_no) || 0)
        const question: ClassroomSessionQuestion = {
          question_id: `sq-${cid}-${no}`, prompt: `检测题 ${no + 1}：导数与函数单调性（题池第 ${no + 1} 题）`,
          options: ['A 选项', 'B 选项', 'C 选项', 'D 选项'], correct_index: 0, focus: '导数与函数单调性',
          submitted: 44, correct_rate: 66, distribution: [18, 12, 9, 5], main_wrong_option: 'C',
          ai_reminder: '错误模式与最近一次作业一致，建议再用 3 分钟讲 a=0 边界分类。',
          pattern_similar: true, variant: '变式：讨论 f(x)=x³−3ax 的单调性（按 a 分类）',
        }
        session.last_question = question
        sessions.set(cid, session)
        ok(res, question); return true
      }
      if (seg[4] === 'close' && method === 'POST') {
        const session = sessions.get(cid)
        if (session) { session.status = 'ended'; sessions.set(cid, session) }
        ok(res, { status: 'ended' }); return true
      }
    }
    return false
  }

  /* 教案 */
  if (method === 'POST' && url === '/teacher/lessons/adapt') {
    const b = await readBody(req)
    const art = lessonArtifact(b.class_id || 'c1', b.topic || '未命名课题', b.requirements || '')
    art.artifact_id = nextId('art-lesson')
    artifacts.set(art.artifact_id, art)
    ok(res, art, 201); return true
  }
  if (method === 'GET' && url === '/teacher/lessons') {
    ok(res, Array.from(artifacts.values()).filter((a) => a.artifact_type === 'lesson_plan')); return true
  }
  if (seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && seg[3] === 'slides') {
    // 课件为同步 Artifact（api 层契约注释）；mock 仅产出演示文件（e2e 稳定），真实文件由后端生成
    const src = artifacts.get(seg[2])
    const art: TeacherArtifact = {
      artifact_id: nextId('art-slides'), artifact_type: 'slides', scene: 'teacher.prep', class_id: src?.class_id || 'c1', owner_id: 't1',
      status: 'draft', version: 1, engine: 'local',
      content: { slides: [], download_url: `/api/teacher/lessons/${seg[2]}/slides-file`, filename: '课堂课件-演示.txt' },
      source_refs: [], warnings: [], degraded: false, created_at: iso(), updated_at: iso(),
    }
    artifacts.set(art.artifact_id, art); ok(res, art, 201); return true
  }
  if (seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && seg[3] === 'explainer') {
    // 板书提纲/讲题卡为同步 Artifact（TC-L2-F09：废除前端拼 txt）
    const src = artifacts.get(seg[2])
    const art: TeacherArtifact = {
      artifact_id: nextId('art-outline'), artifact_type: 'explanation', scene: 'teacher.prep', class_id: src?.class_id || 'c1', owner_id: 't1',
      status: 'draft', version: 1, engine: 'local',
      content: { outline: mockLessonFileText(src, 'outline'), download_url: `/api/teacher/lessons/${seg[2]}/board-outline-file`, filename: '课堂板书提纲-演示.txt' },
      source_refs: [], warnings: [], degraded: false, created_at: iso(), updated_at: iso(),
    }
    artifacts.set(art.artifact_id, art); ok(res, art, 201); return true
  }
  if (seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && seg[3] === 'adopt-suggestion') {
    // 采纳建议落库（契约 2026-09-01 accepted；幂等重放返回同一 artifact）
    const b = await readBody(req)
    const key = req.headers?.['idempotency-key'] as string | undefined
    const art = artifacts.get(seg[2])
    if (!art) { fail(res, 404, 40400, 'lesson_not_found'); return true }
    if (!b?.suggestion_id || !b?.segment_id) { fail(res, 422, 40001, 'suggestion_payload_incomplete'); return true }
    if (key && idem.has(key)) { ok(res, idem.get(key)); return true }
    art.version += 1
    art.status = 'draft'
    art.updated_at = iso()
    const timeline = (art.content as any)?.timeline
    if (Array.isArray(timeline) && timeline.length) {
      const target = timeline.find((s: any) => (s as any).segment_id === b.segment_id) || timeline[0]
      const activities = Array.isArray(target.activities) ? target.activities : []
      target.activities = [...activities, b.content || `采纳建议：${b.suggestion_id}`]
    }
    artifacts.set(seg[2], art)
    if (key) idem.set(key, art)
    ok(res, art); return true
  }
  if (method === 'GET' && seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && (seg[3] === 'download' || seg[3] === 'slides-file' || seg[3] === 'board-outline-file')) {
    const art = artifacts.get(seg[2])
    if (seg[3] === 'download') return sendFile(res, `${String((art?.content as any)?.topic || '课堂教案')}-演示.txt`, mockLessonFileText(art, 'plan')), true
    if (seg[3] === 'slides-file') return sendFile(res, '课堂课件-演示.txt', mockLessonFileText(art, 'slides')), true
    return sendFile(res, '课堂板书提纲-演示.txt', mockLessonFileText(art, 'outline')), true
  }
  if (seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && seg[3] === 'apply-insight') {
    const art = artifacts.get(seg[2]) || lessonArtifact('c1', '应用洞察', '')
    art.version += 1; art.artifact_id = seg[2]; art.status = 'draft'; art.updated_at = iso()
    artifacts.set(seg[2], art); ok(res, art); return true
  }

  /* 出题 */
  if (method === 'POST' && url === '/teacher/quizzes/generate') {
    const b = await readBody(req)
    try {
      const art = quizArtifact(b.knowledge_points || ['函数单调性'], b.count || 6, { question_types: b.question_types, difficulty: b.difficulty })
      art.artifact_id = nextId('art-quiz'); artifacts.set(art.artifact_id, art)
      ok(res, art, 201); return true
    } catch (error: any) {
      fail(res, 422, 40001, error?.message || 'question_type_quota_exceeds_count'); return true
    }
  }

  /* Artifact CRUD + 状态机 + 任务 */
  if (seg[0] === 'teacher' && seg[1] === 'artifacts' && seg[2]) {
    const id = seg[2]
    const art = artifacts.get(id)
    if (method === 'GET') { if (!art) return fail(res, 404, 40400, 'not_found'), true; ok(res, art); return true }
    if (method === 'PUT') {
      const b = await readBody(req)
      if (!art) { fail(res, 404, 40400, 'not_found'); return true }
      if (b.version !== undefined && b.version < art.version) { fail(res, 409, 40901, 'version_conflict'); return true }
      art.content = b.content ?? art.content; art.version += 1; art.updated_at = iso()
      artifacts.set(id, art); ok(res, art); return true
    }
    if (method === 'POST' && seg[3] === 'confirm') {
      if (!art) { fail(res, 404, 40400, 'not_found'); return true }
      if (art.status !== 'draft') { fail(res, 409, 40901, 'version_conflict'); return true }
      art.status = 'confirmed'; art.confirmed_by = 't1'; art.confirmed_at = iso(); art.updated_at = iso()
      artifacts.set(id, art); ok(res, art); return true
    }
    if (method === 'POST' && seg[3] === 'publish') {
      if (!art) { fail(res, 404, 40400, 'not_found'); return true }
      if (art.status !== 'confirmed') { fail(res, 422, 42210, 'confirmation_required'); return true }
      art.status = 'published'; art.updated_at = iso(); artifacts.set(id, art); ok(res, art); return true
    }
    if (method === 'POST' && seg[3] === 'archive') {
      if (!art) { fail(res, 404, 40400, 'not_found'); return true }
      art.status = 'archived'; art.updated_at = iso(); artifacts.set(id, art); ok(res, art); return true
    }
    return false
  }
  if (seg[0] === 'teacher' && seg[1] === 'tasks' && seg[2]) {
    const id = seg[2]
    if (method === 'GET') { ok(res, advanceTask(id)); return true }
    if (method === 'POST' && seg[3] === 'cancel') { const t = tasks.get(id); if (t) { t.status = 'cancelled'; tasks.set(id, t) }; ok(res, t || { task_id: id, status: 'cancelled' }); return true }
    return false
  }

  /* 批改 */
  if (seg[0] === 'teacher' && seg[1] === 'grading') {
    // 契约同构（RC-05-1/B1）：真实后端返回 data:{queue:[...]}，前端 gallery 按 res.data?.queue 解包；同形避免 mock 静默空态

    if (method === 'GET' && url === '/teacher/grading/queue') { ok(res, { queue: gradingItems }); return true }
    if (method === 'GET' && url === '/teacher/grading/workspace') {
      const selectedId = query.get('submission_item_id')
      const status = query.get('status') || 'all'
      ok(res, gradingWorkspace(selectedId, status)); return true
    }
    if (method === 'GET' && url === '/teacher/grading/insights') {
      // 批后讲评（GP-11）：数字与统一数据世界同源——a=0 边界 17/46（正确率 63%），SSOT 21 份待批
      ok(res, {
        assignment_id: 'asg-derivative-weekly',
        title: '《导数周测》',
        review_rate: 19,
        top_questions: [
          { item_no: 4, question_text: '讨论 f(x)=ln x−ax 的单调性（a=0 边界分类）', wrong_count: 17, correct_ratio: 63 },
          { item_no: 2, question_text: '求 f(x)=x³−3x 的单调区间', wrong_count: 12, correct_ratio: 74 },
          { item_no: 7, question_text: '已知单调性求参数取值范围', wrong_count: 9, correct_ratio: 80 },
        ],
      }); return true
    }
    if (method === 'GET' && seg[2] && seg[3] === 'file') {
      if (seg[2] === 'si-4') { fail(res, 503, 50310, 'source_file_temporarily_unavailable'); return true }
      fail(res, 404, 40400, 'file_not_found'); return true
    }
    if (method === 'POST' && url === '/teacher/grading/batch-confirm') {
      const b = await readBody(req)
      const results = (b.items || []).map((it: any) => ({ submission_item_id: it, ok: true, error: undefined }))
      gradingItems = gradingItems.map((g) => (b.items || []).includes(g.submission_item_id) ? { ...g, status: 'confirmed', teacher_final_score: g.suggestion_score } : g)
      ok(res, { results, failed: 0 }); return true
    }
    if (method === 'POST' && seg[2] && seg[3] === 'review') {
      const body = await readBody(req)
      const item = gradingItems.find((candidate) => candidate.submission_item_id === seg[2])
      if (!item) { fail(res, 404, 40400, 'not_found'); return true }
      if (body.state !== 'pending' && body.state !== 'cleared') { fail(res, 422, 40001, 'invalid_review_state'); return true }
      const key = req.headers?.['idempotency-key'] as string | undefined
      if (key && idem.has(key)) { ok(res, idem.get(key)); return true }
      gradingReviews.set(item.submission_item_id, body.state)
      const result = { submission_item_id: item.submission_item_id, state: body.state, replayed: false }
      if (key) idem.set(key, { ...result, replayed: true })
      ok(res, result); return true
    }
    if (seg[2] && seg[3] === 'suggest') { const it = gradingItems.find((g) => g.submission_item_id === seg[2]); ok(res, it ? gradingDetail(it).suggestion : null); return true }
    if (seg[2] && seg[3] === 'confirm') {
      const b = await readBody(req)
      const key = req.headers?.['idempotency-key'] as string | undefined
      const it = gradingItems.find((g) => g.submission_item_id === seg[2])
      if (!it) { fail(res, 404, 40400, 'not_found'); return true }
      if (key && idem.has(key)) { ok(res, idem.get(key)); return true }
      const confirmed = { ...it, status: 'confirmed' as const, teacher_final_score: b.decision === 'accept' ? it.suggestion_score : b.final_score }
      gradingItems = gradingItems.map((g) => (g.submission_item_id === seg[2] ? confirmed : g))
      const detail = gradingDetail(confirmed)
      detail.suggestion.decision = b.decision === 'accept' ? 'accepted' : 'overridden'
      detail.suggestion.teacher_final_score = detail.teacher_final_score
      detail.suggestion.teacher_feedback = b.teacher_feedback ?? null
      if (key) idem.set(key, detail.suggestion)
      ok(res, detail.suggestion); return true
    }
    if (seg[2]) { const it = gradingItems.find((g) => g.submission_item_id === seg[2]); ok(res, gradingDetail(it || gradingQueue()[0])); return true }
    return false
  }

  /* 作业 */
  if (seg[0] === 'teacher' && seg[1] === 'assignments') {
    if (method === 'GET') { ok(res, Array.from(assignments.values())); return true }
    if (method === 'POST' && url === '/teacher/assignments') {
      const b = await readBody(req)
      const a: Assignment = { assignment_id: nextId('assign'), class_id: b.class_id || 'c1', title: b.title || '练习', quiz_set: b.quiz_set, status: 'draft', version: 1, created_at: iso() }
      assignments.set(a.assignment_id, a); ok(res, a); return true
    }
    if (seg[2] && seg[3]) {
      const a = assignments.get(seg[2])
      if (!a) { fail(res, 404, 40400, 'not_found'); return true }
      const next = seg[3] as 'publish' | 'close' | 'archive'
      const map: Record<string, AssignmentStatus> = { publish: 'published', close: 'closed', archive: 'archived' }
      a.status = map[next]; a.published_at = next === 'publish' ? iso() : a.published_at
      assignments.set(a.assignment_id, a); ok(res, a); return true
    }
    return false
  }

  /* 资源 */
  if (seg[0] === 'teacher' && seg[1] === 'resources') {
    if (method === 'GET' && url === '/teacher/resources') { ok(res, resources); return true }
    if (method === 'POST' && url === '/teacher/resources/upload') {
      const b = await readBody(req)
      const ticket: UploadTicket = { resource_id: nextId('res'), status: 'uploading' }
      resources.unshift({ resource_id: ticket.resource_id, name: b.name || '上传文件', file_type: b.file_type || 'unknown', size_bytes: b.size_bytes || 0, status: 'preprocessing', created_at: iso() })
      ok(res, ticket); return true
    }
    if (seg[2] && seg[3] === 'preprocess') {
      const r = resources.find((x) => x.resource_id === seg[2])
      if (r) { r.status = 'understand'; r.pages = [{ page: 1 }] }
      ok(res, r); return true
    }
    if (seg[2] && seg[3] === 'understand') {
      const r = resources.find((x) => x.resource_id === seg[2])
      if (r) { r.status = 'understand'; r.pages = [{ page: 1, text: '理解完成' }] }
      ok(res, r); return true
    }
    if (method === 'POST' && url === '/teacher/resources/external-reference') {
      const b = await readBody(req)
      const r: TeacherResource = {
        resource_id: nextId('res'), name: String(b.title || '公开引用'), resource_kind: 'external_reference',
        external_url: String(b.url || ''), provider: b.provider || null, file_type: 'external_reference',
        size_bytes: 0, status: 'understand', created_at: iso(),
      }
      resources.unshift(r); ok(res, r, 201); return true
    }
    if (seg[2] && seg[3] === 'publish') {
      const r = resources.find((x) => x.resource_id === seg[2])
      if (!r) { fail(res, 404, 40400, 'not_found'); return true }
      r.published = true; ok(res, r); return true
    }
    if (seg[2] && seg[3] === 'unpublish') {
      const r = resources.find((x) => x.resource_id === seg[2])
      if (!r) { fail(res, 404, 40400, 'not_found'); return true }
      r.published = false; ok(res, r); return true
    }
    if (seg[2] && seg[3] === 'question-candidates' && seg[4] === 'approve') {
      const b = await readBody(req)
      const r = resources.find((x) => x.resource_id === seg[2])
      if (!r) { fail(res, 404, 40400, 'not_found'); return true }
      const ids = (b.candidate_ids || []) as string[]
      r.question_candidates = (r.question_candidates || []).map((c) => (ids.includes(c.candidate_id || '') ? { ...c, review_status: 'approved' as const } : c))
      ok(res, { resource_id: seg[2], approved_hashes: ids, review_required: false }); return true
    }
    if (seg[2] && seg[3] === 'download') {
      const r = resources.find((x) => x.resource_id === seg[2])
      return sendFile(res, `${r?.name || '资源'}-演示.txt`, `资源内容（演示）· ${r?.name || ''}`), true
    }
    if (seg[2] && method === 'DELETE' && !seg[3]) {
      const existed = resources.some((x) => x.resource_id === seg[2])
      if (!existed) { fail(res, 404, 40400, 'not_found'); return true }
      resources = resources.filter((x) => x.resource_id !== seg[2])
      ok(res, { resource_id: seg[2], deleted: true }); return true
    }
    return false
  }

  /* Butler：降级演示 */
  if (method === 'POST' && url === '/teacher/butler/chat') {
    ok(res, { degraded: true, message: '（降级）已根据当前场景生成本地替代草案，可继续编辑与确认。', confirmation_required: false })
    return true
  }

  return false
}


