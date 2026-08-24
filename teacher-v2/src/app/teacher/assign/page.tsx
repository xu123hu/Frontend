'use client'

import { useEffect, useState } from 'react'
import { loadAssignments, publishAssignment, type TeacherAssignment } from '../../../features/assessment/teacher-assessment-api'

const statusText: Record<TeacherAssignment['status'], string> = { draft: '等待发布', published: '学生可见', closed: '已截止', archived: '已归档' }

export default function AssignPage() {
  const [assignments, setAssignments] = useState<TeacherAssignment[] | null>(null)
  const [confirming, setConfirming] = useState<TeacherAssignment | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try { setAssignments(await loadAssignments()); setNotice('') } catch { setAssignments(null); setNotice('作业服务未连通；不会展示模拟试卷或发布记录。') }
  }
  useEffect(() => { void refresh() }, [])
  const confirmPublish = async () => {
    if (!confirming || busy) return
    setBusy(true)
    try { await publishAssignment(confirming.assignment_id); setNotice('已按教师确认发布，学生端将只看到该班级的已发布作业。'); setConfirming(null); await refresh() }
    catch { setNotice('发布未完成，学生端不会看到此作业。') }
    finally { setBusy(false) }
  }

  return <div className="teacher-shell"><aside className="teacher-nav" aria-label="教师工作台导航"><div className="brand"><strong>智学数研</strong><span>高中数学教师端 V2</span></div><nav><ul className="nav-list"><li><a href="/teacher/today">今天</a></li><li><a href="/teacher/prep">备课</a></li><li><a aria-current="page" href="/teacher/assign">作业与测验</a></li><li><a href="/teacher/grading">批改</a></li><li><a href="/teacher/classroom">课堂</a></li><li><a href="/teacher/classes">班级</a></li><li><a href="/teacher/resources">资源</a></li><li><a href="/teacher/profile">个人中心</a></li></ul></nav></aside>
    <main className="assign-main"><header className="assign-header"><div><p className="eyebrow">作业与测验 · 教师确认发布</p><h1>组卷与发布队列</h1><p>题库、资源审核与教学管家只负责形成草稿；学生端只接收你在这里二次确认后的作业。</p></div><a className="assign-primary" href="/teacher/today">让教学管家准备草稿</a></header>
      <section className="assign-process" aria-label="真实发布流程"><span>1. 资源审核或题库</span><span>2. 题集草稿</span><span>3. 教师确认</span><strong>4. 学生端可见</strong></section>{notice && <p className="resource-notice" role="status">{notice}</p>}
      <section className="assignment-queue" aria-labelledby="queue-title"><div className="section-title"><div><p className="eyebrow">已创建作业</p><h2 id="queue-title">发布前最后确认</h2></div><span>{assignments === null ? '未连接' : `${assignments.length} 项`}</span></div>
        {assignments === null ? <div className="resource-empty">教师作业服务未连通。连接后只显示当前教师实际创建的作业。</div> : assignments.length === 0 ? <div className="resource-empty"><h3>还没有待发布作业</h3><p>从真实题库或已审核资源生成题集草稿后，会在这里等待你的发布确认。</p></div> : <div className="assignment-list">{assignments.map((item) => <article className="assignment-row" key={item.assignment_id}><div><p className="file-type">班级 {item.class_id} · {item.type}</p><h3>{item.title}</h3><p>{item.deadline ? `截止时间：${new Date(item.deadline).toLocaleString('zh-CN')}` : '未设置截止时间'}</p></div><div className="assignment-actions"><span className={`assignment-status assignment-${item.status}`}>{statusText[item.status]}</span>{item.status === 'draft' && <button type="button" onClick={() => setConfirming(item)} disabled={busy}>发布给学生</button>}</div></article>)}</div>}
      </section>{confirming && <section className="publish-confirm" aria-live="polite"><div><p className="eyebrow">学生可见操作</p><h2>确认将“{confirming.title}”发布给学生？</h2><p>确认后，目标班级的学生端会出现该作业。此操作会留下教师操作记录。</p></div><div><button type="button" className="quiet-button" onClick={() => setConfirming(null)} disabled={busy}>取消</button><button type="button" onClick={() => void confirmPublish()} disabled={busy}>确认发布</button></div></section>}
    </main></div>
}
