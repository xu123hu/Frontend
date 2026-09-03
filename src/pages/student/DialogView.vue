<template>
  <div class="view dialog-page">
    <!-- 对话主区域：标题栏 + 消息流 + 快捷指令 + 输入框（横向占满主内容宽度） -->
    <div class="dialog-main v4-chat">
      <div class="dialog-header">
        <div style="min-width:0;">
          <div class="ttl" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ activeTitle }}</div>
          <div style="font-size:11.5px;color:var(--ink3);margin-top:2px;">苏格拉底模式 · 不直接给答案 · 每步基于你的反应推进</div>
        </div>
        <span class="step">{{ stepBadge }}</span>
      </div>

      <div class="dialog-messages" ref="listRef" @scroll="onListScroll">
        <div v-if="chat.msgLoading.value" class="list-loading"><span class="spinner"></span> 加载历史消息…</div>

        <!-- 复习时间到（B6 · 到期错题对话化提醒） -->
        <div v-if="reviewNudge && !chat.messages.value.length" class="review-nudge anim-in">
          <div class="rn-icon">📚</div>
          <div class="rn-body">
            <div class="rn-title">复习时间到 · {{ reviewNudge.due_today }} 道错题到了复习期</div>
            <div class="rn-text">
              <IncrementalMarkdown :text="reviewNudgeText" :zoomable="false" />
              <img v-if="reviewImgUrl && !reviewImgError" :src="reviewImgUrl" class="rn-img" alt="原题图片" @error="reviewImgError = true" />
            </div>
            <div class="rn-actions">
              <button class="btn btn-sm btn-primary" :disabled="reviewStarting" @click="startReview(reviewNudge.due_items[0])">
                {{ reviewStarting ? '出题中…' : '出变式复习' }}
              </button>
              <button class="btn btn-sm" @click="router.push('/errors')">去错题本</button>
              <button class="btn btn-sm rn-dismiss" @click="dismissReviewNudge">今天已复习</button>
            </div>
          </div>
        </div>

        <template v-else-if="chat.messages.value.length">
          <!-- 历史向上分页 -->
          <div v-if="chat.historyHasMore.value" class="history-more">
            <button class="history-btn" :disabled="chat.historyLoading.value" @click="onLoadOlder">
              <span v-if="chat.historyLoading.value" class="spinner"></span>
              {{ chat.historyLoading.value ? '加载中…' : '加载更早消息' }}
            </button>
          </div>
          <MessageBubble
            v-for="m in chat.messages.value"
            :key="m.key"
            :msg="m"
            @clarify="sendText"
            @regenerate="chat.regenerate"
            @feedback="onFeedback"
            @edit="onEditMessage"
            @version-switch="onVersionSwitch"
            @quiz-enter="onQuizEnter"
            @quiz-explain="onQuizExplain"
            @quiz-answered="onQuizAnswered"
            @quiz-more="onQuizMore"
            @quiz-chain-action="onChainAction"
            @tutor-action="onTutorAction"
            @answer-confirm="onAnswerConfirm"
            @think-more="onThinkMore"
            @action="onActionClick"
            @complete-action="onCompleteAction"
          />
          <!-- AI 思考中（v4 动效） -->
          <div v-if="chat.streaming.value" class="v4-thinking">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            AI 正在根据你的答题表现生成变式题（难度递进）…
          </div>
        </template>

        <div v-else class="empty-state welcome">
          <div class="es-icon">π</div>
          <div class="es-text">学习不是功能堆砌,是一场苏格拉底对话</div>
          <div class="welcome-sub">拍照/粘贴不会的题 → 引导式解题 → 变式巩固 → 错题自动收录。或直接说「帮我出变式」「来一场模拟」「分析我的学情」直达功能</div>
        </div>
      </div>

      <!-- 回到底部悬浮钮 -->
      <button v-if="showBackBtn" class="back-bottom glass-card" @click="onBackBottom">
        <UiIcon name="arrow-down" :size="14" />
        <span v-if="hasNew">有新消息</span>
      </button>

      <!-- 拖拽上传遮罩 -->
      <div v-if="dragOver" class="drop-mask">
        <div class="drop-inner">
          <UiIcon name="paperclip" :size="28" />
          <div>松开鼠标上传附件</div>
          <div class="drop-sub">pdf / 图片 / office / md / txt，≤20MB，最多 3 个</div>
        </div>
      </div>

      <SuggestionsGrid class="sugg" :collapsed="suggCollapsed" @pick="onSuggest" />
      <ChatInput
        ref="inputRef"
        :streaming="chat.streaming.value"
        :tasks="upload.tasks"
        :rate-limited-until="upload.state.rateLimitedUntil"
        v-model:thinking="chat.thinkingOn.value"
        v-model:webSearch="chat.webSearchOn.value"
        :web-search-enabled="chat.webSearchOptInEnabled.value"
        @send="onSend"
        @stop="chat.stopStreaming"
        @pick-files="onPickFiles"
        @remove-attachment="upload.removeTask"
        @retry-attachment="upload.retry"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useSkillStore } from '@/stores/skill'
