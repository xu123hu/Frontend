import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import ResearchLayout from '@app/layouts/ResearchLayout.vue';

/**
 * 路由表严格对应提示词"六个一级入口" + 登录 + 个人中心 + NotFound。
 * 死路由检查：所有 path 必须有对应 page 文件；反之亦然。
 *
 * F0 阶段：所有页面都是占位。
 * F1 阶段：M0 契约冻结后接入守卫（鉴权、租户隔离、project_id 归属检查）。
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
    meta: { layout: 'standalone' },
  },
  {
    path: '/research',
    component: ResearchLayout,
    children: [
      {
        path: '',
        redirect: { name: 'home' },
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('@pages/research/Home.vue'),
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@pages/research/Projects.vue'),
      },
      {
        path: 'projects/:id',
        name: 'project',
        component: () => import('@pages/research/Projects.vue'),
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
        component: () => import('@pages/research/Literature.vue'),
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

export default router;
