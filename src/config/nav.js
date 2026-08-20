/** 全局导航配置（所有页面统一引用，禁止私自增删）
 *  左侧轨三段结构：技能（src/config/skills.js）→ 业务功能（本文件）→ 沉浸式入口
 */
export const studentNav = [
  { key: 'tasks', icon: '🎯', title: '教师任务', to: '/student/tasks' },
  { key: 'classes', icon: '👥', title: '我的班级', to: '/student/classes' },
  { key: 'error-book', icon: '📕', title: '错题本', to: '/student/error-book' },
  { key: 'mastery', icon: '📊', title: '学情报告', to: '/student/mastery' },
  { key: 'practice', icon: '✏️', title: '刷题', to: '/student/practice' },
  { key: 'exam', icon: '📄', title: '模拟试卷', to: '/student/exam' },
  { key: 'graph', icon: '🧠', title: '知识图谱', to: '/student/graph' },
  { key: 'memories', icon: '🗂️', title: '记忆管理', to: '/student/memories' },
  { key: 'profile', icon: '⚙️', title: '个人设置', to: '/student/profile' },
]

/** 沉浸式新界面入口（全屏跳转） */
export const studentImmersive = [
  { key: 'classroom', icon: '🎬', title: '双师课堂', to: '/student/classroom' },
]

export const adminNav = [
  { key: 'overview', icon: '📈', title: '总览', to: '/admin/overview' },
  { key: 'model', icon: '🤖', title: '模型配置', to: '/admin/model' },
  { key: 'xingchen', icon: '✨', title: '星辰与工作流', to: '/admin/xingchen' },
  { key: 'cloud-kb', icon: '☁️', title: '云知识库', to: '/admin/cloud-kb' },
  { key: 'kb-bench', icon: '🔍', title: '检索试验台', to: '/admin/kb-bench' },
]
