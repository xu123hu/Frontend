<template>
  <!-- 公共页面（登录/认证流）直接渲染；student 走 V4Layout；teacher 走 TeacherLayout；admin 走 AdminLayout；research 走 ResearchLayout -->
  <V4Layout v-if="!route.meta.public && !route.meta.teacher && !route.meta.admin && !route.meta.research && !route.meta.authFlow" />
  <TeacherLayout v-else-if="route.meta.teacher" />
  <AdminLayout v-else-if="route.meta.admin" />
  <ResearchLayout v-else-if="route.meta.research" />
  <router-view v-else />
  <ToastHost />
  <ConfirmDialog />
  <ImmersiveQuiz />
</template>

<script setup>
import { useRoute } from 'vue-router'
import V4Layout from '@/components/V4Layout.vue'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import ResearchLayout from '@/layouts/ResearchLayout.vue'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImmersiveQuiz from '@/components/ImmersiveQuiz.vue'

const route = useRoute()
</script>
