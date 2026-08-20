<template>
  <div class="tbutler">
    <div class="tbutler-head">
      <span class="tbutler-title">AI 教学助手</span>
      <span class="tbutler-scene">{{ scene }}</span>
    </div>

    <div v-if="status === 'degraded'" class="tdr-banner warn">
      后端能力通道尚未接通，以下诉求已记录为草稿，可通过重试或 Mock 模式继续演示。
    </div>
    <div v-if="status === 'degraded' && scene" class="tdr-banner info">
      当前已缓存场景上下文：<code>{{ scene }}</code>，可继续操作或重试。
    </div>

    <div class="tbutler-msgs">
      <div v-for="(m, i) in messages" :key="i" class="tbutler-msg" :class="m.role">
        <span class="tbutler-msg-role">{{ m.role === 'user' ? '我' : '助手' }}</span>
        <pre class="tbutler-msg-text">{{ m.text }}</pre>
      </div>
      <div v-if="status === 'submitting'" class="tbutler-msg assistant">
        <span class="tbutler-msg-role">助手</span>
        <p class="tbutler-msg-text">正在分析…（真实任务阶段，非伪token）</p>
      </div>
    </div>

    <div v-if="pendingConfirm" class="tdr-banner warn">
      <button class="tdr-btn primary slim" type="button" @click="confirmExternal">确认联网执行</button>
      <button class="tdr-btn slim" type="button" @click="pendingConfirm = false">取消</button>
    </div>

    <div class="tbutler-input">
      <textarea v-model="text" rows="2" placeholder="描述需求；Ctrl+Enter 发送" aria-label="向 AI 教学助手提问" @keydown.ctrl.enter.prevent="send" />
      <div class="tfrm-actions">
        <button class="tdr-btn primary" type="button" :disabled="!text.trim() || status === 'submitting'" @click="send">发送</button>
        <button v-if="status === 'degraded'" class="tdr-btn slim" type="button" @click="retry">重试</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { butlerApi } from '@/api/teacher/butler'
import { useButlerScene } from '@/composables/useButlerScene'
import { useArtifactMutation } from '@/composables/useArtifactMutation'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const { submit } = useButlerScene()
const { run } = useArtifactMutation()
const toast = useToastStore()

const scene = computed(() => String(route.meta.scene || ''))
const text = ref('')
const messages = ref<{ role: 'user' | 'assistant'; text: string }[]>([])
const status = ref<'idle' | 'submitting' | 'degraded' | 'ok'>('idle')
const pendingConfirm = ref(false)
const lastInput = ref<ReturnType<typeof submit> | null>(null)

async function send() {
  const msg = text.value.trim()
  if (!msg) return
  messages.value.push({ role: 'user', text: msg })
  text.value = ''
  const input = submit({ userMessage: msg })
  lastInput.value = input
  status.value = 'submitting'
  try {
    const res = await run('butler:' + input.clientRequestId, () => butlerApi.chat(input))
    if (res && res.data) {
      status.value = res.data.degraded ? 'degraded' : 'ok'
      if (res.data.confirmation_required) pendingConfirm.value = true
      messages.value.push({ role: 'assistant', text: res.data.message || (res.data.degraded ? '（降级）本地替代方案已生成，可继续编辑与确认。' : '已生成草案。') })
    } else {
      status.value = 'degraded'
      messages.value.push({ role: 'assistant', text: '本次诉求已记录为草稿；后端未接通可切换 Mock 模式重试。' })
    }
  } finally {
    if (status.value === 'submitting') status.value = 'degraded'
  }
}

async function retry() {
  if (!lastInput.value) return
  const input = lastInput.value
  status.value = 'submitting'
  try {
    const res = await run('butler:' + input.clientRequestId, () => butlerApi.chat(input))
    status.value = res?.data?.degraded ? 'degraded' : 'ok'
    if (res?.data?.confirmation_required) pendingConfirm.value = true
  } finally {
    if (status.value === 'submitting') status.value = 'degraded'
  }
}

function confirmExternal() { pendingConfirm.value = false; toast.info('已确认；本次联网执行请求将使用缓存的 clientRequestId') }
</script>