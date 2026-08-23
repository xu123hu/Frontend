<template>
  <div class="t-assistant" :class="{ open }" role="dialog" aria-label="AI 教学助手">
    <!-- 头部：琥珀渐变 -->
    <div class="t-assistant-head">
      <div class="orb" aria-hidden="true">✦</div>
      <div>
        <b>教学助手</b>
        <span>{{ sceneText }}</span>
      </div>
      <button type="button" aria-label="关闭" @click="$emit('close')">×</button>
    </div>

    <!-- 消息区 -->
    <div class="t-assistant-body" ref="bodyRef">
      <template v-if="availability === 'unavailable'">
        <div class="t-msg ai">
          教学助手能力尚未接通后端契约，暂不可用。备课、作业、批改等核心工作台不受影响。
        </div>
      </template>

      <template v-else>
        <div v-for="(m, i) in messages" :key="i" class="t-msg" :class="m.role">
          {{ m.text }}
        </div>

        <div v-if="status === 'submitting'" class="t-msg ai">正在分析…</div>

        <!-- 建议芯片 -->
        <div v-if="messages.length === 0" class="t-suggest-chips">
          <button class="t-chip" type="button" @click="quickAsk('帮我备 7 班的导数课')">帮我备 7 班的导数课</button>
          <button class="t-chip" type="button" @click="quickAsk('出 20 分钟导数小测')">出 20 分钟导数小测</button>
          <button class="t-chip" type="button" @click="quickAsk('开始批改导数周测')">开始批改导数周测</button>
        </div>
      </template>
    </div>

    <!-- 输入区 -->
    <div class="t-assistant-input">
      <input
        v-model="text"
        type="text"
        placeholder="直接说你想做什么…"
        aria-label="向 AI 教学助手提问"
        :disabled="availability !== 'available'"
        @keydown.enter.prevent="send"
      />
      <button
        type="button"
        aria-label="发送"
        :disabled="!text.trim() || status === 'submitting' || availability !== 'available'"
        @click="send"
      >
        ↑
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { butlerApi, isButlerChatAvailable } from '@/api/teacher/butler'
import { useButlerScene } from '@/composables/useButlerScene'
import { useArtifactMutation } from '@/composables/useArtifactMutation'

const props = defineProps<{
  open: boolean
}>()

defineEmits<{
  (e: 'close'): void
}>()

const route = useRoute()
const { submit } = useButlerScene()
const { run } = useArtifactMutation()

const text = ref('')
const messages = ref<{ role: 'user' | 'ai'; text: string }[]>([])
const status = ref<'idle' | 'submitting' | 'degraded' | 'ok'>('idle')
const availability = ref<'probing' | 'available' | 'unavailable'>('probing')
const bodyRef = ref<HTMLElement | null>(null)

const sceneText = computed(() => {
  const scene = String(route.meta.scene || '')
  if (scene) return scene
  return '我知道你当前的班级、课程和待办，不用重新解释背景'
})

async function checkAvailability() {
  availability.value = (await isButlerChatAvailable()) ? 'available' : 'unavailable'
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })
}

function quickAsk(q: string) {
  text.value = q
  send()
}

async function send() {
  const msg = text.value.trim()
  if (!msg || availability.value !== 'available') return

  messages.value.push({ role: 'user', text: msg })
  text.value = ''
  scrollToBottom()

  const input = submit({ userMessage: msg })
  status.value = 'submitting'

  try {
    const res = await run('butler:' + input.clientRequestId, () => butlerApi.chat(input))
    if (res && res.data) {
      status.value = res.data.degraded ? 'degraded' : 'ok'
      messages.value.push({
        role: 'ai',
        text: res.data.message || (res.data.degraded ? '（降级）本地替代方案已生成，可继续编辑与确认。' : '已生成草案。'),
      })
    } else {
      status.value = 'degraded'
      messages.value.push({ role: 'ai', text: '本次诉求已记录为草稿。' })
    }
  } catch {
    status.value = 'degraded'
    messages.value.push({ role: 'ai', text: '请求失败，可稍后重试。' })
  } finally {
    if (status.value === 'submitting') status.value = 'degraded'
    scrollToBottom()
  }
}

// 面板打开时检查可用性、聚焦输入框
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    checkAvailability()
    nextTick(() => {
      const input = document.querySelector('.t-assistant-input input') as HTMLInputElement
      input?.focus()
    })
  }
})
</script>
