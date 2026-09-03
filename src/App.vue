<template>
  <!-- 引导期（深链 bootstrap 未完成）只渲染中性加载态：不挂任何角色外壳，
       避免学生端外壳闪白、以及角色不符的接口（growth/panel、conversations）被误发 -->
  <div v-if="bootstrapping" class="app-boot" aria-busy="true">正在进入工作台…</div>
  <!-- 公共页面（登录/认证流）直接渲染；student 走 V4Layout；teacher 走 TeacherLayout；admin 走 AdminLayout；research 走 ResearchLayout -->
  <!-- 沉浸式页面（双师课堂 /dual）脱离全局学生壳：自带顶栏/大纲/画布/助教抽屉，不显示今日任务等侧栏 -->
  <router-view v-else-if="route.meta.immersive" />
  <!-- 教师工作台 V3：路由内部自带 TeacherV3Layout，不套旧版 TeacherLayout -->
  <router-view v-else-if="route.meta.teacherV3" />
  <V4Layout v-else-if="!route.meta.public && !route.meta.teacher && !route.meta.admin && !route.meta.research && !route.meta.authFlow" />
  <AdminLayout v-else-if="route.meta.admin" />
  <ResearchLayout v-else-if="route.meta.research" />
  <router-view v-else />
  <ToastHost />
  <ConfirmDialog />
  <ImmersiveQuiz />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import V4Layout from '@/components/V4Layout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ResearchLayout from '@/layouts/ResearchLayout.vue'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImmersiveQuiz from '@/components/ImmersiveQuiz.vue'

const route = useRoute()
const auth = useAuthStore()

// 未登录态走 public 路由不受影响；受保护路由在身份 bootstrap 期间不渲染角色外壳
const bootstrapping = computed(() => !route.meta.public && ['idle', 'bootstrapping'].includes(auth.status))
</script>

<style>
.app-boot { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; letter-spacing: .04em; background: #f8fafc; }
</style>
