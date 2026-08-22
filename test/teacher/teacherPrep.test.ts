import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { artifact, lessonStore, contextStore, apiGet, createSlides, confirm, toast } = vi.hoisted(() => {
  const artifact: any = {
    artifact_id: 'lesson-1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: 'class-1', owner_id: 'teacher-1',
    status: 'draft', version: 1, content: { topic: '旧课题', timeline: [] }, source_refs: [], warnings: [], degraded: false, created_at: '', updated_at: '',
  }
  return {
    artifact,
    lessonStore: { artifact, error: null as string | null, adapt: vi.fn(), save: vi.fn() },
    contextStore: { classId: 'class-1' as string | null, className: '高一（1）班' as string | null, setClass: vi.fn() },
    apiGet: vi.fn().mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }] }),
    createSlides: vi.fn(), confirm: vi.fn(), toast: vi.fn(),
  }
})

vi.mock('@/stores/teacher/lessonArtifacts', () => ({ useLessonArtifactsStore: () => lessonStore }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('@/api/client', () => ({ api: { get: apiGet }, authHeaders: () => ({}) }))
vi.mock('@/api/teacher/lessons', () => ({ lessonsApi: { list: vi.fn().mockResolvedValue([]), createSlides } }))
vi.mock('@/api/teacher/artifacts', () => ({ artifactsApi: { confirm } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import TeacherPrepView from '@/pages/teacher/TeacherPrepView.vue'

function setArtifact(status: 'draft' | 'confirmed', timeline: any[] = []) {
  Object.assign(artifact, { status, version: 1, content: { topic: '导数的概念', timeline } })
}

beforeEach(() => {
  vi.clearAllMocks()
  apiGet.mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }] })
  lessonStore.error = null
  lessonStore.adapt.mockImplementation(async (payload) => { artifact.status = 'draft'; artifact.content = { topic: payload.topic, timeline: artifact.content.timeline } })
  lessonStore.save.mockResolvedValue(artifact)
  setArtifact('draft')
})

function mountPrep() {
  return mount(TeacherPrepView, { global: { provide: { showToast: toast } } })
}

describe('TeacherPrepView topic-driven artifact workflow', () => {
  it('renders explicit topic, requirements and duration inputs; blank topic is blocked locally', async () => {
    const wrapper = mountPrep()
    await flushPromises()
    expect(wrapper.find('[aria-label="课题"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="教学要求"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="课时分钟"]').exists()).toBe(true)
    await wrapper.get('form').trigger('submit')
    expect(lessonStore.adapt).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('请填写课题')
  })

  it('sends the exact teacher-entered lesson request', async () => {
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('[aria-label="教学要求"]').setValue('包含例题、练习与当堂检测')
    await wrapper.get('[aria-label="课时分钟"]').setValue('50')
    await wrapper.get('form').trigger('submit')
    expect(lessonStore.adapt).toHaveBeenCalledWith({
      class_id: 'class-1', topic: '导数的概念', requirements: '包含例题、练习与当堂检测', duration_minutes: 50,
    })
  })

  it('applies each Artifact activity and preserves activities when saving', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察割线变化', '同伴讨论'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('观察割线变化')
    expect(wrapper.text()).toContain('同伴讨论')
    expect(wrapper.text()).not.toContain('可编辑教学环节，确认后生成 PPT。')
    await wrapper.get('button.t-btn').trigger('click')
    expect(lessonStore.save).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ timeline: [{ phase: '探究', minutes: 12, activities: ['观察割线变化', '同伴讨论'] }] }),
    }))
  })

  it('does not confirm or create slides from a draft, but creates and downloads after explicit confirmation', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    const wrapper = mountPrep()
    await flushPromises()
    const ppt = wrapper.findAll('button').find((button) => button.text().includes('生成PPT'))!
    await ppt.trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(createSlides).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('请先确认教案后再生成 PPT')

    setArtifact('confirmed', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    createSlides.mockResolvedValue({ data: { content: { download_url: '/download.pptx', filename: '导数.pptx' } } })
    const originalFetch = globalThis.fetch
    const originalClick = HTMLAnchorElement.prototype.click
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['ppt']) }) as any
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:lesson')
    URL.revokeObjectURL = vi.fn()
    HTMLAnchorElement.prototype.click = vi.fn()
    try {
      await ppt.trigger('click')
      expect(createSlides).toHaveBeenCalledWith('lesson-1', { version: 1, style: '简洁课堂' })
      expect(toast).toHaveBeenCalledWith('PPT 已生成并开始下载')
    } finally {
      globalThis.fetch = originalFetch
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      HTMLAnchorElement.prototype.click = originalClick
    }
  })
})
