import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'

const { list, upload, preprocess, understand, publish, unpublish, toast } = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  preprocess: vi.fn(),
  understand: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/api/teacher/resources', () => ({
  resourcesApi: { list, upload, preprocess, understand, publish, unpublish },
}))
vi.mock('@/api/client', () => ({ authHeaders: () => ({}) }))

import TeacherResourcesView from '@/pages/teacher/TeacherResourcesView.vue'

const existingResource = {
  resource_id: 'resource-1',
  name: '导数教学设计.pdf',
  file_type: 'application/pdf',
  size_bytes: 2048,
  status: 'ready' as const,
  summary: '已有摘要：围绕导数概念的课堂活动。',
  created_at: '2026-08-22T00:00:00Z',
}

function mountResources() {
  return mount(TeacherResourcesView, {
    global: {
      plugins: [createPinia()],
      provide: { showToast: toast },
    },
  })
}

async function chooseFile(wrapper: ReturnType<typeof mountResources>, file: File) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })
  await input.trigger('change')
  await flushPromises()
}

describe('TeacherResourcesView 上传与摘要工作流', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    list.mockResolvedValue([existingResource])
  })

  it('拒绝空文件：本地拦截，不产生上传副作用，既有摘要仍可见', async () => {
    const wrapper = mountResources()
    await flushPromises()

    await chooseFile(wrapper, new File([], '空资料.pdf', { type: 'application/pdf' }))

    expect(upload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('文件内容为空，请选择非空文件')
    expect(wrapper.text()).toContain('已有摘要：围绕导数概念的课堂活动。')
  })

  it('非空文件走 store 契约上传并即时上架到资料库', async () => {
    upload.mockResolvedValue({ resource_id: 'resource-2', status: 'uploading', task_id: 'task-2' })
    const wrapper = mountResources()
    await flushPromises()
    const file = new File(['有效内容'], '有效资料.txt', { type: 'text/plain' })

    await chooseFile(wrapper, file)

    expect(upload).toHaveBeenCalledWith(file, undefined)
    expect(toast).toHaveBeenCalledWith('上传成功')
    expect(wrapper.text()).toContain('有效资料.txt')
  })

  it('生成摘要后在同一资源卡立即展示后端摘要', async () => {
    understand.mockResolvedValue({
      data: {
        ...existingResource,
        summary: '新摘要：学生需区分平均变化率与瞬时变化率。',
      },
    })
    const wrapper = mountResources()
    await flushPromises()

    const card = wrapper.get('.resource-v2__item')
    await card.get('.resource-v2__actions button:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(card.text()).toContain('新摘要：学生需区分平均变化率与瞬时变化率。')
    expect(card.text()).not.toContain('已有摘要：围绕导数概念的课堂活动。')
    expect(wrapper.text()).toContain('摘要已更新；请结合原文件进行教学判断。')
  })

  it('摘要生成失败时保留既有可用摘要，并向教师报错', async () => {
    understand.mockRejectedValue(new Error('理解服务暂不可用'))
    const wrapper = mountResources()
    await flushPromises()

    const card = wrapper.get('.resource-v2__item')
    await card.get('.resource-v2__actions button:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('已有摘要：围绕导数概念的课堂活动。')
    expect(toast).toHaveBeenCalledWith('理解服务暂不可用')
  })
})
