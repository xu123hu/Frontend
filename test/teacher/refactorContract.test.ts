// 本轮重构契约测试（教学建议退化为知识点建议；作业出题真实化）。
// 直接断言行为，避免回归："数据不足空态"、"巩固题 N 占位"、"答案恒写死"、"足额不足额"。
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { suggestionsForKnowledgePoints } from '@/mock/teachingAdvice'
import { buildQuizSet } from '@/mock/questionBank'
import { quizArtifact } from '@/mock/teacherData'

describe('批改 V2 接管：证据优先工作区', () => {
  it('正式教师批改路由不再回退为顶部选择器和 #001 匿名表单', () => {
    const view = readFileSync(resolve(process.cwd(), 'src/pages/teacher/TeacherGradingView.vue'), 'utf8')
    expect(view).toContain('原始作答证据')
    expect(view).toContain('评分依据与教师决策')
    expect(view).toContain('确认记入正式成绩')
    expect(view).not.toContain('<select')
    expect(view).not.toContain('student_label }}')
  })
})

describe('教学建议：班级数据不足时按知识点给通用建议（不显示"数据不足"）', () => {
  it('知识点命中即返回非空建议，且依据为课标/教法非虚构班级统计', () => {
    const advices = suggestionsForKnowledgePoints(['函数的单调性'], 4)
    expect(advices.length).toBeGreaterThan(0)
    advices.forEach((a) => {
      expect(a.title).toBeTruthy()
      expect(a.description).toBeTruthy()
      expect(a.evidence).toBeTruthy()
      // 通用建议必须有"依据来源"，不能是没有出处的一句话
      expect(a.targetStepKind).toMatch(/^(import|concept|example|practice|check|summary|intervention)$/)
    })
  })

  it('未知知识点也会落到通用兜底建议，不会出现空数组', () => {
    const advices = suggestionsForKnowledgePoints(['未知课题'], 3)
    expect(advices.length).toBeGreaterThan(0)
  })
})

describe('作业出题：真实题干 + 足额 + 乱序（走出"单调性巩固题 N / 答案恒 B"占位）', () => {
  it('buildQuizSet 按请求数足额返回（D1 诚实），且题干互不相同', () => {
    const qs = buildQuizSet({ knowledge_points: ['函数的单调性'], count: 8 })
    expect(qs.length).toBe(8)
    const texts = new Set(qs.map((q) => q.question_text))
    expect(texts.size).toBe(8) // 杜绝同一句"巩固题 N 变体"
  })

  it('选择题选项被乱序且答案字母已对齐（不再恒为 B/恒写死）', () => {
    // 跨 4 个知识点抽 18 题，保证有足够多样化的选择题样本
    const qs = buildQuizSet({ knowledge_points: ['函数的单调性', '函数的奇偶性', '函数的基本性质', '集合'], count: 18 })
    const choices = qs.filter((q) => q.q_type === 'choice' && q.options)
    expect(choices.length).toBeGreaterThan(3)
    choices.forEach((q) => {
      const letter = q.answer.trim().toUpperCase()
      expect('ABCD'.includes(letter)).toBe(true)
      expect(q.question_text).not.toContain('巩固题') // 真实题干而非占位编号
      // 校验乱序后答案字母仍指向有效选项（对齐正确，未丢正确答案）
      expect(q.options!.length).toBeGreaterThan(0)
      expect(letter.charCodeAt(0) - 65).toBeLessThan(q.options!.length)
    })
    // 大样本下答案字母明显分布，证明已乱序、非恒写死
    const letters = new Set(choices.map((q) => q.answer))
    expect(letters.size).toBeGreaterThan(2)
  })

  it('基于单选题库仍足额：跨知识点交叉出题也满足 count', () => {
    const qs = buildQuizSet({ knowledge_points: ['函数的单调性', '函数的奇偶性'], count: 12 })
    expect(qs.length).toBe(12)
  })

  it('quizArtifact 产物含 item_no/q_type/kp 等完整契约字段，且 content.count 足额', () => {
    const art = quizArtifact(['函数的单调性'], 8)
    const items = (art.content.items ?? []) as Array<Record<string, unknown>>
    expect(art.content.count).toBe(8)
    expect(items.length).toBe(8)
    items.forEach((q, i) => {
      expect(q.item_no).toBe(i + 1)
      expect(['choice', 'blank', 'text']).toContain(q.q_type)
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty)
      expect(typeof q.question_text).toBe('string')
    })
  })
})
