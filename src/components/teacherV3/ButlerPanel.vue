<template>
  <transition name="tv3-butler-slide">
    <aside v-if="open" class="tv3-butler" role="dialog" aria-label="AI 管家" data-testid="tv3-butler-panel">
      <!-- 头部 -->
      <header class="tv3-butler__head">
        <div class="tv3-butler__orb">✦</div>
        <div class="tv3-butler__head-txt">
          <b>AI 管家</b>
          <span>对话 · 搜索 · 语音公式 · 应用内操作</span>
        </div>
        <button class="tv3-butler__close" type="button" aria-label="收起" data-testid="tv3-butler-close" @click="$emit('close')">─</button>
      </header>

      <!-- 上下文条：自动附加当前页面上下文（Copilot 式），教师可展开查看 -->
      <button class="tv3-butler__ctx" type="button" data-testid="tv3-butler-ctx" @click="ctxOpen = !ctxOpen">
        <span class="tv3-butler__ctx-dot" />
        <span>正在跟随：{{ ctxLabel }}</span>
        <span class="tv3-butler__ctx-arrow" :class="{ open: ctxOpen }">▾</span>
      </button>
      <div v-if="ctxOpen" class="tv3-butler__ctx-detail">
        <div>页面：{{ ctxLabel }}</div>
        <div v-if="context.deck_id">课件：{{ context.deck_id }}</div>
        <div v-if="context.selection">选中：{{ context.selection.summary }}</div>
        <div class="tv3-butler__ctx-note">以上信息随每条消息自动发送给管家，用于结合当前页面作答</div>
      </div>

      <!-- 对话流 -->
      <div ref="flowRef" class="tv3-butler__flow">
        <div v-if="!messages.length" class="tv3-butler__empty">
          <div class="tv3-butler__empty-title">您好，李老师</div>
          <div>可以直接吩咐我做：</div>
          <div class="tv3-butler__chips">
            <button v-for="q in quickAsks" :key="q" class="tv3-butler__chip" type="button" @click="ask(q)">{{ q }}</button>
          </div>
        </div>

        <template v-for="m in messages" :key="m.id">
          <div class="tv3-butler__msg" :class="m.role" :data-testid="`tv3-butler-msg-${m.role}`">
            <template v-if="m.role === 'butler'">
              <div v-if="m.thinking" class="tv3-butler__thinking">{{ m.thinking }}</div>
              <div v-if="m.text" class="tv3-butler__bubble" v-html="renderRich(m.text)" />
              <div v-for="line in m.toolLines" :key="line" class="tv3-butler__toolline" :data-testid="'tv3-butler-toolline'">{{ line }}</div>
              <span v-if="m.pending" class="tv3-butler__caret" />

              <!-- 公式卡片：可拖拽进画布 / 点开编辑 / 插入本页 -->
              <div
                v-for="c in formulaCards(m)" :key="c.id"
                class="tv3-butler__card tv3-butler__card--formula"
                draggable="true"
                :data-testid="'tv3-butler-card-formula'"
                :title="'按住拖到课件画布即可插入；插入后仍可编辑'"
                @dragstart="onFormulaDrag($event, c)"
              >
                <div class="tv3-butler__formula" v-html="renderLatex(c.latex, true)" />
                <div class="tv3-butler__card-meta">
                  <span class="tv3-butler__conf" :class="{ low: c.confidence < 0.8 }">置信 {{ Math.round(c.confidence * 100) }}%</span>
                  <span v-if="c.source === 'voice'" class="tv3-butler__src">🎤 语音</span>
                  <span v-else-if="c.source === 'photo'" class="tv3-butler__src">📷 识别</span>
                  <span class="tv3-butler__spacer" />
                  <button class="tv3-butler__mini" type="button" title="插入当前课件页" @click="insertFormula(c)">插入本页</button>
                </div>
                <div v-if="c.alternatives?.length" class="tv3-butler__alts">备选：{{ c.alternatives.join('　') }}</div>
              </div>

              <!-- 动作卡：写操作必须教师点执行（红线：AI 不直接落库） -->
              <div v-for="c in actionCards(m)" :key="c.id" class="tv3-butler__card tv3-butler__card--action" data-testid="tv3-butler-card-action">
                <div class="tv3-butler__card-title">⚙ {{ c.title }}</div>
                <div class="tv3-butler__card-body">{{ c.summary }}</div>
                <div class="tv3-butler__card-meta">
                  <span class="tv3-butler__warn">执行前请核对，结果可再编辑</span>
                  <span class="tv3-butler__spacer" />
                  <template v-if="c.status === 'pending'">
                    <button class="tv3-butler__mini" type="button" @click="cancelAction(m, c)">取消</button>
                    <button class="tv3-butler__mini tv3-butler__mini--go" type="button" data-testid="tv3-butler-action-confirm" @click="execAction(m, c)">执行</button>
                  </template>
                  <span v-else-if="c.status === 'executed'" class="tv3-butler__ok">✓ 已执行</span>
                  <span v-else class="tv3-butler__dim">已取消</span>
                </div>
              </div>

              <!-- 链接卡：跳转入口留底 -->
              <button
                v-for="c in linkCards(m)" :key="c.id"
                class="tv3-butler__card tv3-butler__card--link" type="button"
                data-testid="tv3-butler-card-link"
                @click="goLink(c)"
              >
                <div class="tv3-butler__card-title">→ {{ c.title }}</div>
                <div class="tv3-butler__card-body" v-if="c.note">{{ c.note }}</div>
              </button>

              <!-- 搜索引用 -->
              <div v-if="m.citations?.length" class="tv3-butler__cites" data-testid="tv3-butler-citations">
                <span v-for="s in m.citations" :key="s.index" class="tv3-butler__cite" :title="s.snippet">[{{ s.index }}] {{ s.title }}</span>
              </div>
            </template>
            <template v-else>
              <div class="tv3-butler__bubble" v-text="m.text" />
              <div v-if="m.images?.length" class="tv3-butler__thumbs">
                <img v-for="(img, i) in m.images" :key="i" :src="img" alt="附件" class="tv3-butler__thumb" />
              </div>
            </template>
          </div>
        </template>

        <!-- 语音公式实时转写（教师能看见 AI 听到了什么） -->
        <div v-if="asrLive" class="tv3-butler__asr" data-testid="tv3-butler-asr">🎤 {{ asrLive }}<span class="tv3-butler__caret" /></div>
      </div>

      <!-- 输入区 -->
      <footer class="tv3-butler__input">
        <div v-if="voiceMode" class="tv3-butler__voice-box" data-testid="tv3-butler-voice-box">
          <div class="tv3-butler__voice-hint">P0 原型：输入“说”的公式文本模拟语音（P1 接真实麦克风）</div>
          <input
            v-model="voiceText"
            class="tv3-butler__voice-input"
            placeholder="例如：负b加减根号下b平方减4ac，除以2a"
            data-testid="tv3-butler-voice-input"
            @keydown.enter.prevent="sendVoice"
          />
          <div class="tv3-butler__voice-ops">
            <button class="tv3-butler__mini tv3-butler__mini--go" type="button" data-testid="tv3-butler-voice-send" @click="sendVoice">🎤 转公式</button>
            <button class="tv3-butler__mini" type="button" @click="voiceMode = false">收起</button>
          </div>
        </div>

        <div v-if="images.length" class="tv3-butler__attach">
          <img v-for="(img, i) in images" :key="i" :src="img" alt="" class="tv3-butler__thumb" />
          <button class="tv3-butler__mini" type="button" @click="images = []">清空</button>
        </div>

        <div class="tv3-butler__row">
          <textarea
            v-model="input"
            class="tv3-butler__ta"
            rows="2"
            placeholder="问我数学、让我做课件、或拖入题目照片说“存入题库”…"
            data-testid="tv3-butler-input"
            @keydown.enter.exact.prevent="send"
          />
        </div>
        <div class="tv3-butler__ops">
          <button class="tv3-butler__op" type="button" :class="{ on: webSearch }" title="联网搜索" data-testid="tv3-butler-web" @click="webSearch = !webSearch">🌐 联网</button>
          <button class="tv3-butler__op" type="button" :class="{ on: kbSearch }" title="个人知识库检索" @click="kbSearch = !kbSearch">📚 知识库</button>
          <span class="tv3-butler__spacer" />
          <button class="tv3-butler__op" type="button" title="语音公式" data-testid="tv3-butler-mic" @click="voiceMode = !voiceMode">🎤</button>
          <button class="tv3-butler__op" type="button" title="上传图片" @click="fileRef?.click()">📎</button>
          <button
            class="tv3-butler__send" type="button" :disabled="streaming || !input.trim()"
            data-testid="tv3-butler-send" @click="send"
          >{{ streaming ? '…' : '发送' }}</button>
        </div>
        <input ref="fileRef" type="file" accept="image/*" multiple hidden @change="onFiles" />
      </footer>
    </aside>
  </transition>
