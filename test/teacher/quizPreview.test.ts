import { describe, expect, it } from 'vitest'
import { makeQuizPreviewQuestions } from '@/domain/teacher/quizPreview'

describe('makeQuizPreviewQuestions', () => {
  it('preserves real solution content, object options, difficulty, answer and analysis', () => {
    const [choice, solution] = makeQuizPreviewQuestions([
      {
        item_no: 1, q_type: 'choice', difficulty: 'hard', kp_code: 'MATH-003',
        question_text: '判断函数的单调性', options: { B: '递减', A: '递增' }, answer: 'A', analysis: '先求导数。',
      },
      {
        item_no: 2, q_type: 'solution', difficulty: 'medium', kp_code: 'MATH-003',
        question_text: '证明单调性', solution: '求导并判号', analysis: null,
      },
    ])

    expect(choice).toMatchObject({
      qType: 'choice', difficultyLabel: '挑战', standardAnswer: 'A', analysis: '先求导数。',
      options: [{ key: 'A', text: '递增' }, { key: 'B', text: '递减' }],
    })
    expect(solution).toMatchObject({
      qType: 'solution', difficultyLabel: '提升', standardAnswer: '求导并判号',
      analysis: '题库未提供解析，请教师确认后补充。', options: [],
    })
  })

  it('does not invent options for blank or solution questions', () => {
    const questions = makeQuizPreviewQuestions([
      { item_no: 1, q_type: 'blank', difficulty: 'easy', question_text: '1 + 1 = ___', answer: '2' },
      { item_no: 2, q_type: 'solution', difficulty: 'easy', question_text: '写出步骤', answer: '略' },
    ])

    expect(questions.map((question) => question.options)).toEqual([[], []])
  })
})
