<template>
  <div class="ttask" role="status" :aria-label="`任务 ${task?.status || '等待中'}`">
    <ArtifactStatusBadge :status="task?.status || 'queued'" />
    <span v-if="task?.stage" class="ttask-stage">{{ task.stage }}</span>
    <button v-if="canCancel" class="tdr-btn slim" type="button" @click="$emit('cancel')">取消</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TeacherTask } from '@/types/teacher'
import ArtifactStatusBadge from '@/components/teacher/ArtifactStatusBadge.vue'

const props = defineProps<{ task: TeacherTask | null | undefined }>()
defineEmits<{ (e: 'cancel'): void }>()
const canCancel = computed(() => props.task ? (props.task.status === 'queued' || props.task.status === 'running') : false)
</script>