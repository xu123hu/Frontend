'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { approveQuestionCandidates, loadTeacherResources, uploadTeacherResource, type TeacherResource } from '../../../features/resources/teacher-resources-api'

function formatSize(bytes: number) {
  if (!bytes) return '大小未知'
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<TeacherResource[] | null>(null)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    try {
      setResources(await loadTeacherResources())
      setNotice('')
    } catch {
      setResources(null)
      setNotice('资源服务未连通；不会显示示例资料。')
    }
  }

  useEffect(() => { void refresh() }, [])

  const visibleResources = useMemo(() => (resources || []).filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query, resources])
  const pendingCount = (resources || []).flatMap((item) => item.question_candidates).filter((item) => item.review_status === 'pending_review').length

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setBusy(true)
    try {
      await uploadTeacherResource(file)
      setNotice(`已上传“${file.name}”。材料仍需处理与教师审核后才可用于出题。`)
      await refresh()
    } catch {
      setNotice('上传未完成，文件没有进入资源库。')
    } finally {
      setBusy(false)
    }
  }

  const handleApprove = async (resourceId: string, candidateId: string) => {
    if (busy) return
    setBusy(true)
    try {
      await approveQuestionCandidates(resourceId, [candidateId])
      setNotice('候选题已由教师确认，并进入可供组卷调用的题库。')
      await refresh()
    } catch {
      setNotice('审核没有完成；候选题仍未进入题库。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="teacher-shell">
      <aside className="teacher-nav" aria-label="教师工作台导航">
        <div className="brand"><strong>智学数研</strong><span>高中数学教师端 V2</span></div>
        <nav><ul className="nav-list">
          <li><a href="/teacher/today">今天</a></li><li><a href="/teacher/prep">备课</a></li><li><a href="/teacher/assign">作业与测验</a></li><li><a href="/teacher/grading">批改</a></li><li><a href="/teacher/classroom">课堂</a></li><li><a href="/teacher/classes">班级</a></li><li><a aria-current="page" href="/teacher/resources">资源</a></li><li><a href="/teacher/profile">个人中心</a></li>
        </ul></nav>
      </aside>
      <main className="resource-main">
        <header className="resource-header">
          <div><p className="eyebrow">资源中心 · 高中数学</p><h1>资源与题目审核</h1><p className="resource-intro">上传讲义、试卷、PDF 或照片后，所有候选题都必须先由教师审核，才可以参与组卷或发给学生。</p></div>
          <label className="upload-button" aria-label="上传教学材料">{busy ? '处理中…' : '上传教学材料'}<input type="file" accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg" onChange={(event) => void handleUpload(event)} disabled={busy} /></label>
        </header>
        <section className="resource-toolbar" aria-label="资源筛选">
          <label>检索我的资料<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按文件名查找" /></label>
          <p><strong>{pendingCount}</strong> 道候选题等待教师审核</p>
        </section>
        {notice && <p className="resource-notice" role="status">{notice}</p>}
        <div className="resource-workspace">
          <section className="resource-catalog" aria-labelledby="catalog-title">
            <div className="section-title"><div><p className="eyebrow">我的材料</p><h2 id="catalog-title">可追溯的教学来源</h2></div><span>{resources === null ? '未连接' : `${visibleResources.length} 份`}</span></div>
            {resources === null ? <div className="resource-empty">教师资源服务未连通。连接后只显示你的真实材料。</div> : visibleResources.length === 0 ? <div className="resource-empty"><h3>还没有上传教学材料</h3><p>从一份真实的高中数学讲义、试卷或图片开始。系统不会预填示例资料。</p></div> : <div className="resource-list">{visibleResources.map((resource) => <article key={resource.resource_id} className="resource-item">
              <header><div><p className="file-type">{resource.file_type || '文件'} · {formatSize(resource.size_bytes)}</p><h3>{resource.name}</h3></div><span className={`resource-status status-${resource.status}`}>{resource.status === 'ready' ? '可用' : resource.status === 'preprocessing' ? '处理中' : '处理失败'}</span></header>
              <p>{resource.summary || '尚未生成摘要；原文件保持可下载与可追溯。'}</p>
              {resource.warnings.map((warning) => <p key={warning} className="resource-warning">{warning}</p>)}
              <a href={resource.download_url}>下载原文件</a>
            </article>)}</div>}
          </section>
          <aside className="review-queue" aria-labelledby="review-title">
            <p className="eyebrow">教师把关</p><h2 id="review-title">题目审核队列</h2><p>只有点击“确认入库”后，候选题才会进入组卷可用范围。</p>
            {(resources || []).flatMap((resource) => resource.question_candidates.map((candidate) => ({ resource, candidate }))).length === 0 ? <div className="review-empty">候选题将在材料处理后出现在这里；不会自动写入学生题库。</div> : <div className="candidate-list">{(resources || []).flatMap((resource) => resource.question_candidates.map((candidate) => ({ resource, candidate }))).map(({ resource, candidate }) => <article className="candidate" key={candidate.candidate_id}>
              <p className="candidate-source">来自 {resource.name}</p><h3>{candidate.stem}</h3><p>{candidate.q_type} · {candidate.knowledge_points?.join('、') || '尚未标注知识点'}</p>
              {candidate.review_status === 'approved' ? <span className="approved">已入库</span> : <button type="button" onClick={() => void handleApprove(resource.resource_id, candidate.candidate_id)} disabled={busy}>确认入库</button>}
            </article>)}</div>}
          </aside>
        </div>
        <p className="resource-policy">外部课件、试卷与 B 站视频将仅保存来源链接、署名与版权信息；在来源归属与导入目标明确前，不下载或重新分发第三方内容。</p>
      </main>
    </div>
  )
}
