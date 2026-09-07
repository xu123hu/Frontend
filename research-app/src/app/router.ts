import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import ResearchLayout from '@app/layouts/ResearchLayout.vue';
import { useSessionStore } from '@app/stores/session';
import { useSession } from '@features/auth/use-session';

/**
 * 路由表严格对应提示词"六个一级入口" + 登录 + 个人中心 + NotFound。
 * 死路由检查：所有 path 必须有对应 page 文件；反之亦然。
 *
 * F1：/research 子树全部要求已认证（黄金链路一 TC-F01-01）；
 * 未认证访问 → /research/login?redirect=<原路径>；已认证访问 /research/login → 回首页。
 */
const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/research/home',
  },
  {
    path: '/research/login',
    name: 'login',
    component: () => import('@pages/research/Login.vue'),
    meta: { layout: 'standalone', public: true, theme: 'portal' as const },
  },
  {
    path: '/research',
    component: ResearchLayout,
    meta: { requiresAuth: true, theme: 'work' as const },
    children: [
      {
        path: '',
        redirect: { name: 'home' },
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@pages/research/Home.vue'),
        meta: { theme: 'portal' as const },
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@pages/research/Projects.vue'),
      },
      {
        path: 'projects/:id',
        name: 'project',
        component: () => import('@pages/research/ProjectDetail.vue'),
        props: true,
      },
      {
        path: 'literature',
        name: 'literature',
        component: () => import('@pages/research/Literature.vue'),
      },
      {
        path: 'literature/:id/reading',
        name: 'reading',
        component: () => import('@pages/research/Reading.vue'),
        props: true,
      },
      {
        path: 'writing',
        name: 'writing',
        component: () => import('@pages/research/Writing.vue'),
      },
      {
        path: 'writing/:manuscriptId',
        name: 'writing-detail',
        component: () => import('@pages/research/Writing.vue'),
        props: true,
      },
      {
        path: 'review',
        name: 'review',
        component: () => import('@pages/research/Review.vue'),
      },
      {
        path: 'review/:paperId',
        name: 'review-paper',
        component: () => import('@pages/research/Review.vue'),
        props: true,
      },
      {
        path: 'education',
        name: 'education',
        component: () => import('@pages/research/Education.vue'),
      },
      {
        path: 'personal',
        name: 'personal',
        component: () => import('@pages/research/PersonalCenter.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@pages/research/NotFound.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  if (to.meta.public) {
    // 已认证访问登录页 → 回首页（TC-F01-01 反向）
    if (session.isAuthenticated) return { name: 'home' };
    return true;
  }
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (session.status === 'probing') {
      await useSession().probeSession();
    }
    if (!session.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }
  return true;
});

export default router;