</template>

<script setup lang="ts">
/**
 * ButlerPanel —— AI 管家侧边栏（V3 教师端 chat-to-action）
 * 三区：上下文条（自动附加页面上下文）/ 对话流（气泡+四类卡片）/ 输入区（文本·语音·图片·开关）。
 * 红线落实：识别与生成结果只出卡片（可拖入画布、teacher_confirmed=false）；
 *          写操作（入库等）只出确认卡，教师点「执行」才调后端；跳转走前端 Action Registry。
 * 卡片拖拽：公式卡双通道（mx/latex 复用画布既有 drop；x-v3-element 通用元素通道）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { v3Api } from '@/api/teacherV3'
import { renderLatex, renderRich } from '@/components/mathx/latex'
import { useToastStore } from '@/stores/toast'
import type { V3ButlerAction, V3ButlerCard, V3ButlerContext, V3ButlerMessage } from '@/types/teacherV3'

type Msg = V3ButlerMessage & { thinking?: string; toolLines?: string[]; images?: string[] }

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'activity'): void }>()

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const messages = ref<Msg[]>([])
const input = ref('')
const images = ref<string[]>([])
const webSearch = ref(false)
const kbSearch = ref(false)
const streaming = ref(false)
const voiceMode = ref(false)
const voiceText = ref('')
const asrLive = ref('')
const ctxOpen = ref(false)
const flowRef = ref<HTMLElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
let sseCtrl: { abort: () => void; finished: Promise<unknown> } | null = null

/* ---------- 上下文采集（Copilot 式自动附加） ---------- */
const ROUTE_TITLES: Record<string, string> = {
  '/teacher-v3/today': '今日工作台', '/teacher-v3/prep': '备课中心', '/teacher-v3/slides': '课件工坊',
  '/teacher-v3/bank': '题库', '/teacher-v3/quiz': '组卷中心', '/teacher-v3/assign': '作业与批改',
  '/teacher-v3/classroom': '课堂互动', '/teacher-v3/insights': '学情洞察', '/teacher-v3/resources': '资源中心',
}
const context = computed<V3ButlerContext>(() => ({
  route: route.path,
  route_title: ROUTE_TITLES[route.path] || '教师工作台',
  deck_id: typeof route.query.deck === 'string' ? route.query.deck : undefined,
  slide_index: 0,
}))
const ctxLabel = computed(() => context.value.route_title || context.value.route)

