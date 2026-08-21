<template>
  <div class="tbutler">
    <div class="tbutler-head">
      <span class="tbutler-title">AI 教学助手</span>
      <span class="tbutler-scene">{{ scene }}</span>
    </div>

    <!-- 审计 I-05：后端未提供正式 Butler 教学助手契约时，明确不可用并禁用输入，
         不做假确认/假回复；契约接通后自动恢复。 -->
    <div v-if="availability === 'unavailable'" class="tdr-banner warn">
      教学助手能力尚未接通后端契约，暂不可用。备课、作业、批改等核心工作台不受影响。
    </div>

    <template v-else>
      <div class="tbutler-msgs">
        <div v-for="(m, i) in messages" :key="i" class="tbutler-msg" :class="m.role">
          <span class="tbutler-msg-role">{{ m.role === 'user' ? '我' : '助手' }}</span>
          <pre class="tbutler-msg-text">{{ m.text }}</pre>
        </div>
        <div v-if="status === 'submitting'" class="tbutler-msg assistant">
          <span class="tbutler-msg-role">助手</span>
          <p class="tbutler-msg-text">正在分析…</p>
        </div>
      </div>

      <div class="tbutler-input">
        <textarea
          v-model="text"
          rows="2"
          placeholder="描述需求；Ctrl+Enter 发送"
          aria-label="向 AI 教学助手提问"
          :disabled="availability !== 'available'"
          @keydown.ctrl.enter.prevent="send"
        />
        <div class="tfrm-actions">
          <button
            class="tdr-btn primary"
            type="button"
            :disabled="!text.trim() || status === 'submitting' || availability !== 'available'"
            @click="send"
          >
            发送
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { butlerApi, isButlerChatAvailable } from '@/api/teacher/butler'
import { useButlerScene } from '@/composables/useButlerScene'
import { useArtifactMutation } from '@/composables/useArtifactMutation'

const route = useRoute()
const { submit } = useButlerScene()
const { run } = useArtifactMutation()

const scene = computed(() => String(route.meta.scene || ''))
const text = ref('')
const messages = ref<{ role: 'user' | 'assistant'; text: string }[]>([])
const status = ref<'idle' | 'submitting' | 'degraded' | 'ok'>('idle')
const availability = ref<'probing' | 'available' | 'unavailable'>('probing')

onMounted(async () => {
  availability.value = (await isButlerChatAvailable()) ? 'available' : 'unavailable'
})

async function send() {
  const msg = text.value.trim()
  if (!msg || availability.value !== 'available') return
  messages.value.push({ role: 'user', text: msg })
  text.value = ''
  const input = submit({ userMessage: msg })
  status.value = 'submitting'
  try {
    const res = await run('butler:' + input.clientRequestId, () => butlerApi.chat(input))
    if (res && res.data) {
      status.value = res.data.degraded ? 'degraded' : 'ok'
      messages.value.push({
        role: 'assistant',
        text: res.data.message || (res.data.degraded ? '（降级）本地替代方案已生成，可继续编辑与确认。' : '已生成草案。'),
      })
    } else {
      status.value = 'degraded'
      messages.value.push({ role: 'assistant', text: '本次诉求已记录为草稿。' })
    }
  } catch {
    status.value = 'degraded'
    messages.value.push({ role: 'assistant', text: '请求失败，可稍后重试。' })
  } finally {
    if (status.value === 'submitting') status.value = 'degraded'
  }
}
</script>
