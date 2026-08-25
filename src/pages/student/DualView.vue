<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">双师课堂 · AI 数学课</div>
      <div class="sub">主讲老师授课 + AI 辅导即时答疑，课后自动生成个性化巩固练习。</div>
    </div>

    <div v-if="loading" class="state-box">加载中…</div>
    <div v-else-if="error" class="state-box">⚠ {{ error }}<button style="margin-left:10px;" @click="load">重试</button></div>
    <template>
      <div v-if="courses.length" class="resource-filters" style="margin-bottom:12px;">
        <span
          v-for="c in courses" :key="c.course_id"
          class="filter" :class="{ active: currentId === c.course_id }"
          @click="select(c.course_id)"
        >{{ c.title }}</span>
      </div>

      <!-- 未生成会话：创建配置 -->
      <div v-if="!session" class="create-panel">
        <div class="cp-head">
          <strong>🎬 生成 AI 数学课堂</strong>
          <span class="cp-sub">输入主题即可生成（OpenMAIC 语义）；留空且已选课程时，基于课程内容生成。两段式：先出大纲，再逐页写内容（高中数学专属，公式 LaTeX，多页讲解）。</span>
        </div>
        <textarea v-model="genTopic" class="input" rows="2" :placeholder="current ? '留空 = 基于课程「' + current?.title + '」生成；或输入新主题' : '例如：函数单调性与最值（含端点比较）'"></textarea>
        <div class="cp-config">
          <label>课堂模式
            <select v-model="genMode" class="input">
              <option value="sync">同步课堂（沿课程进度讲课）</option>
              <option value="review">考前复习（考点密集回顾）</option>
              <option value="topic">专题精讲（单考点深挖）</option>
            </select>
          </label>
          <label>页数
            <select v-model="genSlides" class="input">
              <option :value="8">8 页（30 分钟精讲）</option>
              <option :value="10">10 页（约 35 分钟）</option>
              <option :value="12">12 页（约 40 分钟）</option>
              <option :value="15">15 页（约 45 分钟深度课堂）</option>
            </select>
          </label>
          <button class="primary" :disabled="generating || (!currentId && !genTopic.trim())" @click="startGeneration">
            {{ generating ? '正在生成课堂…' : '▶ 开始生成课堂' }}
          </button>
        </div>
      </div>

      <!-- 生成中 -->
      <div v-else-if="session && session.status === 'generating'" class="state-box">
        <span class="spinner"></span> AI 正在备课：先搭大纲再逐页写内容（{{ session.slide_count }} 页 · {{ modeLabel(session.mode) }}）…
        <div class="gen-progress" v-if="session.slides?.length">
          已完成 {{ session.slides.length }}/{{ session.slide_count }} 页
          <div class="progress-bar"><div class="fill" :style="{ width: pct(session.slides.length, session.slide_count) + '%' }"></div></div>
        </div>
      </div>

      <!-- 生成失败 -->
      <div v-else-if="session && session.status === 'failed'" class="state-box">
        ⚠ 课堂生成失败：{{ session.error || '未知错误' }}
        <div style="margin-top:10px;"><button class="secondary" @click="startGeneration">重试生成</button></div>
      </div>

      <!-- 内容为空兜底（早期生成中断的会话） -->
      <div v-else-if="session && session.status === 'ready' && !session.slides?.length" class="state-box">
        ⚠ 该课堂内容为空（可能是生成中断的会话）。<button class="secondary" style="margin-left:8px;" @click="session = null">重新生成</button>
      </div>

      <!-- 课堂播放器 -->
      <div v-else-if="session && currentSlide" class="classroom">
        <div class="player-main">
          <div class="slide" :class="'p-' + (curIndex % 3)">
            <div class="slide-head">
              <span class="slide-tag">{{ modeLabel(session.mode) }}</span>
              <span class="slide-title">{{ currentSlide.title }}</span>
              <span class="slide-sub">{{ currentSlide.subtitle }}</span>
            </div>
            <Transition name="page-fade" mode="out-in">
              <div :key="curIndex" class="slide-body">
              <div class="kp-badges" v-if="currentSlide.key_points?.length">
                <span v-for="(kp, i) in currentSlide.key_points" :key="i" class="kp-badge">▲ {{ kp }}</span>
              </div>
              <div class="blocks">
                <template v-for="(b, i) in currentSlide.blocks" :key="i">
                  <p v-if="b.kind === 'text'" class="blk text">{{ b.text }}</p>
                  <div v-else-if="b.kind === 'latex'" class="blk latex">
                    <LatexText :text="'$' + (b.latex || '') + '$'" />
                  </div>
                  <div v-else-if="b.kind === 'example'" class="blk example">
                    <div class="ex-q" @click="toggleReveal(i)">
                      ✍️ 例题：{{ b.question }}
                      <span class="ex-toggle">{{ revealed.has(i) ? '▲ 收起解析' : '▼ 先试做，再点开解析' }}</span>
                    </div>
                    <template v-if="revealed.has(i)">
                      <div class="ex-a">思路：{{ b.analysis }}</div>
                      <div class="ex-ans">答案：<LatexText :text="wrapLatex(b.answer)" /></div>
                    </template>
                  </div>
                  <div v-else-if="b.kind === 'note'" class="blk note">⚠️ {{ b.text }}</div>
                </template>
              </div>
              <div class="self-check" v-if="curIndex > 0">
                <span>这页掌握了吗？</span>
                <button :class="{ picked: selfCheck === 'ok' }" @click="markCheck('ok')">✅ 记住了</button>
                <button :class="{ picked: selfCheck === 'again' }" @click="markCheck('again')">🔁 要重听</button>
              </div>
            </div>
            </Transition>
            <WhiteboardCanvas :page="curIndex" />
          </div>

          <div class="player-foot">
            <button class="foot-btn" :disabled="curIndex === 0" @click="go(-1)">⟨ 上一页</button>
            <div class="player-mid">
              <div class="progress-bar"><div class="fill" :style="{ width: pct(curIndex + 1, session.slides.length) + '%' }"></div></div>
              <div class="page-info">第 {{ curIndex + 1 }} / {{ session.slides.length }} 页 · {{ currentSlide.minutes }} 分钟/页</div>
            </div>
            <button class="foot-btn" :disabled="curIndex >= session.slides.length - 1" @click="go(1)">下一页 ⟩</button>
            <button class="foot-btn" :class="{ active: speaking }" @click="toggleSpeak">🔊 {{ speaking ? '停' : '讲' }}</button>
            <select v-model="speakRate" class="input rate-sel" title="朗读速度">
              <option :value="0.8">0.8×</option>
              <option :value="1">1×</option>
              <option :value="1.25">1.25×</option>
            </select>
            <button v-if="curIndex === session.slides.length - 1" class="foot-btn primary" @click="postLesson">✓ 学完本课</button>
          </div>
        </div>

        <div class="player-side">
          <div class="side-card" style="display:flex;align-items:center;justify-content:space-between;">
            <h4 style="margin-bottom:0;">📑 课堂大纲</h4>
            <button class="link" @click="startFresh">🆕 生成新课堂</button>
            <div
              v-for="(o, i) in session.outlines" :key="o.order"
              class="outline-item" :class="{ active: i === curIndex, done: i < curIndex }"
              @click="curIndex = i"
            >
              <span class="o-no">{{ String(o.order).padStart(2, '0') }}</span>
              <span class="o-t">{{ o.title }}</span>
              <span class="o-check" v-if="i < curIndex">✓</span>
            </div>
          </div>
          <div class="side-card">
            <h4>💬 AI 课堂助手 · 随讲随问 / 随堂小测</h4>
            <div ref="chatListRef" class="side-msgs">
              <div v-if="!chatAsk.messages.value.length" class="side-tip">
                没听懂？直接提问；或点「随堂小测」让 AI 就当前页出一道选择题。AI 会结合本课上下文引导（页内即时对话，不再跳转）。
              </div>
              <MessageBubble v-for="m in chatAsk.messages.value" :key="m.key" :msg="m" @quiz-answered="onQAnswer" />
              <div v-if="chatAsk.streaming.value" class="v4-thinking">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>AI 思考中…
              </div>
            </div>
            <div class="side-quick">
              <button class="chip" @click="quickQuiz">🎯 随堂小测</button>
              <button class="chip" @click="ask('这一页我没听懂，请讲细一点并给例子。')">🤔 没听懂这里</button>
              <button class="chip" @click="ask('请总结本课要点并告诉我最易错的地方。')">📌 本课小结</button>
            </div>
            <div class="ask-row">
              <input v-model="askDraft" class="input" placeholder="例如：为什么这里要讨论定义域？" @keyup.enter="ask()" />
              <button class="secondary" :disabled="chatAsk.streaming.value" @click="ask()">提问</button>
            </div>
          </div>
          <div class="side-card">
            <h4>📝 本课笔记</h4>
            <textarea v-model="notes" class="input" rows="4" placeholder="写下本课关键结论…（浏览器本地保存）" @input="saveNotes"></textarea>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useChat } from '@/composables/useChat'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import { SKILL_ID_BY_KEY } from '@/config/skills'
