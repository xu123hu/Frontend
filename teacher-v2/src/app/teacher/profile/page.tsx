'use client'

import { useEffect, useState } from 'react'
import { loadTeacherIdentity, loadTeacherModelConfig, type TeacherIdentity, type TeacherModelConfig } from '../../../features/profile/teacher-profile-api'

function modelLabel(config: TeacherModelConfig | null) {
  const model = config?.secondary?.model || ''
  if (/mimo/i.test(model)) return 'Mimo 测试通道'
  return model ? '备用模型通道' : '尚未配置模型通道'
}

export default function ProfilePage() {
  const [identity, setIdentity] = useState<TeacherIdentity | null>(null)
  const [model, setModel] = useState<TeacherModelConfig | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([loadTeacherIdentity(controller.signal), loadTeacherModelConfig(controller.signal)])
      .then(([currentIdentity, currentModel]) => { setIdentity(currentIdentity); setModel(currentModel) })
      .catch(() => setError('个人资料服务未连通；不会展示模拟教师身份或模型状态。'))
    return () => controller.abort()
  }, [])

  const teacherRole = identity?.roles.find((role) => role.role === 'teacher')
  const modelName = model?.secondary?.model || '未配置'

  return <div className="teacher-shell">
    <aside className="teacher-nav" aria-label="教师工作台导航"><div className="brand"><strong>智学数研</strong><span>高中数学教师端 V2</span></div><nav><ul className="nav-list">
      <li><a href="/teacher/today">今天</a></li><li><a href="/teacher/prep">备课</a></li><li><a href="/teacher/assign">作业与测验</a></li><li><a href="/teacher/grading">批改</a></li><li><a href="/teacher/classroom">课堂</a></li><li><a href="/teacher/classes">班级</a></li><li><a href="/teacher/resources">资源</a></li><li><a aria-current="page" href="/teacher/profile">个人中心</a></li>
    </ul></nav></aside>
    <main className="profile-main">
      <header className="profile-header"><p className="eyebrow">账户与教学管家</p><h1>个人中心</h1><p>身份、角色和模型通道均使用当前登录账户的数据；这里不显示或复制任何 API 密钥。</p></header>
      {error ? <p className="resource-notice" role="status">{error}</p> : <div className="profile-workspace">
        <section className="profile-identity" aria-labelledby="identity-title">
          <div className="profile-avatar" aria-hidden="true">{identity?.nickname?.slice(0, 1) || '—'}</div>
          <div><p className="eyebrow">当前教师</p><h2 id="identity-title">{identity?.nickname || '正在读取身份…'}</h2><p>{teacherRole?.org_name || '未绑定机构'} · {teacherRole?.verified ? '教师身份已验证' : '教师身份待验证'}</p></div>
          <span className="identity-role">{identity?.active_role === 'teacher' ? '教师角色' : identity?.active_role || '读取中'}</span>
        </section>
        <div className="profile-grid">
          <section className="profile-card" aria-labelledby="model-title"><p className="eyebrow">教学管家运行环境</p><h2 id="model-title">{modelLabel(model)}</h2><dl><div><dt>当前备用模型</dt><dd>{modelName}</dd></div><div><dt>配置来源</dt><dd>{model?.secondary?.source === 'user' ? '当前教师账户' : model?.secondary?.source === 'env_default' ? '平台默认配置' : '读取中'}</dd></div></dl><p className="profile-note">教学管家调用和学生端共用此用户模型配置。模型为 Mimo 时，可直接作为教师端测试通道；调用记录仍进入教师工作流审计。</p></section>
          <section className="profile-card" aria-labelledby="access-title"><p className="eyebrow">授权范围</p><h2 id="access-title">教师操作需留痕</h2><ul className="profile-list"><li>备课、出题与资源整理仅生成可审阅草稿。</li><li>发布给学生、批量确认成绩等操作必须再次确认。</li><li>资源候选题必须经教师审核才进入组卷范围。</li></ul></section>
        </div>
      </div>}
    </main>
  </div>
}