const quickAsks = ['帮我做一个《椭圆及其标准方程》的课件', '椭圆的定义是什么？（联网查最新教学资料）', '根号下x平方加y平方', '上传题目照片，说“存入题库”']

/* ---------- 卡片过滤 ---------- */
const formulaCards = (m: Msg) => (m.cards || []).filter((c): c is Extract<V3ButlerCard, { type: 'formula' }> => c.type === 'formula')
const actionCards = (m: Msg) => (m.cards || []).filter((c): c is Extract<V3ButlerCard, { type: 'action' }> => c.type === 'action')
const linkCards = (m: Msg) => (m.cards || []).filter((c): c is Extract<V3ButlerCard, { type: 'link' }> => c.type === 'link')

/* ---------- 对话发送（SSE） ---------- */
function ask(q: string) { input.value = q; void send() }

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  const teacherMsg: Msg = { id: `m${Date.now()}`, role: 'teacher', text, images: images.value.length ? [...images.value] : undefined }
  const butlerMsg: Msg = { id: `m${Date.now()}b`, role: 'butler', text: '', cards: [], pending: true, toolLines: [] }
  messages.value.push(teacherMsg, butlerMsg)
  input.value = ''
  const sentImages = images.value
  images.value = []
  streaming.value = true
  scrollToBottom()
  try {
    sseCtrl = v3Api.butler.chat(
      { message: text, context: context.value, images: sentImages.length ? sentImages : undefined, web_search: webSearch.value, kb_search: kbSearch.value },
      (event, data) => handleEvent(butlerMsg, event, data),
    )
    await sseCtrl.finished
  } catch (err) {
    butlerMsg.text = (butlerMsg.text || '') + `\n\n（连接中断：${(err as Error).message}）`
  } finally {
    butlerMsg.pending = false
    streaming.value = false
    sseCtrl = null
    emit('activity')
    scrollToBottom()
  }
}

