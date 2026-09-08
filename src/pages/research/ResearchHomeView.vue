<template>
  <!-- 科研端首页 = 沉浸式对话（输入即问即答；无落地大横幅） -->
  <div class="re-chat" data-testid="rs-chat">
    <div class="re-chat-head">
      <span class="re-chat-title">{{ chat.title }}</span>
      <span class="re-chat-sub">{{ chat.sessionId ? '对话将保存到历史 · 输入即解答' : '本机临时对话' }}</span>
      <div class="re-chat-head-actions">
        <button class="re-btn sm" data-testid="rs-recent-toggle" @click="recentOpen = !recentOpen">最近工作</button>
        <button class="re-btn sm" data-testid="rs-history-toggle" @click="historyOpen = !historyOpen">历史对话</button>
        <button class="re-btn primary sm" data-testid="rs-new-chat" @click="newChat">＋ 新对话</button>
      </div>
    </div>

    <!-- 最近工作（可收起） -->
    <div v-if="recentOpen" class="re-recent-strip">
      <div v-if="recentItems.length" class="re-recent-list">
        <button v-for="item in recentItems" :key="item.kind + item.id" class="re-recent-chip" @click="openRecent(item)">
          <span class="re-r-icon" :class="item.iconClass === 'cyanbg' ? 'cyanbg' : (item.iconClass === 'orangebg' ? 'orangebg' : '')">▤</span>
          <span class="re-r-copy"><strong>{{ item.title }}</strong><small>{{ item.sub }}</small></span>
          <span class="re-chev">›</span>
        </button>
      </div>
      <div v-else class="re-empty" style="padding:18px"><p style="font-size:12px">最近还没有工作。</p></div>
    </div>

    <!-- 历史会话面板 -->
    <div v-if="historyOpen" class="re-history-panel">
      <div v-if="!chatSessions.length" class="re-empty" style="padding:16px"><p style="font-size:11px">还没有历史对话。</p></div>
      <div v-for="s in chatSessions" :key="s.id" class="re-history-item" :class="{ active: s.id === chat.sessionId }" @click="openSession(s.id)">
        <div>
          <div class="re-history-title">{{ s.title }}</div>
          <div class="re-history-meta">{{ s.message_count }} 条 · {{ relTime(s.updated_at) }}</div>
        </div>
        <button class="re-btn sm danger" @click.stop="removeSession(s.id)">删除</button>
      </div>
    </div>

    <div class="re-chat-msgs" ref="msgsRef">
      <!-- 空态：欢迎 + 快速入口（对话从这里开始） -->
      <div v-if="!chat.turns.length" class="re-chat-empty">
        <div class="re-welcome">{{ greeting }}，{{ name }} 👋</div>
        <div class="re-welcome-title">今天想<span>读哪篇论文</span>？</div>
        <p class="re-welcome-sub">直接在下方提问：AI 会结合你的知识库作答并注明来源；粘贴 DOI/URL 会进入收录流程。</p>
        <div class="re-quick-entries" data-testid="rs-quick-entries">
          <button class="re-quick" data-testid="rs-q-library" @click="router.push('/research/library')"><span class="re-sicon violet">▤</span><span>打开文献库</span></button>
          <button class="re-quick" data-testid="rs-q-import" @click="router.push('/research/import')"><span class="re-sicon cyan">↥</span><span>上传 / 收录论文</span></button>
          <button class="re-quick" data-testid="rs-q-writing" @click="router.push('/research/writing')"><span class="re-sicon orange">✓</span><span>继续写作</span></button>
          <button class="re-quick" data-testid="rs-q-recent" @click="recentOpen = !recentOpen"><span class="re-sicon blue">🕘</span><span>最近工作</span></button>
        </div>
      </div>

      <div v-for="(t, i) in chat.turns" :key="i" class="re-bubble-row" :class="t.role === 'user' ? 'me' : 'ai'">
        <div class="re-bubble" :class="t.role">
          <div v-if="t.role === 'assistant' && t.streaming && !t.content" class="re-ai-typing">AI 正在结合知识库作答…</div>
          <p v-else :class="{ 're-ai-cursor': t.role === 'assistant' && t.streaming }">{{ t.content }}</p>
          <div v-if="t.role === 'assistant' && t.sources.length" class="re-source-proof">
            <strong>回答依据</strong>
            <div v-for="(s, k) in t.sources" :key="k">{{ s.cite }} · 《{{ s.title }}》{{ s.method ? ' · 检索:' + s.method : '' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="re-chat-inputbar">
      <textarea
        v-model="promptText"
        rows="1"
        class="re-chat-input"
        placeholder="输入问题直接解答…（Shift+Enter 换行；粘贴 DOI/URL 将收录）"
        data-testid="rs-chat-input"
        @keydown.enter.exact.prevent="sendFromBar()"
        @input="autoGrow"
      ></textarea>
      <button class="re-btn primary" :disabled="chat.streaming" data-testid="rs-chat-send" @click="sendFromBar">发送</button>
      <button v-if="chat.streaming" class="re-btn" @click="abortChat()">停止</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useResearchStore } from '@/stores/research'
import { researchAiApi } from '@/api/researchEnd'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const auth = useAuthStore()
const rstore = useResearchStore()
const toast = useToastStore()
const promptText = ref('')
const msgsRef = ref(null)
const historyOpen = ref(false)
const recentOpen = ref(false)
const chatSessions = ref([])

const summary = computed(() => rstore.summary)
const name = computed(() => auth.nickname || '科研用户')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const recentItems = computed(() => {
  const s = summary.value
  if (!s) return []
  const papers = (s.recent_papers || []).map((p) => ({
    kind: 'paper', id: p.id, title: p.title,
    sub: `${(p.authors || []).join(' · ') || '未知作者'} · ${p.year || '—'}`,
    iconClass: '',
  }))
  const ms = (s.recent_manuscripts || []).map((m) => ({
    kind: 'manuscript', id: m.id, title: m.title,
    sub: `${m.word_count} 字 · ${relTime(m.updated_at)}`,
    iconClass: 'cyanbg',
  }))
  return [...papers, ...ms].slice(0, 6)
})

// ---------- 沉浸式对话 ----------
const chat = reactive({ active: true, title: '科研对话', sessionId: null, turns: [], streaming: false })
let streamHandle = null

function sendFromBar() {
  const v = promptText.value.trim()
  if (!v || chat.streaming) return
  if (/^10\.\d{4,9}\//.test(v) || /^https?:\/\//i.test(v)) {
    router.push('/research/import')
    toast.info('已识别为 DOI/URL，进入收录流程')
    promptText.value = ''
    return
  }
  sendChat(v)
}

async function sendChat(q) {
  if (!chat.sessionId) {
    try {
      const s = await researchAiApi.createSession({})
      chat.sessionId = s.id
      chat.title = q.slice(0, 24) + (q.length > 24 ? '…' : '')
    } catch { /* 持久化失败仍可临时对话 */ }
  }
  promptText.value = ''
  const history = buildHistory()
  chat.turns.push({ role: 'user', content: q })
  const aiTurn = { role: 'assistant', content: '', sources: [], streaming: true }
  chat.turns.push(aiTurn)
  chat.streaming = true
  scrollBottom()

  streamHandle = researchAiApi.chat(
    { message: q, context: {}, history, session_id: chat.sessionId || undefined },
    {
      onEvent: (ev, data) => {
        if (ev === 'source') aiTurn.sources.push(data)
        else if (ev === 'token') aiTurn.content += data.text
        else if (ev === 'done') { aiTurn.streaming = false; chat.streaming = false; refreshSessions() }
        else if (ev === 'error') { aiTurn.streaming = false; chat.streaming = false; aiTurn.content = aiTurn.content || '（AI 暂不可用）'; toast.error(data.message || 'AI 不可用') }
        scrollBottom()
      },
    },
  )
  streamHandle.finished.catch(() => { if (chat.streaming) chat.streaming = false; aiTurn.streaming = false })
}

function buildHistory() {
  const out = []
  for (const t of chat.turns) {
    if (t.role === 'user' || (t.role === 'assistant' && !t.streaming)) {
      out.push({ role: t.role === 'assistant' ? 'assistant' : 'user', content: t.content })
    }
  }
  return out.slice(-20)
}

function abortChat() {
  if (streamHandle) { try { streamHandle.abort() } catch { } }
  streamHandle = null
  chat.streaming = false
  chat.turns.forEach((t) => { if (t.streaming) t.streaming = false })
}

function newChat() {
  abortChat()
  chat.sessionId = null
  chat.title = '科研对话'
  chat.turns = []
  historyOpen.value = false
  promptText.value = ''
  nextTick(() => promptFocus())
}

async function refreshSessions() {
  try {
    const d = await researchAiApi.sessions()
    chatSessions.value = d.items || []
  } catch { /* ignore */ }
}
async function openSession(id) {
  abortChat()
  try {
    const d = await researchAiApi.sessionMessages(id)
    chat.sessionId = id
    chat.title = d.session.title || '科研对话'
    chat.turns = (d.items || []).map((m) => ({ role: m.role, content: m.content, sources: m.sources || [], streaming: false }))
    historyOpen.value = false
    nextTick(() => scrollBottom())
  } catch (e) { toast.error(e.message) }
}
async function removeSession(id) {
  if (!confirm('删除该对话及全部消息？')) return
  try {
    await researchAiApi.deleteSession(id)
    chatSessions.value = chatSessions.value.filter((s) => s.id !== id)
    if (chat.sessionId === id) newChat()
  } catch (e) { toast.error(e.message) }
}

function openRecent(item) {
  if (item.kind === 'paper') router.push(`/research/reader/${item.id}`)
  else router.push(`/research/writing/${item.id}`)
}

function autoGrow(e) {
  const el = e.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}
function scrollBottom() {
  nextTick(() => { const el = msgsRef.value; if (el) el.scrollTop = el.scrollHeight })
}
function promptFocus() {
  const i = document.querySelector('[data-testid="rs-chat-input"]')
  if (i) i.focus()
}

function relTime(iso) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

watch(() => chat.turns.length, () => scrollBottom())

onMounted(() => {
  rstore.fetchSummary()
  refreshSessions()
  promptFocus()
})
</script>

<style scoped>
.re-chat {
  height: calc(100vh - 68px); display: flex; flex-direction: column; min-height: 0;
  background: var(--re-bg, #f7faff);
}
.re-chat-head {
  height: 54px; display: flex; align-items: center; gap: 12px; padding: 0 22px;
  border-bottom: 1px solid #e6edf6; background: rgba(255,255,255,.8); flex-shrink: 0;
}
.re-chat-title { font-size: 14px; font-weight: 700; color: var(--re-ink, #0d1830); max-width: 40vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.re-chat-sub { font-size: 11px; color: #8a99ae; }
.re-chat-head-actions { margin-left: auto; display: flex; gap: 8px; }

.re-recent-strip { border-bottom: 1px solid #e6edf6; background: #fbfcff; padding: 8px 16px; max-height: 220px; overflow: auto; flex-shrink: 0; }
.re-recent-list { display: grid; gap: 6px; }
.re-recent-chip { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 1px solid #e6edf6; background: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
.re-recent-chip:hover { border-color: #b8cdf0; }
.re-recent-chip .re-r-copy { flex: 1; min-width: 0; }
.re-recent-chip strong { font-size: 12px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.re-recent-chip small { font-size: 10px; color: #8a99ae; }

.re-history-panel { max-height: 260px; overflow: auto; border-bottom: 1px solid #e6edf6; background: #fbfcff; padding: 8px 12px; flex-shrink: 0; }
.re-history-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border-radius: 9px; cursor: pointer; }
.re-history-item:hover { background: #eef3fa; }
.re-history-item.active { background: #eaf0ff; }
.re-history-title { font-size: 12px; color: var(--re-ink, #0d1830); }
.re-history-meta { font-size: 10px; color: #98a5b8; margin-top: 2px; }

.re-chat-msgs { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 20px; scrollbar-width: thin; scrollbar-color: #cdd8e8 transparent; }
.re-chat-msgs::-webkit-scrollbar { width: 8px; }
.re-chat-msgs::-webkit-scrollbar-thumb { background: #cdd8e8; border-radius: 4px; }

.re-chat-empty { text-align: center; color: #6e7d99; padding-top: 5vh; }
.re-welcome { font-size: 15px; color: #6b7892; margin-bottom: 10px; }
.re-welcome-title { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: var(--re-ink, #0d1830); margin-bottom: 8px; }
.re-welcome-title span { color: #3c6ae6; }
.re-welcome-sub { font-size: 13px; color: #8190a9; margin: 0 0 22px; }
.re-quick-entries { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.re-quick { display: flex; align-items: center; gap: 8px; border: 1px solid var(--re-line, #dfe8f4); background: #fff; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: #435270; cursor: pointer; transition: all .15s; }
.re-quick:hover { border-color: #4568e7; color: #3f61d7; box-shadow: 0 4px 12px #4568e715; }
.re-quick .re-sicon { width: 28px; height: 28px; font-size: 14px; margin: 0; }

.re-bubble-row { display: flex; margin-bottom: 14px; }
.re-bubble-row.me { justify-content: flex-end; }
.re-bubble-row.ai { justify-content: flex-start; }
.re-bubble { max-width: 76%; border-radius: 14px; padding: 12px 16px; font-size: 13px; line-height: 1.75; white-space: pre-wrap; word-break: break-word; }
.re-bubble.user { background: var(--re-grad, linear-gradient(135deg,#4e6bf0,#5b4de0)); color: #fff; border-bottom-right-radius: 4px; }
.re-bubble.assistant { background: #fff; border: 1px solid var(--re-line, #dfe8f4); color: #22324a; border-bottom-left-radius: 4px; box-shadow: 0 4px 14px #9fb9d512; }
.re-bubble .re-source-proof { margin-top: 8px; font-size: 10px; }
.re-ai-typing { color: #7a8aa3; }

.re-chat-inputbar { flex-shrink: 0; display: flex; gap: 10px; align-items: flex-end; padding: 14px 22px 20px; border-top: 1px solid #e6edf6; background: rgba(255,255,255,.82); }
.re-chat-input { flex: 1; min-height: 42px; max-height: 160px; resize: none; border: 1px solid var(--re-line, #dfe8f4); border-radius: 12px; padding: 10px 14px; font-size: 13px; font-family: inherit; color: var(--re-ink, #0d1830); outline: none; background: #fff; line-height: 1.6; }
.re-chat-input:focus { border-color: #4568e7; box-shadow: 0 3px 10px #4568e715; }
</style>