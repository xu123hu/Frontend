import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TodayPage from './page'

describe('Teacher V2 Today', () => {
  it('renders the always-visible teaching copilot before dashboard evidence', () => {
    render(<TodayPage />)

    expect(screen.getByRole('heading', { name: '教学管家' })).toBeVisible()
    expect(screen.getByRole('log', { name: '教学会话，共 1 条消息' })).toBeVisible()
    expect(document.querySelector('[data-placeholder="例如：根据本班错因，把函数单调性周练整理成作业草稿"]')).toBeInTheDocument()
    expect(document.querySelector('.cs-message-list')).toBeInTheDocument()
  })
})
