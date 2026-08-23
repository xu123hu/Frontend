import { describe, expect, it } from 'vitest'
import { applySseEvent, fromHistory, newAssistantMsg } from '@/components/chat/messageModel'

// messageModel.js 为无类型标注的 JS 模块，测试侧以 any 读取字段
type AnyMsg = any

function makeMsg(): AnyMsg {
  return newAssistantMsg('cm')
}

describe('阶段 6B：搜索来源/降级体验', () => {
  it('degraded SSE 事件 → 消息携带降级提示（error_code + message）', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'degraded', {
      error_code: 'confirmation_required',
      refuse_reason: '本地知识库未检索到相关内容',
    })
    expect(msg.degraded).toEqual({
      error_code: 'confirmation_required',
      message: '本地知识库未检索到相关内容',
    })
  })

  it('degraded 事件缺 message 时回退 refuse_reason', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'degraded', { error_code: 'confirmation_required' })
    expect(msg.degraded?.error_code).toBe('confirmation_required')
    expect(msg.degraded?.message).toBe('')
  })

  it('citation 事件携带 web_search 扩展字段（title/url/snippet/retrieved_at）', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'citation', {
      items: [
        {
          n: 1,
          chunk_id: 'chunk-web-1',
          source: '百度百科',
          loc: '切片 chunk-we',
          title: '导数概念',
          url: 'https://example.com/derivative',
          snippet: '导数是函数的局部变化率……',
          retrieved_at: '2026-08-21T10:00:00+00:00',
        },
      ],
    })
    expect(msg.citations).toHaveLength(1)
    const c = msg.citations[0]
    expect(c.title).toBe('导数概念')
    expect(c.url).toBe('https://example.com/derivative')
    expect(c.snippet).toContain('局部变化率')
    expect(c.retrieved_at).toBe('2026-08-21T10:00:00+00:00')
  })

  it('旧 citation（无扩展字段）不报错，仅保留基础字段', () => {
    const msg = makeMsg()
    applySseEvent(msg, 'citation', { items: [{ n: 1, source: '教材' }] })
    expect(msg.citations[0].source).toBe('教材')
    expect(msg.citations[0].title).toBeUndefined()
  })

  it('历史信封还原 citation 扩展字段与 degraded 块', () => {
    const item = {
      id: 'msg-1',
      role: 'assistant',
      envelope: {
        msg_id: 'msg-1',
        meta: {},
        blocks: [
          { type: 'markdown', content: '根据联网检索结果【1】' },
          {
            type: 'citation',
            items: [
              {
                n: 1,
                chunk_id: 'chunk-web-1',
                source: '百度百科',
                title: '导数概念',
                url: 'https://example.com/derivative',
                snippet: '导数是函数的局部变化率……',
                retrieved_at: '2026-08-21T10:00:00+00:00',
              },
            ],
          },
          {
            type: 'degraded',
            data: { error_code: 'confirmation_required', refuse_reason: '本地知识库未检索到相关内容' },
          },
        ],
      },
    }
    const msg = fromHistory(item) as any
    expect(msg.citations[0].title).toBe('导数概念')
    expect(msg.citations[0].url).toBe('https://example.com/derivative')
    expect(msg.degraded).toEqual({
      error_code: 'confirmation_required',
      message: '本地知识库未检索到相关内容',
    })
  })
})
