import { describe, expect, it } from 'vitest'
import { appendTeacherTask, initialConversation } from './conversation'

describe('teacher copilot conversation', () => {
  it('adds a suggested high-school mathematics task as an outgoing teacher message', () => {
    const next = appendTeacherTask(initialConversation, '依据本班易错点准备函数单调性课')

    expect(next.at(-1)).toMatchObject({
      sender: '李老师',
      direction: 'outgoing',
      message: '依据本班易错点准备函数单调性课',
    })
  })
})
