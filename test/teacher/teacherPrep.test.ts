import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const routeState = vi.hoisted(() => ({ query: {} as Record<string, unknown> }))
const {
  artifact, lessonStore, contextStore, mineClasses, downloadFile, listLessons, getLesson,
  createSlides, createExplainer, adoptSuggestion, classInsightsApi, confirm, routerPush, toast,
} = vi.hoisted(() => {
  const artifact: any = {
    artifact_id: 'lesson-1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: 'class-1', owner_id: 'teacher-1',
    status: 'draft', version: 1, content: { topic: '旧课题', timeline: [] }, source_refs: [], warnings: [], degraded: false, created_at: '', updated_at: '',
  }
  return {
    artifact,
    lessonStore: { artifact: null as any, error: null as string | null, adapt: vi.fn(), save: vi.fn() },
    contextStore: { classId: 'class-1' as string | null, className: '高一（1）班' as string | null, setClass: vi.fn() },
    mineClasses: vi.fn().mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }, { id: 'class-2', name: '高一（2）班' }] }),
    downloadFile: vi.fn(),
    listLessons: vi.fn().mockResolvedValue([]),
    getLesson: vi.fn(),
    createSlides: vi.fn(),
    createExplainer: vi.fn(),
    adoptSuggestion: vi.fn(),
    classInsightsApi: vi.fn().mockResolvedValue([]),
    confirm: vi.fn(),
    routerPush: vi.fn(),
    toast: vi.fn(),
  }
})

vi.mock('@/stores/teacher/lessonArtifacts', () => ({ useLessonArtifactsStore: () => lessonStore }))
vi.mock('@/stores/teacher/context', () => ({ useTeacherContextStore: () => contextStore }))
vi.mock('@/api', () => ({ classApi: { mine: mineClasses } }))
vi.mock('@/api/client', () => ({ api: { download: downloadFile } }))
vi.mock('@/api/teacher/lessons', () => ({ lessonsApi: { list: listLessons, get: getLesson, createSlides, createExplainer, adoptSuggestion } }))
vi.mock('@/api/teacher/classes', () => ({ classesApi: { insights: classInsightsApi } }))
vi.mock('@/api/teacher/artifacts', () => ({ artifactsApi: { confirm } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }), useRoute: () => routeState }))

import TeacherPrepView from '@/pages/teacher/TeacherPrepView.vue'

function setArtifact(status: 'draft' | 'confirmed', timeline: any[] = [], classId = 'class-1', durationMinutes?: number) {
  Object.assign(artifact, { class_id: classId, status, version: 1, content: { topic: '导数的概念', timeline, ...(durationMinutes ? { duration_minutes: durationMinutes } : {}) } })
}