import { useConvStore } from '@/stores/conv'
import { SKILL_ID_BY_KEY } from '@/config/skills'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import IncrementalMarkdown from '@/components/chat/IncrementalMarkdown.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import SuggestionsGrid from '@/components/chat/SuggestionsGrid.vue'
import UiIcon from '@/components/common/UiIcon.vue'
import { useFileUpload } from '@/components/chat/useFileUpload'
import { useChat } from '@/composables/useChat'
import { filesApi } from '@/api'
import { studentApi } from '@/api'
import { useConfirm } from '@/composables/useConfirm'
import { uuid } from '@/components/chat/messageModel'
import { openImmersive } from '@/composables/useImmersive'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const upload = useFileUpload(toast)
const skillStore = useSkillStore()
const conv = useConvStore()
const { confirm } = useConfirm()

const listRef = ref(null)
const inputRef = ref(null)

/* ===== 滚动状态 ===== */
const showBackBtn = ref(false)
const hasNew = ref(false)
const dragOver = ref(false)
let dragDepth = 0

/* ===== useChat：仅负责消息与 SSE 流控（会话列表由 conv store 统一管理） ===== */
const chat = useChat({
  manageConversations: false,
  hooks: {
    onEvent: onSseActivity,
    onConversationId: (id) => {
      conv.select(id)
      history.replaceState(null, '', `/dialog/${id}`)
      // 新会话由后端在首次对话时才创建：立即刷新侧栏列表，
      // 否则列表停留在"暂无会话"，要手动刷新页面才能看到历史（2026-08-29 N4 回归发现）
      conv.load().catch(() => {})
    },
    onTitle: (t) => conv.updateTitle(conv.activeId, t),
    onAction: handleAction,
    onLatex: (d) => {
      if (d?.latex) inputRef.value?.insertText(`$${d.latex}$`)
      if (d?.ambiguous) toast.info('公式可能有歧义，请核对草稿后再发送')
    },
    onFileParsed: (d) => {
      const t = upload.tasks.find((x) => x.fileId === d.file_id)
      if (t && d.status === 'parsed') {
        t.status = 'parsed'
        t.engine = d.parse_engine || t.engine
      }
      toast.success(`文件《${d.filename}》解析完成`)
    },
    resolveSkills: (keys) => keys.map((k) => SKILL_ID_BY_KEY[k]).filter(Boolean),
  },
})

const activeTitle = computed(
  () => conv.items.find((c) => c.id === conv.activeId)?.title || '新对话'
)

/** 顶部步骤徽标：以后端 socratic 进度卡为唯一事实源（此前按消息数估算，会误导进度） */
const stepBadge = computed(() => {
  const msgs = chat.messages.value
  for (let i = msgs.length - 1; i >= 0; i--) {
    const cards = msgs[i]?.cards || []
    for (let j = cards.length - 1; j >= 0; j--) {
      const c = cards[j]
      if (c?.card_type === 'socratic_progress' && c.steps_count) {
        return `第 ${c.current_step} 步 / 共 ${c.steps_count} 步`
      }
      if (c?.card_type === 'socratic_complete') return '已完成 ✓'
      if (c?.card_type === 'socratic_start' && c.steps_count) {
        return `第 1 步 / 共 ${c.steps_count} 步`
      }
    }
  }
  if (chat.streaming.value) return '引导中…'
  if (!msgs.length) return '新对话'
  return '对话中'
})

/** 建议卡：首轮发送后收起为 slim 条 */
const suggCollapsed = computed(() => chat.messages.value.length > 0)