import { classroomApi } from '@/api'
import { useToastStore } from '@/stores/toast'
import LatexText from '@/components/LatexText.vue'
import WhiteboardCanvas from '@/components/student/WhiteboardCanvas.vue'

const toast = useToastStore()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const courses = ref([])
const currentId = ref('')
const session = ref(null)
const generating = ref(false)
const genMode = ref('sync')
const genSlides = ref(10)
const genTopic = ref('')
const curIndex = ref(0)
const speaking = ref(false)
const askDraft = ref('')
// 页内 AI 课堂助手（OpenMAIC 语义：随讲随问 + 随堂小测，复用现有对话/出题能力，不再跳页）
const chatAsk = useChat({
  workspace: 'student',
  manageConversations: false,
  sendThinking: true,
  hooks: { resolveSkills: (keys) => (keys || []).map((k) => SKILL_ID_BY_KEY[k] || k) },
})
function ensureConv() {
  if (!chatAsk.activeConvId.value) return chatAsk.createConversation('student').catch(() => {})
  return Promise.resolve()
}
function ask(t) {
  const text = (typeof t === 'string' ? t : askDraft.value || '').trim()
  if (!text || chatAsk.streaming.value) return
  askDraft.value = ''
  ensureConv().then(() => {
    const ctx = session.value
      ? `我现在在第 ${curIndex.value + 1} 页「${currentSlide?.title || ''}」，正在学习「${session.value.title}」。`
      : ''
    chatAsk.doSend(ctx + text, { skills: [] })
  })
}
function quickQuiz() {
  const base = currentSlide?.title ? `基于「${currentSlide.title}」(第 ${curIndex.value + 1} 页)` : '基于本课'
  const text = base + '出一道高中数学选择题（给出选项与解析），适合课堂随堂小测。'
  if (chatAsk.streaming.value) return
  ensureConv().then(() => chatAsk.doSend(text, { skills: ['smart_quiz'] }))
}
const chatListRef = ref(null)
watch(
  () => chatAsk.messages.value.length + (chatAsk.streaming.value ? 1 : 0),
  () => nextTick(() => { const el = chatListRef.value; if (el) el.scrollTop = el.scrollHeight })
)
function onQAnswer(p) { toast.info(p?.feedback === 'correct' ? '答对啦！' : '看下解析，再试一次') }
const notes = ref('')
const sessionKey = 'dual-notes:' + (currentId.value || '')

