<template>
  <section class="tdr-ws" :aria-label="title">
    <header class="tdr-ws-head">
      <h1></h1>
      <p class="tdr-ws-desc">今日要事：下一节课、待批、截止事项与可行动洞察。</p>
    </header>
    <TeacherEmptyState icon="📆" title="工作台建设中" message="主链将在后续步骤完成。" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TeacherEmptyState from '@/components/teacher/TeacherEmptyState.vue'

const route = useRoute()
const title = computed(() => String(route.meta.title || '工作台'))
</script>