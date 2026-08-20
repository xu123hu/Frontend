import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { public: true } },
  { path: '/', redirect: () => {
    try {
      const u = JSON.parse(localStorage.getItem('ma_user') || 'null')
      const active = u?.active_role || (u?.roles?.length === 1 ? u.roles[0].role : null)
      return active === 'teacher' ? '/teacher/today' : '/overview'
    } catch { return '/overview' }
  } },

  /* ===== v4 学生页面（全部保留） ===== */
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

  /* ===== M3 教师端：固定 7 个工作台（唯一 teacher 布局） ===== */
  { path: '/teacher/today', name: 'teacher-today', component: () => import('@/pages/teacher/TeacherTodayView.vue'), meta: { teacher: true, scene: 'teacher.today', title: '今天' } },
  { path: '/teacher/prep', name: 'teacher-prep', component: () => import('@/pages/teacher/TeacherPrepView.vue'), meta: { teacher: true, scene: 'teacher.prep', title: '备课' } },
  { path: '/teacher/assign', name: 'teacher-assign', component: () => import('@/pages/teacher/TeacherAssignView.vue'), meta: { teacher: true, scene: 'teacher.assessment', title: '布置作业' } },
  { path: '/teacher/grading', name: 'teacher-grading', component: () => import('@/pages/teacher/TeacherGradingView.vue'), meta: { teacher: true, scene: 'teacher.grading', title: '批改' } },
  { path: '/teacher/classroom', name: 'teacher-classroom', component: () => import('@/pages/teacher/TeacherClassroomView.vue'), meta: { teacher: true, scene: 'teacher.classroom', title: '课堂' } },
  { path: '/teacher/classes', name: 'teacher-classes', component: () => import('@/pages/teacher/TeacherClassesView.vue'), meta: { teacher: true, scene: 'teacher.class.insights', title: '班级' } },
  { path: '/teacher/resources', name: 'teacher-resources', component: () => import('@/pages/teacher/TeacherResourcesView.vue'), meta: { teacher: true, scene: 'teacher.resources', title: '资源' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  if (!getToken()) return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }

  const auth = useAuthStore()
  // 角色感知根入口：teacher → /teacher/today，否则 → /overview
  if (to.path === '/') {
    return auth.activeRole === 'teacher' ? { path: '/teacher/today' } : { path: '/overview' }
  }
  // 非 teacher 访问教师工作台 → 回到其合法首页
  if (to.meta.teacher && auth.activeRole !== 'teacher') {
    return { path: '/overview' }
  }
  return true
})