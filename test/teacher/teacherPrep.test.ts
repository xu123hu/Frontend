import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { artifact, lessonStore, contextStore, apiGet, listLessons, createSlides, confirm, toast } = vi.hoisted(() => {
  const artifact: any = {
    artifact_id: 'lesson-1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: 'class-1', owner_id: 'teacher-1',
    status: 'draft', version: 1, content: { topic: '旧课题', timeline: [] }, source_refs: [], warnings: [], degraded: false, created_at: '', updated_at: '',
  }
  return {
    artifact,
    lessonStore: { artifact, error: null as string | null, adapt: vi.fn(), save: vi.fn() },
    contextStore: { classId: 'class-1' as string | null, className: '高一（1）班' as string | null, setClass: vi.fn() },
    apiGet: vi.fn().mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }, { id: 'class-2', name: '高一（2）班' }] }),
    listLessons: vi.fn().mockResolvedValue([]), createSlides: vi.fn(), confirm: vi.fn(), toast: vi.fn(),
  }
})

vi.mock('@/stores/teacher/lessonArtifacts', () => ({ useLessonArtifactsStore: () => lessonStore }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('@/api/client', () => ({ api: { get: apiGet }, authHeaders: () => ({}) }))
vi.mock('@/api/teacher/lessons', () => ({ lessonsApi: { list: listLessons, createSlides } }))
vi.mock('@/api/teacher/artifacts', () => ({ artifactsApi: { confirm } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import TeacherPrepView from '@/pages/teacher/TeacherPrepView.vue'

function setArtifact(status: 'draft' | 'confirmed', timeline: any[] = [], classId = 'class-1', durationMinutes?: number) {
  Object.assign(artifact, { class_id: classId, status, version: 1, content: { topic: '导数的概念', timeline, ...(durationMinutes ? { duration_minutes: durationMinutes } : {}) } })
}

beforeEach(() => {
  vi.clearAllMocks()
  lessonStore.artifact = artifact
  apiGet.mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }, { id: 'class-2', name: '高一（2）班' }] })
  listLessons.mockResolvedValue([])
  lessonStore.error = null
  lessonStore.adapt.mockImplementation(async (payload) => { Object.assign(artifact, { class_id: payload.class_id, status: 'draft', content: { topic: payload.topic, timeline: artifact.content.timeline, duration_minutes: payload.duration_minutes } }) })
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
    const originalFetch = globalThis.fetch
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as any
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:lesson')
    URL.revokeObjectURL = vi.fn()
    await ppt.trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(createSlides).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('请先确认教案后再生成 PPT')

    setArtifact('confirmed', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    createSlides.mockResolvedValue({ data: { content: { download_url: '/download.pptx', filename: '导数.pptx' } } })
    const originalClick = HTMLAnchorElement.prototype.click
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['ppt']) }) as any
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

  it('switches class without adapting, clears an empty target, and keeps old data on target-load failure', async () => {
    setArtifact('draft', [{ phase: '旧班活动', minutes: 12, activities: ['旧活动'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    lessonStore.adapt.mockClear()

    await wrapper.get('select').setValue('class-2')
    await flushPromises()
    expect(listLessons).toHaveBeenCalledWith('class-2')
    expect(lessonStore.adapt).not.toHaveBeenCalled()
    expect(lessonStore.artifact).toBeNull()
    expect(wrapper.text()).not.toContain('旧班活动')

    wrapper.unmount()
    setArtifact('draft', [{ phase: '旧班活动', minutes: 12, activities: ['旧活动'] }])
    lessonStore.artifact = artifact
    listLessons.mockRejectedValueOnce(new Error('加载失败'))
    const failedWrapper = mountPrep()
    await flushPromises()
    await failedWrapper.get('select').setValue('class-2')
    await flushPromises()
    expect(lessonStore.artifact).toBe(artifact)
    expect(lessonStore.artifact.class_id).toBe('class-1')
    expect(lessonStore.adapt).not.toHaveBeenCalled()
  })

  it('blocks save, confirm and PPT for a retained artifact from another class', async () => {
    setArtifact('draft', [{ phase: '旧班活动', minutes: 12, activities: ['旧活动'] }], 'class-1')
    listLessons.mockRejectedValueOnce(new Error('加载失败'))
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('select').setValue('class-2')
    await flushPromises()
    const save = wrapper.findAll('button').find((button) => button.text().trim() === '保存草稿')!
    const confirmButton = wrapper.findAll('button').find((button) => button.text().trim() === '确认本节课')!
    const ppt = wrapper.findAll('button').find((button) => button.text().includes('生成PPT'))!
    await save.trigger('click')
    await confirmButton.trigger('click')
    await ppt.trigger('click')
    expect(lessonStore.save).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(createSlides).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('当前教案不属于所选班级，请先加载或生成该班级教案')
  })

  it('writes edited activities back to the exact save payload and balances to the requested duration', async () => {
    setArtifact('draft', [
      { phase: '导入', minutes: 10, activities: ['旧活动'] },
      { phase: '探究', minutes: 10, activities: ['讨论'] },
    ])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('[aria-label="课时分钟"]').setValue('60')
    await wrapper.get('form').trigger('submit')
    const prompt = vi.spyOn(window, 'prompt').mockReturnValueOnce('编辑后的活动').mockReturnValueOnce('切线卡片')
    try {
      await wrapper.findAll('button').find((button) => button.text() === '编辑内容')!.trigger('click')
      await wrapper.findAll('button').find((button) => button.text().includes('添加材料'))!.trigger('click')
      await wrapper.findAll('button').find((button) => button.text().includes('自动平衡时间'))!.trigger('click')
      expect(wrapper.text()).toContain('0-30 min')
      expect(wrapper.text()).toContain('30-60 min')
      await wrapper.findAll('button').find((button) => button.text().trim() === '保存草稿')!.trigger('click')
      expect(lessonStore.save).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({ timeline: [
          { phase: '导入', minutes: 30, activities: ['编辑后的活动', '材料：切线卡片'] },
          { phase: '探究', minutes: 30, activities: ['讨论'] },
        ] }),
      }))
    } finally { prompt.mockRestore() }
  })
})
