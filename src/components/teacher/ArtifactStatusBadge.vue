<template>
  <span class="tdr-badge" :class="degraded ? 'degraded' : statusClass">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: string; degraded?: boolean }>()

const LABEL: Record<string, string> = {
  draft: '草稿', confirmed: '已确认', published: '已发布', archived: '已归档',
  accepted: '已接受', overridden: '已覆盖', applied: '已应用',
  queued: '排队中', running: '进行中', succeeded: '成功', failed: '失败', cancelled: '已取消',
  uploading: '上传中', preprocessing: '预处理', ready: '就绪', understand: '理解中',
}
const label = computed(() => (props.degraded ? '降级' : (LABEL[props.status] || props.status)))
const statusClass = computed(() => (props.degraded ? '' : (props.status || '')))
</script>