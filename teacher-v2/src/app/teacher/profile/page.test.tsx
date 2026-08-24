import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProfilePage from './page'

vi.mock('../../../features/profile/teacher-profile-api', () => ({
  loadTeacherIdentity: vi.fn().mockResolvedValue({ nickname: '李老师', active_role: 'teacher', roles: [{ role: 'teacher', verified: true, org_name: '示范中学' }] }),
  loadTeacherModelConfig: vi.fn().mockResolvedValue({ configured: true, secondary: { api_key: 'sk-secret-key', model: 'mimo-v2-flash', source: 'user' } }),
}))

describe('Teacher V2 profile', () => {
  it('shows the authenticated teacher and inherited Mimo channel without revealing credentials', async () => {
    render(<ProfilePage />)

    expect(await screen.findByText('李老师')).toBeVisible()
    expect(screen.getByText('Mimo 测试通道')).toBeVisible()
    expect(screen.getByText('mimo-v2-flash')).toBeVisible()
    expect(screen.queryByText('sk-secret-key')).not.toBeInTheDocument()
  })
})
