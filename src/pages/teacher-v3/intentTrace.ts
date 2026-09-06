/**
 * B2 · 教学意图追踪（本地启发式，IFC-B2-a：PROTOTYPE-ONLY）
 * 词表匹配目标 ↔ 环节/例题/作业的承接关系；无持久化、无目标 ID（正式化需 IFC）。
 */
import type { V3LessonPlan } from '@/types/teacherV3'

export interface IntentTrace {
  index: number
  objective: string
  status: 'full' | 'teach_only' | 'uncovered'
  teach: string[]
  practice: string[]
  homework?: boolean
}

/** 从目标句中抽取可匹配的关键词（截取动词后主干，去"理解/掌握"等泛动词） */
const STOPWORDS = ['理解', '掌握', '体会', '经历', '培养', '能', '会', '通过', '以及', '与', '和', '，', '。', '的', '（', '）', '(', ')']

function keywordsOf(objective: string): string[] {
  const cleaned = objective.replace(/\$[^$]+\$/g, '').replace(/[（(].*?[）)]/g, '')
  const chunks = cleaned
    .split(/[，,。；;：]/)
    .flatMap((c) => c.split(/（|）|:/))
    .map((c) => c.trim())
    .filter((c) => c.length >= 2)
  const out: string[] = []
  for (const c of chunks) {
    const stripped = STOPWORDS.reduce((acc, w) => acc.replaceAll(w, ''), c).trim()
    if (stripped.length >= 2) out.push(stripped.slice(0, 10))
  }
  return out.length ? out : [cleaned.slice(0, 8)]
}

function hit(text: string, kws: string[]): boolean {
  if (!text) return false
  return kws.some((k) => text.includes(k) || k.includes(text.slice(0, 6)))
}

/** 目标 ↔ 工件承接追踪：teach=讲解环节，practice=练习/检测/作业承接 */
export function traceObjectives(plan: V3LessonPlan): IntentTrace[] {
  const teachables = plan.sections.filter((s) => (Number(s.minutes) || 0) > 0)
  const practices = plan.sections.filter((s) => /练习|检测|小结|测试/.test(s.name))
  const homeworkText = (plan.homework_tiers || []).map((t) => t.items.join(' ')).join(' ')

  return plan.objectives.map((objective, index) => {
    const kws = keywordsOf(objective)
    const teach = teachables.filter((s) => hit(s.teacher_activity + s.name, kws)).map((s) => s.name)
    const practice = practices.filter((s) => hit(s.teacher_activity + s.student_activity + s.name, kws)).map((s) => s.name)
    const homework = hit(homeworkText, kws)
    let status: IntentTrace['status'] = 'uncovered'
    if (teach.length && (practice.length || homework)) status = 'full'
    else if (teach.length) status = 'teach_only'
    else if (practice.length || homework) { teach.push('(由练习/作业承接)'); status = 'full' }
    return { index, objective, status, teach, practice, homework }
  })
}

export function traceSummary(traces: IntentTrace[]) {
  return {
    full: traces.filter((t) => t.status === 'full').length,
    teachOnly: traces.filter((t) => t.status === 'teach_only').length,
    uncovered: traces.filter((t) => t.status === 'uncovered').length,
  }
}

/** 作业越界：作业条目涉及的目标在课上既没讲也没练 → 提醒 */
export function homeworkLeaks(plan: V3LessonPlan): { tier: string; item: string; reason: string }[] {
  const traces = traceObjectives(plan)
  const uncoveredKws = traces.filter((t) => t.status === 'uncovered').flatMap((t) => keywordsOf(t.objective))
  if (!uncoveredKws.length) return []
  const leaks: { tier: string; item: string; reason: string }[] = []
  for (const tier of plan.homework_tiers || []) {
    for (const item of tier.items) {
      if (hit(item, uncoveredKws)) {
        leaks.push({ tier: tier.tier, item, reason: '课上没有承接该内容的环节，作业越界（目标无承接）' })
      }
    }
  }
  return leaks
}
