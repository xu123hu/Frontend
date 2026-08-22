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

describe('TeacherResourcesView upload and summary workflow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    list.mockResolvedValue([existingResource])
  })

  it('rejects a zero-byte file locally before any upload side effect', async () => {
    const wrapper = mountResources()
    await flushPromises()

    await chooseFile(wrapper, new File([], '空资料.pdf', { type: 'application/pdf' }))

    expect(upload).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('文件内容为空，请选择非空文件')
    expect(wrapper.text()).toContain('已有摘要：围绕导数概念的课堂活动。')
  })

  it('uploads a nonempty file through the existing store contract', async () => {
    upload.mockResolvedValue({ resource_id: 'resource-2', status: 'uploading' })
    list
      .mockResolvedValueOnce([existingResource])
      .mockResolvedValueOnce([{
        resource_id: 'resource-2',
        name: '有效资料.txt',
        file_type: 'text/plain',
        size_bytes: 12,
        status: 'preprocessing',
        created_at: '2026-08-22T00:01:00Z',
      }, existingResource])
    const wrapper = mountResources()
    await flushPromises()
    const file = new File(['有效内容'], '有效资料.txt', { type: 'text/plain' })

    await chooseFile(wrapper, file)

    expect(upload).toHaveBeenCalledWith(file, undefined)
    expect(toast).toHaveBeenCalledWith('上传成功，资源已可用')
    expect(wrapper.text()).toContain('有效资料.txt')
  })

  it('immediately renders the backend understanding summary on the same resource card', async () => {
    understand.mockResolvedValue({
      data: {
        ...existingResource,
        status: 'understand',
        summary: '新摘要：学生需区分平均变化率与瞬时变化率。',
      },
    })
    const wrapper = mountResources()
    await flushPromises()

    const card = wrapper.get('.t-resource')
    await card.get('button:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(card.text()).toContain('新摘要：学生需区分平均变化率与瞬时变化率。')
    expect(card.text()).not.toContain('已有摘要：围绕导数概念的课堂活动。')
    expect(toast).toHaveBeenCalledWith('本地摘要已生成')
  })

  it('keeps an existing usable summary visible when understanding fails', async () => {
    understand.mockRejectedValue(new Error('理解服务暂不可用'))
    const wrapper = mountResources()
    await flushPromises()

    const card = wrapper.get('.t-resource')
    await card.get('button:nth-of-type(2)').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('已有摘要：围绕导数概念的课堂活动。')
    expect(wrapper.text()).toContain('理解服务暂不可用')
    expect(toast).toHaveBeenCalledWith('理解服务暂不可用')
  })
})
