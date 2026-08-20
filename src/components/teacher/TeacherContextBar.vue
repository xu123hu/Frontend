<template>
  <div class="tcbar" role="region" aria-label="当前教学上下文">
    <span v-if="ctx.className" class="tc-chip">{{ ctx.className }}</span>
    <span v-else class="tc-chip muted">未选择班级</span>
    <span v-if="ctx.courseName" class="tc-chip">{{ ctx.courseName }}</span>
    <span class="tc-chip muted">{{ ctx.date }}</span>
  </div>
</template>

<script setup lang="ts">
import { useTeacherContextStore } from '@/stores/teacher/context'
const ctx = useTeacherContextStore()
</script>