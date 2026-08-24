'use client'

import { useState } from 'react'
import {
  ChatContainer,
  ConversationHeader,
  MainContainer,
  Message,
  MessageList,
  MessageSeparator,
  MessageInput,
} from '@chatscope/chat-ui-kit-react'
import { appendTeacherTask, initialConversation } from '../../../features/copilot/conversation'

const suggestions = ['依据本班易错点准备函数单调性课', '从我的资料中整理一份周练', '查看待确认的作业发布', '打开待批改作答']

const classEvidence = [
  { name: '高二（3）班', activity: '今日提交 18 人', complete: 18, total: 42, status: '5 份待复核' },
  { name: '高二（5）班', activity: '单调性周练进行中', complete: 31, total: 40, status: '9 人未交' },
]

export default function TodayPage() {
  const [messages, setMessages] = useState(initialConversation)

  const submitRequest = (_html: string, text: string) => {
    setMessages((current) => appendTeacherTask(current, text))
  }

  return (
    <div className="teacher-shell">
      <aside className="teacher-nav" aria-label="教师工作台导航">
        <div className="brand"><strong>智学数研</strong><span>高中数学教师端 V2</span></div>
        <nav>
          <ul className="nav-list">
            <li><a aria-current="page" href="/teacher/today">今天</a></li>
            <li><a href="/teacher/prep">备课</a></li>
            <li><a href="/teacher/assign">作业与测验</a></li>
            <li><a href="/teacher/grading">批改</a></li>
            <li><a href="/teacher/classroom">课堂</a></li>
            <li><a href="/teacher/classes">班级</a></li>
            <li><a href="/teacher/resources">资源</a></li>
          </ul>
        </nav>
      </aside>
      <main className="today-main">
        <header className="today-header">
          <div><p className="eyebrow">今天 · 教师工作台</p><h1>教学管家</h1></div>
          <p className="context-pill">当前班级：高二（3）班</p>
        </header>
        <div className="today-grid">
          <section className="panel copilot" aria-labelledby="copilot-title">
            <header className="copilot-header">
              <h2 id="copilot-title">把教学任务直接交给我</h2>
              <p>备课、出题、整理上传资料、发布作业与批改，都会进入同一条教师可审阅的工作流。</p>
            </header>
            <div className="conversation copilot-kit" role="log" aria-label={`教学会话，共 ${messages.length} 条消息`} aria-live="polite">
              <MainContainer>
                <ChatContainer>
                  <ConversationHeader>
                    <ConversationHeader.Content userName="教学管家" info="会话中的工具调用均可追溯" />
                  </ConversationHeader>
                  <MessageList autoScrollToBottom>
                    {messages.map((message, index) => <Message key={`${message.sender}-${index}`} model={{ ...message, position: 'single', type: 'text' }} />)}
                    <MessageSeparator content="教师工具会在这里留下可追溯记录" />
                  </MessageList>
                  <MessageInput
                    aria-label="直接交代教学任务"
                    attachButton={false}
                    placeholder="例如：根据本班错因，把函数单调性周练整理成作业草稿"
                    onSend={submitRequest}
                  />
                </ChatContainer>
              </MainContainer>
            </div>
            <div className="suggestions" aria-label="常用教学任务">
              {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessages((current) => appendTeacherTask(current, suggestion))}>{suggestion}</button>)}
            </div>
          </section>
          <section className="panel evidence-panel" aria-labelledby="evidence-title">
            <h2 id="evidence-title">班级学习证据</h2>
            <p>基于学生真实提交、作业与课堂状态；不使用推测性结论。</p>
            <table className="evidence-table">
              <thead><tr><th>班级</th><th>进度</th><th>当前动作</th></tr></thead>
              <tbody>{classEvidence.map((item) => (
                <tr key={item.name}><td><strong>{item.name}</strong><br /><small>{item.activity}</small></td><td className="progress-cell"><meter min="0" max={item.total} value={item.complete}>{item.complete}/{item.total}</meter></td><td><span className="status">{item.status}</span></td></tr>
              ))}</tbody>
            </table>
            <p className="evidence-footer">完整班级明细会由同一工具运行时读取，不再出现 count= 等调试文字。</p>
          </section>
        </div>
      </main>
    </div>
  )
}