/* ===== 滚动管理 ===== */
function scrollBottom(force = false) {
  nextTick(() => {
    const el = listRef.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240
    if (force || nearBottom) el.scrollTop = el.scrollHeight
  })
}

function onSseActivity() {
  nextTick(() => {
    const el = listRef.value
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240
    if (nearBottom) el.scrollTop = el.scrollHeight
    else if (chat.streaming.value) hasNew.value = true
  })
}

watch(chat.streaming, (v) => {
  if (v) {
    hasNew.value = false
    scrollBottom(true)
  }
})

function onListScroll() {
  const el = listRef.value
  if (!el) return
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight
  showBackBtn.value = dist > 240
  if (dist <= 240) hasNew.value = false
  if (el.scrollTop < 80 && chat.historyHasMore.value && !chat.historyLoading.value && !chat.msgLoading.value) {
    onLoadOlder()
  }
}

async function onLoadOlder() {
  const el = listRef.value
  const prevH = el?.scrollHeight || 0
  const prevTop = el?.scrollTop || 0
  const added = await chat.loadOlderMessages()
  if (added > 0 && el) {
    nextTick(() => { el.scrollTop = el.scrollHeight - prevH + prevTop })
  }
}

function onBackBottom() {
  hasNew.value = false
  scrollBottom(true)
}

/* ===== 拖拽上传 ===== */
function hasFiles(e) {
  return [...(e.dataTransfer?.types || [])].includes('Files')
}
function onDragOver(e) {
  if (!hasFiles(e) || chat.streaming.value) return
  if (e.type === 'dragenter') dragDepth++
  dragOver.value = true
}
function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragOver.value = false
}
function onDrop(e) {
  dragDepth = 0
  dragOver.value = false
  if (chat.streaming.value) return
  const files = [...(e.dataTransfer?.files || [])]
  if (files.length) upload.addFiles(files, { purpose: 'chat_attachment' })
}

/* ===== 发送 ===== */
function onSend(text) {
  const atts = upload.parsedAttachments().map((a) => {
    const t = upload.tasks.find((x) => x.fileId === a.file_id)
    return {
      ...a,
      localUrl: t?.file && a.kind === 'image' ? URL.createObjectURL(t.file) : '',
    }
  })
  chat.doSend(text, { attachments: atts, displayText: text, skillKeys: [...skillStore.activeKeys] })
  if (atts.length) upload.clearSent()
}

function sendText(text) {
  if (!text || chat.streaming.value) return
  chat.doSend(text, {})
}

function onSuggest(s) {
  const text = typeof s === 'string' ? s : s?.text
  const key = typeof s === 'object' ? s?.skill || '' : ''
  if (!text || chat.streaming.value) return
  if (key) chat.doSend(text, { displayText: text, skillKeys: [key], skills: [SKILL_ID_BY_KEY[key]].filter(Boolean) })
  else chat.doSend(text, {})
}

/* ===== AI 管家：功能直达 action（路由映射到 v4 页面） ===== */
const PATH_MAP = {
  '/student/error-book': '/errors',
  '/student/mastery': '/report',
  '/student/graph': '/graph',
  '/student/practice-lab': '/practice',
  '/student/practice': '/practice',
  '/student/exam': '/exam',
  '/student/chat': '/dialog',
  '/student/classes': '/class',
  '/student/tasks': '/tasks',
  '/student/classroom': '/dual',
}
function mapPath(to) {
  const base = String(to || '').split('?')[0]
  return PATH_MAP[base] || to
}
const ACTION_ALLOWED_PREFIXES = ['/student/', '/admin/', '/dialog', '/overview', '/practice', '/errors', '/report', '/graph', '/exam', '/class', '/tasks', '/dual', '/resource']

async function handleAction(data) {
  const { kind, to, label, params } = data || {}
  if (kind !== 'open_page' || !to) return
  const target = mapPath(to)
  if (!ACTION_ALLOWED_PREFIXES.some((p) => String(target).startsWith(p))) {
    toast.error(`无法跳转到该页面（${to}）`)
    return
  }
  const ok = await confirm({
    title: '页面跳转',
    message: `是否前往「${label || to}」？`,
    confirmText: '前往',
  })
  if (ok) router.push(target + (params || '')).catch(() => toast.error('页面跳转失败'))
}

