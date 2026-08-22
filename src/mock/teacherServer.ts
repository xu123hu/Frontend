import {
  TEACHER_CLASSES, classInsights, gradingDetail, gradingQueue, iso, lessonArtifact, quizArtifact, seedResources, todayData, videoInsights,
} from './teacherData'
import type {
  Assignment, AssignmentStatus, ClassroomModeState, GradingQueueItem, SourceRef, TeacherArtifact, TeacherResource, TeacherTask, UploadTicket,
} from '@/types/teacher'

function readBody(req: any) {
  return new Promise<any>((resolve) => {
    let buf = ''
    req.on('data', (c: any) => { buf += c })
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}) } catch { resolve({}) } })
  })
}
function send(res: any, status: number, obj: any) { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
function ok(res: any, data: any, status = 200) { send(res, status, { code: 0, message: 'ok', data }) }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fail(res: any, status: number, code: number, message: string, data: unknown = null) { send(res, status, { code, message, data }) }

/* ===== 内存状态（E2E 每个 worker 独立进程/数据实例，可确定性重置） ===== */
let artifacts = new Map<string, TeacherArtifact>()
let assignments = new Map<string, Assignment>()
let gradingItems: GradingQueueItem[] = gradingQueue()
let resources: TeacherResource[] = seedResources()
let tasks = new Map<string, TeacherTask>()
let modes = new Map<string, ClassroomModeState>()
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
  tasks = new Map(); modes = new Map(); idem.clear(); seq = 1
}

function assertScope(cid: string): boolean { return TEACHER_CLASSES.some((c) => c.id === cid) }

export async function handleTeacherApi(req: any, res: any): Promise<boolean> {
  const url = (req.url || '').split('?')[0]
  const method = req.method
  const seg = url.split('/').filter(Boolean)
  const isTeacher = isTeacherToken(req)

  // 鉴权：教师端点必须 teacher 预览 token；否则 401/403
  if (seg[0] === 'teacher' || seg[0] === '_mock') {
    if (seg[0] === '_mock' && seg[1] === 'teacher' && seg[2] === 'reset') { resetTeacherMock(); ok(res, { reset: true }); return true }
    if (!isTeacher) { fail(res, 403, 40301, 'role_denied'); return true }
  }
  if (method === 'GET' && url === '/classes/mine') { ok(res, { items: TEACHER_CLASSES }); return true }
  if (seg[0] !== 'teacher') return false

  if (method === 'GET' && url === '/teacher/today') { ok(res, todayData()); return true }

  /* 班级洞察 / 课堂 */
  if (seg[0] === 'teacher' && seg[1] === 'classes' && seg[2]) {
    const cid = seg[2]
    if (!assertScope(cid)) { fail(res, 403, 40302, 'class_scope_denied'); return true }
    if (seg[3] === 'insights') { ok(res, classInsights(cid)); return true }
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
    const t: TeacherTask = { task_id: nextId('task-slides'), capability: 'create_slides', status: 'queued', progress: 0, stage: '排队中', artifact_id: null, error_code: null, created_at: iso() }
    tasks.set(t.task_id, t); ok(res, { task_id: t.task_id }); return true
  }
  if (seg[0] === 'teacher' && seg[1] === 'lessons' && seg[2] && seg[3] === 'explainer') {
    const t: TeacherTask = { task_id: nextId('task-explain'), capability: 'explain_problem', status: 'queued', progress: 0, stage: '排队中', artifact_id: null, error_code: null, created_at: iso() }
    tasks.set(t.task_id, t); ok(res, { task_id: t.task_id }); return true
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
      const art = quizArtifact(b.knowledge_points || ['函数单调性'], b.count || 6, b.question_types, b.difficulty)
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
    if (method === 'GET' && url === '/teacher/grading/queue') { ok(res, { queue: gradingItems }); return true }
    if (method === 'POST' && url === '/teacher/grading/batch-confirm') {
      const b = await readBody(req)
      const results = (b.items || []).map((it: any) => ({ submission_item_id: it, ok: true, error: undefined }))
      gradingItems = gradingItems.map((g) => (b.items || []).includes(g.submission_item_id) ? { ...g, status: 'confirmed', teacher_final_score: g.suggestion_score } : g)
      ok(res, { results, failed: 0 }); return true
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
    return false
  }

  /* Butler：降级演示 */
  if (method === 'POST' && url === '/teacher/butler/chat') {
    ok(res, { degraded: true, message: '（降级）已根据当前场景生成本地替代草案，可继续编辑与确认。', confirmation_required: false })
    return true
  }

  return false
}