const current = computed(() => courses.value.find((c) => c.course_id === currentId.value) || null)
const currentSlide = computed(() => session.value?.slides?.[curIndex.value] || null)

const MODE_LABELS = { sync: '同步课堂', review: '考前复习', topic: '专题精讲' }

/* ===== 交互增强（例题翻转/掌握自查/朗读速度/键盘翻页） ===== */
const revealed = ref(new Set())
const selfCheck = ref('')
const speakRate = ref(1)
const checkCounts = ref({ ok: 0, again: 0 })
function toggleReveal(i) {
  const n = new Set(revealed.value)
  if (n.has(i)) n.delete(i); else n.add(i)
  revealed.value = n
}
function markCheck(v) {
  if (selfCheck.value === v) return
  if (selfCheck.value) {
    checkCounts.value[selfCheck.value] = Math.max(0, checkCounts.value[selfCheck.value] - 1)
  }
  selfCheck.value = v
  checkCounts.value[v] += 1
  if (v === 'again') toast.info('🔁 已标记重听，课后记得回看')
}
watch(curIndex, () => { revealed.value = new Set(); selfCheck.value = '' })
function onKey(e) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
}
function modeLabel(m) { return MODE_LABELS[m] || m || '课堂' }
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0 }
function wrapLatex(t) { return t && !/^\$/.test(t) ? '\$' + t + '\$' : t }