function handleEvent(m: Msg, event: string, data: any) {
  if (event === 'meta') return
  if (event === 'thinking') { m.thinking = data.text; return }
  if (event === 'token') { m.text = (m.text || '') + String(data.text); scrollToBottom(); return }
  if (event === 'tool_call') { m.toolLines = [...(m.toolLines || []), `⚙ ${data.label}…`]; return }
  if (event === 'tool_result') { m.toolLines = [...(m.toolLines || []), `${data.ok ? '✓' : '✗'} ${data.summary}`]; return }
  if (event === 'card') { m.cards = [...(m.cards || []), data as V3ButlerCard]; scrollToBottom(); return }
  if (event === 'citation') { m.citations = data.sources; return }
  if (event === 'action') { runAction(data as V3ButlerAction); return }
}

/* ---------- 前端 Action Registry ---------- */
function runAction(a: V3ButlerAction) {
  if (a.action === 'navigate' && a.route) {
    void router.push({ path: a.route, query: a.query || {} })
    if (a.toast) toast.success(a.toast)
  }
}

function goLink(c: Extract<V3ButlerCard, { type: 'link' }>) {
  void router.push({ path: c.route, query: c.query || {} })
}

/* ---------- 写动作：教师确认后执行（红线） ---------- */
async function execAction(m: Msg, c: Extract<V3ButlerCard, { type: 'action' }>) {
  try {
    await v3Api.butler.confirmAction(c.id, { params: c.params })
    c.status = 'executed'
    toast.success(`${c.title}已完成，可在对应模块继续编辑`)
    messages.value.push({ id: `m${Date.now()}b`, role: 'butler', text: `已完成「${c.title}」。${c.title.includes('题库') ? '可在【题库】中查看与修改该题。' : ''}` })
    emit('activity')
  } catch (err) {
    toast.error(`执行失败：${(err as Error).message}`)
  }
  void m
}
function cancelAction(_m: Msg, c: Extract<V3ButlerCard, { type: 'action' }>) { c.status = 'cancelled' }