beforeEach(() => {
  vi.clearAllMocks()
  routeState.query = {}
  lessonStore.artifact = artifact
  mineClasses.mockResolvedValue({ items: [{ id: 'class-1', name: '高一（1）班' }, { id: 'class-2', name: '高一（2）班' }] })
  listLessons.mockResolvedValue([])
  classInsightsApi.mockResolvedValue([])
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

  it('edits a step through the structured drawer instead of window.prompt (TC-L2-F05)', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察割线变化'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.find('[role="dialog"][aria-label="结构化编辑教学环节"]').exists()).toBe(false)
    await wrapper.findAll('button').find((button) => button.text() === '编辑内容')!.trigger('click')
    const drawer = wrapper.get('[role="dialog"][aria-label="结构化编辑教学环节"]')
    await drawer.get('[aria-label="环节活动内容"]').setValue('观察割线变化\n归纳 $\\frac{\\Delta y}{\\Delta x}$ 的趋势')
    await drawer.findAll('button').find((button) => button.text().includes('保存环节'))!.trigger('click')
    expect(wrapper.text()).toContain('归纳')
    await wrapper.get('button.t-btn').trigger('click')
    expect(lessonStore.save).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ timeline: [{ phase: '探究', minutes: 12, activities: ['观察割线变化', '归纳 $\\frac{\\Delta y}{\\Delta x}$ 的趋势'] }] }),
    }))
  })

  it('does not confirm or create slides from a draft, but downloads via client after explicit confirmation (TC-L2-F07)', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    const wrapper = mountPrep()
    await flushPromises()
    const ppt = wrapper.findAll('button').find((button) => button.text().includes('生成PPT'))!
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:lesson')
    URL.revokeObjectURL = vi.fn()
    await ppt.trigger('click')
    expect(confirm).not.toHaveBeenCalled()
    expect(createSlides).not.toHaveBeenCalled()
    expect(downloadFile).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('请先确认教案后再生成 PPT')

    setArtifact('confirmed', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    createSlides.mockResolvedValue({ data: { content: { download_url: '/api/teacher/lessons/lesson-1/slides-file', filename: '导数.pptx' } } })
    downloadFile.mockResolvedValue({ blob: new Blob(['slides']), filename: '课堂课件-演示.txt' })
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = vi.fn()
    try {
      await ppt.trigger('click')
      expect(createSlides).toHaveBeenCalledWith('lesson-1', { version: 1, style: '简洁课堂' })
      expect(downloadFile).toHaveBeenCalledWith('/teacher/lessons/lesson-1/slides-file')
      expect(toast).toHaveBeenCalledWith('PPT 已生成并开始下载')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      HTMLAnchorElement.prototype.click = originalClick
    }
  })

  it('adopts a suggestion through the persistence endpoint and keeps honest on 404 (TC-L2-F04)', async () => {
    classInsightsApi.mockResolvedValue([
      { insight_id: 'ins-1', kind: 'error_cluster', summary: 'a=0 边界失分集中', evidence: '17/46 人失分。', data_window: { from: '', to: '' }, recommended_actions: [] },
    ])
    setArtifact('draft', [
      { phase: '导入', minutes: 5, activities: ['复习'] },
      { phase: '探究', minutes: 20, activities: ['探究活动'] },
    ])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('a=0 边界失分集中')
    expect(wrapper.text()).toContain('17/46 人失分')

    adoptSuggestion.mockResolvedValue({ ...artifact, version: 2 })
    await wrapper.findAll('button').find((button) => button.text() === '采纳建议')!.trigger('click')
    await flushPromises()
    expect(adoptSuggestion).toHaveBeenCalledWith('lesson-1', { segment_id: 'step-2', suggestion_id: 'ins-1', content: 'a=0 边界失分集中' })
    expect(toast).toHaveBeenCalledWith('已采纳建议并落库：a=0 边界失分集中')

    const second = wrapper.findAll('button').find((button) => button.text() === '采纳建议')
    expect(second).toBeUndefined()
  })

  it('stays honest when the adopt endpoint is not shipped yet (404 → explicit toast, no fake success)', async () => {
    classInsightsApi.mockResolvedValue([
      { insight_id: 'ins-404', kind: 'error_cluster', summary: '边界失分', evidence: '证据。', data_window: { from: '', to: '' }, recommended_actions: [] },
    ])
    setArtifact('draft', [
      { phase: '导入', minutes: 5, activities: ['复习'] },
      { phase: '探究', minutes: 20, activities: ['探究活动'] },
    ])
    const notShipped: any = Object.assign(new Error('not_found'), { code: 404 })
    adoptSuggestion.mockRejectedValue(notShipped)
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    await wrapper.findAll('button').find((button) => button.text() === '采纳建议')!.trigger('click')
    await flushPromises()
    expect(toast).toHaveBeenCalledWith('采纳落库端点尚未开通（契约已受理，后端排期中），建议暂未入库')
    expect(wrapper.text()).toContain('采纳建议')
  })

  it('carries the lesson blueprint to the assign workspace (GP-6 / TC-L2-F08)', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('函数的单调性')
    await wrapper.get('form').trigger('submit')
    await wrapper.findAll('button').find((button) => button.text().includes('生成当堂练习'))!.trigger('click')
    expect(routerPush).toHaveBeenCalledWith({
      path: '/teacher/assign',
      query: { count: '3', source: 'lesson:lesson-1', topic: '函数的单调性', kp_codes: '函数的单调性' },
    })
    expect(toast).toHaveBeenCalledWith('已携带本节课蓝图跳转组卷，可在组卷台继续调整')
  })

  it('generates the board outline through the backend artifact, not local txt (TC-L2-F09)', async () => {
    setArtifact('draft', [{ phase: '探究', minutes: 12, activities: ['观察'] }])
    const wrapper = mountPrep()
    await flushPromises()
    await wrapper.get('[aria-label="课题"]').setValue('导数的概念')
    await wrapper.get('form').trigger('submit')
    createExplainer.mockResolvedValue({ data: { content: { outline: '板书（演示）', download_url: '/api/teacher/lessons/lesson-1/board-outline-file', filename: '课堂板书提纲-演示.txt' } } })
    downloadFile.mockResolvedValue({ blob: new Blob(['outline']), filename: '课堂板书提纲-演示.txt' })
    const originalClick = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = vi.fn()
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:outline')
    URL.revokeObjectURL = vi.fn()
    try {
      await wrapper.findAll('button').find((button) => button.text().includes('生成板书'))!.trigger('click')
      expect(createExplainer).toHaveBeenCalledWith('lesson-1', { kind: 'board_outline', version: 1 })
      expect(downloadFile).toHaveBeenCalledWith('/teacher/lessons/lesson-1/board-outline-file')
      expect(toast).toHaveBeenCalledWith('板书提纲已生成并开始下载')
    } finally {
      HTMLAnchorElement.prototype.click = originalClick
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }
  })

  it('highlights the suggested step when entering via insight deep link (GP-2 / TC-L2-F03)', async () => {
    routeState.query = { lesson_id: 'lesson-9', from: 'insight:ins-9' }
    classInsightsApi.mockResolvedValue([
      { insight_id: 'ins-9', kind: 'error_cluster', summary: 'a=0 边界失分集中', evidence: '17/46 人失分。', data_window: { from: '', to: '' }, recommended_actions: [] },
    ])
    getLesson.mockResolvedValue({
      data: {
        ...artifact,
        artifact_id: 'lesson-9',
        class_id: 'class-1',
        content: { topic: '导数的概念', timeline: [{ phase: '导入', minutes: 5, activities: ['复习'] }, { phase: '例题', minutes: 15, activities: ['例 2'] }] },
      },
    })
    const wrapper = mountPrep()
    await flushPromises()
    expect(getLesson).toHaveBeenCalledWith('lesson-9')
    expect(wrapper.text()).toContain('建议插入')
    expect(wrapper.text()).toContain('a=0 边界失分集中')
  })
})
