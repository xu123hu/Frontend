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
  lessonStore.adapt.mockImplementation(async (payload) => {
    Object.assign(artifact, { class_id: payload.class_id, status: 'draft', content: { topic: payload.topic, timeline: artifact.content.timeline, duration_minutes: payload.duration_minutes } })
    return { artifact, error: null }
  })
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

  it('switches class without adapting and clears old data for an empty or failed target load', async () => {
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
    expect(lessonStore.artifact).toBeNull()
    expect(failedWrapper.text()).not.toContain('旧班活动')
    expect(lessonStore.adapt).not.toHaveBeenCalled()
  })

  it('blocks every export or mutation for a foreign-class artifact', async () => {
    setArtifact('draft', [{ phase: '旧班活动', minutes: 12, activities: ['旧活动'] }], 'class-1')
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    artifact.class_id = 'class-2'
    const save = wrapper.findAll('button').find((button) => button.text().trim() === '保存草稿')!
    const confirmButton = wrapper.findAll('button').find((button) => button.text().trim() === '确认本节课')!
    const ppt = wrapper.findAll('button').find((button) => button.text().includes('生成PPT'))!
    const word = wrapper.findAll('button').find((button) => button.text().includes('导出Word'))!
    const board = wrapper.findAll('button').find((button) => button.text().includes('生成板书'))!
    const originalFetch = globalThis.fetch
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    globalThis.fetch = vi.fn() as any
    URL.createObjectURL = vi.fn(() => 'blob:blocked')
    URL.revokeObjectURL = vi.fn()
    try {
    await save.trigger('click')
    await confirmButton.trigger('click')
    await ppt.trigger('click')
    await word.trigger('click')
    await board.trigger('click')
    expect(lessonStore.save).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(createSlides).not.toHaveBeenCalled()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('当前教案不属于所选班级，请先加载或生成该班级教案')
    } finally {
      globalThis.fetch = originalFetch
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  it('ignores stale class-load resolve and reject so the latest class remains authoritative', async () => {
    let resolveOlder!: (value: any[]) => void
    let resolveLatest!: (value: any[]) => void
    const older = new Promise<any[]>((resolve) => { resolveOlder = resolve })
    const latest = new Promise<any[]>((resolve) => { resolveLatest = resolve })
    listLessons.mockImplementationOnce(() => older).mockImplementationOnce(() => latest)
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('select').setValue('class-2')
    await wrapper.get('select').setValue('class-1')
    resolveOlder([{ ...artifact, artifact_id: 'lesson-old', class_id: 'class-2', content: { timeline: [{ phase: '旧请求', minutes: 10, activities: ['A'] }] } }])
    await flushPromises()
    expect(lessonStore.artifact).toBeNull()
    resolveLatest([{ ...artifact, artifact_id: 'lesson-new', class_id: 'class-1', content: { timeline: [{ phase: '最新请求', minutes: 10, activities: ['B'] }] } }])
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('lesson-new')
    expect(wrapper.text()).toContain('最新请求')
    let rejectStale!: (reason?: unknown) => void
    let resolveFresh!: (value: any[]) => void
    const staleReject = new Promise<any[]>((_resolve, reject) => { rejectStale = reject })
    const fresh = new Promise<any[]>((resolve) => { resolveFresh = resolve })
    listLessons.mockImplementationOnce(() => staleReject).mockImplementationOnce(() => fresh)
    await wrapper.get('select').setValue('class-2')
    await wrapper.get('select').setValue('class-1')
    rejectStale(new Error('stale'))
    await flushPromises()
    expect(lessonStore.artifact).toBeNull()
    resolveFresh([{ ...artifact, artifact_id: 'lesson-fresh', class_id: 'class-1', content: { timeline: [{ phase: '最终请求', minutes: 10, activities: ['C'] }] } }])
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('lesson-fresh')
  })

  it('clears an old same-class lesson when generating the new topic fails', async () => {
    setArtifact('draft', [{ phase: '旧教案', minutes: 12, activities: ['旧活动'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('旧课题')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('旧教案')
    lessonStore.adapt.mockImplementationOnce(async () => ({ artifact: null, error: '生成教案失败' }))
    await wrapper.get('[aria-label="课题"]').setValue('新课题')
    await wrapper.get('form').trigger('submit')
    expect(lessonStore.artifact).toBeNull()
    expect(wrapper.text()).not.toContain('旧教案')
    const save = wrapper.findAll('button').find((button) => button.text().trim() === '保存草稿')!
    await save.trigger('click')
    expect(lessonStore.save).not.toHaveBeenCalled()
  })

  it('keeps B after a pending A adapt resolves or rejects following a class change', async () => {
    const target = { ...artifact, artifact_id: 'lesson-b', class_id: 'class-2', content: { timeline: [{ phase: 'B 教案', minutes: 10, activities: ['B'] }] } }
    let resolveA!: (value: any) => void
    const pendingA = new Promise((resolve) => { resolveA = resolve })
    lessonStore.adapt.mockImplementationOnce(() => pendingA)
    listLessons.mockResolvedValueOnce([target])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('A 课题')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('select').setValue('class-2')
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('lesson-b')
    resolveA({ artifact: { ...artifact, artifact_id: 'lesson-a', class_id: 'class-1', content: { timeline: [{ phase: 'A 教案', minutes: 10, activities: ['A'] }] } }, error: null })
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('lesson-b')

    wrapper.unmount()
    let rejectA!: (reason?: unknown) => void
    const rejectedA = new Promise((_resolve, reject) => { rejectA = reject })
    lessonStore.adapt.mockImplementationOnce(() => rejectedA)
    listLessons.mockResolvedValueOnce([target])
    const rejectWrapper = mountPrep()
    await flushPromises()
    await rejectWrapper.get('[aria-label="课题"]').setValue('A 课题')
    await rejectWrapper.get('form').trigger('submit')
    await rejectWrapper.get('select').setValue('class-2')
    await flushPromises()
    rejectA(new Error('A 生成失败'))
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('lesson-b')
  })

  it('keeps B after a pending A recent-lesson lookup resolves or rejects following a class change', async () => {
    const target = { ...artifact, artifact_id: 'source-b', class_id: 'class-2', content: { timeline: [{ phase: 'B 最近教案', minutes: 10, activities: ['B'] }] } }
    let resolveA!: (value: any[]) => void
    const pendingA = new Promise<any[]>((resolve) => { resolveA = resolve })
    listLessons.mockImplementationOnce(() => pendingA).mockResolvedValueOnce([target])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('上次类似课'))!.trigger('click')
    await wrapper.get('select').setValue('class-2')
    await flushPromises()
    resolveA([{ ...artifact, artifact_id: 'source-a', class_id: 'class-1', content: { timeline: [{ phase: 'A 最近教案', minutes: 10, activities: ['A'] }] } }])
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('source-b')

    wrapper.unmount()
    let rejectA!: (reason?: unknown) => void
    const rejectedA = new Promise<any[]>((_resolve, reject) => { rejectA = reject })
    listLessons.mockImplementationOnce(() => rejectedA).mockResolvedValueOnce([target])
    const rejectWrapper = mountPrep()
    await flushPromises()
    await rejectWrapper.findAll('button').find((button) => button.text().includes('上次类似课'))!.trigger('click')
    await rejectWrapper.get('select').setValue('class-2')
    await flushPromises()
    rejectA(new Error('A 最近教案失败'))
    await flushPromises()
    expect(lessonStore.artifact?.artifact_id).toBe('source-b')
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