/* ---------- 语音公式链（P0 文本模拟；P1 真 ASR） ---------- */
async function sendVoice() {
  const text = voiceText.value.trim()
  if (!text || streaming.value) return
  voiceText.value = ''
  asrLive.value = ''
  const butlerMsg: Msg = { id: `m${Date.now()}b`, role: 'butler', text: '', cards: [], pending: true, toolLines: [] }
  messages.value.push({ id: `m${Date.now()}`, role: 'teacher', text: `🎤（语音）${text}` }, butlerMsg)
  streaming.value = true
  try {
    sseCtrl = v3Api.butler.voiceFormula({ text, context: context.value }, (event, data) => {
      if (event === 'asr_partial') { asrLive.value += String(data.text); scrollToBottom() }
      else if (event === 'asr_final') { asrLive.value = String(data.text) }
      else handleEvent(butlerMsg, event, data)
    })
    await sseCtrl.finished
  } catch (err) {
    butlerMsg.text = (butlerMsg.text || '') + `\n\n（连接中断：${(err as Error).message}）`
  } finally {
    asrLive.value = ''
    butlerMsg.pending = false
    streaming.value = false
    sseCtrl = null
    emit('activity')
    scrollToBottom()
  }
}

/* ---------- 公式卡片：拖拽 + 插入 ---------- */
function onFormulaDrag(ev: DragEvent, c: Extract<V3ButlerCard, { type: 'formula' }>) {
  if (!ev.dataTransfer) return
  ev.dataTransfer.setData('mx/latex', c.latex)
  ev.dataTransfer.setData(
    'application/x-v3-element',
    JSON.stringify({ type: 'formula', latex: c.latex, width: 460, height: 56, font_size: 24, teacher_confirmed: false }),
  )
}
/** 插入当前课件页：画布在工作台内嵌层级，用全局事件送达（SlidesView 监听后落布并提示结果） */
function insertFormula(c: Extract<V3ButlerCard, { type: 'formula' }>) {
  window.dispatchEvent(new CustomEvent('tv3-butler-insert', {
    detail: { type: 'formula', latex: c.latex, width: 460, height: 56, font_size: 24, teacher_confirmed: false },
  }))
}

/* ---------- 图片附件 ---------- */
function onFiles(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (!files) return
  for (const f of [...files].slice(0, 4)) {
    if (!f.type.startsWith('image/')) continue
    const rd = new FileReader()
    rd.onload = () => { if (typeof rd.result === 'string') images.value.push(rd.result) }
    rd.readAsDataURL(f)
  }
  ;(ev.target as HTMLInputElement).value = ''
}

function scrollToBottom() {
  void nextTick(() => { if (flowRef.value) flowRef.value.scrollTop = flowRef.value.scrollHeight })
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  sseCtrl?.abort()
})
function onKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape' && props.open) emit('close')
}
watch(() => props.open, (v) => { if (v) scrollToBottom() })
</script>

