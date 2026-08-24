import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResourcesPage from './page'

vi.mock('../../../features/resources/teacher-resources-api', () => ({
  loadTeacherResources: vi.fn().mockResolvedValue([]),
  uploadTeacherResource: vi.fn(),
  approveQuestionCandidates: vi.fn(),
}))

describe('Teacher V2 resources', () => {
  it('uses an explicit upload and review workspace without sample teaching assets', async () => {
    render(<ResourcesPage />)

    expect(screen.getByRole('heading', { name: '资源与题目审核' })).toBeVisible()
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
    expect(await screen.findByText('还没有上传教学材料')).toBeVisible()
    expect(screen.queryByText('示例试卷')).not.toBeInTheDocument()
  })
})
