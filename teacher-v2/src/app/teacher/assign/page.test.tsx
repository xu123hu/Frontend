import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AssignPage from './page'

const { publishAssignment } = vi.hoisted(() => ({ publishAssignment: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../../features/assessment/teacher-assessment-api', () => ({
  loadAssignments: vi.fn().mockResolvedValue([{ assignment_id: 'a-1', title: '函数单调性周练', class_id: 'c-1', type: 'quiz', status: 'draft', deadline: null }]),
  publishAssignment,
}))

describe('Teacher V2 assessment queue', () => {
  it('uses an explicit second confirmation before publishing a real draft', async () => {
    render(<AssignPage />)
    expect(await screen.findByText('函数单调性周练')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '发布给学生' }))
    expect(screen.getByText('确认将“函数单调性周练”发布给学生？')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '确认发布' }))
    expect(publishAssignment).toHaveBeenCalledWith('a-1')
  })
})
