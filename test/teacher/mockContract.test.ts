// RC-05-1 (B1) 契约同构测试：mock 教师端点响应形状必须 == src/types/teacher.ts 契约。
// 真实后端契约（M3_API 接口文档 v2.1）：
//   - GET /teacher/grading/queue   → data:{ queue: GradingQueueItem[] }
//   - GET /teacher/today           → data:{ TeacherTodayData }
//   - GET /teacher/artifacts       → data:{ TeacherArtifact[] }
//   - GET /teacher/lessons         → data:{ TeacherArtifact[] }
// 页面组件按 res.data?.queue 等形状解包；mock 必须同形，否则静默空态。
import { describe, it, expect, beforeAll } from 'vitest'
import { handleTeacherApi } from '@/mock/teacherServer'
import type { GradingQueueItem, TeacherTodayData, TeacherArtifact } from '@/types/teacher'

function toNodeIncomingMessage(over: { method: string; url: string; headers?: Record<string, string>; body?: unknown }) {
  const req: any = {
    method: over.method,
    url: over.url,
    headers: {
      authorization: 'Bearer mock-token-teacher-preview',
      ...(over.headers || {}),
    },
  }
  if (over.body !== undefined) {
    req.on = (ev: string, cb: (c?: any) => void) => {
      if (ev === 'data') cb(JSON.stringify(over.body))
      if (ev === 'end') cb()
    }
  } else {
    req.on = (_ev: string, _cb: (c?: any) => void) => {}
  }
  return req
}

function captureResponse() {
  const res: any = {
    statusCode: 0,
    headers: {},
    ended: false,
    setHeader(k: string, v: string) { this.headers[k] = v },
    end(body?: string) { this.body = typeof body === 'string' ? JSON.parse(body) : body; this.ended = true },
  }
  return res
}

async function call(method: string, url: string, body?: unknown) {
  const req = toNodeIncomingMessage({ method, url, body })
  const res = captureResponse()
  await handleTeacherApi(req, res)
  return res
}

describe('mock 教师端点契约同构（RC-05-1）', () => {
  beforeAll(async () => {
    // 重置到确定性种子
    await call('POST', '/_mock/teacher/reset')
  })

  it('grading/queue 返回 data:{queue:[...]}（同形，非裸数组）', async () => {
    const res = await call('GET', '/teacher/grading/queue')
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(false)          // 绝不裸数组
    expect(Array.isArray(res.body.data?.queue)).toBe(true)    // 必须是 {queue:[...]}
    const queue: GradingQueueItem[] = res.body.data.queue
    queue.forEach((it) => {
      expect(typeof it.submission_item_id).toBe('string')
      expect(['unprocessed', 'low_confidence', 'confirmed']).toContain(it.status)
      expect(typeof it.suggestion_score).toBe('number')
    })
  })

  it('today 返回 {next_lesson, grading_queue, deadlines, actionable_insights, degraded}', async () => {
    const res = await call('GET', '/teacher/today')
    expect(res.statusCode).toBe(200)
    const data: TeacherTodayData = res.body.data
    expect(data).toHaveProperty('next_lesson')
    expect(data).toHaveProperty('grading_queue')
    expect(Array.isArray(data.deadlines)).toBe(true)
    expect(Array.isArray(data.actionable_insights)).toBe(true)
    expect(typeof data.degraded).toBe('boolean')
  })

  it('quizzes/generate 返回 lesson/quiz artifact（data 是对象，含 artifact_id/content），剔除后仍取回', async () => {
    const gen = await call('POST', '/teacher/quizzes/generate', { knowledge_points: ['函数单调性'], count: 3 })
    expect(gen.statusCode).toBe(201)
    const art = gen.body.data as TeacherArtifact
    expect(art.artifact_id).toMatch(/^art-quiz/)
    expect(art.artifact_type).toBe('quiz_set')
    expect(art.content).toHaveProperty('items')

    const listed = await call('GET', `/teacher/artifacts/${art.artifact_id}`)
    expect(listed.statusCode).toBe(200)
    expect(listed.body.data.artifact_id).toBe(art.artifact_id)
  })

  it('quizzes/generate 题量诚实（RC-05-3 D1）：请求 count 足额返回，禁止静默减题', async () => {
    const gen = await call('POST', '/teacher/quizzes/generate', { knowledge_points: ['函数单调性'], count: 8 })
    const art = gen.body.data as TeacherArtifact
    const items = (art.content.items ?? []) as unknown[]
    expect(items.length).toBe(8)
    expect(art.content.count).toBe(8)
  })

  it('lessons：POST adapt 返回 lesson artifact（含 content.segments，RD-1 LessonSegment schema）', async () => {
    const res = await call('POST', '/teacher/lessons/adapt', { class_id: 'c1', topic: '导数与函数单调性', requirements: '' })
    expect(res.statusCode).toBe(201)
    const art = res.body.data as TeacherArtifact
    expect(art.artifact_type).toBe('lesson_plan')
    expect(art.content).toHaveProperty('segments')
    expect(art.content.topic).toBe('导数与函数单调性')
    const segs = (art.content.segments ?? []) as Array<{ id?: string; title?: string; duration_min?: number; teacher_action?: string; student_action?: string; learning_objective?: string; kind?: string }>
    expect(segs.length).toBeGreaterThan(0)
    segs.forEach((s) => {
      expect(typeof s.id).toBe('string')
      expect(typeof s.title).toBe('string')
      // RD-1：结构化环节至少应具备教师活动/学生活动，支撑"AI 只改最相关环节"
      expect(typeof s.teacher_action).toBe('string')
      expect(typeof s.student_action).toBe('string')
    })
    // 验收#1 护栏：分段时长之和 = 45（5+10+5+10+12+3=45），供时间线「共 N 分钟」实时求和
    const total = segs.reduce((sum, s) => sum + Number(s.duration_min ?? 5), 0)
    expect(total).toBe(45)
  })

  it('artifacts CRUD 返回信封 {code, message, data} 形状', async () => {
    const res = await call('GET', '/teacher/artifacts/nonexistent')
    expect(res.statusCode).toBe(404)
    expect(typeof res.body.code).toBe('number')
    expect(typeof res.body.message).toBe('string')
  })
})