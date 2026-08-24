'use client'

import { useEffect, useState } from 'react'
import {
  ChatContainer,
  ConversationHeader,
  MainContainer,
  Message,
  MessageList,
  MessageSeparator,
  MessageInput,
} from '@chatscope/chat-ui-kit-react'
import { appendButlerReply, appendTeacherTask, initialConversation } from '../../../features/copilot/conversation'
import { loadTodayEvidence, sendButlerMessage, type TodayEvidence } from '../../../features/copilot/teacher-api'

const suggestions = ['依据本班易错点准备函数单调性课', '从我的资料中整理一份周练', '查看待确认的作业发布', '打开待批改作答']

export default function TodayPage() {
  const [messages, setMessages] = useState(initialConversation)
  const [evidence, setEvidence] = useState<TodayEvidence | null>(null)
  const [evidenceState, setEvidenceState] = useState('正在读取教师端真实数据…')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    loadTodayEvidence(controller.signal)
      .then((data) => {
        setEvidence(data)
        setEvidenceState(data.source_missing ? '还没有可读取的班级数据。' : '')
      })
      .catch(() => setEvidenceState('教师数据服务未连通；不会展示模拟班级统计。'))
    return () => controller.abort()
  }, [])

  const submitRequest = async (_html: string, text: string) => {
    if (!text.trim() || sending) return
    setMessages((current) => appendTeacherTask(current, text))
    setSending(true)
    try {
      const reply = await sendButlerMessage(text)
      setMessages((current) => appendButlerReply(
        current,
        reply.message || '已收到请求，但本次没有返回可展示的教学产物。',
      ))
    } catch {
      setMessages((current) => appendButlerReply(
        current,
        '教学管家服务尚未连通；任务没有被执行或发布。',
      ))
    } finally {
      setSending(false)
    }
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
          <p className="context-pill">真实数据模式</p>
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
                    disabled={sending}
                    onSend={submitRequest}
                  />
                </ChatContainer>
              </MainContainer>
            </div>
            <div className="suggestions" aria-label="常用教学任务">
              {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={sending} onClick={() => void submitRequest('', suggestion)}>{suggestion}</button>)}
            </div>
          </section>
          <section className="panel evidence-panel" aria-labelledby="evidence-title">
            <h2 id="evidence-title">班级学习证据</h2>
            <p>仅显示学生真实提交、作业与课堂状态；不使用推测性结论。</p>
            {evidence ? <table className="evidence-table">
              <thead><tr><th>待处理</th><th>截止任务</th><th>教学洞察</th></tr></thead>
              <tbody><tr>
                <td><strong>{evidence.grading_queue?.count ?? 0} 份待批改</strong></td>
                <td>{evidence.deadlines?.length ? evidence.deadlines.map((item) => <p key={item.id}>{item.title}</p>) : '暂无临近截止任务'}</td>
                <td>{evidence.actionable_insights?.length ? evidence.actionable_insights.map((item, index) => <p key={item.id || index}>{item.action || item.title || item.evidence}</p>) : '暂无可行动洞察'}</td>
              </tr></tbody>
            </table> : <p className="evidence-footer" role="status">{evidenceState}</p>}
            <p className="evidence-footer">完整班级明细由同一工具运行时读取，不再出现 count= 等调试文字。</p>
          </section>
        </div>
      </main>
    </div>
  )
}
