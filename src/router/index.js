import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const studentMeta = (title) => ({ title, requiresRole: 'student' })
const studentRoutes = [
  { path: '/overview', component: () => import('@/pages/student/OverviewView.vue'), meta: studentMeta('学情总览') },
  { path: '/dialog', component: () => import('@/pages/student/DialogView.vue'), meta: studentMeta('对话学习') },
  { path: '/dialog/:id?', component: () => import('@/pages/student/DialogView.vue'), meta: studentMeta('对话学习') },
  { path: '/practice', component: () => import('@/pages/student/PracticeView.vue'), meta: studentMeta('练题中心') },
  { path: '/errors', component: () => import('@/pages/student/ErrorsView.vue'), meta: studentMeta('错题本') },
  { path: '/report', component: () => import('@/pages/student/ReportView.vue'), meta: studentMeta('学情报告') },
  { path: '/graph', component: () => import('@/pages/student/GraphView.vue'), meta: studentMeta('知识图谱') },
  { path: '/exam', component: () => import('@/pages/student/ExamView.vue'), meta: studentMeta('模拟考试') },
  { path: '/class', component: () => import('@/pages/student/ClassView.vue'), meta: studentMeta('我的班级') },
  { path: '/tasks', component: () => import('@/pages/student/TasksView.vue'), meta: studentMeta('课堂任务') },
  { path: '/tasks/:id', component: () => import('@/pages/student/AssignmentView.vue'), meta: studentMeta('作业作答') },
  { path: '/dual', component: () => import('@/pages/student/DualView.vue'), meta: studentMeta('双师课堂') },
  { path: '/resource', component: () => import('@/pages/student/ResourceView.vue'), meta: studentMeta('资源推荐') },
  { path: '/profile', component: () => import('@/pages/student/ProfileView.vue'), meta: studentMeta('个人中心') },
]

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { public: true, authFlow: true } },
  { path: '/register', name: 'register', component: () => import('@/pages/Register.vue'), meta: { public: true, authFlow: true } },
  { path: '/onboarding/student', component: () => import('@/pages/StudentOnboarding.vue'), meta: { authFlow: true } },
  { path: '/identity/apply', component: () => import('@/pages/RoleApplication.vue'), meta: { authFlow: true } },
  { path: '/identity/pending', component: () => import('@/pages/PendingReview.vue'), meta: { authFlow: true } },
  { path: '/account/security', component: () => import('@/pages/AccountSecurity.vue'), meta: { authFlow: true } },
  { path: '/admin/identity/applications', component: () => import('@/pages/admin/AdminIdentityReview.vue'), meta: { authFlow: true, admin: true, requiresRole: 'admin' } },
  { path: '/research', component: () => import('@/pages/research/ResearchWorkspace.vue'), meta: { authFlow: true, research: true, requiresRole: 'researcher' } },
  { path: '/', component: { template: '<div />' } },
  ...studentRoutes,
  { path: '/teacher/today', name: 'teacher-today', component: () => import('@/pages/teacher/TeacherTodayView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.today', title: '今天' } },
  { path: '/teacher/prep', name: 'teacher-prep', component: () => import('@/pages/teacher/TeacherPrepView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.prep', title: '备课' } },
  { path: '/teacher/assign', name: 'teacher-assign', component: () => import('@/pages/teacher/TeacherAssignView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.assessment', title: '布置作业' } },
  { path: '/teacher/grading', name: 'teacher-grading', component: () => import('@/pages/teacher/TeacherGradingView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.grading', title: '批改' } },
  { path: '/teacher/classroom', name: 'teacher-classroom', component: () => import('@/pages/teacher/TeacherClassroomView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.classroom', title: '课堂' } },
  { path: '/teacher/classes', name: 'teacher-classes', component: () => import('@/pages/teacher/TeacherClassesView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.class.insights', title: '班级' } },
  { path: '/teacher/resources', name: 'teacher-resources', component: () => import('@/pages/teacher/TeacherResourcesView.vue'), meta: { teacher: true, requiresRole: 'teacher', scene: 'teacher.resources', title: '资源' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function roleHome(role) {
  return role === 'teacher' ? '/teacher/today' : role === 'researcher' ? '/research' : role === 'admin' ? '/admin/identity/applications' : '/overview'
}

export function resolveAuthNavigation(to, auth) {
  if (to.meta.public) return true
  if (auth.status === 'anonymous') return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  if (auth.status === 'onboarding' && to.path !== '/onboarding/student') return { path: '/onboarding/student' }
  if (auth.status === 'pending_review' && !['/identity/pending', '/identity/apply'].includes(to.path)) return { path: '/identity/pending' }
  if (auth.status === 'deletion_pending' && to.path !== '/account/security') return { path: '/account/security' }
  if (to.path === '/') return { path: roleHome(auth.activeRole) }
  if (to.meta.requiresRole && (auth.activeRole !== to.meta.requiresRole || !auth.roles.includes(to.meta.requiresRole))) return { path: roleHome(auth.activeRole) }
  return true
}

export const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!to.meta.public && auth.status === 'idle') await auth.bootstrap()
  return resolveAuthNavigation(to, auth)
})
