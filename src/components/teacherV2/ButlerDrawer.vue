<template>
  <Teleport to="body">
    <transition name="tv2-drawer">
      <div v-if="open" class="tv2-butler" data-testid="tv2-butler">
        <div class="tv2-butler__mask" @click="emit('close')" />
        <aside class="tv2-butler__panel">
          <header class="tv2-butler__head">
            <div class="tv2-butler__head-main">
              <div class="tv2-butler__head-badge"><n-icon :size="17"><Sparkles /></n-icon></div>
              <div>
                <div class="tv2-butler__head-title">AI 教学管家</div>
                <div class="tv2-butler__head-sub">场景感知 · {{ sceneLabel }}</div>
              </div>
            </div>
            <button class="tv2-btn tv2-btn--sm" type="button" @click="emit('close')">收起</button>
          </header>

          <div class="tv2-butler__body" ref="bodyEl">
            <div v-if="!messages.length" class="tv2-butler__welcome">
              <div class="tv2-butler__welcome-icon"><n-icon :size="26"><Sparkles /></n-icon></div>
              <div class="tv2-butler__welcome-title">我是你的教学管家</div>
              <p class="tv2-butler__welcome-desc">我了解你当前所在的页面与班级数据。试试这些：</p>
              <div class="tv2-butler__suggest">
                <button v-for="s in suggestions" :key="s" class="tv2-butler__suggest-item" type="button" @click="send(s)">{{ s }}</button>
              </div>
            </div>

            <div v-for="(m, i) in messages" :key="i" class="tv2-butler__msg" :class="{ 'is-user': m.role === 'user' }">
              <div v-if="m.role === 'assistant'" class="tv2-butler__msg-avatar"><n-icon :size="13"><Sparkles /></n-icon></div>
              <div class="tv2-butler__msg-bubble">
                <div class="tv2-butler__msg-text">{{ m.content }}<span v-if="m.streaming" class="tv2-butler__cursor" /></div>
                <div v-if="m.card" class="tv2-butler__card tv2-fade-up">
                  <div class="tv2-butler__card-title">
                    <n-icon :size="14"><component :is="cardIcon(m.card)" /></n-icon>
                    {{ m.card.title }}
                  </div>
                  <div v-if="m.card.desc" class="tv2-butler__card-desc">{{ m.card.desc }}</div>
                  <button class="tv2-btn tv2-btn--primary tv2-btn--sm" type="button" @click="runCard(m.card)">{{ m.card.route ? '立即前往' : '查看进度' }}</button>
                </div>
              </div>
            </div>
          </div>

          <footer class="tv2-butler__foot">
            <input
              v-model="draft" class="tv2-butler__input" type="text" placeholder="向管家下达指令，如「生成课件」…"
              data-testid="tv2-butler-input"
              @keydown.enter="send(draft)"
            />
            <button class="tv2-btn tv2-btn--ai" type="button" :disabled="!draft.trim() || busy" @click="send(draft)">发送</button>
          </footer>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon } from 'naive-ui'
import { DocumentTextOutline, Sparkles } from '@vicons/ionicons5'
import { v2Api } from '@/api/teacherV2'
import { useTaskCenterStore } from '@/stores/teacherV2Tasks'
import { useToastStore } from '@/stores/toast'

interface ButlerCard { type: string; title: string; desc?: string; route?: string }
interface ButlerMsg { role: 'user' | 'assistant'; content: string; card?: ButlerCard; streaming?: boolean }

