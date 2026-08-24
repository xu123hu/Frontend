'use client'

import { useEffect, useState } from 'react'
import { confirmGrade, loadGradingDetail, loadGradingQueue, type GradingDetail, type GradingQueueItem } from '../../../features/grading/teacher-grading-api'

const queueStatus = { unprocessed: '待处理', low_confidence: '需复核', confirmed: '已确认' }

export default function GradingPage() {
  const [queue, setQueue] = useState<GradingQueueItem[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState<GradingDetail | null>(null)
  const [finalScore, setFinalScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [armed, setArmed] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refreshQueue = async () => { try { const data = await loadGradingQueue(); setQueue(data); setSelectedId((current) => current || data[0]?.submission_item_id || '') } catch { setQueue(null); setNotice('批改服务未连通；不会显示模拟学生作答或建议分数。') } }
  useEffect(() => { void refreshQueue() }, [])
  useEffect(() => { if (!selectedId) return; const c = new AbortController(); setDetail(null); setArmed(false); loadGradingDetail(selectedId, c.signal).then((data) => { setDetail(data); setFinalScore(data.suggestion.teacher_final_score?.toString() || data.suggestion.suggestion_score?.toString() || ''); setFeedback(data.suggestion.teacher_feedback || '') }).catch(() => setNotice('无法读取这份作答；没有产生或写入正式成绩。')); return () => c.abort() }, [selectedId])

  const commit = async () => {
    if (!detail || !armed || busy || !detail.suggestion.suggestion_id) return
    const parsed = Number(finalScore)
    if (!Number.isFinite(parsed)) { setNotice('请输入有效的最终分数；未写入成绩。'); return }
    setBusy(true)
    try { await confirmGrade(detail.submission_item_id, { suggestion_id: detail.suggestion.suggestion_id, decision: parsed === detail.suggestion.suggestion_score ? 'accept' : 'override', final_score: parsed, teacher_feedback: feedback || undefined, version: detail.suggestion.version }); setNotice('教师决策已确认：正式成绩与学习记录已按当前作答更新。'); setArmed(false); await refreshQueue() } catch { setNotice('确认未完成；正式成绩和学习记录均未更新。') } finally { setBusy(false) }
  }

  return <div className="teacher-shell"><aside className="teacher-nav" aria-label="教师工作台导航"><div className="brand"><strong>智学数研</strong><span>高中数学教师端 V2</span></div><nav><ul className="nav-list"><li><a href="/teacher/today">今天</a></li><li><a href="/teacher/prep">备课</a></li><li><a href="/teacher/assign">作业与测验</a></li><li><a aria-current="page" href="/teacher/grading">批改</a></li><li><a href="/teacher/classroom">课堂</a></li><li><a href="/teacher/classes">班级</a></li><li><a href="/teacher/resources">资源</a></li><li><a href="/teacher/profile">个人中心</a></li></ul></nav></aside>
    <main className="grading-main"><header className="grading-header"><div><p className="eyebrow">批改工作区 · 题目聚焦</p><h1>先看作答证据，再确认成绩</h1></div><p>建议分数始终是草稿；只有教师最终确认才会同步给学生与学情记录。</p></header>{notice && <p className="resource-notice" role="status">{notice}</p>}
      <div className="grading-workspace"><aside className="submission-queue" aria-labelledby="queue-title"><div className="section-title"><div><p className="eyebrow">批改队列</p><h2 id="queue-title">待处理作答</h2></div><span>{queue === null ? '未连接' : `${queue.length} 份`}</span></div>{queue === null ? <div className="review-empty">连接后只显示有权限批改的真实作答。</div> : queue.length === 0 ? <div className="review-empty">当前没有待处理作答。</div> : <div className="grade-queue-list">{queue.map((item, index) => <button key={item.submission_item_id} className={item.submission_item_id === selectedId ? 'queue-selected' : ''} type="button" onClick={() => setSelectedId(item.submission_item_id)}><span>待批改作答 {index + 1}</span><small>{queueStatus[item.status]} · {Math.round(item.confidence * 100)}% 置信</small></button>)}</div>}</aside>
        <section className="submission-viewer" aria-labelledby="viewer-title">{detail ? <><p className="eyebrow">原始作答证据</p><h2 id="viewer-title">{detail.question_text || '题目文本不可用，请查看原始附件'}</h2><div className="answer-block"><p>学生提交内容</p><pre>{detail.original_answer || '学生未提交文字作答。'}</pre>{detail.file_id && <a href={`/api/teacher/grading/${detail.submission_item_id}/file`} target="_blank" rel="noreferrer">在新窗口查看原始附件</a>}</div>{detail.answer_analysis && <details><summary>查看题目解析</summary><p>{detail.answer_analysis}</p></details>}</> : <div className="resource-empty">从左侧选择一份真实作答后，才会加载题目、原始答案与评分证据。</div>}</section>
        <aside className="rubric-panel" aria-labelledby="rubric-title">{detail ? <><p className="eyebrow">评分依据与教师决策</p><h2 id="rubric-title">评分标准</h2><dl className="rubric-facts"><div><dt>标准答案</dt><dd>{detail.standard_answer || '无可用标准答案，须人工判定'}</dd></div><div><dt>建议分数</dt><dd>{detail.suggestion.suggestion_score ?? '未生成'}</dd></div><div><dt>建议证据</dt><dd>{detail.suggestion.evidence || '未提供证据'}</dd></div></dl><label>最终分数<input aria-label="最终分数" value={finalScore} onChange={(event) => { setFinalScore(event.target.value); setArmed(false) }} inputMode="decimal" /></label><label>给学生的反馈<textarea value={feedback} onChange={(event) => { setFeedback(event.target.value); setArmed(false) }} placeholder="可选：说明得分依据或下一步建议" /></label>{!armed ? <button type="button" onClick={() => setArmed(true)} disabled={busy}>确认记入正式成绩</button> : <div className="grade-confirm"><p>将以当前分数写入正式成绩，并据此更新学习记录。</p><div><button className="quiet-button" type="button" onClick={() => setArmed(false)} disabled={busy}>返回修改</button><button type="button" onClick={() => void commit()} disabled={busy}>最终确认</button></div></div>}</> : <div className="review-empty">评分依据会与真实作答一同加载；不展示预设分数表单。</div>}</aside>
      </div></main></div>
}
