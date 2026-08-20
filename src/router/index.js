import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api/client'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { public: true } },
  // 默认进入学情总览（v4 首页）
  { path: '/', redirect: '/overview' },

  /* ===== v4 页面（全部对齐 v4 愿景视觉） ===== */
  { path: '/overview', component: () => import('@/pages/student/OverviewView.vue'), meta: { title: '学情总览' } },
  { path: '/dialog', component: () => import('@/pages/student/DialogView.vue'), meta: { title: '对话学习' } },
  { path: '/dialog/:id?', component: () => import('@/pages/student/DialogView.vue'), meta: { title: '对话学习' } },
  { path: '/practice', component: () => import('@/pages/student/PracticeView.vue'), meta: { title: '练题中心' } },
  { path: '/errors', component: () => import('@/pages/student/ErrorsView.vue'), meta: { title: '错题本' } },
  { path: '/report', component: () => import('@/pages/student/ReportView.vue'), meta: { title: '学情报告' } },
  { path: '/graph', component: () => import('@/pages/student/GraphView.vue'), meta: { title: '知识图谱' } },
  { path: '/exam', component: () => import('@/pages/student/ExamView.vue'), meta: { title: '模拟考试' } },
  { path: '/class', component: () => import('@/pages/student/ClassView.vue'), meta: { title: '我的班级' } },
  { path: '/tasks', component: () => import('@/pages/student/TasksView.vue'), meta: { title: '课堂任务' } },
  { path: '/dual', component: () => import('@/pages/student/DualView.vue'), meta: { title: '双师课堂' } },
  { path: '/resource', component: () => import('@/pages/student/ResourceView.vue'), meta: { title: '资源推荐' } },
  { path: '/profile', component: () => import('@/pages/student/ProfileView.vue'), meta: { title: '个人中心' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  return true
})