function onActionClick(action) {
  const { kind, to, params } = action || {}
  if (kind !== 'open_page' || !to) return
  const target = mapPath(to)
  if (!ACTION_ALLOWED_PREFIXES.some((p) => String(target).startsWith(p))) {
    toast.error(`无法跳转到该页面（${to}）`)
    return
  }
  router.push(target + (params || '')).catch(() => toast.error('页面跳转失败'))
}

/* ===== 消息操作 ===== */
function onFeedback(msg, val, reason) {
  chat.submitFeedback(msg, val, reason)
}
function onEditMessage(msg, newText) {
  chat.editUserMessage(msg, newText)
}
function onVersionSwitch(msg, targetId) {
  chat.activateVersion(msg, targetId)
}

/* ===== 引导式解题 ===== */
function onTutorAction(action) {
  if (action === 'hint') chat.doSend('来点提示', { tutorAction: 'hint' })
  else if (action === 'answer') chat.doSend('直接看答案', { tutorAction: 'answer' })
}
function onAnswerConfirm(msg) {
  msg.confirmDismissed = true
  chat.doSend('确认查看完整解答', { tutorAction: 'answer_confirm' })
}
function onThinkMore(msg) {
  msg.confirmDismissed = true
  chat.doSend('我再想想', {})
}

/* ===== 出题卡 → 作答：接入沉浸式答题覆盖层 ===== */
function onQuizEnter(card) {
  const qid = card.quiz_id || card.quizId || `local_${uuid()}`
  try {
    sessionStorage.setItem(`quiz_${qid}`, JSON.stringify(card))
  } catch { /* 存储失败不阻断 */ }
  openImmersive()
}

/* ===== 对话内变式作答（判分上报 + 复习排期推进，原逻辑不变） ===== */
async function onQuizAnswered(card, item, idx, outcome) {
  if (!item || !item.question_text) return
  const opts = Array.isArray(item.options) ? item.options : []
  try {
    await studentApi.reportLearningEvent({
      kind: 'quiz_judge',
      question_text: String(item.question_text).slice(0, 2000),
      options: opts.map((o) => String(o)).slice(0, 8),
      answer: item.answer || '',
      chosen: outcome?.chosen || '',
      correct: !!outcome?.correct,
      kp_code: item.kp_code || '',
      kp_name: item.kp_name || '',
      source: 'chat_quiz',
      conversation_id: chat.activeConvId.value || undefined,
    })
  } catch (e) {
    console.warn('[learning-event] 判分上报失败', e)
    if (!outcome?.correct) toast.error('错题自动收录失败，可稍后在错题本手动收录')
  }
  if (reviewCtx.value) {
    const rid = reviewCtx.value.record_id
    reviewCtx.value = null
    try {
      const res = await studentApi.reviewErrorRecord(rid, { result: outcome?.correct ? 'remembered' : 'forgotten' })
      if (outcome?.correct) {
        toast.success(res?.graduated ? '这道错题已完成全部复习，毕业啦 🎓' : '复习完成，已安排下次复习')
      } else {
        toast.info('没关系，已重置这道题的复习计划，明天再试一次')
      }
    } catch { /* 排期推进失败不打断作答 */ }
  }
}

/* ===== 复习对话化（B6） ===== */
const reviewNudge = ref(null)
const reviewNudgeText = computed(() => {
  const item = reviewNudge.value?.due_items?.[0]
  if (!item) return ''
  const kp = item.kp_name ? `（${item.kp_name}）` : ''
  return `「${item.question_text}」${kp}——换个条件再试试？`
})
const reviewCtx = ref(null)
const reviewStarting = ref(false)
// om5：复习提醒卡带上原题缩略图（"如图"类错题，光看 OCR 文本容易丢图形信息）
const reviewImgUrl = ref('')
const reviewImgError = ref(false)
watch(reviewNudge, async (n) => {
  reviewImgUrl.value = ''
  reviewImgError.value = false
  const fid = n?.due_items?.[0]?.file_id
  if (!fid) return
  try {
    const d = await filesApi.contentUrl(String(fid))
    if (d?.url) reviewImgUrl.value = d.url
  } catch { /* 拉不到原图不影响复习 */ }
})

function dismissReviewNudge() {
  reviewNudge.value = null
  sessionStorage.setItem('review_nudge_dismissed', new Date().toISOString().slice(0, 10))
}

