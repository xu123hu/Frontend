import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const studentMeta = (title) => ({ title, requiresRole: 'student' })
const studentRoutes = [
  // ===== 第二轮布局重构：6 大入口 + 旧地址全量重定向（V2 文档 §6 强制） =====
  { path: '/dialog', component: () => import('@/pages/student/DialogView.vue'), meta: studentMeta('首页 · 对话学习') },
  { path: '/dialog/:id?', component: () => import('@/pages/student/DialogView.vue'), meta: studentMeta('首页 · 对话学习') },
  { path: '/practice', component: () => import('@/pages/student/PracticeView.vue'), meta: studentMeta('练题') },
  { path: '/errors', component: () => import('@/pages/student/ErrorsView.vue'), meta: studentMeta('错题') },
  { path: '/library', component: () => import('@/pages/student/LibraryHomeView.vue'), meta: studentMeta('知识库') },
  { path: '/classroom', component: () => import('@/pages/student/ClassroomHomeView.vue'), meta: studentMeta('课堂') },
  { path: '/me', component: () => import('@/pages/student/MeView.vue'), meta: studentMeta('我的') },
  { path: '/exam/:id', component: () => import('@/pages/student/ExamPaperView.vue'), meta: studentMeta('模考作答') },
  { path: '/tasks/:id', component: () => import('@/pages/student/AssignmentView.vue'), meta: studentMeta('作业作答') },
  { path: '/dual', component: () => import('@/pages/student/DualView.vue'), meta: { ...studentMeta('双师课堂'), immersive: true } },
  { path: '/dual/:sessionId', component: () => import('@/pages/student/DualView.vue'), meta: { ...studentMeta('双师课堂'), immersive: true } },
  // 旧地址重定向（兼容历史深链与已发出的通知/作业路由）
  { path: '/overview', redirect: '/me?tab=report' },
  { path: '/report', redirect: '/me?tab=report' },
  { path: '/graph', redirect: '/me?tab=graph' },
  { path: '/profile', redirect: '/me?tab=profile' },
  { path: '/exam', redirect: '/practice?tab=exam' },
  { path: '/resource', redirect: '/library?tab=resources' },
  { path: '/kb', redirect: '/library?tab=materials' },
  { path: '/class', redirect: '/classroom?tab=class' },
  { path: '/tasks', redirect: '/classroom?tab=tasks' },
]

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { public: true, authFlow: true } },
  { path: '/register', name: 'register', component: () => import('@/pages/Register.vue'), meta: { public: true, authFlow: true } },
  { path: '/account/password', component: () => import('@/pages/PasswordReset.vue'), meta: { public: true, authFlow: true } },
  { path: '/account/deletion/cancel', component: () => import('@/pages/DeletionCancellation.vue'), meta: { public: true, authFlow: true } },
  { path: '/onboarding/student', component: () => import('@/pages/StudentOnboarding.vue'), meta: { authFlow: true } },
  { path: '/identity/apply', component: () => import('@/pages/RoleApplication.vue'), meta: { authFlow: true } },
  { path: '/identity/pending', component: () => import('@/pages/PendingReview.vue'), meta: { authFlow: true } },
  // 统一工作入口（三端汇聚；科研端为平台内应用）
  { path: '/hub', name: 'hub', component: () => import('@/pages/HubView.vue'), meta: { authFlow: true, title: '统一工作入口' } },
  { path: '/hub/research', name: 'hub-research', component: () => import('@/pages/research/ResearchRedirect.vue'), meta: { authFlow: true, title: '科研端入口' } },
  { path: '/account/security', component: () => import('@/pages/AccountSecurity.vue'), meta: { authFlow: true } },
  { path: '/admin/identity/applications', component: () => import('@/pages/admin/AdminIdentityReview.vue'), meta: { authFlow: true, admin: true, requiresRole: 'admin' } },
  /* ===== 科研端（论文阅读与写作平台，并入统一前端） ===== */
  { path: '/research', name: 'research', component: () => import('@/pages/research/ResearchHomeView.vue'), meta: { research: true, requiresRole: 'researcher', title: '科研端' } },
  { path: '/research/library', name: 'research-library', component: () => import('@/pages/research/ResearchLibraryView.vue'), meta: { research: true, requiresRole: 'researcher', title: '文献库' } },
  { path: '/research/import', name: 'research-import', component: () => import('@/pages/research/ResearchImportView.vue'), meta: { research: true, requiresRole: 'researcher', title: '收录论文' } },
  { path: '/research/reader/:paperId', name: 'research-reader', component: () => import('@/pages/research/ResearchReaderView.vue'), meta: { research: true, requiresRole: 'researcher', title: '阅读器' } },
  { path: '/research/writing', name: 'research-writing', component: () => import('@/pages/research/ResearchWritingView.vue'), meta: { research: true, requiresRole: 'researcher', title: '写作' } },
  { path: '/research/writing/:manuscriptId', name: 'research-writing-id', component: () => import('@/pages/research/ResearchWritingView.vue'), meta: { research: true, requiresRole: 'researcher', title: '写作' } },
  { path: '/research/tasks', name: 'research-tasks', component: () => import('@/pages/research/ResearchTasksView.vue'), meta: { research: true, requiresRole: 'researcher', title: '任务中心' } },
  { path: '/', redirect: '/dialog' },  // S1：首页即对话学习（V2 文档原则一）
  ...studentRoutes,
  /* ===== 教师工作台 V3（V2.1 SPEC 落地：数学编辑内核 + 五区编辑器 + 拍照链路 + 批改三视图） ===== */
  {
    path: '/teacher-v3',
    component: () => import('@/layouts/TeacherV3Layout.vue'),
    children: [
      { path: 'today', name: 'tv3-today', component: () => import('@/pages/teacher-v3/TodayView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.today', title: '今日工作台' } },
      { path: 'prep', name: 'tv3-prep', component: () => import('@/pages/teacher-v3/prep/PrepCenterView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.prep', title: '备课中心' } },
      { path: 'prep-templates', name: 'tv3-prep-templates', component: () => import('@/pages/teacher-v3/prep/PrepTemplatesView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.prep.templates', title: '教案模板库' } },
            { path: 'slides', name: 'tv3-slides', component: () => import('@/pages/teacher-v3/SlidesView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.slides', title: '课件工坊' } },
      { path: 'bank', name: 'tv3-bank', component: () => import('@/pages/teacher-v3/BankView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.bank', title: '题库' } },
      { path: 'quiz', name: 'tv3-quiz', component: () => import('@/pages/teacher-v3/QuizView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.quiz', title: '组卷中心' } },
      { path: 'assign', name: 'tv3-assign', component: () => import('@/pages/teacher-v3/AssignView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.assign', title: '作业与批改' } },
      { path: 'classroom', name: 'tv3-classroom', component: () => import('@/pages/teacher-v3/ClassroomView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.classroom', title: '课堂互动' } },
      { path: 'insights', name: 'tv3-insights', component: () => import('@/pages/teacher-v3/InsightsView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.insights', title: '学情洞察' } },
      { path: 'resources', name: 'tv3-resources', component: () => import('@/pages/teacher-v3/ResourcesView.vue'), meta: { teacher: true, teacherV3: true, requiresRole: 'teacher', scene: 'teacher.v3.resources', title: '资源中心' } },
    ],
  },
  /* 40301 role_denied 统一提示页（A0 M1-2）：不带 teacherV3/teacher meta，避免破坏路由契约测试 */
  { path: '/teacher-v3/denied', name: 'tv3-denied', component: () => import('@/pages/teacher-v3/AccessDeniedPage.vue'), meta: { title: '无教师权限' } },
  /* 学生课堂 H5（M2-A · 课堂域唯一新增页，02-ARCHITECTURE §12）：无账号 join_code 进入 */
  { path: '/classroom-h5', name: 'classroom-h5', component: () => import('@/pages/classroom/StudentH5.vue'), meta: { public: true, title: '课堂互动 · 学生端' } },

  /* ===== 管理后台（唯一 admin 布局） ===== */
  { path: '/admin/overview', name: 'admin-overview', component: () => import('@/pages/admin/AdminOverviewView.vue'), meta: { admin: true, requiresRole: 'admin', title: '总览' } },
  { path: '/admin/model', name: 'admin-model', component: () => import('@/pages/admin/AdminModelView.vue'), meta: { admin: true, requiresRole: 'admin', title: '模型配置' } },
  { path: '/admin/xingchen', name: 'admin-xingchen', component: () => import('@/pages/admin/AdminXingchenView.vue'), meta: { admin: true, requiresRole: 'admin', title: '星辰与工作流' } },
  { path: '/admin/cloud-kb', name: 'admin-cloud-kb', component: () => import('@/pages/admin/AdminCloudKbView.vue'), meta: { admin: true, requiresRole: 'admin', title: '云知识库' } },
  { path: '/admin/kb-bench', name: 'admin-kb-bench', component: () => import('@/pages/admin/AdminKbBenchView.vue'), meta: { admin: true, requiresRole: 'admin', title: '检索试验台' } },
  { path: '/admin/butler', name: 'admin-butler', component: () => import('@/pages/admin/AdminButlerView.vue'), meta: { admin: true, requiresRole: 'admin', title: 'Butler 授权' } },

  /* ===== 科研端（旧占位/假数据页面收敛：真实科研端为独立应用 :5173，统一经 /hub/research 入口） ===== */
  { path: '/research/dashboard', name: 'research-dashboard', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/project', name: 'research-project', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/literature', name: 'research-literature', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/verify', name: 'research-verify', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/lean', name: 'research-lean', redirect: '/research', meta: { research: true, requiresRole: 'researcher', immersive: true, title: '科研端入口' } },
  { path: '/research/writing', name: 'research-writing', redirect: '/research', meta: { research: true, requiresRole: 'researcher', immersive: true, title: '科研端入口' } },
  { path: '/research/review', name: 'research-review', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/education', name: 'research-education', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },
  { path: '/research/runs', name: 'research-runs', redirect: '/research', meta: { research: true, requiresRole: 'researcher', title: '科研端入口' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export function roleHome(role) {
  return role === 'teacher' ? '/teacher-v3/today' : role === 'researcher' ? '/research' : role === 'admin' ? '/admin/identity/applications' : '/overview'
}

export function resolveAuthNavigation(to, auth) {
  if (to.meta.public) return true
  if (auth.status === 'anonymous') return { path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} }
  if (auth.status === 'onboarding' && to.path !== '/onboarding/student') return { path: '/onboarding/student' }
  if (['pending_review', 'needs_more_info', 'rejected'].includes(auth.status) && !['/identity/pending', '/identity/apply'].includes(to.path)) return { path: '/identity/pending' }
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
