import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ArtifactPanel from '@/components/teacher/ArtifactPanel.vue'
import ArtifactStatusBadge from '@/components/teacher/ArtifactStatusBadge.vue'
import type { TeacherArtifact } from '@/types/teacher'

const base: TeacherArtifact = {
  artifact_id: 'a1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: 'c1',
  owner_id: 't1', status: 'draft', version: 1, content: {}, source_refs: [], warnings: [],
  degraded: false, created_at: '', updated_at: '',
}

describe('ArtifactPanel', () => {
  it('shows edit/confirm/archive for draft and no publish', () => {
    const w = mount(ArtifactPanel, { props: { artifact: { ...base, status: 'draft' } } })
    const texts = w.findAll('button').map((b) => b.text())
    expect(texts).toEqual(expect.arrayContaining(['编辑', '确认', '归档']))
    expect(texts).not.toContain('发布')
  })
  it('shows publish for confirmed but not confirm', () => {
    const w = mount(ArtifactPanel, { props: { artifact: { ...base, status: 'confirmed' } } })
    const texts = w.findAll('button').map((b) => b.text())
    expect(texts).toContain('发布')
    expect(texts).not.toContain('确认')
  })
  it('renders degraded banner', () => {
    const w = mount(ArtifactPanel, { props: { artifact: { ...base, degraded: true } } })
    expect(w.text()).toContain('本地替代方案')
  })
  it('emits action on confirm click', async () => {
    const w = mount(ArtifactPanel, { props: { artifact: { ...base, status: 'draft' } } })
    const confirmBtn = w.findAll('button').find((b) => b.text().trim() === '确认')
    expect(confirmBtn).toBeTruthy()
    await confirmBtn!.trigger('click')
    expect(w.emitted('action')?.[0]).toEqual(['confirm'])
  })
})

describe('ArtifactStatusBadge', () => {
  it('shows degraded label when degraded flag set', () => {
    const w = mount(ArtifactStatusBadge, { props: { status: 'draft', degraded: true } })
    expect(w.text()).toBe('降级')
  })
})