async function startReview(item) {
  if (!item || chat.streaming.value || reviewStarting.value) return
  reviewStarting.value = true
  reviewNudge.value = null
  reviewCtx.value = { record_id: item.record_id }
  const kp = item.kp_name ? `「${item.kp_name}」` : ''
  chat.doSend(
    `我在复习一道${kp}错题，请基于它出一道变式题（换掉数字或条件，不要出原题）让我重新作答巩固：\n${item.question_text}` +
      (item.file_id ? '\n（原题图片已随消息附上，请先看图再审题）' : ''),
    { displayText: '🔄 错题复习 · 换个条件再试试', skillKeys: ['quiz_gen'], attachments: item.file_id ? [{ file_id: item.file_id, kind: 'image' }] : [] },
  )
  reviewStarting.value = false
}

async function checkReviewNudge() {
  if (chat.messages.value.length) return
  if (sessionStorage.getItem('review_nudge_dismissed') === new Date().toISOString().slice(0, 10)) return
  try {
    const data = await studentApi.reviewPlan()
    if (data?.due_today > 0 && data.due_items?.length) reviewNudge.value = data
  } catch { /* 复习提醒加载失败不影响对话 */ }
}

function onQuizExplain(card, item, idx, outcome) {
  if (chat.streaming.value) return
  const q = String(item?.question_text || '').slice(0, 500)
  const kp = item?.kp_name || item?.kp_code || ''
  const chosenInfo =
    outcome && !outcome.correct && outcome.chosen
      ? `我刚刚选了 ${outcome.chosen}（错误）`
      : outcome && !outcome.correct
        ? '我刚刚答错了'
        : '我刚刚答过'
  const text = q
    ? `请讲解这道题并帮我举一反三：\n${q}\n（这是一道${kp ? `「${kp}」相关` : ''}题，${chosenInfo}，请先用苏格拉底方式引导我理解——可以先问问我当时是怎么想的，再出 2-3 道变式确认我真正掌握）`
    : '请基于刚才的题给我逐一举一反三讲解，并出变式确认掌握'
  chat.doSend(text, { displayText: '💬 讲解这道错题 · 举一反三', skillKeys: ['socratic'] })
}

function onQuizMore(card) {
  if (chat.streaming.value) return
  const it = card?.items?.[0]
  const q = String(it?.question_text || '').slice(0, 400)
  chat.doSend(
    q ? `请基于这道题再来一组难度递进的变式巩固：\n${q}` : '再来一组变式巩固',
    { displayText: '🔄 再来一组变式', skillKeys: ['quiz_gen'], attachments: item.file_id ? [{ file_id: item.file_id, kind: 'image' }] : [] },
  )
}

function onChainAction(type, card) {
  if (type === 'variant') {
    onQuizMore(card)
  } else {
    onCompleteAction({ type })
  }
}

function onCompleteAction({ type } = {}) {
  if (type === 'variant') {
    if (chat.streaming.value) return
    chat.doSend('请基于刚才引导完成的这道题，再来一组难度递进的变式（举一反三）', {
      displayText: '🔄 举一反三 · 再来一组变式',
      skillKeys: ['quiz_gen'],
    })
  } else if (type === 'errorBook') {
    router.push('/errors')
  } else if (type === 'mastery') {
    router.push('/report')
  } else if (type === 'finish') {
    toast.success('今天辛苦了，明天继续加油 💪')
  }
}

/* ===== 附件 ===== */
function onPickFiles({ files, isPhoto }) {
  upload.addFiles(files, { purpose: isPhoto ? 'question_photo' : 'chat_attachment' })
}