const props = defineProps<{ open: boolean; scene: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const router = useRouter()
const taskStore = useTaskCenterStore()
const toast = useToastStore()

const messages = ref<ButlerMsg[]>([])
const draft = ref('')
const busy = ref(false)
const bodyEl = ref<HTMLElement | null>(null)

const sceneLabels: Record<string, string> = {
  'teacher.v2.today': '今日工作台', 'teacher.v2.prep': '备课中心', 'teacher.v2.slides': '课件工坊',
  'teacher.v2.quiz': '组卷中心', 'teacher.v2.assign': '作业与批改', 'teacher.v2.classroom': '课堂互动',
  'teacher.v2.insights': '学情洞察', 'teacher.v2.resources': '资源中心',
}
const sceneLabel = computed(() => sceneLabels[props.scene] || '教师工作台')
const suggestions = ['帮我把定稿教案直接生成课件', '按错因聚类出一组变式卷', '现在有哪些待批改的作业？']

const cardIcon = (card: ButlerCard) => (card.type === 'route' ? DocumentTextOutline : Sparkles)

const scrollToBottom = () => nextTick(() => { if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight })

watch(() => props.open, (v) => { if (v) scrollToBottom() })

function send(text: string) {
  const msg = String(text || '').trim()
  if (!msg || busy.value) return
  draft.value = ''
  messages.value.push({ role: 'user', content: msg })
  messages.value.push({ role: 'assistant', content: '', streaming: true })
  const reply = messages.value[messages.value.length - 1]
  busy.value = true
  scrollToBottom()

  v2Api.butlerChat({ message: msg, scene: props.scene }, (event, data) => {
    if (event === 'token') {
      reply.content += data.text
      scrollToBottom()
    } else if (event === 'card') {
      reply.card = { type: data.type, title: data.title, desc: data.desc, route: data.route }
      if (data.task_id) taskStore.refresh()
      scrollToBottom()
    }
  }).finished.finally(() => {
    reply.streaming = false
    busy.value = false
    scrollToBottom()
  })
}

function runCard(card: ButlerCard) {
  if (card.route) {
    emit('close')
    router.push(card.route)
  } else {
    taskStore.refresh()
    toast.info('已刷新任务进度')
  }
}
</script>

<style scoped>
.tv2-butler { position: fixed; inset: 0; z-index: 120; }
.tv2-butler__mask { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.32); }
.tv2-butler__panel {
  position: absolute; right: 0; top: 0; bottom: 0; width: 420px; max-width: 94vw;
  background: var(--tv2-card); border-left: 1px solid var(--tv2-line);
  box-shadow: var(--tv2-shadow-lg); display: flex; flex-direction: column;
}
.tv2-butler__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--tv2-line2);
  background: linear-gradient(135deg, #f6f2fe, #eef4ff);
}
.tv2-butler__head-main { display: flex; align-items: center; gap: 11px; }
.tv2-butler__head-badge {
  width: 36px; height: 36px; border-radius: 11px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; display: grid; place-items: center;
  box-shadow: var(--tv2-shadow-ai);
}
.tv2-butler__head-title { font-size: 15px; font-weight: 700; }
.tv2-butler__head-sub { font-size: 11.5px; color: var(--tv2-ink3); margin-top: 1px; }

.tv2-butler__body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.tv2-butler__welcome { text-align: center; padding: 30px 10px; }
.tv2-butler__welcome-icon {
  width: 52px; height: 52px; margin: 0 auto 12px; border-radius: 16px;
  background: var(--tv2-ai-soft); color: var(--tv2-ai); display: grid; place-items: center;
}
.tv2-butler__welcome-title { font-size: 15px; font-weight: 700; }
.tv2-butler__welcome-desc { font-size: 12.5px; color: var(--tv2-ink3); margin: 8px 0 14px; }
.tv2-butler__suggest { display: flex; flex-direction: column; gap: 8px; }
.tv2-butler__suggest-item {
  text-align: left; border: 1px solid var(--tv2-ai-border); background: var(--tv2-ai-soft);
  color: var(--tv2-ai-deep); border-radius: 10px; padding: 9px 13px; font-size: 12.5px; cursor: pointer;
  transition: all 0.15s ease;
}
.tv2-butler__suggest-item:hover { background: #ece3fb; }

.tv2-butler__msg { display: flex; gap: 9px; align-items: flex-start; }
.tv2-butler__msg.is-user { justify-content: flex-end; }
.tv2-butler__msg-avatar {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; display: grid; place-items: center;
}
.tv2-butler__msg-bubble { max-width: 82%; }
.tv2-butler__msg.is-user .tv2-butler__msg-bubble .tv2-butler__msg-text {
  background: var(--tv2-primary); color: #fff; border-radius: 12px 12px 3px 12px;
}
.tv2-butler__msg-text {
  background: var(--tv2-bg2); border-radius: 12px 12px 12px 3px; padding: 10px 13px;
  font-size: 13px; line-height: 1.65; white-space: pre-wrap; word-break: break-word;
}
.tv2-butler__cursor {
  display: inline-block; width: 7px; height: 14px; margin-left: 2px; vertical-align: -2px;
  background: var(--tv2-ai); animation: tv2-pulse-dot 1s infinite;
}
.tv2-butler__card {
  margin-top: 9px; border: 1px solid var(--tv2-ai-border); background: #faf8ff;
  border-radius: 11px; padding: 11px 13px;
}
.tv2-butler__card-title { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; color: var(--tv2-ai-deep); }
.tv2-butler__card-desc { font-size: 12px; color: var(--tv2-ink3); margin: 5px 0 10px; }

.tv2-butler__foot { display: flex; gap: 9px; padding: 13px 16px; border-top: 1px solid var(--tv2-line2); }
.tv2-butler__input {
  flex: 1; border: 1px solid var(--tv2-line); border-radius: 10px; padding: 8px 13px;
  font-size: 13px; outline: none; transition: border-color 0.15s;
}
.tv2-butler__input:focus { border-color: var(--tv2-ai); }

.tv2-drawer-enter-active, .tv2-drawer-leave-active { transition: opacity 0.2s ease; }
.tv2-drawer-enter-active .tv2-butler__panel, .tv2-drawer-leave-active .tv2-butler__panel { transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
.tv2-drawer-enter-from, .tv2-drawer-leave-to { opacity: 0; }
.tv2-drawer-enter-from .tv2-butler__panel, .tv2-drawer-leave-to .tv2-butler__panel { transform: translateX(30px); }
</style>
