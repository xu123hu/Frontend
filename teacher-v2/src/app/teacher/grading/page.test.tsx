import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GradingPage from './page'

vi.mock('../../../features/grading/teacher-grading-api', () => ({
  loadGradingQueue: vi.fn().mockResolvedValue([{ submission_item_id: 's-1', status: 'low_confidence', confidence: 0.42 }]),
  loadGradingDetail: vi.fn().mockResolvedValue({ submission_item_id: 's-1', question_text: '已知函数 f(x)=x²，求 f\'(x)。', original_answer: 'f\'(x)=2x', standard_answer: '2x', suggestion: { suggestion_id: 'g-1', suggestion_score: 8, confidence: 0.42, evidence: '需人工复核', version: 1 } }),
  confirmGrade: vi.fn(),
}))

describe('Teacher V2 grading workspace', () => {
  it('centers the original work and rubric instead of an anonymous #001 form', async () => {
    render(<GradingPage />)
    expect(await screen.findByText('已知函数 f(x)=x²，求 f\'(x)。')).toBeVisible()
    expect(screen.getByText('f\'(x)=2x')).toBeVisible()
    expect(screen.getByText('2x')).toBeVisible()
    expect(screen.queryByText('作答 #001')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认记入正式成绩' })).toBeVisible()
  })
})
