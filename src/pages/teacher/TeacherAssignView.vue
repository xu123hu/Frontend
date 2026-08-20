<template>
  <section class="tdr-ws" :aria-label="title">
    <header class="tdr-ws-head">
      <h1></h1>
      <p class="tdr-ws-desc">智能出题、编辑题集、形成作业草稿并发布。</p>
    </header>
    <TeacherEmptyState icon="📚" title="工作台建设中" message="主链将在后续步骤完成。" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TeacherEmptyState from '@/components/teacher/TeacherEmptyState.vue'

const route = useRoute()
const title = computed(() => String(route.meta.title || '工作台'))
</script>