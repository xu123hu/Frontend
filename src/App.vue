<template>
  <!-- 公共页面（登录）直接渲染；student 走 V4Layout；teacher 走 TeacherLayout -->
  <V4Layout v-if="!route.meta.public && !route.meta.teacher" />
  <TeacherLayout v-else-if="route.meta.teacher" />
  <router-view v-else />
  <ToastHost />
  <ConfirmDialog />
  <ImmersiveQuiz />
</template>

<script setup>
import { useRoute } from 'vue-router'
import V4Layout from '@/components/V4Layout.vue'
import TeacherLayout from '@/layouts/TeacherLayout.vue'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImmersiveQuiz from '@/components/ImmersiveQuiz.vue'

const route = useRoute()
</script>