/**
 * 学生端侧边栏导航（vision 完美闭环 · 智学数研）
 * type: 'skill' 点亮挂载对话 | 'route' 跳转页面 | 'unconfigured' 未配置（角标+说明弹层）
 * F 编号来自需求矩阵；技能项与 src/config/skills.js 对齐。
 *
 * 迭代15 B6 收口（方案 L3-2：17 入口 → 核心 5 + 实验室 1，共 ≤6 个可见入口）：
 *  - 核心闭环（常驻）：对话学习 / 练题中心 / 错题本 / 学情报告 / 个人中心
 *  - 实验室（默认折叠）：协同课堂 5 项 + M4+/M6+ 规划能力 7 项，展开后可见
 *
 * 注：原"刷题"和"模拟试卷"路由保留向后兼容（/student/practice / /student/exam），
 * 但已合并入"练题中心"对话内 + 沉浸式两种模式（vision 核心设计）。
 */
export const FEATURE_GROUPS = [
  {
    key: 'core',
    title: '学习闭环',
    items: [
      { key: 'aistar', icon: '💬', name: '对话学习', type: 'route', to: '/student/chat', fcode: 'F1' },
      { key: 'lab', icon: '🎯', name: '练题中心', type: 'route', to: '/student/practice-lab', fcode: 'F2+F5' },
      { key: 'error-book', icon: '📕', name: '错题本', type: 'route', to: '/student/error-book', fcode: 'F4' },
      { key: 'mastery', icon: '📈', name: '学情报告', type: 'route', to: '/student/mastery', fcode: 'F6' },
      { key: 'profile', icon: '👤', name: '个人中心', type: 'route', to: '/student/profile' },
    ],
  },
  {
    key: 'lab-more',
    title: '实验室',
    collapsible: true,
    items: [
      { key: 'classroom', icon: '🎬', name: '双师课堂', type: 'route', to: '/student/classroom', fcode: 'F9' },
      { key: 'classes', icon: '👥', name: '我的班级', type: 'route', to: '/student/classes' },
      { key: 'tasks', icon: '📋', name: '教师任务', type: 'route', to: '/student/tasks', fcode: 'F10' },
      { key: 'graph', icon: '🧠', name: '知识图谱', type: 'route', to: '/student/graph', fcode: 'F7' },
      { key: 'memories', icon: '🗂️', name: '记忆管理', type: 'route', to: '/student/memories' },
      { key: 'voice', icon: '🎙️', name: '语音讲解', type: 'unconfigured', fcode: 'F12', note: '语音讲解与语音输入：讯飞 TTS/ASR 服务未接入，接入后覆盖讲题播报与语音转公式场景。' },
      { key: 'dyn-visual', icon: '📈', name: '可视化讲解', type: 'unconfigured', fcode: 'F13', note: '动态可视化讲解：讲题短片自动生成能力，规划在 M6 阶段交付。' },
      { key: 'derivation', icon: '✅', name: '推导检查', type: 'unconfigured', fcode: 'F14', note: '检查我的推导：验证中台试点中，暂未向学生端开放。' },
      { key: 'replay', icon: '🔁', name: '课堂回溯', type: 'unconfigured', fcode: 'F15', note: '课堂回溯助手：按课堂录像回溯知识点与疑问，M6 阶段规划能力。' },
      { key: 'recommend', icon: '📖', name: '资源推荐', type: 'unconfigured', fcode: 'F16', note: '资源推荐：基于学情推荐学习资源，M6 阶段规划能力。' },
      { key: 'daily-path', icon: '👣', name: '每日任务', type: 'unconfigured', fcode: 'F8', note: '学习路径每日任务：路径规划 worker 属 M4 里程碑，尚未上线。' },
      { key: 'guest', icon: '🧪', name: '游客演示', type: 'unconfigured', fcode: 'F17', note: '游客演示模式：免登录体验账号，M4 里程碑能力，尚未开放。' },
    ],
  },
  // 保留向后兼容的旧入口（路由仍在 /student/practice /student/exam 但不放在侧边栏）
  // 如需恢复可将以下项加入 core 组的 items
  // { key: 'practice', icon: '✏️', name: '刷题(旧)', type: 'route', to: '/student/practice', fcode: 'F5' },
  // { key: 'exam', icon: '📄', name: '模拟试卷(旧)', type: 'route', to: '/student/exam' },
]