<style scoped>
.tv3-butler {
  position: fixed; right: 0; top: 0; bottom: 0; z-index: 880; width: 400px; max-width: 92vw;
  display: flex; flex-direction: column;
  background: var(--tv3-card, #fff); border-left: 1px solid var(--tv3-line, #e2e7ef);
  box-shadow: -12px 0 36px rgba(15, 32, 60, 0.12);
}
.tv3-butler-slide-enter-active, .tv3-butler-slide-leave-active { transition: transform .22s ease; }
.tv3-butler-slide-enter-from, .tv3-butler-slide-leave-to { transform: translateX(100%); }

.tv3-butler__head { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; border-bottom: 1px solid var(--tv3-line, #e2e7ef); }
.tv3-butler__orb {
  width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 16px; color: #fff;
  background: linear-gradient(135deg, #0f4787, #123a6d); flex: none;
}
.tv3-butler__head-txt b { font-size: 14px; display: block; line-height: 1.3; }
.tv3-butler__head-txt span { font-size: 11px; color: var(--tv3-ink3, #8a94a6); display: block; }
.tv3-butler__close { margin-left: auto; border: none; background: none; cursor: pointer; font-size: 15px; color: var(--tv3-ink3, #8a94a6); padding: 4px 8px; border-radius: 6px; }
.tv3-butler__close:hover { background: var(--tv3-bg2, #f4f6fa); }

.tv3-butler__ctx {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  border: none; border-bottom: 1px solid var(--tv3-line, #e2e7ef); background: #f7f9fd; cursor: pointer;
  padding: 8px 14px; font-size: 11.5px; color: var(--tv3-ink2, #4a5568);
}
.tv3-butler__ctx-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tv3-teal, #0e9488); flex: none; }
.tv3-butler__ctx-arrow { margin-left: auto; transition: transform .15s; }
.tv3-butler__ctx-arrow.open { transform: rotate(180deg); }
.tv3-butler__ctx-detail { padding: 8px 14px 10px; font-size: 11.5px; color: var(--tv3-ink3, #8a94a6); background: #f7f9fd; border-bottom: 1px solid var(--tv3-line, #e2e7ef); line-height: 1.7; }
.tv3-butler__ctx-note { color: var(--tv3-gold, #c99735); }

.tv3-butler__flow { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.tv3-butler__empty { text-align: center; color: var(--tv3-ink3, #8a94a6); font-size: 12.5px; padding: 26px 8px; line-height: 1.8; }
.tv3-butler__empty-title { font-size: 15px; font-weight: 700; color: var(--tv3-ink, #16233b); margin-bottom: 4px; }
.tv3-butler__chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
.tv3-butler__chip {
  border: 1px solid var(--tv3-line, #e2e7ef); background: #fff; border-radius: 999px; cursor: pointer;
  padding: 6px 12px; font-size: 12px; color: var(--tv3-ink2, #4a5568);
}
.tv3-butler__chip:hover { border-color: var(--tv3-navy, #0f4787); color: var(--tv3-navy, #0f4787); }

.tv3-butler__msg { display: flex; flex-direction: column; gap: 6px; }
.tv3-butler__msg.teacher { align-items: flex-end; }
.tv3-butler__msg.butler { align-items: flex-start; }
.tv3-butler__bubble {
  max-width: 92%; padding: 9px 12px; border-radius: 12px; font-size: 13px; line-height: 1.65;
  overflow-wrap: anywhere;
}
.tv3-butler__msg.teacher .tv3-butler__bubble { background: var(--tv3-navy, #0f4787); color: #fff; border-bottom-right-radius: 4px; }
.tv3-butler__msg.butler .tv3-butler__bubble { background: var(--tv3-bg2, #f4f6fa); color: var(--tv3-ink, #16233b); border-bottom-left-radius: 4px; }
.tv3-butler__thinking { font-size: 11.5px; color: var(--tv3-ink3, #8a94a6); font-style: italic; padding: 0 2px; }
.tv3-butler__toolline { font-size: 11.5px; color: var(--tv3-teal, #0e9488); }
.tv3-butler__caret { display: inline-block; width: 2px; height: 13px; background: var(--tv3-navy, #0f4787); animation: tv3-blink .9s infinite; vertical-align: -2px; margin-left: 2px; }
@keyframes tv3-blink { 50% { opacity: 0; } }

.tv3-butler__card { border: 1px solid var(--tv3-line, #e2e7ef); border-radius: 10px; background: #fff; max-width: 96%; }
.tv3-butler__card--formula { padding: 10px 12px; cursor: grab; }
.tv3-butler__card--formula:active { cursor: grabbing; }
.tv3-butler__card--formula:hover { border-color: var(--tv3-gold, #c99735); box-shadow: 0 4px 14px rgba(201, 151, 53, 0.18); }
.tv3-butler__formula { font-size: 17px; overflow-x: auto; padding: 2px 0; }
.tv3-butler__card-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 11px; }
.tv3-butler__conf { color: var(--tv3-teal, #0e9488); font-weight: 600; }
.tv3-butler__conf.low { color: var(--tv3-rose, #dc2646); }
.tv3-butler__src { color: var(--tv3-ink3, #8a94a6); }
.tv3-butler__alts { font-size: 11px; color: var(--tv3-ink3, #8a94a6); margin-top: 6px; }
.tv3-butler__mini {
  border: 1px solid var(--tv3-line, #e2e7ef); background: #fff; border-radius: 6px; cursor: pointer;
  font-size: 11.5px; padding: 3px 10px; color: var(--tv3-ink2, #4a5568);
}
.tv3-butler__mini:hover { border-color: var(--tv3-navy, #0f4787); color: var(--tv3-navy, #0f4787); }
.tv3-butler__mini--go { background: var(--tv3-navy, #0f4787); border-color: var(--tv3-navy, #0f4787); color: #fff; }
.tv3-butler__mini--go:hover { color: #fff; opacity: .92; }
.tv3-butler__card--action { padding: 10px 12px; border-left: 3px solid var(--tv3-gold, #c99735); }
.tv3-butler__card-title { font-size: 12.5px; font-weight: 700; }
.tv3-butler__card-body { font-size: 12px; color: var(--tv3-ink2, #4a5568); line-height: 1.6; margin-top: 4px; }
.tv3-butler__warn { color: var(--tv3-amber, #b45309); }
.tv3-butler__ok { color: var(--tv3-teal, #0e9488); font-weight: 600; }
.tv3-butler__dim { color: var(--tv3-ink3, #8a94a6); }
.tv3-butler__card--link { padding: 10px 12px; text-align: left; cursor: pointer; border-left: 3px solid var(--tv3-navy, #0f4787); }
.tv3-butler__card--link:hover { background: #f7f9fd; }
.tv3-butler__cites { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; }
.tv3-butler__cite { color: var(--tv3-navy, #0f4787); background: #f0f4fb; border-radius: 6px; padding: 2px 8px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv3-butler__thumbs { display: flex; gap: 6px; }
.tv3-butler__thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; border: 1px solid var(--tv3-line, #e2e7ef); }
.tv3-butler__asr { font-size: 12.5px; color: var(--tv3-ink2, #4a5568); background: #f7f9fd; border-radius: 10px; padding: 8px 12px; }

.tv3-butler__input { border-top: 1px solid var(--tv3-line, #e2e7ef); padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
.tv3-butler__voice-box { background: #f7f9fd; border: 1px solid var(--tv3-line, #e2e7ef); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.tv3-butler__voice-hint { font-size: 11px; color: var(--tv3-ink3, #8a94a6); }
.tv3-butler__voice-input { border: 1px solid var(--tv3-line, #e2e7ef); border-radius: 8px; padding: 8px 10px; font-size: 13px; outline: none; }
.tv3-butler__voice-input:focus { border-color: var(--tv3-navy, #0f4787); }
.tv3-butler__voice-ops { display: flex; gap: 8px; }
.tv3-butler__attach { display: flex; gap: 6px; align-items: center; }
.tv3-butler__row { display: flex; }
.tv3-butler__ta {
  flex: 1; border: 1px solid var(--tv3-line, #e2e7ef); border-radius: 10px; padding: 9px 11px;
  font-size: 13px; font-family: inherit; resize: none; outline: none; background: #fff;
}
.tv3-butler__ta:focus { border-color: var(--tv3-navy, #0f4787); }
.tv3-butler__ops { display: flex; align-items: center; gap: 8px; }
.tv3-butler__op {
  border: 1px solid var(--tv3-line, #e2e7ef); background: #fff; border-radius: 999px; cursor: pointer;
  font-size: 12px; padding: 4px 11px; color: var(--tv3-ink3, #8a94a6);
}
.tv3-butler__op.on { border-color: var(--tv3-navy, #0f4787); color: var(--tv3-navy, #0f4787); background: #f0f4fb; }
.tv3-butler__send {
  border: none; border-radius: 999px; cursor: pointer; font-size: 12.5px; padding: 6px 16px;
  background: linear-gradient(135deg, #0f4787, #123a6d); color: #fff; font-weight: 600;
}
.tv3-butler__send:disabled { opacity: .5; cursor: not-allowed; }
.tv3-butler__spacer { flex: 1; }
</style>
