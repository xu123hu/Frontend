// P 备课中心整链路契约测试：大纲富模块 + 需求回应 + 模板库数据 + 链路状态机。
import { describe, it, expect, beforeEach } from 'vitest'
import { handleTeacherV3Api } from '@/mock/teacherV3Server'
import { AILP_BLUEPRINTS, AILP_LIBRARY_REFS, buildParsedUpload } from '@/pages/teacher-v3/prep/ailpMock'
import { usePrepChain, startBrief, setOutline, enterEditor, gotoStage, __resetPrepChainForTest } from '@/pages/teacher-v3/prep/prepChain'

function toReq(over: { method: string; url: string; body?: unknown }) {
  const req: any = { method: over.method, url: over.url, headers: { authorization: 'Bearer mock-token-teacher-preview' } }
  if (over.body !== undefined) {
    req.on = (ev: string, cb: (c?: any) => void) => { if (ev === 'data') cb(JSON.stringify(over.body)); if (ev === 'end') cb() }
  } else req.on = () => {}
  return req
}
function captureRes() {
  const res: any = { statusCode: 0, writableEnded: false, destroyed: false, chunks: [], body: null as any, headers: {}, setHeader() {}, writeHead(code: number) { this.statusCode = code }, write(c: string) { this.chunks.push(String(c)); return true }, end(body?: string) { if (typeof body === 'string' && body) { try { this.body = JSON.parse(body) } catch { this.body = body } } if (this.statusCode === 0) this.statusCode = 200; this.writableEnded = true } }
  return res
}
async function call(method: string, url: string, body?: unknown) {
  const res = captureRes()
  await handleTeacherV3Api(toReq({ method, url, body }), res)
  return res
}

describe('P planOutline 富模块（大纲确认页数据）', () => {
  it('返回 objectives/keypoints/blackboard/homework 富模块 + difficulty', async () => {
    const res = await call('POST', '/teacher-v3/generation/plan/outline', {
      topic: '椭圆及其标准方程（第1课时）', class_id: 'c2-05', lesson_type: '新授课', duration: 45,
    })
    const d = res.body.data
    expect(d.objectives.length).toBeGreaterThanOrEqual(3)
    expect(d.keypoints.major.length).toBeGreaterThanOrEqual(1)
    expect(d.keypoints.hard.length).toBeGreaterThanOrEqual(1)
    expect(d.blackboard.main.length).toBeGreaterThanOrEqual(2)
    expect(d.homework.map((h: any) => h.tier)).toEqual(['basic', 'raise', 'expand'])
    expect(d.difficulty).toBe('中等')
    expect(d.sections.length).toBeGreaterThanOrEqual(5)
  })

  it('需求回应：增加互动 → 插入互动探究环节；难度调整 → 回应进 notes', async () => {
    const res = await call('POST', '/teacher-v3/generation/plan/outline', {
      topic: '椭圆及其标准方程（第1课时）', class_id: 'c2-05', lesson_type: '新授课',
      requirements: ['增加互动环节', '难度再加深一些'],
    })
    const d = res.body.data
    expect(d.sections.some((s: any) => s.name === '互动探究')).toBe(true)
    expect(d.difficulty).toBe('较高')
    expect(d.notes.some((n: string) => n.includes('互动探究'))).toBe(true)
    expect(d.notes.some((n: string) => n.includes('难度'))).toBe(true)
  })

  it('词表外要求诚实记录不假装', async () => {
    const res = await call('POST', '/teacher-v3/generation/plan/outline', {
      topic: '椭圆及其标准方程（第1课时）', requirements: ['带学生去操场上一节户外数学课'],
    })
    const d = res.body.data
    expect(d.notes.some((n: string) => n.includes('词表未覆盖') && n.includes('户外数学课'))).toBe(true)
  })
})

describe('P 模板库与上传解析数据', () => {
  it('优质课蓝本：每份含学校/教师/奖项（虚构示范，字段完整）', () => {
    expect(AILP_BLUEPRINTS.length).toBeGreaterThanOrEqual(4)
    for (const bp of AILP_BLUEPRINTS) {
      expect(bp.school).toBeTruthy()
      expect(bp.award).toBeTruthy()
      expect(bp.sections).toBeGreaterThan(0)
    }
  })
  it('资源库引用：文件名/日期/大小齐全', () => {
    for (const r of AILP_LIBRARY_REFS) {
      expect(r.name).toMatch(/\.(docx|pdf)$/)
      expect(r.size).toBeTruthy()
    }
  })
  it('上传解析样例：知识点置信度含低置信待确认项（诚实呈现而非全绿）', () => {
    const parsed = buildParsedUpload(['椭圆优秀教案参考.docx'])
    expect(parsed.structure.length).toBe(5)
    expect(parsed.knowledge.some((k) => k.partial)).toBe(true)
    expect(parsed.examples.length).toBe(3)
  })
})

describe('P 备课链路状态机', () => {
  beforeEach(() => __resetPrepChainForTest())

  it('startBrief → generating → outline → editor 全链路', () => {
    const s = usePrepChain()
    startBrief({ source: 'input', topic: '椭圆及其标准方程（第1课时）', requirements: ['用拉链实验引入'] })
    expect(s.stage).toBe('generating')
    expect(s.brief?.requirements[0]).toContain('拉链')
    setOutline({ topic: '椭圆及其标准方程（第1课时）', duration: 45, sections: [{ id: 'bd-intro', name: '情境引入', minutes: 5, goal: '' }], total_minutes: 45, notes: [] })
    expect(s.stage).toBe('outline')
    enterEditor('plan-1')
    expect(s.stage).toBe('editor')
    expect(s.planId).toBe('plan-1')
  })

  it('startBrief 重置旧大纲（换课题不留脏状态）', () => {
    const s = usePrepChain()
    setOutline({ topic: 'A', duration: 45, sections: [], total_minutes: 45, notes: [] })
    startBrief({ source: 'textbook', topic: 'B' })
    expect(s.outline).toBeNull()
    expect(s.stage).toBe('generating')
  })

  it('gotoStage 可回首页', () => {
    gotoStage('home')
    expect(usePrepChain().stage).toBe('home')
  })
})