function select(id) {
  if (!id || id === currentId.value) return
  currentId.value = id
  session.value = null
  notes.value = localStorage.getItem('dual-notes:' + id) || ''
  loadSession()
}

async function load() {
  loading.value = true
  error.value = ''
  courses.value = []
  currentId.value = ''
  session.value = null
  try {
    const data = await api.get('/courses')
    courses.value = data?.items || []
    if (courses.value.length) currentId.value = courses.value[0].course_id
    loadSession() // 无条件加载：无课程时也能回显自由生成的课堂
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadSession() {
  session.value = null
  curIndex.value = 0
  try {
    const list = await classroomApi.sessions()
    const mine = ((list?.data || list)?.items || []).filter((s) => s.status === 'ready')
    // 优先回显：选中课程的会话 → 其次最近生成的课堂（含自由生成 topic 会话）
    const hit =
      (currentId.value ? mine.find((s) => s.course_id === currentId.value) : null) ||
      mine[0] ||
      null
    if (hit) {
      const detail = await classroomApi.session(hit.session_id)
      const dd = detail?.data || detail
      // 回显防御：只接受内容完整的 ready 会话（早期生成中断可能留下空 slides）
      if (dd?.status === 'ready' && dd?.slides?.length) session.value = dd
    }
  } catch { /* 尚无会话，展示创建面板 */ }
}

async function startGeneration() {
  if (generating.value) return
  const payload = { slide_count: Number(genSlides.value), mode: genMode.value }
  if (currentId.value) payload.course_id = currentId.value
  if (genTopic.value.trim()) payload.topic = genTopic.value.trim()
  if (!payload.course_id && !payload.topic) { toast.error('请输入课堂主题，或先选择一门课程'); return }
  generating.value = true
  try {
    const s = await classroomApi.createSession(payload)
    const d = s?.data || s
    session.value = d
    curIndex.value = 0
    pollSession(d.session_id)
  } catch (e) {
    toast.error(e?.message || '生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

let pollTimer = null
async function pollSession(id) {
  clearTimeout(pollTimer)
  const tick = async () => {
    try {
      const s = await classroomApi.session(id)
      const d = s?.data || s
      session.value = d
      if (d.status === 'ready' || d.status === 'failed') return
      if (d.status === 'generating' && d.slides?.length) { /* 进度写回，无需退出 */ }
    } catch { /* 网络抖动继续轮询 */ }
    pollTimer = setTimeout(tick, 2500)
  }
  pollTimer = setTimeout(tick, 2000)
}

function go(delta) {
  const next = curIndex.value + delta
  if (next < 0 || next >= (session.value?.slides?.length || 0)) return
  curIndex.value = next
  if (speaking.value) speak()
}

function speak() {
  if (!('speechSynthesis' in window)) { toast.info('当前浏览器不支持语音朗读'); return }
  const t = currentSlide.value?.narration
  if (!t) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(t)
  u.lang = 'zh-CN'
  u.rate = speakRate.value
  u.onend = () => { if (curIndex.value < (session.value?.slides?.length || 0) - 1) { curIndex.value += 1; speak() } }
  window.speechSynthesis.speak(u)
  speaking.value = true
}

function toggleSpeak() {
  if (speaking.value) {
    window.speechSynthesis.cancel()
    speaking.value = false
  } else {
    speak()
  }
}

function startFresh() {
  session.value = null
  curIndex.value = 0
  speaking.value = false
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

function saveNotes() {
  try { localStorage.setItem('dual-notes:' + currentId.value, notes.value) } catch { /* 无痕模式忽略 */ }
}

async function postLesson() {
  window.speechSynthesis.cancel()
  speaking.value = false
  const sSelf = checkCounts.value
  if (session.value?.slides?.length) toast.info(`本课共 ${session.value.slides.length} 页 · 掌握 ${sSelf.ok} 页 · 待重听 ${sSelf.again} 页`)
  try {
    if (!currentId.value) throw new Error('NO_COURSE')
    const q = await api.post(`/courses/${currentId.value}/quiz`, { q_type: 'choice', difficulty: 'medium' })
    if (q?.data?.quiz_id) {
      toast.success('已生成看课检测，去练一下检验本课效果')
      router.push('/practice')
    } else {
      toast.info('已学完本课，去练题中心巩固')
      router.push('/practice')
    }
  } catch (e) {
    toast.error('检测生成失败：' + (e?.message || '请稍后重试'))
  }
}

onMounted(() => { load(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { clearTimeout(pollTimer); window.speechSynthesis?.cancel(); window.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.state-box { padding: 40px 20px; text-align: center; color: var(--ink3); font-size: 13px; background: var(--card-bg, #fff); border: 1px dashed var(--line, #e5e7eb); border-radius: var(--radius-lg, 12px); }
.spinner { display: inline-block; width: 14px; height: 14px; margin-right: 8px; border-radius: 50%; border: 2px solid rgba(59,123,255,.25); border-top-color: var(--brand); animation: sp .8s linear infinite; vertical-align: -2px; }
@keyframes sp { to { transform: rotate(360deg); } }
.create-panel { background: var(--card-bg, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg, 12px); padding: 16px 20px; }
.cp-head { display: flex; flex-direction: column; gap: 4px; font-size: 15px; }
.cp-sub { font-size: 12px; color: var(--ink2); }
.cp-config { display: flex; gap: 12px; align-items: flex-end; margin-top: 12px; flex-wrap: wrap; }
.cp-config label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 700; color: var(--ink2); }
.cp-config .input { width: 220px; }
.cp-config .primary { padding: 9px 18px; }
.gen-progress { margin-top: 14px; font-size: 12.5px; color: var(--ink2); }
.progress-bar { width: 100%; height: 6px; margin-top: 6px; background: var(--line, #eef1f5); border-radius: 999px; overflow: hidden; }
.progress-bar .fill { height: 100%; background: linear-gradient(90deg, var(--brand), #7aa7ff); border-radius: 999px; transition: width .3s; }
.classroom { display: grid; grid-template-columns: 1fr 280px; gap: 14px; align-items: start; }
.player-main { background: var(--card-bg, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg, 12px); overflow: hidden; }
.slide { min-height: 380px; padding: 26px 30px; color: #1f2329; }
.slide.p-1 { background: linear-gradient(150deg, #f7fbff, #ffffff); }
.slide.p-2 { background: linear-gradient(150deg, #fdfbf5, #ffffff); }
.slide-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.slide-tag { font-size: 11px; font-weight: 800; color: var(--brand, #3b7bff); background: rgba(59,123,255,.1); padding: 3px 9px; border-radius: 999px; }
.slide-title { font-size: 22px; font-weight: 900; color: #111827; }
.slide-sub { font-size: 12.5px; color: var(--ink3); }
.slide-body { margin-top: 18px; display: flex; flex-direction: column; gap: 14px; }
.kp-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.kp-badge { font-size: 12px; font-weight: 700; color: #374151; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 999px; padding: 4px 12px; }
.blk.text { font-size: 14.5px; line-height: 1.75; color: #1f2937; }
.blk.latex { font-size: 15px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid var(--brand); border-radius: 8px; overflow-x: auto; }
.blk.example { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 13.5px; }
.blk.example .ex-q { font-weight: 800; color: #92400e; margin-bottom: 6px; }
.blk.example .ex-a { color: #78350f; margin-bottom: 4px; }
.blk.example .ex-ans { color: #92400e; font-weight: 700; }
.blk.note { font-size: 13px; color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 12px; }
.player-foot { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--line); }
.foot-btn { border: 1px solid var(--line); background: #fff; border-radius: 8px; padding: 7px 14px; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.foot-btn:disabled { opacity: .4; cursor: not-allowed; }
.foot-btn.active { background: var(--brand); color: #fff; border-color: var(--brand); }
.foot-btn.primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.player-mid { flex: 1; }
.page-info { font-size: 11.5px; color: var(--ink3); margin-top: 4px; }
.player-side { display: flex; flex-direction: column; gap: 12px; }
.side-card { background: var(--card-bg, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg, 12px); padding: 12px 14px; }
.side-card h4 { font-size: 13px; margin-bottom: 8px; }
.side-tip { font-size: 12px; color: var(--ink3); line-height: 1.6; margin-bottom: 8px; }
.outline-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; cursor: pointer; font-size: 12.5px; }
.outline-item:hover { background: var(--brand-faint, #f6f9ff); }
.outline-item.active { background: var(--brand-faint, #f6f9ff); color: var(--brand); font-weight: 800; }
.outline-item.done .o-t { color: var(--ink3); }
.o-no { font-weight: 800; color: var(--ink3); font-size: 11px; }
.o-t { flex: 1; }
.o-check { color: var(--ok-deep); font-weight: 800; }
.ask-row { display: flex; gap: 6px; }
.ask-row input { flex: 1; }
.slide { position: relative; overflow: hidden; }
.page-fade-enter-active, .page-fade-leave-active { transition: opacity .22s ease, transform .22s ease; }
.page-fade-enter-from { opacity: 0; transform: translateX(28px); }
.page-fade-leave-to { opacity: 0; transform: translateX(-24px); }
.ex-q { cursor: pointer; }
.ex-toggle { margin-left: 8px; font-size: 11px; color: var(--brand, #3b7bff); font-weight: 700; }
.self-check { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--line, #eef1f5); font-size: 12.5px; color: var(--ink2, #646a73); font-weight: 700; }
.self-check button { border: 1px solid var(--line, #eef1f5); background: #fff; border-radius: 999px; padding: 4px 12px; cursor: pointer; font: inherit; font-size: 12px; }
.self-check button.picked { background: var(--brand-soft, #eaf1ff); border-color: var(--warn-border, #bcd4ff); }
.rate-sel { width: 76px; flex-shrink: 0; }
/* ==== 页内 AI 课堂助手（OpenMAIC 语义） ==== */
.side-msgs { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px; }
.side-msgs :deep(.inline-math) { font-size: 13px; }
.side-quick { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.chip { border: 1px solid var(--line, #eef1f5); background: var(--card-bg, #fff); border-radius: 999px; font-size: 12px; padding: 4px 10px; cursor: pointer; color: var(--ink2, #334155); transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
.chip:hover { border-color: #93c2f7; color: #2563eb; background: #f3f8ff; }
.v4-thinking { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--ink3, #9aa1ac); padding: 6px 2px; }
.v4-thinking .dot { width: 6px; height: 6px; border-radius: 50%; background: #2563eb; animation: blink 1.2s infinite; }
.v4-thinking .dot:nth-child(2) { animation-delay: .2s; } .v4-thinking .dot:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1); } }
.side-card { transition: border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
</style>
