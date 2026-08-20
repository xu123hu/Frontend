<template>
  <div class="tbutler">
    <div class="tbutler-head">
      <span class="tbutler-title">AI 教学助手</span>
      <span class="tbutler-scene muted">{{ sceneLabel }}</span>
    </div>
    <div class="tbutler-body">
      <p class="tbutler-hint">在这里向我描述需求（改编教案、生成巩固题、分析学情等）。</p>
    </div>
    <form class="tbutler-input" @submit.prevent="submit">
      <textarea v-model="text" rows="2" placeholder="如：把这份教案压缩到 40 分钟…" aria-label="向 AI 助手提问" />
      <button class="tdr-btn primary" type="submit" :disabled="!text.trim()">发送</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const toast = useToastStore()
const text = ref('')
const sceneLabel = computed(() => String(route.meta.scene || ''))

function submit() {
  const msg = text.value.trim()
  if (!msg) return
  toast.info('已提交诉求，等待后端能力反馈（Adapter 未接入时请使用 Mock 模式演示）')
  text.value = ''
}
</script>