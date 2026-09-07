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
  { path: '/exam/:id', component: () => import('@/pages/student/ExamPaperView.vue'), meta: studentMeta('模拟考试') },
  { path: '/class', component: () => import('@/pages/student/ClassView.vue'), meta: studentMeta('我的班级') },
  { path: '/tasks', component: () => import('@/pages/student/TasksView.vue'), meta: studentMeta('课堂任务') },
  { path: '/tasks/:id', component: () => import('@/pages/student/AssignmentView.vue'), meta: studentMeta('作业作答') },
  { path: '/dual', component: () => import('@/pages/student/DualView.vue'), meta: { ...studentMeta('双师课堂'), immersive: true } },
  { path: '/dual/:sessionId', component: () => import('@/pages/student/DualView.vue'), meta: { ...studentMeta('双师课堂'), immersive: true } },
  { path: '/resource', component: () => import('@/pages/student/ResourceView.vue'), meta: studentMeta('资源推荐') },
  { path: '/profile', component: () => import('@/pages/student/ProfileView.vue'), meta: studentMeta('个人中心') },
]

const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue'), meta: { public: true, authFlow: true } },
  { path: '/register', name: 'register', component: () => import('@/pages/Register.vue'), meta: { public: true, authFlow: true } },
  { path: '/account/password', component: () => import('@/pages/PasswordReset.vue'), meta: { public: true, authFlow: true } },
  { path: '/account/deletion/cancel', component: () => import('@/pages/DeletionCancellation.vue'), meta: { public: true, authFlow: true } },
  { path: '/onboarding/student', component: () => import('@/pages/StudentOnboarding.vue'), meta: { authFlow: true } },
  { path: '/identity/apply', component: () => import('@/pages/RoleApplication.vue'), meta: { authFlow: true } },
  { path: '/identity/pending', component: () => import('@/pages/PendingReview.vue'), meta: { authFlow: true } },
  { path: '/account/security', component: () => import('@/pages/AccountSecurity.vue'), meta: { authFlow: true } },
  { path: '/admin/identity/applications', component: () => import('@/pages/admin/AdminIdentityReview.vue'), meta: { authFlow: true, admin: true, requiresRole: 'admin' } },
  { path: '/research', component: () => import('@/pages/research/ResearchWorkspace.vue'), meta: { authFlow: true, research: true, requiresRole: 'researcher' } },
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

  /* ===== 科研端（research 布局） ===== */
  { path: '/research/dashboard', name: 'research-dashboard',
    component: () => import('@/pages/research/ResearchDashboard.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '研究驾驶舱' } },
  { path: '/research/project', name: 'research-project',
    component: () => import('@/pages/research/ResearchProject.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '项目空间' } },
  { path: '/research/literature', name: 'research-literature',
    component: () => import('@/pages/research/ResearchLiterature.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '文献桌面' } },
  { path: '/research/verify', name: 'research-verify',
    component: () => import('@/pages/research/ResearchVerify.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '数学验证台' } },
  { path: '/research/lean', name: 'research-lean',
    component: () => import('@/pages/research/ResearchLean.vue'),
    meta: { research: true, requiresRole: 'researcher', immersive: true, title: 'Lean4 形式化台' } },
  { path: '/research/writing', name: 'research-writing',
    component: () => import('@/pages/research/ResearchWriting.vue'),
    meta: { research: true, requiresRole: 'researcher', immersive: true, title: '论文写作台' } },
  { path: '/research/review', name: 'research-review',
    component: () => import('@/pages/research/ResearchReview.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '论文初审' } },
  { path: '/research/education', name: 'research-education',
    component: () => import('@/pages/research/ResearchEducation.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '教育研究台' } },
  { path: '/research/runs', name: 'research-runs',
    component: () => import('@/pages/research/ResearchRuns.vue'),
    meta: { research: true, requiresRole: 'researcher', title: '运行中心' } },

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
