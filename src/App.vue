<template>
  <!-- 公共页面（登录）直接渲染；其余页面包在 v4 三栏布局内 -->
  <V4Layout v-if="!route.meta.public" />
  <router-view v-else />
  <ToastHost />
  <ConfirmDialog />
  <ImmersiveQuiz />
</template>

<script setup>
import { useRoute } from 'vue-router'
import V4Layout from '@/components/V4Layout.vue'
import ToastHost from '@/components/ToastHost.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImmersiveQuiz from '@/components/ImmersiveQuiz.vue'

const route = useRoute()
</script>
