<template>
  <Teleport to="body">
    <div v-if="open" class="tv2-tc-mask" @click="emit('close')" />
    <div v-if="open" class="tv2-taskcenter tv2-fade-up" data-testid="tv2-taskcenter">
      <div class="tv2-tc-head">
        <div class="tv2-tc-head__title">
          <n-icon :size="15"><NotificationsOutline /></n-icon>
          任务进度中心
          <span v-if="store.running" class="tv2-tag tv2-tag--warn">{{ store.running }} 进行中</span>
        </div>
        <button class="tv2-btn tv2-btn--sm" type="button" @click="emit('close')">关闭</button>
      </div>

      <div v-if="!store.items.length" class="tv2-empty" style="padding: 32px 16px">
        <div class="tv2-empty__title">暂无任务</div>
        <div class="tv2-empty__desc">生成课件、导出 PPTX、上传资源摄取都会在这里显示进度。</div>
      </div>

      <div v-for="t in store.items" :key="t.task_id" class="tv2-taskcard">
        <div class="tv2-tc-row">
          <span class="tv2-tag" :class="tagClass(t.status)">{{ statusLabel(t.status) }}</span>
          <span class="tv2-tc-cap">{{ capLabel(t.capability) }}</span>
          <span class="tv2-tc-stage">{{ t.stage }}</span>
          <span class="tv2-tc-time">{{ shortTime(t.created_at) }}</span>
        </div>
        <div class="tv2-progress" style="margin-top: 8px">
          <div class="tv2-progress__bar tv2-progress__bar--ai" :style="{ width: t.progress + '%' }" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { NotificationsOutline } from '@vicons/ionicons5'
import { useTaskCenterStore } from '@/stores/teacherV2Tasks'
import type { TeacherTask } from '@/types/teacher'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const store = useTaskCenterStore()

const capLabels: Record<string, string> = {
  'slides.generate': '课件生成',
  'slides.export': '课件导出',
  'resources.ingest': '资源摄取',
}
const capLabel = (c: string) => capLabels[c] || c
const statusLabel = (s: TeacherTask['status']) => (s === 'succeeded' ? '完成' : s === 'running' ? '进行中' : s === 'queued' ? '排队中' : s === 'failed' ? '失败' : s)
const tagClass = (s: TeacherTask['status']) => (s === 'succeeded' ? 'tv2-tag--ok' : s === 'failed' ? 'tv2-tag--err' : 'tv2-tag--warn')
const shortTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '')
</script>

<style scoped>
.tv2-tc-mask { position: fixed; inset: 0; z-index: 55; }
.tv2-taskcenter { position: fixed; top: 64px; right: 18px; }
.tv2-tc-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px 10px; border-bottom: 1px solid var(--tv2-line2); }
.tv2-tc-head__title { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 700; }
.tv2-tc-row { display: flex; align-items: center; gap: 8px; }
.tv2-tc-cap { font-size: 12.5px; font-weight: 600; color: var(--tv2-ink); }
.tv2-tc-stage { flex: 1; font-size: 12px; color: var(--tv2-ink2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-tc-time { font-size: 11px; color: var(--tv2-ink3); font-family: var(--tv2-font-num); }
</style>