/* ===== 生命周期 ===== */
onMounted(async () => {
  await conv.load()
  // 阶段 6A：加载能力开关（v2 未切流期间 web_search_opt_in_enabled=false，按钮隐藏）
  chat.loadFeatures()
  const initId = String(route.params.id || '')
  if (initId) {
    await chat.openConversation(initId)
    conv.select(initId)
    scrollBottom(true)
  }

  const safeDecode = (s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const kp = String(route.query.kp || '')
  const explain = String(route.query.explain || '')
  if (explain && !chat.messages.value.length && !chat.streaming.value) {
    const errorType = String(route.query.error_type || '')
    const myAnswer = String(route.query.answer || '')
    const ERROR_TYPE_ZH = {
      concept: '概念不清',
      formula: '公式记错',
      calculation: '计算失误',
      logic: '思路逻辑问题',
      reading: '审题读题偏差',
    }
    const parts = [`请讲解这道错题并帮我举一反三：\n${safeDecode(explain).slice(0, 600)}`]
    if (myAnswer) parts.push(`我当时的作答：${safeDecode(myAnswer).slice(0, 300)}`)
    if (ERROR_TYPE_ZH[errorType]) parts.push(`错因标记：${ERROR_TYPE_ZH[errorType]}`)
    if (kp) parts.push(`（对应知识点「${kp}」）`)
    parts.push('请先用苏格拉底方式引导我理解错在哪，再出 2-3 道变式确认我真正掌握')
    chat.doSend(parts.join('\n'), {
      displayText: '💬 已为你打开错题讲解，逐一举一反三',
      skillKeys: ['socratic'],
    })
  } else if (kp && !chat.messages.value.length && !chat.streaming.value) {
    chat.doSend(`请围绕知识点「${kp}」出一道适合我当前水平的题，并用引导式方式带我解出它。`, {
      displayText: `💡 围绕「${kp}」带你练一道`,
      skillKeys: ['socratic'],
    })
  }

  const review = String(route.query.review || '')
  if (review && !chat.messages.value.length && !chat.streaming.value) {
    try {
      const data = await studentApi.reviewPlan()
      if (data?.due_items?.length) await startReview(data.due_items[0])
      else toast.info('今天没有到期的错题，保持得不错')
    } catch {
      toast.error('复习计划加载失败，可稍后再试')
    }
  } else if (!explain && !kp) {
    checkReviewNudge()
  }
})

onBeforeUnmount(() => {
  chat.dispose()
  upload.stopAll()
})

watch(
  () => route.params.id,
  async (id) => {
    const nid = id || ''
    if (nid !== chat.activeConvId.value) {
      if (chat.streaming.value) await chat.stopStreaming()
      if (nid) {
        await chat.openConversation(nid)
        conv.select(nid)
        scrollBottom(true)
      } else {
        chat.activeConvId.value = ''
        chat.messages.value = []
        conv.select('')
      }
    }
  }
)
</script>

<style scoped>
.dialog-page { height: calc(100vh - 52px); }
.dialog-page .dialog-main { height: 100%; }
.list-loading { display: flex; align-items: center; gap: 8px; color: var(--ink3); padding: 40px 0; justify-content: center; font-size: 13px; }
.history-more { display: flex; justify-content: center; margin-bottom: 8px; }
.welcome { padding-top: 60px; }
.welcome-sub { font-size: 12px; color: var(--ink3); margin-top: 8px; }

.review-nudge {
  display: flex; gap: 12px; max-width: 640px; margin: 0 0 14px;
  padding: 14px 16px; border-radius: 16px;
  background: var(--card); border: 1px solid var(--warn-border);
  box-shadow: var(--shadow-sm);
}
.rn-icon { font-size: 20px; line-height: 1.4; }
.rn-body { flex: 1; min-width: 0; }
.rn-title { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 4px; }
.rn-text {
  font-size: 12.5px; color: var(--ink2); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.rn-text :deep(.imd-block p) { margin: 0; }
.rn-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.rn-dismiss { color: var(--ink3); border-color: transparent; }

.drop-mask {
  position: absolute; inset: 0; z-index: 30; pointer-events: none;
  background: rgba(245, 158, 11, 0.08); backdrop-filter: blur(1px);
  display: flex; align-items: center; justify-content: center;
  border: 2px dashed var(--warn-border); border-radius: 16px; margin: 8px;
}
.drop-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--brand-deep); font-size: 14px; font-weight: 500; }
.drop-sub { font-size: 12px; color: var(--ink3); font-weight: 400; }
.sugg { padding: 0 20px 8px; }

/* AI 思考中（v4 动效） */
.v4-thinking { display: flex; gap: 6px; align-items: center; padding: 8px 12px; background: var(--bg2); border-radius: 99px; font-size: 11.5px; color: var(--ink2); font-weight: 600; align-self: flex-start; }
.v4-thinking .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brand); animation: pulse 1.4s infinite; }
.v4-thinking .dot:nth-child(2) { animation-delay: .2s; }
.v4-thinking .dot:nth-child(3) { animation-delay: .4s; }
.rn-img { max-width: 100%; max-height: 180px; margin-top: 8px; border-radius: 8px; display: block; }
</style>
