export type ConversationMessage = {
  sender: string
  direction: 'incoming' | 'outgoing'
  message: string
}

export const initialConversation: ConversationMessage[] = [
  {
    sender: '教学管家',
    direction: 'incoming',
    message: '我会先读取班级、资料和已创建的教学成果，再给出可编辑的草稿。任何面向学生的发布与正式成绩，都需要你最后确认。',
  },
]

export function appendTeacherTask(conversation: ConversationMessage[], task: string): ConversationMessage[] {
  const message = task.trim()
  if (!message) return conversation

  return [...conversation, { sender: '李老师', direction: 'outgoing', message }]
}
